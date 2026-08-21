# ADR-006-env-build-and-deploy-runtime-truth

## ADR ID

ADR-006

## Title

Env, build, and deploy runtime truth

## Status

Proposed

## Context

### Fact

- The repository builds a static multi-page frontend with Webpack output under `build/`.
- Frontend environment values are injected into the browser bundle at build time through Webpack `DefinePlugin`.
- `API_BASE_URL` falls back to `/api` when no explicit build-time value is provided.
- Local Webpack development proxies `/api` requests to `http://localhost:3005` unless `WEBPACK_API_PROXY_TARGET` overrides that target.
- The current production API base is `https://api.infinite-track.tech/api` and is injected into the build environment.
- `master` is the release/production source branch; `develop` is the integration branch.
- Webpack Dev Server is the canonical Web FE development server; the repository does not require a Web FE-owned Nginx gateway.
- Backend development runtime startup is owned by the backend repository; Web FE integrates through `WEBPACK_API_PROXY_TARGET` rather than owning a backend container.
- Production Web FE is a static artifact and the public backend ingress belongs to the backend repository.

### Assumption

- The production frontend remains a static artifact plus browser runtime, while backend availability and authorization remain separate backend responsibilities.
- Production environment values can change independently from source code and therefore must be verified at build/deploy time.

### Needs Verification

- The hosting/platform configuration must be checked before each production promotion because it cannot be proven from repository source alone.
- GitHub ruleset / required-status-check enforcement is operational configuration and must be verified outside the source tree.
- Credentialed browser auth requires the production backend CORS allowlist to match the final frontend origin.

## Decision

We will treat observable repository and deployed runtime behavior as the Web FE deployment truth.

For local development, Webpack Dev Server is the canonical Web FE runtime. `API_BASE_URL=/api` remains the browser-facing development base, and Webpack proxies `/api/*` to the independently started backend development runtime, defaulting to `http://localhost:3005` unless `WEBPACK_API_PROXY_TARGET` overrides it.

Web FE owns no Nginx runtime and no backend container lifecycle. For static production, the build receives the explicit public API base required by the target environment; the canonical production contract is `https://api.infinite-track.tech/api`. Backend public ingress, TLS, CORS policy, and Express runtime remain backend responsibilities.

`.env.example` is the one public-safe environment template. It contains the retained public build/dev inputs: `API_BASE_URL`, `APP_ENVIRONMENT`, `DEBUG_MODE`, `LOG_LEVEL`, `WEBPACK_DEV_HOST`, `WEBPACK_OPEN`, and `WEBPACK_API_PROXY_TARGET`. Authentication paths, session durations, app identity, and locale defaults are code-level constants. The deployment platform supplies production build variables before Webpack creates the static bundle; the production values and the single tracked local/public-safe onboarding template are documented here and in the README.

Release confidence requires both build evidence and runtime smoke evidence for the affected critical flows. A successful static build alone is not proof that authentication, CORS, backend availability, dashboard data, or export behavior are healthy in production.

## Rationale

This repository does not contain an SSR application server. Production behavior comes from generated static files plus browser-side API access. That makes build-time environment configuration, API prefix/origin, CORS, and release verification critical to runtime correctness.

Keeping local proxy behavior separate from production public-API configuration avoids treating development convenience as production topology.

## Considered Options

1. **Recommended: runtime truth comes from observable build and deployed behavior**
   - Use repository evidence and release/runtime verification rather than framework assumptions.
2. **Use local `/api` proxy semantics as the production assumption**
   - Rejected because static production currently uses an explicit public API origin.
3. **Treat documentation or build success as sufficient production proof**
   - Rejected because environment, CORS, session, and backend integration can still fail after a successful build.

## Trade-offs / Consequences

- Positive: reduces deployment mistakes caused by stale topology assumptions.
- Positive: keeps local development and production contracts explicit.
- Positive: makes build-time public configuration auditable.
- Negative: production promotion requires explicit environment and runtime verification.
- Negative: operational platform state cannot be fully validated from Git alone.

## Evidence / References

- `.github/workflows/ci.yml` — Node.js 24 CI runs `npm ci`, `npm run lint`, `npm test`, and `npm run build` on `develop`/`master` PRs and pushes.
- `.env.example` — single tracked local/public-safe onboarding template for the public build/dev inputs.
- `webpack.config.js` — Webpack injects frontend environment values, emits `build/`, and configures the local `/api` proxy.
- `README.md` — canonical operational setup, public production values, verification, deployment, smoke, and rollback guidance.

## Open Verification Points

- Confirm hosting source branch, build environment, and published deployment ID before production promotion.
- Confirm production CORS configuration for the final frontend origin.
- Confirm required GitHub status checks/rulesets remain enabled on integration and release branches.
