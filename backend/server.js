/* Users + Auth backend — the only piece of this project allowed to hold
   the Airtable PAT. See backend/README.md for setup/run instructions and
   CLAUDE.md §18/§19/§19b/§19c for why this exists as a separate service
   instead of an n8n workflow.

   Architecture (2026-09-21h, "Login authentication flow"):
     pages/login.html (js/services/auth.js)
       -> POST /api/auth/login  -> looks up Email in Airtable, checks
          Status, verifies password against the Password field,
          creates a server-side session (HTTPOnly cookie), updates
          Last Login, returns { user } (no password, no PAT)
     every pages/*.html Workspace page (js/workspace-chrome.js)
       -> GET /api/auth/me  -> confirms the session cookie is still valid;
          redirects to Login if not
     pages/team.html (js/services/users-api.js)
       -> POST /api/users  -> now requires an authenticated Admin session
          (see requireAuth/requireRole below) in addition to everything
          the 2026-09-21g task already required

   **Passwords are stored in plaintext, deliberately (2026-09-21l, project
   owner decision).** The Airtable field was originally "Password Hash"
   (bcrypt, verified with bcrypt.compare()) — the project owner explicitly
   asked to drop hashing because this is MVP/demo data, not real user
   accounts, and renamed the field to plain "Password" to match. See
   CLAUDE.md §5 for the full rationale and the known test-user passwords.
   This is a one-way decision to revisit before any real user data ever
   goes in this table — don't quietly reintroduce hashing without an
   equally explicit instruction, since that would break every password
   already stored in plaintext.

   Nothing here is guessed: the field names ("Full Name", "Email", "Role",
   "Status", "Phone", "Password", "Last Login") and the exact Role/
   Status option values are confirmed against the real Users table schema
   (GET /v0/meta/bases/.../tables) and a real login was tested end-to-end
   — see the chat report for the 2026-09-21h task, not just this file. */

require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const session = require("express-session");

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_USERS_TABLE_ID = process.env.AIRTABLE_USERS_TABLE_ID;
/* Projects table (2026-09-21k "Connect Projects to Airtable" task) — same
   base as Users, a different table/view. AIRTABLE_PROJECTS_VIEW_ID is
   optional: if unset, GET /api/projects reads the whole table instead of
   one view. */
const AIRTABLE_PROJECTS_TABLE_ID = process.env.AIRTABLE_PROJECTS_TABLE_ID;
const AIRTABLE_PROJECTS_VIEW_ID = process.env.AIRTABLE_PROJECTS_VIEW_ID;
/* Leads table (2026-09-22 "Connect Leads to Airtable" task) — same base,
   a different table. No view id: the required filter (Status = "Meeting
   Booking") is applied via filterByFormula instead, see the Leads
   section below for why. */
const AIRTABLE_LEADS_TABLE_ID = process.env.AIRTABLE_LEADS_TABLE_ID;
/* Clients table (2026-09-22b "Connect Clients to Airtable" task) — same
   base, a different table. Also cross-referenced against Projects (via
   the Clients table's own "Projects" linked-record field) to derive
   active/completed project counts and to scope a client session to only
   their own project(s) — see the Clients section below. */
const AIRTABLE_CLIENTS_TABLE_ID = process.env.AIRTABLE_CLIENTS_TABLE_ID;
const PORT = process.env.PORT || 3001;
/* .trim() guards against a trailing space/newline in the Render
   dashboard's env var value — that alone is enough to make Node's HTTP
   layer throw ERR_INVALID_CHAR on every single request (any header
   value with a raw \n/\r or trailing whitespace is rejected), which
   crashed every route with a 500, not just CORS. Live-diagnosed
   2026-09-24 from Render's Application Logs. */
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "http://localhost:3000").trim();
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const MISSING_ENV_VARS = [
  ["AIRTABLE_PAT", AIRTABLE_PAT],
  ["AIRTABLE_BASE_ID", AIRTABLE_BASE_ID],
  ["AIRTABLE_USERS_TABLE_ID", AIRTABLE_USERS_TABLE_ID]
]
  .filter(function (entry) {
    return !entry[1];
  })
  .map(function (entry) {
    return entry[0];
  });

if (MISSING_ENV_VARS.length > 0) {
  console.warn(
    "[backend] Missing environment variable(s): " +
      MISSING_ENV_VARS.join(", ") +
      ". Airtable-dependent endpoints will respond 503 until these are set — see backend/.env.example."
  );
}

/* SESSION_SECRET is a real secret and, like AIRTABLE_PAT before it, must
   never be hardcoded. Unlike AIRTABLE_PAT there's nothing to look up for
   it — if it's missing, generate a random one for THIS PROCESS so local
   testing isn't blocked on yet another manual step, but say so loudly:
   every restart invalidates all sessions, and production must set a real
   SESSION_SECRET in .env so sessions survive a restart/redeploy. */
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET) {
  console.warn(
    "[backend] SESSION_SECRET not set — using a random secret generated for this process only. " +
      "All sessions will be invalidated on the next restart. Set SESSION_SECRET in .env before anything beyond local testing."
  );
}

/* Airtable "Role" single-select options (confirmed live, including the
   inconsistent spacing — see ROLE_KEY_TO_AIRTABLE_LABEL below for the
   team-member subset used at creation time) mapped down to this app's
   4-role model (CLAUDE.md §4). Every "team member" specialty (Producer/
   Designer/Instructional Designer/QA/Developer) maps to "teamMember". */
const AIRTABLE_ROLE_TO_APP_ROLE = {
  admin: "admin",
  "project manager": "pm",
  client: "client",
  producer: "teamMember",
  designer: "teamMember",
  "instructional designer": "teamMember",
  qa: "teamMember",
  developer: "teamMember"
};

function mapAirtableRoleToAppRole(rawRole) {
  const normalized = (rawRole || "").trim().toLowerCase();
  return AIRTABLE_ROLE_TO_APP_ROLE[normalized] || null;
}

/* Internal role keys (js/i18n/translations.js's teamRole.*, used as the
   <select> values in team.html's create form) mapped to the Airtable
   "Role" single-select option labels. Confirmed 2026-09-21g against the
   REAL Users table schema — do not "clean up" the odd leading/trailing
   spaces below, they're exactly how the options are configured in
   Airtable right now, and sending an unlisted value (even just
   differently-trimmed) gets rejected as this PAT has no permission to
   create new select options. Admin / Project Manager / Client also exist
   as Role options in Airtable but aren't offered here — this form is for
   team-member creation, and the task this file was built for is explicit
   about not inventing roles beyond the five below. */
const ROLE_KEY_TO_AIRTABLE_LABEL = {
  "teamRole.producer": " Producer",
  "teamRole.designer": " Designer ",
  "teamRole.instructionalDesigner": " Instructional Designer",
  "teamRole.qa": " QA",
  "teamRole.developer": "Developer"
};

/* Confirmed 2026-09-21g against the real Users table schema — the Status
   field's actual options are "Active"/"Inactive", not "Paused". */
const VALID_STATUSES = ["Active", "Inactive"];

const app = express();
/* Required by express-session whenever cookie.secure:true and the app
   sits behind a reverse proxy that terminates TLS (Render's edge does,
   same as Heroku/most PaaS setups) — without this, Express sees every
   request as plain HTTP (no way to read the X-Forwarded-Proto header
   Render sets), so express-session silently refuses to send Set-Cookie
   at all on a secure cookie. That looked like session persistence
   failing for no reason: login returned 200 with no visible error, but
   no cookie ever reached the browser, so every subsequent GET
   /api/auth/me was a guaranteed 401 and workspace-chrome.js bounced
   straight back to Login. Live-diagnosed 2026-09-24. Only matters when
   IS_PRODUCTION is true (secure:false locally never needed this). */
app.set("trust proxy", 1);
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true
  })
);
app.use(express.json());
app.use(
  session({
    name: "iqraa.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: IS_PRODUCTION,
      /* "lax" works for local dev (frontend/backend are both "localhost",
         same site regardless of port). In production the frontend and
         this backend are deployed as two different Render services on
         two different *.onrender.com subdomains — onrender.com is on the
         public suffix list, so those count as different sites, and a
         "lax" cookie is never sent on a cross-site fetch()/XHR (only on
         top-level navigation). Without "none" here, login would appear
         to succeed (200 + Set-Cookie) but every subsequent request would
         arrive with no cookie, so GET /api/auth/me would always 401.
         SameSite=None requires Secure, which IS_PRODUCTION already is. */
      sameSite: IS_PRODUCTION ? "none" : "lax",
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    }
  })
);

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  next();
}

function requireRole(role) {
  return function (req, res, next) {
    if (!req.session || !req.session.user || req.session.user.role !== role) {
      return res.status(403).json({ error: "Not authorized." });
    }
    next();
  };
}

function requireAirtableConfigured(req, res, next) {
  if (MISSING_ENV_VARS.length > 0) {
    return res.status(503).json({
      error: "Airtable is not configured on this backend.",
      missingEnvVars: MISSING_ENV_VARS
    });
  }
  next();
}

/* Separate from requireAirtableConfigured above on purpose: AIRTABLE_PAT/
   AIRTABLE_BASE_ID are shared, but a missing AIRTABLE_PROJECTS_TABLE_ID
   must only disable /api/projects, not also take down Login/Users. */
function requireProjectsConfigured(req, res, next) {
  const missing = [];
  if (!AIRTABLE_PAT) missing.push("AIRTABLE_PAT");
  if (!AIRTABLE_BASE_ID) missing.push("AIRTABLE_BASE_ID");
  if (!AIRTABLE_PROJECTS_TABLE_ID) missing.push("AIRTABLE_PROJECTS_TABLE_ID");
  /* AIRTABLE_TASKS_TABLE_ID is required too (not just AIRTABLE_PROJECTS_
     TABLE_ID) because the 2026-09-23 role-scoping fix below reads Tasks
     to determine a Team Member's authorized project set — this route
     genuinely depends on both tables now, not a copy-paste. */
  if (!AIRTABLE_TASKS_TABLE_ID) missing.push("AIRTABLE_TASKS_TABLE_ID");
  if (missing.length > 0) {
    return res.status(503).json({
      error: "Airtable Projects table is not configured on this backend.",
      missingEnvVars: missing
    });
  }
  next();
}

/* Same reasoning as requireProjectsConfigured above — a missing
   AIRTABLE_LEADS_TABLE_ID must only disable /api/leads. */
function requireLeadsConfigured(req, res, next) {
  const missing = [];
  if (!AIRTABLE_PAT) missing.push("AIRTABLE_PAT");
  if (!AIRTABLE_BASE_ID) missing.push("AIRTABLE_BASE_ID");
  if (!AIRTABLE_LEADS_TABLE_ID) missing.push("AIRTABLE_LEADS_TABLE_ID");
  if (missing.length > 0) {
    return res.status(503).json({
      error: "Airtable Leads table is not configured on this backend.",
      missingEnvVars: missing
    });
  }
  next();
}

/* Same reasoning again — the Clients endpoints below also read Projects
   (to derive project counts / scope a client's own projects), so both
   table ids are required. */
function requireClientsConfigured(req, res, next) {
  const missing = [];
  if (!AIRTABLE_PAT) missing.push("AIRTABLE_PAT");
  if (!AIRTABLE_BASE_ID) missing.push("AIRTABLE_BASE_ID");
  if (!AIRTABLE_CLIENTS_TABLE_ID) missing.push("AIRTABLE_CLIENTS_TABLE_ID");
  if (!AIRTABLE_PROJECTS_TABLE_ID) missing.push("AIRTABLE_PROJECTS_TABLE_ID");
  if (missing.length > 0) {
    return res.status(503).json({
      error: "Airtable Clients/Projects tables are not configured on this backend.",
      missingEnvVars: missing
    });
  }
  next();
}

/* Escapes a value for safe interpolation inside an Airtable filterByFormula
   string literal (doubles backslashes and double-quotes). Defense in
   depth — email format is validated before this is ever called, but a
   formula-injection guard costs nothing and this is a lookup an
   unauthenticated caller can trigger. */
function escapeForFormula(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function findUserByEmail(email) {
  const formula = 'LOWER({Email})=LOWER("' + escapeForFormula(email) + '")';
  const url =
    "https://api.airtable.com/v0/" +
    AIRTABLE_BASE_ID +
    "/" +
    AIRTABLE_USERS_TABLE_ID +
    "?maxRecords=1&filterByFormula=" +
    encodeURIComponent(formula);
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + AIRTABLE_PAT }
  });
  if (!response.ok) {
    const body = await response.json().catch(function () {
      return {};
    });
    const error = new Error("Airtable lookup failed: " + response.status);
    error.airtableError = body && body.error;
    throw error;
  }
  const body = await response.json();
  return body.records && body.records[0] ? body.records[0] : null;
}

async function updateLastLogin(recordId) {
  const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_USERS_TABLE_ID + "/" + recordId;
  /* "Last Login" is a plain `date` field in the real schema (confirmed
     via the Metadata API), not `dateTime` — it has no time component.
     Sending a full ISO datetime string was rejected with
     INVALID_VALUE_FOR_COLUMN during live E2E testing (2026-09-21h);
     Airtable's REST API accepts a bare YYYY-MM-DD date string for a
     `date` field regardless of its configured display format. */
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + AIRTABLE_PAT,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields: { "Last Login": new Date().toISOString().slice(0, 10) } })
  });
  if (!response.ok) {
    const body = await response.json().catch(function () {
      return {};
    });
    console.error("[backend] Failed to update Last Login for", recordId, ":", JSON.stringify(body));
    /* Deliberately not thrown further — a failed Last Login write must
       never undo an otherwise-successful login (the session is already
       valid at this point). Logged for operators to notice, not surfaced
       to the user as an auth failure. */
  }
}

app.get("/health", function (req, res) {
  res.json({
    ok: true,
    airtableConfigured: MISSING_ENV_VARS.length === 0,
    missingEnvVars: MISSING_ENV_VARS,
    sessionSecretIsEphemeral: !process.env.SESSION_SECRET
  });
});

