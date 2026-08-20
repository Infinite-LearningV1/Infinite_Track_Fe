# INF-277 Web FE Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Web FE-owned Nginx/Docker runtime ownership, make Webpack Dev Server the canonical local runtime, and preserve the static production/API contracts without changing application semantics.

**Architecture:** Development becomes `Browser -> Webpack Dev Server :3000 -> /api proxy -> independently owned Backend :3005`. Production remains static Web FE at `https://infinite-track.tech`, while API traffic goes directly to `https://api.infinite-track.tech/api` and enters the backend-owned Nginx/Express stack.

**Tech Stack:** Node.js 20+, Webpack 5, webpack-dev-server 5, Node built-in test runner, Markdown ADRs, Git.

**Spec:** `docs/superpowers/specs/2026-08-20-inf-277-web-fe-runtime-boundary-design.md`

## Global Constraints

- Work only in the isolated INF-277 worktree/branch; never edit `develop` directly.
- Do not change auth/session semantics, API endpoint contracts, CORS ownership, or backend code.
- Do not reintroduce Nginx, another reverse proxy, or a Web FE-owned backend service.
- Development `API_BASE_URL` remains `/api`.
- Development proxy fallback remains `http://localhost:3005`.
- Production API base remains `https://api.infinite-track.tech/api`.
- Production Web FE remains a static `build/` artifact.
- Backend production Nginx remains owned by INF-278 and must not be modified here.
- Existing global lint debt is baseline debt; INF-277 must not expand it.

---## File Structure

### Delete

- `.dockerignore` — obsolete Docker build context policy after container runtime removal.
- `compose.yaml` — obsolete Web FE-owned gateway/backend/container orchestration.
- `Dockerfile` — obsolete staging artifact container build path.
- `Dockerfile.dev` — obsolete containerized Webpack development path.
- `docker/nginx/dev.conf` — obsolete local Nginx gateway.
- `docker/nginx/staging.conf` — obsolete staging Nginx static/proxy gateway.
- `docker/nginx/select-config.sh` — obsolete Nginx mode selector.

### Modify

- `webpack.config.js:50-69` — keep direct WDS behavior and harden `allowedHosts`.
- `README.md:29-63,137-159` — document canonical dev/runtime/deployment boundary.
- `docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md:17-83` — record the locked runtime ownership decision.
- `docs/adr/index.md:20-34` — refresh ADR-006 last-updated metadata while retaining honest status.

### Create

- `tests/infra/web-runtime-contract.test.js` — repository-level regression contract for WDS/env/runtime-file invariants.

No `src/js/services/**`, auth store, page feature, or backend file is part of this implementation.

---

### Task 1: Lock the Web FE Runtime Contract and Remove Obsolete Container Ownership

**Files:**
- Create: `tests/infra/web-runtime-contract.test.js`
- Modify: `webpack.config.js:50-69`
- Delete: `.dockerignore`, `compose.yaml`, `Dockerfile`, `Dockerfile.dev`, `docker/nginx/dev.conf`, `docker/nginx/staging.conf`, `docker/nginx/select-config.sh`
**Interfaces:**
- Consumes: repository file layout, `webpack.config.js`, `.env.example`, `.env.production.example`.
- Produces: direct WDS runtime contract; absence of Web FE-owned Docker/Nginx runtime; regression test used by all later tasks.

- [ ] **Step 1: Create the failing runtime contract test**

Create `tests/infra/web-runtime-contract.test.js` with this exact structure:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "../..");
const read = (relativePath) =>
  fs.readFileSync(path.resolve(ROOT, relativePath), "utf8");

const REMOVED_RUNTIME_PATHS = [
  ".dockerignore",
  "compose.yaml",
  "Dockerfile",
  "Dockerfile.dev",
  "docker/nginx/dev.conf",
  "docker/nginx/staging.conf",
  "docker/nginx/select-config.sh",
];
```
Append the contract assertions:

```js
test("Webpack Dev Server owns the local frontend runtime", () => {
  const webpackConfig = read("webpack.config.js");

  assert.match(webpackConfig, /allowedHosts:\s*"auto"/);
  assert.match(webpackConfig, /port:\s*3000/);
  assert.match(webpackConfig, /context:\s*\["\/api"\]/);
  assert.match(
    webpackConfig,
    /process\.env\.WEBPACK_API_PROXY_TARGET\s*\|\|\s*"http:\/\/localhost:3005"/,
  );
});

