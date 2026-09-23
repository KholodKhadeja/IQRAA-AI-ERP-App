# Users + Auth backend

The only part of this project allowed to hold Airtable credentials. Built
2026-09-21g for `pages/team.html`'s "New Team Member" form, extended
2026-09-21h with real session-based Login (`POST /api/auth/login` etc.) —
see `CLAUDE.md` §18/§19/§19c for why this exists as a standalone service
instead of an n8n workflow (both tasks explicitly asked for a real
backend, not n8n).

```
pages/login.html  --POST /api/auth/login-->  this server  --Airtable REST API-->  Airtable Users table
                                                  |
                                                  +-- plaintext comparison against Password (see note below)
                                                  +-- express-session -> HTTPOnly cookie
                                                  +-- PATCH Last Login (success only)

every other Workspace page  --GET /api/auth/me-->  this server  (session cookie -> {user} or 401)

pages/team.html  --POST /api/users (requires an authenticated Admin session)-->  this server  --Airtable REST API-->  Airtable Users table
```

**Passwords are stored in plaintext, deliberately (2026-09-21l, project
owner decision)** — the Airtable field was originally `Password Hash`
(bcrypt-hashed, `bcrypt.compare()`-verified); the project owner explicitly
asked to drop hashing since this is MVP/demo data, not real user accounts,
and the field was renamed to plain `Password` to match. See `CLAUDE.md`
§5 for the full rationale and the current test-user passwords. Revisit
this before any real user data goes into this table.

The frontend (`js/services/auth.js`, `js/services/users-api.js`) never
sees an Airtable PAT or the session secret, and never talks to Airtable
directly — only this server does, over HTTPS to Airtable's REST API.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# then edit .env and fill in AIRTABLE_PAT (and SESSION_SECRET for anything beyond local testing)
npm start
```

The server listens on `http://localhost:3001` by default (`PORT` in
`.env` to change it). Locally, every `*_API_BASE` constant in
`js/services/*.js` (`auth.js`, `users-api.js`, `projects-api.js`,
`leads-api.js`, `clients-api.js`) points at that same URL — update all
together if you move local dev somewhere else, along with
`FRONTEND_ORIGIN` below (CORS is locked to one specific origin, not
wildcard, since credentialed cross-origin requests require that).

## Deploying (2026-09-22m)

This service must be deployed separately from the static frontend — it's
a real Node process, not part of the static site (see CLAUDE.md §18's
"backend/ also needs to be deployed" note). The repo root's
`render.yaml` defines it as a second Render Web Service
(`iqraa-erp-backend` in `render.yaml`'s own service name, but the
service actually deployed on Render ended up at
`iqraa-app-backend.onrender.com` — see the note below), `env: node`,
`rootDir` pointed at this folder. After the first Blueprint sync, set
`AIRTABLE_PAT` and `SESSION_SECRET` by hand in the Render dashboard
(Environment tab) — both are left `sync: false` in `render.yaml` on
purpose, they're real secrets and are never committed. Every other env
var (`FRONTEND_ORIGIN`, the Airtable base/table IDs) is already set in
`render.yaml`.

**2026-09-24 audit finding, fixed**: the deployed backend's actual URL
is `https://iqraa-app-backend.onrender.com`, not
`https://iqraa-erp-backend.onrender.com` (the name `render.yaml` asks
for was apparently unavailable, so Render assigned a different
subdomain — exactly the scenario this section already warned about).
All five `*_API_BASE` constants in `js/services/*.js` (`auth.js`,
`billing-api.js`, `clients-api.js`, `dashboard-api.js`, `leads-api.js`,
`projects-api.js`, `tasks-api.js`, `users-api.js` — eight files in
total, this list grew since the constant was first named "five") were
updated to point at the real URL. If the backend is ever redeployed
under yet another name, update all of them again to match — they're
hardcoded to the expected name, not derived from `render.yaml` at
runtime. Likewise, if the frontend is ever redeployed at a different
URL, `FRONTEND_ORIGIN` needs to change to match (both in `render.yaml`
and in the Render dashboard if it was overridden there), since CORS is
locked to that one exact origin.

## Required environment variables

