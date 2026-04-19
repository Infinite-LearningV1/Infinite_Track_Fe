# DO App Platform Static Site Production Design

## Summary

Set up the Web FE repository `Infinite_Track_Fe` as a **DigitalOcean App Platform Static Site** for the production frontend surface. The app will build directly from the GitHub repository, use `master` as the production source branch, and remain operationally separated from the backend, which continues to run independently in Docker.

## Goal

1. Create a production-ready hosting model for the frontend that is separate from the backend runtime.
2. Use **DigitalOcean App Platform Static Site** as the frontend delivery surface.
3. Keep `master` as the only production deployment source.
4. Make build-time frontend config explicit and production-safe.
5. Avoid introducing frontend server-management burden such as self-managed Nginx for the frontend.

## Non-Goals

- Moving the backend from Docker to App Platform.
- Making `deploy` the production source branch.
- Converting the frontend into a Docker runtime service.
- Introducing backend secrets into frontend env.
- Reworking the frontend build system beyond what is necessary for correct production deployment.

## Confirmed Decisions

- **Frontend hosting target:** DigitalOcean App Platform Static Site.
- **Provisioning target:** create the app in DigitalOcean, not just prepare docs.
- **Deploy source:** GitHub repository directly.
- **Production source branch:** `master`.
- **Branch model:** follow the official repository workflow `feature/*` -> `develop` -> `master`; `master` remains the stable production branch.
- **Backend hosting model:** remains separate in Docker.
- **Frontend serving model:** static-hosting-first, not Docker runtime.

## Context

This frontend is a Webpack-built static multi-page application. Its public runtime values are compiled into the bundle at build time. The existing audit of runtime-config truth showed several important facts:

- The build currently uses `dotenv.config()` with the default file lookup behavior.
- `npm run build` sets `NODE_ENV=production`, but frontend app-level config such as `APP_ENVIRONMENT` is still independently injected.
- The current deployment docs assume `.env.production`, but the build path is not yet explicitly aligned with that assumption.
- There is no repo-owned Dockerfile, docker-compose file, or CI workflow for this frontend.

These facts mean the App Platform setup must treat **App Platform build-time env vars as the production deployment source of truth** unless and until the repository contract is further cleaned up.

## Why App Platform Static Site Is the Right Fit

### Operationally
- It cleanly separates the frontend from the backend runtime.
- It avoids self-managing Nginx or a separate frontend Droplet.
- It matches the nature of the repo: build once, serve static assets.

### Architecturally
- The frontend should be treated as a **build artifact**, not a long-running app server.
- Backend Docker infrastructure stays focused on API/runtime concerns.
- The frontend can have its own deploy cadence without sharing compute/runtime coupling with the backend.

## Options Considered

### Option A — Separate Droplet + Nginx for frontend
**Pros**
- Full control.
- Works with existing DO infrastructure patterns.

**Cons**
- Adds server-management burden for a static frontend.
- Requires manual Nginx, TLS, and file-serving management.
- Provides less value than a managed static platform for this repo.

### Option B — App Platform Static Site from `master` (**selected**)
**Pros**
- Clean separation from backend.
- Correct hosting model for static frontend output.
- Minimal operational burden.
- Natural fit for future CI/CD deployment flow.

**Cons**
- Requires explicit production env injection discipline.
- Production deploys must respect the branch/source-of-truth rules.

### Option C — Object storage + CDN artifact hosting
**Pros**
- Good for pure artifact distribution.
- Strong separation.

**Cons**
- More artifact-pipeline-oriented than app-oriented.
- Less convenient than App Platform for this repo’s current phase.

## Architecture

### Frontend
- Hosted on **DigitalOcean App Platform Static Site**.
- Built directly from the GitHub repo.
- Production app follows only the `master` branch.
- Build output directory is `build`.

### Backend
- Remains on separate Docker-based infrastructure.
- Continues to expose the public API endpoint independently.
- Can keep its existing reverse-proxy model if currently needed.

### Relationship
- The frontend talks to the backend through a public API base URL.
- The frontend does not share runtime, server process, or deployment machine concerns with the backend.

## Production Deploy Contract

### App type
- **DigitalOcean App Platform Static Site**

### Source
- GitHub repository: `Infinite_Track_Fe`
- Branch: `master`
- Auto-deploy: enabled from `master`

