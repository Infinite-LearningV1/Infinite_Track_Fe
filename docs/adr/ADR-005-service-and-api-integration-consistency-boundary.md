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
- Service implementations are not yet fully consistent in token source, auth header shape, fallback behavior, or request path conventions.
- Page growth and duplicate logic are active maintainability risks called out in the prompt context.

### Assumption
- Long-term maintainability improves when page logic depends on a clearer service/API boundary.
- Not every inconsistency needs an immediate refactor in this baseline ADR batch.

### Needs Verification
- The intended canonical request and auth strategy is not formally documented in this repo.
- The current duplication hotspots and preferred refactor sequence are not fully mapped.

## Decision
We will treat the service layer as the primary boundary for backend API integration and expect page-level code to consume service contracts rather than inventing new integration behavior ad hoc.

## Rationale
This repo already trends toward a service-based structure, which is a good fit for correctness, reuse, and testability. However, current inconsistencies show that simply having a `services/` folder is not enough. Declaring the boundary now creates a governance rule: future cleanup should converge request behavior, auth handling, and error semantics in services first, while leaving page modules focused on presentation and interaction orchestration.

## Considered Options
1. **Recommended: services as integration boundary**
   - Page/features consume stable service contracts.
   - Consistency work is driven through service layer alignment.
2. **Allow mixed page-level and service-level API access indefinitely**
   - Rejected because it compounds drift and maintainability issues.
3. **Immediate broad refactor before any governance rule**
   - Rejected for this ADR batch because the goal is decision traceability, not a large rewrite.

## Trade-offs / Consequences
- Positive: improves maintainability and future testability.
- Positive: creates a clearer place to align auth, headers, and error handling.
- Negative: existing inconsistencies remain in the short term.
- Negative: future contributors must resist quick one-off API calls in page logic when service contracts are unclear.

## Evidence / References
- User-provided context: service/API integration consistency, duplicate code/shared UI logic, maintainability and testability are active concerns.
- `src/js/services/authService.js:22-35` — auth login lives in service layer.
- `src/js/services/userService.js:42-64` — user list retrieval lives in service layer.
- `src/js/services/attendanceService.js:30-70` — attendance retrieval lives in service layer.
- `src/js/services/bookingService.js:31-75` — booking retrieval lives in service layer.
- `src/js/services/reportService.js:33-57` — reporting retrieval lives in service layer.
- `src/js/services/userService.js:20-31` — bearer token comes from `localStorage.getItem("user")` path.
- `src/js/services/attendanceService.js:15-18` — bearer token comes from `auth_token` path.
- `src/js/services/bookingService.js:15-18` — bearer token comes from `auth_token` path.
- `src/js/config/env.js:55-61` — canonical auth-related storage keys define `authToken` and `userData`, which do not fully match all service usage.

## Open Verification Points
- Decide the canonical auth token/session access contract for all services.
- Decide which request/response normalization rules belong centrally in services.
- Identify which current page modules should be prioritized first for duplication reduction.
