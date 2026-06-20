# Web FE Code Review Guidance

This repository is a Web FE admin/dashboard application built as a multi-page HTML + Alpine.js app with Webpack/PostCSS, Tailwind CSS, Axios, and Leaflet. This file is for **code review only**. Codex should act as a **formal GitHub PR reviewer**, not as the primary builder or implementer.

## Branch promotion workflow

This repo uses a branch-promotion model:

- All new work starts from a dedicated `feature/*` branch or an explicitly named `fix/*` branch for bugfix and urgent work.
- Change work must not be done directly on `develop`.
- Change work must not be done directly on `master`.
- `develop` is the integration branch. Feature and fix branches merge into `develop` only through PR review.
- `master` is the final deployable branch. It must not receive change work directly.
- `master` is updated only by promoting a release-ready state from `develop`.

### Required merge path
- `feature/*` / `fix/*` -> PR review -> `develop`
- `develop` -> controlled promotion -> `master`

### Release gate for `develop` -> `master`
Promote to `master` only when:
- the relevant changes in `develop` have already been reviewed
- minimum verification for the release is passing
- the `develop` snapshot is considered clean and release-ready

### Not allowed as the normal workflow
- direct feature work on `develop`
- direct feature work on `master`
- direct feature branch merges to `master`
- using `master` as an integration branch

## Review guidelines

- Do **not** review this repo like a generic frontend project.
- The primary review focus is:
  - **source-of-truth integrity**
  - **UI truthfulness**
  - **contract integrity**
  - **runtime correctness**
  - **regression risk**
- Treat the following as first-class review contracts:
  - page/file-based entrypoints
  - feature-layer payload normalization
  - shared table partials
  - shared modal/popup flows
  - global `window.*` helper APIs
  - auth/page guard behavior
  - env/build/runtime assumptions
- Small copy-only, docs-only, or purely cosmetic styling changes should **not** be over-escalated.
- Review changes sharply when they touch:
  - backend payload normalization into FE state
  - search/sort/pagination behavior
  - table partial contracts
  - modal/popup/action flows
  - auth/page guard/role access/token assumptions
  - map payloads and current-location behavior
  - env/build/runtime config or proxy assumptions
  - dashboard/report/export behavior
- If a change touches a risk area, reviewers should verify:
  - the displayed UI is truthful to actual behavior
  - backend-to-UI field mapping is still correct
  - table behavior matches the UI affordance
  - modal/action payload shape remains consistent end-to-end
  - global `window.*` helpers are still canonical and not stale
  - fallback/mock/dev-only paths are not masking a correctness issue
  - the change needs tests or explicit verification
  - config/docs comments still match repo reality
- Prioritize correctness and contract risk over minor style commentary.
- Use **nit** for non-critical comments instead of blocking.
- If a PR is truly non-behavioral, do not invent deeper concerns without evidence.
- Do not let Codex default to only obvious P0/P1 review patterns when the real risk here is contract drift, UI mis-truthfulness, or runtime-sensitive regression.

## High-risk areas

- **Backend payload normalization into FE state**
  - `src/js/features/dashboard/dashboard.js`
  - `src/js/features/userManagement/userListSimple.js`
  - `src/js/features/wfaBooking/bookingList.js`
  - `src/js/features/attendance/attendanceLog.js`
- **Source-of-truth ambiguity between FE and backend**
- **Sorting/search/pagination truthfulness**
  - user table is largely client-side
  - booking and attendance are server-driven
  - dashboard mixes server data with local filtering and local sort state
- **Admin table shared contract drift**
  - `src/partials/table/table-user.html`
  - `src/partials/table/table-booking.html`
  - `src/partials/table/table-attendance.html`
  - `src/partials/table/table-dashboard-report.html`
- **Modal/popup/action payload contract**
  - `src/js/components/modal/*`
  - `src/js/index.js`
  - feature modules that call global modal helpers
- **Global helper / `window` API residue**
- **Auth guard / role-based access / token handling**
  - `src/js/utils/authGuard.js`
  - `src/js/utils/roleBasedAccess.js`
  - `src/js/services/authService.js`
  - token/header handling across service files
- **Env/build/runtime config correctness**
  - `src/js/config/env.js`
  - `.env.example`
  - `webpack.config.js`
- **Dev fallback/mock paths masking integration issues**
  - especially `src/js/services/reportService.js`
- **Dashboard/report/export/map behavior**
- **Booking/user/dashboard table behavior mismatches**

## What reviewers should verify

- Baseline verification for most PRs:
  - `npm install`
  - `npm run build`
- Sensitive-path verification when relevant:
  - `npm run start` for changes affecting page bootstrap, partial rendering, modal flows, auth guards, env-sensitive behavior, or runtime-only interaction
- Review page/file-based entrypoints explicitly when touched:
  - `src/index.html`
  - `src/management-user.html`
  - `src/management-booking.html`
  - `src/management-attendance.html`
  - `src/signin.html`
  - `src/form-user.html`
- Check that feature modules and partials still agree on:
  - state names
  - payload shape
  - action names
  - loading/error/empty-state behavior
- Check that sorting/search/pagination is not merely decorative:
  - sort icons must reflect real sort behavior
  - search inputs must search the intended source of truth
  - pagination labels and controls must match actual data behavior
