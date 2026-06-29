# Family F L1B — Report Attributes Contract Design

## Status

Planning/spec only. No Web FE or backend implementation is included in this spec.

## Context

Family F covers Monitoring, Reporting, and Admin Consumption. This spec focuses on Layer 1B: the report/export attribute contract for refreshed PDF and Excel outputs. Dashboard analytics work already has its own owner matrix through INF-159/INF-160/INF-176/INF-180, so this spec deliberately separates dashboard/cockpit analytics from report/export truth.

Primary Linear issues:

- INF-166 — Web FE export modal and refreshed PDF/Excel output implementation.
- INF-183 — Backend summary report export attributes alignment.
- INF-43 — Dashboard, reporting, and export responsibility boundary.
- INF-171 / INF-155 — Backend summary search contract and investigation.

Historical context only:

- INF-109 — Dashboard table single state contract (obsolete after dashboard table removal).
- INF-111 — Dashboard search explicit contract (re-scope needed if referenced again).

User-provided visual targets on 2026-06-28 define the desired export modal, PDF output, and Excel workbook output. The visuals are target design references, not evidence that every field is already backend-available.

## Goals

- Define the report/export source-of-truth boundary before implementation.
- Produce an attribute matrix for the refreshed export modal, PDF, and Excel workbook.
- Identify backend gaps before Web FE presents missing values as reporting truth.
- Keep Web FE from inventing authoritative attendance/reporting values.
- Provide clear execution gates for INF-166 and INF-183.

## Non-goals

- Do not implement the modal, PDF, Excel, or backend endpoint changes in this spec.
- Do not change dashboard analytics ownership.
- Do not use dashboard analytics as the source of report/export truth.
- Do not make export artifacts look like final ledger/audit-grade proof unless product/backend governance explicitly upgrades that contract.
- Do not remove the deprecated `/api/summary` alias as part of this scope.

## Contract boundary

| Surface | Owner endpoint | Purpose | Status |
| --- | --- | --- | --- |
| Dashboard analytics cards/charts | `/api/summary/dashboard-analytics` | Dashboard/cockpit historical overview only | Existing dashboard contract |
| Report/export table rows | `/api/summary/reports` | Report/export source for row and summary data | Existing canonical contract |
| PDF management report | `/api/summary/reports` | Client-generated artifact from canonical backend response | Backend contract fixed |
| Excel workbook | `/api/summary/reports` | Detailed operational workbook from canonical backend response | Backend contract fixed |
| Today/live map | `/api/attendance/today-locations` | Today-only map context | Not report/export truth |
| Geofence evidence | `/api/attendance/geofence-evidence` | Supporting geofence evidence context | Not final attendance truth |
| FAHP detail | `/api/analysis/fuzzy-ahp/discipline`, `/wfa`, `/smart-ac` | Dedicated FAHP detail and decision-support surfaces | Not report/export source unless explicitly contracted |

### Endpoint decision

Current Web FE must treat `GET /api/summary/reports` as the fixed canonical report/export data source.

This spec no longer treats `GET /api/summary/reports/pdf` and `GET /api/summary/reports/excel` as active dependencies for FE implementation. If such endpoints are introduced later, they must be documented as a separate contract change and must not silently replace `/api/summary/reports` semantics.

## Export modal target

The Web FE export entry point should be a single modal, based on the user-provided visual target.

Required modal copy:

- Title: `Export Attendance Report`
- Subtitle: `Choose the report format and data scope for the selected period.`

Format cards:

- `PDF Report`
  - For printable management summaries, thesis evidence, and formal reporting.
  - Includes executive summary, KPI cards, statistic charts, and compact attendance table.
- `Excel Workbook`
  - For detailed data analysis, filtering, and HR/admin review.
  - Includes summary sheet, attendance report sheet, discipline insight sheet, and filter-ready columns.

Export scope options:

- `Current period`
- `All records in selected period`
- `Filtered records only`

Additional options:

- Include summary statistics
- Include discipline score
- Include work mode distribution
- Include location description

Behavior rules:

- Show a truthful info note, e.g. export is generated from validated attendance records for the selected period.
- Show a loading/progress state such as `Preparing export file...`.
- Keep `Filtered records only` disabled or explicitly marked backend-required until canonical `/api/summary/reports` semantics confirm complete filtered export behavior.
- Format selection must continue using the canonical `/api/summary/reports` response contract unless a future backend contract explicitly replaces it.

## PDF output target

The desired PDF is a formal, print-friendly `Attendance Summary Report` with Infinite Track branding.

Required sections:

1. Header and metadata
2. `Executive Summary`
3. `Statistics`
4. `Detailed Attendance Table`
5. Footer with generated-by, page number, and internal/confidential note

User decision: remove/omit the `Report Insight` section.

Metadata fields:

- Period
- Generated on
- Generated by
- Data source

Executive Summary cards:

- Attendance Rate
- Late / Alpha Risk
- Avg Discipline
- Needs Attention

Statistics cards:

- Attendance Status Distribution: On Time, Late, Alpha
- Work Mode Distribution: WFO, WFH, WFA
- Discipline Score Range: Excellent, Good, Needs Review, Attention

Detailed Attendance Table columns:

- Employee Name
- NIP/NIM
- Role
- Date
- Check In
- Check Out
- Status
- Work Mode
- Discipline Score

PDF truth rules:

- Do not show `Report Insight`.
- If `Needs Attention` is not backend-provided, show `Unavailable` or omit it.
- If `Avg Discipline` is derived from returned rows, label it as row-derived. Prefer backend aggregate for period-wide report.
- Statistics may be frontend formatting of explicit backend counts, but not inference from missing fields.
- PDF must remain an operational/management report artifact unless backend/product upgrades it to audit-grade proof.

## Excel workbook target

The desired Excel workbook has three sheets:

1. `Summary`
2. `Attendance Report`
3. `Discipline Insight`

### Summary sheet

Target fields:

- Report title
- Period
- Generated on
- Total Records
- Data Source
- Attendance Rate
- Late / Alpha Risk
- Average Discipline
- Needs Attention
- On Time
- Late
- Alpha
- WFO
- WFH
- WFA

### Attendance Report sheet

Target columns:

- Full Name
- NIP/NIM
- Role
- Email
- Phone Number
- Attendance Date
- Check In Time
- Check Out Time
- Work Hours
- Status
- Work Category
- Information
- Notes
- Discipline Score
- Discipline Label
- Location Description

### Discipline Insight sheet

Target columns:

- Employee Name
- Division
- Attendance Rate
- Late Count
- Alpha Count
- Avg Discipline Score
- Discipline Label
- Recommended Action

Excel truth rules:

- `Attendance Report` should use row-level report fields.
- `Discipline Insight` should prefer per-user period summary fields from backend.
- `Recommended Action` must be backend-provided or explicitly rule-based, supporting, and non-authoritative.
- Styling should be best-effort if the existing Excel generation library cannot reproduce all visual formatting in the reference.

## Attribute matrix

