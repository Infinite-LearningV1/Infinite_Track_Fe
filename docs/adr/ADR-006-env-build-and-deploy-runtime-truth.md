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
- The current production env template uses `https://api.infinite-track.tech/api` as the public backend API base.
- `master` is the release/production source branch; `develop` is the integration branch.

### Assumption

- The production frontend remains a static artifact plus browser runtime, while backend availability and authorization remain separate backend responsibilities.
- Production environment values can change independently from source code and therefore must be verified at build/deploy time.

### Needs Verification

- The hosting/platform configuration must be checked before each production promotion because it cannot be proven from repository source alone.
- GitHub ruleset / required-status-check enforcement is operational configuration and must be verified outside the source tree.
- Credentialed browser auth requires the production backend CORS allowlist to match the final frontend origin.

## Decision

We will treat observable repository and deployed runtime behavior as the Web FE deployment truth.

For local development, `/api` is the default frontend API base and the Webpack dev server provides the local proxy. For static production, the build must receive the explicit public API base required by the target environment; the current production template uses `https://api.infinite-track.tech/api`.

Environment templates are contracts, not secrets and not automatic runtime configuration. Production values must be injected into the build environment before Webpack creates the static bundle.

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

- `package.json` — `npm run build` creates the production Webpack bundle.
- `.github/workflows/build.yml` — Node.js 20 CI runs `npm ci`, focused auth runtime tests, and production build on `develop`/`master` PRs and pushes.
- `webpack.config.js` — Webpack injects frontend environment values, emits `build/`, and configures the local `/api` proxy.
- `.env.example` — local development API/env contract.
- `.env.production.example` — current static-production API/env contract.
- `README.md` — canonical operational setup, verification, deployment, smoke, and rollback guidance.

## Open Verification Points

- Confirm hosting source branch, build environment, and published deployment ID before production promotion.
- Confirm production CORS configuration for the final frontend origin.
- Confirm required GitHub status checks/rulesets remain enabled on integration and release branches.
