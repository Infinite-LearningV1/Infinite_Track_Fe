# ADR-007-dashboard-cockpit-contract-adoption

## ADR ID

ADR-007

## Title

Dashboard cockpit contract adoption

## Status

Proposed

## Context

### Fact

- INF-160 dashboard migration on this branch was narrowed to dashboard-only scope; reporting migration remains out of scope for Phase 3 FE execution.
- Cockpit runtime authority is split across four backend owner surfaces:
  1. `GET /summary/dashboard-analytics` (historical analytics authority)
  2. `GET /attendance/geofence-evidence` (geofence evidence authority)
  3. `GET /attendance/today-locations` (today live-map authority)
  4. `GET /analysis/fuzzy-ahp/dashboard-recap` (FAHP dashboard recap authority)
- `GET /summary` remains the selected-period report/export path, but it is not part of the owner-driven cockpit authority model described by this ADR.
- `/api/summary` alias is non-canonical for the migrated dashboard flow.
- `/api/summary/dashboard-map` is not used by this flow.

### Assumption

- Keeping one canonical owner map for cockpit surfaces reduces integration drift and avoids frontend-invented authority.

### Needs Verification

- Runtime environment parity still needs explicit verification evidence for each canonical endpoint and payload shape.

## Decision

We will adopt and document the cockpit contract as a four-owner dashboard model:

- Historical analytics authority: `GET /summary/dashboard-analytics`
- Geofence evidence authority: `GET /attendance/geofence-evidence`
- Today-locations authority: `GET /attendance/today-locations`
- FAHP dashboard recap authority: `GET /analysis/fuzzy-ahp/dashboard-recap`

We will treat `/api/summary` as non-canonical for this dashboard flow and will not treat `/api/summary/dashboard-map` as an active integration path.

We will not source FAHP dashboard recap from analytics payloads, the legacy combined FAHP endpoint, or the three detail-analysis endpoints.

## Rationale

This keeps the dashboard truthful about owner boundaries, prevents cross-owner fallback, and matches the implemented runtime where historical analytics, geofence evidence, live map, and FAHP recap each fetch through their own owner path.

## Trade-offs / Consequences

- Positive: clearer authority boundaries for cockpit features.
- Positive: lower risk of endpoint drift and alias confusion.
- Positive: FAHP dashboard recap stays on its dedicated independent filter model instead of borrowing dashboard date-window semantics.
- Negative: non-canonical aliases cannot be treated as fallback truth for this cockpit path.
- Negative: strict contract mapping can surface more `backendRequired` or `error` states when canonical feeds are incomplete.

## Evidence / References

- `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md`
- `docs/adr/ADR-005-service-and-api-integration-consistency-boundary.md`
- `src/js/features/dashboard/dashboard.js`
- `tests/dashboard/dashboardPageOrchestration.test.js`

## Open Verification Points

- Validate canonical endpoint responses in target runtime environments.
- Validate that the deployed FE/runtime keeps owner failures local without cross-owner fallback.
