# INF-195 Post-Deploy Smoke Test Checklist

Purpose: provide a practical P1 smoke-test checklist for validating the Web FE immediately after a production deploy or release promotion. This checklist complements `DEPLOYMENT-CHECKLIST.md`; it does not replace build, env, CI, or rollback governance there.

## Scope and prerequisites

- [ ] Confirm the tested deployment target: domain / environment / hosting deployment ID.
- [ ] Confirm the source revision: branch, commit SHA, PR, or release tag.
- [ ] Confirm the expected production API base URL and prefix are the same values used by the deployed artifact.
- [ ] Confirm a valid smoke-test account is available for each role being tested.
- [ ] Confirm browser devtools access is available for console and network checks.
- [ ] Capture evidence location before starting: PR comment, release note, issue, or ops log.

> External verification note: authenticated runtime checks require production/staging credentials and browser access. If credentials or hosting logs are unavailable, mark the relevant items `EXTERNAL VERIFICATION REQUIRED` instead of treating them as passed.

## 1. Auth and session smoke

- [ ] Open the deployed Web FE URL in a clean browser session or incognito window.
- [ ] Sign-in page renders without blank screen, missing logo, or blocking console error.
- [ ] Login succeeds with an allowed smoke-test account.
- [ ] Failed login with an invalid password shows a clear denial state and does not navigate into protected pages.
- [ ] After successful login, the app lands on the expected protected route for the account role.
- [ ] Refreshing a protected page preserves the expected authenticated state when the session is still valid.
- [ ] Logout clears access to protected pages and returns to the signin flow.
- [ ] Opening a protected route after logout redirects or denies access truthfully.
- [ ] Browser Network tab shows no unexpected CORS error, failed preflight, or wrong API host/prefix during signin/session bootstrap.

## 2. Dashboard loading smoke

- [ ] Dashboard shell loads after login without a blocking spinner or blank content.
- [ ] Primary dashboard summary cards/sections render with real backend-driven data or an explicit empty/error state.
- [ ] Dashboard API requests target the expected production API base URL and final prefix.
- [ ] Role-sensitive dashboard content matches the smoke-test account access level.
- [ ] Navigation from dashboard to at least one primary admin/reporting page succeeds.
- [ ] Browser console has no blocking runtime errors during dashboard load.
- [ ] Network failures, if any, are visible as failures and not silently presented as successful data.

## 3. Export smoke

- [ ] Open the production report/export flow that is expected to be available for the smoke-test role.
- [ ] Apply the smallest safe filter range or dataset selection for a quick export.
- [ ] PDF export action completes and produces a downloadable/openable file.
- [ ] Excel export action completes and produces a downloadable/openable file.
- [ ] Exported file naming, format, and visible fields match the current reporting contract.
- [ ] Empty-result export behavior is explicit and safe: no crash, no misleading success, and no corrupted download.
- [ ] Export failure path shows a clear user-facing error and a diagnosable network/console signal.

## 4. Browser compatibility smoke

Run the same minimal auth + dashboard + navigation path in each agreed browser target.

- [ ] Chrome latest: signin, dashboard load, and one protected navigation path work.
- [ ] Edge latest: signin, dashboard load, and one protected navigation path work.
- [ ] Firefox latest: signin, dashboard load, and one protected navigation path work.
- [ ] Mobile/responsive viewport: signin and dashboard are usable without layout blocking the primary action.
- [ ] Static assets load in each browser target: CSS, JS bundle, logo, and key icons/images.
- [ ] No browser-specific blocking console errors appear in the tested path.

## 5. Error monitoring and operational observation

Observe for at least the first post-deploy smoke window agreed by the release owner.

- [ ] Browser console is checked on signin, dashboard, export, and one protected navigation path.
- [ ] Browser Network tab is checked for failed document, JS, CSS, image, API, and export requests.
- [ ] Hosting/platform deployment logs show no repeated startup, build artifact, or static serving errors.
- [ ] Backend/API logs or monitoring are checked for auth/session, dashboard, and export request errors caused by the deploy.
- [ ] Any known non-blocking warnings are recorded with owner and follow-up status.
- [ ] Smoke evidence is attached to the release/PR/issue: timestamp, tester, browser, account role, deployment ID, and screenshots/log snippets where useful.

## 6. Rollback triggers

Trigger rollback or incident escalation when any P1 condition below is confirmed and cannot be safely mitigated immediately.

- [ ] Frontend domain is unreachable, returns the wrong artifact, or serves a blank app shell for normal users.
- [ ] Signin is unavailable for valid accounts because of frontend deploy/config/runtime behavior.
- [ ] Protected route access is incorrectly granted, incorrectly denied for authorized users, or stuck in redirect loops.
- [ ] Dashboard cannot load its required operational summary for the primary admin role.
- [ ] Export PDF/Excel is unavailable or produces corrupted/misleading files for critical reporting flows.
- [ ] Deployed artifact points to the wrong API host/prefix or causes production CORS/preflight failures.
- [ ] Browser console shows a blocking runtime error on signin, dashboard, or export paths.
- [ ] Error logs show repeated deploy-caused failures above the release owner's tolerance threshold.
- [ ] A security/session regression is suspected, especially around auth state, route guard behavior, or role-based access.

When rollback is triggered:

- [ ] Record incident timestamp and exact trigger.
- [ ] Identify rollback target: previous hosting deployment, commit, PR, or artifact.
- [ ] Get release owner approval before rollback unless emergency policy says otherwise.
- [ ] Execute rollback through the traceable release path.
- [ ] Re-run minimum post-rollback smoke: domain opens, signin renders, protected API target is reachable, login/dashboard works if credentials are available, and console/logs have no blocking rollback errors.
- [ ] Attach rollback evidence to the release/PR/issue.

## 7. Smoke result summary

Use this summary block in the PR, release note, issue, or ops log.

```text
INF-195 Post-Deploy Smoke Result
Deployment target:
Deployment ID / commit:
Tester:
Timestamp:
Browsers tested:
Account role(s):

Auth/session: PASS / FAIL / EXTERNAL VERIFICATION REQUIRED
Dashboard loading: PASS / FAIL / EXTERNAL VERIFICATION REQUIRED
Export PDF/Excel: PASS / FAIL / EXTERNAL VERIFICATION REQUIRED
Browser compatibility: PASS / FAIL / EXTERNAL VERIFICATION REQUIRED
Error monitoring/logs: PASS / FAIL / EXTERNAL VERIFICATION REQUIRED
Rollback required: YES / NO
Notes / evidence links:
```
