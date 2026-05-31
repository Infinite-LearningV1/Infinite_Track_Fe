# Lightweight Runtime Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep frontend runtime config local-first for active development while explicitly documenting the public deploy contract and removing config/documentation drift.

**Architecture:** Make `webpack.config.js` the single source of truth for public compile-time env defaults, keep `src/js/config/env.js` as a consumer of injected values, split local/dev and deploy/public examples into separate env templates, and align deployment docs with the same contract. Verification relies on webpack builds plus source inspection because this is a config/documentation change rather than a behavior change with an existing automated test harness.

**Tech Stack:** Webpack 5, dotenv, DefinePlugin, vanilla JS frontend modules, Markdown deployment docs

---

## File Structure Map

- `webpack.config.js` — source of truth for public compile-time defaults injected into the static bundle.
- `src/js/config/env.js` — frontend runtime config reader; should consume injected values, not redefine default policy.
- `.env.example` — local/dev public config template; must reflect active local-first flow.
- `.env.production.example` — new public deploy contract template; must reflect target production values without becoming the active default.
- `DEPLOYMENT.md` — primary deployment guide; must explain local-first default vs production contract.
- `DEPLOYMENT-CHECKLIST.md` — operational checklist; must use repo-specific production contract values.
- `ANALISIS-PROJECT.md` — secondary analysis doc; should stop claiming env templates are missing and instead describe the actual drift.
- `repomix-output.md` — committed repo snapshot; update only the runtime-config statements that would otherwise directly mislead readers.

### Task 1: Make webpack the single source of truth for public runtime defaults

**Files:**

- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/webpack.config.js:1-186`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/config/env.js:1-113`
- Test: config-only verification via `npm run build`

- [ ] **Step 1: Capture the current duplicated fallback behavior**

Run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- webpack.config.js src/js/config/env.js
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/webpack.config.js"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/src/js/config/env.js"),
]
for file in files:
    print(f"\n== {file.name} ==")
    for i, line in enumerate(file.read_text().splitlines(), start=1):
        if "API_BASE_URL" in line or "DEBUG_MODE" in line or "APP_ENVIRONMENT" in line:
            print(f"{i}: {line}")
PY
```

Expected:

- No diff before editing.
- Output shows fallback defaults duplicated in both files, including `/api` in `webpack.config.js` and `src/js/config/env.js`.

- [ ] **Step 2: Replace the DefinePlugin block with a single `publicFrontendEnv` map**

In `E:/skrisi/clonefee/Infinite_Track_Fe/webpack.config.js`, add this block near the top after `require("dotenv").config();`:

```js
const publicFrontendEnv = {
  API_BASE_URL: process.env.API_BASE_URL || "/api",
  API_AUTH_ENDPOINT: process.env.API_AUTH_ENDPOINT || "/auth",
  API_VERSION: process.env.API_VERSION || "v1",
  APP_NAME: process.env.APP_NAME || "Infinite Track",
  APP_VERSION: process.env.APP_VERSION || "2.0.1",
  APP_ENVIRONMENT: process.env.APP_ENVIRONMENT || "development",
  SESSION_TIMEOUT: process.env.SESSION_TIMEOUT || "3600000",
  REMEMBER_ME_DAYS: process.env.REMEMBER_ME_DAYS || "7",
  DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE || "id",
  TIMEZONE: process.env.TIMEZONE || "Asia/Jakarta",
  DEBUG_MODE: process.env.DEBUG_MODE || "false",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};
```

Then replace the current `new webpack.DefinePlugin({ ... })` block with:

```js
    // Public frontend runtime config compiled into the static bundle.
    // Keep local development local-first by default; production/public values
    // must be injected explicitly during the build.
    new webpack.DefinePlugin(
      Object.fromEntries(
        Object.entries(publicFrontendEnv).map(([key, value]) => [
          `process.env.${key}`,
          JSON.stringify(value),
        ]),
      ),
    ),
