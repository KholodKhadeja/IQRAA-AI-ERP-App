# AI Learning Operations ERP — Web App (Phase 1)

Frontend for the AI Learning Operations ERP: a vertical AI-powered platform for
digital learning development companies, connecting the full lifecycle from
Lead → Qualification → Proposal → Payment → Project → Production → QA →
Client Review → Approval → Publication.

This phase covers the application **foundation** only: the public landing
page, the login page, the design system, and a role-based routing skeleton
ready for future dashboards and integrations (Airtable, n8n, AI Agents, RAG,
Gmail, Google Calendar).

## Tech stack

- React + TypeScript
- Vite
- React Router
- Plain CSS (CSS variables + CSS Modules) — no UI framework
- [lucide-react](https://lucide.dev/) icons

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check and build for production
npm run preview   # preview the production build locally
npm run lint       # run oxlint
```

## Trying the login flow

The login page accepts any well-formed email and any non-empty password
(there is no real backend yet — see [Authentication](#authentication) below).
Signing in redirects to a placeholder dashboard.

## Project structure

```text
src/
├── components/
│   ├── layout/        Header, Footer
│   ├── navigation/     Mobile menu
│   ├── ui/             Button, Card, TextField (design-system primitives)
│   └── accessibility/  SkipLink
│
├── pages/
│   ├── Landing/        Public landing page and its sections
│   ├── Login/           Login page
│   └── dashboards/      Placeholder role dashboards
│
├── services/
│   ├── auth/            Authentication service abstraction
│   ├── airtable/        Airtable integration placeholder
│   ├── n8n/              n8n workflow-trigger placeholder
│   └── ai/               AI Agents / RAG placeholder
│
├── routes/              Route definitions, role→dashboard mapping, route guard
├── types/                Shared TypeScript types
├── hooks/                Reusable hooks (useAuth)
└── styles/                Design tokens and global styles
```

## Authentication

`services/auth/authService.ts` is the only entry point the app uses for
authentication. It currently delegates to `MockAuthProvider`
(`services/auth/authProvider.ts`), which accepts any credentials and returns a
fixed Admin user — enough to build and test routing without a real identity
backend. Swapping in a real provider (Airtable-backed, n8n webhook, Google
OAuth, etc.) only requires implementing the `AuthProvider` interface; nothing
else in the app needs to change. No API keys or credentials are stored in the
frontend.

## Role-based routing

After sign-in, users are routed based on role:

| Role                  | Route                        |
| ---------------------- | ----------------------------- |
| Admin / CEO / VP        | `/dashboard/admin`            |
| Project Manager         | `/dashboard/project-manager`  |
| Client                  | `/dashboard/client`           |

Each route is wrapped in `ProtectedRoute`, which redirects to `/login` when
there is no active session or the user's role isn't allowed. The dashboards
themselves are placeholders for this phase.

## Design system

Colors, spacing, typography and radii are defined as CSS variables in
`src/styles/tokens.css` and consumed everywhere via `var(--token)` — no
hardcoded colors in components.

## Accessibility

Built to WCAG 2.2 AA principles from the first component:

- Skip-to-content link, semantic landmarks and headings
- Visible keyboard focus states everywhere
- Accessible form labels, inline validation and error messages
  (`aria-invalid`, `aria-describedby`, `role="alert"`)
- Accessible mobile menu (focus management, Escape to close, `aria-modal`)
- `prefers-reduced-motion` respected globally
- Layout uses CSS logical properties so it is RTL-ready

## Out of scope for this phase

Airtable CRUD, n8n workflows, AI Agents, RAG, Gmail/Google Calendar
integration, and the real dashboards are intentionally not implemented yet.
The `services/` folder only defines the interfaces those integrations will
plug into.
