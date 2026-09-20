# AI Learning Operations ERP — Web App: Screen-Building Guide

This file is the standing reference for building every screen in this project. Read it before starting new screens, and update it when a new pattern is established or an old one changes. It captures what was decided while building the Landing page and Login page, plus the project scope from the spec documents in the parent folder.

## 0. What this project actually is (read this first)

The project's own planning documents (`../AI_Learning_Operations_ERP_אפיון.docx`, `../פרויקט-גמר-53500.docx`) describe a course template that assumes the web app is built in **Base44 or Lovable** (no-code app builders). **That does not apply here.** The אפיון doc explicitly overrides it in section 15/24:

> "המערכת תיבנה ללא Base44/Lovable. במקום זאת, Claude Code ישמש ככלי לבניית ממשק/יישום המערכת... Airtable ישמש כמקור האמת ו-n8n כשכבת האוטומציה והאינטגרציה."

So: **this React/TypeScript app, built via Claude Code, *is* the "Lovable/Base44 app" the other docs refer to.** Ignore any Base44/Lovable-specific instructions in those docs (prompts, "no-code" framing, their screen lists) — the actual required screens for *this* project are in the אפיון doc (§15–16) and the checklist doc, not the generic Base44/Lovable template. Airtable is the system of record and n8n is the automation layer; this app is the interface layer only and should never hold API keys/credentials — sensitive/write operations go through n8n webhooks.

## 1. Project roadmap (source: `../AI_Learning_Operations_ERP_Development_Checklist(1).docx`)

Current phase: **Phase 1 — Web App Foundation.** Landing + Login are built; responsiveness and accessibility passes have been done.

