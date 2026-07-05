# Docker Compose Design — Web FE + Backend via NGINX Gateway

## Summary

This design adopts a dual-mode Docker Compose setup with a single NGINX gateway in front of the Web FE and backend.

- **Dev profile** keeps `webpack-dev-server` running with hot reload behind NGINX.
- **Staging-like profile** serves built static frontend assets through NGINX while still proxying `/api` to the backend.
- The frontend keeps `API_BASE_URL=/api` in both modes so runtime behavior stays aligned with the repo's current source-of-truth boundary.

## Goals

- Keep a single browser entrypoint through NGINX.
- Preserve frontend hot reload for local development.
- Make staging-like runtime behave closer to deployment than dev mode.
- Avoid mode-specific frontend API URLs.
- Keep backend integration truthful by routing `/api` at the gateway layer.

## Non-goals

- Replacing the backend's existing Docker setup.
- Changing frontend auth/session behavior.
- Changing frontend service contracts.
- Defining production hosting or cloud infrastructure beyond local/staging-like Compose.

## Current repo context

- The frontend uses Webpack dev server on port `3000`.
- The frontend currently proxies `/api` to `http://localhost:3005` during dev.
- Environment defaults already assume `API_BASE_URL=/api`.
- There is no Docker or Compose setup checked into the frontend repo root yet.

## Recommended approach

Use **Approach A**: one Compose definition with profiles for `dev` and `staging`, centered on an NGINX gateway.

### Why this approach

- It matches the user's requirement to keep NGINX as the front door.
- It preserves the current frontend boundary of `/api` without multiplying environment-specific API URLs.
- It separates development convenience from staging-like runtime truth.
- It reduces the chance that dev-only webpack behavior leaks into staging-like verification.

## High-level architecture

### Shared services

- `backend`
  - Existing backend container/service.
  - Exposed only inside the Compose network.
- `nginx`
  - Public entrypoint for browser traffic.
  - Owns routing for `/` and `/api`.

### Dev profile

- `frontend-dev`
  - Runs Node 20 and `webpack serve`.
  - Uses bind mounts for source code and hot reload.
  - Is not exposed directly to the browser.
- `nginx`
  - Routes `/` to `frontend-dev:3000`.
  - Routes `/api` to `backend:3005`.
  - Must support WebSocket upgrade headers for HMR.

### Staging-like profile

- `frontend-build`
  - Multi-stage build that produces static files into the frontend `build/` output.
- `nginx`
  - Serves built frontend files directly for `/`.
  - Proxies `/api` to `backend:3005`.

## Compose structure

## Files

- `compose.yaml`
  - Base service definitions and profiles.
- `Dockerfile.dev`
  - Frontend development image for Node + webpack dev server.
- `Dockerfile`
  - Multi-stage production-like frontend build.
- `docker/nginx/dev.conf`
  - NGINX config for proxying frontend dev server and backend API.
- `docker/nginx/staging.conf`
  - NGINX config for serving static frontend files and proxying backend API.
- optional `.env.docker.example`
  - Only if Compose-specific variables are needed and cannot be expressed clearly in existing docs.

### Profiles

- `dev`
  - Starts `nginx`, `frontend-dev`, and `backend`.
- `staging`
  - Starts `nginx`, built frontend runtime, and `backend`.

## Networking and routing

### Browser-visible URLs

- Browser always enters through `nginx`.
- Browser uses `/` for frontend pages.
- Browser uses `/api/...` for backend API requests.

### Internal container routing

#### Dev

- `nginx -> frontend-dev:3000` for frontend routes.
- `nginx -> backend:3005` for `/api` routes.

#### Staging-like

- `nginx` serves frontend static files directly.
- `nginx -> backend:3005` for `/api` routes.

## Frontend behavior

### Dev mode

- Keep `webpack-dev-server` as the frontend runtime.
- Keep source bind mounts for fast iteration.
- Remove dependence on webpack's own `/api` proxy once NGINX becomes the gateway entrypoint.
- Frontend should still believe the API base is `/api`.

### Staging-like mode

