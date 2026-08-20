# INF-277 Web FE Runtime Boundary Design

## Metadata

- Linear issue: `INF-277` — `[Web FE][Infra] Remove Web FE-owned Nginx runtime and decouple backend lifecycle`
- Repository: `Infinite-LearningV1/Infinite_Track_Fe`
- Base branch: `develop`
- Isolated branch: `djangosuryaa/inf-277-web-feinfra-remove-web-fe-owned-nginx-runtime-and-decouple`
- Design date: `2026-08-20`
- Status: Proposed for implementation after user review

## Problem

The repository currently contains a Docker Compose topology that makes Web FE own an Nginx gateway, a backend production-image service, a frontend development container, and a staging artifact container. That topology conflicts with the now-locked responsibility boundary: Web FE is a static frontend, while backend runtime and backend production ingress belong to the backend repository.

Webpack Dev Server already supports local `/api` proxying, HMR, and direct frontend serving. Production already builds static files under `build/` and uses the public API base `https://api.infinite-track.tech/api`.

Keeping the Web FE Nginx layer therefore duplicates development routing responsibility and creates cross-repository runtime coupling that can drift from the backend production contract.

## Goals

1. Remove all active Web FE-owned Nginx runtime artifacts.
2. Remove Web FE ownership of the backend runtime lifecycle.
3. Make native Webpack Dev Server the canonical local development runtime.
4. Preserve `/api` development proxy semantics and production public API semantics.
5. Keep production Web FE as a static build with no Web FE application server.
6. Preserve backend Nginx ownership under `INF-278`.
7. Lock the new runtime boundary with focused automated tests and canonical documentation.

## Non-goals

- Do not remove or redesign the backend production Nginx.
- Do not change Express routes, authentication/session semantics, CORS ownership, or backend API contracts.
- Do not change attendance, WFA, FAHP, reporting, or UI behavior.
- Do not introduce a replacement reverse proxy, SPA server, CDN, WAF, or service mesh.
- Do not fix unrelated baseline formatting or malformed-template failures discovered before INF-277.
- Do not modify `develop` directly.

## Repository facts at design time

The isolated worktree is based on `origin/develop` commit `528bfd3`.

Current runtime facts:

- `package.json` defines `npm run start` as `webpack serve --config webpack.config.js`.
- `webpack.config.js` defaults development API proxying to `http://localhost:3005`.
- `webpack.config.js` currently uses `allowedHosts: "all"`.
- `.env.example` uses `API_BASE_URL=/api`.
- `.env.production.example` uses `API_BASE_URL=https://api.infinite-track.tech/api`.
- `README.md` identifies the runtime as `Static multi-page frontend` and is the canonical operational entrypoint.
- CI runs `npm ci`, `npm test`, and `npm run build`; CI does not use Docker or Nginx.
- Active README onboarding and deployment instructions do not require Docker, Compose, or Nginx.
- Repository search found active Nginx/Compose runtime references only in `compose.yaml`, `docker/nginx/**`, `webpack.config.js`, and ADR-006 proxy wording.

## Baseline verification

Before implementation:

- `npm ci`: PASS.
- `npm run test:auth-runtime`: PASS, 40 tests / 0 failures.
- `npm run build`: PASS.
- `npm run lint`: FAIL before INF-277 implementation. The failure includes an existing malformed closing `div` in `src/partials/modal/export-report-modal.html:240` plus existing Prettier warnings.

The lint failure is baseline debt. INF-277 must not claim to have introduced or fixed it unless the changed files independently create a new lint regression.

## Architecture decision

### Canonical development topology

```text
Browser
  ↓ http://localhost:3000
Webpack Dev Server
  ├── frontend assets + HMR
  └── /api/*
         ↓ devServer.proxy
      Backend development runtime :3005
```

The backend is started separately from the backend repository. Web FE only knows the backend through the configured development proxy target.

### Canonical production topology

```text
Browser ── https://infinite-track.tech ──> Static Web FE build/
Browser / Android ── https://api.infinite-track.tech ──> Backend Nginx ──> Express 127.0.0.1:3005
```

No Web FE Nginx exists in the production request path.