test("development and production API bases remain explicit", () => {
  assert.match(read(".env.example"), /^API_BASE_URL=\/api$/m);
  assert.match(
    read(".env.production.example"),
    /^API_BASE_URL=https:\/\/api\.infinite-track\.tech\/api$/m,
  );
});

test("Web FE no longer owns Docker or Nginx runtime files", () => {
  for (const relativePath of REMOVED_RUNTIME_PATHS) {
    assert.equal(fs.existsSync(path.resolve(ROOT, relativePath)), false);
  }
});
```
- [ ] **Step 2: Run the targeted test and confirm the expected red state**

Run:

```bash
node --test tests/infra/web-runtime-contract.test.js
```

Expected: FAIL because `webpack.config.js` still contains `allowedHosts: "all"` and the Docker/Nginx runtime files still exist. The env-contract test may already pass; the suite as a whole must be red before implementation.

- [ ] **Step 3: Harden the Webpack host policy without changing proxy semantics**

Change only this property in `webpack.config.js`:

```js
const devServer = {
  static: {
    directory: path.join(__dirname, "build"),
  },
  host: process.env.WEBPACK_DEV_HOST || "127.0.0.1",
  allowedHosts: "auto",
  compress: true,
  port: 3000,
  hot: true,
  open: process.env.WEBPACK_OPEN === "true",
  historyApiFallback: true,
  // existing /api proxy remains unchanged
};
```

Do not change the `/api` context, fallback target, `changeOrigin`, or development port.
- [ ] **Step 4: Delete the obsolete Web FE container runtime**

Remove exactly these tracked files:

```text
.dockerignore
compose.yaml
Dockerfile
Dockerfile.dev
docker/nginx/dev.conf
docker/nginx/staging.conf
docker/nginx/select-config.sh
```

After deletion, remove the now-empty `docker/nginx/` and `docker/` directories from the worktree filesystem. Do not add a replacement Compose file or static server.

- [ ] **Step 5: Run the targeted contract test and auth regression test**

Run:

```bash
node --test tests/infra/web-runtime-contract.test.js
npm run test:auth-runtime
```

Expected: runtime contract PASS; auth runtime PASS with 40 tests and 0 failures unless `origin/develop` changed after this plan was written. Any auth regression must stop the task because INF-277 must not change session semantics.

- [ ] **Step 6: Inspect the bounded diff**

Run:

```bash
git diff -- webpack.config.js tests/infra/web-runtime-contract.test.js
git status --short
```

Expected: only the test, the one Webpack property change, and the seven runtime-file deletions are present.
- [ ] **Step 7: Commit the runtime ownership change**

Run:

```bash
git add webpack.config.js tests/infra/web-runtime-contract.test.js .dockerignore compose.yaml Dockerfile Dockerfile.dev docker/nginx/dev.conf docker/nginx/staging.conf docker/nginx/select-config.sh
git commit -m "refactor(infra): remove Web FE nginx runtime"
```

Expected: one bounded implementation commit covering the runtime contract, Webpack hardening, and removal of obsolete container ownership.

---

### Task 2: Reconcile Canonical README and ADR Runtime Truth

**Files:**
- Modify: `README.md:29-63,137-159`
- Modify: `docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md:17-83`
- Modify: `docs/adr/index.md:20-34`

**Interfaces:**
- Consumes: the runtime contract established by Task 1.
- Produces: canonical operator/developer documentation consistent with implementation; ADR-006 remains the durable architecture record.

- [ ] **Step 1: Update README local development guidance**

Immediately after the existing Getting Started command block, add a concise runtime-boundary subsection with this content:

```markdown
### Local runtime boundary

Web FE runs directly on Webpack Dev Server at `http://localhost:3000`.
The backend is started independently from the backend repository and must listen on `http://localhost:3005` for the default local integration path.
Webpack proxies browser requests under `/api/*` to that backend target, so local browser code keeps `API_BASE_URL=/api`.

Web FE does not require Nginx, Docker Compose, or a Web FE-owned backend container for canonical local development.
```
- [ ] **Step 2: Make README production ownership explicit**

In `## Deployment`, keep the existing release branch, build command, output directory, frontend URL, and API base. Add these two rows:

```markdown
| Hosting model      | DigitalOcean App Platform Static Site |
| Backend ingress    | Backend-owned Nginx at `api.infinite-track.tech` |
```

