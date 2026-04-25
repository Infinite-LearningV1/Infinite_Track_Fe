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
- The repo contains client-side page protection, role-based redirects, and permission checks.
- User role and permission data are read from frontend-managed state/storage.
- Backend APIs remain the only place that can actually enforce true authorization on protected operations.

### Assumption
- UI should still guide users away from pages and actions they should not use.
- Product intent does not treat UI-side RBAC as the final security authority.

### Needs Verification
- The canonical role matrix for each page and action is not documented in this repo.
- It is not yet proven that backend endpoints enforce every action consistently with UI visibility rules.

## Decision
We will treat route guards and UI RBAC in Web FE as guidance and operator safety mechanisms, not as the final authorization authority.

## Rationale
Client-side guards improve experience and reduce accidental misuse, but they cannot be the final security boundary because they run in the browser and depend on locally available state. Making this explicit prevents maintainers from assuming hidden buttons or blocked routes are sufficient protection. The backend must still be treated as the authority for whether an action is allowed.

## Considered Options
1. **Recommended: UI guard as guidance, backend as authority**
   - Keeps UX protections without overclaiming security.
2. **UI RBAC as sufficient authority**
   - Rejected because browser-side checks are inherently bypassable.
3. **No UI RBAC, backend only**
   - Rejected because it would create a poorer operator experience and more avoidable denial flows.

## Trade-offs / Consequences
- Positive: clearer security boundary.
- Positive: maintainers can evolve UI visibility logic without pretending it is full authorization.
- Negative: temporary mismatch between UI rules and backend rules can still confuse users.
- Negative: requires explicit verification of page-to-role mappings outside this repo.

## Evidence / References
- User-provided context: UI-side RBAC is not final security authority.
- `src/js/utils/authGuard.js:49-57` — protected pages are blocked with browser redirects.
- `src/js/utils/authGuard.js:151-161` — permission checks read `userData.permissions` locally.
- `src/js/utils/authGuard.js:170-180` — denied permission path is handled in frontend code.
- `src/js/utils/roleBasedAccess.js:19` — repo defines page access permissions by role.
- `src/js/utils/roleBasedAccess.js:365-390` — role-based page access is evaluated in browser runtime.
- `src/js/stores/authStore.js:50-53` — permission checks are exposed from frontend auth store.
- `src/js/services/userService.js:604-626` — role data itself is fetched from backend API.

## Open Verification Points
- Confirm the official page-to-role matrix and action-level permission matrix.
- Verify which backend endpoints enforce role/permission independently of UI behavior.
- Verify whether denial should redirect, show inline messaging, or both for each admin surface.
