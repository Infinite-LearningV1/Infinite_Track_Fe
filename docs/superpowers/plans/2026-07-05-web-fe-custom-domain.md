# Web FE Custom Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach `https://infinite-track.tech` as the final production origin for the Web FE App Platform deployment, keep the starter domain as technical fallback, and re-verify production health on the custom domain.

**Architecture:** Keep the existing DigitalOcean App Platform app, deployment source (`master`), build command (`npm run build`), output directory (`build`), and backend API target unchanged. Change only the public frontend origin by attaching the custom root domain, verifying DigitalOcean DNS/HTTPS, and then re-running production smoke against the new domain.

**Tech Stack:** DigitalOcean App Platform, DigitalOcean DNS, Web FE static build (`webpack` / `npm run build`), curl, browser-driven smoke verification, repo evidence docs.

## Global Constraints

- Final production origin for Web FE must be `https://infinite-track.tech`.
- Backend contract remains `API_BASE_URL=https://api.infinite-track.tech/api` and `API_AUTH_ENDPOINT=/auth`.
- Do not remove the starter domain `https://orca-app-58alv.ondigitalocean.app` during this change.
- Production app remains the existing App Platform app `infinite-track-fe-production`.
- Production source branch remains `master`.
- Production build command remains `npm run build`.
- Production output directory remains `build`.
- Accept the custom domain only after DNS resolution, HTTPS, Web FE shell load, and anonymous protected API `401`/not-`404` checks pass.
- DNS for `infinite-track.tech` is managed in DigitalOcean.
- Update production evidence/docs after the custom domain is accepted.

---

### Task 1: Inspect current App Platform domain and DNS baseline

**Files:**

- Modify: `docs/evidence/post-deploy-smoke-2026-07-05.md`
- Create: `docs/evidence/custom-domain-baseline-2026-07-05.md`
- Test: none

**Interfaces:**

- Consumes: Existing production app `infinite-track-fe-production`; current live URL `https://orca-app-58alv.ondigitalocean.app`
- Produces: Baseline evidence file documenting whether `infinite-track.tech` is already attached and what DNS state exists before changes

- [ ] **Step 1: Inspect current app domain state in DigitalOcean**

Use DigitalOcean MCP / dashboard and capture these exact facts:

```text
App name: infinite-track-fe-production
Current live domain: https://orca-app-58alv.ondigitalocean.app
Current custom domains attached: <list or none>
Target custom domain: infinite-track.tech
```

- [ ] **Step 2: Inspect current DigitalOcean DNS records for `infinite-track.tech`**

Record whether the root domain already has records that would conflict with App Platform attachment:

```text
Check for existing root-domain A / ALIAS / CNAME records on infinite-track.tech.
If records already point somewhere else, stop and document the conflict before making changes.
```

- [ ] **Step 3: Write baseline evidence file**

Write this exact structure to `docs/evidence/custom-domain-baseline-2026-07-05.md`:

```markdown
# Custom Domain Baseline — Web FE

**Date:** 2026-07-05  
**Target domain:** https://infinite-track.tech  
**App:** infinite-track-fe-production  
**Current live URL:** https://orca-app-58alv.ondigitalocean.app

## App Platform Domain State

- Attached custom domains:
- Notes:

## DNS Baseline

- Root-domain records found:
- Conflict detected: yes / no
- Notes:

## Decision

- Safe to attach custom domain: yes / no
```

````

- [ ] **Step 4: Verify the baseline evidence is present**

Run:

```bash
test -f docs/evidence/custom-domain-baseline-2026-07-05.md && echo "baseline evidence exists"
````

Expected: `baseline evidence exists`

- [ ] **Step 5: Commit**

```bash
git add docs/evidence/custom-domain-baseline-2026-07-05.md docs/evidence/post-deploy-smoke-2026-07-05.md
git commit -m "docs: capture custom domain baseline evidence"
```

### Task 2: Attach `infinite-track.tech` to the production app

**Files:**

- Modify: `docs/evidence/custom-domain-baseline-2026-07-05.md`
- Create: `docs/evidence/custom-domain-attach-2026-07-05.md`
- Test: none

**Interfaces:**

- Consumes: App Platform app `infinite-track-fe-production`; baseline evidence from Task 1
- Produces: Attached custom domain on the app plus a written attachment log with the exact platform state after the change

- [ ] **Step 1: Attach `infinite-track.tech` to the production app**

Use DigitalOcean App Platform domain management to attach the root domain directly to the existing app:

```text
App: infinite-track-fe-production
Domain to attach: infinite-track.tech
Keep starter domain: https://orca-app-58alv.ondigitalocean.app
Do not change source branch, build command, or output directory.
```

- [ ] **Step 2: If DigitalOcean offers managed DNS alignment, accept the platform-generated target**

Capture the exact DNS target the platform expects:

```text
Record the required root-domain target shown by App Platform.
If App Platform offers DigitalOcean-managed DNS automation, use that.
If it only shows manual target values, record them exactly.
```

- [ ] **Step 3: Write custom-domain attachment evidence**

Write this exact structure to `docs/evidence/custom-domain-attach-2026-07-05.md`:

```markdown
# Custom Domain Attachment Evidence — Web FE

