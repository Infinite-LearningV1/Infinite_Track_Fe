# ADR-004-dashboard-reporting-and-export-responsibility

## ADR ID
ADR-004

## Title
Dashboard, reporting, and export responsibility

## Status
Proposed

## Context
### Fact
- Web FE renders dashboard summaries and attendance/reporting tables in the browser.
- Export features for PDF and Excel are implemented in frontend code.
- The dashboard stores raw API data for export and explicitly reloads export data from API.
- Report service contains a development-only fallback path that can return mock summary data when API calls fail in development conditions.
- Map and location detail views are presentation features layered onto reporting/admin workflows.

### Assumption
- Reporting in Web FE is intended to summarize and present backend-provided operational data, not to redefine domain truth.
- Correctness and operator trust matter more than presentation convenience.

### Needs Verification
- Whether exports are meant to be audit-grade artifacts or operational convenience outputs remains unclear.
- The exact acceptable use of development fallback data outside local development is not centrally governed in this repo.
- Whether export flows are formally required to fail closed in all non-development environments still needs confirmation, even though the current dashboard path suggests that direction.

## Decision
We will treat dashboard summaries, analytics views, maps, and exports as truth-preserving presentations of backend-provided data; Web FE may summarize and format, but it must not become an independent reporting authority.

## Rationale
This area directly shapes operator confidence. The frontend can aggregate, filter, format, and export data for admin use, but if those outputs drift from backend truth or silently fall back to invented values, users may trust the wrong result. The current repo already shows a split posture: development may use mock summary fallback, while the dashboard export path appears designed to require valid API-backed export data. A truth-preserving rule keeps reporting useful while limiting the risk that convenience features become mistaken for authoritative records.

## Considered Options
1. **Recommended: truth-preserving presentation and export**
   - Frontend summarizes and formats backend-returned data.
   - Any uncertainty is made visible.
2. **Frontend-generated reporting as independent authority**
   - Rejected because it risks false confidence and divergence.
3. **Minimal dashboard only, no presentation transforms**
   - Rejected because the product role clearly includes dashboard, reporting, export, and location visualization.

## Trade-offs / Consequences
- Positive: preserves operator trust in reporting surfaces.
- Positive: keeps export logic aligned with backend-sourced data.
- Negative: frontend cannot freely invent fallbacks or reinterpret data semantics for convenience.
- Negative: some dashboard/export defects will need backend contract clarification rather than UI-only patches.

## Evidence / References
- User-provided context: reporting must not become a new source of truth; dashboard/reporting/export are high-risk Web FE areas.
- `src/index.html:55-56` — dashboard is initialized client-side.
- `src/js/services/reportService.js:33-57` — summary report is requested from API.
- `src/js/services/reportService.js:66-73` — development fallback returns mock data when API fails.
- `src/js/features/dashboard/dashboard.js:311-333` — raw API response is stored for export and cleared when invalid.
- `src/js/features/dashboard/dashboard.js:359-388` — export path reloads data specifically for export.
- `src/js/features/dashboard/dashboard.js:475-507` — PDF export validates export data before generating.
- `src/js/features/dashboard/dashboard.js:525-557` — Excel export validates export data before generating.
- `src/js/utils/reportGenerator.js:1-3` — export stack uses jsPDF, autotable, and XLSX.
- `src/js/utils/reportGenerator.js:145-156` and `372-392` — exported rows are derived from report payload fields including `location_details`.
- `src/js/index.js:72-126` — map detail modal presents location details in browser runtime.

## Open Verification Points
- Decide whether production must hard-fail exports when authoritative API data is unavailable.
- Confirm whether development fallback data is strictly local-dev only or allowed in any shared environment.
- Confirm whether PDF/Excel outputs need explicit provenance markers such as period, generation time, and backend response basis.
