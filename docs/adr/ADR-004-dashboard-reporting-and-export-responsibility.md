# ADR-004-dashboard-reporting-and-export-responsibility

## ADR ID

ADR-004

## Title

Dashboard, reporting, and export responsibility

## Status

Proposed

## Context

### Fact

- Web FE now renders the active dashboard as a conservative cockpit surface: `src/index.html` composes the stats card group and dashboard cockpit grid, and does not embed the old detailed report table on the main page.
- The cockpit is intentionally fail-conservative: cards and panels may stay `error`, `empty`, `needsData`, or `backendRequired` when the backend contract is absent, invalid, or incomplete.
- The dashboard now loads owner-specific backend sources with separate responsibilities: selected-period `/summary/reports` data for report/export flows, `/summary/dashboard-analytics` for historical analytics panels, `/attendance/geofence-evidence` for geofence evidence, `/attendance/today-locations` for the live-map hero, and `/analysis/fuzzy-ahp/dashboard-recap` for FAHP decision-support recap.
- `src/js/services/reportService.js` and dedicated owner services keep these requests transport-oriented, while `src/js/services/dashboardCockpitService.js` unwraps source-specific payloads and decides whether each cockpit panel may become `ready`, `needsData`, `backendRequired`, or `error`.
- The active dashboard hero is no longer sourced from selected-period report rows or from analytics `map_context`. It now waits for explicit `attendance/today-locations` rows with usable coordinates and refuses to fall back to historical report-row coordinates or analytics snapshot markers.
- Historical Attendance Trend is no longer a fixed two-line preview model. It accepts an explicit backend `historical_trend` / `historicalTrend` payload only when `historical_trend.points[]` contains valid per-date `on_time`, `late`, and `alpha` values that can be truthfully adapted into the FE range view.
- When the explicit historical trend payload is absent, Web FE may still show preview-only trend data, but that preview remains `backendRequired`, marked `dummy-preview`, and excluded from export.
- When the backend sends an incomplete or invalid historical trend payload, Web FE must keep the panel conservative and must not derive trend from summary totals or split a merged `late_alpha_risk` feed into separate `late` and `alpha` series.
- Attendance Mode Mix may render only from explicit dashboard analytics `mode_mix.totals` for canonical `wfo`, `wfh`, and `wfa` categories. Backend `mode_mix.percentages` may be displayed when present; otherwise FE may derive percentage labels only as presentation output from explicit totals.
- Fuzzy AHP Decision Center may become `ready` only from explicit `analysis/fuzzy-ahp/dashboard-recap` sections under its independent `{ category, analysis_type }` filter model.
- Geofence Evidence may become `ready` only from explicit `/attendance/geofence-evidence` payloads and must not be implied by analytics or report ownership.
- Export is exposed through one `Export Attendance Report` modal with PDF and Excel choices; each choice reloads the selected-period backend `/summary/reports` payload before generating the file client-side.
- Export must fail closed when pagination completeness metadata is missing, non-numeric, or inconsistent with fetched rows, so Web FE does not present a partial dataset as reporting truth.
- PDF now uses a compact summary/report contract. Its main table is driven by `report.user_attendance_summary`, not by raw `report.data` detail rows.
- When `report.user_attendance_summary` is unavailable, PDF keeps the table in a conservative backend-required state instead of silently flattening raw report rows into a faux summary view.
- Excel keeps the raw audit/reporting surface: the workbook preserves summary sheets plus raw selected-period `report.data` rows for the detailed attendance sheet.
- Missing backend fields remain explicitly `Unavailable`, while explicit zero values remain visible; Web FE must not silently upgrade missing values into factual-seeming defaults.
- Export remains a client-generated operational artifact from validated backend payload and must not be described as audit-grade proof unless backend/product governance explicitly upgrades that contract.
- A mock summary helper still exists in report service code, but it is not the active runtime path for dashboard fetching or export generation.

### Assumption

- Web FE reporting remains a presentation and export surface for backend-provided operational truth, not an independent authority.
- Operators need conservative visibility more than visually complete fallbacks.
- An explicit live map sourced from `attendance/today-locations` is materially different from analytics snapshot context or historical report-row evidence and must be described as such.
- `report.user_attendance_summary` is the intended backend-owned summary source for compact PDF reporting, while `report.data` remains the raw row source for Excel audit detail.

### Needs Verification

