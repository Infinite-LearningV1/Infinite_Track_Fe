# ADR-005-service-and-api-integration-consistency-boundary

## ADR ID
ADR-005

## Title
Service and API integration consistency boundary

## Status
Proposed

## Context
### Fact
- The repo already separates much API access into `src/js/services/`.
- Page and feature code rely on services for auth, users, attendance, booking, and reporting.
- Current auth-sensitive request behavior now converges on a shared protected request executor instead of each service handling refresh or auth recovery ad hoc.
- Some broader consistency gaps still remain, especially outside the narrow auth/session transport cleanup completed in this workstream.

### Assumption
- Long-term maintainability improves when page logic depends on a clearer service/API boundary.
- Not every service inconsistency needs an immediate refactor in this ADR batch.

### Needs Verification
- The intended canonical request and auth strategy is not yet fully proven against every backend edge case.
- The current duplication hotspots and preferred refactor sequence are not fully mapped.

## Decision
We will treat the service layer as the primary boundary for backend API integration and expect page-level code to consume service contracts rather than inventing new integration behavior ad hoc.

For auth-sensitive requests, service integration must converge on a shared runtime that:
- applies `withCredentials: true`,
- adds the Web FE auth client header contract,
- keeps protected requests cookie-based without localStorage-derived `Authorization` bearer headers,
- refreshes through one centralized path,
- retries a protected request at most once after successful refresh,
- forces re-auth only through the canonical auth cleanup path.

## Rationale
This repo already trends toward a service-based structure, which is a good fit for correctness, reuse, and testability. The auth/session work exposed that merely having a `services/` folder is not enough if each service chooses its own token source or 401 behavior. Declaring the boundary now creates a governance rule: future cleanup should converge request behavior, auth handling, and error semantics in services first, while leaving page modules focused on presentation and interaction orchestration.

## Considered Options
1. **Recommended: services as integration boundary**
   - Page/features consume stable service contracts.
   - Consistency work is driven through service-layer alignment.
2. **Allow mixed page-level and service-level API access indefinitely**
   - Rejected because it compounds drift and maintainability issues.
3. **Immediate broad refactor before any governance rule**
   - Rejected for this ADR batch because the goal is decision traceability, not a large rewrite.

## Trade-offs / Consequences
- Positive: improves maintainability and future testability.
- Positive: creates a clearer place to align auth, headers, refresh recovery, and error handling.
- Positive: auth-sensitive services now share one refresh and replay policy.
- Negative: some non-auth service inconsistencies remain in the short term.
- Negative: future contributors must resist quick one-off API calls in page logic when service contracts are unclear.

## Evidence / References
- `src/js/services/authRequest.js:13-35` — shared protected request executor applies canonical headers, strips caller/resolver `Authorization`, and keeps shared retry behavior.
- `src/js/services/authSessionRuntime.js:142-183` — protected request recovery refreshes once and replays once.
- `src/js/services/authService.js:133-159` — refresh is centralized in auth service.
- `src/js/services/authService.js:161-170` — auth endpoint header construction remains cookie-based and does not create bearer headers.
- `src/js/services/userService.js:22-47` — user retrieval now consumes `authRequest()` instead of inventing its own auth transport.
- `src/js/services/attendanceService.js:19-55` — attendance retrieval consumes `authRequest()`.
- `src/js/services/bookingService.js:20-59` — booking retrieval consumes `authRequest()`.
- `src/js/services/reportService.js:17-42` — report retrieval uses the shared auth transport without changing reporting responsibility scope.
- `src/js/utils/storageManager.js:134-158` — canonical token lookup and session hint normalization support service-layer consistency.

## Open Verification Points
- Confirm the canonical auth contract for all remaining services that still have legacy assumptions outside this scope.
- Decide which request/response normalization rules belong centrally in services beyond auth transport.
- Identify which page modules should be prioritized first for duplication reduction after the auth/session stream.
