# AI Learning Operations ERP — Web App: Screen-Building Guide

This file is the standing reference for building every screen in this project. Read it before starting new screens, and update it when a new pattern is established or an old one changes. It captures what was decided while building the Landing page and Login page, the project scope from the spec documents in the parent folder, and a **2026-09-21 product-direction update** (§1–§10) that narrows and clarifies what IQRAA actually is — read that before continuing any work planned under the old, broader assumptions.

## 0. What this project actually is (read this first)

The project's own planning documents (`../AI_Learning_Operations_ERP_אפיון.docx`, `../פרויקט-גמר-53500.docx`) describe a course template that assumes the web app is built in **Base44 or Lovable** (no-code app builders). **That does not apply here.** The אפיון doc explicitly overrides it in section 15/24:

> "המערכת תיבנה ללא Base44/Lovable. במקום זאת, Claude Code ישמש ככלי לבניית ממשק/יישום המערכת... Airtable ישמש כמקור האמת ו-n8n כשכבת האוטומציה והאינטגרציה."

So: **this hand-authored HTML/CSS/JS app, built via Claude Code, *is* the "Lovable/Base44 app" the other docs refer to.** Ignore any Base44/Lovable-specific instructions in those docs (prompts, "no-code" framing, their screen lists) — the actual required screens for *this* project are in the אפיון doc (§15–16) and the checklist doc, filtered through the product-direction update in §1–§2 below (that update takes precedence wherever it narrows or contradicts the original spec docs, e.g. dropping Google Calendar). Airtable is the system of record; the frontend (`index.html`/`pages/`) is the interface layer only and never holds API keys/credentials. Sensitive/write operations go through either n8n webhooks **or**, as of 2026-09-21g, a small dedicated `backend/` service for user management specifically (see §19b) — the frontend never talks to Airtable directly either way.

**Tech stack note (2026-09-21):** this project was originally built in React + TypeScript + Vite (Phase 1: Landing + Login). It was then deliberately converted to hand-authored, build-step-free HTML/CSS/JS for a hosting/deploy constraint — the React version is gone, not archived. See §18 for the current stack and its conventions; every screen from here on follows that pattern, not the old React one.

## 1. Product vision — what IQRAA is (and isn't)

**IQRAA is not intended to replace every external tool employees currently use.**

IQRAA = the central ERP / project-workspace for managing learning projects, clients, teams, tasks, processes, progress, billing, decisions and operational information.

External tools remain complementary and stay outside IQRAA — the product should link/reference them where useful (e.g. a link to a Drive folder, a Doc, a Figma file on a project record), not attempt to recreate or replace them:
- **Google Calendar** — employees schedule meetings independently.
- **Outlook Calendar** — used independently where relevant.
- **Gmail** — communication.
- **Google Docs / Google Slides** — scripts and documents.
- **Google Drive** — files and shared resources.
- **Figma** — design.
- Other external tools, as appropriate.

> **Core principle**: one central workspace for managing the work — not one tool that replaces every tool.

This is the lens for every future scope decision in this project: if a feature request is "let's rebuild [external tool] inside IQRAA," the default answer is no — link to it instead. The one deliberate exception the product carves out of this rule is meetings, which get a lightweight, project-scoped record inside IQRAA (see §6) — not because IQRAA is becoming a calendar, but because *decisions made in meetings* are core operational history the project workspace needs to hold.

## 2. MVP scope

**In scope:**
- Secure login/authentication architecture (provider TBD — see §5)
- Hebrew-only UI, RTL (see §12) — English is kept deliberately for status/concept values in the post-login Workspace only
- Role-based access, enforced at the data/UI level (see §4)
- Internal IQRAA Workspace: shell, role-based navigation (see §8–9)
- Admin / CEO dashboard: Overview, Leads, Active Projects, Projects Ready to Start, PM workload, Billing overview, Recent activity
- Leads, Clients, Projects, project workspace, project stages, tasks, team management, PM assignment (see §7, §10)
- Workload visibility, billing/payment visibility
- Client portal
- Project resources/links, client feedback, approvals
- Meetings & Decisions (see §6)
- Project history/activity
- Notifications, Settings
- Responsive design, accessibility (see §15)