## Runtime ownership

### Web FE owns

- Webpack Dev Server for local development.
- HMR and local static asset serving.
- Development-only `/api` forwarding through `devServer.proxy`.
- Build-time public frontend environment values.
- Webpack static production build under `build/`.
- Browser-side API consumer configuration.
- Web FE regression/build verification.

### Backend owns

- Express runtime and bind host/port.
- Backend Docker image and backend deployment lifecycle.
- Production Nginx ingress and TLS boundary.
- CORS policy and credentialed-origin allowlist.
- Authentication/session authority.
- API routes and business behavior.
- Database connectivity.

The two repositories integrate through the API contract, not by embedding the backend production runtime inside Web FE tooling.

## Docker and Compose disposition

INF-277 will remove the current Web FE Docker/Compose runtime rather than preserve a second, optional local execution model.

This is intentional because repository evidence shows no active README, CI, or production deployment dependency on Compose. After Nginx and the backend service are removed, the remaining Compose profiles would only duplicate `npm run start` and `npm run build` with extra maintenance cost.

Therefore the implementation will remove `compose.yaml`, `Dockerfile`, `Dockerfile.dev`, `.dockerignore`, and `docker/nginx/**` as one bounded removal of the obsolete Web FE container runtime.

## Development server contract

`webpack.config.js` remains the single development-server configuration.

Required behavior:

- host default remains `127.0.0.1` for native local development;
- port remains `3000`;
- HMR remains enabled;
- `API_BASE_URL` remains `/api` in development;
- proxy context remains `/api` and preserves the `/api` prefix;
- proxy target remains configurable through `WEBPACK_API_PROXY_TARGET`;
- proxy target fallback remains `http://localhost:3005`;
- `allowedHosts` changes from `"all"` to `"auto"`;
- no Nginx-specific WebSocket or routing configuration remains.

`WEBPACK_API_PROXY_TARGET` is development-tool configuration only. It must not be injected into browser application code or treated as a production API URL.

## Production build contract

Production remains static and build-time configured:

```text
API_BASE_URL=https://api.infinite-track.tech/api
APP_ENVIRONMENT=production
```

Webpack must continue to emit the static artifact under `build/`. No new Node server, Nginx server, or same-origin production proxy is added.

The browser origin is `https://infinite-track.tech`. Credentialed browser auth depends on the backend CORS configuration allowing that exact production origin; backend correction, if required, is owned by `INF-278` or another backend issue.

## Documentation contract

`README.md` remains the canonical onboarding, environment, verification, deployment, and handoff entrypoint. INF-277 will update it only where needed to make the development and production runtime boundaries explicit.

`docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md` will be updated to record that:

- Webpack Dev Server is the canonical development server;
- local `/api` proxying is development-only;
- Web FE owns no Nginx runtime;
- production is a static build using the explicit public API base;
- backend production ingress belongs to the backend repository;
- runtime smoke evidence remains required beyond a successful build.

`docs/adr/index.md` will update ADR-006 metadata if its status/date changes.

The older Linear description references `DEPLOYMENT.md` and `DEPLOYMENT-CHECKLIST.md`, but those files no longer exist on current `origin/develop`. They are not recreated. Current repository truth takes precedence, and README + ADR-006 are the active documentation targets.

## Automated contract test

Add `tests/infra/web-runtime-contract.test.js` using Node's built-in test runner.

The test will lock these invariants:

1. `webpack.config.js` exposes development server port `3000`.
2. `allowedHosts` is `"auto"`.
3. `/api` proxy target defaults to `http://localhost:3005`.
4. `.env.example` keeps `API_BASE_URL=/api`.
5. `.env.production.example` keeps `API_BASE_URL=https://api.infinite-track.tech/api`.
6. Active Web FE container runtime files removed by INF-277 do not exist.

The test is a repository contract test, not an end-to-end backend test. It prevents accidental reintroduction of the removed runtime ownership.

## Expected file changes

### Delete

- `.dockerignore`
- `compose.yaml`
- `Dockerfile`
- `Dockerfile.dev`
- `docker/nginx/dev.conf`
- `docker/nginx/staging.conf`
- `docker/nginx/select-config.sh`
- empty `docker/nginx/` and `docker/` directories after file removal

