/* Users + Auth backend — the only piece of this project allowed to hold
   the Airtable PAT. See backend/README.md for setup/run instructions and
   CLAUDE.md §18/§19/§19b/§19c for why this exists as a separate service
   instead of an n8n workflow.

   Architecture (2026-09-21h, "Login authentication flow"):
     pages/login.html (js/services/auth.js)
       -> POST /api/auth/login  -> looks up Email in Airtable, checks
          Status, verifies password against Password Hash with bcrypt,
          creates a server-side session (HTTPOnly cookie), updates
          Last Login, returns { user } (no hash, no PAT)
     every pages/*.html Workspace page (js/workspace-chrome.js)
       -> GET /api/auth/me  -> confirms the session cookie is still valid;
          redirects to Login if not
     pages/team.html (js/services/users-api.js)
       -> POST /api/users  -> now requires an authenticated Admin session
          (see requireAuth/requireRole below) in addition to everything
          the 2026-09-21g task already required

   Nothing here is guessed: the field names ("Full Name", "Email", "Role",
   "Status", "Phone", "Password Hash", "Last Login") and the exact Role/
   Status option values are confirmed against the real Users table schema
   (GET /v0/meta/bases/.../tables) and a real login was tested end-to-end
   — see the chat report for the 2026-09-21h task, not just this file. */

require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_USERS_TABLE_ID = process.env.AIRTABLE_USERS_TABLE_ID;
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
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
      sameSite: "lax",
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
    const passwordHash = fields["Password Hash"];
    const appRole = mapAirtableRoleToAppRole(fields.Role);

    if (status !== "Active") {
      console.warn("[backend] Login failed (status is " + JSON.stringify(status) + "):", email);
      return res.status(401).json(GENERIC_FAILURE);
    }
    if (!passwordHash) {
      console.warn("[backend] Login failed (no Password Hash on record):", email);
      return res.status(401).json(GENERIC_FAILURE);
    }

    const passwordMatches = await bcrypt.compare(password, passwordHash);
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
      role: appRole
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

  let passwordHash;
  try {
    passwordHash = await bcrypt.hash(password, 10);
  } catch (hashError) {
    console.error("[backend] Password hashing failed:", hashError);
    return res.status(500).json({ error: "Failed to process password." });
  }

  const fields = {
    "Full Name": fullName,
    Email: email,
    Role: ROLE_KEY_TO_AIRTABLE_LABEL[roleKey],
    Status: status,
    "Password Hash": passwordHash,
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

app.listen(PORT, function () {
  console.log("[backend] Listening on http://localhost:" + PORT + " (frontend origin: " + FRONTEND_ORIGIN + ")");
  if (MISSING_ENV_VARS.length > 0) {
    console.log("[backend] Airtable-dependent endpoints are DISABLED until " + MISSING_ENV_VARS.join(", ") + " are set.");
  }
});
