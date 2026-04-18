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
