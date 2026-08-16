# ADR-007-web-fe-auth-consumer-model

## ADR ID

ADR-007

## Title

Web FE auth consumer model

## Status

Proposed

## Context

### Fact

- The Web FE is a browser-based Webpack multi-page app using Axios for backend calls.
- Backend session validity is the source of truth for auth state.
- The canonical refresh endpoint is `POST /api/auth/refresh`.
- The current Web FE auth runtime sends requests with `withCredentials: true`.
- The backend contract requires `X-Client-Type: web` for auth consumers.
- The Web FE persists cached user/session hints only as local runtime hints, not as final authority.

### Assumption

- Backend refresh/session cookies are HttpOnly and must be sent by the browser through credentialed requests.
- JSON responses may include user/session payloads for frontend cache hydration, but cookie/session validity remains backend-owned.
- Same-origin relative redirects are safe to preserve after forced reauth; cross-origin redirect targets are not.

### Needs Verification

- Live backend fixtures are still needed for expired access replay, invalid/revoked refresh, inactivity timeout, server failure, and concurrency smoke scenarios.
- Production topology still needs confirmation for same-origin `/api` versus API-domain deployment.

## Decision

We will treat the Web FE as an auth consumer that uses HttpOnly-cookie session transport plus JSON response payloads for UI cache hydration. Auth requests and protected requests will use `withCredentials: true`, send `X-Client-Type: web`, and rely on `POST /api/auth/refresh` as the only refresh-session renewal path.

We will not treat localStorage user or token data as auth authority. Local browser storage may hold session hints, redirect targets, and sanitized notices, but backend session validation remains authoritative.

We will preserve only same-origin redirect targets after forced reauth. Sign-in notice alerts may auto-dismiss, with inactivity-expired notices shown for at least 6 seconds.

## Rationale

This keeps Web FE behavior aligned with backend session truth while still allowing the browser UI to recover from access-token expiry without logging the user out unnecessarily. Credentialed Axios calls support HttpOnly-cookie transport, while `X-Client-Type: web` lets the backend identify the consumer contract. Treating local storage as hint-only avoids false authentication when backend session state has expired, been revoked, or become inactive.

## Considered Options

1. **Recommended: cookie-backed auth consumer with JSON hydration**
   - Keeps session authority on the backend and supports browser UI state.
2. **Bearer-token localStorage authority**
   - Rejected because it makes Web FE storage appear authoritative and conflicts with backend session ownership.
3. **Force logout on any auth transport failure**
   - Rejected because offline/server failures are not proof that the session is invalid.

## Trade-offs / Consequences

- Positive: refresh-session behavior is consistent with backend source of truth.
- Positive: invalid, revoked, and inactive sessions can produce truthful sign-in notices.
- Positive: same-origin redirect preservation improves UX after forced reauth.
- Negative: live verification requires backend fixtures for token/session edge cases.
- Negative: browser runtime must maintain careful distinction between cached hints and verified auth state.

## Evidence / References

- `src/js/features/signinHandler.js` — dashboard-class roles ignore stale `/profile.html` post-login redirects and evaluate dashboard denial against the fresh login user.
- `tests/auth/auth-redirect-after-login.test.js` � regression coverage proves dashboard-class roles ignore stale profile redirects and use fresh login/RBAC state.
- `src/js/services/authService.js` — login, refresh, `/auth/me`, logout, and forced reauth behavior.
- `src/js/services/authSessionRuntime.js` — auth failure classification, single-flight refresh, redirect notices, and cross-tab sync helpers.
- `src/js/services/authRequest.js` — protected request wrapper using credentialed requests and auth recovery.
- `src/js/features/signinHandler.js` — same-origin redirect handling and auth redirect notice display.
- `tests/auth/auth-session-runtime-codes.test.js` — INF-145 code classification coverage.
- `tests/auth/auth-x-client-type-header.test.js` — required `X-Client-Type: web` coverage.
- `tests/auth/auth-redirect-notice.test.js` — forced reauth notice coverage.
- `tests/auth/auth-redirect-after-login.test.js` — redirect preservation and cross-origin rejection coverage.
- `tests/auth/auth-cross-tab-sync.test.js` — cross-tab auth clear sync coverage.
- `tests/auth/auth-session-runtime.test.js` � focused auth/session consumer regression coverage used by the repository CI build gate.

## Open Verification Points

- Capture live backend evidence for expired access token refresh and request replay.
- Capture live backend evidence for invalid/revoked refresh token forced reauth.
- Capture live backend evidence for 48h inactivity timeout.
- Capture live offline/5xx refresh evidence showing no forced logout.
- Capture live concurrency evidence showing one refresh for multiple expired protected requests.
