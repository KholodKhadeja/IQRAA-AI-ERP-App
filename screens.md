# IQRAA Digital Learning — Internal Workspace Screen Specification

## 0. Purpose of this document

This document is the screen-level blueprint for the **internal IQRAA Workspace after login**.

It describes:
- the screens that need to exist
- which role can access each screen
- what each screen should contain
- the internal navigation structure
- the relationship between dashboards, projects, tasks, clients, billing and project history
- the Meetings & Decisions concept
- responsive behavior
- accessibility requirements
- Hebrew-only UI language requirement (English is kept, deliberately, for status/concept terms inside the post-login Workspace — see §4.3)
- the distinction between the internal Workspace UI and the existing public/Login UI

This document is a product and UI specification, not a request to build every screen at once.

Follow the project's working method:

**ONE TASK AT A TIME → TEST → APPROVE → NEXT TASK**

Do not implement the entire screen inventory in one step.

---

# 1. Product Direction

IQRAA is a central ERP/project-workspace for managing digital learning projects.

The Workspace is responsible for managing:
- leads
- clients
- projects
- project stages
- tasks
- teams
- project managers
- progress
- deadlines
- resources and external links
- client feedback
- approvals
- billing/payment status
- meetings and decisions
- project history
- notifications
- users and settings

IQRAA is **not** intended to replace every external tool.

External tools remain complementary:

- Google Calendar → scheduling
- Outlook Calendar → scheduling
- Gmail → communication
- Google Docs / Slides → scripts and documents
- Google Drive → files
- Figma → design

IQRAA may link to external resources where useful, but it should remain the central place for managing the work itself.

---

# 2. Existing Screens — DO NOT REDESIGN

The following already exist and are outside this screen-building specification:

- Public Landing / Welcome page
- Existing Login page
- Accessibility statement page

The Login screen is already designed and approved.

**Do not redesign or rebuild the Login screen as part of this work.**

The screens in this document begin **after successful login**, inside the internal IQRAA Workspace.

---

# 3. Internal Workspace vs Public UI

The internal Workspace must have a clearly different UI from the Landing/Login experience.

It should still use the IQRAA brand identity:
- IQRAA purple
- dark navy / near-black typography
- soft lavender backgrounds
- white surfaces
- rounded cards
- subtle borders
- restrained shadows
- green success states
- consistent iconography
- professional RTL layout

However, the Workspace should be:
- more functional
- more information-dense
- more structured
- optimized for daily operational work
- optimized for tables, tasks, dashboards and project information

It must NOT look like a generic SaaS dashboard template.

It should feel like:

**IQRAA Workspace — a professional operational system built specifically for digital learning projects.**

---

# 4. Global Application Shell

Every internal Workspace screen should use the same application shell.

## 4.1 Right Sidebar

Because Hebrew is RTL, the main sidebar is on the **right side**.

The sidebar contains:
- IQRAA brand
- role-aware navigation
- active navigation state
- icons
- optional notification badges
- user/profile area
- collapse behavior on desktop if appropriate
- mobile drawer behavior on small screens

The sidebar must change according to the user's role.

It must NOT merely hide inaccessible screens visually. Authorization must also exist at the data/UI level.

---

## 4.2 Top Navbar / Header

The internal top navigation should contain:
- current page title or contextual heading
- breadcrumbs where useful
- notifications
- user profile/avatar
- profile menu
- contextual actions where appropriate

There is no language selector — the app is Hebrew-only (see §4.3).

The header is the **Workspace header**, not the public marketing header.

---

## 4.3 Language

The application has exactly one UI language: **עברית (Hebrew)**.

There is no language selector and no Arabic support — this was removed deliberately (2026-09-21) in favor of a single-language app. `dir="rtl"` stays fixed.

All UI text must be translated into Hebrew.

This includes:
- headings
- buttons
- labels
- placeholders
- tooltips
- empty states
- errors
- validation
- notifications
- aria labels
- table labels
- confirmation dialogs

**Deliberate exception — concept/status terms in the post-login Workspace:** inside the Workspace (dashboards and everything after login), the *values* of project status, lead status, payment/invoice status, and team-member (employee) status stay in **English** (e.g. "On Track", "Overdue", "Paid", "Active") even though every surrounding label, heading and sentence is Hebrew. This applies only to those status/concept values, not to general UI text — everything else still gets a Hebrew translation key like any other string. See `CLAUDE.md` §4 for the exact list of translation keys this applies to.

