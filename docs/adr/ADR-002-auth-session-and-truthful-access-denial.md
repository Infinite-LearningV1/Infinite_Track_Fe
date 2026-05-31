# ADR-002-auth-session-and-truthful-access-denial

## ADR ID

ADR-002

## Title

Auth, session, and truthful access denial

## Status

Proposed

## Context

### Fact

- Sign-in and redirect behavior is implemented in browser-side code.
- Session checks and redirects currently depend on local storage and browser redirects.
- The repo mixes cookie-oriented requests (`withCredentials`) with token/header retrieval patterns.
- Current code includes cases where comments imply server validation while the executed helper reads local storage only.

### Assumption

- Product intent prioritizes correctness and admin trust over masking uncertainty.
- Users should receive explicit signals when a session is expired, invalid, or lacks permission.

### Needs Verification

- The exact backend session model (cookie-only, bearer-only, or mixed) is not fully established from this repo alone.
- The expected UX copy and redirect behavior for every auth failure mode is not centrally specified in this repo.

## Decision

We will make Web FE authentication and session behavior truthful: expired, missing, invalid, and denied states must be presented as such, and the UI must not imply backend validation when only local state is available.

For the active backend contract, Web FE will treat cached browser state only as a **session hint**, not as final session truth. Protected-page bootstrap and protected API recovery must use one centralized auth runtime that:

- classifies auth failure as refreshable, non-refreshable, or transport-related,
- treats `GET /auth/me` as the authoritative bootstrap session check,
- does **not** call or depend on `/auth/refresh`,
- forces full re-authentication for protected-request auth failures while preserving redirect intent and session-expiry notice,
- does **not** treat transport failure during bootstrap verification as proof that the session is invalid.

## Rationale

Auth confusion erodes operator trust quickly. This repo already contains multiple session mechanisms and storage paths, which raises the risk of misleading continuity. A truthful stance means Web FE may preserve UX continuity where appropriate, but it must not pretend that access is valid or server-confirmed when that has not happened.

## Considered Options

1. **Recommended: truthful session and denial behavior**
   - Distinguish local continuity from backend-confirmed validity.
   - Make expiry and denial explicit.
2. **Optimistic continuity-first behavior**
   - Prefer keeping users moving based on cached local state.
   - Rejected because it can mislead users about actual access.
3. **Strict fail-closed on every ambiguity**
   - Safer, but can create unnecessary disruption if verification design is incomplete.
   - Not chosen yet because backend contract still needs confirmation.

## Trade-offs / Consequences

- Positive: improves operator trust and reduces misleading auth states.
- Positive: makes session expiry bugs easier to diagnose.
- Negative: may expose more visible "please sign in again" flows.
- Negative: truthful handling may surface backend inconsistencies sooner, which can feel less smooth until contracts are aligned.

### Active auth-runtime consequences

- Positive: protected-page bootstrap and protected-request auth recovery now share one centralized session-truth path.
- Positive: Web FE no longer implies silent session recovery through a refresh endpoint the backend does not provide.
- Positive: redirect intent and session-expiry notice can be preserved during forced re-authentication.
- Negative: users may see more explicit re-login flows when auth state expires.
- Negative: legacy token/header access paths still need normalization so auth hints do not drift across services.

## Evidence / References

- User-provided context: auth/session behavior must be clear, honest, and not misleading.
- `src/js/index.js:366-379` — protected page flow redirects in browser when not authenticated.
- `src/js/index.js:401-405` — code comment says server validation, but helper called is `getCurrentUser()`.
- `src/js/services/authService.js:202-204` — `getCurrentUser()` reads local storage only.
- `src/js/services/authService.js:14` — axios is configured with `withCredentials = true`.
- `src/js/services/authService.js:77-93` — actual backend session fetch exists via `/auth/me`.
- `src/js/services/bookingService.js:15-18` — bearer token is read from `auth_token`.
- `src/js/services/userService.js:20-31` — bearer token is read from `user` object in local storage.
- `src/js/utils/storageManager.js:19-21` — canonical stored user data uses `userData` key.

## Open Verification Points

- Decide the canonical session authority path for Web FE: cookie session, bearer token, or explicit hybrid.
- Decide which auth failures should redirect immediately and which should show an inline denial state first.
- Confirm the exact user-facing language for session expiry versus permission denial.

## Manual verification boundary

REQUIRES REPO VERIFICATION for the live backend scenarios below because the repo does not lock an automated fixture path for them:

- protected dashboard bootstrap hits `/auth/me` with only cached local auth hints present,
- protected request receives `401` and forces re-authentication with redirect preservation,
- inactivity-expired or revoked auth state redirects with a truthful session-expiry notice,
- offline/server-down during bootstrap verification returns a non-auth transport failure state,
- concurrent protected requests that fail auth do not leave the UI in a misleading partially authenticated state.
