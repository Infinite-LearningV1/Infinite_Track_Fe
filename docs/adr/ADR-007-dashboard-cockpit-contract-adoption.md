# ADR-007-dashboard-cockpit-contract-adoption

## ADR ID

ADR-007

## Title

Dashboard cockpit contract adoption

## Status

Proposed

## Context

### Fact

- INF-160 contract adoption for cockpit flow is already approved on this branch workstream.
- Cockpit runtime authority is split across three backend surfaces:
  1. `GET /summary/dashboard-analytics` (analytics authority, including Fuzzy AHP snapshot)
  2. `GET /attendance/today-locations` (today live-map authority)
  3. `GET /summary` (report/export authority)
- `GET /analysis/fuzzy-ahp` is used for lazy-loaded Fuzzy AHP detail.
- `/api/summary` alias exists but is not canonical for this cockpit flow.
- `/api/summary/dashboard-map` is not used by this flow.

### Assumption

- Keeping one canonical contract map for cockpit surfaces reduces integration drift and avoids frontend-invented authority.

### Needs Verification

- Runtime environment parity still needs explicit verification evidence for each canonical endpoint and payload shape.

## Decision

We will adopt and document the cockpit contract as a three-surface authority model:

- Analytics authority: `GET /summary/dashboard-analytics`
- Today-locations authority: `GET /attendance/today-locations`
- Reports/export authority: `GET /summary`

We will treat `/api/summary` as non-canonical for this cockpit flow and will not treat `/api/summary/dashboard-map` as an active integration path.

We will source Fuzzy AHP snapshot data from analytics payloads and lazy-load detail from `GET /analysis/fuzzy-ahp`.

## Rationale

This keeps the dashboard truthful about source-of-truth boundaries, prevents duplicate or ambiguous endpoint usage, and aligns operational reporting/export responsibilities with the already-approved branch design.

## Trade-offs / Consequences

- Positive: clearer authority boundaries for cockpit features.
- Positive: lower risk of endpoint drift (`/api/summary` alias confusion).
- Negative: non-canonical aliases cannot be treated as fallback truth for this cockpit path.
- Negative: strict contract mapping can surface more `backendRequired` states when canonical feeds are incomplete.

## Evidence / References

- Approved INF-160 branch decisions for contract adoption (task context).
- `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md`
- `docs/adr/ADR-005-service-and-api-integration-consistency-boundary.md`

## Open Verification Points

- Validate canonical endpoint responses in target runtime environments.
- Validate analytics snapshot and lazy-detail consistency for Fuzzy AHP (`/summary/dashboard-analytics` vs `/analysis/fuzzy-ahp`).
