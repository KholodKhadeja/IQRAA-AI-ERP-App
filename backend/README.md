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

## Leads endpoints (`GET` verified live 2026-09-22; `PATCH` added 2026-09-24; both narrowed 2026-09-25 "Update Lead → First Payment flow")

| Endpoint | Auth required | Behavior |
|---|---|---|
| `GET /api/leads` | Yes, Admin role | Read-only. Returns every Lead whose `Status` is one of `"Meeting Booking"` / `"Waiting for first payment"` / `"First payment paid"` / `"Proccessed"` (`LEADS_LIST_STATUSES` in `server.js`, filtered server-side via `filterByFormula`, re-checked client-side in `js/pages/leads.js`). Each lead also carries a resolved `invoice: {invoiceNumber, clientName, total, pdfUrl} \| null`, joined server-side (`resolveLeadInvoices()`) from the lead's linked Invoice record — see below. |
| `PATCH /api/leads/:id/status` | Yes, Admin role | Body `{status:"Waiting for first payment"}` — the **only** value accepted (`LEADS_WRITABLE_STATUSES` in `server.js`); `400` for anything else, including `"First payment paid"` and `"Proccessed"`. Writes `Status` on the given Lead record directly to Airtable and returns `{lead}` in the same shape as `GET /api/leads`' items. |

**2026-09-25 "Update Lead → First Payment flow"**: this narrows the 2026-09-25-earlier-that-day design (where the app could also PATCH a lead straight to `"First payment paid"`) once investigation found that transition is already handled outside the app. An Admin now only ever makes ONE manual status change from `pages/leads.html`: `Meeting Booking` → `Waiting for first payment`. From there, the Admin creates and gets paid on an Invoice through the existing Billing flow (§19e) — Invoices now carries a real `Lead ID` linked-record field (added directly in Airtable, not by this app), and the already-live `payment-via-app-update` n8n workflow was rebuilt around it: once an Admin completes payment on an Invoice through Billing, that workflow sets the Invoice's Status to `PAID` and, via its `Lead ID` link, sets the linked Lead's Status to `"First payment paid"` itself — the app is not involved in that write at all. A separate, already-existing **scheduled** n8n workflow (not called from anywhere in this app, no webhook, no button) then picks up `"First payment paid"` leads, creates the Customer + Project, and sets the lead to `Proccessed`. **This endpoint must never accept `"First payment paid"` or `"Proccessed"`** — accepting either would let an Admin skip past actual payment or bypass the Customer/Project creation the scheduled workflow is responsible for. No Customer or Project is ever created from the frontend, and no webhook is ever called for the scheduled workflow.