---

## 4.4 User Profile

The profile area should provide:
- user name
- role
- profile image/avatar where available
- account/profile action
- logout

Depending on permissions, additional profile/settings options may be available.

---

# 5. Role Model

There are four primary roles.

## Admin / CEO

Full operational visibility.

Can access:
- Overview
- Leads
- Clients
- Projects
- Team
- Billing
- Settings
- project assignment
- workload visibility
- payment status
- all operational statuses

---

## Project Manager

Can access:
- Overview
- My Projects
- Tasks
- Clients relevant to assigned projects
- project teams
- project stages
- Meetings & Decisions
- project history
- client feedback
- approvals
- project completion

A PM should primarily see projects assigned to them.

---

## Team Member

Examples:
- Producer
- Designer
- Instructional Designer
- QA
- Programmer / Developer

Can access:
- My Workspace
- My Tasks
- My Projects
- relevant project information
- task resources
- comments
- status updates
- relevant Meetings & Decisions

They should not see unrelated projects or internal administrative information.

---

## Client

Can access only their own project(s).

Client view is intentionally simplified.

Client can see:
- project status
- overall progress
- current stage
- expected completion
- relevant resources
- relevant links
- feedback requests
- approval requests
- relevant project communication/history

Client must NOT see:
- internal team workload
- internal staffing decisions
- internal notes
- internal QA discussions
- internal task assignments
- other clients
- internal billing/operational information unless explicitly exposed through a dedicated client-facing payment view

---

# 6. Admin / CEO Screens

## 6.1 Admin Overview Dashboard

Purpose:

Provide the Admin/CEO with a high-level operational view of the business.

### Main sections

#### KPI cards
Examples:
- New Leads
- Projects in Progress
- Projects Ready to Start
- Pending Client Approvals
- Overdue Tasks
- Outstanding Payments

Each KPI should be clickable when a relevant detail screen exists.

#### Active Projects
A compact project overview showing:
- project name
- client
- PM
- current stage
- progress
- deadline
- task status
- warning/overdue indicator

#### Projects by Stage

Visual summary of projects across the production pipeline.

#### Projects Ready to Start

Important business area.

A project enters this area after the **first payment has been received**.

Show:
- project
- client
- payment confirmation/status
- expected start
- current assignment state
- available PMs / workload indicator
- assign PM action

#### PM Workload

Show workload derived from real project/task data where available.

Possible indicators:
- active projects
- active tasks
- overdue tasks
- upcoming deadlines
- workload level

This is an information view, not a manually typed availability field.

#### Recent Activity

Examples:
- payment received
- project moved stage
- client approved deliverable
- task completed
- new lead
- team member assigned

---

# 7. Leads

## 7.1 Leads List

Purpose:

Manage incoming leads.

Show:
- lead name
- company/organization
- contact information
- service/project type
- lead status
- assigned person
- created date
- last activity
- next action

Useful interactions:
- search
- filtering
- sorting
- status filtering
- open lead details
- create lead

---

## 7.2 Lead Details

Show:
- contact details
- organization
- source
- requested service
- lead status
- notes
- relevant communication information
- timeline/activity
- related project if converted
- next action

Actions may include:
- update status
- edit
- convert/create client/project where applicable

---

## 7.3 Lead Create/Edit

Form with:
- name
- organization
- email
- phone
- requested service
- notes
- source
- status

Use visible validation and accessible error messages.

---

# 8. Clients

## 8.1 Clients List

Show:
- client name
- organization
- active projects
- completed projects
- current contact
- status
- last activity

Features:
- search
- filters
- sort
- open client

---

## 8.2 Client Details

Show:
- client information
- contact information
- related projects
- project history
- relevant communication/resources
- current active project(s)

Internal-only information must remain restricted according to role.

---

# 9. Projects

## 9.1 Projects List

Purpose:

Central project directory.

Admin sees all projects.

PM sees assigned projects.

Team member sees relevant assigned projects.

Client sees only their own projects.

Each project card/row should show:
- project name
- client
- PM
- current stage
- progress
- deadline
- status
- payment state where appropriate
- attention/overdue indicator