```

- [ ] **Step 3: Remove duplicated fallback policy from `src/js/config/env.js` and document the public-only rule**

Replace the header comment and config reads in `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/config/env.js` with the following exact snippets.

Replace the top comment with:

```js
/**
 * Public frontend environment configuration.
 * Values here are compiled into the static bundle via webpack.DefinePlugin.
 * Keep fallback/default policy in webpack.config.js and never put secrets here.
 */
```

Replace the `API_CONFIG` block with:

```js
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL,
  AUTH_ENDPOINT: process.env.API_AUTH_ENDPOINT,
  VERSION: process.env.API_VERSION,
```

Replace the `APP_CONFIG` block header with:

```js
export const APP_CONFIG = {
  NAME: process.env.APP_NAME,
  VERSION: process.env.APP_VERSION,
  ENVIRONMENT: process.env.APP_ENVIRONMENT,
```

Replace the remaining fallback reads with:

```js
export const AUTH_CONFIG = {
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT, 10),
  REMEMBER_ME_DAYS: parseInt(process.env.REMEMBER_ME_DAYS, 10),
```

```js
export const LOCALE_CONFIG = {
  DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE,
  TIMEZONE: process.env.TIMEZONE,
};
```

```js
export const DEBUG_CONFIG = {
  MODE: process.env.DEBUG_MODE === "true",
  LOG_LEVEL: process.env.LOG_LEVEL,
```

- [ ] **Step 4: Run the build to verify the refactor preserved existing behavior**

Run:

```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build
```

Expected:

- Build completes successfully.
- `build/bundle.js` is regenerated without syntax errors.

- [ ] **Step 5: Commit the source-of-truth refactor**

Run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add webpack.config.js src/js/config/env.js
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "refactor: centralize public frontend runtime defaults"
```

Expected:

- One commit containing only the runtime source-of-truth cleanup.

### Task 2: Split local/dev and production/public env contracts

**Files:**

- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/.env.example:1-42`
- Create: `E:/skrisi/clonefee/Infinite_Track_Fe/.env.production.example`
- Test: env-template inspection plus build verification in Task 5

- [ ] **Step 1: Rewrite `.env.example` as the local-first template**

Replace the full contents of `E:/skrisi/clonefee/Infinite_Track_Fe/.env.example` with:

```env
# Local development template for public frontend config
# Safe to commit. All values here are compiled into the static bundle.
# Do not place secrets in this file.

# API Configuration
API_BASE_URL=/api
API_AUTH_ENDPOINT=/auth
API_VERSION=v1

# Application Configuration
APP_NAME=Infinite Track
APP_VERSION=2.0.1
APP_ENVIRONMENT=development

# Authentication Configuration
SESSION_TIMEOUT=3600000
REMEMBER_ME_DAYS=7

# Frontend Configuration
DEFAULT_LANGUAGE=id
TIMEZONE=Asia/Jakarta

# Debug Configuration
DEBUG_MODE=true
LOG_LEVEL=debug
```

- [ ] **Step 2: Create `.env.production.example` as the explicit deploy/public contract**

Create `E:/skrisi/clonefee/Infinite_Track_Fe/.env.production.example` with:

```env
# Production/public contract template for the static frontend build
# Safe to commit. All values here are compiled into the static bundle.
# This is the deploy target contract, not the active local default.

# API Configuration
API_BASE_URL=https://api.infinite-track.tech
API_AUTH_ENDPOINT=/auth
API_VERSION=v1

# Application Configuration
APP_NAME=Infinite Track
APP_VERSION=2.0.1
APP_ENVIRONMENT=production

# Authentication Configuration
SESSION_TIMEOUT=3600000
REMEMBER_ME_DAYS=7

# Frontend Configuration
DEFAULT_LANGUAGE=id
TIMEZONE=Asia/Jakarta

# Debug Configuration
DEBUG_MODE=false
LOG_LEVEL=error
```

- [ ] **Step 3: Verify drift keys were removed from the env contract surface**

Run:

```bash
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/.env.example"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/.env.production.example"),
]
for name in [
    "CSRF_TOKEN_NAME",
    "COOKIE_SECURE",
    "COOKIE_SAME_SITE",
    "DEV_SERVER_PORT",
    "DEV_SERVER_HOST",
    "GOOGLE_ANALYTICS_ID",
    "FIREBASE_API_KEY",
    "SENTRY_DSN",
]:
    hits = []
    for file in files:
        if name in file.read_text():
            hits.append(file.name)
    print(name, hits)
