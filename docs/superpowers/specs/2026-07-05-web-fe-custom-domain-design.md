# Web FE Custom Domain Design

**Date:** 2026-07-05  
**Target App:** `infinite-track-fe-production`  
**Current Live URL:** `https://orca-app-58alv.ondigitalocean.app`  
**Target Final Domain:** `https://infinite-track.tech`

## Context

Web FE production is currently healthy on the DigitalOcean App Platform starter domain, and the production build-time API contract has already been corrected to use `https://api.infinite-track.tech/api`.

The remaining need is to move the user-facing production origin from the starter domain to the final custom root domain `https://infinite-track.tech`. This is not just a branding change: the final Web FE origin also affects deploy/runtime truth, future smoke evidence, and the correct production origin referenced in CORS validation guidance.

## Recommended Approach

Attach `infinite-track.tech` directly to the existing Web FE production App Platform app and treat it as the single final public production origin.

The DigitalOcean starter domain (`https://orca-app-58alv.ondigitalocean.app`) remains in place as a technical fallback and platform default, but it is no longer treated as the operator-facing or evidence-facing source of truth once the custom domain is accepted.

## Why This Approach

### Option 1 — Attach root domain directly to Web FE app (**recommended**)

- Pros:
  - Matches the desired public production URL exactly
  - Keeps Web FE origin simple and explicit
  - Aligns well with existing deployment guidance that production should have one final origin
- Cons:
  - Root-domain DNS and HTTPS must be verified carefully

### Option 2 — Keep starter domain as the practical primary URL and add root domain as a secondary alias

- Pros:
  - Lowest operational change
  - Easy fallback mentally and technically
- Cons:
  - Leaves ambiguity about which origin is the real source of truth
  - Weakens future CORS/runtime evidence clarity

### Option 3 — Use a dedicated web subdomain instead of the root domain

- Pros:
  - Cleaner separation between website/app/API domains in some architectures
- Cons:
  - Does not match the explicitly requested target domain
  - Introduces an unnecessary naming change for the current request

## Design

### 1. Final origin

`https://infinite-track.tech` becomes the final production origin for Web FE.

### 2. Backend contract remains unchanged

The backend API contract remains:

- `API_BASE_URL=https://api.infinite-track.tech/api`
- `API_AUTH_ENDPOINT=/auth`

This domain change does not change the backend target; it only changes the frontend origin that browsers use.

### 3. Attachment flow

Implementation should follow this order:

1. Check whether `infinite-track.tech` is already attached to the App Platform app.
2. If not attached, add it to the production app.
3. Verify or align DigitalOcean DNS records for the root domain so they target the App Platform ingress correctly.
4. Wait for certificate/HTTPS provisioning to complete.
5. Re-run production smoke checks against `https://infinite-track.tech`.

### 4. Fallback policy

Do not remove the starter domain during this change.

The starter domain remains as a technical fallback in case DNS propagation, certificate provisioning, or routing validation is delayed. Acceptance is based on the custom domain passing verification, not on the starter domain disappearing.

## Acceptance Criteria

The custom domain setup is accepted only when all of the following are true:

- `infinite-track.tech` is attached to the production app
- the root domain resolves correctly
- HTTPS is active and healthy
- the Web FE shell loads correctly from `https://infinite-track.tech`
- the anonymous protected API contract remains healthy (`401`, not `404`)
- starter-domain fallback remains available if needed during verification

## Risks

- DNS propagation delay may create a temporary mismatch between platform configuration and public resolution.
- HTTPS certificate provisioning may lag behind domain attachment.
- If another workload is already using the root domain, this change could conflict with it and must stop before attachment.
- Production documentation/evidence will need to reflect the new final origin after acceptance.

## Verification

After implementation, verify:

1. App Platform reports the custom domain as attached and healthy.
2. `https://infinite-track.tech` returns a healthy HTTPS response.
3. Browser navigation to `https://infinite-track.tech` loads the sign-in shell and core assets.
4. `https://api.infinite-track.tech/api/settings/operational` still returns `401 Unauthorized`, not `404`.
5. If credentials are available, run authenticated smoke on the final custom domain.

## Representative Impact Areas

- DigitalOcean App Platform app networking/domain configuration
- DigitalOcean DNS records for `infinite-track.tech`
- `DEPLOYMENT.md`
- `DEPLOYMENT-CHECKLIST.md`
- `docs/evidence/post-deploy-smoke-2026-07-05.md`

## Notes

This design intentionally keeps the production app and deployment source unchanged:

- same app
- same `master` deployment source
- same build command
- same output directory

Only the public production origin changes.