- Check that map and modal flows use the correct payload and the correct modal path:
  - user/location map
  - booking map
  - delete confirmation
  - success/error alerts
- Check that auth and role restrictions still align with page access expectations.
- Check that build-time env injection, API base assumptions, and proxy behavior do not drift from runtime expectations.
- There is **no strong repo-level lint/test contract today**. Do not pretend one exists. If risky behavior changes are not covered by scripts, ask for targeted verification instead of assuming the change is safe.

## When to push for tests

- Push for tests or explicit reproducible verification when a change touches:
  - backend payload normalization
  - search/sort/pagination logic
  - modal/action flow
  - auth/page guard/token assumptions
  - env/runtime-sensitive behavior
  - dashboard report/export/map logic
  - shared table contracts used across pages
- Push harder when the same contract exists across both:
  - a feature module, and
  - a shared partial/template
- If the repo does not currently support a clean automated test for the changed behavior, ask for:
  - a targeted verification note
  - a reproducible scenario
  - or a clear follow-up test plan
- Do **not** force extra tests for truly non-behavioral changes such as pure copy, docs, spacing, or styling with no contract impact.

## What not to review shallowly

- Do not treat labels, badges, buttons, sort affordances, pagination text, or map buttons as cosmetic if they imply behavior or data truth.
- Do not approve payload remapping changes just because the UI still renders.
- Do not assume similar-looking tables share the same behavior contract.
- Do not assume global helpers are safe to rename, remove, or bypass without checking every page/partial that depends on them.
- Do not ignore fallback/mock/dev-only paths when reviewing runtime-sensitive behavior.
- Do not focus on minor style issues if the PR may have correctness, contract, or regression risk.
- Do not let “looks correct in the UI” stand in for “is truthful to backend data and action behavior.”

## Severity guidance

- **Blocker / high severity**
  - UI appears authoritative but is wrong at the contract or behavior level
  - wrong field mapping from backend to FE state or rendered UI
  - broken or misleading search/sort/pagination behavior
  - broken modal/action payload contract
  - auth guard, role-access, or token-handling drift
  - env/build/runtime drift that changes real behavior or integration assumptions
  - dev fallback/mock behavior hiding a real integration failure
  - dashboard/report/export/map changes that can produce misleading or incorrect operational data

- **Important but non-blocking**
  - missing tests or weak verification on a behaviorally sensitive change
  - stale helper/action paths or duplicated logic that increases drift risk but does not clearly break current behavior
  - misleading labels/controls/affordances that create user confusion but do not fully invalidate behavior
  - shared table contract drift that should be corrected soon even if the immediate PR impact is limited
  - runtime/config assumptions that are still working but are fragile or under-specified

- **Nit**
  - naming, copy, formatting, minor styling, or small maintainability comments with no meaningful behavior or contract impact
  - low-risk cleanup suggestions that should not block merge

## Linear follow-up guidance

- If review finds a real risk or debt item that does **not** need to block the current merge, recommend a follow-up issue in **Linear**.
- Follow-up guidance should clearly state:
  - the affected area
  - the likely failure mode
  - why it is not merge-blocking now
  - why it should not be forgotten
- Prefer Linear follow-up for debt such as:
  - stale helper/action residue
  - duplicate code pressure
  - verification blind spots
  - UI truthfulness gaps
  - table contract inconsistencies
  - runtime/config assumptions that should be made explicit
- Help distinguish **fix now** vs **follow-up later**. Do not blur them.
- If the PR is acceptable to merge but leaves an important review theme only partially resolved, say so explicitly and recommend the Linear follow-up instead of silently downgrading the concern.

## North Star Context (Cross-Repo)

- Official operating model: `Cowork -> Claude Desktop Host -> Claude Code CLI -> GitHub + Linear`.
- Cowork captures product collaboration and high-level intent.
- Claude Desktop Host holds PM/cockpit context and decides routing.
- Claude Code CLI executes repo work in isolated worktrees.
- GitHub PRs and Linear issues are the active evidence/status systems.
- Web FE adalah admin/reporting surface, bukan sumber kebenaran akhir untuk attendance, auth authority, atau reporting authority.
- Backend adalah source of truth final; Web FE adalah konsumen kontrak backend.
- Gunakan source-of-truth hierarchy: live repo/runtime > GitHub PR/diff/checks > Linear issue context > active cockpit docs > archived docs.
- Untuk kerja lintas-kontrak, baca shared context cockpit (`Deploy Infinite Track/Infinite Track/shared-context/`), terutama:
  - `API_CONTRACT.md`
  - `GLOBAL_STATUS.md`
  - `ROUTING_POLICY.md`
  - `QUALITY_GATE.md`
  - `DECISIONS.md`
  - `RISK_REGISTER.md`
- Jika repo/runtime/Linear/docs berbeda, live repo/runtime adalah sumber fakta tertinggi.
- `develop` adalah branch QA/integration dan human validation; `master` adalah branch deploy/release. Agent bekerja di branch/worktree terisolasi dari `develop`, bukan langsung di `develop` atau `master`.
- Issue hasil manual QA di `develop` harus kembali ke Linear, lalu diperbaiki melalui branch/worktree terisolasi dan PR GitHub sebelum dianggap selesai.