| Variable | Required | Notes |
|---|---|---|
| `AIRTABLE_PAT` | **Yes** | A Personal Access Token from <https://airtable.com/create/tokens>, scoped to `data.records:read` + `data.records:write` on the base below. |
| `AIRTABLE_BASE_ID` | Yes | `appFUvcg5tY2Dup8U` — already known, not a secret, defaulted in `.env.example`. |
| `AIRTABLE_USERS_TABLE_ID` | Yes | `tblOql5BcXCNhPFIS` — already known, not a secret, defaulted in `.env.example`. |
| `AIRTABLE_PROJECTS_TABLE_ID` / `AIRTABLE_PROJECTS_VIEW_ID` | Yes (for Projects/Admin Dashboard) | `tblK5seFEBbACNEWq` / `viwYcfbVNh8THD3jx` — already known, defaulted in `.env.example`. |
| `AIRTABLE_LEADS_TABLE_ID` | Yes (for Leads/Admin Dashboard) | `tbloeMHPaOzQSypPb` — already known, defaulted in `.env.example`. |
| `AIRTABLE_TASKS_TABLE_ID` | Yes (for Admin Dashboard) | `tbl7RP40DUSKs5WKW` — already known, not a secret, defaulted in `.env.example`. |
| `AIRTABLE_PAYMENTS_TABLE_ID` | Yes (for Admin Dashboard) | `tblBE8s5TcVgO5fQg` — already known, not a secret, defaulted in `.env.example`. |
| `AIRTABLE_PAYMENTS_VIEW_ID` | Yes (for Billing) | `viwVbXbqKxO0u0VFh` — already known, not a secret, defaulted in `.env.example`. |
| `AIRTABLE_MEETINGS_TABLE_ID` | Yes (for PM Dashboard) | `tblmepMezKxNcmSJP` — already known, not a secret, defaulted in `.env.example`. |
| `AIRTABLE_INVOICES_TABLE_ID` / `AIRTABLE_INVOICES_VIEW_ID` | Yes (for Billing) | `tbltfJG5W43wIAHAz` / `viwNMypqNpWgovnpA` — already known, defaulted in `.env.example`. |
| `PORT` | No | Defaults to `3001`. |
| `FRONTEND_ORIGIN` | No | Defaults to `http://localhost:3000`. The one origin CORS trusts for credentialed (cookie-bearing) requests — must match exactly where the frontend is actually served from. |
| `SESSION_SECRET` | No (but should be set) | Signs the session cookie. If unset, a random secret is generated per-process (a startup warning is printed) — fine for local testing, but it means every backend restart invalidates every existing session. Set a real persistent value before anything beyond local testing; generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |

Without `AIRTABLE_PAT` set, the server still starts (so the frontend↔backend
leg can be tested), but any Airtable-dependent endpoint (`/api/auth/login`,
`/api/users`) responds `503` with
`{ "error": "Airtable is not configured...", "missingEnvVars": [...] }`
instead of silently pretending to succeed.

## Auth endpoints (verified live 2026-09-21h)

| Endpoint | Auth required | Behavior |
|---|---|---|
| `POST /api/auth/login` | No | Body `{email,password}`. Looks up `Email` in Airtable (`filterByFormula`, case-insensitive), checks `Status === "Active"`, compares `password` directly against the stored `Password` field (plaintext — see the note above), maps the Airtable `Role` to this app's 4-role model. **Every failure reason — unknown email, inactive status, wrong password, unmapped role — returns the identical `401 {"error":"Invalid email or password."}`**, so a caller can never learn which reason applied (this was an explicit, non-negotiable requirement — enumeration-proofing). On success: creates a server-side session (`req.session.user = {id,email,fullName,role}`), sets the `iqraa.sid` HTTPOnly cookie, and `PATCH`es `Last Login` in Airtable — awaited before responding, and **only on success**. |
| `POST /api/auth/logout` | No | Destroys the session and clears the cookie. Always `200`. |
| `GET /api/auth/me` | Yes | Returns `{user}` from the current session, or `401` if there is none. This is what `js/workspace-chrome.js` calls on every Workspace page load to decide whether to show the page or redirect to Login. |
| `POST /api/users` | Yes, Admin role | Unchanged from 2026-09-21g otherwise (see field mapping below) — now behind `requireAuth` + `requireRole("admin")`. No session → `401`. Session but wrong role → `403`. |