**Date:** 2026-07-05  
**App:** infinite-track-fe-production  
**Target domain:** https://infinite-track.tech

## Attachment Result

- Domain attached: yes / no
- Starter domain retained: yes / no
- App Platform expected DNS target:
- Certificate status at time of attach:

## Notes

- Any warnings shown by the platform:
- Any DNS propagation warning:
```

````

- [ ] **Step 4: Verify attachment evidence file exists**

Run:

```bash
test -f docs/evidence/custom-domain-attach-2026-07-05.md && echo "attachment evidence exists"
````

Expected: `attachment evidence exists`

- [ ] **Step 5: Commit**

```bash
git add docs/evidence/custom-domain-attach-2026-07-05.md docs/evidence/custom-domain-baseline-2026-07-05.md
git commit -m "docs: record custom domain attachment evidence"
```

### Task 3: Verify DNS resolution and HTTPS readiness

**Files:**

- Modify: `docs/evidence/custom-domain-attach-2026-07-05.md`
- Create: `docs/evidence/custom-domain-verification-2026-07-05.md`
- Test: none

**Interfaces:**

- Consumes: Attached domain from Task 2
- Produces: Verification evidence showing whether DNS and HTTPS are ready for smoke testing

- [ ] **Step 1: Check DNS resolution for the root domain**

Run:

```bash
nslookup infinite-track.tech
```

Expected: the result resolves to the App Platform target or ingress IPs documented by the platform.

- [ ] **Step 2: Check HTTPS response from the custom domain**

Run:

```bash
curl -I -L --max-redirs 5 --max-time 30 https://infinite-track.tech
```

Expected:

- no certificate error
- `200`, `301`, or `302` is acceptable during first-pass verification

- [ ] **Step 3: If HTTPS is not ready yet, stop and classify as pending propagation**

Record exactly one of these outcomes:

```text
HTTPS ready
or
DNS/HTTPS propagation pending
```

Do not proceed to full smoke until HTTPS is ready.

- [ ] **Step 4: Write custom-domain verification evidence**

Write this exact structure to `docs/evidence/custom-domain-verification-2026-07-05.md`:

```markdown
# Custom Domain Verification — Web FE

**Date:** 2026-07-05  
**Domain:** https://infinite-track.tech

## DNS

- nslookup result summary:
- Result: PASS / PENDING / FAIL

## HTTPS

- curl result summary:
- Result: PASS / PENDING / FAIL

## Gate Decision

- Ready for smoke: yes / no
- Notes:
```

````

- [ ] **Step 5: Verify the evidence file exists**

Run:

```bash
test -f docs/evidence/custom-domain-verification-2026-07-05.md && echo "custom domain verification exists"
````

Expected: `custom domain verification exists`

- [ ] **Step 6: Commit**

```bash
git add docs/evidence/custom-domain-verification-2026-07-05.md docs/evidence/custom-domain-attach-2026-07-05.md
git commit -m "docs: verify custom domain dns and https"
```

### Task 4: Re-run smoke checks on `https://infinite-track.tech`

**Files:**

- Modify: `docs/evidence/post-deploy-smoke-2026-07-05.md`
- Modify: `DEPLOYMENT.md`
- Modify: `DEPLOYMENT-CHECKLIST.md`
- Test: none

**Interfaces:**

- Consumes: Ready custom domain from Task 3; existing production app and backend contract
- Produces: Updated production smoke evidence and docs that name `https://infinite-track.tech` as the final Web FE origin

- [ ] **Step 1: Re-check the Web FE shell on the custom domain**

Run:

```bash
curl -I -L --max-redirs 5 --max-time 30 https://infinite-track.tech
```

Expected: healthy HTTPS response.

