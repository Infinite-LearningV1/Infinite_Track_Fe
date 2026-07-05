# Post-Deploy Smoke Evidence — Web FE

**Date:** 2026-07-05  
**Production URL:** https://infinite-track.tech  
**Starter fallback URL:** https://orca-app-58alv.ondigitalocean.app  
**Source branch:** master  
**Source commit:** d425ccf610af15c9b5aec89b8bd74c695060ed83  
**Deploy platform:** DigitalOcean App Platform  
**Deploy ID:** d3d74924-5cb1-4b61-9384-74a1ce49e730

## Summary

Overall result: CONDITIONAL PASS

Deploy config was corrected so `API_BASE_URL` now points to `https://api.infinite-track.tech/api`, the corrective deployment completed successfully, and the final production origin is now `https://infinite-track.tech`. Anonymous/browser-level smoke checks on the final custom domain passed. Full authenticated smoke remains unverified because no production test credential was available in-session.

## Checks

### Web URL

- Result: PASS
- Evidence:
  - `curl -I -L https://infinite-track.tech` returned `200 OK`
  - Browser navigation resolved to `https://infinite-track.tech/signin.html`
  - Static assets loaded successfully from the custom domain: `style.css`, `bundle.js`, logo SVG, favicon

### Anonymous API Contract

- Endpoint: https://api.infinite-track.tech/api/settings/operational
- Expected: 401, not 404
- Actual: `401 Unauthorized`
- Result: PASS

### Auth

- Result: CONDITIONAL
- Notes:
  - Sign-in page loads and auth bootstrap initializes without fatal console errors.
  - Full login / logout smoke was not executed because no production-safe test credential was available in-session.

### Dashboard

- Result: NOT VERIFIED
- Notes:
  - Authenticated dashboard access was not exercised due missing credential.

### API / Network

- Result: PASS (anonymous shell-level scope)
- Notes:
  - Sign-in page network requests on `https://infinite-track.tech` returned `200`/`304` for required frontend assets.
  - No unexpected anonymous `404` detected on the protected operational settings endpoint.
  - Authenticated dashboard/report/export API calls were not exercised.

### Export

- Result: NOT VERIFIED
- Notes:
  - Export flow requires authenticated access and was not exercised.

### Console

- Result: CONDITIONAL PASS
- Notes:
  - No fatal JavaScript errors observed on sign-in page.
  - Console showed normal auth initialization logs.
  - Non-blocking issues observed:
    - form-field labeling/accessibility issue
    - missing autocomplete attribute issue

### Responsive / Static Assets

- Result: PASS (basic shell scope)
- Notes:
  - Main entry page and core static assets loaded successfully in browser-driven smoke.

## Custom Domain Notes

- Final production origin: https://infinite-track.tech
- Starter fallback domain retained: https://orca-app-58alv.ondigitalocean.app
- Custom-domain shell verification: PASS

## Issues Found

| Severity | Area           | Description                                                                                                                          | Action                                    |
| -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Medium   | Smoke coverage | Full authenticated smoke (login, dashboard, export) not executed because no production-safe test credential was available in-session | Run operator-assisted authenticated smoke |
| Low      | Accessibility  | Sign-in page reported missing form label / autocomplete issues in browser issues panel                                               | Log follow-up if MVP scope requires it    |

## Decision

- [ ] Accept deployment
- [x] Accept with known non-critical issues
- [ ] Rollback required

## Follow-up

- Linear issue(s): operator to decide if authenticated smoke needs explicit tracking issue
- Owner: release operator / Web FE maintainer
- Deadline: before final production sign-off if full authenticated smoke is mandatory