PY
```

Expected:

- Every printed hit list is `[]`.

- [ ] **Step 4: Review the env templates in a single diff**

Run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- .env.example .env.production.example
```

Expected:

- `.env.example` is clearly local-first.
- `.env.production.example` clearly points to `https://api.infinite-track.tech`.

- [ ] **Step 5: Commit the env contract changes**

Run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add .env.example .env.production.example
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: split local and production frontend env templates"
```

Expected:

- One commit containing only env-template changes.

### Task 3: Align primary deployment docs with the real runtime contract

**Files:**

- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT.md:66-88`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT-CHECKLIST.md:1-130`
- Test: doc inspection with targeted search

- [ ] **Step 1: Update the deployment guide to separate active local behavior from deploy target**

In `E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT.md`, replace the current config section that begins with `**Konfigurasi WAJIB yang harus diubah:**` with:

````md
**Contract yang perlu dipahami:**

- **Aktif sekarang (local/dev):** frontend default ke `API_BASE_URL=/api` dan dev server mem-proxy request ke backend local.
- **Target deploy/public:** build production harus menginjeksi `API_BASE_URL=https://api.infinite-track.tech`.
- Semua env frontend di project ini bersifat public-safe karena dikompilasi ke static bundle.

```env
# Example deploy/public contract (.env.production)
API_BASE_URL=https://api.infinite-track.tech
APP_ENVIRONMENT=production
DEBUG_MODE=false
LOG_LEVEL=error
```
````

````

Then replace the table rows with:

```md
| Variable          | Local / Active Now | Target Production                | Keterangan                                      |
| ----------------- | ------------------ | -------------------------------- | ----------------------------------------------- |
| `API_BASE_URL`    | `/api`             | `https://api.infinite-track.tech` | Local default tetap `/api`; production inject explicit |
| `APP_ENVIRONMENT` | `development`      | `production`                     | Menentukan mode aplikasi                        |
| `DEBUG_MODE`      | `true` (template)  | `false`                          | Matikan debug di production                     |
| `LOG_LEVEL`       | `debug`            | `error`                          | Minimalkan log di production                    |
````

````

- [ ] **Step 2: Update the checklist doc to use the repo-specific production contract**

In `E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT-CHECKLIST.md`, replace the top env example block with:

```md
**File: `.env.production`** (buat manual, tidak di-commit ke git, gunakan `.env.production.example` sebagai acuan)

```env
API_BASE_URL=https://api.infinite-track.tech
API_AUTH_ENDPOINT=/auth
API_VERSION=v1
APP_NAME=Infinite Track
APP_VERSION=2.0.1
APP_ENVIRONMENT=production
SESSION_TIMEOUT=3600000
REMEMBER_ME_DAYS=7
DEFAULT_LANGUAGE=id
TIMEZONE=Asia/Jakarta
DEBUG_MODE=false
LOG_LEVEL=error
````

````

Then replace the backend integration examples with:

```md
Contoh konfigurasi Infinite Track:

- Backend public target: `https://api.infinite-track.tech`
- Frontend public target: `https://infinite-track.tech`
- Local development aktif tetap memakai `/api` melalui webpack dev proxy
````

````

- [ ] **Step 3: Search the primary docs for stale placeholder domains**

Run:
```bash
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT.md"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT-CHECKLIST.md"),
]
needles = ["api.yourdomain.com", "yourdomain.com", "192.168.1.100:3005"]
for file in files:
    print(f"\n== {file.name} ==")
    text = file.read_text()
    for needle in needles:
        print(needle, text.count(needle))
PY
````

Expected:

- `api.yourdomain.com` count is `0` in both files.
- Generic `yourdomain.com` placeholders tied to the runtime contract are removed.

- [ ] **Step 4: Review the doc diff before committing**

Run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- DEPLOYMENT.md DEPLOYMENT-CHECKLIST.md
```