- [ ] **Step 2: Re-check the backend anonymous protected contract**

Run:

```bash
curl -I --max-time 30 https://api.infinite-track.tech/api/settings/operational
```

Expected: `401 Unauthorized`, not `404`.

- [ ] **Step 3: Open the custom domain in the browser and inspect the shell**

Verify:

```text
- navigation lands on the sign-in shell or expected entry
- core assets load successfully
- no fatal console errors
```

- [ ] **Step 4: Update the smoke evidence file to make the custom domain the primary production URL**

Replace the old production URL in `docs/evidence/post-deploy-smoke-2026-07-05.md` with the final domain and append a notes section like this:

```markdown
## Custom Domain Notes

- Final production origin: https://infinite-track.tech
- Starter fallback domain retained: https://orca-app-58alv.ondigitalocean.app
- Custom-domain shell verification: PASS / PENDING / FAIL
```

````

- [ ] **Step 5: Update deploy docs to name the final production origin explicitly**

Apply these documentation changes:

```text
DEPLOYMENT.md:
- replace example production frontend origin references so they explicitly name https://infinite-track.tech as the current final Web FE origin where appropriate

DEPLOYMENT-CHECKLIST.md:
- update the production domain/custom-domain verification bullets so they reference https://infinite-track.tech as the current final frontend origin
````

- [ ] **Step 6: Verify the three documentation files changed as expected**

Run:

```bash
git diff -- DEPLOYMENT.md DEPLOYMENT-CHECKLIST.md docs/evidence/post-deploy-smoke-2026-07-05.md
```

Expected: diff shows explicit custom-domain truth updates and smoke evidence updates only.

- [ ] **Step 7: Commit**

```bash
git add DEPLOYMENT.md DEPLOYMENT-CHECKLIST.md docs/evidence/post-deploy-smoke-2026-07-05.md
git commit -m "docs: adopt custom webfe production domain"
```

### Task 5: Final acceptance and operator handoff

**Files:**

- Create: `docs/evidence/custom-domain-handoff-2026-07-05.md`
- Test: none

**Interfaces:**

- Consumes: Evidence from Tasks 1-4
- Produces: Final operator-facing acceptance summary and any remaining follow-up items

- [ ] **Step 1: Summarize final state**

Collect these exact values:

```text
Final production origin: https://infinite-track.tech
Starter fallback domain: https://orca-app-58alv.ondigitalocean.app
API base URL: https://api.infinite-track.tech/api
App source branch: master
```

- [ ] **Step 2: Classify the outcome**

Use one of these exact labels:

```text
PASS
CONDITIONAL PASS
FAIL
```

Rules:

- `PASS` if DNS, HTTPS, shell load, and anonymous API contract all pass
- `CONDITIONAL PASS` if domain is attached but propagation or authenticated smoke is still pending
- `FAIL` if the custom domain cannot be attached or is clearly broken

- [ ] **Step 3: Write the final handoff file**

Write this exact structure to `docs/evidence/custom-domain-handoff-2026-07-05.md`:

```markdown
# Custom Domain Handoff — Web FE

**Date:** 2026-07-05

## Final State

- Final production origin:
- Starter fallback domain:
- API base URL:
- App source branch:

## Result

- Outcome: PASS / CONDITIONAL PASS / FAIL

## Evidence Files

- docs/evidence/custom-domain-baseline-2026-07-05.md
- docs/evidence/custom-domain-attach-2026-07-05.md
- docs/evidence/custom-domain-verification-2026-07-05.md
- docs/evidence/post-deploy-smoke-2026-07-05.md

## Follow-up

- Remaining operator action:
- Monitoring note:
```

````

- [ ] **Step 4: Verify the handoff file exists**

Run:

```bash
test -f docs/evidence/custom-domain-handoff-2026-07-05.md && echo "custom domain handoff exists"
````

Expected: `custom domain handoff exists`

- [ ] **Step 5: Commit**

```bash
git add docs/evidence/custom-domain-handoff-2026-07-05.md
git commit -m "docs: add custom domain handoff summary"
```

## Self-Review

- Spec coverage: the plan covers baseline domain inspection, app attachment, DNS/HTTPS verification, smoke re-verification, doc truth updates, and final handoff.
- Placeholder scan: removed TBD/TODO language; each step names exact files, commands, and expected outcomes.
- Type consistency: all domain references use the same exact final origin (`https://infinite-track.tech`) and backend API target (`https://api.infinite-track.tech/api`).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-05-web-fe-custom-domain.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