`GET /api/leads`'s `invoice` field lets `js/pages/leads.js`'s per-status guidance panel show which Invoice/Client a `"Proccessed"` lead is tied to (this task's explicit "if Customer/Project IDs or links exist, show them per the app's existing structure" requirement) — resolved by joining the lead's `Invoices` linked-record field against the Invoices and Clients tables (`resolveLeadInvoices()`), reusing the same field mapping `GET /api/billing` already uses. Deliberately resolves only the Client's name, not that client's Projects — see the note in `server.js` about `Clients.Projects`'s ambiguous current schema state, found during this task's investigation and explicitly out of its scope.

**Why a direct backend write instead of an n8n webhook**: the existing "IQRAA Workflow 2- Lead Lifecycle Agent" automation manages `New Lead → Processing → Meeting Booking` but its own system prompt explicitly excludes `Proccessed` ("Processed is a valid Airtable status, but this workflow does not set or manage it"), and no workflow covered `Meeting Booking → Waiting for first payment` either. Building a new n8n workflow for this would violate CLAUDE.md's "don't add new n8n workflows before the basic UI is clear" rule, so this follows the same narrow backend-writes-directly precedent already established for Users (`POST /api/users` above).

**`"Waiting for first payment"`, `"First payment paid"` and `"Proccessed"` are spelled exactly like that in the real Airtable Status field** (confirmed via `get_table_schema`, not guessed — this project has been bitten by exactly this kind of casing mismatch before) — see `LEADS_LIST_STATUSES`'s comment in `server.js`. The Meetings table itself is untouched by this change — meetings still happen outside IQRAA (CLAUDE.md §6) and this flow never reads or writes it.

## Invoice ↔ Lead linking (added 2026-09-25, "Lead → Invoice context preservation")

Application-side fix for a gap the audit surfaced: `pages/billing.html`'s "Create Invoice" flow POSTs `{invoiceNumber, clientId, amount}` to the real `create-invoice-via-app` n8n webhook (WF1) — that webhook's own node graph was read directly and confirmed to have **no** `Lead ID` field mapping anywhere, and its contract is intentionally left untouched here (n8n is locked for this task). So once an invoice is created from `pages/leads.html`'s "Waiting for first payment" flow, the resulting Invoice record had no way to end up linked back to the Lead that started it — that link had to be added by hand directly in Airtable.

Fixed entirely on the application side: `js/pages/leads.js`'s Billing CTA now carries the originating Lead's real Airtable record id (and name) as `?leadId=`/`?leadName=` on the link, `js/pages/billing.js` reads it, and once its existing `pollForInvoiceNumber()` polling confirms the WF1-created Invoice actually exists, it calls this endpoint to set the link directly — a normal backend→Airtable write, the same pattern already used for Users/PM-assignment/Lead-status above.

| Endpoint | Auth required | Behavior |
|---|---|---|
| `PATCH /api/invoices/:id/link-lead` | Yes, Admin role | Body `{leadId}`. Re-validates `leadId` against a real Leads record server-side (`400` if it doesn't resolve to one — same "never trust a body id alone" rule as `assign-pm`'s `pmId` check) before writing `"Lead ID": [leadId]` to the given Invoices record in Airtable. Returns `{invoiceId, leadId}`. |

Not called for every invoice — only when `billing.html` was reached via a Lead's context. A regular "Create Invoice" for an existing Client (no Lead involved) never calls this endpoint, and `GET /api/billing` already resolved/exposed `invoice.leadId`/`invoice.leadName` before this task (see the Billing section above) — this endpoint is the write half that was missing.

## Project Manager assignment (added 2026-09-24, live-verified)

`pages/project-workspace.html`'s "assign/reassign PM" control (CLAUDE.md §19g) uses two endpoints, both Admin-only:

| Endpoint | Auth required | Behavior |
|---|---|---|
| `GET /api/users/pms` | Yes, Admin role | Read-only. Returns every Users record whose `Role` maps to app role `"pm"` **and** whose `Status === "Active"` — `{projectManagers:[{id,fullName}]}`. Same Role→app-role join `GET /api/projects`/`GET /api/dashboard/admin` already use for PM name resolution, nothing new invented. |
| `PATCH /api/projects/:id/assign-pm` | Yes, Admin role | Body `{pmId}`. Re-validates `pmId` against a real, currently-Active PM user record server-side (`400` if it doesn't resolve to one — this stops a Client/Team-Member/deactivated/nonexistent id from being linked just by editing the request) before writing `"Project Manager": [pmId]` to the given Projects record in Airtable. Returns `{project}` in the same shape as `GET /api/projects`' items (includes the freshly-resolved `pmName`). Only ever touches the one field — it does not also move `Status`/`Current Stage`, unlike the old mock-data `assignPm()` CLAUDE.md §10 used to describe. |

Live-verified against the real base (2026-09-24): `GET /api/users/pms` returned the one real active PM record; `PATCH .../assign-pm` against a real, then-unassigned project persisted (`Project Manager` field set, `pmName` resolved correctly on the next `GET /api/projects`), then the test project was reverted to unassigned via a direct Airtable call so no test data was left behind; a bogus id and a real Client record's id were both rejected `400`; a PM-role session got `403` from both endpoints; no session got `401` from both.

## Final cleanup pass (2026-09-25) — profile save, task status, pause/reactivate, task role protection

Four small, previously-local-only or missing writes, each using the existing Users/Tasks tables — no new tables, no n8n involvement.

| Endpoint | Auth required | Behavior |
|---|---|---|
| `PATCH /api/users/me` | Yes, any role | Body `{fullName, phone}`. Self-service only — always writes to `req.session.user.id`, never a caller-supplied id, so one session can never edit another user's record. Deliberately excludes `Email` (the login lookup key — out of scope per this task's "do not change authentication" rule). Updates `req.session.user` in place so the next `GET /api/auth/me` reflects the change without a re-login. Backs `pages/settings.html`'s Profile save, which previously showed a fake success message and persisted nothing. |
| `PATCH /api/users/:id/status` | Yes, Admin role | Body `{status:"Active"\|"Inactive"}` (`VALID_STATUSES`, same vocabulary `POST /api/users` already writes on create). Backs `pages/team.html`'s pause/reactivate button, previously local-only (in-memory only, never persisted). |
| `PATCH /api/tasks/:id/status` | Yes, teamMember role | Body `{status}`, one of `TASK_STATUS_VALUES` ("Not Started"/"In Progress"/"Waiting"/"Review"/"Completed"). Re-validates the task's real `Assignee` link against `req.session.user.id` server-side (`403` if the caller isn't actually assigned to it) before writing `Status`. Backs `pages/my-tasks.html`'s quick-status `<select>`, previously local-only. |
| `GET /api/tasks/my` | Yes, **teamMember role** (was: any authenticated role) | Unchanged behavior otherwise — this only closes a role-check gap found during the same pass. The route was already scoped to the caller's own `req.session.user.id` (so no other user's data was ever exposed), but it had no `requireRole` at all, inconsistent with every other role-scoped endpoint in this file. `pages/my-tasks.html`, its only caller, is already teamMember-only on the frontend, so this brings the backend in line with the page's existing intent rather than changing who can see what. |