Build order (don't jump ahead of this without being asked):
1. **Phase 1 — Foundation**: Landing/Welcome, Responsive, Accessibility, Login, Google OAuth, role detection, role-based redirect.
2. **Phase 2 — Navigation + Layout**: Sidebar, Header (app shell, not the marketing header), User Profile, Notifications, Breadcrumbs, responsive layout, role-based navigation.
3. **Phase 3 — Admin Dashboard**: KPI cards, Leads, Active Projects, Projects by Stage, Pending Approvals, Payments, Recent Activity — start with mock data.
4. **Phase 4 — CRM/Sales**: Leads list/details/create/edit, Lead status & qualification, pipeline view.
5. **Phase 5 — Customers + Proposals + Payments**.
6. **Phase 6 — Projects** (list per role, details, tasks, files, feedback, approvals).
7. **Phase 7 — Project Pipeline** (Specification → Script → Client Script Approval → Design → Production → QA → Client Review → Changes → QA → Client Approval → Publication, shown as a timeline/stepper; Changes loops back to Production).
8. **Phase 8 — Client Portal** (client sees only their own project(s)).
9. **Phase 9+ — Airtable, n8n, AI Agents, MCP, Google Calendar, QA, End-to-end demo** — backend/integration work, not UI-only.

**Explicit "don't do yet" list from the project owner:**
- Don't build new AI Agents.
- Don't add new n8n workflows before the basic UI is clear.
- Don't wire every screen to Airtable immediately.
- Don't touch Google Calendar yet.
- Don't add complex permissions before the Role structure exists.
- Don't add more RAG content if the existing RAG is ready.
- Don't give Claude Code one giant whole-project prompt — one task at a time, check, approval, next task.

## 2. Roles (drives every dashboard/screen from Phase 2 onward)

| Role | Sees |
|---|---|
| Admin / CEO / VP | Everything: Leads, Customers, Proposals, Projects, all statuses, user/PM assignment |
| Project Manager | Only projects assigned to them; stage/task/team management; PM AI Agent |
| Team Member | Only tasks/projects assigned to them |
| Client | Only their own project(s); read-only + approval actions; Client AI Agent |

Enforce this as real UI scoping (filter what's rendered/fetched), not just hidden nav items.

## 3. Brand identity

- **Company**: IQRAA Digital Learning LTD ("IQRAA" = Arabic for "Read"). This is who owns/operates the product.
- **Product**: AI Learning Operations ERP. This is what the company built.
- **Lockup pattern** (used in Header, Footer, Login brand pane, `<title>`): company name as the primary/bold wordmark, product name as a smaller tagline beneath it. Never show only "AI Learning Operations ERP" without the company name nearby — a past revision did this and had to be corrected.
- Both names stay in Latin script / untranslated in both Hebrew and Arabic UI — they're proper nouns.
- Company name should visibly appear on the Login page (explicit requirement).

## 4. Language & RTL — how it actually works here

Hebrew and Arabic are **both RTL**. `dir="rtl"` is fixed once in `index.html` and never toggled — don't add per-language `dir` switching logic, it isn't needed and got explicitly corrected once already.

What *does* change per language:
- `document.documentElement.lang` (set by `LanguageProvider`).
- Font family: `--font-family` token is **Assistant** for Hebrew; `html[lang="ar"] body` overrides to **IBM Plex Sans Arabic** (`src/styles/global.css`). Both loaded via the Google Fonts `@import` at the top of `global.css`.
- Every visible string, via `src/i18n/translations.ts` (a typed `Translations` interface, `he` and `ar` objects) + `useLanguage()` from `src/i18n/LanguageContext.tsx`.

**Rules for every new screen:**
- No hardcoded UI strings, ever — not in JSX text, not in `aria-label`, `alt`, `title`, placeholder, etc. Add a key to `Translations` and both `he`/`ar` objects.
- Write real, natural Arabic (professional register matching the Hebrew tone), not machine-literal translation.
- Language selection persists via `localStorage` (`iqraa-language` key) — already handled by the provider, nothing to do per-screen.
- The language switcher is a **dropdown button** (shows current language, opens a small listbox below on click) — not a toggle pill. This was explicitly requested; don't revert to a segmented toggle.
- **Big display headings need per-language tuning, not just translation.** Hebrew display type (`.hero h1` etc. in `LandingPage.module.css`) uses `font-weight: 800`, tight `line-height: 0.94` and `letter-spacing: -0.07em` — this looks fine in Hebrew but collides Arabic diacritics/ligatures into the line above and reads as too-bold in Assistant. The established fix: scope overrides with `html[lang="ar"] …` / `html[lang="he"] …` selectors — Arabic gets `line-height: 1.35`, `letter-spacing: normal`; Hebrew's big headings were dialed back to `font-weight: 700`. Apply the same instinct to any new big display heading: check it in both languages, don't assume the Hebrew tuning transfers.

## 5. Design tokens (`src/styles/tokens.css`) — use these, never hardcode

```
--background: #f8f7fb        --text: #201d2b
--surface: #ffffff           --text-secondary: #666276
--primary: #6c5ce7           --border: #e7e3ef
--primary-dark: #5142b8      --danger: #b43d68
--primary-pale: #f1efff
--container-max: 1180px      --header-height: 76px
```

Full spacing/radius/shadow/font-size scale is in the file — reuse it, don't invent new magic numbers. Everything is `rem`-based on purpose: the accessibility text-size control (§7) works by scaling root `font-size`, and it silently breaks for anything sized in raw `px`.

### Color contrast — lessons already paid for
- **Never use `var(--primary)` as text color on `var(--primary-pale)` background.** Measured contrast is 4.29–4.39:1, which fails WCAG AA (4.5:1). Use `var(--primary-dark)` for text-on-pale-bg instead (verified ~6.4:1+). This exact bug shipped once (workflow section) and was only caught by running pa11y, not by eye.
- Never introduce ad-hoc gray hex values (`#667085` etc.) for secondary text — always `var(--text-secondary)`, which is contrast-verified. If a color isn't a token, that's a signal to double-check it.
- Photo tiles with text over them (see `.productTile` in `LandingPage.module.css`) need a dark scrim of **at least 0.7 opacity black**, not 0.5–0.6 — the scrim has to work against the *brightest* photo you might put behind it, not the average one. Pair it with a `text-shadow` on the text for extra margin.
- A translucent **white** badge/pill placed on top of that dark scrim actively undermines it (it lightens the effective background back up). Badges over photos should be dark-tinted (`rgba(0,0,0,…)`) with a light border, not light-tinted.
- **Run a real contrast check, don't eyeball it.** See §8.

## 6. Typography weight

- Body/UI text: whatever the component already uses (mostly 600 for labels/buttons).
- Big marketing display headings: `font-weight: 800` in Arabic, `700` in Hebrew (Assistant reads heavier at 800 than the equivalent Arabic weight does — see §4). If a new screen introduces another huge display heading, check both languages before shipping.

## 7. Accessibility — non-negotiable per screen

This app targets Israeli accessibility-law compliance (תקנות נגישות השירות, ת"י 5568 / WCAG 2.0 AA). Concretely, per new screen:

- **Run `npx --yes pa11y http://localhost:5173/<route>` against the live dev server and get "No issues found" before calling a screen done.** This caught 15 real contrast failures and 7 broken anchor links in past rounds that manual review missed.
- Every interactive element needs an accessible name (visible text, or `aria-label` if icon-only).
- Every hover/focus state needs a `transition` — snapping color changes without one were flagged and fixed.
- Animate `transform`/`opacity` only. Never animate `top`/`left`/`width`/`height`/`margin` (`.skip-link` did this and was migrated to `transform: translateY()`).
- `prefers-reduced-motion` is already handled globally in `global.css` (collapses all animation/transition durations) — don't fight it or duplicate it per component.
- **In-page anchor links (`#services` etc.) must resolve on every page they appear on.** Header/Footer are shared across routes, so a plain `<a href="#services">` breaks (WCAG 2.4.1 NoSuchID) on any page other than the Landing page. Use `<Link to="/#services">` and rely on the global `useScrollToHash` hook (`src/hooks/useScrollToHash.ts`, wired in `App.tsx`) to scroll once the target route has rendered. This is already the pattern in `Header.tsx`, `MobileMenu.tsx`, `Footer.tsx` — follow it for any new nav link.
- New forms: live-validate with the **touched-then-live** pattern already used in `LoginPage.tsx` and the contact form in `LandingPage.tsx` (error stays hidden until first blur/submit attempt, then re-evaluates on every keystroke). Don't ship a form that relies on bare HTML `required` with no visible feedback.
- Loading states need a **visible spinner**, not just a text change — see the `Loader2` + `@keyframes spin` pattern in `LoginPage.tsx`/`LoginPage.module.css`.
- Global a11y infrastructure already exists — don't re-add it per page:
  - `SkipLink` (`src/components/accessibility/SkipLink.tsx`) — "skip to main content."
  - `AccessibilityWidget` (`src/components/accessibility/AccessibilityWidget.tsx`) — floating bottom-right button opening a panel with text-size steps, high-contrast toggle, underline-links toggle, reset, and a link to the statement page. Driven by `data-a11y-*` attributes on `<html>`, styled in `global.css`. Persists to `localStorage` (`iqraa-a11y-settings`).
  - Accessibility statement page at `/accessibility` (`src/pages/Accessibility/`), linked from the Footer and from the widget panel.
- `:focus-visible` outline is global (`global.css`) — don't override it away on new components.
- Every real `<img>` needs a translated, descriptive `alt`. (Most imagery on this site is CSS `background-image` on a tile with a visible text title over it, which doesn't need `alt` — but if you add a genuine `<img>`, it does.)

## 8. Verification checklist — run this before calling any screen finished

```bash
npx tsc -b                                    # types
npx oxlint                                    # lint
npx --yes pa11y http://localhost:5173/<route> # real WCAG2AA check, not a guess
```
All three should be clean (pa11y: "No issues found") before reporting the work as done. If the dev server isn't already running, `npm run dev` first.

## 9. Sourcing images — verify, don't guess

Never invent or guess an Unsplash photo ID and drop it in. The process that's worked:
1. Use `WebSearch`/`WebFetch` against `unsplash.com/s/photos/<query>` to find real candidate photos and their `images.unsplash.com/photo-…` CDN URLs.
2. **Reject anything on `plus.unsplash.com`** — those are Unsplash+ premium photos requiring a paid license, not free to use here.
3. Verify each candidate with `curl -s -o /dev/null -w "%{http_code}" <url>` — must be 200.
4. Download a small version and actually look at it with `Read` before using it — a description string from search results is not enough; verify the image really shows what it claims.

**Image-selection judgment calls that got corrected in review, worth remembering:**
- Match the image to the *specific concept*, not a generic proxy. "Hybrid course" needed a photo that visibly shows the online+in-person blend (people in a room watching a colleague on a video call screen), not just any office photo. "Digital learning product development" needed a visible screen/wireframe, not just people talking.
- Don't force representation (e.g. hijab-wearing subjects) into every image for cultural-fit reasons if it makes the image less accurate to its actual subject — for a lot of tiles (games, simulations, tools, screens) an object/hands-only photo with no people at all is both more accurate *and* sidesteps representation risk entirely. Use real, modest, professional representation where a person genuinely belongs in the shot; don't manufacture it where it doesn't.
- Modesty/brand fit matters for this specific company (IQRAA, Arab-Muslim-oriented branding) — screen out anything with revealing clothing, alcohol, or club/party styling before it goes anywhere near the site, the way the original "סרטוני הדרכה" tile photo had to be swapped out.

## 10. Tech stack & conventions

- React + TypeScript + Vite + React Router. Plain CSS via CSS Modules + the token system in §5 — **no UI framework**, don't introduce one.
- Icons: `lucide-react` only.
- One `.module.css` co-located per component/page, imported as `styles`.
- No dead code: an earlier audit found a whole unused `sections/*` folder and an unused `Card.tsx` component sitting in the repo, never imported anywhere. If you scaffold something, wire it up or don't leave it behind.
- Dev server: `npm run dev` → `http://localhost:5173`.
- Don't add attribution/marketing copy changes without checking both languages render sensibly (line length, RTL word order) — Arabic and Hebrew strings are rarely the same length as each other or as the original.

## 11. Working style for this project (from the owner's own checklist)

> "משימה אחת בכל פעם → בדיקה → אישור → משימה הבאה."

One task at a time, verify it (§8), then move on. Don't pre-build later phases (§1) speculatively.