- Run the frontend production build in a dedicated build stage.
- Serve only static built assets.
- Do not run webpack dev server in staging-like mode.

## NGINX responsibilities

### Dev config

- Proxy normal frontend traffic to `frontend-dev:3000`.
- Proxy `/api` to `backend:3005`.
- Forward WebSocket upgrade headers so HMR works.
- Preserve host and forwarded headers where needed.

### Staging-like config

- Serve built files from the frontend build output.
- Support SPA-like deep linking only if the current app actually needs fallback behavior.
- Proxy `/api` to `backend:3005`.

## Webpack impact

`webpack.config.js` is a high-risk file in this repo.

Preferred change:
- keep dev server for hot reload,
- but make its `/api` proxy non-authoritative once traffic comes through NGINX.

Design preference:
- avoid changing frontend source to point at container hostnames,
- avoid depending on browser access to `frontend-dev:3000`,
- minimize Webpack changes to only what is required for HMR behind NGINX.

## Environment strategy

### Frontend

Keep these assumptions stable across both modes:
- `API_BASE_URL=/api`
- `APP_ENVIRONMENT` reflects the intended runtime mode
- debug/log settings can differ by mode

### Backend

Backend-specific variables remain owned by the backend service.

### Compose variables

Use Compose env vars only for container/runtime wiring such as:
- exposed gateway port
- backend internal port if not fixed

Do not move application truth into Compose if it already belongs in frontend env/build configuration.

## Verification plan

### Dev profile checks

- NGINX responds on the expected browser port.
- Frontend pages load through NGINX, not direct frontend container access.
- Frontend file edits trigger hot reload successfully.
- `/api` requests pass through NGINX and reach the backend.
- Browser console shows no broken HMR or mixed-origin issues.

### Staging-like profile checks

- Built frontend assets are served by NGINX.
- Direct page reloads still behave correctly for the supported route model.
- `/api` requests still reach the backend through NGINX.
- No dependency on webpack dev server remains in staging-like mode.

## Risks and mitigations

### Risk: frontend/backend truth diverges between modes

Mitigation:
- keep browser-facing API path as `/api` in both modes,
- centralize routing in NGINX.

### Risk: HMR fails behind reverse proxy

Mitigation:
- configure NGINX upgrade headers correctly,
- make only the minimal Webpack changes required for proxied dev traffic.

### Risk: unnecessary edits to auth/session behavior

Mitigation:
- keep this change scoped to runtime/containerization and gateway routing only.

### Risk: deploy/runtime docs become stale

Mitigation:
- update Docker usage documentation together with implementation.

## Alternatives considered

### Alternative 1 — always use webpack dev server in all modes

Rejected because staging-like validation would remain too close to dev behavior and would not exercise the static asset runtime.

### Alternative 2 — use NGINX only in staging-like mode

Rejected because the user explicitly wants NGINX as the gateway in development too.

### Alternative 3 — point frontend directly to backend container hostname

Rejected because it weakens the stable `/api` boundary and makes browser-visible configuration less portable.

## Scope for implementation plan

Implementation should be split into these work units:
1. Add Docker and Compose files for frontend dev/build runtime.
2. Add NGINX configs for dev and staging-like modes.
3. Wire Compose profiles and service dependencies.
4. Apply only the minimal frontend/Webpack adjustments required for gateway-based dev mode.
5. Update documentation for Docker workflow and verification steps.

## Docs and governance impact

This work changes env/build/deploy runtime truth and local operational workflow.

**DOCS/ADR UPDATE REQUIRED**

Docs expected to change:
- `DEPLOYMENT.md`
- `DEPLOYMENT-CHECKLIST.md`
- Docker usage instructions for local development and staging-like verification

## Open decisions resolved in this spec

- NGINX is the single gateway in both modes.
- Dev keeps webpack dev server with hot reload behind NGINX.
- Staging-like serves built static frontend assets through NGINX.
- Frontend keeps `/api` as the browser-facing backend boundary.

## Out of scope follow-up possibilities

- TLS termination for non-local environments.
- Production orchestration beyond Compose.
- Shared observability or access logging enhancements.
