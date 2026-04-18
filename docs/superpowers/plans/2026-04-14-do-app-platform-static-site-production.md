# DO App Platform Static Site Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a production DigitalOcean App Platform Static Site for `Infinite_Track_Fe` that deploys from `master`, stays separated from the backend Docker runtime, and uses explicit production-safe build-time env.

**Architecture:** The implementation keeps the frontend as a static build artifact hosted by DigitalOcean App Platform while the backend remains independently hosted in Docker. App Platform becomes the production frontend delivery surface, GitHub `master` becomes the only deployment source for the production app, and App Platform build-time env values act as the deployment truth for the app creation step.

**Tech Stack:** DigitalOcean App Platform Static Sites, GitHub repository integration, Webpack build output (`build`), DigitalOcean DNS, public frontend build-time env vars

---

## File Structure Map

- `E:/skrisi/clonefee/Infinite_Track_Fe/package.json` — source of the production build command (`npm run build`).
- `E:/skrisi/clonefee/Infinite_Track_Fe/webpack.config.js` — source of the static output directory and public env injection behavior.
- `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-14-do-app-platform-static-site-production-design.md` — approved setup design and source-of-truth decisions.
- DigitalOcean App Platform app spec (created via API) — target production static-site definition.
- DigitalOcean domain `infinite-track.tech` — existing DO DNS zone that will later host the frontend domain.

## Preconditions Confirmed

- GitHub origin exists: `https://github.com/Infinite-LearningV1/Infinite_Track_Fe.git`
- Production source branch will be `master`
- DigitalOcean currently has no existing App Platform apps in this account
- DigitalOcean domain exists: `infinite-track.tech`
- Backend API DNS exists: `api.infinite-track.tech -> 168.144.33.33`

### Task 1: Verify production inputs before app creation

**Files:**
- Read-only verification: `E:/skrisi/clonefee/Infinite_Track_Fe/package.json`
- Read-only verification: `E:/skrisi/clonefee/Infinite_Track_Fe/webpack.config.js`
- Read-only verification: `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-14-do-app-platform-static-site-production-design.md`
- Test: build verification via `npm run build`

- [ ] **Step 1: Verify the production build command is still correct**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" show master:package.json
```
Expected:
- Output contains a `build` script equivalent to:
  ```json
  "build": "cross-env NODE_ENV=production webpack --config webpack.config.js"
  ```

- [ ] **Step 2: Verify the static output directory is still `build`**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" show master:webpack.config.js
```
Expected:
- Output contains:
  ```js
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "build"),
  }
  ```