Follow the deployment diagram with this boundary note:

```markdown
The Web FE production artifact is static `build/` content. The Web FE repository does not own a production Nginx runtime. Browser API traffic goes directly to `https://api.infinite-track.tech/api`; backend ingress/TLS remains a backend responsibility.
```

Do not add backend deployment commands to this repository.

- [ ] **Step 3: Update ADR-006 facts and decision**

Add these repository/runtime facts to the existing `### Fact` list:

```markdown
- Webpack Dev Server is the canonical Web FE development server; the repository does not require a Web FE-owned Nginx gateway.
- Backend development runtime startup is owned by the backend repository; Web FE integrates through `WEBPACK_API_PROXY_TARGET` rather than owning a backend container.
- Production Web FE is a static artifact and the public backend ingress belongs to the backend repository.
```

Keep the existing facts about `build/`, `DefinePlugin`, `/api`, `localhost:3005`, production API base, and branch ownership.
Replace the ADR decision paragraph beginning `For local development` with wording equivalent to:

```markdown
For local development, Webpack Dev Server is the canonical Web FE runtime. `API_BASE_URL=/api` remains the browser-facing development base, and Webpack proxies `/api/*` to the independently started backend development runtime, defaulting to `http://localhost:3005` unless `WEBPACK_API_PROXY_TARGET` overrides it.

Web FE owns no Nginx runtime and no backend container lifecycle. For static production, the build receives the explicit public API base required by the target environment; the canonical production contract is `https://api.infinite-track.tech/api`. Backend public ingress, TLS, CORS policy, and Express runtime remain backend responsibilities.
```

Preserve the existing release-evidence rule: build success alone is not production health proof.

- [ ] **Step 4: Reconcile ADR evidence and metadata**

In ADR-006, update the CI evidence line so it matches current `.github/workflows/build.yml`:

```markdown
- `.github/workflows/build.yml` — Node.js 20 CI runs `npm ci`, `npm test`, and `npm run build` on `develop`/`master` PRs and pushes.
```

Add the INF-277 design spec to Evidence / References:

```markdown
- `docs/superpowers/specs/2026-08-20-inf-277-web-fe-runtime-boundary-design.md` — approved INF-277 runtime ownership design.
```

Keep ADR-006 status `Proposed` because production hosting/CORS/runtime evidence still contains external verification points. In `docs/adr/index.md`, change only ADR-006 `Last updated` from `2026-04-08` to `2026-08-20`.
- [ ] **Step 5: Review documentation for stale runtime ownership claims**

Run:

```bash
git grep -n -i -E "nginx|docker compose|compose.yaml|Dockerfile|backend container" -- README.md docs/adr
```

Expected: any remaining matches describe the **absence** of Web FE Nginx/container ownership, historical rationale, or backend-owned ingress. There must be no active instruction telling developers/operators to start a Web FE Nginx or backend container.

Also confirm the removed files are not referenced by active root documentation:

```bash
git grep -n -E "docker/nginx|nginx-dev|nginx-staging|GATEWAY_PORT" -- README.md docs .github package.json webpack.config.js
```

Expected: no canonical instruction depends on the removed runtime.

- [ ] **Step 6: Verify docs changes do not add whitespace/parser regressions**

Run:

```bash
git diff --check
git diff -- README.md docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md docs/adr/index.md
node --test tests/infra/web-runtime-contract.test.js
npm test
```

Expected: `git diff --check` PASS, runtime contract PASS, and full Node regression suite PASS. Existing repository-wide Prettier debt is handled in the final regression comparison rather than reformatted here.

- [ ] **Step 7: Commit the documentation truth update**

Run:

```bash
git add README.md docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md docs/adr/index.md
git commit -m "docs(infra): align Web FE runtime ownership"
```

---

### Task 3: Run the Full Automated Verification Matrix

**Files:**
- No source change is expected.
- If a verification failure reveals an INF-277 regression, return to the task that owns the failing file instead of patching unrelated code here.

**Interfaces:**
- Consumes: implementation commits from Tasks 1-2.
- Produces: fresh automated evidence for runtime contract, auth compatibility, full regression suite, production build, and bounded lint comparison.

- [ ] **Step 1: Run focused runtime and auth tests**

Run:

```bash
node --test tests/infra/web-runtime-contract.test.js
npm run test:auth-runtime
```

Expected: both commands PASS.

- [ ] **Step 2: Run the full repository regression suite**

Run:

```bash
npm test
```

Expected: PASS. Do not accept a new failing test as unrelated without proving it existed at the `528bfd3` baseline.

- [ ] **Step 3: Build with the normal production script**

Run:

```bash
npm run build
```

Expected: PASS and `build/` regenerated successfully.
- [ ] **Step 4: Build with the canonical production API base explicitly injected**

Run:

```bash
npx cross-env API_BASE_URL=https://api.infinite-track.tech/api APP_ENVIRONMENT=production npm run build
```

Then confirm the canonical API origin is present in the generated bundle:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('build/bundle.js','utf8'); if(!s.includes('https://api.infinite-track.tech/api')) process.exit(1); console.log('production API base embedded')"
```

Expected: build PASS and the bundle check prints `production API base embedded`.

- [ ] **Step 5: Re-run global lint and compare it with the recorded baseline**

Run:

```bash
npm run lint
```

Known baseline before INF-277: exit code `2`, including `src/partials/modal/export-report-modal.html:240` malformed closing `div` plus pre-existing Prettier warnings.

Expected for INF-277: no new parser error or warning attributable to files changed by INF-277. Do not mass-format `src/`, `tests/`, or `docs/` merely to make this unrelated baseline gate green.

- [ ] **Step 6: Run final diff hygiene checks**

Run:

```bash
git diff origin/develop...HEAD --check
git status --short --branch
git diff --stat origin/develop...HEAD
```

Expected: diff check PASS; branch contains only the approved spec, plan, runtime removal/config test, and canonical docs changes.
---

### Task 4: Verify Direct Development Runtime Against an Independently Started Backend

**Files:**
- No committed source change is expected.
- Temporary runtime edits used to observe HMR must be reverted before completion.

**Interfaces:**
- Consumes: backend development runtime from `E:\skrisi\backend\Infinit_Track_BE` listening on port `3005` and the Web FE WDS contract from Task 1.
- Produces: runtime evidence that Nginx/container removal did not break direct frontend access, `/api` proxying, HMR, or login/session behavior.

- [ ] **Step 1: Start the backend development runtime on port 3005 from the backend repository**

In a separate terminal, use the backend repository's current development command:

```powershell
Set-Location 'E:\skrisi\backend\Infinit_Track_BE'
$env:NODE_ENV='development'
$env:PORT='3005'
npm run dev
```

Use the existing authorized local backend environment/database configuration. Do not copy backend secrets into the Web FE repository.

Expected: backend reports a healthy development startup and listens on `localhost:3005`. If backend prerequisites are unavailable, record this runtime gate as blocked rather than changing Web FE architecture.

- [ ] **Step 2: Start Web FE directly with Webpack Dev Server**

In the INF-277 worktree:

```powershell
npm run start
```

Expected: WDS starts on `http://127.0.0.1:3000` without Nginx or Docker Compose.
- [ ] **Step 3: Verify direct frontend access and `/api` proxying**

From a third terminal:

```powershell
curl.exe -I http://127.0.0.1:3000/signin.html
curl.exe -i http://127.0.0.1:3000/api/auth/me
```

Expected:

- `signin.html` is served by WDS on port `3000`.
- `/api/auth/me` reaches the backend through WDS proxying and returns the backend's unauthenticated/session response when no valid browser session is supplied.
- No request path requires port `8080`, Nginx, or a `backend` Compose service.

- [ ] **Step 4: Verify HMR/WebSocket behavior without Nginx**

Open `http://127.0.0.1:3000` in a browser with DevTools Network visible. Make a temporary, non-semantic edit to a frontend source file already watched by Webpack (for example add/remove a CSS comment in `src/css/style.css`).

Expected: WDS detects the change and the browser receives the update/reload without an Nginx intermediary. Revert the temporary edit immediately and confirm `git status --short` does not retain it.

- [ ] **Step 5: Verify credentialed login/session flow**

Using the team's existing authorized non-production development account in the browser:

1. Open the signin page through `http://127.0.0.1:3000`.
2. Sign in through the proxied `/api/auth/login` flow.
3. Confirm the authenticated page loads and `/api/auth/me` succeeds in the browser session.
4. Refresh once and confirm the session remains valid according to the existing auth contract.
5. Sign out and confirm the existing logout behavior remains unchanged.

Do not log, commit, or copy credentials into test output or documentation.
- [ ] **Step 6: Record runtime evidence without changing architecture**

Capture the observed results for:

```text
WDS direct access :3000
/api proxy -> backend :3005
HMR without Nginx
login/session smoke
logout smoke
```

If any runtime gate is blocked by unavailable backend/database/test-account prerequisites, keep INF-277 open and name the missing evidence. Do not restore Nginx or Web FE-owned backend startup as a workaround.

---

### Task 5: Verify Cross-Repo Production Contract and Prepare Review Evidence

**Files:**
- No backend file may be modified from this Web FE branch.
- No new Web FE source file is expected unless review finds a genuine INF-277 defect.

**Interfaces:**
- Consumes: Web FE production origin/API contract plus backend-owned INF-278 evidence.
- Produces: PR/Linear evidence proving which criteria are satisfied locally and which require production/runtime confirmation.

- [ ] **Step 1: Confirm the Web FE production contract from repository source**

Run:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('.env.production.example','utf8'); if(!s.includes('API_BASE_URL=https://api.infinite-track.tech/api')) process.exit(1); console.log('API contract OK')"
git grep -n "https://infinite-track.tech\|https://api.infinite-track.tech/api" -- README.md .env.production.example docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md
```

Expected: canonical Web origin is `https://infinite-track.tech` and canonical API base is `https://api.infinite-track.tech/api`.
- [ ] **Step 2: Read, but do not edit, the backend-owned CORS contract**

Using the current INF-278 backend worktree if it still exists:

```powershell
Select-String -Path 'E:\skrisi\backend\Infinit_Track_BE\.worktrees\inf-278-production-nginx-hardening\deploy\env\backend.production.example' -Pattern '^CORS_ORIGIN='
```

Required production contract:

```text
CORS_ORIGIN=https://infinite-track.tech
```

If the backend-owned example/runtime evidence still points at a different Web origin, record that as an INF-278/backend follow-up. Do not edit backend configuration from INF-277.

Production runtime CORS is not proven by a repository example alone. INF-277 can only be marked fully complete when backend/production evidence confirms credentialed requests from `https://infinite-track.tech` are accepted.

- [ ] **Step 3: Produce final branch evidence**

Run:

```bash
git status --short --branch
git log --oneline origin/develop..HEAD
git diff --stat origin/develop...HEAD
git diff --name-status origin/develop...HEAD
```

Expected implementation shape:

```text
spec commit
plan commit
runtime/test removal commit
documentation/ADR commit
```

There must be no backend files, auth implementation files, attendance/business files, or unrelated formatting sweeps in the diff.

- [ ] **Step 4: Prepare PR evidence using repository governance headings**

The PR description must explicitly state:

```text
Tujuan task
Fakta
Asumsi
Perlu verifikasi
Risiko perubahan
Plan implementasi
File/area terdampak
Verification plan + fresh results
Docs / ADR update note
Review / PR / release / build notes
```
PR evidence must distinguish automated evidence from runtime/production evidence. Specifically report the known baseline `npm run lint` failure rather than presenting lint as green.

- [ ] **Step 5: Apply the completion gate before changing Linear status**

INF-277 may move to Done only when all issue acceptance criteria have evidence, including direct development runtime, HMR, login/session smoke, static production build contract, docs/ADR reconciliation, and production-origin/CORS verification.

If code/tests/docs are merged but external runtime/CORS evidence remains missing, keep INF-277 open and record the missing gate. A merged PR is not sufficient completion evidence.

## Stop Conditions

Stop implementation and return for review if any of these occur:

- removal requires changing auth/session or API semantics;
- direct WDS requires a replacement reverse proxy;
- backend must be modified to make local frontend startup possible;
- `npm test` gains a new failure attributable to INF-277;
- production build can no longer embed `https://api.infinite-track.tech/api`;
- runtime evidence contradicts the approved topology;
- the diff expands into unrelated lint/template cleanup.

## Planned Commit Sequence

```text
24e39df docs(infra): specify INF-277 web runtime boundary
<plan>   docs(infra): plan INF-277 runtime boundary implementation
<impl>   refactor(infra): remove Web FE nginx runtime
<docs>   docs(infra): align Web FE runtime ownership
```

Implementation commit hashes are intentionally unknown until execution; commit subjects and boundaries above are fixed by this plan.