- Whether deployed backend environments consistently expose usable `attendance/today-locations` coordinates for the live-map hero still requires runtime verification.
- Whether deployed backend environments consistently expose explicit `historical_trend.points[]` rows with usable `on_time`, `late`, and `alpha` values still requires runtime verification.
- Whether PDF/Excel should remain operational convenience artifacts or be hardened into audit-grade outputs still needs product and backend confirmation.
- Whether the mock summary helper should remain for isolated local testing or be removed entirely is not centrally governed in this repo.
- Whether Geofence Evidence Context will receive an explicit backend contract in this workstream remains unresolved.

## Decision

We will keep the dashboard as a truth-preserving cockpit surface whose visible runtime composition on the main page is limited to the stats card group and cockpit grid. Web FE may summarize and visualize backend data, but it must not reintroduce the old embedded detailed report table on the main dashboard page as a competing authority surface.

We will treat the active dashboard hero as an explicit `attendance/today-locations` live-map surface. It may become `ready` only from valid today-locations rows with usable coordinates. It must not fall back to selected-period report-row coordinates, invent markers, or silently substitute analytics snapshot context.

We will keep report/export transport separate from owner-specific dashboard requests. `/summary/reports` remains the selected-period reporting/export path, while `/summary/dashboard-analytics`, `/attendance/geofence-evidence`, `/attendance/today-locations`, and `/analysis/fuzzy-ahp/dashboard-recap` remain owner-specific dashboard surfaces. Cockpit-specific envelope unwrapping and no-fallback normalization belong in `dashboardCockpitService`, not in the shared request layer.

We will treat Historical Attendance Trend as backend-ready only when the explicit analytics payload provides valid `historical_trend.points[]` entries with per-date `on_time`, `late`, and `alpha` values. FE may adapt those rows into a single dashboard range for visualization, but it must not derive trend from summary totals or split merged late/alpha risk signals. If the feed is absent, preview-only trend data may remain visible as a clearly marked backend-required placeholder. If the feed is incomplete or invalid, Web FE must stay conservative.

We will keep export as the selected-period backend-data-backed reporting path, but split responsibilities honestly:

- PDF is a compact management/report artifact centered on `report.user_attendance_summary`.
- Excel preserves raw selected-period report rows from `report.data` for detailed audit review.

When summary/export payload completeness cannot be verified, export must fail instead of producing a partial or unverifiable file. Missing backend fields must remain `Unavailable`, and explicit zero values must remain visible.

Web FE may format, group, and visualize backend-provided data for operator usability, but it must not invent authoritative analytics, silently convert missing values into factual defaults, treat preview data as export-safe truth, or let dashboard presentation overrule backend reporting contracts.

## Rationale

This boundary is necessary because the branch has become stricter than the earlier dashboard contract. The main page now behaves like a cockpit, not a cockpit-plus-table hybrid, so the ADR must stop implying that the detailed report table is part of the active dashboard authority surface.

The live-map hero, analytics trend/mode panels, geofence evidence panel, and FAHP recap panel now rely on separate explicit backend contracts rather than a single selected-period report payload. That separation matters: if Web FE reuses report rows for the live map, treats analytics as geofence authority, derives attendance trend from summary totals, or borrows FAHP recap from non-recap endpoints, the UI would manufacture analytical truth that the backend never actually exposed.

The export split is equally important. PDF has been narrowed into a compact management-oriented summary view, while Excel keeps the raw row-oriented audit surface. Treating both exports as if they came from the same row contract would misdescribe what the branch actually ships and would weaken operator trust when payloads are incomplete.

## Considered Options

1. **Recommended: conservative cockpit + explicit analytics contract + split export authority**
   - Main dashboard page stays focused on cockpit surfaces.
   - Live Map requires an explicit `attendance/today-locations` contract, while Historical Trend requires an explicit dashboard analytics contract.
   - PDF and Excel keep distinct truth-preserving responsibilities.
2. **Reuse selected-period report rows for all dashboard analytics panels**
   - Rejected because it would blur the line between row review and analytics authority.
3. **Let frontend derive missing trend series from summary totals or merged risk fields**
   - Rejected because it would fabricate backend analytics the server did not provide.
4. **Use raw report rows for both PDF and Excel exports**
   - Rejected because the shipped PDF contract is now intentionally compact and summary-driven.

## Trade-offs / Consequences