Support:
- search
- filters
- stage filter
- status filter
- PM filter where permitted
- client filter where permitted
- sort

---

# 10. Project Workspace

This is the most important internal screen.

The Project Workspace is the central operational hub for a single project.

## 10.1 Project Header

Show:
- project name
- client
- project status
- current stage
- overall progress
- expected completion
- PM
- project actions

---

## 10.2 Project Overview

Show:
- project summary
- current stage
- progress
- key dates
- deadline
- assigned PM
- team
- recent activity
- important resources

---

## 10.3 Project Pipeline / Stages

Use a visual timeline/stepper.

Current planned production stages:

1. Specification
2. Script
3. Client Script Approval
4. Design
5. Production
6. QA
7. Client Review
8. Changes
9. QA
10. Client Approval
11. Publication

Important:

**Changes can loop the project back to Production.**

The pipeline should make the current stage immediately understandable.

---

# 11. Project Team

Within a project, authorized users can see the project team.

Show:
- name
- role
- responsibility
- assigned work
- status where appropriate

PM can:
- add team members
- remove/reassign team members
- assign tasks

Admin can see the broader staffing picture.

Clients do not see internal staffing details unless explicitly intended by a future client-facing design.

---

# 12. Project Tasks

Tasks belong to the project.

## Task Board / List

Show:
- task
- assignee
- role
- status
- priority
- due date
- stage
- overdue state

Possible statuses:
- Not Started
- In Progress
- Waiting
- Review
- Completed

Use a clear visual status system.

---

## Task Detail

A task detail view may be implemented as a dedicated page, drawer or modal depending on complexity.

Show:
- task name
- description
- assignee
- project
- stage
- status
- priority
- due date
- links
- files/resources
- comments
- activity/history

External resources may include:
- Google Docs
- Google Slides
- Google Drive
- Figma
- other relevant links

IQRAA should link to these resources rather than recreate them.

---

# 13. Meetings & Decisions

There is intentionally **NO traditional Meetings Dashboard or internal calendar**.

Employees are not required to manually enter every meeting.

Instead, every relevant project may contain a:

## Meetings & Decisions

Purpose:

Record meaningful project meetings and, most importantly, what was decided and what must happen next.

Each record may contain:

- Meeting type
- Date
- Participants
- Summary
- Decisions
- Follow-up tasks
- Optional meeting link
- Optional notes/resources

The most important question this section answers is:

**"What was decided in the last important meeting, and what needs to happen next?"**

It should not try to answer:

**"When is this employee's next meeting?"**

---

## Meetings & Decisions UI

Recommended presentation:

A chronological project history/timeline.

Each meeting item shows:
- date
- meeting type
- participants
- short summary
- decisions
- follow-up actions

A user with appropriate permissions can:
- add meeting record
- edit meeting record
- attach/link resources
- create or associate follow-up tasks

Upcoming meetings can optionally be recorded, but the system should not require a complete calendar.

Google Calendar / Outlook integration is outside the MVP.

---

# 14. Project Resources

A project should provide a central place for relevant resources and external links.

Examples:
- Google Docs
- Google Slides
- Google Drive
- Figma
- external review links
- client resources
- deliverables

Each resource should have:
- title
- type
- description if useful
- external link
- date/updated information where useful

The UI should clearly communicate that these are external resources.

---

# 15. Client Feedback & Approvals

## Feedback

Show:
- request
- related stage/deliverable
- date
- client response
- status
- follow-up

## Approval

Show:
- item requiring approval
- description
- version/date
- approve action
- request changes action
- approval history

Client-facing approval interactions should be simple and explicit.

Internal users should see the approval history and consequences for the project pipeline.

---

# 16. Project History / Activity

Chronological project activity.

Examples:
- stage changed
- task created
- task completed
- team member assigned
- client feedback received
- approval granted
- changes requested
- meeting recorded
- decision recorded
- payment received
- project status changed

This is different from Meetings & Decisions.

**Activity = what happened in the system.**

**Meetings & Decisions = what happened in meaningful project meetings and what was decided.**

---

# 17. Team Member Workspace

The Team Member experience should answer one primary question:

**"What do I need to do?"**

## My Workspace

