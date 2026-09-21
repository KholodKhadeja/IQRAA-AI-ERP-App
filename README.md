# AI Learning Operations ERP — Web App

Frontend for the AI Learning Operations ERP: a vertical AI-powered platform for
digital learning development companies, connecting the full lifecycle from
Lead → Qualification → Proposal → Payment → Project → Production → QA →
Client Review → Approval → Publication.

The public landing page, login, and accessibility statement page (Phase 1)
are built, and so is the entire internal Workspace behind them — all 13
screen-building steps in `screens.md` §38 have shipped: Admin, PM, Team
Member and Client each have a real Overview; Projects, Leads, Clients,
Billing, Team Management, Project Workspace (tasks/pipeline/meetings &
decisions/history), the Client Portal, and a shared Settings screen are all
built (see `CLAUDE.md` §3 for exactly what's shipped and §9 for how the
shell/role system works). **This is a UI milestone, not a finished
product** — Airtable, n8n, AI Agents and RAG integration haven't started;
everything currently rendered reads from a static mock dataset
(`js/data/mock-data.js`), not Airtable. IQRAA is a central project
workspace, not a replacement for external tools like Gmail, Google
Calendar/Drive/Docs or Figma — see `CLAUDE.md` §1 for the product direction
and §2 for what's explicitly out of MVP scope (Google Sign-In, Google
Calendar, and Outlook Calendar integration among them).

## Tech stack

- Hand-authored **HTML + CSS + JS** — no TypeScript, no JSX, no build step,
  no framework (this was originally a React + TypeScript + Vite app; it was
  deliberately converted for a hosting/deploy constraint — see `CLAUDE.md` §18)
- One `.html` file per route (a multi-page site, not a client-side router)
- Plain CSS with a BEM-like naming convention + a shared CSS-variable token
  system (`css/tokens.css`) — no UI framework