- Positive: keeps dashboard analytics honest about which panels are explicit backend truth versus placeholders.
- Positive: prevents Web FE from manufacturing map/trend authority from weaker payloads.
- Positive: documents the real export split between compact PDF summary and raw Excel audit detail.
- Positive: makes future backend contract gaps visible instead of hiding them behind frontend fallbacks.
- Negative: some panels will remain `backendRequired`, `needsData`, or `error` until backend contracts are completed.
- Negative: runtime verification is still required before claiming end-to-end availability of explicit `attendance/today-locations`, `historical_trend.points[]`, and `analysis.fuzzy-ahp` feeds.
- Negative: product stakeholders may perceive the conservative states as incomplete UX, even though they protect reporting truth.
- Negative: any future dashboard/reporting change must explicitly declare whether it belongs to cockpit visualization, backend analytics, summary export, or raw audit export.

## Evidence / References

- `src/index.html:113-120` — main dashboard composition includes only the stats card group and cockpit grid.
- `src/js/features/dashboard/dashboard.js` — dashboard loads selected-period report plus owner-specific analytics, geofence evidence, live map, and FAHP recap sources while keeping cockpit state conservative when any explicit feed fails or is incomplete.
- `src/js/services/reportService.js:66-86` — dashboard analytics request remains a raw controller-envelope passthrough.
- `src/js/services/dashboardCockpitService.js:1370-1399` — cockpit boundary unwraps source-specific payloads and composes a conservative multi-source dashboard state instead of inventing cross-source truth.
- `src/js/features/dashboard/dashboard.js:541-565` — export completeness validation fails when total metadata is missing or inconsistent.
- `src/js/features/dashboard/dashboard.js:569-599` — export flow reloads the selected-period backend `/summary/reports` payload before generation.
- `src/js/services/dashboardCockpitService.js:1370-1399` — active cockpit composition treats explicit `today-locations` rows as the live-map authority and keeps the hero conservative instead of falling back to analytics snapshot or report-row coordinates.
- `src/js/services/dashboardCockpitService.js:83-106` — cockpit definitions reserve Historical Trend, Mode Mix, Fuzzy AHP, and Geofence as separate responsibility surfaces.
- `src/js/services/dashboardCockpitService.js:138-184` — preview Historical Trend is modeled as three explicit series (`ontime`, `late`, `alpha`).
- `src/js/services/dashboardCockpitService.js:824-910` — Historical Trend normalization requires explicit backend `historical_trend.points[]` entries with usable per-date values before FE adapts them into the dashboard range view.
- `src/js/services/dashboardCockpitService.js:913-977` — Historical Trend stays preview-only when absent and refuses incomplete backend payloads.
- `src/js/services/dashboardCockpitService.js` — Today Locations / Live Map waits for explicit `attendance/today-locations` rows with usable coordinates and does not fall back to report-row or analytics-snapshot markers.
- `src/js/services/dashboardCockpitService.js` — Fuzzy AHP recap and Geofence Evidence now each have explicit backend-backed ready paths and stay conservative when their dedicated contracts are missing or invalid.
- `src/js/utils/reportGenerator.js:1404-1436` — workbook includes a dedicated `User Attendance Summary` sheet built from PDF summary columns.
- `src/js/utils/reportGenerator.js:751-808` — PDF summary rows and fallback model are driven by `report.user_attendance_summary`.
- `src/js/utils/reportGenerator.js:880-905` — Excel report rows preserve raw row-level attendance/audit fields.
- `src/js/utils/reportGenerator.js:924-952` — PDF layout model is centered on the compact `User Attendance Summary` table.
- `src/js/services/reportService.js` — mock helpers may exist, but runtime dashboard/export truth still depends on the active backend request path.

## Open Verification Points

- Confirm live backend availability of explicit `attendance/today-locations` rows with usable coordinates in the target environment.
- Confirm live backend availability and correctness of explicit `historical_trend` / `historicalTrend` `points[]` rows with usable `on_time`, `late`, and `alpha` values.
- Confirm whether PDF/Excel should remain operational artifacts or be promoted to stronger audit-grade outputs.
- Confirm live backend availability and field shape for explicit `analysis.fuzzy-ahp` rankings / consistency ratio, and separately confirm whether Geofence Evidence Context will receive its own backend contract in the same delivery scope.
- Confirm whether the mock summary helper still has a justified maintenance role.