/* ===== Auth ===== */

app.post("/api/auth/login", requireAirtableConfigured, async function (req, res) {
  const body = req.body || {};
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  /* One identical response for every failure reason (no such user,
     inactive account, wrong password, unmapped role) — the task this was
     built for is explicit that the login response must never reveal
     which of those actually happened, since that would let a caller
     enumerate which emails have accounts. Only the server log below
     distinguishes them, for whoever operates this backend. */
  const GENERIC_FAILURE = { error: "Invalid email or password." };

  try {
    const userRecord = await findUserByEmail(email);
    if (!userRecord) {
      console.warn("[backend] Login failed (no matching user):", email);
      return res.status(401).json(GENERIC_FAILURE);
    }

    const fields = userRecord.fields || {};
    const status = (fields.Status || "").trim();
    const storedPassword = fields.Password;
    const appRole = mapAirtableRoleToAppRole(fields.Role);

    if (status !== "Active") {
      console.warn("[backend] Login failed (status is " + JSON.stringify(status) + "):", email);
      return res.status(401).json(GENERIC_FAILURE);
    }
    if (!storedPassword) {
      console.warn("[backend] Login failed (no Password on record):", email);
      return res.status(401).json(GENERIC_FAILURE);
    }

    /* Plaintext comparison, deliberately — see the file-header comment
       (2026-09-21l) on why this isn't bcrypt.compare() any more. */
    const passwordMatches = password === storedPassword;
    if (!passwordMatches) {
      console.warn("[backend] Login failed (wrong password):", email);
      return res.status(401).json(GENERIC_FAILURE);
    }
    if (!appRole) {
      console.warn("[backend] Login failed (unmapped Role " + JSON.stringify(fields.Role) + "):", email);
      return res.status(401).json(GENERIC_FAILURE);
    }

    /* Only reached after every check above passed — update Last Login
       server-side, and only here, per the task's explicit "do not update
       Last Login when authentication fails" rule. Awaited so the caller
       (and the end-to-end test) can trust it already happened by the
       time this request resolves, not racing a fire-and-forget write. */
    await updateLastLogin(userRecord.id);

    req.session.user = {
      id: userRecord.id,
      email: fields.Email,
      fullName: fields["Full Name"],
      role: appRole,
      /* Additive (2026-09-25 "Settings profile save"): PATCH /api/users/me
         below needs somewhere to reflect a saved Phone back to the client
         without a second fetch, and GET /api/auth/me already just returns
         session.user as-is — so Phone rides along in the session the same
         way fullName/email/role already do. Never used for authentication. */
      phone: fields.Phone || null
    };

    return res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error("[backend] Login error:", err);
    return res.status(500).json({ error: "Login failed due to a server error." });
  }
});

app.post("/api/auth/logout", function (req, res) {
  if (!req.session) return res.json({ success: true });
  req.session.destroy(function (err) {
    if (err) console.error("[backend] Session destroy error:", err);
    res.clearCookie("iqraa.sid");
    res.json({ success: true });
  });
});

app.get("/api/auth/me", requireAuth, function (req, res) {
  res.json({ user: req.session.user });
});

/* PATCH /api/users/me (2026-09-25 "Settings profile save" fix) — pages/
   settings.html's Profile form previously only ever showed a fake success
   message and never persisted anything (no fetch call at all). Self-service
   only: this always writes to req.session.user.id, the same real Airtable
   Users record id every session already carries — it never accepts a
   caller-supplied user id, so there is no way for one session to edit
   another user's record through this route. Every role (admin/pm/
   teamMember/client) has a Users record and can call this, matching
   settings.html being shared by all four roles.

   Deliberately excludes Email: Email is the login lookup key
   (findUserByEmail above) and this task's explicit "do not change
   authentication" rule rules out touching it here — the Settings email
   field stays read-only on the frontend, see js/pages/settings.js. */
app.patch("/api/users/me", requireAuth, requireAirtableConfigured, async function (req, res) {
  const body = req.body || {};
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!fullName) {
    return res.status(400).json({ error: "fullName is required." });
  }

  try {
    const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_USERS_TABLE_ID + "/" + encodeURIComponent(req.session.user.id);
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + AIRTABLE_PAT,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fields: { "Full Name": fullName, Phone: phone } })
    });
    const airtableBody = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      console.error("[backend] Airtable rejected the profile update:", response.status, JSON.stringify(airtableBody));
      return res.status(502).json({
        error: "Airtable rejected the request.",
        airtableStatus: response.status,
        airtableError: airtableBody && airtableBody.error
      });
    }

    req.session.user.fullName = fullName;
    req.session.user.phone = phone || null;
    return res.json({ user: req.session.user });
  } catch (networkError) {
    console.error("[backend] Could not reach Airtable to update the profile:", networkError);
    return res.status(502).json({ error: "Could not reach Airtable.", details: networkError.message });
  }
});

/* ===== Users ===== */

app.post("/api/users", requireAuth, requireRole("admin"), requireAirtableConfigured, async function (req, res) {
  const body = req.body || {};
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const roleKey = body.role;
  const status = body.status;
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const validationErrors = [];
  if (!fullName) validationErrors.push("fullName is required");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) validationErrors.push("email is required and must be a valid address");
  if (!ROLE_KEY_TO_AIRTABLE_LABEL[roleKey]) validationErrors.push("role must be one of: " + Object.keys(ROLE_KEY_TO_AIRTABLE_LABEL).join(", "));
  if (VALID_STATUSES.indexOf(status) === -1) validationErrors.push("status must be one of: " + VALID_STATUSES.join(", "));
  if (!password) validationErrors.push("password is required");

  if (validationErrors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: validationErrors });
  }

  /* Plaintext, deliberately — see the file-header comment (2026-09-21l)
     on why this is no longer bcrypt.hash(). */
  const fields = {
    "Full Name": fullName,
    Email: email,
    Role: ROLE_KEY_TO_AIRTABLE_LABEL[roleKey],
    Status: status,
    Password: password,
    "Must Change Password": "No"
  };
  if (phone) fields.Phone = phone;

  try {
    const airtableResponse = await fetch(
      "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_USERS_TABLE_ID,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + AIRTABLE_PAT,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records: [{ fields: fields }] })
      }
    );

    const airtableBody = await airtableResponse.json();

    if (!airtableResponse.ok) {
      console.error("[backend] Airtable rejected the create request:", airtableResponse.status, JSON.stringify(airtableBody));
      return res.status(502).json({
        error: "Airtable rejected the request.",
        airtableStatus: airtableResponse.status,
        airtableError: airtableBody && airtableBody.error
      });
    }

    const createdRecord = airtableBody.records && airtableBody.records[0];
    return res.status(201).json({
      id: createdRecord ? createdRecord.id : null,
      fullName: fullName,
      email: email,
      role: roleKey,
      status: status,
      phone: phone || null
    });
  } catch (networkError) {
    console.error("[backend] Could not reach Airtable:", networkError);
    return res.status(502).json({ error: "Could not reach Airtable.", details: networkError.message });
  }
});

/* ===== Team (2026-09-22 "Connect Team pages to Airtable") =====

   pages/team.html (js/services/users-api.js) -> GET /api/users/team ->
   this server -> Airtable REST API (read-only) -> the same Airtable
   Users table as Auth/Users above. Requires an authenticated Admin
   session (requireRole("admin")) — Team Management is an Admin/CEO-only
   screen (CLAUDE.md §9), and only an Admin may see every user's Role/
   Status/Phone/Email in bulk. Never exposes Password/Must Change
   Password/User ID — see mapTeamMemberRecord() below.

   Field mapping (Airtable field -> response field), confirmed against
   the real schema via get_table_schema, not guessed:
     Full Name -> fullName
     Email -> email
     Role (singleSelect) -> role, but ONLY for the 5 team-member-specialty
       labels in ROLE_KEY_TO_AIRTABLE_LABEL above (reused in reverse via
       AIRTABLE_LABEL_NORMALIZED_TO_TEAM_ROLE_KEY) — every other record
       (Admin, Project Manager, Client, or a blank placeholder row) is
       filtered out entirely, not just relabeled. This matches both the
       task's explicit "do not display Clients as team members" rule and
       the pre-existing project-role model, where team.html/data.teamMembers
       already only ever modeled team-member-specialty roles, never
       Admin/PM.
     Status -> status ("active"/"inactive", lowercased/trimmed)
     Phone -> phone

   Known scope limit (documented, not a bug): the table's "Active
   Projects"/"Active Tasks" columns are still computed client-side from
   the mock js/data/mock-data.js Projects/Tasks (ph.projectsForTeamMember/
   data.tasks), which use fake "tm-N" ids unrelated to these real
   Airtable record ids — so those two columns correctly show 0 for every
   real team member until a future task wires Projects/Tasks to real
   Users. Not built here per this task's explicit "don't build a new
   data architecture, keep it incremental" instruction. */

var AIRTABLE_LABEL_NORMALIZED_TO_TEAM_ROLE_KEY = {};
Object.keys(ROLE_KEY_TO_AIRTABLE_LABEL).forEach(function (roleKey) {
  AIRTABLE_LABEL_NORMALIZED_TO_TEAM_ROLE_KEY[ROLE_KEY_TO_AIRTABLE_LABEL[roleKey].trim().toLowerCase()] = roleKey;
});

function mapAirtableRoleToTeamRoleKey(rawRole) {
  const normalized = (rawRole || "").trim().toLowerCase();
  return AIRTABLE_LABEL_NORMALIZED_TO_TEAM_ROLE_KEY[normalized] || null;
}

async function fetchAllUserRecords() {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (offset) params.set("offset", offset);
    const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_USERS_TABLE_ID + "?" + params.toString();
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + AIRTABLE_PAT }
    });
    if (!response.ok) {
      const body = await response.json().catch(function () {
        return {};
      });
      const error = new Error("Airtable Users fetch failed: " + response.status);
      error.airtableStatus = response.status;
      error.airtableError = body && body.error;
      throw error;
    }
    const body = await response.json();
    records.push.apply(records, body.records || []);
    offset = body.offset;
  } while (offset);
  return records;
}

function mapTeamMemberRecord(record) {
  const fields = record.fields || {};
  const roleKey = mapAirtableRoleToTeamRoleKey(fields.Role);
  if (!roleKey) return null;
  const status = (fields.Status || "").trim().toLowerCase();
  return {
    id: record.id,
    fullName: fields["Full Name"] || null,
    email: fields.Email || null,
    role: roleKey,
    status: status === "inactive" ? "inactive" : "active",
    phone: fields.Phone || null
  };
}

app.get("/api/users/team", requireAuth, requireRole("admin"), requireAirtableConfigured, async function (req, res) {
  try {
    const records = await fetchAllUserRecords();
    const teamMembers = records.map(mapTeamMemberRecord).filter(function (member) {
      return member !== null;
    });
    return res.json({ teamMembers: teamMembers });
  } catch (err) {
    console.error("[backend] Failed to fetch Users (team) from Airtable:", err);
    return res.status(502).json({
      error: "Could not retrieve team members from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

/* PATCH /api/users/:id/status (2026-09-25 "Team pause/reactivate" fix) —
   pages/team.html's pause/reactivate button was local-only (documented as
   such in js/pages/team.js's own file header) since there was no write
   endpoint. Same Users table, same VALID_STATUSES/"Active"/"Inactive"
   vocabulary POST /api/users already writes on create — this just PATCHes
   the one field on an existing record instead. Admin-only, matching
   Team Management's existing access restriction (requireRole("admin"),
   same as GET /api/users/team above). */
app.patch("/api/users/:id/status", requireAuth, requireRole("admin"), requireAirtableConfigured, async function (req, res) {
  const status = req.body && req.body.status;
  if (VALID_STATUSES.indexOf(status) === -1) {
    return res.status(400).json({ error: "status must be one of: " + VALID_STATUSES.join(", ") });
  }

  try {
    const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_USERS_TABLE_ID + "/" + encodeURIComponent(req.params.id);
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + AIRTABLE_PAT,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fields: { Status: status } })
    });
    const body = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      console.error("[backend] Airtable rejected the user status update:", response.status, JSON.stringify(body));
      return res.status(502).json({
        error: "Airtable rejected the request.",
        airtableStatus: response.status,
        airtableError: body && body.error
      });
    }
    return res.json({ id: req.params.id, status: status });
  } catch (networkError) {
    console.error("[backend] Could not reach Airtable to update the user's status:", networkError);
    return res.status(502).json({ error: "Could not reach Airtable.", details: networkError.message });
  }
});

/* ===== Projects (2026-09-21k "Connect Projects to Airtable",
   role-scoped 2026-09-23 "Phase 1 security fix") =====

   pages/projects.html + pages/project-workspace.html (js/services/
   projects-api.js) -> GET /api/projects -> this server -> Airtable REST
   API (read-only) -> Airtable Projects table (tblK5seFEBbACNEWq, view
   viwYcfbVNh8THD3jx). Requires an authenticated session — the same
   "frontend never talks to Airtable directly" rule as Users/Auth above;
   the PAT never leaves this server.

   Field mapping (Airtable field -> response field), confirmed against
   the real schema via get_table_schema, not guessed:
     Project Name        -> name
     Client Name (from Clients) (lookup) -> client
     Status (singleSelect)-> status        (raw option label, e.g. "In Progress")
     Current Stage (sel.) -> stage         (raw option label, e.g. "Production")
     Progress (percent)   -> progress      (0-1 fraction from Airtable -> 0-100 int)
     Start Date            -> startDate
     Expected Completion   -> expectedCompletion
     Deadline               -> deadline

   "Project Manager" is a linked record (Users table) with no reliable
   display-name field available on the Projects table itself (its only
   lookup pulls Users' "User ID", which is unset on most real user
   records per the Users backend notes above) — so the response resolves
   it server-side by joining the raw "Project Manager" linked-record ids
   (mapProjectRecord's pmIds) against the Users table, the exact same
   pmNameFor() join GET /api/dashboard/admin already does (2026-09-23
   "Phase 3 data mapping fixes" — see pmName below). A project with no
   linked PM still resolves to null; the frontend shows "Unassigned" for
   that case only, not for every real project.

   Role scoping (2026-09-23 security fix — the full-application audit
   found this endpoint returned every project to every authenticated
   role, including Client; live-verified as a real cross-tenant leak):
     admin      -> every project, unfiltered.
     pm         -> only projects whose "Project Manager" link
                   (mapProjectRecord's pmIds) contains req.session.user.id
                   — the same real linked-record id already used by
                   GET /api/dashboard/pm, never a frontend-supplied id.
     teamMember -> only projects the user has at least one Task assigned
                   in, via the EXISTING Tasks.Assignee -> Users and
                   Tasks.Project -> Projects relationships (the same ones
                   GET /api/tasks/my already relies on) — there is no
                   direct Users<->Projects link for team members in the
                   real schema, and CLAUDE.md §4 scopes a Team Member to
                   "assigned projects and assigned tasks only," so project
                   membership is derived from task assignment rather than
                   inventing a new relationship/table.
     client     -> 403. A Client session must never reach the unscoped
                   project list at all — their own project(s) are already
                   served correctly and securely by GET /api/clients/me
                   (session-email-derived, never a caller-supplied id). */