Show:
- tasks assigned to me
- tasks due today
- overdue tasks
- tasks in progress
- projects I work on
- recent activity relevant to me

Avoid overwhelming the team member with administrative information.

---

## My Tasks

Provide:
- task list
- filters
- status
- priority
- due date
- project
- quick status update

---

## My Projects

Show only projects where the team member has relevant assignments.

Each project should show:
- project
- role
- stage
- assigned tasks
- deadlines
- relevant resources

---

# 18. Project Manager Workspace

## PM Overview

Show:
- active projects
- tasks requiring attention
- overdue tasks
- approaching deadlines
- pending client feedback
- pending approvals
- recent project activity

---

## My Projects

The PM's project list.

Each project shows:
- client
- stage
- progress
- team
- tasks
- deadline
- attention indicators

---

## PM Project Workspace

The PM gets the full operational project view, including:
- project stages
- project team
- task management
- Meetings & Decisions
- client feedback
- approvals
- resources
- project history

PM can manage team and task assignment.

---

# 19. Billing & Payments — Admin

## Billing Overview

Show:
- total project value
- received
- pending
- overdue
- projects awaiting payment

---

## Payments / Project Billing List

Show:
- project
- client
- payment status
- first payment status
- remaining amount/status
- invoice status
- relevant dates

Important business rule:

**After the first payment is received, the project becomes "Ready to Start" and appears in the Admin/CEO Ready to Start area.**

The system should make this relationship visible.

---

# 20. Team Management — Admin

Show:
- team member name
- role
- status
- active projects
- active tasks
- workload indicators

Admin actions:
- create user
- pause user
- reactivate user where applicable
- remove user where appropriate
- update role/profile

Do not expose authentication secrets or passwords.

---

# 21. Notifications

Notifications should be contextual.

Examples:
- task assigned
- task overdue
- client feedback received
- approval requested
- approval completed
- project stage changed
- payment received
- project ready to start
- team assignment changed

The notification center should:
- distinguish unread/read
- link to relevant context
- support empty state
- be accessible by keyboard

---

# 22. Settings

Settings should be role-aware.

Potential sections:

### Profile
- name
- email
- phone
- profile image

### Preferences
- notification preferences
- accessibility preferences where appropriate

### System Settings
Admin only.

Do not expose implementation secrets in the UI.

---

# 23. Client Portal

The Client Portal must feel simpler and more focused than the internal Workspace.

The client should immediately understand:

**Where is my project now?**

## Client Overview

Show:
- active project(s)
- project progress
- current stage
- expected completion
- pending action

Avoid:
- internal dashboards
- internal workload
- internal team operations
- technical implementation details

---

## Client Project View

Show:
- project name
- progress
- current stage
- project timeline
- expected completion
- relevant deliverables/resources
- feedback requests
- approval requests
- relevant project updates
- contact PM

---

## Client Feedback / Approval

Provide very clear actions:
- Approve
- Request Changes
- Submit Feedback

Do not use ambiguous buttons.

---

# 24. Empty States

Every list-based screen must have a designed empty state.

Examples:
- No projects
- No tasks
- No leads
- No clients
- No notifications
- No meetings recorded
- No activity
- No pending approvals

Empty states should explain:
1. What is empty
2. Why it may be empty
3. What action can be taken, if applicable

Empty states must be written in Hebrew (concept/status values may stay in English per §4.3).

---

# 25. Loading States

Every data-driven screen needs a clear loading state.

Use:
- skeletons where appropriate
- visible spinner where appropriate
- accessible loading status

Do not create blank screens while data is loading.

---

# 26. Error States

Every data-driven screen needs a meaningful error state.

Include:
- clear explanation
- retry action where appropriate
- accessible error messaging

Do not expose technical stack traces to users.

---

# 27. Responsive Design

The Workspace must work across:

- desktop
- laptop
- tablet
- mobile

## Desktop

Use the full:
- right sidebar
- top navbar
- main content area

Tables may use the available width.

---

## Tablet

The sidebar may become collapsible.

Cards and dashboards should reflow.

Do not allow important information to become horizontally inaccessible.

---

## Mobile

The sidebar becomes a navigation drawer/menu.

The top header remains compact.

