# ADR-001-webfe-source-of-truth-and-responsibility-boundary

## ADR ID
ADR-001

## Title
Web FE source of truth and responsibility boundary

## Status
Proposed

## Context
### Fact
- The repo contains sign-in, dashboard summary, attendance monitoring/reporting, employee management, WFA booking review, profile, export, and map/location UI flows.
- The repo is a static multi-page frontend built with Webpack and browser JavaScript, not a server-rendered application.
- Dashboard and management pages are delivered as HTML files and then enhanced in the browser.

### Assumption
- Product intent is that Web FE supports operator workflows and reporting visibility, not final attendance truth calculation.
- Backend remains the authority for authentication outcomes, attendance records, booking status, and role data.

### Needs Verification
- Exact PRD wording for source-of-truth policy is not present in this repo.
- The backend contract that defines which reporting aggregates are authoritative is not versioned in this repo.

## Decision
We will treat Web FE as an admin and reporting surface, not as the final source of truth for attendance, booking, identity, or authorization state.

## Rationale
This repo renders admin pages in the browser and consumes backend APIs for domain data. That makes the frontend responsible for presentation, operator workflow support, and truthful display of returned data, but not for inventing or silently replacing domain truth. This boundary reduces the risk that dashboard summaries, exports, or local state become mistaken for authoritative records.

## Considered Options
1. **Recommended: Web FE as admin/reporting surface only**
   - UI presents and orchestrates.
   - Backend remains authoritative for domain truth.
2. **Web FE as co-authority for operational truth**
   - UI could normalize or reinterpret domain state locally.
   - Rejected because it increases trust ambiguity and drift risk.
3. **Web FE as mostly passive viewer only**
   - Would minimize frontend responsibility.
   - Rejected because this repo clearly includes workflow actions such as sign-in flow, approvals, and exports.

## Trade-offs / Consequences
- Positive: keeps reporting honest and limits false operator confidence.
- Positive: clarifies that local storage, mapped UI data, and client transforms are presentation aids.
- Negative: some UX shortcuts that mask backend ambiguity should be avoided.
- Negative: maintainers must resist promoting dashboard-derived or locally cached values into implied truth.

## Evidence / References
- User-provided context: Web FE role includes sign in, reporting, attendance monitoring, employee management, booking approval, profile, export, map detail modal, and browser-side rendering.
- `package.json:5-10` — scripts show Webpack build/serve only.
- `webpack.config.js:24-39` — multiple HTML pages are generated from `src/*.html`.
- `webpack.config.js:152-157` — output is static build artifact in `build/`.
- `src/index.html:55-56` — dashboard initializes in browser with Alpine `x-init="init()"`.
- `src/js/services/authService.js:77-93` — current user data is fetched from backend API.
- `src/js/services/userService.js:42-64` — user list is fetched from backend API.

## Open Verification Points
- Confirm the product-side definition of "final source of truth attendance" from PRD/governance sources outside this repo.
- Confirm whether any exported report is expected to be audit-grade or only operational/admin-grade.
- Confirm whether any locally derived dashboard metric is allowed to be shown without explicit backend provenance.