function airtableSelectName(value) {
  if (!value) return null;
  return typeof value === "string" ? value : value.name || null;
}

async function fetchAllProjectRecords() {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (AIRTABLE_PROJECTS_VIEW_ID) params.set("view", AIRTABLE_PROJECTS_VIEW_ID);
    if (offset) params.set("offset", offset);
    const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_PROJECTS_TABLE_ID + "?" + params.toString();
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + AIRTABLE_PAT }
    });
    if (!response.ok) {
      const body = await response.json().catch(function () {
        return {};
      });
      const error = new Error("Airtable Projects fetch failed: " + response.status);
      error.airtableStatus = response.status;
      error.airtableError = body && body.error;
      throw error;
    }
    const body = await response.json();
    records.push.apply(records, body.records || []);
    offset = body.offset;
  } while (offset);
  return records;
}

function mapProjectRecord(record) {
  const fields = record.fields || {};
  const progressFraction = typeof fields.Progress === "number" ? fields.Progress : 0;
  return {
    id: record.id,
    projectCode: fields["Project ID"] || null,
    name: fields["Project Name"] || null,
    /* 2026-09-25 Airtable schema cleanup: the old free-text "Client"
       field (and two dead duplicate link fields, "Clients 2" /
       "Client ID (from Clients 2)") were deleted — "Clients" (linked
       record -> Clients table) is now the one client relationship on
       this table, and "Client Name (from Clients)" is a lookup through
       it, added specifically so this response doesn't need a second
       Clients fetch/join just to show a name. Lookup values come back
       as an array even for a single-linked-client project. */
    client: (fields["Client Name (from Clients)"] && fields["Client Name (from Clients)"][0]) || null,
    status: airtableSelectName(fields.Status),
    stage: airtableSelectName(fields["Current Stage"]),
    progress: Math.round(progressFraction * 100),
    startDate: fields["Start Date"] || null,
    expectedCompletion: fields["Expected Completion"] || null,
    deadline: fields.Deadline || null,
    /* Raw "Project Manager" linked-record ids (2026-09-22 "Connect Admin
       Dashboard to Airtable") — purely additive, /api/projects' existing
       consumers (projects.js, project-workspace.js) ignore fields they
       don't know about. Added so GET /api/dashboard/admin can resolve a
       PM display name via the Users table without a second Projects
       fetch/mapping function. */
    pmIds: fields["Project Manager"] || []
  };
}

