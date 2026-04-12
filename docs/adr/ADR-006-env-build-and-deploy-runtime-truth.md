# ADR-006-env-build-and-deploy-runtime-truth

## ADR ID
ADR-006

## Title
Env, build, and deploy runtime truth

## Status
Proposed

## Context
### Fact
- The repo builds a static multi-page frontend with Webpack output under `build/`.
- Runtime API base URL is injected at build time through Webpack environment variables, with `/api` as the default fallback.
- Local development uses a Webpack dev-server proxy to forward `/api` to `http://localhost:3005`.
- Deployment guidance in the repo recommends static hosting for frontend artifacts, while still requiring correct backend API configuration.
- Runtime/deploy drift is explicitly identified as a sensitive risk in the prompt context.

### Assumption
- The production frontend should be treated as static assets plus browser runtime, with backend/API availability handled separately.
- Release confidence should depend on evidence from actual build/runtime behavior rather than assumptions from framework labels.

### Needs Verification
- The canonical production topology for Infinite Track Palu is not fully locked in this repo.
- Same-origin versus cross-origin API deployment expectations still need confirmation, especially because auth handling appears mixed.

## Decision
We will treat observable repo runtime behavior as the deployment truth for Web FE: this frontend is a static build that depends on explicitly configured backend/API runtime, and release decisions must be backed by environment, build, and runtime evidence rather than assumptions.

## Rationale
This repo does not contain an SSR application server. Its production behavior comes from generated static files plus browser-side API access. That makes environment configuration and runtime topology critical: if `API_BASE_URL`, proxy assumptions, hosting mode, or auth transport drift, the app may deploy successfully but behave incorrectly. This ADR keeps release governance tied to what the repo actually builds and how it actually runs.

## Considered Options
1. **Recommended: runtime truth comes from observable build and deployed behavior**
   - Use repo evidence and release verification, not framework assumptions.
2. **Assume deployment model from frontend stack alone**
   - Rejected because static build and backend dependency must both be validated.
3. **Treat deployment docs as sufficient truth without runtime verification**
   - Rejected because config drift is an active risk.

## Trade-offs / Consequences
- Positive: reduces infra mistakes caused by wishful assumptions.
- Positive: encourages release evidence for env, build, and runtime integration.
- Negative: adds discipline to release verification.
- Negative: may slow "quick deploy" habits when topology or env changes.

## Evidence / References
- User-provided context: env/build/deploy drift remains sensitive; runtime/repo reality wins for active facts.
- `package.json:6-8` — production output is created by `webpack --config webpack.config.js`.
- `webpack.config.js:116-149` — environment variables are injected at build time.
- `webpack.config.js:153-157` — output is emitted to `build/`.
- `webpack.config.js:167-173` — development server proxies `/api` to local backend.
- `.env.example:7-10` — expected API configuration is externalized.
- `DEPLOYMENT.md:54-76` — production deployment requires `API_BASE_URL` alignment.
- `DEPLOYMENT.md:112-127` — deployment verification is based on generated `build/` artifacts.
- `DEPLOYMENT.md:160-201` — static hosting is explicitly described as a frontend deployment option.

## Open Verification Points
- Confirm the target production topology: same-origin `/api`, separate API domain, or reverse-proxy fronted deployment.
- Confirm the canonical production env file/process used by the team.
- Confirm the minimum runtime evidence required before a release is treated as valid, especially for auth, reporting, and export paths.