### Build settings
- Build command: `npm run build`
- Output directory: `build`
- Source directory: repository root

### Required production build-time env vars
These values must be treated as **public-safe** and injected explicitly into the App Platform build:

- `API_BASE_URL=<public backend API domain>`
- `APP_ENVIRONMENT=production`
- `DEBUG_MODE=false`
- `LOG_LEVEL=error`

### Recommended additional env vars
If the current bundle contract continues to rely on them, these may also be injected explicitly to avoid accidental fallback behavior:

- `API_AUTH_ENDPOINT=/auth`
- `API_VERSION=v1`
- `APP_NAME=Infinite Track`
- `APP_VERSION=2.0.1`
- `SESSION_TIMEOUT=3600000`
- `REMEMBER_ME_DAYS=7`
- `DEFAULT_LANGUAGE=id`
- `TIMEZONE=Asia/Jakarta`

### Security rule
Only public-safe values may be injected into the frontend build. No backend secrets, private credentials, or internal-only tokens may be placed into App Platform env for this frontend app.

## Branch and Environment Rules

### `master`
- Stable branch.
- The only source branch for production frontend deployment.
- Safe to auto-deploy from App Platform.

### Historical / auxiliary branches
- Historical or auxiliary branches such as `deploy` may still exist in repository workflows.
- They are not used as the App Platform production source.
- They are not part of the primary frontend promotion workflow for this design.

## Rollout Design

### Phase A — Preflight
Before creating the app, verify:
- the repo builds with `npm run build`
- the required production env values are known
- no frontend env value depends on a private secret
- `master` is the intended stable production source

### Phase B — Create the App Platform app
Create a production static site app with:
- repo-connected source
- `master` branch
- `npm run build`
- output directory `build`
- production build-time env vars injected explicitly

### Phase C — Initial deployment verification
After app creation, verify:
- App Platform build succeeds
- frontend entry page loads
- static assets are served correctly
- frontend requests target the public backend API domain, not `/api` local proxy assumptions
- no development-only fallback behavior is accidentally active in production

### Phase D — Domain attachment
If the production frontend domain is ready, attach it to the App Platform app. If not, first validate using the default App Platform URL, then attach the custom domain afterward.

## Verification Criteria

The setup is considered correct only if all of the following are true:

1. The App Platform static site is created successfully from the GitHub repo.
2. The app uses `master` as its production source branch.
3. `npm run build` succeeds on App Platform.
4. The output published by App Platform is the `build` directory.
5. The deployed frontend loads without requiring a frontend Nginx server.
6. API requests point to the intended public backend domain.
7. No backend secret is exposed through frontend build-time env.
8. The production app does not rely on local-only `/api` proxy behavior.

## Failure Handling Rules

- If the build fails, fix the build/config contract before calling the deployment production-ready.
- If the custom domain is not ready, keep the app on the default App Platform URL temporarily.
- If `API_BASE_URL` is not finalized, do not treat the app as production-ready even if the app resource is created successfully.
- If runtime-config drift is still present in the repo, App Platform env values still act as the deployment truth for this production app.

## Risks

### Risk 1 — App Platform builds against a drifted repo contract
The current repo still has documented/runtime drift around production env handling.

**Mitigation:** inject explicit production env vars in App Platform and treat them as canonical for the app creation step.

### Risk 2 — Split behavior between `NODE_ENV` and `APP_ENVIRONMENT`
Production build semantics can drift if app-level config is not explicitly set.

**Mitigation:** explicitly inject `APP_ENVIRONMENT=production` during App Platform setup.

### Risk 3 — Wrong branch becomes deployment source
If the app is connected to `deploy` or another non-stable branch, production behavior no longer matches branch governance.

**Mitigation:** lock the app source to `master` only.

## Expected Deliverables

1. A documented production App Platform design.
2. A production static site app in DigitalOcean App Platform.
3. Explicit build-time env configuration for the app.
4. A verified separation between frontend hosting and backend Docker runtime.
5. A foundation for future CI/CD automation against the production frontend app.

## Out-of-Band Follow-Up

After app creation, the next recommended work items are:
- runtime contract cleanup in the repo itself
- CI/CD baseline alignment for frontend production deployment
- optional staging/static-site strategy for the `deploy` branch if needed later