app.get("/api/projects", requireAuth, requireProjectsConfigured, async function (req, res) {
  const role = req.session.user.role;

  /* Client sessions must never reach the unscoped project list — their
     own project(s) are already served correctly by GET /api/clients/me.
     Checked before any Airtable call, same "deny before you fetch"
     shape as the role checks elsewhere in this file. */
  if (role === "client") {
    return res.status(403).json({ error: "Clients must use GET /api/clients/me for project access." });
  }

  try {
    const projectRecords = await fetchAllProjectRecords();
    let projects = projectRecords.map(mapProjectRecord);

    if (role === "pm") {
      const pmId = req.session.user.id;
      projects = projects.filter(function (p) {
        return (p.pmIds || []).indexOf(pmId) !== -1;
      });
    } else if (role === "teamMember") {
      /* No direct Users<->Projects link exists for team members in the
         real schema — derive their authorized project set from the
         EXISTING Tasks.Assignee/Tasks.Project relationships instead
         (the same ones GET /api/tasks/my already relies on), rather than
         inventing a new relationship or table. */
      const userId = req.session.user.id;
      const taskRecords = await fetchAllRecordsGeneric(AIRTABLE_TASKS_TABLE_ID);
      const myProjectIds = {};
      taskRecords.map(mapDashboardTaskRecord).forEach(function (t) {
        if ((t.assigneeIds || []).indexOf(userId) !== -1) {
          (t.projectIds || []).forEach(function (pid) {
            myProjectIds[pid] = true;
          });
        }
      });
      projects = projects.filter(function (p) {
        return !!myProjectIds[p.id];
      });
    } else if (role !== "admin") {
      /* Unknown/unmapped role — default to nothing rather than
         everything. Should be unreachable in practice since every real
         session role is one of admin/pm/teamMember/client. */
      projects = [];
    }

    /* Resolve "Project Manager" linked-record ids to a display name —
       same join pmNameFor() already does for GET /api/dashboard/admin,
       reused here rather than a second resolution scheme (2026-09-23
       "Phase 3 data mapping fixes"). */
    const userRecords = await fetchAllUserRecords();
    const usersById = {};
    userRecords.forEach(function (r) {
      usersById[r.id] = (r.fields && r.fields["Full Name"]) || null;
    });
    projects = projects.map(function (p) {
      const pmNames = (p.pmIds || [])
        .map(function (id) {
          return usersById[id];
        })
        .filter(Boolean);
      p.pmName = pmNames.length ? pmNames.join(", ") : null;
      return p;
    });

    return res.json({ projects: projects });
  } catch (err) {
    console.error("[backend] Failed to fetch Projects from Airtable:", err);
    return res.status(502).json({
      error: "Could not retrieve projects from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

/* GET /api/users/pms (2026-09-24 "Assign PM from Project Workspace") —
   Admin-only list of active Project Manager users, used to populate the
   PM-assignment dropdown on pages/project-workspace.html. Reuses the same
   Users-table Role join every other PM lookup in this file already relies
   on (mapProjectRecord's pmIds / GET /api/dashboard/admin's pmWorkload) —
   no new table, nothing invented. Only Status==="Active" PMs are offered:
   assigning a project to a deactivated account isn't a real choice. */
app.get("/api/users/pms", requireAuth, requireRole("admin"), requireAirtableConfigured, async function (req, res) {
  try {
    const records = await fetchAllUserRecords();
    const projectManagers = records
      .filter(function (r) {
        const fields = r.fields || {};
        return mapAirtableRoleToAppRole(fields.Role) === "pm" && (fields.Status || "").trim().toLowerCase() === "active";
      })
      .map(function (r) {
        return { id: r.id, fullName: (r.fields && r.fields["Full Name"]) || null };
      });
    return res.json({ projectManagers: projectManagers });
  } catch (err) {
    console.error("[backend] Failed to fetch Project Managers from Airtable:", err);
    return res.status(502).json({
      error: "Could not retrieve project managers from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

/* PATCH /api/projects/:id/assign-pm (2026-09-24, same task) — the write
   half of PM assignment (CLAUDE.md §0/§19: sensitive/write operations go
   through n8n or this backend, never the frontend talking to Airtable
   directly). Admin-only. Sets the Projects record's "Project Manager"
   linked-record field (-> Users table) to a single id.

   pmId is re-validated against a real, currently-Active PM user record on
   this server rather than trusted from the request body alone — otherwise
   an Admin session could link a project to a Client/Team-Member/
   nonexistent/deactivated id just by editing the request. */
app.patch("/api/projects/:id/assign-pm", requireAuth, requireRole("admin"), requireProjectsConfigured, async function (req, res) {
  const pmId = req.body && req.body.pmId;
  if (!pmId || typeof pmId !== "string") {
    return res.status(400).json({ error: "pmId is required." });
  }

  try {
    const userRecords = await fetchAllUserRecords();
    const pmRecord = userRecords.filter(function (r) {
      return r.id === pmId;
    })[0];
    const pmFields = pmRecord && pmRecord.fields;
    const isActivePm =
      pmRecord &&
      mapAirtableRoleToAppRole(pmFields.Role) === "pm" &&
      (pmFields.Status || "").trim().toLowerCase() === "active";
    if (!isActivePm) {
      return res.status(400).json({ error: "pmId does not refer to an active Project Manager user." });
    }

    const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_PROJECTS_TABLE_ID + "/" + encodeURIComponent(req.params.id);
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + AIRTABLE_PAT,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fields: { "Project Manager": [pmId] } })
    });
    const body = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      console.error("[backend] Airtable rejected the Project Manager assignment:", response.status, JSON.stringify(body));
      return res.status(502).json({
        error: "Airtable rejected the request.",
        airtableStatus: response.status,
        airtableError: body && body.error
      });
    }

    const project = mapProjectRecord(body);
    project.pmName = pmFields["Full Name"] || null;
    return res.json({ project: project });
  } catch (networkError) {
    console.error("[backend] Could not reach Airtable to assign a Project Manager:", networkError);
    return res.status(502).json({ error: "Could not reach Airtable.", details: networkError.message });
  }
});

/* GET /api/projects/:id/tasks + GET /api/projects/:id/team (2026-09-25
   "Connect Project Workspace Team & Tasks to real Airtable data") — the
   Project Workspace's Tasks and Team panels previously read
   js/data/mock-data.js. Both reuse tables/relationships this file already
   has fully wired (Tasks table, Tasks.Project, Tasks.Assignee, Users
   table) — no new table, no new Airtable field, no n8n involvement.

   Access control (both routes, identical): a session may only see a
   project's tasks/team if it could already see that project via
   GET /api/projects — admin (any project), pm (only if the project's
   "Project Manager" link includes them, same pmIds check GET /api/projects
   already applies), teamMember (only if they have at least one Task
   assigned within this project — the same task-derived project-membership
   rule GET /api/projects' own teamMember branch and GET /api/tasks/my both
   already use), client (never — CLAUDE.md §4/§9: the Client Portal is a
   deliberately separate, client-safe render path that never reuses the
   internal task board/team roster). Re-checked here rather than trusted
   from the frontend, since these are single-project-by-id routes a session
   could otherwise call directly with a guessed id. */
function isAuthorizedForProjectTasks(role, sessionUserId, project, projectTasks) {
  if (role === "admin") return true;
  if (role === "pm") return (project.pmIds || []).indexOf(sessionUserId) !== -1;
  if (role === "teamMember") {
    return projectTasks.some(function (t) {
      return (t.assigneeIds || []).indexOf(sessionUserId) !== -1;
    });
  }
  return false;
}

app.get("/api/projects/:id/tasks", requireAuth, requireProjectsConfigured, async function (req, res) {
  try {
    const [projectRecords, taskRecords, userRecords] = await Promise.all([
      fetchAllProjectRecords(),
      fetchAllRecordsGeneric(AIRTABLE_TASKS_TABLE_ID),
      fetchAllUserRecords()
    ]);

    const projectRecord = projectRecords.filter(function (r) {
      return r.id === req.params.id;
    })[0];
    if (!projectRecord) {
      return res.status(404).json({ error: "Project not found." });
    }
    const project = mapProjectRecord(projectRecord);

    const projectTasks = taskRecords.map(mapDashboardTaskRecord).filter(function (t) {
      return (t.projectIds || []).indexOf(project.id) !== -1;
    });

    if (!isAuthorizedForProjectTasks(req.session.user.role, req.session.user.id, project, projectTasks)) {
      return res.status(403).json({ error: "Not authorized to view this project's tasks." });
    }

    const usersById = {};
    userRecords.forEach(function (r) {
      usersById[r.id] = (r.fields && r.fields["Full Name"]) || null;
    });

    const tasks = projectTasks.map(function (t) {
      const assigneeId = (t.assigneeIds || [])[0] || null;
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        description: t.description,
        dueDate: t.dueDate,
        assigneeId: assigneeId,
        assigneeName: assigneeId ? usersById[assigneeId] || null : null
      };
    });

    return res.json({ tasks: tasks });
  } catch (err) {
    console.error("[backend] Failed to fetch a Project's Tasks from Airtable:", err);
    return res.status(502).json({
      error: "Could not retrieve tasks from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

app.get("/api/projects/:id/team", requireAuth, requireProjectsConfigured, async function (req, res) {
  try {
    const [projectRecords, taskRecords, userRecords] = await Promise.all([
      fetchAllProjectRecords(),
      fetchAllRecordsGeneric(AIRTABLE_TASKS_TABLE_ID),
      fetchAllUserRecords()
    ]);

    const projectRecord = projectRecords.filter(function (r) {
      return r.id === req.params.id;
    })[0];
    if (!projectRecord) {
      return res.status(404).json({ error: "Project not found." });
    }
    const project = mapProjectRecord(projectRecord);

    const projectTasks = taskRecords.map(mapDashboardTaskRecord).filter(function (t) {
      return (t.projectIds || []).indexOf(project.id) !== -1;
    });

    if (!isAuthorizedForProjectTasks(req.session.user.role, req.session.user.id, project, projectTasks)) {
      return res.status(403).json({ error: "Not authorized to view this project's team." });
    }

    /* No direct Project<->Team link exists on the real Projects table
       (only "Project Manager" — see get_table_schema) — the team is
       derived as the set of real Users assigned at least one Task within
       this project, the same relationship GET /api/projects' teamMember
       branch already treats as "this project's team" for access purposes.
       Not the Project Manager themself — that's already shown separately
       in the header (project.pmName). */
    const usersById = {};
    userRecords.forEach(function (r) {
      usersById[r.id] = r;
    });

    const memberIds = [];
    projectTasks.forEach(function (t) {
      (t.assigneeIds || []).forEach(function (id) {
        if (memberIds.indexOf(id) === -1) memberIds.push(id);
      });
    });

    const team = memberIds
      .map(function (id) {
        return usersById[id];
      })
      .filter(Boolean)
      .map(function (r) {
        const fields = r.fields || {};
        return {
          id: r.id,
          fullName: fields["Full Name"] || null,
          roleKey: mapAirtableRoleToTeamRoleKey(fields.Role),
          email: fields.Email || null,
          phone: fields.Phone || null
        };
      });

    return res.json({ team: team });
  } catch (err) {
    console.error("[backend] Failed to fetch a Project's Team from Airtable:", err);
    return res.status(502).json({
      error: "Could not retrieve the project team from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

/* ===== Leads (2026-09-22 "Connect Leads to Airtable", role-gated
   2026-09-23 "Phase 1 security fix") =====

   pages/leads.html (js/services/leads-api.js) -> GET /api/leads -> this
   server -> Airtable REST API (read-only) -> Airtable Leads table
   (tbloeMHPaOzQSypPb). Requires an authenticated ADMIN session
   (requireRole("admin")) — same "frontend never talks to Airtable
   directly" rule as Users/Auth/Projects above; the PAT never leaves this
   server.

   Role gate added 2026-09-23: the full-application audit found this
   endpoint had no server-side role check at all, even though
   pages/leads.html is Admin-only client-side (window.IQRAA_ROLE=
   "admin") — live-verified as a real gap, both a Client session and a
   Team Member session could retrieve every lead (names, orgs, emails,
   phones, messages) by calling this endpoint directly. Leads is an
   Admin-facing prospect-management area (CLAUDE.md §9's nav table has no
   Leads entry for PM/Team Member/Client), so requireRole("admin") here
   simply makes the server agree with what the UI already only ever
   showed an Admin.

   **Status filter**: the task asked for leads whose Status is exactly
   "BOOKING MEETING", but the real Status single-select options
   (confirmed via get_table_schema, not guessed) are "New Lead" /
   "Processing" / "Meeting Booking" / "Proccessed" — there is no
   "BOOKING MEETING" option. Confirmed with the project owner to filter
   on the real option, "Meeting Booking", instead — see CLAUDE.md's
   note on this task for the full reasoning. The filter runs server-side
   via Airtable's filterByFormula (so unrelated leads are never even
   fetched, per the task's "prefer filtering at the backend/Airtable
   request level" instruction), and js/pages/leads.js re-checks it
   client-side as a defensive second layer.

   Extended 2026-09-25 from a single-status filter to LEADS_LIST_STATUSES
   (see that constant's own comment) so a lead an Admin has already moved
   to "Waiting for first payment" or "First payment paid" stays visible
   on this screen instead of vanishing before the Admin can carry it to
   the next step.

   Field mapping (Airtable field -> response field), confirmed against
   the real schema via get_table_schema, not guessed:
     Name                 -> name
     Organization          -> org
     Email                  -> email
     Phone                   -> phone
     Message Content          -> message
     Status (singleSelect)     -> status   (raw option label, "Meeting Booking" for every result — see filter above)
     (record's own createdTime, always present on every Airtable record) -> created

   Deliberately NOT included/invented: the Leads table has no field for
   product/service interest, assigned-to owner, or a separate "last
   activity" timestamp — the mock data these replaced had all three, but
   inventing them here would violate the "no fake data" rule this was
   built under. The frontend shows a placeholder for each instead — see
   js/pages/leads.js. "Confirmation Email Thread ID" (an internal n8n
   bookkeeping field, not lead-facing data) is deliberately excluded from
   the response too. */

/* 2026-09-25 "Waiting for first payment / First payment paid" — extends
   the Leads dashboard past the single "Meeting Booking" stage so an Admin
   can carry a lead through the post-meeting flow entirely from this
   screen. Extended again the same day ("Update Lead -> First Payment
   flow") to also include "Proccessed": Invoices now carries a real
   "Lead ID" link back to Leads (added directly in Airtable), and the
   already-live "payment-via-app-update" n8n workflow was rebuilt around
   it (js/services/finance-webhooks.js) to set a paid Invoice's linked
   Lead to "First payment paid" itself — the app has nothing to do with
   that write. A separate, already-existing SCHEDULED n8n workflow (not
   touched by this change, not called from the app) then picks up "First
   payment paid" leads, creates the Customer + Project, and sets the lead
   to Proccessed. Proccessed is included here (unlike the first version of
   this list) so that a completed lead stays visible with a "process
   complete" confirmation instead of silently vanishing from the screen —
   see js/pages/leads.js's per-status guidance panel. Confirmed against
   the real schema (get_table_schema) that every option string here
   matches exactly, same care the original "Meeting Booking" filter needed
   (see the note above about the "BOOKING MEETING" mismatch). */
var LEADS_LIST_STATUSES = ["Meeting Booking", "Waiting for first payment", "First payment paid", "Proccessed"];

/* The only status value this screen is ever allowed to write.
   "First payment paid" was REMOVED from this list 2026-09-25 ("Update
   Lead -> First Payment flow") — that transition is now made exclusively
   by the payment-via-app-update n8n workflow once an Admin actually
   completes payment on the linked Invoice (see the comment above
   LEADS_LIST_STATUSES), never by an Admin manually flipping the Lead's
   status from this screen. Letting the app set it directly would let an
   Admin skip straight past actual payment. "Proccessed" was never
   writable here and still isn't — that belongs to the scheduled
   Customer+Project workflow alone. */
var LEADS_WRITABLE_STATUSES = ["Waiting for first payment"];

function mapLeadRecord(record) {
  const fields = record.fields || {};
  return {
    id: record.id,
    name: fields.Name || null,
    org: fields.Organization || null,
    email: fields.Email || null,
    phone: fields.Phone || null,
    message: fields["Message Content"] || null,
    status: airtableSelectName(fields.Status),
    created: record.createdTime || null,
    /* Raw linked-record ids from the real Leads.Invoices field (added
       directly in Airtable, the inverse of Invoices' own "Lead ID") —
       resolved to a small display object by GET /api/leads below, not
       here, since that needs a join against Invoices/Clients this
       function doesn't have access to. */
    invoiceIds: fields.Invoices || []
  };
}

/* Resolves each lead's first linked Invoice (if any) to a small display
   object — invoiceNumber/clientName/total/pdfUrl — so the "Proccessed"
   guidance panel (js/pages/leads.js) can show the Admin which invoice and
   client the completed lead is tied to, per this task's explicit "if
   Customer/Project IDs or links exist, show them per the app's existing
   structure" requirement. Deliberately resolves only the CLIENT name, not
   that client's Projects — Clients' own "Projects" field was found to
   have drifted into an ambiguous state during this task's investigation
   (a same-named plain-text field alongside a separate "Projects 2" linked
   field), unrelated to this task and not touched here; reading it would
   risk the exact kind of crash that ambiguity could cause. Skipped
   entirely (leads keep invoice:null) if Invoices/Clients aren't
   configured on this backend — GET /api/leads must keep working even
   without them, same graceful-degradation pattern as every other
   optional join in this file. */
async function resolveLeadInvoices(leads) {
  if (!AIRTABLE_INVOICES_TABLE_ID || !AIRTABLE_CLIENTS_TABLE_ID) {
    leads.forEach(function (lead) {
      lead.invoice = null;
    });
    return leads;
  }

  const [invoiceRecords, clientRecords] = await Promise.all([fetchAllInvoiceRecords(), fetchAllClientRecords()]);

  const clientNameById = {};
  clientRecords.forEach(function (r) {
    clientNameById[r.id] = (r.fields && r.fields["Client Name"]) || null;
  });

  const invoiceById = {};
  invoiceRecords.forEach(function (record) {
    const fields = record.fields || {};
    if (!fields.InvoiceNumber) return;
    const clientId = firstLinkedId(fields.ClientID);
    const amount = typeof fields.Amount === "number" ? fields.Amount : 0;
    const vatAmount = typeof fields.VatAmount === "number" ? fields.VatAmount : 0;
    invoiceById[record.id] = {
      invoiceNumber: fields.InvoiceNumber,
      clientName: clientId ? clientNameById[clientId] || null : null,
      total: typeof fields.Total === "number" ? fields.Total : amount + vatAmount,
      pdfUrl: fields.PdfUrl || null
    };
  });

  leads.forEach(function (lead) {
    const invoiceId = firstLinkedId(lead.invoiceIds);
    lead.invoice = invoiceId ? invoiceById[invoiceId] || null : null;
  });
  return leads;
}

app.get("/api/leads", requireAuth, requireRole("admin"), requireLeadsConfigured, async function (req, res) {
  try {
    const formula =
      "OR(" +
      LEADS_LIST_STATUSES.map(function (statusValue) {
        return '{Status}="' + escapeForFormula(statusValue) + '"';
      }).join(",") +
      ")";
    const records = [];
    let offset;
    do {
      const params = new URLSearchParams();
      params.set("filterByFormula", formula);
      if (offset) params.set("offset", offset);
      const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_LEADS_TABLE_ID + "?" + params.toString();
      const response = await fetch(url, {
        headers: { Authorization: "Bearer " + AIRTABLE_PAT }
      });
      if (!response.ok) {
        const body = await response.json().catch(function () {
          return {};
        });
        const error = new Error("Airtable Leads fetch failed: " + response.status);
        error.airtableStatus = response.status;
        error.airtableError = body && body.error;
        throw error;
      }
      const body = await response.json();
      records.push.apply(records, body.records || []);
      offset = body.offset;
    } while (offset);

    const leads = await resolveLeadInvoices(records.map(mapLeadRecord));
    return res.json({ leads: leads });
  } catch (err) {
    console.error("[backend] Failed to fetch Leads from Airtable:", err);
    return res.status(502).json({
      error: "Could not retrieve leads from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

/* PATCH /api/leads/:id/status (2026-09-24 "Mark lead as Proccessed after
   its meeting", narrowed 2026-09-25 twice — first to the "Waiting for
   first payment / First payment paid" flow, then to just the one
   transition below once the payment side of that flow turned out to
   already be automated). Checked the existing n8n automation before
   adding this: "IQRAA Workflow 2- Lead Lifecycle Agent"'s own system
   prompt explicitly states "Processed is a valid Airtable status, but
   this workflow does not set or manage it" (it only drives New Lead ->
   Processing -> Meeting Booking), and no other workflow handled the
   post-meeting transitions either. Building a brand-new n8n workflow for
   this would violate CLAUDE.md's "don't add new n8n workflows before the
   basic UI is clear" rule, so this follows the Users-table precedent
   (§19b) instead — the backend makes the Airtable write directly,
   admin-only, same as everywhere else in this file.

   2026-09-25 "Update Lead -> First Payment flow": an Admin now only ever
   manually advances a lead from Meeting Booking to Waiting for first
   payment through this endpoint. The rest of the flow — Waiting for first
   payment -> First payment paid -> Proccessed — turned out to already be
   built outside the app: Invoices carries a real "Lead ID" link (added
   directly in Airtable), and the already-live "payment-via-app-update"
   n8n workflow (js/services/finance-webhooks.js) sets a paid Invoice's
   linked Lead to "First payment paid" itself once an Admin completes
   payment on it through Billing; a separate, already-existing SCHEDULED
   n8n workflow then creates the Customer + Project and sets the lead to
   Proccessed. So this endpoint must never accept "First payment paid" or
   "Proccessed" — accepting either would let an Admin skip past actual
   payment or bypass the Customer/Project creation n8n is responsible for.
   Only "Waiting for first payment" (LEADS_WRITABLE_STATUSES) is valid —
   a narrow "advance to exactly this one status" route, not a general "set
   any lead to any status" one. */
app.patch("/api/leads/:id/status", requireAuth, requireRole("admin"), requireLeadsConfigured, async function (req, res) {
  const targetStatus = req.body && req.body.status;
  if (LEADS_WRITABLE_STATUSES.indexOf(targetStatus) === -1) {
    return res.status(400).json({
      error: "status must be one of: " + LEADS_WRITABLE_STATUSES.join(", ") + "."
    });
  }

  try {
    const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_LEADS_TABLE_ID + "/" + encodeURIComponent(req.params.id);
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + AIRTABLE_PAT,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fields: { Status: targetStatus } })
    });
    const body = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      console.error("[backend] Airtable rejected the Lead status update:", response.status, JSON.stringify(body));
      return res.status(502).json({
        error: "Airtable rejected the request.",
        airtableStatus: response.status,
        airtableError: body && body.error
      });
    }
    return res.json({ lead: mapLeadRecord(body) });
  } catch (networkError) {
    console.error("[backend] Could not reach Airtable to update Lead status:", networkError);
    return res.status(502).json({ error: "Could not reach Airtable.", details: networkError.message });
  }
});

/* ===== Clients (2026-09-22b "Connect Clients to Airtable") =====

   pages/clients.html (Admin-only list) and pages/client-project.html
   (a client's own project view) both go through js/services/clients-api.js
   -> this server -> Airtable REST API (read-only) -> Airtable Clients
   table (tblZ6VWxICXnkmzzp), cross-referenced with Projects
   (tblK5seFEBbACNEWq) via the Clients table's own "Projects"
   linked-record field (confirmed via get_table_schema, the inverse of
   Projects' own "Clients" link — the exact relationship the task asked
   to reuse, not a new one).

   Two endpoints, deliberately different in shape and authorization:

   GET /api/clients (requireRole("admin")) — the admin-facing list.
   Returns every client with derived active/completed project counts and
   a lightweight list of their linked projects (id/name/status), enough
   for pages/clients.html's list + details modal. Field mapping, not
   guessed:
     Client Name             -> name
     Orginazation (sic, real field name) -> organization
     Email                    -> email
     Phone                     -> phone
     Projects (linked records)  -> activeProjects/completedProjects (derived:
       active = every linked project whose Status isn't "Completed"/
       "Cancelled"; completed = Status === "Completed") + a projects[]
       summary array for the details modal.
   Deliberately NOT included: there is no "Status" or "last activity"
   field on the real Clients table at all (unlike Projects/Leads/Users) —
   inventing one would violate the "no fake data" rule this was built
   under. The frontend shows a placeholder instead of a Status/Last
   Activity column value.

   GET /api/clients/me (requireRole("client")) — what client-project.html
   actually calls. This is the security-critical one (task's explicit
   "another client's project must not be reachable by changing a URL
   parameter" requirement): it NEVER accepts a client-supplied client/
   project id from the request. Instead it looks up the Clients record
   whose Email matches the AUTHENTICATED SESSION's email (the same
   email-based lookup pattern findUserByEmail already uses for login),
   and returns only that client's own linked project(s). There's no
   Users->Clients link field in the real schema (Users has no such
   field), so email is the closest existing, safely-derivable join key —
   every login is already keyed by a unique Email, and Clients has its
   own Email field for exactly this kind of contact identification.
   client-project.js then picks among ITS OWN returned projects by
   `?id=` client-side — it can never cause the backend to fetch a
   project outside that authorized set, because the backend already
   only ever fetched that set to begin with. */

function mapClientSummary(record, projectsById) {
  const fields = record.fields || {};
  const linkedProjectIds = fields.Projects || [];
  const linkedProjects = linkedProjectIds.map(function (id) {
    return projectsById[id];
  }).filter(Boolean);
  const active = linkedProjects.filter(function (p) {
    return p.status !== "Completed" && p.status !== "Cancelled";
  });
  const completed = linkedProjects.filter(function (p) {
    return p.status === "Completed";
  });
  return {
    id: record.id,
    /* Clients' own primary field ("Client ID", e.g. "CLI-001") — distinct
       from `id` (the Airtable record id). Exposed for the Invoice
       Creation form (pages/billing.html): the "IQRAA - Invoice Validation
       & Preparation (WF1)" n8n workflow's webhook looks a client up by
       this exact text value (its "Search records" node filters Clients on
       {Client ID} = body.clientId), not by the Airtable record id, so the
       frontend needs the real code to send, never inventing one. */
    clientCode: fields["Client ID"] || null,
    name: fields["Client Name"] || null,
    organization: fields.Orginazation || null,
    email: fields.Email || null,
    phone: fields.Phone || null,
    activeProjects: active.length,
    completedProjects: completed.length,
    projects: linkedProjects.map(function (p) {
      return { id: p.id, name: p.name, status: p.status };
    })
  };
}

async function fetchAllClientRecords() {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (offset) params.set("offset", offset);
    const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_CLIENTS_TABLE_ID + (params.toString() ? "?" + params.toString() : "");
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + AIRTABLE_PAT }
    });
    if (!response.ok) {
      const body = await response.json().catch(function () {
        return {};
      });
      const error = new Error("Airtable Clients fetch failed: " + response.status);
      error.airtableStatus = response.status;
      error.airtableError = body && body.error;
      throw error;
    }
    const body = await response.json();
    records.push.apply(records, body.records || []);
    offset = body.offset;
  } while (offset);
  return records;
}

async function buildProjectsById() {
  const projectRecords = await fetchAllProjectRecords();
  const projectsById = {};
  projectRecords.map(mapProjectRecord).forEach(function (p) {
    projectsById[p.id] = p;
  });
  return projectsById;
}

app.get("/api/clients", requireAuth, requireRole("admin"), requireClientsConfigured, async function (req, res) {
  try {
    const projectsById = await buildProjectsById();
    const clientRecords = await fetchAllClientRecords();
    return res.json({ clients: clientRecords.map(function (r) {
      return mapClientSummary(r, projectsById);
    }) });
  } catch (err) {
    console.error("[backend] Failed to fetch Clients from Airtable:", err);
    return res.status(502).json({
      error: "Could not retrieve clients from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

app.get("/api/clients/me", requireAuth, requireRole("client"), requireClientsConfigured, async function (req, res) {
  try {
    const formula = 'LOWER({Email})=LOWER("' + escapeForFormula(req.session.user.email) + '")';
    const url =
      "https://api.airtable.com/v0/" +
      AIRTABLE_BASE_ID +
      "/" +
      AIRTABLE_CLIENTS_TABLE_ID +
      "?maxRecords=1&filterByFormula=" +
      encodeURIComponent(formula);
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + AIRTABLE_PAT }
    });
    if (!response.ok) {
      const body = await response.json().catch(function () {
        return {};
      });
      console.error("[backend] Clients lookup by email failed:", response.status, JSON.stringify(body));
      return res.status(502).json({ error: "Could not look up client record." });
    }
    const body = await response.json();
    const clientRecord = body.records && body.records[0];
    if (!clientRecord) {
      /* No Clients record's Email matches this session — this account
         isn't linked to a client, so there is nothing it's authorized to
         see. 403, not 404: the caller IS authenticated, just not
         authorized for any client data at all. */
      console.warn("[backend] Authenticated client session has no matching Clients record:", req.session.user.email);
      return res.status(403).json({ error: "No client record is linked to this account." });
    }

    const fields = clientRecord.fields || {};
    const linkedProjectIds = fields.Projects || [];
    let projects = [];
    if (linkedProjectIds.length > 0) {
      const projectsById = await buildProjectsById();
      projects = linkedProjectIds.map(function (id) {
        return projectsById[id];
      }).filter(Boolean);
    }

    return res.json({
      client: {
        id: clientRecord.id,
        name: fields["Client Name"] || null,
        organization: fields.Orginazation || null,
        email: fields.Email || null,
        phone: fields.Phone || null
      },
      projects: projects
    });
  } catch (err) {
    console.error("[backend] Failed to resolve authenticated client's projects:", err);
    return res.status(502).json({
      error: "Could not retrieve your project information from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

/* ===== Admin Dashboard (2026-09-22 "Connect Admin Dashboard to Airtable") =====

   pages/dashboard-admin.html (js/services/dashboard-api.js) -> GET
   /api/dashboard/admin -> this server -> Airtable REST API (read-only,
   5 existing tables: Leads, Users, Projects, Tasks, Payments) -> one
   computed JSON summary. This is a summary/reporting endpoint, not a new
   Airtable table — every number is derived from tables the rest of the
   app already reads, joined and aggregated server-side so the frontend
   makes exactly one request per page load. Requires an authenticated
   Admin session (requireRole("admin")), same as /api/clients.

   Deliberately NOT fetched: Clients (Projects.Client is already a plain
   text field — no join needed) and Meetings & Decisions (nothing on this
   dashboard's existing UI surfaces meeting data).

   Status vocabulary and workflow rules below are confirmed against the
   real schema (get_table_schema) and real records (list_records_for_table),
   not guessed:

     Leads.Status options: "New Lead" / "Processing" / "Meeting Booking" /
       "Proccessed". "New Leads" KPI = count of Status === "New Lead" —
       matches the existing Hebrew label "לידים חדשים" ("new leads")
       literally, a lead that hasn't been contacted/processed yet at all
       (distinct from leads.html's own "Meeting Booking" filter, which is
       a different, later stage of the same pipeline).

     Projects.Status options: "Draft" / "Ready to Start" / "In Progress" /
       "On Hold" / "Completed" / "Cancelled". "Active Projects" = Status
       === "In Progress", the only option that actually means work is
       underway.

     Projects.Current Stage includes "Client Script Approval" / "Client
       Review" / "Client Approval" — the same 3-stage "waiting on client"
       set js/services/project-helpers.js's CLIENT_ACTION_STAGES already
       encodes for mock data. "Pending Client Approvals" = projects whose
       Current Stage is one of these three.

     Payments.Payment Type options: "First" / "Milestone" / "Final".
     Payments.Status options: "Pending" / "Paid" / "Overdue". Per
       CLAUDE.md §10's documented workflow ("when the first project
       payment is received, the project becomes ready to start"), a
       project's Status being "Ready to Start" is not itself proof the
       payment was confirmed (that field can be set by hand) — "Ready to
       Start" KPI/list = projects with Status === "Ready to Start" AND at
       least one linked Payment with Payment Type === "First" and Status
       === "Paid", joined via Payments' own "Projects" link field (the
       reverse of Projects' "Payments 2" link field).

     "Outstanding Payments" = every Payment whose Status !== "Paid" (i.e.
       "Pending" or "Overdue") — count + sum of Amount.

     Tasks.Status options: "Not Started" / "In Progress" / "Waiting" /
       "Review" / "Completed". "Overdue Tasks" = Status !== "Completed"
       AND Due Date is before today (server's own clock, date-only
       comparison, same rule as isTaskOverdue below).

   PM Workload: Users whose Role maps to app role "pm" (see
   AIRTABLE_ROLE_TO_APP_ROLE above), joined against Projects' own
   "Project Manager" link field (not the "User ID (from Project
   Manager)" lookup, which is unset on most real records — see the
   Projects section above). projectCount = # of Projects linking to that
   PM's user record id; attentionCount = # of those projects with at
   least one overdue task — the simplest "needs attention" signal the
   real schema actually supports without inventing a new field.

   Live-data note (superseded 2026-09-23): on 2026-09-22, when this
   endpoint was first built, the real base had 0 Task records, 0
   populated Payment records and 0 Users with Role "Project Manager", so
   overdueTasks/outstandingPayments/readyToStart/pmWorkload legitimately
   computed to 0/empty against the data at the time, not a bug. That is
   no longer the current state — Tasks, Payments and a Project-Manager
   user were subsequently added (see the My Tasks and Invoices/Payments
   sections below), so these KPIs now compute against real records. This
   note is kept only to explain that history; the aggregation logic
   itself is unchanged. */

const AIRTABLE_TASKS_TABLE_ID = process.env.AIRTABLE_TASKS_TABLE_ID;
const AIRTABLE_PAYMENTS_TABLE_ID = process.env.AIRTABLE_PAYMENTS_TABLE_ID;
/* AIRTABLE_PAYMENTS_VIEW_ID is optional, same pattern as
   AIRTABLE_PROJECTS_VIEW_ID: if unset, GET /api/billing reads the whole
   Payments table instead of one view. */
const AIRTABLE_PAYMENTS_VIEW_ID = process.env.AIRTABLE_PAYMENTS_VIEW_ID;
/* Meetings & Decisions table (2026-09-22c "Connect PM Dashboard to
   Airtable") — used only by GET /api/dashboard/pm's "Recent Project
   Activity" panel, see that route below. */
const AIRTABLE_MEETINGS_TABLE_ID = process.env.AIRTABLE_MEETINGS_TABLE_ID;
/* Invoices table (2026-09-22d "Connect Billing to Airtable") — used only
   by GET /api/billing, see that route below. AIRTABLE_INVOICES_VIEW_ID is
   optional, same pattern as AIRTABLE_PAYMENTS_VIEW_ID above. */
const AIRTABLE_INVOICES_TABLE_ID = process.env.AIRTABLE_INVOICES_TABLE_ID;
const AIRTABLE_INVOICES_VIEW_ID = process.env.AIRTABLE_INVOICES_VIEW_ID;

function requireDashboardConfigured(req, res, next) {
  const missing = [];
  if (!AIRTABLE_PAT) missing.push("AIRTABLE_PAT");
  if (!AIRTABLE_BASE_ID) missing.push("AIRTABLE_BASE_ID");
  if (!AIRTABLE_LEADS_TABLE_ID) missing.push("AIRTABLE_LEADS_TABLE_ID");
  if (!AIRTABLE_PROJECTS_TABLE_ID) missing.push("AIRTABLE_PROJECTS_TABLE_ID");
  if (!AIRTABLE_TASKS_TABLE_ID) missing.push("AIRTABLE_TASKS_TABLE_ID");
  if (!AIRTABLE_PAYMENTS_TABLE_ID) missing.push("AIRTABLE_PAYMENTS_TABLE_ID");
  if (!AIRTABLE_USERS_TABLE_ID) missing.push("AIRTABLE_USERS_TABLE_ID");
  if (missing.length > 0) {
    return res.status(503).json({
      error: "Airtable tables required for the Admin Dashboard are not fully configured on this backend.",
      missingEnvVars: missing
    });
  }
  next();
}

/* Generic paginated fetch, used only by the 3 tables this endpoint reads
   that have no existing fetchAll* helper (Tasks, Payments, and an
   unfiltered read of Leads — the existing /api/leads route's Leads fetch
   is deliberately pre-filtered to "Meeting Booking" via filterByFormula,
   which isn't what this endpoint needs). Users/Projects reuse the
   existing fetchAllUserRecords()/fetchAllProjectRecords() above rather
   than duplicating those. */
async function fetchAllRecordsGeneric(tableId) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (offset) params.set("offset", offset);
    const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + tableId + (params.toString() ? "?" + params.toString() : "");
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + AIRTABLE_PAT }
    });
    if (!response.ok) {
      const body = await response.json().catch(function () {
        return {};
      });
      const error = new Error("Airtable fetch failed for table " + tableId + ": " + response.status);
      error.airtableStatus = response.status;
      error.airtableError = body && body.error;
      throw error;
    }
    const body = await response.json();
    records.push.apply(records, body.records || []);
    offset = body.offset;
  } while (offset);
  return records;
}

function mapDashboardLeadRecord(record) {
  const fields = record.fields || {};
  return { id: record.id, status: airtableSelectName(fields.Status) };
}

function mapDashboardTaskRecord(record) {
  const fields = record.fields || {};
  return {
    id: record.id,
    /* "title" is additive (2026-09-22c "Connect PM Dashboard to Airtable")
       — the Admin Dashboard endpoint never needed a task's display name,
       only its Project/Status/Due Date, so this field didn't exist before.
       Purely additive: that endpoint's own mapping call site ignores
       fields it doesn't read. */
    title: fields["Task Name"] || null,
    projectIds: fields.Project || [],
    /* "assigneeIds"/"priority" are additive too (2026-09-23 "Connect My
       Tasks to Airtable") — GET /api/tasks/my needs Tasks.Assignee (the
       real linked-record field, an array of Airtable Users record ids —
       see CLAUDE.md's "never filter by the User ID text field" rule) to
       find this user's own tasks, and Priority (plain free text on this
       table, not a select) for display. Neither the Admin nor PM
       dashboard call sites read these, so this stays purely additive. */
    assigneeIds: fields.Assignee || [],
    priority: fields.Priority || null,
    status: airtableSelectName(fields.Status),
    dueDate: fields["Due Date"] || null,
    /* "description" is additive too (2026-09-25 "Connect Project Workspace
       Team & Tasks" fix) — GET /api/projects/:id/tasks is the first call
       site that needs Tasks.Description (multilineText) for the task
       detail modal; every existing call site ignores fields it doesn't
       read, same as title/assigneeIds/priority above. */
    description: fields.Description || null
  };
}

function mapDashboardPaymentRecord(record) {
  const fields = record.fields || {};
  return {
    id: record.id,
    projectIds: fields.Projects || [],
    type: airtableSelectName(fields["Payment Type"]),
    amount: typeof fields.Amount === "number" ? fields.Amount : 0,
    status: airtableSelectName(fields.Status)
  };
}

function isTaskOverdue(task) {
  if (!task.dueDate) return false;
  if (task.status === "Completed") return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

var DASHBOARD_CLIENT_ACTION_STAGES = ["Client Script Approval", "Client Review", "Client Approval"];

/* Fixed pipeline order (matches Projects.Current Stage's real 10 select
   options, in the order they're configured in Airtable) so "Projects by
   Stage" always returns all 10 stages, including ones with a 0 count —
   same "show every stage, not just non-empty ones" behavior as the mock
   dashboard's stage summary bars. */
var DASHBOARD_STAGE_ORDER = [
  "Specification",
  "Script",
  "Client Script Approval",
  "Design",
  "Production",
  "QA",
  "Client Review",
  "Changes",
  "Client Approval",
  "Publication"
];

app.get("/api/dashboard/admin", requireAuth, requireRole("admin"), requireDashboardConfigured, async function (req, res) {
  try {
    const [leadRecords, projectRecords, taskRecords, paymentRecords, userRecords] = await Promise.all([
      fetchAllRecordsGeneric(AIRTABLE_LEADS_TABLE_ID),
      fetchAllProjectRecords(),
      fetchAllRecordsGeneric(AIRTABLE_TASKS_TABLE_ID),
      fetchAllRecordsGeneric(AIRTABLE_PAYMENTS_TABLE_ID),
      fetchAllUserRecords()
    ]);

    const leads = leadRecords.map(mapDashboardLeadRecord);
    const projects = projectRecords.map(mapProjectRecord);
    const tasks = taskRecords.map(mapDashboardTaskRecord);
    const payments = paymentRecords.map(mapDashboardPaymentRecord);

    const usersById = {};
    userRecords.forEach(function (r) {
      usersById[r.id] = { fullName: (r.fields && r.fields["Full Name"]) || null };
    });

    function pmNameFor(project) {
      const names = (project.pmIds || [])
        .map(function (id) {
          return usersById[id] && usersById[id].fullName;
        })
        .filter(Boolean);
      return names.length ? names.join(", ") : null;
    }

    const paymentsByProjectId = {};
    payments.forEach(function (payment) {
      payment.projectIds.forEach(function (pid) {
        if (!paymentsByProjectId[pid]) paymentsByProjectId[pid] = [];
        paymentsByProjectId[pid].push(payment);
      });
    });

    const tasksByProjectId = {};
    tasks.forEach(function (task) {
      task.projectIds.forEach(function (pid) {
        if (!tasksByProjectId[pid]) tasksByProjectId[pid] = [];
        tasksByProjectId[pid].push(task);
      });
    });

    function firstPaymentStatusFor(projectId) {
      const first = (paymentsByProjectId[projectId] || []).filter(function (p) {
        return p.type === "First";
      })[0];
      return first ? first.status : null;
    }

    function hasConfirmedFirstPayment(projectId) {
      return (paymentsByProjectId[projectId] || []).some(function (p) {
        return p.type === "First" && p.status === "Paid";
      });
    }

    const newLeadsCount = leads.filter(function (l) {
      return l.status === "New Lead";
    }).length;

    const activeProjects = projects.filter(function (p) {
      return p.status === "In Progress";
    });

    const readyToStartProjects = projects.filter(function (p) {
      return p.status === "Ready to Start" && hasConfirmedFirstPayment(p.id);
    });

    const pendingClientApprovalsCount = projects.filter(function (p) {
      return DASHBOARD_CLIENT_ACTION_STAGES.indexOf(p.stage) !== -1;
    }).length;

    const overdueTasks = tasks.filter(isTaskOverdue);

    const outstandingPayments = payments.filter(function (p) {
      return p.status === "Pending" || p.status === "Overdue";
    });
    const outstandingPaymentsAmount = outstandingPayments.reduce(function (sum, p) {
      return sum + (p.amount || 0);
    }, 0);

    const stageCounts = {};
    DASHBOARD_STAGE_ORDER.forEach(function (s) {
      stageCounts[s] = 0;
    });
    projects.forEach(function (p) {
      if (p.stage && stageCounts[p.stage] !== undefined) stageCounts[p.stage] += 1;
    });

    const pmUsers = userRecords.filter(function (r) {
      return mapAirtableRoleToAppRole(r.fields && r.fields.Role) === "pm";
    });
    const pmWorkload = pmUsers.map(function (userRecord) {
      const assigned = projects.filter(function (p) {
        return (p.pmIds || []).indexOf(userRecord.id) !== -1;
      });
      const attention = assigned.filter(function (p) {
        return (tasksByProjectId[p.id] || []).some(isTaskOverdue);
      });
      return {
        id: userRecord.id,
        name: (userRecord.fields && userRecord.fields["Full Name"]) || null,
        projectCount: assigned.length,
        attentionCount: attention.length
      };
    });

    return res.json({
      kpis: {
        newLeads: newLeadsCount,
        activeProjects: activeProjects.length,
        readyToStart: readyToStartProjects.length,
        pendingClientApprovals: pendingClientApprovalsCount,
        overdueTasks: overdueTasks.length,
        outstandingPaymentsAmount: outstandingPaymentsAmount,
        outstandingPaymentsCount: outstandingPayments.length
      },
      activeProjects: activeProjects.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          client: p.client,
          pmName: pmNameFor(p),
          stage: p.stage,
          progress: p.progress,
          deadline: p.deadline,
          status: p.status
        };
      }),
      readyToStart: readyToStartProjects.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          client: p.client,
          firstPaymentStatus: firstPaymentStatusFor(p.id)
        };
      }),
      projectsByStage: DASHBOARD_STAGE_ORDER.map(function (s) {
        return { stage: s, count: stageCounts[s] };
      }),
      pmWorkload: pmWorkload
    });
  } catch (err) {
    console.error("[backend] Failed to compute Admin Dashboard data:", err);
    return res.status(502).json({
      error: "Could not compute Admin Dashboard data from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

/* ===== PM Dashboard (2026-09-22c "Connect PM Dashboard to Airtable") =====

   pages/dashboard-pm.html (js/services/dashboard-api.js) -> GET
   /api/dashboard/pm -> this server -> Airtable REST API (read-only, 3
   tables: Projects, Tasks, Meetings & Decisions) -> one computed JSON
   summary, scoped to the AUTHENTICATED PM's own projects only. Requires
   an authenticated session with role "pm" (requireRole("pm")) — a
   non-PM session gets a real 403, and there is no userId/pmId query
   parameter anywhere in this route; the PM is identified purely from
   req.session.user.id (CLAUDE.md's "never trust a frontend-supplied
   identity for authorization" rule, same as /api/clients/me).

   Schema facts below are confirmed against the real base via
   get_table_schema/list_records_for_table, not guessed:

     Projects."Project Manager" is a multipleRecordLinks field to Users
       (fldKcVyAhuQkBaNlg) — "my projects" = every Project whose
       pmIds (mapProjectRecord already exposes this, added for the Admin
       Dashboard task) includes the session's own Airtable user id.

     Tasks.Project (multipleRecordLinks) is how a Task belongs to a
       Project — there is also a Tasks.Assignee link straight to Users,
       but CLAUDE.md §4 scopes a PM to "assigned projects only: project
       team, tasks" (the whole project's tasks, not just tasks personally
       assigned to the PM), so relevance here is project membership, not
       Assignee. Tasks.Status options (same 5 as the Admin Dashboard
       already documented): "Not Started"/"In Progress"/"Waiting"/
       "Review"/"Completed".

     Meetings & Decisions.Project (multipleRecordLinks) is the same kind
       of link, used to scope "recent activity" to the PM's own projects
       — CLAUDE.md §6/§7G: meetings are the project's operational history,
       not a calendar.

   "Active projects" (KPI + the "My Projects" table) = the PM's own
   projects excluding Status "Completed"/"Cancelled" (the two Projects.
   Status options that mean the work itself is over) — every other status
   (Draft/Ready to Start/In Progress/On Hold) is still something a PM is
   actively managing. This is also the project set every other number on
   this endpoint (tasks/upcoming-deadlines) is scoped against.

   "Tasks needing attention" = tasks belonging to one of those active
   projects, excluding Status "Completed", where Status is "Waiting" or
   "Review", OR the task is overdue (same isTaskOverdue() the Admin
   Dashboard already uses). "Overdue tasks" is the subset of those that
   are actually overdue — matches the mock-data version of this dashboard
   (js/pages/dashboard-pm.js's old attentionTasks()/kpiOverdueTasks
   logic), just computed from real records instead of js/data/mock-data.js.

   "Upcoming deadlines" = (active projects whose Deadline falls in the
   next 7 days) + (relevant, non-completed, non-overdue tasks whose Due
   Date falls in the next 7 days) — CLAUDE.md's own task text says "keep
   the calculation simple," so this is a plain count, not two separate
   KPIs.

   Deliberately NOT surfaced as dashboard UI (documented scope decision,
   not an oversight): CLAUDE.md's task brief also describes "Pending
   Client Feedback" and "Pending Approvals" as PM dashboard concepts
   (both derivable from Projects.Current Stage, the same
   DASHBOARD_CLIENT_ACTION_STAGES 3-stage set the Admin Dashboard already
   uses). pages/dashboard-pm.html's existing markup — preserved unchanged
   per this task's explicit "do not redesign" instruction — has no KPI
   card or panel for either concept, only "Active Projects"/"Tasks
   Attention"/"Overdue Tasks"/"Upcoming Deadlines" and the 3 panels below.
   Adding new cards would be a redesign, so these two are left uncomputed
   rather than returned as dead JSON fields nothing renders — see the
   chat report for this task for the full reasoning. */

function requirePmDashboardConfigured(req, res, next) {
  const missing = [];
  if (!AIRTABLE_PAT) missing.push("AIRTABLE_PAT");
  if (!AIRTABLE_BASE_ID) missing.push("AIRTABLE_BASE_ID");
  if (!AIRTABLE_PROJECTS_TABLE_ID) missing.push("AIRTABLE_PROJECTS_TABLE_ID");
  if (!AIRTABLE_TASKS_TABLE_ID) missing.push("AIRTABLE_TASKS_TABLE_ID");
  if (!AIRTABLE_MEETINGS_TABLE_ID) missing.push("AIRTABLE_MEETINGS_TABLE_ID");
  if (missing.length > 0) {
    return res.status(503).json({
      error: "Airtable tables required for the PM Dashboard are not fully configured on this backend.",
      missingEnvVars: missing
    });
  }
  next();
}

function mapDashboardMeetingRecord(record) {
  const fields = record.fields || {};
  return {
    id: record.id,
    projectIds: fields.Project || [],
    meetingType: airtableSelectName(fields["Meeting Type"]),
    date: fields.Date || null,
    summary: fields.Summary || null
  };
}

function inNextNDays(dateStr, days) {
  if (!dateStr) return false;
  var today = new Date(new Date().toDateString());
  var horizon = new Date(today);
  horizon.setDate(horizon.getDate() + days);
  var d = new Date(dateStr);
  return d >= today && d <= horizon;
}

app.get("/api/dashboard/pm", requireAuth, requireRole("pm"), requirePmDashboardConfigured, async function (req, res) {
  try {
    const pmId = req.session.user.id;

    const [projectRecords, taskRecords, meetingRecords] = await Promise.all([
      fetchAllProjectRecords(),
      fetchAllRecordsGeneric(AIRTABLE_TASKS_TABLE_ID),
      fetchAllRecordsGeneric(AIRTABLE_MEETINGS_TABLE_ID)
    ]);

    const allProjects = projectRecords.map(mapProjectRecord);
    const myProjectsAll = allProjects.filter(function (p) {
      return (p.pmIds || []).indexOf(pmId) !== -1;
    });
    const myProjects = myProjectsAll.filter(function (p) {
      return p.status !== "Completed" && p.status !== "Cancelled";
    });
    const myProjectIds = myProjects.map(function (p) {
      return p.id;
    });
    const projectsById = {};
    myProjects.forEach(function (p) {
      projectsById[p.id] = p;
    });

    function belongsToMyProjects(linkedIds) {
      return (linkedIds || []).some(function (id) {
        return myProjectIds.indexOf(id) !== -1;
      });
    }

    const tasks = taskRecords
      .map(mapDashboardTaskRecord)
      .filter(function (t) {
        return belongsToMyProjects(t.projectIds);
      });

    const attentionTasks = tasks.filter(function (t) {
      if (t.status === "Completed") return false;
      return t.status === "Waiting" || t.status === "Review" || isTaskOverdue(t);
    });
    const overdueTasks = attentionTasks.filter(isTaskOverdue);

    const upcomingProjectDeadlines = myProjects.filter(function (p) {
      return inNextNDays(p.deadline, 7);
    });
    const upcomingTaskDeadlines = tasks.filter(function (t) {
      return t.status !== "Completed" && !isTaskOverdue(t) && inNextNDays(t.dueDate, 7);
    });

    const meetings = meetingRecords
      .map(mapDashboardMeetingRecord)
      .filter(function (m) {
        return belongsToMyProjects(m.projectIds);
      })
      .sort(function (a, b) {
        return new Date(b.date || 0) - new Date(a.date || 0);
      })
      .slice(0, 10);

    function projectNameFor(linkedIds) {
      const match = (linkedIds || []).map(function (id) {
        return projectsById[id];
      }).filter(Boolean)[0];
      return match ? match.name : null;
    }

    function projectIdFor(linkedIds) {
      const match = (linkedIds || []).filter(function (id) {
        return projectsById[id];
      })[0];
      return match || null;
    }

    return res.json({
      kpis: {
        activeProjects: myProjects.length,
        tasksNeedingAttention: attentionTasks.length,
        overdueTasks: overdueTasks.length,
        upcomingDeadlines: upcomingProjectDeadlines.length + upcomingTaskDeadlines.length
      },
      myProjects: myProjects.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          client: p.client,
          stage: p.stage,
          progress: p.progress,
          deadline: p.deadline,
          status: p.status
        };
      }),
      attentionTasks: attentionTasks.map(function (t) {
        return {
          id: t.id,
          title: t.title,
          projectId: projectIdFor(t.projectIds),
          projectName: projectNameFor(t.projectIds),
          status: t.status,
          dueDate: t.dueDate,
          overdue: isTaskOverdue(t)
        };
      }),
      recentActivity: meetings.map(function (m) {
        return {
          id: m.id,
          projectId: projectIdFor(m.projectIds),
          projectName: projectNameFor(m.projectIds),
          meetingType: m.meetingType,
          date: m.date,
          summary: m.summary
        };
      })
    });
  } catch (err) {
    console.error("[backend] Failed to compute PM Dashboard data:", err);
    return res.status(502).json({
      error: "Could not compute PM Dashboard data from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

/* ===== Billing (2026-09-22d "Connect Billing to Airtable") =====

   pages/billing.html (js/services/billing-api.js) -> GET /api/billing ->
   this server -> Airtable REST API (read-only, 4 tables: Payments,
   Invoices, Projects, Clients) -> one computed JSON summary. Requires an
   authenticated Admin session (requireRole("admin")), same as
   /api/clients and /api/dashboard/admin — Billing is an Admin/CEO-only
   screen (CLAUDE.md §4/§9's sidebar table has no Billing entry for any
   other role).

   Both Payments and Invoices tables were EMPTY at the start of this task
   — 3 realistic test records were created in each via Airtable MCP (not
   guessed), linked to 3 of the pre-existing Projects/Clients records
   (PRJ-001/CLI-001, PRJ-002/CLI-002, PRJ-003/CLI-003). Schema confirmed
   via get_table_schema, not assumed:

     Payments (tblBE8s5TcVgO5fQg): "Payment ID" (primary text), "Projects"
       (link -> Projects), "Clients" (link -> Clients), "Invoice ID"
       (link -> Invoices), "Payment Type" (singleSelect: First/Milestone/
       Final), "Amount" (number), "Status" (singleSelect: Pending/Paid/
       Overdue), "Due Date" (date), "Paid Date" (date), "Invoice Status"
       (singleSelect: Processing/Sent/On-Hold/Missing Data — an internal
       invoice-processing state, deliberately NOT what this endpoint shows
       as "invoice status", see below), "Notes" (multilineText).

     Invoices (tbltfJG5W43wIAHAz): "InvoiceNumber" (primary text),
       "ClientID" (link -> Clients), "Amount" (number), "VatAmount"
       (number, 18% always), "Total" (formula = Amount + VatAmount),
       "Status" (plain singleLineText, NOT a select — free text), "PdfUrl"
       (url), "Payments" (link -> Payments, the inverse of Payments'
       "Invoice ID").

   Row unit = one Payment (the real, empty-until-now table this task was
   built to prove out), since neither Projects nor Invoices carries a
   ready-made "total value / received / remaining" trio the way the old
   mock js/data/mock-data.js project records did — Payments' own Amount +
   Status is the actual billable line item. Project/Client names are
   resolved by joining Payments' linked-record ids against Projects/
   Clients (those links display the linked table's PRIMARY field, which is
   "Project ID"/"Client ID", e.g. "PRJ-001" — not the human-readable
   "Project Name"/"Client Name" fields billing.html needs, so this reuses
   the existing fetchAllProjectRecords()/mapProjectRecord() and a small
   Clients name lookup rather than trusting the link's own display name).

   "Invoice Status" (on a Payment row) = the linked Invoice record's own
   free-text "Status" field, shown as-is (no i18n lookup, same treatment
   as Leads' free-text status — CLAUDE.md §12 only covers a closed set of
   known vocabularies, and Invoices.Status is deliberately open text, not
   a select). Not Payments' own "Invoice Status" select (a different,
   internal-processing vocabulary with no UI slot here).

   ===== Admin financial management audit (2026-09-22) =====

   Extended this endpoint (still the same GET /api/billing, no second
   endpoint) to expose real Invoice records instead of just borrowing
   their Status text for a Payment row. CLAUDE.md §5's own rule — "do NOT
   treat Invoice Status and Payment Status as the same thing" — is
   implemented as two separate fields per invoice:
     - status: the Invoice's own free-text Status field, untouched.
     - paymentStatus: a derived "unpaid" | "partial" | "paid" | "overdue"
       computed here from the invoice's Total against the SUM of its
       linked Payments' Amount (only Payments with Status==="Paid" count
       toward "paid") — never from the Invoice's own Status text. See
       deriveInvoicePaymentStatus() below for the exact rule, which
       matches the task's worked example (Total 5000, Payments 2000+1000
       -> paid 3000, remaining 2000, status "partial") exactly. "overdue"
       overrides "unpaid"/"partial" (never "paid") when at least one
       linked Payment's Due Date has passed while money is still owed —
       Invoices has no Due Date field of its own, so a linked Payment's
       Due Date is the only date available to test against.
   Per the project owner's explicit 2026-09-22 answer, this derived
   paymentStatus renders as English words on the Hebrew page (paymentStatus.*
   in translations.js) — the same convention as the pre-existing
   status / leadStatus / invoiceStatus / team.status exception in
   CLAUDE.md §12, now a fifth named category there.

   ===== Invoice/Payment <-> Lead integration (2026-09-25) =====

   Invoices gained a real linked-record field, "Lead ID" (-> Leads), added
   directly in Airtable (not by this app). The live "payment-via-app-update"
   n8n workflow (unchanged by this task, per explicit instruction) was
   rebuilt around it: given an invoice_id, it now finds the Invoice, sets
   its own free-text Status field to whatever "status" the app sent (the
   app always sends "PAID"), then reads that same Invoice record's "Lead
   ID" link and sets the linked Lead's Status to "First payment paid" —
   it no longer searches for or touches any Payment record at all (the
   Payments-table-based update flow this comment block describes above is
   the PREVIOUS version of that workflow). This endpoint was extended only
   to resolve and expose that same Lead link (leadId/leadName below) so
   the Invoices table/detail modal can show which Lead an invoice is
   connected to — the Payments-derived paidAmount/remaining/paymentStatus
   fields above are UNCHANGED and still computed the old way, so a paid
   invoice can show status "PAID" while paymentStatus still reads "unpaid"
   until/unless a real Payment record exists for it too. That mismatch is
   a known, reported limitation of this narrow integration task, not
   something this task was asked to reconcile.

   kpis is now { invoices: {...}, payments: {...} } instead of one flat
   object — invoices.totalInvoices/totalInvoicedAmount/openUnpaidInvoices
   and payments.totalPaid/totalOutstanding/partiallyPaidInvoices/
   overduePayments, computed per the task's Step 5 spec: totalOutstanding
   sums each invoice's own (total - paidAmount) rather than trusting any
   status field; totalPaid sums actual Payment records with
   Status==="Paid" (not derived from Invoice Status); overduePayments
   counts individual Payment records (Status==="Overdue", or a past Due
   Date on a not-yet-Paid payment) — a payment-level metric, deliberately
   separate from the invoice-level paymentStatus above. The previous flat
   totalValue/received/pending/overdueAmount/awaitingPaymentProjects
   shape is dropped — nothing outside js/pages/billing.js (rewritten in
   this same task) ever read it. */

function isPastDue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function deriveInvoicePaymentStatus(total, paidAmount, linkedPayments) {
  if (total > 0 && paidAmount >= total) return "paid";
  const remaining = total - paidAmount;
  const anyOverdue = linkedPayments.some(function (p) {
    return p.dueDate && p.status !== "Paid" && isPastDue(p.dueDate);
  });
  if (remaining > 0 && anyOverdue) return "overdue";
  if (paidAmount > 0) return "partial";
  return "unpaid";
}

function requireBillingConfigured(req, res, next) {
  const missing = [];
  if (!AIRTABLE_PAT) missing.push("AIRTABLE_PAT");
  if (!AIRTABLE_BASE_ID) missing.push("AIRTABLE_BASE_ID");
  if (!AIRTABLE_PAYMENTS_TABLE_ID) missing.push("AIRTABLE_PAYMENTS_TABLE_ID");
  if (!AIRTABLE_INVOICES_TABLE_ID) missing.push("AIRTABLE_INVOICES_TABLE_ID");
  if (!AIRTABLE_PROJECTS_TABLE_ID) missing.push("AIRTABLE_PROJECTS_TABLE_ID");
  if (!AIRTABLE_CLIENTS_TABLE_ID) missing.push("AIRTABLE_CLIENTS_TABLE_ID");
  /* Invoices.Lead ID (2026-09-25, "Invoice/Payment <-> Lead integration")
     — Invoices now carries a real linked-record field to Leads (added
     directly in Airtable, not by this app), which the live
     "payment-via-app-update" n8n workflow reads to mark the correct Lead
     "First payment paid" once an invoice is paid. This endpoint needs the
     Leads table too, purely to resolve that link to a display name for
     the Invoices table/detail modal — same join pattern as clientsById
     below, nothing invented. */
  if (!AIRTABLE_LEADS_TABLE_ID) missing.push("AIRTABLE_LEADS_TABLE_ID");
  if (missing.length > 0) {
    return res.status(503).json({
      error: "Airtable tables required for Billing are not fully configured on this backend.",
      missingEnvVars: missing
    });
  }
  next();
}

async function fetchAllPaymentRecords() {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (AIRTABLE_PAYMENTS_VIEW_ID) params.set("view", AIRTABLE_PAYMENTS_VIEW_ID);
    if (offset) params.set("offset", offset);
    const url =
      "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_PAYMENTS_TABLE_ID + (params.toString() ? "?" + params.toString() : "");
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + AIRTABLE_PAT }
    });
    if (!response.ok) {
      const body = await response.json().catch(function () {
        return {};
      });
      const error = new Error("Airtable Payments fetch failed: " + response.status);
      error.airtableStatus = response.status;
      error.airtableError = body && body.error;
      throw error;
    }
    const body = await response.json();
    records.push.apply(records, body.records || []);
    offset = body.offset;
  } while (offset);
  return records;
}

async function fetchAllInvoiceRecords() {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (AIRTABLE_INVOICES_VIEW_ID) params.set("view", AIRTABLE_INVOICES_VIEW_ID);
    if (offset) params.set("offset", offset);
    const url =
      "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_INVOICES_TABLE_ID + (params.toString() ? "?" + params.toString() : "");
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + AIRTABLE_PAT }
    });
    if (!response.ok) {
      const body = await response.json().catch(function () {
        return {};
      });
      const error = new Error("Airtable Invoices fetch failed: " + response.status);
      error.airtableStatus = response.status;
      error.airtableError = body && body.error;
      throw error;
    }
    const body = await response.json();
    records.push.apply(records, body.records || []);
    offset = body.offset;
  } while (offset);
  return records;
}

function firstLinkedId(links) {
  return links && links.length > 0 ? links[0] : null;
}

app.get("/api/billing", requireAuth, requireRole("admin"), requireBillingConfigured, async function (req, res) {
  try {
    const [paymentRecords, invoiceRecords, projectRecords, clientRecords, leadRecords] = await Promise.all([
      fetchAllPaymentRecords(),
      fetchAllInvoiceRecords(),
      fetchAllProjectRecords(),
      fetchAllClientRecords(),
      fetchAllRecordsGeneric(AIRTABLE_LEADS_TABLE_ID)
    ]);

    const projectsById = {};
    projectRecords.map(mapProjectRecord).forEach(function (p) {
      projectsById[p.id] = p;
    });

    const clientsById = {};
    clientRecords.forEach(function (r) {
      clientsById[r.id] = { name: (r.fields && r.fields["Client Name"]) || null };
    });

    /* Invoices.Lead ID join (2026-09-25) — resolves the linked-record id to
       the Lead's own Name field, the same "id -> display name" pattern as
       clientsById above. Only Name is exposed; the rest of a Lead's data
       (email/phone/message) has no slot on this screen and stays out of
       this response. */
    const leadsById = {};
    leadRecords.forEach(function (r) {
      leadsById[r.id] = { name: (r.fields && r.fields.Name) || null };
    });

    /* The real Payments table has pre-existing blank placeholder rows
       (no fields set at all) — same pattern already documented for the
       Users table (see /api/users/team above). A blank row has no
       "Payment ID", so that's the filter, same idea as that route's
       roleKey-must-map filter. Same for Invoices: no "InvoiceNumber". */
    const payments = paymentRecords
      .filter(function (record) {
        return !!(record.fields && record.fields["Payment ID"]);
      })
      .map(function (record) {
        const fields = record.fields || {};
        const projectId = firstLinkedId(fields.Projects);
        const clientId = firstLinkedId(fields.Clients);
        const invoiceId = firstLinkedId(fields["Invoice ID"]);
        return {
          id: record.id,
          paymentId: fields["Payment ID"] || null,
          projectId: projectId,
          projectName: projectId && projectsById[projectId] ? projectsById[projectId].name : null,
          clientId: clientId,
          clientName: clientId && clientsById[clientId] ? clientsById[clientId].name : null,
          invoiceId: invoiceId,
          paymentType: airtableSelectName(fields["Payment Type"]),
          amount: typeof fields.Amount === "number" ? fields.Amount : 0,
          status: airtableSelectName(fields.Status),
          dueDate: fields["Due Date"] || null,
          paidDate: fields["Paid Date"] || null,
          notes: fields.Notes || null
        };
      });

    const paymentsByInvoiceId = {};
    payments.forEach(function (p) {
      if (!p.invoiceId) return;
      if (!paymentsByInvoiceId[p.invoiceId]) paymentsByInvoiceId[p.invoiceId] = [];
      paymentsByInvoiceId[p.invoiceId].push(p);
    });

    const invoices = invoiceRecords
      .filter(function (record) {
        return !!(record.fields && record.fields.InvoiceNumber);
      })
      .map(function (record) {
        const fields = record.fields || {};
        const clientId = firstLinkedId(fields.ClientID);
        const leadId = firstLinkedId(fields["Lead ID"]);
        const amount = typeof fields.Amount === "number" ? fields.Amount : 0;
        const vatAmount = typeof fields.VatAmount === "number" ? fields.VatAmount : 0;
        const total = typeof fields.Total === "number" ? fields.Total : amount + vatAmount;
        const linkedPayments = paymentsByInvoiceId[record.id] || [];
        const paidAmount = linkedPayments
          .filter(function (p) {
            return p.status === "Paid";
          })
          .reduce(function (sum, p) {
            return sum + p.amount;
          }, 0);
        const remaining = Math.max(0, total - paidAmount);
        return {
          id: record.id,
          invoiceNumber: fields.InvoiceNumber || null,
          clientId: clientId,
          clientName: clientId && clientsById[clientId] ? clientsById[clientId].name : null,
          leadId: leadId,
          leadName: leadId && leadsById[leadId] ? leadsById[leadId].name : null,
          amount: amount,
          vatAmount: vatAmount,
          total: total,
          status: fields.Status || null,
          pdfUrl: fields.PdfUrl || null,
          created: fields.Created || record.createdTime || null,
          paidAmount: paidAmount,
          remaining: remaining,
          paymentStatus: deriveInvoicePaymentStatus(total, paidAmount, linkedPayments),
          payments: linkedPayments.map(function (p) {
            return { id: p.id, paymentId: p.paymentId, amount: p.amount, status: p.status, dueDate: p.dueDate, paidDate: p.paidDate };
          })
        };
      });

    const invoicesById = {};
    invoices.forEach(function (inv) {
      invoicesById[inv.id] = inv;
    });

    const paymentsOut = payments.map(function (p) {
      const invoice = p.invoiceId ? invoicesById[p.invoiceId] : null;
      return Object.assign({}, p, {
        invoiceNumber: invoice ? invoice.invoiceNumber : null,
        invoiceStatus: invoice ? invoice.status : null
      });
    });

    const totalInvoicedAmount = invoices.reduce(function (sum, inv) {
      return sum + inv.total;
    }, 0);
    const openUnpaidInvoices = invoices.filter(function (inv) {
      return inv.paymentStatus !== "paid";
    }).length;
    const partiallyPaidInvoices = invoices.filter(function (inv) {
      return inv.paymentStatus === "partial";
    }).length;
    const totalOutstanding = invoices.reduce(function (sum, inv) {
      return sum + inv.remaining;
    }, 0);

    const totalPaid = paymentsOut
      .filter(function (p) {
        return p.status === "Paid";
      })
      .reduce(function (sum, p) {
        return sum + p.amount;
      }, 0);
    const overduePayments = paymentsOut.filter(function (p) {
      return p.status !== "Paid" && (p.status === "Overdue" || isPastDue(p.dueDate));
    }).length;

    return res.json({
      kpis: {
        invoices: {
          totalInvoices: invoices.length,
          totalInvoicedAmount: totalInvoicedAmount,
          openUnpaidInvoices: openUnpaidInvoices
        },
        payments: {
          totalPaid: totalPaid,
          totalOutstanding: totalOutstanding,
          partiallyPaidInvoices: partiallyPaidInvoices,
          overduePayments: overduePayments
        }
      },
      invoices: invoices,
      payments: paymentsOut
    });
  } catch (err) {
    console.error("[backend] Failed to compute Billing data:", err);
    return res.status(502).json({
      error: "Could not retrieve billing data from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

/* PATCH /api/invoices/:id/link-lead (2026-09-25, "Lead -> Invoice context
   preservation", application-side only — n8n is locked for this task, no
   workflow/node may be touched). Root cause traced before writing this:
   the "create-invoice-via-app" n8n webhook (WF1) only ever accepted
   {invoiceNumber, clientId, amount} from js/pages/billing.js and has no
   Lead ID field mapping at all — that webhook contract is left exactly as
   is. Instead, once billing.js confirms (via its existing
   pollForInvoiceNumber() poll of GET /api/billing) that WF1 actually
   created the Invoice record, it now calls this endpoint to set that
   invoice's real "Lead ID" link directly — the same direct-Airtable-write
   pattern this file already uses for Users (POST /api/users), PM
   assignment (PATCH /api/projects/:id/assign-pm) and Lead status (PATCH
   /api/leads/:id/status): the backend holds the PAT and writes Airtable
   itself, nothing goes through n8n for this link.

   leadId is re-validated against a real Leads record on this server
   (never trusted from the request body alone), same "don't let a session
   link to a nonexistent/wrong record just by editing the request" rule as
   assign-pm's pmId check above. */
app.patch(
  "/api/invoices/:id/link-lead",
  requireAuth,
  requireRole("admin"),
  requireBillingConfigured,
  requireLeadsConfigured,
  async function (req, res) {
    const leadId = req.body && req.body.leadId;
    if (!leadId || typeof leadId !== "string") {
      return res.status(400).json({ error: "leadId is required." });
    }

    try {
      const leadRecords = await fetchAllRecordsGeneric(AIRTABLE_LEADS_TABLE_ID);
      const leadExists = leadRecords.some(function (r) {
        return r.id === leadId;
      });
      if (!leadExists) {
        return res.status(400).json({ error: "leadId does not refer to an existing Lead." });
      }

      const url =
        "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_INVOICES_TABLE_ID + "/" + encodeURIComponent(req.params.id);
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + AIRTABLE_PAT,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fields: { "Lead ID": [leadId] } })
      });
      const body = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        console.error("[backend] Airtable rejected the Invoice<->Lead link:", response.status, JSON.stringify(body));
        return res.status(502).json({
          error: "Airtable rejected the request.",
          airtableStatus: response.status,
          airtableError: body && body.error
        });
      }
      return res.json({ invoiceId: req.params.id, leadId: leadId });
    } catch (networkError) {
      console.error("[backend] Could not reach Airtable to link Invoice to Lead:", networkError);
      return res.status(502).json({ error: "Could not reach Airtable.", details: networkError.message });
    }
  }
);

/* ===== Tasks — My Tasks (2026-09-23 "Connect My Tasks to Airtable") =====

   pages/my-tasks.html -> GET /api/tasks/my -> this server -> Airtable
   Tasks table, filtered by Tasks.Assignee -> JSON -> my-tasks.html.
   First screen wired to the corrected relationship architecture from the
   audit/fixes tasks immediately before this one.

   User identification: req.session.user.id is already the real Airtable
   Users record id — it comes straight from userRecord.id at login time
   (see POST /api/auth/login above), never from the Users.User ID text
   field. That is exactly the id Tasks.Assignee links point at, so no
   extra resolution step is needed here — this endpoint reads
   req.session.user.id directly and filters Tasks whose Assignee array
   contains it, the same "join by real record id, not a display id"
   pattern /api/dashboard/pm already uses for pmId against Projects'
   Project Manager field. Never accepts a user id from the request.

   requireRole("teamMember") added 2026-09-25 ("GET /api/tasks/my role
   protection" fix) — this route previously only had requireAuth, so any
   authenticated role (including Client) could call it, inconsistent with
   every other role-scoped endpoint in this file (GET /api/dashboard/pm is
   requireRole("pm"), GET /api/clients/me is requireRole("client"), etc.).
   pages/my-tasks.html (the only caller) is already teamMember-only per
   its own window.IQRAA_ROLE gate, so this brings the backend in line with
   the frontend's already-intended access rule rather than changing it —
   a PM's own task visibility is unaffected, since PMs were never meant to
   use this per-assignee endpoint in the first place (CLAUDE.md §9: PM's
   "Tasks" nav item is a still-unbuilt separate, cross-project view, not
   this one). */

function requireTasksConfigured(req, res, next) {
  const missing = [];
  if (!AIRTABLE_PAT) missing.push("AIRTABLE_PAT");
  if (!AIRTABLE_BASE_ID) missing.push("AIRTABLE_BASE_ID");
  if (!AIRTABLE_TASKS_TABLE_ID) missing.push("AIRTABLE_TASKS_TABLE_ID");
  if (!AIRTABLE_PROJECTS_TABLE_ID) missing.push("AIRTABLE_PROJECTS_TABLE_ID");
  if (missing.length > 0) {
    return res.status(503).json({
      error: "Airtable tables required for My Tasks are not fully configured on this backend.",
      missingEnvVars: missing
    });
  }
  next();
}

var TASK_STATUS_VALUES = ["Not Started", "In Progress", "Waiting", "Review", "Completed"];

app.get("/api/tasks/my", requireAuth, requireRole("teamMember"), requireTasksConfigured, async function (req, res) {
  try {
    const userId = req.session.user.id;

    const [taskRecords, projectRecords] = await Promise.all([
      fetchAllRecordsGeneric(AIRTABLE_TASKS_TABLE_ID),
      fetchAllProjectRecords()
    ]);

    const projectsById = {};
    projectRecords.map(mapProjectRecord).forEach(function (p) {
      projectsById[p.id] = p;
    });

    function projectFor(linkedIds) {
      return (linkedIds || [])
        .map(function (id) {
          return projectsById[id];
        })
        .filter(Boolean)[0] || null;
    }

    const myTasks = taskRecords
      .map(mapDashboardTaskRecord)
      .filter(function (t) {
        return (t.assigneeIds || []).indexOf(userId) !== -1;
      })
      .map(function (t) {
        const project = projectFor(t.projectIds);
        return {
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          projectId: project ? project.id : null,
          projectName: project ? project.name : null
        };
      });

    return res.json({ tasks: myTasks });
  } catch (err) {
    console.error("[backend] Failed to fetch My Tasks from Airtable:", err);
    return res.status(502).json({
      error: "Could not retrieve tasks from Airtable.",
      airtableStatus: err.airtableStatus,
      airtableError: err.airtableError,
      details: err.airtableStatus ? undefined : err.message
    });
  }
});

/* PATCH /api/tasks/:id/status (2026-09-25 "My Tasks status update" fix) —
   js/pages/my-tasks.js's quick-status <select> previously only updated the
   fetched-in-memory row (documented local-only simplification in that
   file's header) since no write endpoint existed. Same Tasks table
   GET /api/tasks/my already reads, same Airtable REST PATCH-by-id shape
   as every other status-write route in this file (Lead/Invoice/User
   status above).

   requireRole("teamMember") matches GET /api/tasks/my's own gate above —
   this is the same page's own write half, not a new access rule. On top
   of the role check, the task's real Tasks.Assignee is re-fetched and
   checked against req.session.user.id (never trusted from the request
   body/URL alone) so one team member can't flip another's task by
   guessing a record id — the same "don't let a session act on a record
   it doesn't own" rule as assign-pm's pmId re-validation. */
app.patch("/api/tasks/:id/status", requireAuth, requireRole("teamMember"), requireTasksConfigured, async function (req, res) {
  const status = req.body && req.body.status;
  if (TASK_STATUS_VALUES.indexOf(status) === -1) {
    return res.status(400).json({ error: "status must be one of: " + TASK_STATUS_VALUES.join(", ") });
  }

  try {
    const taskRecords = await fetchAllRecordsGeneric(AIRTABLE_TASKS_TABLE_ID);
    const taskRecord = taskRecords.filter(function (r) {
      return r.id === req.params.id;
    })[0];
    if (!taskRecord) {
      return res.status(404).json({ error: "Task not found." });
    }
    const assigneeIds = (taskRecord.fields && taskRecord.fields.Assignee) || [];
    if (assigneeIds.indexOf(req.session.user.id) === -1) {
      return res.status(403).json({ error: "Not authorized to update this task." });
    }

    const url = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID + "/" + AIRTABLE_TASKS_TABLE_ID + "/" + encodeURIComponent(req.params.id);
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + AIRTABLE_PAT,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fields: { Status: status } })
    });
    const body = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      console.error("[backend] Airtable rejected the task status update:", response.status, JSON.stringify(body));
      return res.status(502).json({
        error: "Airtable rejected the request.",
        airtableStatus: response.status,
        airtableError: body && body.error
      });
    }
    return res.json({ id: req.params.id, status: status });
  } catch (networkError) {
    console.error("[backend] Could not reach Airtable to update the task's status:", networkError);
    return res.status(502).json({ error: "Could not reach Airtable.", details: networkError.message });
  }
});

app.listen(PORT, function () {
  console.log("[backend] Listening on http://localhost:" + PORT + " (frontend origin: " + FRONTEND_ORIGIN + ")");
  if (MISSING_ENV_VARS.length > 0) {
    console.log("[backend] Airtable-dependent endpoints are DISABLED until " + MISSING_ENV_VARS.join(", ") + " are set.");
  }
});