Expected:

- Docs clearly distinguish local-first active behavior from production contract.
- Repo-specific domains match `https://infinite-track.tech` and `https://api.infinite-track.tech`.

- [ ] **Step 5: Commit the primary documentation updates**

Run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add DEPLOYMENT.md DEPLOYMENT-CHECKLIST.md
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: align deployment guides with runtime config contract"
```

Expected:

- One commit containing only primary deployment doc fixes.

### Task 4: Clean secondary runtime-config drift in analysis artifacts

**Files:**

- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/ANALISIS-PROJECT.md:131-159`
- Modify: `E:/skrisi/clonefee/repomix-output.md`
- Test: targeted search for stale claims and stale production URLs

- [ ] **Step 1: Correct the analysis doc so it describes drift, not a missing env system**

In `E:/skrisi/clonefee/Infinite_Track_Fe/ANALISIS-PROJECT.md`, replace the current problem/solution bullets with:

```md
**Masalah:**

- `.env.example` ada, tetapi masih drift terhadap runtime local-first yang aktif
- Belum ada `.env.production.example` untuk contract deploy/public yang eksplisit
- `API_BASE_URL` default runtime masih `/api` untuk development proxy

**Dampak:**

- ❌ Developer bisa salah menganggap frontend seharusnya default ke API public
- ❌ Build production berisiko tidak konsisten bila contract deploy tidak dipisahkan dari local template
- ❌ Dokumentasi deployment bisa menyesatkan karena mencampur active default dan target deploy

**Solusi:** ✅ TARGETKAN PERBAIKAN

- Realign `.env.example` menjadi local-first
- Tambahkan `.env.production.example` sebagai contract deploy/public
- Update docs agar target production memakai `https://api.infinite-track.tech` tanpa mengubah default aktif saat ini
```

````

- [ ] **Step 2: Update the repomix snapshot only where it makes runtime-config claims**

Apply these literal string replacements in `E:/skrisi/clonefee/repomix-output.md`:

```text
Replace: API_BASE_URL=https://api.yourdomain.com
With:    API_BASE_URL=https://api.infinite-track.tech

Replace: | `API_BASE_URL`    | `/api`        | `https://api.yourdomain.com` | **WAJIB diubah!**             |
With:    | `API_BASE_URL`    | `/api`        | `https://api.infinite-track.tech` | Local default tetap `/api`; inject explicit saat deploy |

Replace: - Tidak ada file `.env.production` atau `.env.example`
With:    - `.env.example` ada, tetapi masih drift dari runtime local-first

Replace: - Update `API_BASE_URL` sesuai backend production
With:    - Gunakan `https://api.infinite-track.tech` untuk contract deploy/public, tanpa mengubah default lokal `/api`
````

- [ ] **Step 3: Verify the secondary docs no longer advertise the old placeholder domain**

Run:

```bash
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/ANALISIS-PROJECT.md"),
    Path(r"E:/skrisi/clonefee/repomix-output.md"),
]
needles = [
    "https://api.yourdomain.com",
    "Tidak ada file `.env.production` atau `.env.example`",
    "Update `API_BASE_URL` sesuai backend production",
]
for file in files:
    print(f"\n== {file.name} ==")
    text = file.read_text(encoding="utf-8", errors="ignore")
    for needle in needles:
        print(needle, text.count(needle))
PY
```

Expected:

- Each stale runtime-config claim shows count `0`.

- [ ] **Step 4: Review the secondary-doc diff**

Run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- ANALISIS-PROJECT.md
```

Run:

```bash
git -C "E:/skrisi/clonefee" diff -- repomix-output.md
```

Expected:

- Only runtime-config drift is edited.
- No unrelated generated content is reformatted.

- [ ] **Step 5: Commit the secondary drift cleanup**

Run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add ANALISIS-PROJECT.md
git -C "E:/skrisi/clonefee" add repomix-output.md
git -C "E:/skrisi/clonefee" commit -m "docs: clean runtime config drift in analysis artifacts"
```