**Out of MVP** (documented as possible future integrations, not current work — don't plan or implement any of these without being explicitly asked to revisit this scope):
- Google Sign-In / Google OAuth
- Google Calendar integration
- Outlook Calendar integration
- Calendar synchronization of any kind (automatic employee calendar import, event sync)
- A full internal calendar replacement
- Replacing Gmail
- Replacing Google Docs
- Replacing Google Drive
- Replacing Figma
- Building every external tool inside IQRAA

The previous reason for considering Google OAuth was mainly to support Google Calendar integration; since Calendar is now out of MVP, Google OAuth has no remaining justification either — see §5 for what replaces it as the auth direction, and §18 for what this means for the existing Login screen's code.

## 3. Project roadmap (source: `../AI_Learning_Operations_ERP_Development_Checklist(1).docx`, filtered through §1–§2)

Current phase: **All 13 `screens.md` §38 build steps done** — shared Workspace shell, Admin/PM/Team-Member/Client Overview, Projects List + Project Workspace, Project Tasks + Task Details, Meetings & Decisions + Project History, Leads + Clients, Billing, Team Management, Client Portal, Settings, and a final responsive/accessibility/i18n audit pass (see the "Shipped screens" note below for what that means concretely). Phase 1 (Landing + Login + Accessibility statement page) is built and converted from React to plain HTML/CSS/JS (see §18). The Login screen's "Sign in with Google" button was removed on 2026-09-21b per §2 — Login is a single email/password form now. Don't reintroduce a Google/OAuth sign-in control without a new product-direction decision. **This is a UI/frontend milestone, not a project-complete one** — everything below still reads from `js/data/mock-data.js`, a static in-memory dataset; Airtable, n8n, AI Agents and RAG integration (Phase 9+, §3's earlier framing) haven't started.

**Shipped screens (2026-09-21f, all 13 steps):**
- `js/data/mock-data.js` — the one shared static mock dataset (projects, clients, project managers, team members, leads, tasks, meetings, pipeline stages, recent activity, client feedback, and the demo identities `currentPmId`/`currentTeamMemberId`/`currentClientId`) every screen reads from, so the same record looks the same everywhere it appears. Projects reference clients by `clientId`, never a raw name string. Each project carries `totalValue`/`received`/`invoiceDueDate` for billing — `data.kpis` deliberately does **not** duplicate an "outstanding payments" number; `ph.billingTotals()` computes it so Admin Overview and Billing Overview can never disagree.
- `js/services/project-helpers.js` — the shared logic layer for every Workspace screen: status/task/priority/payment/invoice → badge tone, date/currency formatting, PM/client/stage/team-member lookups, `billingTotals()`, `needsClientAction()`, `pipelineStepperHtml()`, plus shared render functions (`renderProjectsTable`, `renderStageSummary`, `renderActivityList`, `renderTaskBoard`, `renderMeetingsList`) and the shared `fieldRow()`/`badge()` markup builders. Extend this file rather than re-deriving the same logic in a new page script — it's what let Admin/PM/Team-Member Overview, and Project Workspace/Client Project View's pipeline stepper, share real code instead of triplicating it.
- **Admin**: `dashboard-admin.html` (Overview), `projects.html` (all projects), `leads.html`, `clients.html`, `billing.html` (upgraded 2026-09-22 from a single flat Payments list into separate Invoices + Payments panels with a real per-invoice derived Payment Status — see §19e), `team.html`.
- **PM**: `dashboard-pm.html` (Overview, filtered to `currentPmId`), `projects.html` ("My Projects", role-filtered).
- **Team Member**: `dashboard-team.html` ("My Workspace"), `my-tasks.html` (every task assigned to them, with a **quick status update** `<select>` per row — a flat list, distinct from Project Workspace's per-project kanban), `projects.html` ("My Projects", role-filtered).
- **Client**: `dashboard-client.html` (Overview — active projects + pending actions, deliberately thin, no internal detail per CLAUDE.md §4), `client-project.html` (the client-safe counterpart to Project Workspace: progress/stage/pipeline stepper/resources/contact-PM, **plus real Approve / Request Changes actions** that advance `project.stageKey` and log to `data.recentActivity`, and a feedback form backed by `data.clientFeedback`). Client Portal (Step 11) deliberately reuses `ph.pipelineStepperHtml()` for stage transparency but does **not** reuse Project Workspace's task board/team roster/history — CLAUDE.md §4's "clients must not see internal staffing/workload/notes" boundary is enforced by using a separate render path, not a filtered view of the internal one.
- **Shared across all four roles**: `project-workspace.html` (internal project detail — tasks, pipeline, meetings & decisions, history, team, resources; PM/Team-Member access is blocked for projects not assigned to them, a real "restricted" state, not just a hidden link) and `settings.html` (Step 12 — Profile + Preferences for everyone, a read-only System Settings pipeline-stages reference for Admin only, no password/secret field anywhere).
- `js/components/modal.js` / `css/components/modal.css` — the one shared modal (Task Detail, Lead/Team-member Details/Create/Edit). Mounted via a `#modal-root` placeholder + `workspace-chrome.js` calling `ns.components.modal.init()` — only pages that use it include the placeholder/script tag.
- `css/pages/list-page.css` — shared search+filter+panel layout for every list screen (Projects, Leads, Clients, My Tasks, Team).
- `css/components/data-display.css` — every reusable Workspace primitive: panel, badge, KPI card, data table (mobile card-collapse), progress bar, avatar, activity list, pipeline stepper, task board/kanban card, meeting timeline item, `.list-row` (icon+title+badge row), `.field-row` (label-above-value — used everywhere from Project Workspace's header facts to modal bodies to Client Overview's project cards), `.checkbox-row`, and a shared `.select`. Three real bugs were caught and fixed while building this: an empty `<h2>` in the modal before first open (pa11y-flagged), `.field-row`/`.list-row` markup that a page had started using without loading the stylesheet that defined it (page-scoped classes that only worked on the one page that happened to define them — now consolidated here so every page gets them via `shared.css`), and `.panel`/`.modal-overlay` both set `display` unconditionally, which silently beats the browser's `[hidden]{display:none}` rule (the same gotcha CLAUDE.md §15 already documented once) — both now have an explicit `[hidden]{display:none}` override.
- **Role resolution for pages reachable by more than one role** (`projects.html`, `project-workspace.html`, `settings.html`): these don't set `window.IQRAA_ROLE`. `workspace-chrome.js` persists whichever role single-role pages *do* set into `sessionStorage["iqraa-demo-role"]`, and falls back to reading it back on pages that don't set one — the final resolved role is exposed as `window.IQRAA_RESOLVED_ROLE`. A fresh session with nothing in `sessionStorage` defaults to Admin.
- **Step 13 audit findings**: a full `he`/`ar` key-parity check (370 keys each, zero gaps either direction) confirmed no translation drift across the whole build; a hardcoded-string sweep found and fixed one pre-existing violation unrelated to Steps 1–12 — `header.js`'s public-site nav had a literal `aria-label="Primary"` since the original React→HTML conversion, now `header.primaryNavLabel`; a `@media` breakpoint audit found the Workspace consistently switches at `960px` (matching the sidebar's collapse point) with `719px`/`640px`/`1200px` used deliberately for table-collapse and KPI-grid column-count thresholds, not drift. **Superseded 2026-09-21i**: the `ar` half of that key-parity check no longer applies — Arabic support was removed entirely (see §12), so `js/i18n/translations.js` now holds one flat Hebrew table, not a `he`/`ar` pair. No fake loading-spinner states were added anywhere — every Workspace screen renders synchronously from local mock data, so a real loading state has nothing to demonstrate yet; that becomes relevant once Airtable fetches are real (Phase 9+), not before. `css/pages/dashboard-placeholder.css` and its `.dash-card*` classes were deleted once the last page using them (`dashboard-client.html`) got real content — confirmed nothing else referenced them first.
- **What's still explicitly a demo simplification, not a gap to "fix" reflexively**: Team Management has no "remove member" (no destructive-confirmation pattern exists yet in this codebase); My Tasks/Project Workspace resources are demo-only badges (no real external URLs to point to, per the "don't invent URLs" rule); the pipeline stepper always shows all 11 stages including "Changes" even for projects that never needed a revision round — the stepper is a fixed reference sequence, the actual conditional branching is described in `pipeline.changesNote` text, not modeled as stepper logic.

Build order (don't jump ahead of this without being asked). **Phases 1–8 are UI-done** (all 13 `screens.md` §38 steps shipped — see the "Shipped screens" note above); **Phase 9 is next** and hasn't started:
1. ✅ **Phase 1 — Foundation**: Landing/Welcome, Responsive, Accessibility, Login, Hebrew-only i18n infrastructure (Arabic was removed 2026-09-21i, see §12), secure authentication architecture (see §5 — architecture only, not the final implementation), role detection.
2. ✅ **Phase 2 — Internal Application Shell**: Sidebar, Header (app shell, not the marketing header), role-based navigation, User Profile, workspace layout, responsive behavior (see §8–9). Notifications and Breadcrumbs are the two shell pieces still not fully built — a notification-bell popover shell exists but no real Notification Center, and no breadcrumb trail (nothing multi-level enough to need one yet).
3. ✅ **Phase 3 — Admin / CEO Workspace**: Overview, Leads, Active Projects, Projects Ready to Start, PM workload, Billing overview, Recent activity — mock data.
4. ✅ **Phase 4 — CRM / Leads / Clients**: Leads list/details/create/edit, lead status & qualification, client records, client/project relationship.
5. ✅ **Phase 5 — Projects**: project list, project details/workspace, project stages, team, tasks, resources, project history, Meetings & Decisions (see §6–§7), client feedback, approvals.
6. ✅ **Phase 6 — Team Member Workspace**: My Workspace, My Tasks, My Projects, task details, status updates. (Task/project *comments* specifically weren't built — task detail has a "comments coming soon" note, not a real thread.)
7. ✅ **Phase 7 — Client Portal**: client dashboard, project status, progress, current stage, relevant resources, feedback, approvals, contact PM (client sees only their own project(s)).
8. ✅ **Phase 8 — Billing / Administration**: payments, invoice status. User management (Team Management) is built too, but without a "remove member" action (§9's shipped-screens note explains why) and without real user-account/settings administration beyond what `settings.html` already covers.
9. **Phase 9 — Integration & Automation** (not started): Airtable connections, n8n workflows, notifications, operational automations, AI agents where relevant, additional integrations only when justified (see §19). Google Calendar / Outlook / Google OAuth do **not** appear here or anywhere else in this roadmap — they're out of MVP per §2, not merely deferred to a later phase.

**Explicit "don't do yet" list from the project owner:**
- Don't build new AI Agents.
- Don't add new n8n workflows before the basic UI is clear.
- Don't wire every screen to Airtable immediately.
- Don't build Google Calendar / Outlook Calendar integration or Google Sign-In — out of MVP scope entirely (§2), not a "later phase" item.
- Don't implement the final authentication provider yet — document the architecture (§5) and stop there until asked to implement it.
- Don't add complex permissions before the Role structure exists.
- Don't add more RAG content if the existing RAG is ready.
- Don't give Claude Code one giant whole-project prompt — one task at a time, check, approval, next task (see §20).

## 4. Roles (drives every dashboard/screen from Phase 2 onward)

Enforce this as real data/UI scoping (filter what's rendered/fetched per role), not just hidden nav items — this applies with extra weight to the Client role, who must never receive internal-only data even in an API response that a hidden UI element simply doesn't render.

**1. Admin / CEO** — full operational visibility:
- Leads, Clients, Projects (all statuses, all stages)
- Team / user management, Project Manager assignment
- Billing
- System settings
- Workload/availability visibility across Project Managers

**2. Project Manager** — scoped to their own assigned projects:
- Assigned projects only
- Project team, tasks, project stages
- Client relationship for their projects
- Meetings & Decisions
- Project progress, client feedback, approvals, project completion

**3. Team Member** — scoped to their own assignments:
- Assigned projects and assigned tasks only
- Task status
- Resources, comments
- Relevant project information
- Meetings & Decisions where relevant to their work

**4. Client** — scoped to their own project(s), read-only + approval actions:
- Own project(s) only — progress, current stage, expected completion
- Relevant links/resources
- Feedback / approval actions where applicable
- Project-related meeting/decision information only when appropriate

Clients must **not** see internal information: internal staffing details, internal notes, internal QA discussions, internal workload, other clients/projects, or any other internal operational data.

## 5. Authentication — real, implemented (2026-09-21h)

**Built and live-tested, not just designed.** The Login page (`pages/login.html`, unchanged UI) authenticates against Airtable through the backend at `backend/server.js` — see that folder's README for the full endpoint contract, and §19c below for how this fits the rest of the backend/Airtable architecture.

- **Airtable is the system of record** for application users, roles, status and profile information.
- **Passwords are stored in plaintext, deliberately (2026-09-21l — project owner decision, reversing the note that used to be here).** The Users table field was originally `Password Hash`, holding a bcrypt hash verified server-side with `bcrypt.compare()`; the project owner explicitly asked to drop hashing because **this is MVP/demo data, not real user accounts**, and the field was renamed to plain `Password` to match (`backend/server.js`'s login/create handlers now do a direct string comparison, no `bcrypt` dependency at all). This is a one-way decision to revisit **before any real user data ever goes into this table** — don't quietly reintroduce hashing without an equally explicit instruction, since that would break every password already stored in plaintext. Current test-user passwords: **`Iqraa123!`** for every pre-existing test user (Claude Verify Admin, Claude Verify Inactive, Auth Test Via Admin, IQRAA E-learning, IQRAA Test User) and **`IqraaClaude2026!`** for `claude.verify.projects@iqraa-digital.test` (Admin role, created 2026-09-21k to verify the Projects-Airtable connection). Nothing here is sent to the frontend either way — `/api/auth/login`'s response only ever contains `{id,email,fullName,role}`, per the bullet below.
- Frontend → Backend → Airtable, always. The browser never talks to Airtable directly and never sees an Airtable PAT, a stored password, or the session secret (`js/services/auth.js` only ever calls `backend/server.js`'s `/api/auth/*` endpoints, with `credentials:"include"`).
- Session = server-side (`express-session`) + an `httpOnly` cookie (`iqraa.sid`). `js/workspace-chrome.js` calls `GET /api/auth/me` on every Workspace page load to confirm the session is still valid before rendering anything — see §9 for how this gates page access.
- *Authentication* (who the user is — the login flow above) and *authorization* (role-based access, §4) are separate: role comes from Airtable's `Role` field, mapped to this app's 4-role model server-side (`AIRTABLE_ROLE_TO_APP_ROLE` in `server.js`), and is authoritative on both the backend (`requireRole()` middleware, e.g. on `POST /api/users`) and the frontend (workspace-chrome.js's page-access gate) — never trust a frontend-only check for anything that reads/writes real data.
- Google OAuth remains explicitly **not** used anywhere in this flow — this is plain email+password against Airtable, not a third-party identity provider. (Google OAuth is a separate, still-unconfigured placeholder button on the Login page itself, per §18's external-integration-placeholder convention — unrelated to this backend-Airtable flow and not touched by it.)

## 6. Meetings & Decisions — project-level concept

Do **not** build a traditional "Meetings Dashboard" or a calendar inside IQRAA, and do not require employees to manually log every meeting they have. This is a deliberate product decision, not a missing feature.

Instead, meetings belong to the context of a **project**, as a "Meetings & Decisions" record on that project. Its purpose is to document meaningful meetings and, more importantly, what was decided and what needs to happen afterward. A meeting record may contain:
- Meeting type
- Date
- Participants
- Summary
- Decisions
- Follow-up tasks
- Optional meeting link
- Optional notes/resources

The system should answer **"what was decided in the last important client meeting and what needs to happen next?"** — it should **not** primarily try to answer "when is this employee's next meeting?" Meeting history is part of the project's operational history (§7), not a scheduling tool. Upcoming meetings may optionally be recorded, but employees are never required to maintain a complete calendar inside IQRAA.

If calendar integrations are ever added in the future (they are explicitly out of MVP — §2), they could eventually auto-populate this section, but that's a future enhancement to design for later, not something to build now. **Built**: `pages/project-workspace.html`'s "Meetings & Decisions" panel, `js/data/mock-data.js`'s `meetings` array, `ph.renderMeetingsList()` — see §9's shipped-screens note.

## 7. Project model

The core product remains project-centered. A project brings together the information needed to manage the work:

- Client
- Project status
- Project stage
- Overall progress
- Project Manager
- Team
- Tasks
- Deadlines
- Files/resources
- External links (to Drive, Docs, Figma, etc. — see §1, not copies of that content)
- Client feedback
- Approvals
- Billing/payment status
- Meetings & Decisions (§6)
- Project history/activity

The project workspace is the central place where the operational story of the project is visible — this organizing idea is what `pages/project-workspace.html` and `pages/client-project.html` are both built around (§3, §9).

## 8. Internal Workspace UI vs public / auth UI

The internal application must **not** look like the public landing page or the Login screen. Keep a clear visual distinction between:

- **A. Public / authentication experience** — Landing + Login. Marketing-register: large display type, full-bleed photo panels, generous whitespace. The patterns in §11–17 (brand pane + scrim, big display headings, compact tile grid) belong to this surface.
- **B. Internal IQRAA Workspace** — everything behind login (Phase 2 onward, §3). Still built on the IQRAA brand identity (colors, typography, visual language — §11, §13), but functional, information-dense, structured, and optimized for daily work: dashboards, tables, tasks, project management. It should feel like a professional ERP/workspace, not a generic SaaS template, and not a second marketing surface.

Don't carry the Landing/Login marketing patterns (large display headings, photo brand panes) into internal screens wholesale — the internal shell (§9) has its own denser conventions instead: `.panel`/`.kpi-card`/`.data-table`/etc. (`css/components/data-display.css`), never the marketing surface's hero/tile patterns.

## 9. Internal app shell & role-based navigation

Built 2026-09-21 (Phase 2 §3 / `screens.md` §38 Step 1) as the first internal-Workspace screen — a shared shell every Workspace page mounts into. By the time all 13 `screens.md` §38 steps shipped, every one of the 4 roles had a real page built on this same shell.

The internal workspace shell:
- **Right-side sidebar** (`js/components/sidebar.js` + `css/components/sidebar.css`) — role-aware nav list, right-side placement comes purely from DOM order (`#sidebar-root` is the first child of `.workspace-shell`) plus the fixed `dir="rtl"`, not from an explicit `order`/mirroring trick (same principle as §13's photo-pane pattern). Desktop (≥960px): a static column, fixed at `--sidebar-width` (`css/tokens.css`). Mobile: a full-screen overlay + sliding panel, structurally identical to `.mobile-menu-overlay` (`css/components/mobile-menu.css`) but its own implementation, not a shared one — **important gotcha already paid for**: the overlay's `justify-content` has to match which side the *toggling button* sits on for that specific header (first-vs-last DOM child flips the RTL side), don't copy `mobile-menu-overlay`'s `flex-end` value without checking the toggle button's position in the new context.
- **Top navigation/header** (`js/components/workspace-header.js` + `css/components/workspace-header.css`) — page title (the page's own `<h1>`; every panel heading below it is an `<h2>`, don't reintroduce a second `<h1>` per page), a notifications bell (popover shell only — trigger + empty-state panel; real Notification Center content is still unbuilt, per `screens.md` §21/§34), and a user menu (avatar initial, name, role label, sign-out — reuses the exact same open/close/click-outside/Escape pattern as the bell popover via one shared `wirePopover()` helper rather than two near-duplicate implementations). There is no language selector — removed 2026-09-21i along with the rest of `language-toggle.js`, see §12.
- **Bootstrap script**: `js/workspace-chrome.js` — the internal-app analog of `js/chrome.js`, mounting sidebar + header + the accessibility widget then calling `translatePage()`. Kept as a separate file rather than branching `chrome.js` by page type, since the two mount entirely different component sets.
- Breadcrumbs and a desktop sidebar-collapse affordance are **still deliberately not built** — every Workspace screen so far is one level deep (a sidebar item, or that item plus a single detail page reached via a link/`?id=`), so there's no multi-level navigation yet for a breadcrumb trail to represent. Add them if a future screen genuinely needs multi-level navigation, not speculatively.
- Role-aware navigation — the sidebar renders per the user's **real, session-derived role** (`session.user.role` from `GET /api/auth/me`, via §5's real auth). `window.IQRAA_ROLE` still exists as a per-page constant on single-role Workspace pages, but as of 2026-09-21h its meaning flipped: it's the **role required to view this page** (an access gate), not a role to render. `js/workspace-chrome.js` checks it against the real session role and redirects to the user's own dashboard on a mismatch (or to Login if there's no session at all) — see §19c for the full mechanism, including the shared `ns.workspaceAuthReady` promise other page scripts await for the verified role. Pages reachable by more than one role (`projects.html`, `project-workspace.html`, `settings.html`) simply don't set `IQRAA_ROLE`, same as before. The old sessionStorage-persisted-demo-role fallback described in earlier revisions of this file is gone — a real session is authoritative now.

Per-role navigation (`sidebar.js`'s `NAV_ITEMS` map) — ✅ = real link, — = still a disabled "coming soon" `<button>` (not a dead `href="#"` link or a silently-inert control):
- **Admin / CEO**: Overview ✅, Leads ✅, Projects ✅, Team ✅, Clients ✅, Billing ✅, Settings ✅
- **Project Manager**: Overview ✅, My Projects ✅, Tasks —, Clients —, Settings ✅
- **Team Member**: My Workspace ✅, My Tasks ✅, My Projects ✅, Profile ✅ (→ `settings.html`)
- **Client**: My Workspace ✅, Projects ✅ (→ `client-project.html`), Contact —, Profile ✅ (→ `settings.html`)

PM's "Tasks" (a cross-project task list, distinct from My Tasks which is Team-Member-only) and "Clients" (a PM-scoped client view) remain unbuilt — out of scope for the 13 `screens.md` §38 steps that have shipped; build them only if a future task asks for that specific PM capability. Client's "Contact" stays disabled deliberately — "contact PM" is provided contextually inside `client-project.html` instead of as a separate page, so a second nav entry pointing at the same destination would be redundant.

The exact screen inventory (every screen under each nav item) is documented separately in `screens.md` — this section is the shell/navigation shape, not the per-screen content.

## 10. Admin / CEO project assignment flow

Built (Admin Overview, §3) — `pages/dashboard-admin.html`'s "Projects Ready to Start" panel + `js/pages/dashboard-admin.js`'s `assignPm()`.

- When the first project payment is received, the project becomes ready to start and appears in an Admin / CEO **"Projects Ready to Start"** area (`status: "readyToStart"`, `pmId: null` in `js/data/mock-data.js`).
- The Admin / CEO reviews Project Manager workload (§9's PM Workload panel) before assigning a Project Manager to the project via the select + confirm control in that row.
- Workload is **derived from actual project/task information** (`data.projects`/`data.tasks` filtered by `pmId`/`assigneeId`), never manually typed in by anyone.
- Once a Project Manager is assigned, `assignPm()` sets `pmId`, moves `status` to `"onTrack"`, `stageKey` to `"specification"`, and the project now shows up everywhere a PM's assigned projects are read from (`ph.projectsForPm` — Projects List, PM Overview, Project Workspace's role gate) — §4's PM scope takes over from there.

## 11. Brand identity

- **Company**: IQRAA Digital Learning LTD ("IQRAA" = Arabic for "Read"). This is who owns/operates the product.
- **Product**: AI Learning Operations ERP. This is what the company built.
- **Lockup pattern** (used in Header, Footer, Login brand pane, `<title>`): company name as the primary/bold wordmark, product name as a smaller tagline beneath it. Never show only "AI Learning Operations ERP" without the company name nearby — a past revision did this and had to be corrected.
- Both names stay in Latin script / untranslated in the Hebrew UI — they're proper nouns.
- Company name should visibly appear on the Login page (explicit requirement).

## 12. Language & RTL — how it actually works here

**The application is Hebrew-only (changed 2026-09-21i).** It previously supported Hebrew and Arabic with a user-facing language switcher; Arabic support was removed entirely at the project owner's explicit request — this is a deliberate, permanent product decision, not a temporary simplification. Don't reintroduce Arabic, a language selector, or any language-switching machinery without a new, equally explicit instruction.

`dir="rtl"` is fixed once in every page's `<html>` tag and never toggled. `lang="he"` is likewise hardcoded in every page's `<html>` tag, not set dynamically by JS.

What changed when Arabic was removed:
- `js/i18n/translations.js` is now a single flat Hebrew object (no more `he`/`ar` wrapper keys) — `IQRAA.i18n.translations.<path>`, not `IQRAA.i18n.translations.he.<path>`.
- `js/i18n/i18n.js` lost `setLanguage()`, `getLanguage()`, and `onLanguageChange()` — there is nothing left to switch or subscribe to. `t()` and `translatePage()` are unchanged in shape (still walk `[data-i18n]`/`[data-i18n-attr]`), they just resolve against the flat table directly. If you're tempted to call any of those three removed functions, that's a sign you're looking at stale guidance (or a stale memory of the old two-language build) — there's no replacement API, the call sites were deleted along with the functions (page scripts' `renderAll()` still runs once on load, which is all that's needed now).
- `js/components/language-toggle.js` and `css/components/language-toggle.css` are deleted, along with every `#header-lang-root`/`#workspace-lang-root`/`#settings-lang-root`/`#mobile-menu-lang-root` mount point that used to host them (public header, mobile menu, Workspace header, Settings → Preferences).
- Font family is just **Assistant** everywhere, unconditionally (`--font-family` in `css/tokens.css`) — the `html[lang="ar"] body` override and the IBM Plex Sans Arabic Google Fonts import are both gone from `css/global.css`.
- The per-language heading-tuning split in `css/pages/landing.css` (`html[lang="ar"] …` / `html[lang="he"] …` selectors) collapsed back into the base `.landing-hero h1` etc. rule, at `font-weight: 700` (the old Hebrew-tuned value).

**Rules for every new screen** (this applies to every UI surface listed in §2 — navigation, sidebar, header, forms, tables, cards, modals, buttons, empty states, error messages, notifications, accessibility labels, tooltips, placeholders, validation messages):
- No hardcoded UI strings, ever — not in markup text, not in `aria-label`, `alt`, `title`, placeholder, etc. Add a key to `js/i18n/translations.js` and reference it via `data-i18n`/`data-i18n-attr`, same mechanism as before, just one language now.
- Write natural, professional Hebrew — not a literal/robotic translation of English source copy.

**Deliberate exception — status/concept values stay in English, Workspace-only (2026-09-21i):** inside the post-login Workspace (dashboards and everything behind login — not the public Landing/Login pages), the *value* text of these specific translation keys is intentionally English even though every surrounding label is Hebrew:
- `status.onTrack` / `status.attention` / `status.overdue` / `status.readyToStart` / `status.paymentPaid` / `status.paymentPartial` / `status.paymentFirstReceived` — project status + payment status
- `leadStatus.new` / `leadStatus.qualified` / `leadStatus.proposalSent` / `leadStatus.won` / `leadStatus.lost` — lead status
- `invoiceStatus.paid` / `invoiceStatus.pending` / `invoiceStatus.overdue` — invoice/billing status
- `team.statusActive` / `team.statusPaused` / `team.statusInactive` — team-member (employee) status
- `paymentStatus.unpaid` / `paymentStatus.partial` / `paymentStatus.paid` / `paymentStatus.overdue` — the derived per-invoice Payment Status computed by `GET /api/billing` (§19d). Added 2026-09-22 (Admin financial management audit) as a fifth named category, after explicitly asking the project owner rather than guessing, per this section's own rule below — confirmed to follow the same convention as the other four.

This is a narrow, named exception covering exactly those five status *categories* (project, lead, payment/invoice, employee, derived payment status) — it does **not** extend to `taskStatus`, `priority`, `teamRole`, or any other translation key, which all stay Hebrew like everything else. Don't widen this list without an equally explicit instruction; if a future screen introduces a new status-like concept and it's unclear whether it belongs in this list, ask rather than guessing either way.

## 13. Design tokens (`css/tokens.css`) — use these, never hardcode

```
--background: #f8f7fb        --text: #201d2b
--surface: #ffffff           --text-secondary: #666276
--primary: #6c5ce7           --border: #e7e3ef
--primary-dark: #5142b8      --danger: #b43d68
--primary-pale: #f1efff
--container-max: 1180px      --header-height: 76px
```

Full spacing/radius/shadow/font-size scale is in the file — reuse it, don't invent new magic numbers. Everything is `rem`-based on purpose: the accessibility text-size control (§15) works by scaling root `font-size`, and it silently breaks for anything sized in raw `px`.

### Color contrast — lessons already paid for
- **Never use `var(--primary)` as text color on `var(--primary-pale)` background.** Measured contrast is 4.29–4.39:1, which fails WCAG AA (4.5:1). Use `var(--primary-dark)` for text-on-pale-bg instead (verified ~6.4:1+). This exact bug shipped once (workflow section) and was only caught by running pa11y, not by eye.
- Never introduce ad-hoc gray hex values (`#667085` etc.) for secondary text — always `var(--text-secondary)`, which is contrast-verified. If a color isn't a token, that's a signal to double-check it.
- Photo tiles with text over them (see `.landing-product-tile` in `css/pages/landing.css`) need a dark scrim of **at least 0.7 opacity black**, not 0.5–0.6 — the scrim has to work against the *brightest* photo you might put behind it, not the average one. Pair it with a `text-shadow` on the text for extra margin. **Exception, deliberately chosen (2026-09-21)**: the small 150×150 product tiles now use a lighter `0.48` scrim so the photo reads through more clearly at that size — legibility is preserved by a much stronger `text-shadow`/badge background instead of scrim opacity. This is a tile-size-specific tradeoff, not a reversal of the ≥0.7 rule — any *large* photo panel (like the login brand pane) still needs ≥0.7.
- A translucent **white** badge/pill placed on top of that dark scrim actively undermines it (it lightens the effective background back up). Badges over photos should be dark-tinted (`rgba(0,0,0,…)`) with a light border, not light-tinted.
- **Run a real contrast check, don't eyeball it.** See §16.

### Full-panel photo + scrim, collapsing to a top banner on mobile

Established on the Login page brand pane (`.login-brand-pane` in `css/pages/login.css` / `pages/login.html`) — reuse this exact structure for any future *public/auth* screen (§8) that wants a large marketing/brand photo panel (not just small tiles):

- Markup: an `<aside>` (or similar) with `background-image` set inline via `style="background-image:url('…')"`, containing a `<div class="…__scrim" aria-hidden="true">` (absolutely positioned, `inset:0`, `rgba(8,6,20,0.74)` or similar — same ≥0.7-opacity-black rule as photo tiles) as the **first** child, then a `<div class="…__content">` (`position:relative; z-index:1`) wrapping all the real text content. The scrim needs its own element (not the pane's own `background`) so it can sit between the photo and the text in stacking order.
- All text inside `…__content` needs color flipped to white/near-white (`#fff`, `rgba(255,255,255,0.85)` for secondary text) plus a `text-shadow` on headings for extra contrast margin — the pane's default token-based text colors (`var(--text)` etc.) assume a light background and will fail contrast on a photo.
- **Responsive collapse pattern**: don't `display:none` the panel on mobile like the old flat-color version did. Instead give the pane a `min-height` (e.g. `260px`) by default (mobile-first) with `justify-content:center` on the content wrapper, and `display:none` *only* the secondary content (long paragraph, pill list, footer copyright) so the compact banner shows just the logo lockup + a short heading. At the desktop breakpoint (`min-width:960px` here), switch to `min-height:100vh`, `justify-content:space-between`, and re-show the hidden secondary content (`display:block`/`flex`). Because the photo pane is the first DOM child and the grid/flow is single-column below the breakpoint, it naturally renders *above* the form with zero reordering — don't add an explicit order/flex-order trick, the source order already does it.

### Compact tile grid beside text (not spread across full width)

Products section (`.landing-products-layout` in `css/pages/landing.css`/`index.html`, 2026-09-21 redesign): a fixed-size tile grid (currently `repeat(3, 150px)`, tiles don't stretch) sitting next to the heading/paragraph in a 2-column grid, rather than a full-width `auto-fill` mosaic stacked below the text. **Two lessons from the redesign that caused the original "smeared" look**: (1) never let the grid's track size (`grid-template-columns`) differ from the tile's own explicit `width`/`height` — a gap between the two (tracks wider than the tiles) reads as extra, uneven spacing beyond the intended `gap` value; keep them equal. (2) `auto-fill` reserves space for as many tracks as fit the container even when there's no content for them, which can visually spread a mosaic out unpredictably — for a small, fixed-count tile set, use an explicit fixed column count instead.

### Required-field markers

Text fields that are actually `required` get a visible `*` next to the label: nest the translated label text in its own `<span data-i18n="…">` inside the `<label>` (not directly as the label's `data-i18n`, since `translatePage()` overwrites the whole element's `textContent` and would wipe out a sibling asterisk), then add `<span class="text-field__required" aria-hidden="true">*</span>` right after it. `aria-hidden` because the `required` HTML attribute on the `<input>` already communicates required-ness to assistive tech — the asterisk is a sighted-user affordance only, not a second accessibility signal. See the contact form in `index.html` for the working pattern (4 required fields marked, the optional message textarea isn't).

## 14. Typography weight

- Body/UI text: whatever the component already uses (mostly 600 for labels/buttons).
- Big marketing display headings: `font-weight: 700` (Assistant, Hebrew-only — see §12).

## 15. Accessibility — non-negotiable per screen

This app targets Israeli accessibility-law compliance (תקנות נגישות השירות, ת"י 5568 / WCAG 2.0 AA). Concretely, per new screen:

- **Run `npx --yes pa11y http://localhost:<port>/<route>.html` against a static server and get "No issues found" before calling a screen done.** This caught 15 real contrast failures and 7 broken anchor links in past rounds that manual review missed — and, in the React→HTML/CSS/JS conversion, caught a real bug (a11y widget ARIA labels not translated on pages that forgot to call `translatePage()`).
- Every interactive element needs an accessible name (visible text, or `aria-label` if icon-only).
- Every hover/focus state needs a `transition` — snapping color changes without one were flagged and fixed.
- Animate `transform`/`opacity` only. Never animate `top`/`left`/`width`/`height`/`margin` (`.skip-link` did this and was migrated to `transform: translateY()`).
- `prefers-reduced-motion` is already handled globally in `global.css` (collapses all animation/transition durations) — don't fight it or duplicate it per component.
- **In-page anchor links (`#services` etc.) must resolve on every page they appear on.** This is a multi-page static site now (one real `.html` file per route), so a plain `<a href="index.html#services">` resolves natively via the browser on any page — no JS scroll hook needed anymore (the old `useScrollToHash` React hook existed only to work around SPA route-change timing and has no equivalent here). Just use the real filename in the href.
- New forms: live-validate with the **touched-then-live** pattern already used in `js/pages/login.js` and `js/pages/landing.js` (error stays hidden until first blur/submit attempt, then re-evaluates on every keystroke, via `IQRAA.components.textField.setError(id, message)`). Don't ship a form that relies on bare HTML `required` with no visible feedback.
- Loading states need a **visible spinner**, not just a text change — see the `loader-2` icon + `@keyframes login-spin`/`landing-spin` pattern in `css/pages/login.css`/`landing.css`. **Watch out for the `hidden` attribute + custom `display` gotcha**: if an element has both the `hidden` attribute and a class that sets `display` (e.g. `display:flex`), the class's author-stylesheet rule beats the browser's `[hidden]{display:none}` UA rule and the element stays visible. Every class used with `hidden` needs an explicit `.your-class[hidden] { display: none; }` override (see `.text-field__error[hidden]`, `.landing-form-error[hidden]`, `.login-form-success[hidden]` etc. for the pattern) — this shipped as a real bug once (success/error banners visible on page load) and was only caught by a screenshot, not by pa11y.
- Global a11y infrastructure already exists — don't re-add it per page:
  - Skip link — one line, `<a href="#main-content" class="skip-link" data-i18n="meta.skipLink"></a>`, inlined directly in every page's `<body>` (global `.skip-link` class from `global.css`).
  - `js/components/accessibility-widget.js` + `css/components/accessibility-widget.css` — floating bottom-right button opening a panel with text-size steps, high-contrast toggle, underline-links toggle, reset, and a link to the statement page. Driven by `data-a11y-*` attributes on `<html>`, styled in `global.css`. Persists to `localStorage` (`iqraa-a11y-settings`). Mounted via `IQRAA.components.accessibilityWidget.init()` into a `<div id="a11y-widget-root"></div>` placeholder — every page needs that placeholder div and the script tag, `js/chrome.js` handles the init call for the standard pages.
  - Accessibility statement page at `pages/accessibility.html`, linked from the Footer and from the widget panel.
- `:focus-visible` outline is global (`global.css`) — don't override it away on new components.
- Every real `<img>` needs a translated, descriptive `alt`. (Most imagery on this site is CSS `background-image` on a tile with a visible text title over it, which doesn't need `alt` — but if you add a genuine `<img>`, it does.)

## 16. Verification checklist — run this before calling any screen finished

```bash
npx oxlint js                                              # lint (plain JS, no TS/React rules anymore)
npx --yes serve . &                                        # static server (or: python -m http.server 3000)
npx --yes pa11y http://localhost:3000/pages/<route>.html   # real WCAG2AA check, not a guess
```
(`index.html` is the one route without the `pages/` prefix — see §18.) Both should be clean (pa11y: "No issues found") before reporting the work as done. **No `npm run dev`/`npm run lint` shortcuts exist** (root `package.json` was removed 2026-09-22, see §18) — run the bare `npx` commands above directly; both still work with no local install (npx fetches `oxlint`/`serve`/`pa11y` on demand). `npx oxlint js` now runs with oxlint's own defaults, not a pinned `.oxlintrc.json` (also removed) — if lint behavior ever needs to be pinned/customized again, that means re-adding a config file and deciding then whether it's worth reintroducing `package.json` too.

Also open the page directly via `file:///…/<route>.html` in a browser at least once per screen — the whole point of this stack is that it needs no build step and no server, so confirm that's actually still true (classic `<script src="...">` tags, no `type="module"`/bare `import`, no `fetch()`-based HTML includes — all of those break under `file://`).

## 17. Sourcing images — verify, don't guess

Never invent or guess an Unsplash photo ID and drop it in. The process that's worked:
1. Use `WebSearch`/`WebFetch` against `unsplash.com/s/photos/<query>` to find real candidate photos and their `images.unsplash.com/photo-…` CDN URLs.
2. **Reject anything on `plus.unsplash.com`** — those are Unsplash+ premium photos requiring a paid license, not free to use here.
3. Verify each candidate with `curl -s -o /dev/null -w "%{http_code}" <url>` — must be 200.
4. Download a small version and actually look at it with `Read` before using it — a description string from search results is not enough; verify the image really shows what it claims.

**Image-selection judgment calls that got corrected in review, worth remembering:**
- Match the image to the *specific concept*, not a generic proxy. "Hybrid course" needed a photo that visibly shows the online+in-person blend (people in a room watching a colleague on a video call screen), not just any office photo. "Digital learning product development" needed a visible screen/wireframe, not just people talking.
- For tiles/panels where no person needs to be visible (games, simulations, tools, screens), an object/hands-only photo is often both more accurate to the concept *and* simpler — prefer it when it fits, but that's a fallback, not the goal in itself. See the rule below for what to do once a photo *does* show a person's face.
- Modesty/brand fit matters for this specific company (IQRAA, Arab-Muslim-oriented branding) — screen out anything with revealing clothing, alcohol, or club/party styling before it goes anywhere near the site, the way the original "סרטוני הדרכה" tile photo had to be swapped out.

### Representation rule for identifiable people in photos — history and current state (superseded 2026-09-21k)

**2026-09-21**: a rule required every identifiable person shown on the site to read as Muslim (women in hijab). **2026-09-21k: the project owner explicitly cancelled the hijab/Muslim-presentation requirement.** It does not apply anymore, anywhere on the site, and should not be reintroduced or treated as still-binding guidance — this paragraph is kept only so the history isn't lost, not as an active rule. The **general modesty/brand-fit rule below it (professional dress, no revealing clothing/alcohol/club styling) is unchanged and still applies** — only the hijab/Muslim-presentation requirement specifically was lifted, nothing else in §17.

Current direction (2026-09-21k): where a photo shows an identifiable woman, prefer **women without head covering** — professional, modest dress, same as always. This is a deliberate content direction from the project owner, not a hard technical constraint like the old rule was; use ordinary judgment (§17's other bullets) rather than a checklist when sourcing.

**Swapped back under this reversal (2026-09-21k)** — these had been changed to Muslim-presenting photos under the old rule and are now replaced again: Login brand-pane photo (now `photo-1586936893354-362ad6ae47ba` — a hands-only UX-process/journey-mapping shot, no face at all, chosen to fit the brand pane's "כל תהליך הפיתוח. במקום אחד." heading about the development process), and 3 product tiles — `hybridCourse` (now `photo-1787647562201-113361490c83`, people in a room watching a female colleague on a video-call screen — the concept match §17's bullets call for), `inPersonCourse` (now `photo-1758873269035-aae0e1fd3422`, a classroom/whiteboard teaching scene), `presentations` (now `photo-1758691737182-d42aefd6dee8`, a woman presenting to a seated group in an office). All re-verified through the normal §17 process (real search, non-`plus.unsplash.com`, curl 200, downloaded and looked at). The other 5 product tiles (`onlineCourse`, `games`, `trainingVideos`, `simulations`, `eLearning`) were left as-is — hands/object-only shots, never affected by either version of the rule.

**Landing hero — replaced again 2026-09-21k**, overriding an earlier decision (documented above §17, now removed) to leave the hero photo unchanged during this same reversal. The owner explicitly asked for the hero photo itself to change even though the prior app-mockup photo already read as "digital learning product development" conceptually — the request was for a *person* (a woman, uncovered hair, per this section's current direction) actively doing product-development work, not a people-free mockup.

The first replacement (`photo-1595846870212`, an over-the-shoulder shot with her face turned away/hidden by hair) shipped and turned out wrong once actually rendered: `.landing-hero-visual img`'s CSS (`css/pages/landing.css`) still had `object-position: 85% center` + `transform: scale(1.55)` + a specific `transform-origin`, hard-tuned to crop the *previous* app-mockup photo's composition (it needed to crop past left-side whitespace). Applied to the new photo, that hack zoomed into the wrong region and cropped the woman almost entirely out of frame, leaving mostly cables/keyboard/screen visible — caught only because the owner looked at the actually-rendered page and asked "where's the photo you're describing," not from the source image alone. **Lesson: after swapping a hero/brand-pane photo, always check whether the frame's CSS has a photo-specific crop hack (`object-position`, `transform: scale`, `transform-origin`) tuned to the *old* photo's composition, and re-tune or remove it — don't just verify the source image in isolation via `Read`, verify what actually renders in the frame** (ideally via a real render, e.g. an Unsplash `fit=crop&w=<frame-w>&h=<frame-h>` preview at the frame's real pixel dimensions, which is what caught this).

Second correction, still 2026-09-21k: `photo-1713946598526-357e3baaff04` (a woman typing at a laptop, brick-wall office, face visible) shipped briefly, but the owner then asked separately for the hero specifically to show, in "beautiful/rich colors": expertise in learning development, a connected work process, and AI working for you (`hero.highlights.0–2` — the three checklist items already next to the image) — a single realistic office photo can't literally depict three abstract concepts at once, so the direction that won out was a vivid, colorful stock photo of a team working together around a screen showing AI/data content, rather than a muted solo-person shot.

**Current hero image: `photo-1787647561593-84dd92de4e05`** — a team of 4 colleagues around a colorful triangular-pattern office wall (orange/teal/gold/grey), one woman (dreadlocks, uncovered, modest wrap dress) presenting a monitor showing a "Company analytics" dashboard (percentages, bar/donut charts) to 3 male colleagues. Chosen over an alternate from the same shoot with a woman with dyed teal hair (`photo-1787647562131`, stronger direct-camera framing and an even clearer "Company growth" dashboard) specifically for brand-fit — natural hair color reads more consistently "professional expertise" for this ERP brand than an unconventional dye job, even though nothing in the modesty rule technically excludes it; keep this in mind as the tie-breaker if choosing between similarly-strong candidates from a themed shoot again. Also 16:9 (3840×2160, wider than the frame), so the same plain `object-fit: cover; object-position: center` rule still applies with no per-photo tuning. **The `filter: saturate(0.82)` that every previous hero photo had was removed for this one** — the whole point of this photo choice was vivid color, and muting it down would undercut the request; if a future hero photo is more naturally oversaturated/garish, consider whether a saturate filter belongs back, but don't default to reapplying the old value without checking the new photo actually needs it.

If a future hero photo again has an aspect ratio much narrower than the frame (portrait-ish, or with the subject off to one side), an `object-position`/`transform: scale` hack may be needed — but tune it for *that* photo specifically, and verify with a real rendered preview (e.g. an Unsplash `fit=crop&w=<frame-w>&h=<frame-h>` preview at the frame's actual pixel dimensions) before calling it done, per the lesson two paragraphs up — checking the source image in isolation via `Read` is not enough, the crop hack is what actually determines what ships.

## 18. Tech stack & conventions

**Hand-authored HTML/CSS/JS. No TypeScript, no JSX, no npm build step, no React/Vite/any framework.** This was a deliberate architecture change (2026-09-21, hosting/deploy constraint) from an earlier React+TS+Vite build — don't reintroduce a bundler, transpiler, or component framework.

- **Multi-page site, two levels deep**: `index.html` (Landing) is the only page at the project root — every other page lives in `pages/` (login, accessibility statement, and the full internal Workspace — dashboards, Projects, Leads, Clients, Billing, Team, Client Portal, Settings — all reachable from the role-appropriate sidebar once inside the Workspace, even though nothing redirects there after a real login yet, §5). Put every new screen in `pages/`, not at the root, unless it's specifically meant to replace the site's landing entry. New screens get their own `.html` file, not a client-side route.
  - Because of that split, asset paths (`css/…`, `js/…`, `src/…`) need `../` prefixed on every page under `pages/` but not on `index.html` — copy the exact `<link>`/`<script src>` block from an existing `pages/*.html` file rather than hand-adjusting `index.html`'s paths.
  - Cross-page **links generated by shared JS components** (header/footer/mobile-menu/accessibility-widget — they render the same markup on every page, but "index.html" and "pages/login.html" resolve differently depending on where the current page sits) use `window.IQRAA_PATHS`, a tiny global each page sets **before** loading `translations.js`: `{ root: "", pages: "pages/" }` on `index.html`, `{ root: "../", pages: "" }` on everything under `pages/`. Inside those components: `PATHS.root + "index.html…"` for links back to the landing page, `PATHS.pages + "login.html"`/`"accessibility.html"` for links to sibling pages. A hand-authored link inside a specific page's own markup (e.g. a back-link) doesn't need this — you already know exactly where that file lives, just write the literal relative path (`../index.html` from inside `pages/`).
- **Shared chrome via classic `<script>` includes into one global namespace**, not fetch-based partials (those break under `file://`) and not `<script type="module">`/bare `import` (same problem). Every JS file is an IIFE attaching to `window.IQRAA`, under `IQRAA.i18n`, `IQRAA.components`, `IQRAA.services`, `IQRAA.pages`, or `IQRAA.icons`. Header/Footer/mobile-menu/accessibility-widget are injected via template-string HTML into placeholder containers (`<div id="header-root"></div>` etc.) by `js/chrome.js`, called on `DOMContentLoaded`. Copy the exact `<script src="...">` order from an existing page (e.g. `index.html`) when adding a new one — it's a real dependency graph (`translations.js` → `i18n.js` → `icons.js` → components → `chrome.js` → the page's own script), not an arbitrary list.
- **CSS is global, BEM-like, no CSS Modules.** One block name per component/page file (kebab-case, page-scoped blocks get a page prefix so nothing collides, e.g. `.landing-hero`, `.login-form-pane`, `.header__nav-link`, `.btn--primary`). `css/tokens.css` + `css/global.css` are framework-agnostic and shared by every page via `css/shared.css`; page-specific styles live in `css/pages/<page>.css`, component styles in `css/components/<component>.css`.
- Icons: inline SVG, copied from Lucide's open-source source paths, in `js/vendor/icons.js` (`IQRAA.icons.<name>(size, opts)` returns an SVG string) — standalone reference copies also live in `src/icons/*.svg`, but the actual runtime source of truth is `icons.js` (fetching the standalone files at runtime would break under `file://`, so don't switch to that). No icon library dependency. (The one exception that used to live here, `googleG()` — a fixed 4-color, non-`currentColor` Google "G" mark — was removed 2026-09-21b along with the Login page's "Sign in with Google" button per §2/§5; don't re-add a brand-fixed-color icon like it without a concrete reason.)
- `src/` holds static assets only (icons as reference `.svg` files, `src/images/favicon.svg`) — it is **not** application source code anymore; all real source is `css/` and `js/` plus the `.html` files at the root and in `pages/`.
- Images (hero/product/login-panel photos) stay hotlinked to verified `images.unsplash.com` CDN URLs per §17, not downloaded into `src/images/` — that was an explicit choice to avoid duplicating/managing binary assets with no build pipeline.
- **External integration placeholder convention**: for any third-party endpoint/credential a screen needs (webhook URL, auth provider client ID, API key) that isn't provisioned yet, declare it as a single named constant at the top of that page's script (e.g. `N8N_LEAD_WEBHOOK_URL` in `js/pages/landing.js`), default it to an empty string, and branch on it: empty → do the safe/local fallback (demo success, or a translated "not configured yet" message near the control) instead of silently failing or half-working. This means every screen stays demoable end-to-end before the real credential exists, and wiring the real one later is a one-line change with nothing else to touch. Follow this pattern for every future integration point rather than inventing a new one per screen — this includes whatever auth provider §5 eventually settles on.
- No dead code: an earlier audit found a whole unused `sections/*` folder and an unused `Card.tsx` component sitting in the old React repo, never imported anywhere — same standard applies now; if you scaffold a `.js`/`.css` file, wire it into an `.html` page's `<script>`/`<link>` list or don't leave it behind. (The Login page's "Sign in with Google" button was itself a case of this once it went out of scope — see the note above; it and its icon/translation keys were fully removed on 2026-09-21b rather than left in place.)
- **No root `package.json`/`package-lock.json`/`.oxlintrc.json`/`node_modules` (removed 2026-09-22)** — they existed only for dev-time tooling (`oxlint` + `serve`), were confirmed unreferenced by any `.html`/`.js`/`.css` in the actual site, and were deleted at the project owner's request once that was confirmed rather than kept "just in case." Dev server and lint now run as bare `npx` invocations with no local install to maintain: `npx --yes serve .` (serves statically on `http://localhost:3000`; `python -m http.server` works identically if `npx`/`serve` isn't available) and `npx oxlint js` (§16) — both fetch their package on demand, no `npm install` step needed first. If dev-tooling ever needs to grow again (more lint rules, a task runner, anything beyond these two single-purpose commands), that's when a root `package.json` would come back — don't reintroduce it preemptively. The deployed *static site* remains exactly `index.html` + `pages/` + `css/` + `js/` + `src/`, unchanged by this removal. `backend/` (§19b) is a genuinely separate Node service with its own `package.json` — unaffected by this, it still has to be deployed and run independently of the static site.
- **Deploy target: Render Static Site, from this repo's own root `render.yaml`.** **2026-09-24 — this folder is now its own dedicated git repo** (`https://github.com/KholodKhadeja/IQRAA-AI-ERP-App`), split out of the old monorepo (`AI_Learning_Operations_ERP/`, which held the spec docs, `Data/`, `Workflows/` and this folder side by side) via `git subtree split` + a force-push, at the project owner's explicit request — she wants that GitHub repo to contain only this application, nothing else. History for this folder's own commits was preserved; the sibling folders' history was not carried over (they still exist locally, just no longer pushed anywhere from here). Practical fallout of the split, if you're troubleshooting deploy or git issues on this project:
  - This folder has its own `.git`, with `origin` pointing at the URL above — a plain `git push`/`git pull` from inside it only ever touches this app's repo, never the parent folder's contents. The parent `AI_Learning_Operations_ERP/` repo still exists locally (with its own unrelated history) but no longer tracks this folder at all (added to its `.gitignore`) and is not being pushed anywhere by this project's workflow.
  - `render.yaml` used to live one level up and pointed `rootDir` at `"WebApp - Learning_Operation_ERP"` because the site root and the git repo root were different directories. They're the same directory now, so `render.yaml` lives here instead (repo root) with the static site's `rootDir` removed entirely and the backend's `rootDir` shortened to plain `"backend"`. **If the live Render services still have `Root Directory: WebApp - Learning_Operation_ERP` set by hand in the dashboard from before the split, that now points at a path that doesn't exist in this repo and needs to be cleared/updated manually** — a dashboard-set value isn't overridden by `render.yaml` except on a fresh Blueprint sync. Verify this on Render after any push if the deployed site starts 404ing on `css/`/`js/`/`src/` requests again.
  - Don't reintroduce a `rootDir` on the static-site service pointing at a subfolder — this repo's root is the site root now, full stop, matching every other relative-path rule in this section.
- **The `backend/` service also needs to be deployed, separately, for the live site's Login/Airtable-backed pages to work at all (fixed 2026-09-22m)** — it was built and documented (§19b/§19c) as something you run locally (`npm start`, listening on `localhost:3001`), and the frontend's `*-api.js`/`auth.js` files were correspondingly hardcoded to `http://localhost:3001`. Once the static site was actually deployed to Render, that broke completely: a public HTTPS page calling `http://localhost:3001` is a request to *the visitor's own machine*, which Chrome's Private Network Access check refuses outright, and even a running local backend can't have `Access-Control-Allow-Origin` match a Render URL. Fixed by adding a second Render Web Service for `backend/` to `render.yaml` (name `iqraa-erp-backend`, `env: node`, `rootDir` pointed at the backend folder, `AIRTABLE_PAT`/`SESSION_SECRET` left `sync: false` — real secrets, set once by hand in the Render dashboard after the first Blueprint sync, never committed) and changing every `*_API_BASE` constant (`js/services/auth.js`, `users-api.js`, `projects-api.js`, `leads-api.js`, `clients-api.js`) from a flat `"http://localhost:3001"` to a `window.location.hostname` check — local/`file://` still hits the local backend (nothing about local dev changed), anything else hits the deployed `iqraa-erp-backend.onrender.com`. **If the Render service name `iqraa-erp-backend` was ever taken and Render assigned a different subdomain, all five constants need to match whatever the dashboard actually shows** — they're not derived from `render.yaml` at runtime, just hardcoded to the expected name. A second, easy-to-miss bug was in `backend/server.js`'s session cookie: `sameSite:"lax"` only works when frontend and backend are the same *site* (true for `localhost:3000`/`localhost:3001`, since SameSite ignores port) — two different `*.onrender.com` subdomains are different sites (`onrender.com` is on the public suffix list), so a `"lax"` cookie is silently dropped on every cross-site `fetch()`/XHR. Login would appear to succeed (200 response, `Set-Cookie` sent) but the very next `GET /api/auth/me` would 401 because the cookie never actually made it back. Fixed by `sameSite: IS_PRODUCTION ? "none" : "lax"` (requires `secure:true`, which `IS_PRODUCTION` already sets). Anyone deploying this app to a *different* host in the future (not Render, or a custom domain in front of both services) should re-check both of these — the URL constants and the cookie's `sameSite` value — rather than assuming they still apply unchanged.
- Don't add attribution/marketing copy changes without checking the Hebrew rendering (line length, RTL word order) still looks right — a literal translation of English source copy is often a noticeably different length.

## 19. n8n / Airtable architecture

- **Frontend = HTML/CSS/JS**, and it must never contain secrets or API credentials (§0, §18).
- **Airtable = system of record** for application data — leads, clients, projects, tasks, users/roles/profile/status (but never passwords — §5).
- **n8n = automation/integration layer.** Sensitive/write operations go through n8n webhooks rather than the frontend talking to Airtable directly.
- Useful n8n automations for this product: notifications, Airtable updates, status changes, invoice-related automation, lead processing, project status automation, and other operational workflows — but **don't add new n8n workflows just for the sake of adding automation.** Establish a clear UI and product structure first (§3, §20); automation follows structure, not the other way around.
- **Exception, deliberately chosen (2026-09-21g, extended 2026-09-21h, extended again 2026-09-24)**: user creation (`pages/team.html`'s "New Team Member" form), **Login** (`pages/login.html`), and (2026-09-24) **marking a lead "Proccessed"** (`pages/leads.html`) go through the same dedicated `backend/` Node/Express service instead of n8n. User creation/Login were explicit, named requests for a real backend, not an n8n webhook — Login in particular was explicit that "n8n is NOT part of this flow." The Leads case is narrower still and checked, not assumed: before adding `PATCH /api/leads/:id/status`, the existing "IQRAA Workflow 2- Lead Lifecycle Agent" n8n workflow was read directly, and its own system prompt explicitly states it does not set or manage the `Proccessed` status (it only drives `New Lead → Processing → Meeting Booking`) — no workflow anywhere handles this transition. Building a brand-new n8n workflow for one single-field status flip would itself violate this section's "don't add new n8n workflows just for the sake of adding automation" rule, so the existing backend-writes-directly precedent was reused instead of inventing a fourth pattern. This is still a *narrow, named* exception, not a reversal of the n8n-first default above — don't route other write operations through `backend/` without the same kind of explicit instruction or an equivalent check of what automation already exists; everything else (lead creation/full-record editing, project mutations, etc.) still follows the n8n-or-local-mock pattern already established. See §19f for the endpoint itself.

### 19b. Users backend (`backend/`)

Built 2026-09-21g, alongside `pages/team.html`'s expanded "New Team Member" form (Full Name, Email, Role, Status, Phone, Password — `User ID`/`Created At`/`Last Login`/`Password Hash` are Airtable-managed and deliberately don't appear as form fields). **The Airtable write is live-verified, not just implemented** — a real test record (`recq6umLXuzfwx5aJ`, "IQRAA Test User") was created through the actual form-to-backend-to-Airtable path and read back independently to confirm every field, including that the password hash (not the plaintext) landed in `Password Hash`.

```
pages/team.html (js/services/users-api.js)
  -> POST http://localhost:3001/api/users
  -> backend/server.js: validates, bcrypt-hashes the password, calls the Airtable REST API with a server-side PAT
  -> Airtable Users table (appFUvcg5tY2Dup8U / tblOql5BcXCNhPFIS)
```

- `backend/` is a **separate Node project** (its own `package.json` — there is no root `package.json` anymore to merge into or keep separate from, see §18) — `cd backend && npm install && cp .env.example .env` (fill in `AIRTABLE_PAT`) `&& npm start`. Full details, the exact (schema-verified) Airtable field mapping, and security notes are in `backend/README.md` — read that before touching `backend/server.js`.
- **A real `AIRTABLE_PAT` now exists in `backend/.env`** (gitignored, provided directly by the project owner 2026-09-21g) — this is no longer a blocker. Without it, `backend/server.js` still starts (so the frontend↔backend leg is testable on its own) and `POST /api/users` returns a clear `503` naming the missing var rather than silently succeeding.
- **Schema surprises found by testing against the real base, not guessed**: the `Role` single-select options have inconsistent leading/trailing spaces (`" Producer"`, `" Designer "`, `" QA"`, `" Instructional Designer"` all have a leading space; only `"Developer"` doesn't) — `ROLE_KEY_TO_AIRTABLE_LABEL` in `server.js` matches this exactly, don't "clean up" the spacing. `Status`'s real options are `"Active"`/`"Inactive"`, not `"Paused"` as first assumed. A `Must Change Password` field exists in Airtable (`Yes`/`No`) even though it's not a form field — every create explicitly writes `"No"` to encode the already-made "not forced on first login" decision rather than leaving it ambiguous. `User ID` is a plain empty text field, not an autonumber — Airtable doesn't populate it and neither do the pre-existing records, so `server.js` leaves it unset too rather than inventing a numbering scheme; that's an open product decision, not a bug.
- `js/services/users-api.js` follows the exact same external-integration-placeholder convention as `N8N_LEAD_WEBHOOK_URL` (§18): one named constant (`USERS_API_BASE`, defaulted to `http://localhost:3001`), swap it for the real deployed backend URL later with no other frontend changes needed.
- This is one of the pages in the app where a `fetch()` call to a different origin is load-bearing — `pages/team.html` (and now every Workspace page, via §19c's Login flow) is not guaranteed to work opened via `file://` the way every other screen is (§8's verification checklist), since a `file://` page calling `http://localhost:3001` is a real, documented exception, not an oversight.

### 19c. Login / real session auth (`backend/` — extended 2026-09-21h)

Built and **live end-to-end tested against the real backend and real Airtable**, not just implemented — see the chat report for the full 14-point test log (correct login for a teamMember and an Admin test user, wrong password rejected, an Inactive-status test user rejected, session persists across a real page reload, role-mismatch redirect, logout invalidates the session, post-logout access to a protected page redirects to Login — each verified with real HTTP requests and/or a real headless-browser page load, not just code review). `pages/login.html`'s markup/CSS were **not** touched, per that task's explicit constraint — only `js/pages/login.js`'s behavior.

```
pages/login.html (js/services/auth.js)
  -> POST http://localhost:3001/api/auth/login {email,password}, credentials:"include"
  -> backend/server.js: looks up Email in Airtable, checks Status==="Active",
     bcrypt.compare()s the password against Password Hash, maps Role -> app role,
     creates an express-session + httpOnly "iqraa.sid" cookie, PATCHes Last Login
     (success only) -> Airtable Users table (appFUvcg5tY2Dup8U / tblOql5BcXCNhPFIS)
  <- {user:{id,email,fullName,role}} (no hash, no PAT) -> js/pages/login.js redirects
     by role to dashboard-admin/pm/team/client.html

every Workspace page (js/workspace-chrome.js)
  -> GET /api/auth/me, credentials:"include" -> 200 {user} or 401
  -> 401, or session.user.role doesn't match that page's required window.IQRAA_ROLE:
     redirect (to Login, or to the user's own dashboard) before the page's
     protected content is ever shown (".workspace-shell" stays visibility:hidden
     until this check passes, avoiding a flash of protected content)
```

- **Every login failure reason — unknown email, inactive Status, wrong password, an Airtable Role value that doesn't map to one of this app's 4 roles — returns the identical generic `401`.** This is deliberate, non-negotiable enumeration-proofing (a caller must never be able to tell *why* a login failed), verified live: a wrong-password attempt and an Inactive test user both produced byte-identical error bodies.
- `ns.workspaceAuthReady` (`js/workspace-chrome.js`) is a Promise, assigned at top-level script scope before `DOMContentLoaded` fires, that resolves with the verified `{user}` session once a page's access check has passed (and never resolves if the page is redirecting away). `js/pages/projects.js`, `project-workspace.js`, `settings.js` and (2026-09-22, see §19d) `dashboard-team.js` consume it via `.then()` instead of a bare `DOMContentLoaded` listener, because each needs the real resolved role/id for correctness; every other page script doesn't need it and is untouched.
- **`Last Login` is a plain `date` field (no time component)** — confirmed via the Metadata API after Airtable rejected a full ISO datetime write with `INVALID_VALUE_FOR_COLUMN` during live testing. Fixed to send a bare `YYYY-MM-DD` string; re-verified live afterward.
- `POST /api/users` (§19b) now sits behind `requireAuth` + `requireRole("admin")` — an unauthenticated or non-admin caller gets `401`/`403` respectively (both verified live), closing the "no auth of its own" gap §19b originally flagged. `js/services/users-api.js` sends `credentials:"include"` accordingly.
- CORS is locked to one specific origin (`FRONTEND_ORIGIN` env var, default `http://localhost:3000`) with `credentials:true` — required for the session cookie to travel on cross-origin requests; a wildcard origin can't be combined with credentialed CORS.
- Google OAuth is untouched by this work — it remains the separate, still-unconfigured placeholder button on the Login page described in §5/§18, unrelated to this email+password-against-Airtable flow.
- Full endpoint contract, env vars, and security notes: `backend/README.md`.

### 19d. Team pages (`pages/team.html` / `pages/dashboard-team.html`, 2026-09-22)

Both connected to the real Users table — no separate Team/Employee/Staff table exists or was created; Users **is** the team, per §4/§19b.

```
pages/team.html (js/services/users-api.js)
  -> GET /api/users/team, credentials:"include" -> backend/server.js
     (requireAuth + requireRole("admin")) -> Airtable Users table
     (same base/table as Auth/Users, §19b/§19c)
  <- { teamMembers: [{id, fullName, email, role, status, phone}] }
     (never Password/Must Change Password/User ID) -> renders the
     existing table, a fresh fetch on every page load (same pattern as
     projects.js/leads.js — nothing cached client-side across loads)

pages/dashboard-team.html (js/workspace-chrome.js's ns.workspaceAuthReady)
  -> reuses the SAME GET /api/auth/me session already used for this
     page's access gate (no second/duplicate endpoint) -> the real
     session.user.id replaces the old hardcoded data.currentTeamMemberId
     mock constant when scoping "my tasks"/"my projects"
```

- **`GET /api/users/team` is Admin-only** (`requireRole("admin")`), matching Team Management's existing role restriction — a Team Member calling it gets a real `403`, not just a hidden nav item (verified live). It excludes every record whose `Role` isn't one of the 5 team-member-specialty labels in `ROLE_KEY_TO_AIRTABLE_LABEL` (§19b) — Admin/Project Manager/Client records, and blank placeholder rows, are filtered out entirely server-side, not just relabeled client-side. This is also why Clients never appear on this page: they're a different `Role` value, dropped before the response is built.
- Field mapping confirmed against the real schema (not guessed): `Full Name`→`fullName`, `Email`→`email`, `Role`→a `teamRole.*` i18n key (via a reverse of the existing `ROLE_KEY_TO_AIRTABLE_LABEL` map), `Status`→`status` (`"active"`/`"inactive"`, lowercased), `Phone`→`phone`.
- **Known, deliberate scope limit**: `team.html`'s "Active Projects"/"Active Tasks" columns and `dashboard-team.html`'s whole KPI/focus/my-projects/activity sections still read `js/data/mock-data.js`'s mock Projects/Tasks, which are keyed by fake `"tm-N"` ids that don't match any real Airtable record id. Since real Tasks/Projects aren't wired to real Users yet (a separate, larger task — Tasks has no `/api/tasks` endpoint at all), these sections now correctly show empty/zero for a real logged-in team member instead of showing another mock identity's data. That's the intended, honest result of replacing the hardcoded identity with the real session — not a bug to "fix" by reintroducing a hardcoded id. Re-visit once a future task links real Tasks/Projects to real Users (same caveat `projects.js` already documents for its own PM/team scoping).
- The pause/reactivate status toggle on `team.html`'s table remains local-only (in-memory, not persisted to Airtable) — there's still no `PATCH /api/users/:id` endpoint, and adding one was out of this task's scope. It now flips between the real `"active"`/`"inactive"` vocabulary instead of the old, non-existent "Paused" Airtable option.
- Clicking a row's name now opens a small details modal (Role/Status/Email/Phone via the shared `ph.fieldRow()`), the same "primary column becomes a button" pattern `leads.js` established — added so Email/Phone (part of the real Users data now available) are visible somewhere without changing the table's existing column layout.

### 19e. Billing — Invoices & Payments (`pages/billing.html`, Admin financial management audit, 2026-09-22; invoice creation wired + live-verified 2026-09-23)

Upgraded the existing single "one row per Payment" Billing screen into two distinct panels on the same page (same nav entry, no new route) — the audit that preceded this work found real Payment records were already connected (2026-09-22d) but Invoices were only ever read for a borrowed status label, never as their own entity, and "received/remaining" was computed per Payment row rather than per Invoice. Both gaps are closed here.

```
pages/billing.html (js/services/billing-api.js — unchanged file, same GET)
  -> GET /api/billing, credentials:"include" (Admin-only, requireBillingConfigured)
  -> backend/server.js: reads Payments + Invoices + Projects + Clients from
     Airtable, joins them, and computes a derived per-invoice Payment
     Status server-side (never trusting Invoices' own free-text Status
     field for this) -> one JSON body: { kpis:{invoices,payments},
     invoices:[...], payments:[...] }
```

- **Invoice Status vs Payment Status, kept genuinely separate** (the audited task's core requirement): an Invoice's own `status` is Airtable's free-text `Status` field (singleLineText, not a select), rendered as-is with a best-effort color hint only — never looked up through i18n, same treatment as Leads' free-text status. Its `paymentStatus` (`"unpaid" | "partial" | "paid" | "overdue"`) is computed in `backend/server.js`'s `deriveInvoicePaymentStatus()` from the invoice's `Total` against the SUM of its linked Payments' `Amount` (only `Status==="Paid"` Payments count toward "paid") — never from the Invoice's own Status text. `remaining = max(0, total - paidAmount)`. "Overdue" overrides "unpaid"/"partial" (never "paid") when at least one linked Payment's Due Date has passed while money is still owed — Invoices has no Due Date field of its own, so a linked Payment's Due Date is the only date available to test against. Per §12, these four values render as English words on the Hebrew page (`paymentStatus.*`), per the project owner's explicit 2026-09-22 answer extending §12's exception to a fifth category.
- A Payment's own `status` (Pending/Paid/Overdue, Airtable select) is shown independently on the Payments panel and is never conflated with any invoice's derived Payment Status — a Payment not linked to any Invoice still renders normally, just with an empty Invoice column.
- **Two Admin-facing panels, one page**: Invoices (search by number/client, filter by its own free-text status, filter by derived Payment Status, sort by Created date or Total, "Create Invoice" action, click a row to open a detail modal with invoice info + paid/remaining/Payment Status + its linked Payment records) and Payments (search by payment id/client/project, filter by status/client/project, filter by Due Date range, sort by Due Date or Amount, "Record Payment" action). Both reuse existing shared primitives only — `list-page.css`'s toolbar/search/filters, `data-display.css`'s `.data-table`/`.kpi-card`/`.field-row`/`.badge`, and the one shared `modal.js` — no new page-specific CSS file and no new modal implementation.
- KPIs are two small grids instead of one flat row: **Invoices** — total invoices, total invoiced amount, open/unpaid invoices (`paymentStatus !== "paid"`); **Payments** — total paid (sum of real `Status==="Paid"` Payment records, never derived from any status field), total outstanding (sum of every invoice's own `remaining`, per the task's explicit "Invoice Total − Payments = Remaining" formula, not a shortcut), partially-paid-invoices count, overdue-payments count (a Payment-level metric — `Status==="Overdue"` or a past Due Date on a not-yet-paid Payment — deliberately separate from the invoice-level Payment Status above, since the task asked for both an invoice-side and a payment-side view of "overdue"). The previous flat `totalValue/received/pending/overdueAmount/awaitingPaymentProjects` KPI shape is gone — nothing outside `js/pages/billing.js` (rewritten in the same task) ever read it.
- **Write actions, current state (2026-09-23)**: `js/services/finance-webhooks.js` holds two named constants, `INVOICE_N8N_WEBHOOK_URL` and `PAYMENT_N8N_WEBHOOK_URL`. Invoice creation is now real and wired: "Create Invoice" posts `{invoiceNumber, clientId, amount}` (the `clientId` is the Client's own `Client ID` text, e.g. `"CLI-001"`, sourced from `GET /api/clients`' `clientCode` — never an Airtable record id) directly from the browser to the real, already-built **"IQRAA - Invoice Validation & Preparation (WF1)"** n8n workflow's production webhook (`https://kholod-khadeja.app.n8n.cloud/webhook/create-invoice-via-app`) — this is the "existing validation workflow," per this project's explicit "don't build a new workflow" rule; nothing new was created. `PAYMENT_N8N_WEBHOOK_URL` still has no equivalent workflow and stays empty (translated "not configured yet" message, no fake success), unaffected by this task.
  - **What WF1 actually does, confirmed by reading its live node graph (not guessed)**: webhook (`Invoice created via the app`) → looks up the Client by the posted `clientId` text → creates the Invoice record (`Status:"New"`) → a Code node computes `VatAmount` (18%) and `Total` and validates (`InvoiceNumber`/`ClientID` present, `Amount > 0`) → on valid, updates the same record to `Status:"Validated"`; on invalid, `Status:"Invalid"`. `Total` is an Airtable **formula** field (`Amount + VatAmount`), so it is never written directly, only `VatAmount`. Frontend never computes VAT or Total — matches this project's explicit "the validation workflow owns the calculations" requirement.
  - A **second, separate, pre-existing workflow** ("IQRAA - Invoice File Creation") picks up `Status:"Validated"` invoices independently of WF1 (WF1's `Add To File Queue` node has no further outbound connection — it only flips the status), generates the PDF, uploads it to Google Drive, and writes the resulting share link back to the same Invoice record's `PdfUrl` field. Verified live end-to-end against real Airtable data (not assumed from the workflow design alone): multiple real invoices created through the app today carry real `drive.google.com/file/d/...` links in `PdfUrl`. `pages/billing.html` renders that link as a "צפייה במסמך" action wherever `PdfUrl` is non-empty, and as "אין מסמך מצורף" otherwise.
  - The webhook itself responds the instant n8n starts the run ("Workflow got started."), before validation finishes — `js/pages/billing.js`'s `pollForInvoiceNumber()` re-fetches `GET /api/billing` (up to 8 times, 1.8s apart) until the submitted invoice number actually appears, and only then closes the modal and refreshes both tables/KPI grids; it never shows success before the workflow has actually run.
  - **Bug found and fixed live, 2026-09-23**: WF1's `Add To File Queue` node was only writing `Status` back to Airtable on success — the Code node computed `VatAmount` correctly but it was never persisted, so every invoice created through the app had `VatAmount` stuck at `0` and `Total` (`= Amount + VatAmount`) silently equal to `Amount`, with no VAT actually charged. Fixed by adding a `VatAmount` column mapping to that same existing node (`={{ $('Validate').item.json.vatAmount }}`) via the n8n API and publishing the new version — no new node, no new workflow, no field renamed. Re-verified live by triggering the real webhook end-to-end afterward: a 1000 ILS test invoice came back with `VatAmount: 180`, `Total: 1180`, `Status: "Validated"`, and a real `PdfUrl`.
- Airtable fields exposed by this screen (previously fetched but unused, or not fetched at all): Invoices' `ClientID` (resolved to a client name via the existing Clients join), `Amount`, `VatAmount`, `Total`, `Status`, `PdfUrl`, and `Created` (read defensively as `fields.Created || record.createdTime`, since this task couldn't re-confirm live via the Airtable schema API whether "Created" is the table's own date field or just the record's automatic `createdTime` — whichever exists is used, nothing is guessed beyond that). Payments' `Notes` field. None of the exact Airtable field names were changed.

### 19f. Leads — post-meeting status flow (`pages/leads.html`, 2026-09-24, narrowed twice on 2026-09-25)

`pages/leads.html` shows leads past the `Meeting Booking` stage and lets an Admin advance a lead's `Status`, with a per-status guidance panel explaining what that status means and what happens next — Create/full-record-Edit are still inert placeholders (§18's external-integration-placeholder convention), but status-advancement is a real write.

**Final design, 2026-09-25 "Update Lead → First Payment flow"** (supersedes both the original 2026-09-24 "mark Proccessed" design and the same-day-earlier "Admin manually sets Waiting for first payment AND First payment paid" design below): the real, as-built Airtable pipeline is `New Lead → Processing → Meeting Booking → Waiting for first payment → First payment paid → Proccessed`, but the app now only ever makes **one** manual status change. After the meeting (outside IQRAA, §1/§6 — no in-app meeting UI exists or is planned), if the client wants to proceed, the Admin moves the lead to **`Waiting for first payment`** — the app's one write. The Admin then creates an Invoice for it through the existing Billing flow (§19e's "Create Invoice" action) and, once the client pays, completes payment on that Invoice through Billing's existing "ביצוע תשלום" action. **Everything after that is already automated outside the app, found during this task's investigation, not built by it**: Invoices carries a real `Lead ID` linked-record field (added directly in Airtable), and the already-live `payment-via-app-update` n8n workflow (§19e) was rebuilt around it — on a successful payment it sets the Invoice's Status to `PAID` and, via the `Lead ID` link, sets the linked Lead's Status to `"First payment paid"` itself. A separate, already-existing **scheduled** n8n workflow (not called from anywhere in the app — no webhook, no button, nothing to wire) then picks up `"First payment paid"` leads, creates the Customer + Project, and sets the lead to `Proccessed`. **The app never creates a Customer or Project, never sets `"First payment paid"`, and never sets `"Proccessed"`** — doing any of those would let an Admin skip past actual payment or bypass the scheduled workflow's Customer/Project creation.

The Meetings table (§6) is untouched by any of this — meetings still aren't managed inside IQRAA, and this flow never reads or writes it.

```
pages/leads.html (js/services/leads-api.js)
  -> GET /api/leads, credentials:"include"
  -> backend/server.js: Status in ("Meeting Booking", "Waiting for first
     payment", "First payment paid", "Proccessed") — LEADS_LIST_STATUSES.
     Each lead also carries invoice:{invoiceNumber,clientName,total,pdfUrl}
     resolved server-side from its linked Invoice, via resolveLeadInvoices().
  -> Airtable Leads table

  -> PATCH /api/leads/:id/status  {status:"Waiting for first payment"}
     credentials:"include"
  -> backend/server.js (requireAuth + requireRole("admin") + requireLeadsConfigured)
     — LEADS_WRITABLE_STATUSES now holds exactly this one value; anything
     else, including "First payment paid" and "Proccessed", is a 400
  -> Airtable Leads table (same base/table as GET /api/leads)
```

- **Endpoint is deliberately narrow**: `PATCH /api/leads/:id/status` accepts only `"Waiting for first payment"` — not a general "set any lead to any status" route.
- **Why a direct backend write and not an n8n webhook**: covered in §19's exception bullet above — the existing Lead Lifecycle Agent workflow was read directly and confirmed to explicitly exclude `Meeting Booking → Waiting for first payment`, and building a new workflow for this would violate this section's own "don't add new n8n workflows just for the sake of adding automation" rule. Full contract in `backend/README.md`'s "Leads endpoints" section.
- **Frontend**: `js/services/leads-api.js`'s `updateLeadStatus(leadId, status)`. `js/pages/leads.js`'s `GUIDANCE_BY_STATUS` drives both the row-level action cell and a fuller explanation panel inside the lead-details modal, keyed by the lead's *current* status: `Meeting Booking` gets the one real status-advance button; `Waiting for first payment` gets a plain navigation link to `billing.html` (no fetch — creating/paying the invoice there is what actually moves the lead forward) plus guidance text pointing the Admin there; `First payment paid` gets an informational "ממתין לעיבוד אוטומטי" note (no control, no false progress claim — the scheduled workflow hasn't necessarily run yet); `Proccessed` gets a "התהליך הושלם" note plus, when `lead.invoice` resolved, the linked invoice number/client/total/PDF link. Clicking the one real button disables it, shows a spinner, and on success updates the lead's local `status` and re-renders (the row only disappears from this screen once the lead moves past `Proccessed`, which never happens in practice since that's the terminal status and is included in `LEADS_LIST_STATUSES`); on failure the button re-enables and an inline error shows exactly where the click happened (a shared status line in the panel for the row button, a status line inside the modal for the modal button).
- **Out-of-scope finding from this task's investigation, not acted on**: `Clients.Projects` (and `Projects.Clients`) appear to have drifted into an ambiguous schema state — a plain-text field with this name alongside a separate linked-record field (`Projects 2`) — during the same kind of Airtable cleanup that already renamed `Projects.Payments 2` → `Payments` (see that field's own description in the schema). This risks a live crash in `GET /api/clients`'s `mapClientSummary()` (`fields.Projects.map(...)` on a string). `resolveLeadInvoices()` above deliberately avoids this by resolving only the linked Invoice's Client *name*, not that client's Projects. Flagged to the project owner; not fixed here, since it's unrelated to this task's scope and touches `Clients`/`Projects` structure the task's own instructions said not to touch without being asked.

### 19g. Project Workspace — assigning a Project Manager (`pages/project-workspace.html`, 2026-09-24)

Reported by the project owner from the real, deployed screen: an Admin viewing a specific project (the screenshot used for this task was the "אקדמיית אל-נור" / "קורס מקוון: יסודות תכנות לנוער" project) had no way to assign that project's Project Manager from its own workspace page, and the header's fact panel rendered badly (fields stacked into one long centered column instead of the intended row of compact facts).

**Root cause of the layout bug, found by reading the cascade rather than guessing**: `.project-workspace__header` (`css/pages/project-workspace.css`) carried the same specificity as `.panel` (both single-class selectors) and only declared `display:flex; flex-wrap:wrap; align-items:center` — it never declared `flex-direction`, so `.panel`'s own `flex-direction:column` kept applying (CSS cascades per-property, not per-rule). The visible result was every `.field-row` stacking into one column, with `align-items:center` then centering each one horizontally — exactly what the screenshot showed. Fixed by switching the header panel to `display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr))` instead of patching the flex direction, so every fact gets a predictable equal-width column rather than flex-basis-from-content sizing.

**PM assignment itself was two separate gaps, both closed here**:
- **Read side**: `GET /api/projects` (§19 above) already resolved a real `pmName` via the existing Users-table join (`backend/server.js`, added for the Admin Dashboard/Projects List tasks) — `js/pages/project-workspace.js` simply never read it, hardcoding `ph.fieldRow("projectFields.pm", ns.i18n.t("projectFields.unassigned"))` regardless of the actual value. Now reads `project.pmName`.
- **Write side**: didn't exist at all before this task — `js/pages/dashboard-admin.js`'s "Ready to Start" Assign-PM button is still real UI wired to nothing (its own comment documents this — "not wired to an Airtable write... confirming opens the same 'not connected yet' note"), and there was no other assignment path anywhere in the app.

```
pages/project-workspace.html (js/services/projects-api.js)
  -> GET /api/users/pms, credentials:"include" (Admin-only)
  -> backend/server.js -> Airtable Users table, filtered to
     Role="Project Manager" AND Status="Active" (same
     mapAirtableRoleToAppRole join every other PM lookup uses)
  <- { projectManagers: [{id, fullName}] } -> populates a <select>
     in a modal (js/components/modal.js)

  -> PATCH /api/projects/:id/assign-pm  {pmId}, credentials:"include"
  -> backend/server.js (requireAuth + requireRole("admin") +
     requireProjectsConfigured): re-validates pmId against a real,
     currently-Active PM user record (never trusts the request body
     alone) -> Airtable Projects table, sets "Project Manager": [pmId]
  <- { project: {...pmIds, pmName} } -> project-workspace.js updates
     the in-memory project object and re-renders the header in place
```

- Admin-only, matching §10/§4 (PM assignment is an Admin/CEO decision) — the button (`ns.icons.userPlus`, a small inline `.field-row__edit-btn` next to the PM value, `css/components/data-display.css`) is never rendered for pm/teamMember/client sessions; the role comes from the real session (`ns.workspaceAuthReady`'s resolved `session.user.role`), not a client-side flag.
- Works for both first assignment and reassignment — the same control and endpoint, no separate "unassigned" vs. "assigned" code path. The select pre-selects the project's current PM (from `pmIds[0]`) when reassigning.
- **Live-verified against the real backend and real Airtable, not just implemented**: `GET /api/users/pms` (correct active-PM list back), `PATCH .../assign-pm` on a real unassigned project (persisted, confirmed via a follow-up `GET /api/projects`, then reverted so no test data was left mutated), a bogus `pmId` and a Client's record id both rejected with `400`, no session and a non-admin (PM) session both rejected (`401`/`403`) on both endpoints.
- Deliberately does **not** touch `Status`/`Current Stage` — unlike the mock-data `assignPm()` this doc used to describe (§10, superseded), this project can already be mid-pipeline with a real status/stage of its own; assigning a PM here only ever sets the one field asked for.

## 20. Working style for this project (from the owner's own checklist)

> "משימה אחת בכל פעם → בדיקה → אישור → משימה הבאה."

One task at a time, verify it (§16), then move on. Don't pre-build later phases (§3) speculatively.
