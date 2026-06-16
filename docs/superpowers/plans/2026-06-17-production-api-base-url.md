# Production API Base URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fix production Web FE build-time API configuration so the static frontend calls the real backend under the `/api` prefix.

**Architecture:** The Web FE composes API URLs from `API_BASE_URL` and endpoint fragments. Local development keeps `API_BASE_URL=/api` and uses Webpack proxy; production static deploy has no dev proxy, so `API_BASE_URL` must include the public backend API prefix.

**Tech Stack:** Webpack DefinePlugin, dotenv-style build-time env files, static hosting deployment documentation.

---

### Task 1: Update production env example

**Files:**
- Modify: `.env.production.example:10-12`

- [x] **Step 1: Change production API base URL to include `/api`**

Replace:

```env
API_BASE_URL=https://api.infinite-track.tech
API_AUTH_ENDPOINT=/auth
```

With:

```env
API_BASE_URL=https://api.infinite-track.tech/api
API_AUTH_ENDPOINT=/auth
```

- [x] **Step 2: Keep URL composition non-duplicated**

Confirm final production auth URL composition remains:

```text
https://api.infinite-track.tech/api/auth/login
```

and operational settings composition remains:

```text
https://api.infinite-track.tech/api/settings/operational
```

### Task 2: Update deployment documentation

**Files:**
- Modify: `DEPLOYMENT.md:70-90`
- Modify: `DEPLOYMENT-CHECKLIST.md:9-15`
- Modify: `DEPLOYMENT-CHECKLIST.md:133-144`

- [x] **Step 1: Update general production examples**

Use examples that explicitly state whether the backend already includes an `/api` prefix. For Infinite Track production, use:

```env
API_BASE_URL=https://api.infinite-track.tech/api
API_AUTH_ENDPOINT=/auth
```

- [x] **Step 2: Add verification note**

Document that `https://api.infinite-track.tech/api/settings/operational` should return an auth-required response such as `401`, while missing-prefix routes such as `https://api.infinite-track.tech/settings/operational` are not the Web FE production contract.

### Task 3: Verify consistency

**Files:**
- Inspect: `.env.production.example`
- Inspect: `DEPLOYMENT.md`
- Inspect: `DEPLOYMENT-CHECKLIST.md`

- [x] **Step 1: Search for stale Infinite Track production base URL**

Run:

```bash
rg "API_BASE_URL=https://api\.infinite-track\.tech$|https://api\.infinite-track\.tech/settings" .env.production.example DEPLOYMENT.md DEPLOYMENT-CHECKLIST.md
```

Expected: no matches.

- [x] **Step 2: Search for corrected production base URL**

Run:

```bash
rg "API_BASE_URL=https://api\.infinite-track\.tech/api|https://api\.infinite-track\.tech/api/settings/operational" .env.production.example DEPLOYMENT.md DEPLOYMENT-CHECKLIST.md
```

Expected: matches in the env example and deployment docs/checklist.

- [x] **Step 3: Read-only endpoint sanity check**

Run:

```bash
curl -I https://api.infinite-track.tech/api/settings/operational
```

Expected: endpoint exists and does not return `404`; unauthenticated `401` is acceptable.