- [ ] **Step 3: Run a local production build as the preflight gate**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build
```
Expected:
- Build completes successfully.
- `E:/skrisi/clonefee/Infinite_Track_Fe/build` is regenerated.

- [ ] **Step 4: Confirm the production env contract that will be injected into App Platform**

Use this exact env set as the initial public-safe production contract:

```text
API_BASE_URL=https://api.infinite-track.tech
APP_ENVIRONMENT=production
DEBUG_MODE=false
LOG_LEVEL=error
API_AUTH_ENDPOINT=/auth
API_VERSION=v1
APP_NAME=Infinite Track
APP_VERSION=2.0.1
SESSION_TIMEOUT=3600000
REMEMBER_ME_DAYS=7
DEFAULT_LANGUAGE=id
TIMEZONE=Asia/Jakarta
```

Expected:
- No secret or private credential appears in the list.
- `API_BASE_URL` points to the existing backend API domain.

### Task 2: Create the production App Platform static site

**Files:**
- External system: DigitalOcean App Platform
- External system: GitHub repo `Infinite-LearningV1/Infinite_Track_Fe`
- Test: DigitalOcean app creation result

- [ ] **Step 1: Create the App Platform static site app from GitHub `master`**

Create the app with this structured configuration:

```json
{
  "spec": {
    "name": "infinite-track-fe-production",
    "region": "sgp",
    "static_sites": [
      {
        "name": "frontend",
        "github": {
          "repo": "Infinite-LearningV1/Infinite_Track_Fe",
          "branch": "master",
          "deploy_on_push": true
        },
        "build_command": "npm run build",
        "source_dir": "/",
        "output_dir": "build",
        "environment_slug": "html",
        "envs": [
          {"key": "API_BASE_URL", "value": "https://api.infinite-track.tech", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "APP_ENVIRONMENT", "value": "production", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "DEBUG_MODE", "value": "false", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "LOG_LEVEL", "value": "error", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "API_AUTH_ENDPOINT", "value": "/auth", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "API_VERSION", "value": "v1", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "APP_NAME", "value": "Infinite Track", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "APP_VERSION", "value": "2.0.1", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "SESSION_TIMEOUT", "value": "3600000", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "REMEMBER_ME_DAYS", "value": "7", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "DEFAULT_LANGUAGE", "value": "id", "scope": "BUILD_TIME", "type": "GENERAL"},
          {"key": "TIMEZONE", "value": "Asia/Jakarta", "scope": "BUILD_TIME", "type": "GENERAL"}
        ]
      }
    ]
  }
}
```

Expected:
- App creation succeeds.
- The app is configured as a static site, not a service.
- Source branch is `master`.

- [ ] **Step 2: Record the created app ID and default URL**

Expected:
- The created app response includes an app ID.
- The response includes a default App Platform URL that can be used before attaching a custom domain.

- [ ] **Step 3: Verify that deploy-on-push is enabled only for `master`**

Expected:
- The app source config shows:
  ```text
  branch = master
  deploy_on_push = true
  ```
- No production app source points to `deploy`.

### Task 3: Verify the initial App Platform deployment

**Files:**
- External system: DigitalOcean App Platform deployment status
- Test: initial deployment status and public URL reachability

- [ ] **Step 1: Check the active deployment status**

Query the newly created app’s active deployment.
Expected:
- Deployment reaches a healthy or active state.
- If build fails, capture the failing phase before any retry.

- [ ] **Step 2: Verify the frontend loads from the default App Platform URL**

Expected:
- The entry page responds successfully.
- Static assets such as CSS and JS bundles are served.

- [ ] **Step 3: Verify that the frontend points to the backend public API domain**

Use the deployed frontend and confirm the built bundle/runtime config reflects:
```text
API_BASE_URL=https://api.infinite-track.tech
```
Expected:
- No production path still depends on local `/api` proxy assumptions.
- No production path relies on `localhost`.

- [ ] **Step 4: Verify no obvious development-mode fallback is active**

Check the deployed behavior against the design constraints:
- `APP_ENVIRONMENT=production`
- `DEBUG_MODE=false`
- `LOG_LEVEL=error`

Expected:
- Production build does not intentionally expose development-only behavior.
- The deployment can be described as production-configured, even before custom-domain attachment.

### Task 4: Attach the production frontend domain

**Files:**
- External system: DigitalOcean App Platform domain config
- External system: DigitalOcean DNS zone `infinite-track.tech`
- Test: domain attachment status

- [ ] **Step 1: Choose the frontend production hostname**

Use one of these approved patterns:
```text
www.infinite-track.tech
app.infinite-track.tech
```

Expected:
- The selected hostname does not conflict with the existing API hostname `api.infinite-track.tech`.

- [ ] **Step 2: Attach the chosen frontend hostname to the App Platform app**

Expected:
- The app accepts the custom domain configuration.
- TLS management is delegated to App Platform.

- [ ] **Step 3: Verify the DNS requirements for the attached domain**

Expected:
- Required DNS records are visible from the app/domain configuration.
- The frontend domain remains clearly separated from `api.infinite-track.tech`.

- [ ] **Step 4: Wait for domain status to become ready or record what remains**

Expected:
- If the domain becomes active immediately, note that it is production-routable.
- If DNS propagation remains pending, note the exact pending state and keep the default App Platform URL as the temporary access path.

### Task 5: Record the created production frontend surface

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT.md`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT-CHECKLIST.md`
- Test: source inspection only

- [ ] **Step 1: Add a short App Platform production note to `DEPLOYMENT.md`**

Append a section like this near the deployment options or production hosting section:

```md
## DigitalOcean App Platform Production Frontend

Production frontend hosting uses DigitalOcean App Platform Static Site.

- Repo: `Infinite-LearningV1/Infinite_Track_Fe`
- Branch: `master`
- Build command: `npm run build`
- Output directory: `build`
- Backend API target: `https://api.infinite-track.tech`

This frontend deployment is intentionally separated from the backend Docker runtime.
```

- [ ] **Step 2: Add a concise operational note to `DEPLOYMENT-CHECKLIST.md`**

Add a checklist block like:

```md
### DigitalOcean App Platform Production

- [ ] App Platform static site exists
- [ ] Source branch is `master`
- [ ] Build command is `npm run build`
- [ ] Output directory is `build`
- [ ] `API_BASE_URL` points to `https://api.infinite-track.tech`
- [ ] Frontend domain is separate from `api.infinite-track.tech`
```

- [ ] **Step 3: Commit the deployment-surface documentation update**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add DEPLOYMENT.md DEPLOYMENT-CHECKLIST.md
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: record app platform frontend deployment"
```
Expected:
- One docs-only commit describing the new production frontend surface.

### Task 6: Final verification and handoff

**Files:**
- External system: DigitalOcean App Platform app info
- External system: DigitalOcean domain info
- Test: deployment verification summary

- [ ] **Step 1: Re-check the app state after domain and deploy setup**

Expected:
- App still reports a healthy deployment.
- Source remains locked to `master`.

- [ ] **Step 2: Produce the final production frontend summary**

Write down the following exact fields for handoff:

```text
App name:
App ID:
Default App Platform URL:
Custom frontend domain:
Source repo:
Source branch:
Build command:
Output directory:
API_BASE_URL:
Deployment status:
Outstanding follow-up:
```

Expected:
- Every field is filled with the real created state, or explicitly marked pending if DNS propagation is still in progress.

- [ ] **Step 3: Commit any remaining intentional repo changes**

If only the docs in Task 5 changed, no extra commit is needed.
If other repo files were intentionally modified during implementation, commit them explicitly with a scoped message.

Expected:
- Git history reflects only intentional repository changes.