Tables should transform appropriately:
- horizontal scrolling only where genuinely necessary
- card/list transformation where more usable
- priority information shown first

Large dashboard grids must become single-column or two-column layouts as appropriate.

Project pipeline must remain readable on small screens, potentially using horizontal scrolling or a vertical stepper.

Task detail should work as a full-screen modal/page on mobile.

---

# 28. Accessibility — Non-Negotiable

Every screen must follow the project's established accessibility rules.

Target:

**Israeli accessibility requirements + WCAG 2.0 AA**

Each screen must include:

- keyboard navigation
- visible focus states
- accessible names for interactive elements
- semantic headings
- logical heading hierarchy
- labels for form controls
- accessible validation
- accessible error messages
- accessible modal behavior
- accessible dropdown behavior
- accessible navigation
- sufficient color contrast
- no information conveyed by color alone
- reduced-motion support
- meaningful empty states
- meaningful loading states
- translated accessibility labels

Do not remove the existing global accessibility infrastructure.

Use the existing:
- skip link
- accessibility widget
- focus styles
- reduced-motion support
- accessibility statement

Every new screen must pass the project's established pa11y/accessibility verification before being considered complete.

---

# 29. RTL Requirements

Hebrew is RTL.

`dir="rtl"` remains fixed.

Do not implement language-specific direction switching.

Pay particular attention to:

- sidebar position
- breadcrumbs
- arrows
- progress indicators
- stepper direction
- table alignment
- icon placement
- dropdown placement
- modal actions
- pagination
- date display
- numerical data
- mixed-language URLs/resources

Do not blindly mirror every icon.

Icons that represent directional concepts should be reviewed individually.

---

# 30. Hebrew Typography

Hebrew:
- Assistant

The Workspace mixes Hebrew UI text with English concept/status values (§4.3) inline — check that this mixed-direction, mixed-script text still wraps and aligns cleanly.

Check:
- line wrapping
- heading height
- card height
- button width
- table columns
- modal layout
- navigation labels
- empty states

---

# 31. Translation Architecture

Follow the existing project architecture.

Every visible string must use translation keys.

Never hardcode UI text directly in HTML/JS.

Every new key must exist in Hebrew.

This applies to:
- visible text
- placeholders
- aria-label
- title
- alt text
- validation messages
- notification text
- empty states
- errors

**Exception:** the small, fixed set of status/concept keys covered by §4.3 (project status, lead status, payment/invoice status, team-member status) intentionally hold English text as their translation value, even though the key still lives in the same Hebrew translation table as every other string — see `CLAUDE.md` §4 for the exact key list. Don't extend this exception to any other key without the same deliberate call.

When HTML is injected dynamically, call the existing translation mechanism again.

---

# 32. Visual System for the Workspace

Use the established IQRAA brand language, but adapt it for operational software.

### Surfaces
- soft lavender/neutral application background
- white cards/panels
- subtle borders
- restrained shadows

### Components
- rounded cards
- compact status pills
- clear buttons
- clear tables
- progress bars
- avatars
- timeline/stepper
- drawers/modals where appropriate

### Information hierarchy

Use visual hierarchy rather than excessive decoration.

The Workspace should prioritize:
1. What needs attention
2. What is happening now
3. What is due
4. What changed
5. What action the user can take

---

# 33. Shared Components That Should Be Designed Once

The following should become reusable patterns:

- App Shell
- Sidebar
- Top Navbar
- Breadcrumbs
- User Menu
- Notification Center
- Page Header
- KPI Card
- Project Card
- Project Table
- Status Badge
- Progress Bar
- Avatar
- Task Row
- Task Board
- Timeline
- Project Pipeline Stepper
- Meeting/Decision Item
- Activity Item
- Empty State
- Loading State
- Error State
- Confirmation Modal
- Form Field
- Dropdown
- Search
- Filter Bar
- Pagination
- Approval Panel
- Feedback Panel

Do not create visually different versions of the same component for every screen unless there is a real product reason.

---

# 34. Screen Inventory

The expected post-login screen inventory is:

## Shared
1. Workspace Shell
2. Notifications
3. Profile
4. Settings
5. Accessibility support