| Field name | UI/export label | Export surface | Source endpoint | Source path | Source type | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| period | Period | Modal/PDF/Excel | `/api/summary/reports` or candidate `/pdf` `/excel` | request `period`, response `period` | Backend field + FE formatting | Low | Available / Needs Verification |
| generated_at | Generated on | PDF/Excel | `/api/summary/reports` | client generation timestamp | FE metadata | Medium: client timestamp differs from backend processing time | Needs UI Decision |
| data_source | Data Source | PDF/Excel | `/api/summary/reports` | Static/provenance label | Frontend formatting | Low | Available |
| total_records | Total Records | PDF/Excel | `/api/summary/reports` | `report.pagination.total_items` / `report.pagination.total_records` | Backend aggregate | Medium: must match export scope | Available / Needs Verification |
| total_ontime | On Time | PDF/Excel | `/api/summary/reports` | `summary.total_ontime` | Backend aggregate | Medium: period-wide if search is active | Available |
| total_late | Late | PDF/Excel | `/api/summary/reports` | `summary.total_late` | Backend aggregate | Medium: period-wide if search is active | Available |
| total_alpha | Alpha | PDF/Excel | `/api/summary/reports` | `summary.total_alpha` | Backend aggregate | Medium: period-wide if search is active | Available |
| total_wfo | WFO | PDF/Excel | `/api/summary/reports` | `summary.total_wfo` | Backend aggregate | Medium: period-wide if search is active | Available |
| total_wfh | WFH | PDF/Excel | `/api/summary/reports` | `summary.total_wfh` | Backend aggregate | Medium: period-wide if search is active | Available |
| total_wfa | WFA | PDF/Excel | `/api/summary/reports` | `summary.total_wfa` | Backend aggregate | Medium: period-wide if search is active | Available |
| attendance_rate | Attendance Rate | PDF/Excel Summary | `/api/summary/reports` | Derived from `summary.total_ontime`, `summary.total_late`, `summary.total_alpha` following backend response semantics | Frontend formatting from backend aggregates | High: denominator semantics must be explicit in FE copy | Needs UI Decision |
| late_alpha_risk | Late / Alpha Risk | PDF/Excel Summary | `/api/summary/reports` | Derived from `summary.total_late + summary.total_alpha` | Frontend formatting from backend aggregates | Medium: count vs users wording differs | Needs UI Decision |
| avg_discipline | Avg Discipline | PDF/Excel Summary | `/api/summary/reports` | `analytics.discipline_analysis.average_discipline_score` | Backend aggregate | Medium: FE must describe this according to backend response scope | Available / Needs Verification |
| needs_attention | Needs Attention | PDF/Excel Summary | `/api/summary/reports` | Not present in canonical response | Not available in backend response | High: must not be invented | Out of Scope / Needs UI Decision |
| full_name | Employee Name / Full Name | PDF/Excel rows | `/api/summary/reports` | `report.data[].full_name`, `report.user_attendance_summary[].full_name` | Backend field | Low | Available |
| nip_nim | NIP/NIM | PDF/Excel rows | `/api/summary/reports` | `report.data[].nip_nim` | Backend field | Low | Available |
| role | Role | PDF/Excel rows | `/api/summary/reports` | `report.data[].role`, `report.user_attendance_summary[].role_name` | Backend field | Low | Available |
| email | Email | Excel Attendance Report | `/api/summary/reports` | `report.data[].email` | Backend field | Medium: PII/export handling | Available |
| phone_number | Phone Number | Excel Attendance Report | `/api/summary/reports` | Not present in canonical response | Not available in backend response | High: PII and availability uncertain | Out of Scope / Needs UI Decision |
| attendance_date | Date / Attendance Date | PDF/Excel rows | `/api/summary/reports` | `report.data[].attendance_date`, `report.user_attendance_summary[].latest_attendance_date` | Backend field | Low | Available |
| time_in | Check In / Check In Time | PDF/Excel rows | `/api/summary/reports` | `report.data[].time_in` | Backend field | Low | Available |
| time_out | Check Out / Check Out Time | PDF/Excel rows | `/api/summary/reports` | `report.data[].time_out` | Backend field | Low | Available |
| work_hour | Work Hours | Excel Attendance Report | `/api/summary/reports` | `report.data[].work_hour` | Backend field | Low | Available |
| status | Status | PDF/Excel rows | `/api/summary/reports` | `report.data[].status`, `report.user_attendance_summary[].latest_attendance_status` | Backend field | Low | Available |
| work_category | Work Mode / Work Category | PDF/Excel rows | `/api/summary/reports` | `report.data[].location_details.category`, `report.data[].information`, or `report.user_attendance_summary[].wfo_days/wfh_days/wfa_days` | Backend field + FE formatting | Medium: category vs information wording | Needs Verification |
| information | Information | Excel Attendance Report | `/api/summary/reports` | `report.data[].information` | Backend field | Medium: may contain generated text, not raw category | Available / Needs Verification |
| notes | Notes | Excel Attendance Report | `/api/summary/reports` | `report.data[].notes` | Backend field | Medium: may contain operational annotations | Available |
| discipline_score | Discipline Score | PDF/Excel rows | `/api/summary/reports` | `report.data[].discipline_score` | Backend field | Medium: row-level vs period-level | Available |
| discipline_label | Discipline Label | Excel rows / Discipline Insight | `/api/summary/reports` | `report.data[].discipline_label` | Backend field | Medium: row-level vs period-level | Available |
| location_description | Location Description | Excel Attendance Report | `/api/summary/reports` | `report.data[].location_details.description` | Backend field | Medium: optional | Available / Needs Verification |
| division | Division | Excel Discipline Insight | `/api/summary/reports` | `report.user_attendance_summary[].division` | Backend field | Medium: nullable | Available / Needs Verification |
| expected_working_days | Expected Working Days | Excel Discipline Insight support | `/api/summary/reports` | `report.user_attendance_summary[].expected_working_days` | Backend field | High if used as denominator | Available / Needs Verification |
| valid_attendance_days | Valid Attendance Days | Excel Discipline Insight support | `/api/summary/reports` | `report.user_attendance_summary[].valid_attendance_days` | Backend field | High if used for attendance rate | Available / Needs Verification |
| on_time_days | On Time Count | PDF/Excel summary rows | `/api/summary/reports` | `report.user_attendance_summary[].on_time_days` | Backend field | Low | Available / Needs Verification |
| late_days | Late Count | PDF/Excel summary rows | `/api/summary/reports` | `report.user_attendance_summary[].late_days` | Backend field | Low | Available / Needs Verification |
| alpha_days | Alpha Count | PDF/Excel summary rows | `/api/summary/reports` | `report.user_attendance_summary[].alpha_days` | Backend field | Low | Available / Needs Verification |
| per_user_attendance_rate | Attendance Rate | Excel Discipline Insight | `/api/summary/reports` | Derived from `valid_attendance_days / expected_working_days` when both values are present | Frontend formatting from backend fields | High: denominator and null handling must be explicit | Needs UI Decision |
| per_user_avg_discipline_score | Avg Discipline Score | Excel Discipline Insight | `/api/summary/reports` | Not present as explicit period-level per-user aggregate | Not available in backend response | High: row-level score is not necessarily period average | Out of Scope / Needs UI Decision |
| recommended_action | Recommended Action | Excel Discipline Insight | `/api/summary/reports` | Not present in canonical response | Not available in backend response | High: can be mistaken as HR decision | Out of Scope / Needs UI Decision |