**Role mapping** (Airtable `Role` single-select → this app's role key, `AIRTABLE_ROLE_TO_APP_ROLE` in `server.js`): `admin`→`admin`, `project manager`→`pm`, `client`→`client`, `producer`/`designer`/`instructional designer`/`qa`/`developer`→`teamMember` (matched case-insensitively, trimmed — handles the real options' inconsistent whitespace, see below). A Role value that doesn't match any of these (e.g. a typo made directly in Airtable) makes login fail with the same generic error rather than defaulting to some role.

**Session cookie** (`express-session`): `httpOnly:true` (JS on the page can never read it), `secure:true` only when `NODE_ENV==="production"` (plain HTTP works for local dev), `sameSite:"lax"` (works for same-host-different-port localhost testing without needing `SameSite=None`), 8-hour expiry.

**`Last Login` is a plain `date` field in the real Users table schema (confirmed via the Metadata API), not `dateTime`** — it has no time component. The backend sends a bare `YYYY-MM-DD` string (`new Date().toISOString().slice(0,10)`); sending a full ISO datetime was tried first and rejected by Airtable with `INVALID_VALUE_FOR_COLUMN` during live testing — fixed before this was reported as working.

## Airtable field mapping (verified live 2026-09-21g)

`POST /api/users` writes these fields to the Users table. Confirmed
against the real schema via `GET /v0/meta/bases/{base}/tables` with a
working PAT, and a real test record was created and read back
successfully (`recq6umLXuzfwx5aJ`) — this is not a guessed mapping:

| Request field | Airtable field | Notes |
|---|---|---|
| `fullName` | `Full Name` | required |
| `email` | `Email` | required, validated |
| `role` | `Role` | required; mapped from the internal `teamRole.*` key — see `ROLE_KEY_TO_AIRTABLE_LABEL` in `server.js`. **The real options have odd leading/trailing spaces** (`" Producer"`, `" Designer "`, `" Instructional Designer"`, `" QA"`, `"Developer"` — only `Developer` has none). This PAT can't auto-create new select options, so an unlisted or differently-trimmed value gets rejected with a `422`. `Admin` / ` Project Manager` / ` Client` also exist as Role options but aren't offered by this form (team-member creation only). |
| `status` | `Status` | required; real options are `"Active"` / `"Inactive"` — **not** `"Paused"`, which was an incorrect first guess caught during live testing. |
| `phone` | `Phone` | optional, omitted from the write if blank |
| `password` | `Password` | **stored as plaintext, deliberately — MVP/demo data, not real user accounts (2026-09-21l, project owner decision).** Was bcrypt-hashed into a field called `Password Hash` before that decision; both the field and the backend logic were changed together, see the architecture note above and `CLAUDE.md` §5. |

Also written on every create: `"Must Change Password": "No"` — this field
exists in the real table (a `Yes`/`No` single-select) even though it's
deliberately not a form field; the task this backend was built for
explicitly decided users are not forced to change their password on first
login, so every created record encodes that explicitly rather than
leaving the field blank/ambiguous.

**`User ID` is not actually Airtable-managed** — it's a plain empty text
field, not an autonumber/formula. None of the pre-existing records in the
table have it set either. This endpoint currently leaves it unset,
matching that existing behavior, rather than inventing an ID scheme with
no established convention to follow — worth a product decision on what
(if anything) should populate it. `Created At` genuinely is Airtable-managed
(a real `createdTime` field) and populates itself; `Last Login` is a plain
`date` field, populated only by a real login (see the Auth endpoints
section above) — still empty on any record that has never logged in.

## Admin Dashboard endpoint (verified live 2026-09-22)

`GET /api/dashboard/admin` (Yes, Admin role) — the single summary endpoint `pages/dashboard-admin.html` (`js/services/dashboard-api.js`) calls once per page load. Reads Leads, Projects, Tasks, Payments and Users from Airtable in parallel and returns one aggregated JSON response — no per-KPI requests, no new Airtable table. No session → `401`. Session but wrong role → `403`. Missing any of the 6 required table env vars → `503` naming them (`requireDashboardConfigured` in `server.js`).