### Modify

- `webpack.config.js`
- `README.md`
- `docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md`
- `docs/adr/index.md` if ADR metadata changes

### Create

- `tests/infra/web-runtime-contract.test.js`

No application feature/service/auth implementation file should require modification for INF-277.

## Verification strategy

Automated verification after implementation:

```text
node --test tests/infra/web-runtime-contract.test.js
npm run test:auth-runtime
npm test
npm run build
```

`npm run lint` must also be rerun and compared against the recorded pre-existing failure. INF-277 is not allowed to introduce a new formatting/parser failure in files it changes.

Manual/runtime verification after implementation:

1. Start backend development runtime separately on port `3005`.
2. Start Web FE with `npm run start`.
3. Confirm frontend is reachable at `http://localhost:3000` without Nginx.
4. Confirm a representative `/api/*` request is proxied successfully to backend `:3005`.
5. Confirm HMR reconnect/update behavior works after editing a frontend source file.
6. Confirm login/session behavior works through the development proxy.
7. Confirm production build embeds the canonical API base when built with production env.

Docker runtime verification is removed from INF-277 because the design removes the Web FE Docker runtime entirely.

## Failure handling and rollback

If direct Webpack development fails, the implementation must fix Webpack configuration or proxy configuration rather than reintroduce Nginx as a workaround.

If backend connectivity fails, first verify that the backend development runtime is actually listening on `localhost:3005` and that `WEBPACK_API_PROXY_TARGET` resolves to the intended target. Do not make Web FE own backend startup again.

Rollback is a normal Git revert of the INF-277 implementation commit(s). Backend production ingress remains independent, so rollback does not require backend Nginx changes.

## Security considerations

- Replacing `allowedHosts: "all"` with `"auto"` restores Webpack host checking while preserving localhost and development WebSocket hostname behavior.
- No broad CORS rule is added to Web FE.
- No backend port is exposed by Web FE tooling.
- No secrets are introduced into frontend env templates; frontend build-time values remain public-safe.
- Production TLS termination and forwarded-header trust remain backend infrastructure concerns.

## Acceptance criteria

- No active Nginx runtime remains in the Web FE repository.
- No Web FE Compose service starts or owns the backend runtime.
- Canonical local startup is `npm run start` plus an independently started backend.
- `/api` development proxy behavior remains functional.
- HMR works directly through Webpack Dev Server.
- `allowedHosts: "all"` is removed.
- Production remains a static `build/` artifact with `https://api.infinite-track.tech/api` as the canonical production API base.
- Backend Nginx remains untouched and owned by `INF-278`.
- Auth runtime tests continue to pass.
- Full regression tests continue to pass.
- Production build continues to pass.
- README and ADR-006 describe the same runtime topology as the implementation.
- Existing lint debt is reported honestly and no new INF-277 lint regression is introduced.

## Official reference basis

The design is consistent with the current official documentation reviewed on `2026-08-20`:

- Webpack Dev Server `proxy` is intended for forwarding requests to a separate development API backend: https://webpack.js.org/configuration/dev-server/
- Webpack documents that `allowedHosts: "all"` bypasses host checking and is not recommended; `"auto"` allows localhost and the development WebSocket hostname: https://webpack.js.org/configuration/dev-server/
- Docker Desktop documents `host.docker.internal` for container-to-host communication, but INF-277 intentionally removes the optional Web FE container runtime instead of retaining that second local path: https://docs.docker.com/desktop/features/networking/networking-how-tos/
- DigitalOcean App Platform supports static-site output directories such as `build`, consistent with the Web FE production artifact model: https://docs.digitalocean.com/products/app-platform/how-to/create-apps/

## Design consequence

After INF-277, Web FE infrastructure is intentionally smaller:

```text
Web FE repository
├── Webpack development server
├── static production build
├── browser API integration contract
└── tests/docs for those responsibilities

Backend repository
├── Express runtime
├── backend deployment/container runtime
└── production Nginx ingress
```

This removes duplicated gateway/runtime ownership without changing application business semantics.