- Icons: inline SVG (copied from [Lucide](https://lucide.dev/)'s open-source
  source), no icon-library dependency

## Getting started

```bash
npm install
npm run dev    # serve the site statically on http://localhost:3000
npm run lint   # run oxlint against js/
```

Every page still opens directly as a `file://` URL with no server at all —
that's the whole point of the no-build-step approach — with one expected
exception: pages that call `fetch()` against the backend (`pages/team.html`,
and now Login plus every Workspace page, since they all depend on a real
session) need the backend actually running to *function*; the page itself
still renders, but auth/data calls need `http://localhost:3001` reachable.
See `CLAUDE.md` §16 for the full verification checklist (lint + pa11y + a
`file://` check).

## Deploying to Render (Static Site)

This folder is **not** the git repository root — the repo root is one level
up (`AI_Learning_Operations_ERP/`), which also holds the spec docs, the
Airtable/n8n folders, and this `WebApp - Learning_Operation_ERP/` folder
itself. A Render Static Site needs to be told that this subfolder, not the
repo root, is what to publish — otherwise it can't find `index.html` and
every relative `css/`/`js/`/`src/` request 404s.

A `render.yaml` Blueprint at the repo root already encodes this. If the
Render service was created via **New + → Blueprint** pointing at this repo,
it picks the settings up automatically. If it was instead created as a
plain manual **Static Site**, set the same two values by hand under that
service's **Settings**:

- **Root Directory**: `WebApp - Learning_Operation_ERP`
- **Publish Directory**: `.`
- **Build Command**: (leave empty — there's no build step, see §Tech stack)

If the deployed site loads but shows console errors and 404s for `css/`,
`js/`, or `src/` assets, this Root Directory setting is the first thing to
check — a page that "partially loads" (the raw HTML renders, but every
script/stylesheet request fails) is the classic symptom of Render serving
from the wrong directory.

## Trying the login flow

Login is real: `pages/login.html` authenticates against Airtable through
`backend/server.js` (bcrypt-verified password, server-side session —
see [Authentication](#authentication) below). Start the backend first
(`cd backend && npm install && cp .env.example .env` — fill in
`AIRTABLE_PAT` — `&& npm start`, listening on `http://localhost:3001`),
then serve the frontend as usual (`npm run dev`, `http://localhost:3000`)
and sign in with a real Users-table account. On success it redirects to
that user's role dashboard; on failure it shows a generic error (the
backend deliberately never reveals *why* a login failed — unknown email,
inactive account and wrong password all look identical from the outside).
Without the backend running, or without `AIRTABLE_PAT` configured, login
fails safely with that same generic error rather than pretending to work.

## Project structure

```text
index.html                                        One real HTML file per
pages/                                             route — login, accessibility
├── login.html, accessibility.html                 statement, the four role
├── dashboard-admin.html, dashboard-pm.html,        dashboard entry points
│   dashboard-team.html, dashboard-client.html      (all four have real
├── projects.html, project-workspace.html,          content now), and every
│   my-tasks.html                                   internal Workspace screen
├── leads.html, clients.html                        reachable from a sidebar
├── billing.html, team.html                         — all 13 screens.md §38
├── client-project.html, settings.html              build steps are done.

css/
├── tokens.css        Design tokens (CSS variables)
├── global.css        Resets, a11y toolbar CSS hooks, shared utility classes
├── shared.css         Imports tokens + global + every components/*.css
├── components/         Header, footer, mobile menu, accessibility widget,
│                       language toggle, buttons, text fields, sidebar,
│                       workspace header, modal, data-display primitives
│                       (panel/badge/KPI card/table/progress bar/avatar/
│                       activity list/task board/pipeline stepper/
│                       list-row/field-row/checkbox-row)
└── pages/               Per-page styles (landing, login, accessibility,
                          dashboards, list-page.css shared by Projects/
                          Leads/Clients/My Tasks/Team)

js/
├── i18n/                translations.js (he/ar strings) + i18n.js (translatePage(),
│                        setLanguage(), localStorage persistence)
├── vendor/icons.js       Inline-SVG icon library (IQRAA.icons.<name>(size))
├── data/mock-data.js     The one shared mock dataset (projects, clients,
│                         leads, tasks, meetings, PMs, team members, activity)
├── components/           Shared chrome, mounted into placeholder <div>s
├── services/auth.js       Authentication service abstraction (mock)
├── services/project-helpers.js  Shared formatting/lookup + render helpers
│                                over data/mock-data.js
├── pages/                 Per-page interactive behavior (forms, validation)
├── chrome.js               Mounts header/footer/a11y-widget on public pages
└── workspace-chrome.js      Mounts sidebar/header/modal on Workspace pages

src/
├── icons/                Reference copies of every icon as a standalone .svg
└── images/                favicon.svg
```

Every JS file attaches to one global namespace, `window.IQRAA`
(`IQRAA.i18n`, `IQRAA.components`, `IQRAA.services`, `IQRAA.pages`,
`IQRAA.icons`), loaded via classic `<script src="...">` tags in a fixed
dependency order — copy that order from an existing page when adding a new
screen. See `CLAUDE.md` §10 for the full convention.

## Authentication

`js/services/auth.js` is the only entry point the app uses for
authentication, and it's real: `login()`/`logout()`/`getSession()` all
call `backend/server.js`'s `/api/auth/*` endpoints (`credentials:"include"`,
never talking to Airtable directly from the browser). The backend looks
the user up by Email in Airtable, checks `Status`, verifies the password
with `bcrypt.compare()` against the stored `Password Hash`, and creates a
server-side session backed by an `httpOnly` cookie — the frontend never
sees the Airtable PAT, the password hash, or the session secret. See
`CLAUDE.md` §5 and §19c, and `backend/README.md`, for the full contract.
Google Sign-In remains a separate, unconfigured placeholder button on the
Login page, unrelated to this flow and still out of scope.

## Role-based routing

Four role-dashboard entry points exist (`dashboard-admin.html`,
`dashboard-pm.html`, `dashboard-team.html`, `dashboard-client.html`), built
on the shared internal Workspace shell (sidebar + header,
`js/workspace-chrome.js` — see `CLAUDE.md` §9). All four have real
Overview content, and login now redirects to the correct one based on the
real session role returned by the backend.

Every Workspace page — the four dashboards and everything reachable from
their sidebars — is access-controlled: `workspace-chrome.js` calls
`GET /api/auth/me` before rendering anything, redirecting to Login if
there's no valid session. Single-role pages set `window.IQRAA_ROLE` (the
role *required* to view that page — `leads.html` / `clients.html` /
`billing.html` / `team.html` are Admin-only, `client-project.html` is
Client-only); a session with a different role is redirected to that
user's own dashboard rather than shown the page. Pages reachable by more
than one role — `projects.html` / `my-tasks.html` (Admin sees all
projects, PM/Team Member see only their own), `project-workspace.html`
(`?id=<project-id>` — PM/Team Member access is blocked for projects not
assigned to them), and `settings.html` (System Settings section is Admin
-only) — don't set `IQRAA_ROLE` and instead read the real role off the
verified session via the shared `ns.workspaceAuthReady` promise. See
`CLAUDE.md` §9/§19c for the full mechanism. None of this is enforced by
hiding navigation alone — the one action that needs it so far,
`POST /api/users`, is also rejected server-side for anyone who isn't an
authenticated Admin.

## Design system

Colors, spacing, typography and radii are defined as CSS variables in
`css/tokens.css` and consumed everywhere via `var(--token)` — no hardcoded
colors in new CSS.

## Accessibility

Built to WCAG 2.0 AA principles from the first component:

- Skip-to-content link, semantic landmarks and headings
- Visible keyboard focus states everywhere
- Accessible form labels, inline validation and error messages
  (`aria-invalid`, `aria-describedby`, `role="alert"`)
- Accessible mobile menu (focus management, Escape to close, `aria-modal`)
- `prefers-reduced-motion` respected globally
- A floating accessibility widget (text size, high contrast, underline links)

A full responsiveness pass and a dedicated accessibility follow-up pass
(tokenizing a few hardcoded colors that don't yet respond to high-contrast
mode) are the immediate next tasks — see `CLAUDE.md` §3.

## Out of scope for this phase

All 13 `screens.md` §38 UI build steps are done, and Users + Login are now
real (backend + Airtable, see Authentication above) — but everything else
(leads, projects, tasks, billing, etc.) still reads from a static mock
dataset in `js/data/mock-data.js`, not Airtable; n8n workflows, AI Agents
and RAG integration for those areas are not wired up either (see
`CLAUDE.md` §3 for exactly what's shipped and §19 for the
Airtable/n8n architecture that isn't wired up yet). Google Sign-In, Google
Calendar and Outlook Calendar integration are out of MVP scope entirely,
not just deferred — see `CLAUDE.md` §2. A few things are deliberate demo
simplifications rather than gaps to fix reflexively — see the "Step 13
audit findings" note in `CLAUDE.md` §3 (no destructive-confirmation flow
for removing a team member, demo-only resource links, etc.).