Expected:

- One commit containing only the secondary runtime-config cleanup.

### Task 5: Verify local-first behavior, production contract, and public-only bundle inputs

**Files:**

- Modify temporarily during verification: `E:/skrisi/clonefee/Infinite_Track_Fe/.env` (backup/restore if present)
- Test: `E:/skrisi/clonefee/Infinite_Track_Fe/build/bundle.js`

- [ ] **Step 1: Back up any existing local `.env` before verification**

Run:

```bash
if [ -f "E:/skrisi/clonefee/Infinite_Track_Fe/.env" ]; then
  cp "E:/skrisi/clonefee/Infinite_Track_Fe/.env" "E:/skrisi/clonefee/Infinite_Track_Fe/.env.backup-runtime-config"
fi
```

Expected:

- Existing local `.env` is preserved if present.

- [ ] **Step 2: Verify the local-first contract using `.env.example`**

Run:

```bash
cp "E:/skrisi/clonefee/Infinite_Track_Fe/.env.example" "E:/skrisi/clonefee/Infinite_Track_Fe/.env"
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build
python - <<'PY'
from pathlib import Path
bundle = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/build/bundle.js").read_text(encoding="utf-8", errors="ignore")
print("/api present:", "/api" in bundle)
print("public API present:", "https://api.infinite-track.tech" in bundle)
PY
```

Expected:

- Build succeeds.
- `/api present: True`
- `public API present: False`

- [ ] **Step 3: Verify the production/public contract using `.env.production.example`**

Run:

```bash
cp "E:/skrisi/clonefee/Infinite_Track_Fe/.env.production.example" "E:/skrisi/clonefee/Infinite_Track_Fe/.env"
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build
python - <<'PY'
from pathlib import Path
bundle = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/build/bundle.js").read_text(encoding="utf-8", errors="ignore")
print("public API present:", "https://api.infinite-track.tech" in bundle)
print("local proxy string present:", '"/api"' in bundle)
PY
```

Expected:

- Build succeeds.
- `public API present: True`
- The compiled bundle reflects the explicit production contract.

- [ ] **Step 4: Restore the developer’s original `.env` and confirm no secret-like keys were introduced into public config**

Run:

```bash
rm -f "E:/skrisi/clonefee/Infinite_Track_Fe/.env"
if [ -f "E:/skrisi/clonefee/Infinite_Track_Fe/.env.backup-runtime-config" ]; then
  mv "E:/skrisi/clonefee/Infinite_Track_Fe/.env.backup-runtime-config" "E:/skrisi/clonefee/Infinite_Track_Fe/.env"
fi
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/webpack.config.js"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/src/js/config/env.js"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/.env.example"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/.env.production.example"),
]
forbidden = [
    "SECRET",
    "TOKEN",
    "PASSWORD",
    "PRIVATE_KEY",
    "ACCESS_KEY",
    "API_KEY",
]
for file in files:
    text = file.read_text(encoding="utf-8", errors="ignore")
    hits = [term for term in forbidden if term in text]
    print(file.name, hits)
PY
```

Expected:

- The original `.env` is restored if it existed.
- No new secret-like keys are introduced into the frontend public config surface.

- [ ] **Step 5: Commit the final verified state**

Run:

```bash
git -C "E:/skrisi/clonefee" status --short
git -C "E:/skrisi/clonefee" commit -m "chore: lock local-first frontend runtime config contract"
```

Expected:

- Working tree shows only the planned runtime-config files.
- Final commit lands only after all verification steps pass.

```

## Self-Review Notes
- Spec coverage: covered runtime source of truth, local/dev template, production/public contract template, primary docs, secondary drift cleanup, and final verification.
- Placeholder scan: removed TBD/TODO language; every task has exact file paths, snippets, and commands.
- Type consistency: `publicFrontendEnv` keys match the `process.env.*` keys consumed in `src/js/config/env.js` and the env example files.
```
