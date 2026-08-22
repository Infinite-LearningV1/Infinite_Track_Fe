# ADR-002-auth-session-and-truthful-access-denial

## ADR ID

ADR-002

## Title

Auth, session, and truthful access denial

## Status

Proposed

## Context

### Fact

- Sign-in, protected-page bootstrap, and sign-out behavior are implemented in browser-side code.
- Web FE now has one canonical refresh path and one bootstrap session resolver instead of scattered page-level session decisions.
- Cached browser state still exists for continuity, but current runtime behavior treats it only as a session hint.
- The frontend still carries verification gaps for live backend scenarios such as inactivity-expired refresh and concurrent refresh contention.

### Assumption

- Product intent prioritizes truthful operator feedback over optimistic continuity.
- Backend remains the source of truth for whether a session is refreshable, revoked, inactive, or fully expired.

### Needs Verification

- The exact backend response payload shape for every refresh-denial variant is not fully locked by this repo alone.
- The final user-facing copy for each auth failure mode is not centrally specified in this repo.

## Decision

We will make Web FE authentication and session behavior truthful: expired, missing, invalid, revoked, inactive, and denied states must be presented as such, and the UI must not imply backend validation when only cached browser state is available.

For refresh-session adoption, Web FE will treat cached browser state only as a **session hint**, not as final session truth. Protected-page bootstrap and protected API recovery must use one centralized auth runtime that:

- classifies auth failure as refreshable, non-refreshable, transport, server, or other,
- runs refresh through a single-flight path,
- replays a protected request at most once after refresh succeeds,
- forces full re-auth when refresh is invalid, revoked, or blocked by inactivity expiry,
- does **not** treat refresh transport or server failure as proof that the session is invalid.

## Rationale

Auth confusion erodes operator trust quickly. This repo previously mixed multiple storage keys, token paths, and session assumptions, which made it easy to show continuity that was never confirmed by the backend. A truthful stance means Web FE may preserve continuity hints where appropriate, but it must not claim backend-confirmed access until `/auth/me` or refresh-backed recovery has actually succeeded.

## Considered Options

1. **Recommended: truthful session and denial behavior**
   - Distinguish cached continuity from backend-confirmed validity.
   - Make expiry, revocation, inactivity, and denial explicit.
2. **Optimistic continuity-first behavior**
   - Prefer keeping users moving based on cached local state.
   - Rejected because it can mislead users about actual access.
3. **Strict fail-closed on every ambiguity**
   - Safer, but can create unnecessary disruption when the real problem is transport or backend availability.
   - Not chosen because the backend contract requires truthful separation between invalid auth and temporary verification failure.

## Trade-offs / Consequences

- Positive: improves operator trust and reduces misleading auth states.
- Positive: access-token expiry can recover without misleading logout if refresh still succeeds.
- Positive: transport or server problems during refresh can be surfaced honestly instead of being mislabeled as invalid auth.
- Negative: Web FE must maintain a small centralized auth runtime instead of leaving session behavior fully distributed.
- Negative: legacy storage paths still need compatibility handling until they disappear from the wider codebase.

## Evidence / References

- `src/js/services/authService.js:133-159` — `refreshSession()` is the single refresh entry point and only this service calls `API_CONFIG.REFRESH_URL`.
- `src/js/services/authRequest.js` — protected requests stay cookie-based with `withCredentials: true`, keep `X-Client-Type: web`, and strip caller/resolver `Authorization` bearer headers.
- `src/js/services/authService.js:173-205` — forced re-auth goes through one cleanup and redirect path.
- `src/js/services/authService.js:265-270` — bootstrap session resolution is created centrally from `hasSessionHint`, `/auth/me`, refresh, and failure classification.
- `src/js/services/authSessionRuntime.js:87-124` — auth failures are classified into refreshable, non-refreshable, transport, server, and other.
- `src/js/services/authSessionRuntime.js:142-183` — protected requests refresh once and replay once through one executor.
- `src/js/services/authSessionRuntime.js:250-290` — bootstrap verification returns `authenticated`, `verification_failed`, `non_refreshable`, or `unauthenticated` instead of assuming local truth.
- `src/js/utils/storageManager.js:116-158` — canonical auth payload save, token lookup, and session-hint detection normalize legacy storage paths.
- `src/js/index.js:396-447` — protected-page startup treats missing hint, verification failure, and full re-auth as different outcomes.
- `src/js/stores/authStore.js:64-145` — Alpine auth state preserves cached continuity but only marks authenticated after backend-confirmed resolution.

## Open Verification Points

- Confirm the exact backend payload contract for invalid refresh, revoked refresh, and inactivity-expired refresh.
- Confirm whether `X-Client-Type` is required only on auth endpoints or across all protected requests.
- Confirm the exact user-facing distinction between session expiry, permission denial, and temporary verification failure.

## Manual verification boundary

REQUIRES REPO VERIFICATION for the live backend scenarios below because the repo does not lock an automated fixture path for them:

- login happy path,
- protected page bootstrap with cached local state,
- access token expired but refreshable while a protected page is open,
- refresh invalid or revoked,
- inactivity-expired refresh denial,
- offline or server-down during refresh,
- multiple concurrent protected requests that hit refresh at the same time.