## Admin / CEO
6. Admin Overview
7. Leads
8. Lead Details
9. Lead Create/Edit
10. Clients
11. Client Details
12. Projects
13. Project Details / Workspace
14. Projects Ready to Start
15. PM Workload
16. Billing Overview
17. Payments / Billing Details
18. Team Management
19. User Create/Edit
20. System Settings

## Project Manager
21. PM Overview
22. My Projects
23. Project Workspace
24. Project Team
25. Project Tasks
26. Task Details
27. Meetings & Decisions
28. Project Resources
29. Client Feedback
30. Client Approvals
31. Project History

## Team Member
32. My Workspace
33. My Tasks
34. My Projects
35. Task Details
36. Relevant Project Workspace
37. Relevant Resources
38. Relevant Meetings & Decisions

## Client
39. Client Workspace / Overview
40. My Projects
41. Client Project View
42. Project Progress
43. Feedback
44. Approvals
45. Relevant Resources
46. Project Updates / History
47. Contact PM

Not every item necessarily needs to become a completely independent HTML page.

Where appropriate, use:
- tabs
- drawers
- modals
- sections inside a project page

The goal is a clear UX, not an unnecessarily large number of URLs.

---

# 35. Important UX Principle

The application should always make the next meaningful action obvious.

For example:

Admin:
"Which projects are ready to start and who can manage them?"

PM:
"What needs my attention today?"

Team Member:
"What do I need to do?"

Client:
"What is the current status of my project and do I need to approve or respond to anything?"

These questions should guide the hierarchy of each dashboard.

---

# 36. Implementation Rules

Follow the existing project architecture documented in CLAUDE.md.

Current stack:
- hand-authored HTML
- CSS
- JavaScript
- no React
- no TypeScript
- no JSX
- no build framework

New screens belong under `pages/`.

Shared UI should use the existing shared-chrome/component architecture.

Do not introduce a new framework.

Do not create duplicate implementations of shared components.

Do not create dead files.

Keep every screen independently demoable.

---

# 37. Data / Integration Principle

During UI development, use mock/demo data where appropriate.

Do not immediately connect every screen to Airtable.

Airtable remains the system of record.

n8n remains the automation/integration layer.

The frontend must never contain secrets or API credentials.

External resources should be represented as links/references.

Google Calendar, Outlook Calendar and Google OAuth are NOT MVP screen requirements.

---

# 38. Recommended Build Order

Build the Workspace incrementally in this order:

### Step 1
Shared internal Workspace shell:
- Sidebar
- Navbar
- user menu
- notifications
- breadcrumbs
- responsive shell

### Step 2
Admin Overview

### Step 3
Projects List + Project Workspace

### Step 4
Project Tasks + Task Details

### Step 5
Meetings & Decisions + Project History

### Step 6
Leads + Clients

### Step 7
PM Workspace

### Step 8
Team Member Workspace

### Step 9
Billing + Payments

### Step 10
Team Management

### Step 11
Client Portal

### Step 12
Settings + final shared states

### Step 13
Responsive + accessibility + Hebrew full audit

Do not skip ahead unless explicitly instructed.

---

# 39. Definition of Done — Per Screen

A screen is not finished simply because it visually exists.

Before marking a screen complete:

- It works in Hebrew.
- It stays RTL.
- No visible string is hardcoded.
- Responsive behavior has been checked.
- Keyboard navigation works.
- Focus states are visible.
- Interactive elements have accessible names.
- Empty state exists where needed.
- Loading state exists where needed.
- Error state exists where needed.
- Visual hierarchy is clear.
- The screen follows the Workspace design system.
- Role restrictions are respected.
- No unauthorized information is rendered.
- Links/buttons have meaningful behavior or a clearly documented demo behavior.
- The page works with the project's build-free HTML/CSS/JS architecture.
- The screen passes the project's accessibility verification.

---

# 40. Final Principle

Do not build IQRAA as a collection of unrelated dashboards.

Build it as one connected operational workspace.

The core relationship is:

USER
→ ROLE
→ PROJECT
→ CLIENT
→ TEAM
→ TASKS
→ STAGES
→ RESOURCES
→ MEETINGS & DECISIONS
→ FEEDBACK
→ APPROVALS
→ BILLING
→ HISTORY

The user should feel that all relevant information about a project belongs together.

The project is the central unit of work.

**IQRAA manages the work. External tools help people perform the work.**