`req.session.user.phone` is new (set at login from the Users record's `Phone` field, alongside the existing `id`/`email`/`fullName`/`role`) purely so `PATCH /api/users/me` has somewhere to reflect a saved phone number back to the client without a second round trip — never used for authentication.

Live-verified against the real base (2026-09-25): `PATCH /api/users/me` persisted a Full Name + Phone change on a real test user, confirmed via a follow-up `GET /api/auth/me` in the same session and again after a fresh login; `PATCH /api/users/:id/status` toggled a real test user Active → Inactive → Active, each confirmed via `GET /api/users/team`; `PATCH /api/tasks/:id/status` moved a real task through two status values, confirmed via a page reload of `pages/my-tasks.html`, and a second team member's session got `403` attempting to update a task not assigned to them; `GET /api/tasks/my` returned `403` for an Admin/PM/Client session and `200` for a teamMember session, both against the same test users used elsewhere in this file.

## Project Workspace Tasks & Team (added 2026-09-25, "Connect Project Workspace Team & Tasks to real Airtable data")

`pages/project-workspace.html`'s Tasks and Team panels previously read `js/data/mock-data.js`. Both now come from the existing Tasks table via two new, single-project, read-only endpoints — no new table, no new Airtable field, no n8n involvement. Meetings & Decisions and History on the same page are explicitly untouched by this task and still read mock data.

| Endpoint | Auth required | Behavior |
|---|---|---|
| `GET /api/projects/:id/tasks` | Yes, see below | Returns every Task linked to this Project (`Tasks.Project`), each with `{id, title, status, priority, description, dueDate, assigneeId, assigneeName}` — `status`/`priority` are the raw Airtable option/free-text values (same convention as `GET /api/tasks/my`), and `assigneeName` is resolved via a Users-table join so the frontend never has to. |
| `GET /api/projects/:id/team` | Yes, see below | Returns the distinct set of real Users who have at least one Task assigned within this Project — `{id, fullName, roleKey, email, phone}` each. There is no direct Project↔Team link on the real Projects table (only "Project Manager"), so this reuses the same Tasks.Assignee/Tasks.Project relationship `GET /api/projects`' own teamMember-scoping branch and `GET /api/tasks/my` already rely on, per this task's explicit "use the simplest existing relationship, don't invent one" instruction. Does not include the Project Manager themselves — that's already shown separately in the page header (`project.pmName`). |

Both routes share the same access check (`isAuthorizedForProjectTasks()` in `server.js`), re-verified server-side rather than trusted from the frontend, since a single-project-by-id route can be called directly with a guessed id: `404` if the project doesn't exist; otherwise `admin` → any project; `pm` → only if the project's `Project Manager` link includes them; `teamMember` → only if the returned task set includes at least one Task assigned to them; `client` → always `403` (the Client Portal is a deliberately separate, client-safe render path — CLAUDE.md §4/§9 — that must never receive the internal task board or team roster).

Live-verified against the real base (2026-09-25): both endpoints returned real tasks/team for a real project as Admin; a PM got `200` for their own project and `403` for an unrelated one; a team member assigned to a task in the project got `200`, one with no task in it got `403`; a Client session got `403`; an unauthenticated request got `401`; a nonexistent project id got `404`.

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