Response shape: `{kpis:{newLeads,activeProjects,readyToStart,pendingClientApprovals,overdueTasks,outstandingPaymentsAmount,outstandingPaymentsCount}, activeProjects:[{id,name,client,pmName,stage,progress,deadline,status}], readyToStart:[{id,name,client,firstPaymentStatus}], projectsByStage:[{stage,count}, …10], pmWorkload:[{id,name,projectCount,attentionCount}]}`.

Status vocabulary and workflow rules, confirmed against the real schema (`get_table_schema`) and real records (`list_records_for_table`), not guessed — see the full comment above the route in `server.js` for the complete reasoning:
- **New Leads** = Leads whose `Status === "New Lead"` (the real option, matching the UI's Hebrew label "לידים חדשים" literally — distinct from `/api/leads`' own "Meeting Booking" filter, a later stage of the same pipeline).
- **Active Projects** = Projects whose `Status === "In Progress"` (the only one of the 6 real Status options that means work is actually underway).
- **Ready to Start** = Projects whose `Status === "Ready to Start"` **and** who have at least one linked Payment with `Payment Type === "First"` and `Status === "Paid"` (joined via Payments' own `Projects` link field) — per CLAUDE.md §10, the Status field alone isn't proof the payment was actually confirmed.
- **Pending Client Approvals** = Projects whose `Current Stage` is one of `"Client Script Approval"` / `"Client Review"` / `"Client Approval"` (the same 3-stage set `js/services/project-helpers.js`'s `CLIENT_ACTION_STAGES` already encodes for mock data).
- **Overdue Tasks** = Tasks whose `Status !== "Completed"` and `Due Date` is before today (server clock, date-only comparison).
- **Outstanding Payments** = every Payment whose `Status !== "Paid"` (`"Pending"` or `"Overdue"`) — count + sum of `Amount`.
- **PM Workload** = Users whose `Role` maps to app role `"pm"`, joined against Projects' `Project Manager` link field (not the unset `User ID (from Project Manager)` lookup); `attentionCount` = how many of that PM's projects have ≥1 overdue task.

**Live verification (2026-09-22)**: tested against the real base with the actual data (1 real "In Progress" project, 0 Task/Payment records at the time), then re-verified the non-zero path by temporarily creating a "New Lead" Lead, a Paid "First" Payment + a Pending "Milestone" Payment, and an overdue Task, confirming each KPI/list updated correctly, then deleting all 4 temporary records and confirming the dashboard reverted to its original values. `GET /api/dashboard/admin` fires exactly once per page load (confirmed via a headless-browser network-request capture) and pa11y reports "No issues found" against the rendered page in both the empty and populated states.

## Security notes

- **CORS is locked to one specific origin** (`FRONTEND_ORIGIN`, `cors({origin, credentials:true})`) — not wildcard — since credentialed
  (cookie-bearing) cross-origin requests require an exact origin match.
  Update `FRONTEND_ORIGIN` in `.env` if the frontend is ever served from
  somewhere else.
- **`POST /api/users` requires an authenticated Admin session** (`requireAuth` + `requireRole("admin")`, added 2026-09-21h alongside Login) —
  the gap noted in the 2026-09-21g version of this file is closed.
- Login intentionally returns the same generic error for every failure
  reason (unknown email, inactive account, wrong password, unmapped
  role) — never reveals which one applied, so a caller can't enumerate
  which emails have accounts.
- The `Password` field's value never leaves this server — not to the
  frontend, not in a log line. Verified live: the login response only
  ever contains `{id,email,fullName,role}`. It's still stored as
  plaintext in Airtable itself, per the 2026-09-21l decision above — that
  part is a deliberate MVP tradeoff, not a security guarantee.
- Session cookie is `httpOnly` (unreadable from page JS) and `secure` in
  production only. See `SESSION_SECRET` above for the one manual step
  (set a real value) needed before this is safe beyond local dev.