## Canonical backend response usage

Web FE implementation for this scope must follow the fixed canonical backend response from `GET /api/summary/reports`.

Implementation assumptions for FE consumers:

- summary/export aggregates come from `summary`
- detailed attendance rows come from `report.data`
- export completeness checks rely on `report.pagination`
- compact summary/report rows may use `report.user_attendance_summary` when the FE output requires per-user summarized views
- discipline aggregate values may use `analytics.discipline_analysis` only when the field exists explicitly in the backend response and is documented as part of the report/export contract

Open FE decisions, not backend decisions:

- whether `Filtered records only` remains disabled until canonical response semantics are proven safe for export
- whether fields absent from the backend response are omitted or rendered as `Unavailable`
- whether derived fields such as attendance-rate copy are labeled explicitly as FE formatting from backend aggregates

## Execution gates

### Backend INF-183 gate

For this baseline, INF-183 is treated as resolved enough for FE to follow the fixed backend response contract.

Remaining work is to keep field availability aligned to the backend response actually returned by `GET /api/summary/reports`, especially for fields that are absent and therefore must remain out-of-scope or unavailable in FE.

### Web FE INF-166 gate

INF-166 may proceed safely once:

- INF-160 dashboard binding is stable enough for export UI changes,
- FE implementation follows the fixed backend response contract without inventing fields,
- FE behavior for missing fields is explicitly specified,
- export scope semantics are documented.

If a target visual field is absent from the backend response, INF-166 must omit it or render it as unavailable instead of reopening backend assumptions in FE code.

## Verification plan

Spec verification:

- Check that every desired visual field appears in the attribute matrix.
- Check that no uncertain field is marked simply `Available` without `Needs Verification` or a caveat.
- Check that PDF explicitly omits `Report Insight`.
- Check that dashboard analytics is not used as report/export truth.
- Check that candidate `/pdf` and `/excel` endpoints are marked as backend decisions, not existing facts.

Backend future verification:

- Focused tests for `GET /api/summary/reports` response shape.
- OpenAPI contract tests for changed fields or new `/pdf` and `/excel` endpoints.
- Runtime smoke for daily, weekly, monthly, and range periods.
- Runtime smoke for `q=<term>` if filtered export is supported.
- Sanitized evidence only: no real token, email, phone number, NIP/NIM, or full name in committed logs.

Web FE future verification:

- Modal opens/closes and preserves selected format/scope/options.
- PDF generation has no `Report Insight` section.
- PDF metadata, Executive Summary, Statistics, and Detailed Attendance Table match the target structure.
- Excel workbook has `Summary`, `Attendance Report`, and `Discipline Insight` sheets.
- Missing backend fields render unavailable/omitted, not fake-filled.
- Export fails closed on incomplete payloads.

## Docs / ADR update note

DOCS/ADR UPDATE REQUIRED if any final implementation:

- adds `/api/summary/reports/pdf`,
- adds `/api/summary/reports/excel`,
- changes `/api/summary/reports` response semantics,
- introduces backend aggregates such as `Needs Attention`,
- formalizes `Recommended Action`,
- changes filtered export scope/search semantics,
- upgrades export artifacts from operational reports to audit-grade outputs.

Pure Web FE layout/styling changes may be captured in PR notes if they preserve the existing reporting authority boundary.

## Review / PR / release notes

This spec is not an implementation PR. Future PRs should state:

- whether backend contract changed,
- whether PDF/Excel are client-generated or backend-native exports,
- which fields remain unavailable or out-of-scope,
- which verification commands/runtime smokes were executed,
- whether ADR/docs were updated.
