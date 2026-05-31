# ADR-003-route-guard-and-rbac-boundary

## ADR ID
ADR-003

## Title
Route guard and RBAC boundary

## Status
Proposed

## Context
### Fact
- Route guards and role-based access logic run in the browser.
- The repo contains client-side protected-page redirects, access-denied UX, and role-based page mapping.
- Current runtime behavior now depends on verified Alpine auth state for route and RBAC decisions instead of upgrading cached local storage into authenticated truth.
- Backend APIs remain the only place that can actually enforce true authorization on protected operations.

### Assumption
- UI should still guide users away from pages and actions they should not use.
- Product intent does not treat UI-side RBAC as the final security authority.

### Needs Verification
- The canonical role matrix for each page and action is not documented in this repo.
- It is not yet proven that backend endpoints enforce every protected action consistently with UI visibility rules.

## Decision
We will treat route guards and UI RBAC in Web FE as guidance and operator safety mechanisms, not as the final authorization authority.

Route and RBAC decisions must consume the same truthful auth runtime used by protected-page bootstrap. Cached browser state may be used as a hint to decide whether verification should run, but access decisions must come from backend-verified auth store state.

## Rationale
Client-side guards improve experience and reduce accidental misuse, but they cannot be the final security boundary because they run in the browser. Making this explicit prevents maintainers from assuming hidden buttons, redirects, or blocked routes are sufficient protection. Requiring verified auth-store state also avoids the older failure mode where cached storage looked authenticated before the backend had confirmed it.

## Considered Options
1. **Recommended: UI guard as guidance, backend as authority**
   - Keeps UX protections without overclaiming security.
   - Keeps route and RBAC decisions aligned with verified auth runtime state.
2. **UI RBAC as sufficient authority**
   - Rejected because browser-side checks are inherently bypassable.
3. **No UI RBAC, backend only**
   - Rejected because it would create a poorer operator experience and more avoidable denial flows.

## Trade-offs / Consequences
- Positive: clearer security boundary.
- Positive: route guard and RBAC no longer over-trust cached local state.
- Positive: temporary verification failure can be handled distinctly from true session expiry.
- Negative: temporary mismatch between UI rules and backend rules can still confuse users.
- Negative: requires explicit verification of page-to-role mappings outside this repo.

## Evidence / References
- `src/js/utils/authGuard.js:27-53` — protected-page guard checks page type, respects `verification_failed`, and only uses session hint to decide whether signin redirect is needed.
- `src/js/utils/authGuard.js:140-185` — permission checks and guarded callbacks require verified Alpine auth state instead of local storage truth.
- `src/js/utils/roleBasedAccess.js:15-23` — role access derives from `getVerifiedUser()` only.
- `src/js/utils/roleBasedAccess.js:67-82` — page access returns false when verified user role is unavailable.
- `src/js/utils/roleBasedAccess.js:345-377` — denied dashboard access and dashboard permission checks are evaluated from verified role state.
- `src/js/stores/authStore.js:81-145` — Alpine auth store distinguishes authenticated state from verification failure and unauthenticated state.
- `src/js/index.js:430-447` — startup path treats verification failure separately from forced re-auth.

## Open Verification Points
- Confirm the official page-to-role matrix and action-level permission matrix.
- Verify which backend endpoints enforce role or permission independently of UI behavior.
- Verify whether denial should redirect, show inline messaging, or both for each admin surface.
