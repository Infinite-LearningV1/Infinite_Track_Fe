# ADR-008-summary-search-period-contract-adoption

## ADR ID

ADR-008

## Title

Summary search and period contract adoption

## Status

Proposed

## Context

### Fact

- FE summary-report consumer path has migrated to canonical endpoint `GET /api/summary/reports`.
- FE summary-report consumer path has migrated to canonical search parameter `q`.
- FE summary-report consumer path has migrated to canonical period values: `daily | weekly | monthly | range`.
- FE no longer sends `all` period on this summary-report consumer path.
- Backend aliases and legacy variants may still be accepted for compatibility, but FE no longer sends them to reduce request noise and contract ambiguity.

### Assumption

- Keeping FE requests canonical and explicit reduces integration drift and simplifies backend request interpretation.

### Needs Verification

- Runtime verification is still required to confirm no remaining FE call sites send legacy search aliases or non-canonical period values on the summary-report consumer path.

## Decision

We will standardize the FE summary-report consumer contract as:

- Endpoint: `/api/summary/reports`
- Search parameter: `q`
- Period enum: `daily | weekly | monthly | range`

We will drop `all` from FE requests on this consumer path.

We will not send legacy alias keys/values from FE even when backend compatibility aliases still exist, to keep FE traffic canonical and low-noise.

## Scope Note

This decision is intentionally minimal and does **not** change cockpit, map, or Fuzzy AHP behavior.

## Rationale

A single canonical FE contract for summary-report search and period handling reduces ambiguity, avoids dual-parameter drift, and keeps FE responsibility aligned with backend authority while preserving backend-side compatibility where needed.

## Trade-offs / Consequences

- Positive: clearer FE-to-backend contract for summary reports.
- Positive: reduced parameter alias noise in backend telemetry/logs.
- Negative: FE no longer uses `all`; any UI or test fixtures depending on `all` must use canonical periods.
- Negative: temporary mismatch risk if hidden FE consumers still expect legacy aliases.

## Evidence / References

- `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md`
- `docs/adr/ADR-005-service-and-api-integration-consistency-boundary.md`
- `docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md`

## Open Verification Points

- Confirm all summary-report FE request builders emit `/api/summary/reports` + `q` + canonical period values only.
- Confirm no FE summary-report request emits `all` on this path.
