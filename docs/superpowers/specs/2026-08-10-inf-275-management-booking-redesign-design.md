# INF-275 Management Booking Approval Queue and Detail Drawer Design

**Date:** 2026-08-10
**Repository:** `Infinite-LearningV1/Infinite_Track_Fe`
**Base branch:** `develop`
**Issue:** INF-275
**Backend dependency:** INF-274
**Scope:** Web FE only

## Objective

Redesign Management Booking from a generic booking table into a truthful Admin/Management WFA approval queue. The page must make the review sequence obvious without widening Frontend authority beyond the Backend contract.

The primary decision path is:

```text
Who submitted?
→ When is WFA scheduled?
→ When was it submitted?
→ Why was it requested?
→ Which location was selected?
→ How suitable is the location?
→ What is the current decision state?
→ Review / approve / reject / inspect detail
```

The page remains an operational review surface, not a Dashboard analytics surface or a client-side booking source of truth.

## Repository facts confirmed before design

Current `develop` at audit time is `b6156e1`, which already contains the approved Management Pengguna and Management Attendance admin experience.

Current Management Booking is materially older than those screens:

- `src/management-booking.html` owns an inline search box, inline status select, and page-size control.
- The search placeholder advertises name, ID, and position although INF-274 search is only applicant name and NIP/NIM.
- `src/partials/table/table-booking.html` renders ID, Employee, Position, Schedule Date, Notes, Koordinat, Status, Suitability, and Actions.
- The table exposes sortable headers even though INF-274 keeps fixed approval-first ordering and treats `sortBy` / `sortOrder` as deprecated no-ops.
- The location cell opens a map modal directly from the table.
- Pending rows expose direct approve and reject icon buttons before a review context is opened.
- Suitability uses a wide progress bar instead of the compact shared table rhythm.
- Delete is always visually prominent.

Current `bookingList.js` is 734 lines and still owns list state, sort compatibility, multiple modal/map states, decisions, delete, formatting, and legacy map compatibility. INF-275 must reduce this pressure only where the redesign requires it; it is not a general rewrite.
Current normalization also has contract drift that INF-275 must correct:

```text
requestOtherReason currently reads request_other_reason / requestOtherReason
rejectionNote currently reads rejection_note / rejectionNote
processed_by is not normalized
```

The canonical INF-274 projection instead publishes nested request/rejection metadata and processor identity. Compatibility fallbacks may remain only when explicit and tested.

Shared implementations already available for reuse are:

- `attendance-table-filter.html` for accessible anchored filter behavior, draft/applied semantics, active count, narrow-screen adaptation, and error/loading treatment;
- `attendance-detail-drawer.html` and `attendanceDetailDrawerLifecycle.js` for the right-side dialog shell, focus management, section cards, and map lifecycle;
- `table-attendance.html` for the current shared admin table visual language;
- `table-user.html` and `user-detail-drawer.html` for identity cells, badges, pagination, and drawer visual hierarchy.

Baseline evidence in the isolated INF-275 worktree:

```text
npm install                    PASS
npm run build                  PASS
focused WFA booking tests      25/25 PASS
```

`npm install` reports 20 existing audit findings in the dependency graph. They are pre-existing dependency debt and are outside INF-275.

## Approaches considered

### A. Template-only redesign

Keep all existing state and only replace HTML. This is the smallest diff, but it preserves fake sorting, contract drift, duplicated map/modal state, and direct decision actions. Rejected because the resulting UI would look new while retaining misleading behavior.

### B. Generic admin-table rewrite

Extract a generalized table/filter/drawer framework and migrate Booking onto it. This could reduce long-term duplication, but it expands INF-275 into a shared-component architecture project and risks regressions on Management Pengguna and Attendance. Rejected as too broad.

### C. Bounded Booking refactor — selected

Preserve the current multi-page Alpine architecture and shared visual language, while introducing only the focused boundaries needed by INF-275:

```text
management-booking.html
→ booking table/filter/drawer partials
→ bookingListAlpineData
   ├── pure booking query contract
   ├── booking payload normalizer
   └── focused drawer/map lifecycle helper
→ bookingService
→ authRequest
→ Backend
```

This approach keeps existing ownership recognizable, removes false UI semantics, and creates testable seams without turning the work into a frontend rewrite.

## Architecture contract

The existing repository boundary remains authoritative:

```text
Page shell
→ focused HTML partials
→ focused Alpine feature state
→ service module
→ authRequest
→ Backend
```

INF-275 must not add React/Vue, SPA routing, a second Axios/auth client, a global business store, or frontend repository/use-case layers.

`bookingListAlpineData()` remains the page-level coordinator. It may delegate pure concerns to focused modules but must not become a second source of Backend truth.

Recommended focused modules:

```text
src/js/features/wfaBooking/bookingManagementDirectoryQuery.js
src/js/features/wfaBooking/bookingList.contract.js
src/js/features/wfaBooking/bookingDetailDrawerLifecycle.js
```

The exact lifecycle filename may differ if an existing shared primitive can be reused directly, but Booking-specific field mapping must remain inside the WFA Booking feature boundary.

## Backend contract boundary

INF-274 is the source of truth for the Management Booking list. INF-275 consumes it; it does not reshape Backend semantics.

Canonical list request state is limited to:

```text
page
limit
search
status
date_from
date_to
```

Rules:

- `search` is server-side and advertises applicant full name and NIP/NIM only;
- `status` is `pending`, `approved`, or `rejected`;
- `date_from` / `date_to` filter WFA `schedule_date` inclusively;
- page-size options remain bounded to values accepted by Backend;
- changes to search, applied filters, or page size reset page to 1;
- paging preserves the applied search and filters;
- no client-side filtering, sorting, slicing, or total calculation occurs over a returned page;
- `sortBy` and `sortOrder` are not part of the new canonical FE state and are not sent by the redesigned request path.

The Backend's fixed approval-first ordering remains visible truth: Pending first, then Approved, then Rejected, with Backend-owned recency/tie-breaking.
Canonical normalized row fields required by the new UI are:

```text
id
employee_name
employee_id
employee_email
employee_position
employee_role
schedule_date
created_at
status
location_name
location_latitude
location_longitude
radiusSnapshot
notes
suitability_score
suitability_label
requestReason
requestOtherReason
rejectionReason
rejectionNote
processed_at
processedBy
approved_by   # compatibility only
```

`processedBy` maps from Backend `processed_by` and contains persisted actor identity when available. `approved_by` remains compatibility data and must not drive the new display when `processed_by` exists.
Normalization precedence is locked as:

```text
requestReason        ← request_reason → documented legacy aliases → null
requestOtherReason   ← request_reason.other_text → request_other_reason → legacy alias → ""
rejectionReason      ← rejection_reason → documented legacy object aliases → null
rejectionNote        ← rejection_reason.note → rejection_note → legacy alias → ""
processedBy          ← processed_by → null
radiusSnapshot       ← radius_snapshot → location.radius compatibility fallback → root radius fallback → null
suitabilityScore     ← suitability_score preserving null and numeric zero
suitabilityLabel     ← suitability_label → null/empty presentation state
```

Reason objects should retain `id`, `label`, and `isOther` where supplied. Legacy rows with no request reason remain `null`; the UI renders `Tidak tersedia` instead of inventing a reason.

Location coordinates are converted only when they are finite numbers after normalization. Numeric zero is valid. Missing coordinates remain unavailable.

Suitability rules are strict:

- `null` is unavailable/insufficient evidence, never `0`;
- numeric `0` is a valid score;
- score and label may both be absent;
- no fallback score or inferred label is generated in Web FE.

## Information architecture

The page composition is:

```text
Management Booking
→ visible server-side search + one Filter trigger
→ lightweight total result context
→ approval-first paginated table
→ Review/Detail opens right-side drawer
→ decision actions occur from review context
→ destructive delete remains secondary
```

No KPI cards, charts, dashboard summary, FAHP panel, export controls, or live-map hero are added.

The main toolbar adopts the current shared admin treatment from Management Attendance/Pengguna. Search stays visible. Status and date range move into one anchored Filter component. Page size moves to the table/pagination band rather than competing with the primary toolbar.

The search placeholder is locked to truthful Backend behavior:

```text
Cari nama atau NIP/NIM...
```

The Filter button exposes an active-count indicator when criteria are applied.

## Filter component

The Booking filter follows the proven Attendance interaction model but owns Booking-specific fields only:

```text
Status
Tanggal WFA mulai (`date_from`)
Tanggal WFA selesai (`date_to`)
```

`user_id` is not exposed in this redesign unless a canonical employee picker already exists and can be reused without widening scope.

State is split into draft and applied values. Opening or editing the popover never fetches. A successful Apply validates the date range, copies draft to applied state, resets page to 1, fetches once, and closes the popover.

Clear removes Booking filter criteria and reloads page 1. Dismissing the popover without Apply does not alter the active query.

The component must support:

- `aria-expanded` and `aria-controls` on the trigger;
- Escape, outside click, explicit close, and focus restoration;
- date-range validation before request submission;
- active filter count;
- a narrow-screen fixed/sheet presentation consistent with Attendance;
- loading-safe disabled states without losing the current draft.

## Table design

The table columns are locked to:

```text
Pemohon | Jadwal WFA | Diajukan | Alasan | Lokasi | Kelayakan | Status | Aksi
```

All headers are static in INF-275. There are no sort buttons, `aria-sort`, sort arrows, `changeSort()`, or decorative sorting affordances.

### Pemohon

Render a compact identity cell:

```text
Full name
NIP/NIM · Position
```

Use the shared initials avatar fallback. Do not fabricate a photo because the booking list contract does not provide one. Email and role remain detail-only metadata.

### Jadwal WFA

Use `schedule_date` as the primary value. A weekday may be secondary presentation if it uses the existing formatter and does not alter date semantics.

### Diajukan

Use `created_at` independently from `schedule_date`. Display a compact date/time. The two columns must never be merged because they answer different operational questions.

### Alasan

Primary text is `requestReason.label`. `requestOtherReason` appears as secondary text only when present. The cell is capped to two visible lines with a stable row height and a full-text title when useful.

Missing historical reason renders `Tidak tersedia`.

### Lokasi

The table renders only compact `location_name` / Backend `location.description` evidence. It is capped to two lines and may expose the full description through the native `title` attribute.

The location cell is **not interactive** in INF-275:

- no View button;
- no map navigation;
- no raw latitude/longitude;
- no radius;
- no comma-splitting to invent a location name/address schema.

Coordinates, radius, and map belong only in the drawer.

### Kelayakan

Use compact label + score text rather than the current progress bar. Example:

```text
Direkomendasikan
82.45 / 100
```

When score is null, render a truthful unavailable/insufficient-data state. Numeric zero renders `0.00 / 100`.

### Status

Render canonical Pending / Approved / Rejected as shared status badges. Text carries meaning; color is supplementary.

### Aksi

Pending rows expose a primary `Review` action plus a secondary overflow control. Approved and Rejected rows expose `Detail` plus overflow.

The overflow owns destructive delete and any existing secondary action that remains truthful. Delete must not be a visually dominant always-on primary action.

Opening Review or Detail never mutates booking status.

## Detail / review drawer

Replace the booking-specific map-centered modal path with one right-side Booking drawer. Reuse the current Attendance/User drawer shell, overlay, focus trap, Escape behavior, responsive width, section-card spacing, and map lifecycle patterns.

INF-274 does not introduce `GET /api/bookings/:id`, so the drawer is populated from the already normalized canonical list row. INF-275 must not invent a detail endpoint or issue a fake detail request.

The drawer is still a separate presentation state: opening, closing, map ownership, decision busy state, and focus restoration must not be encoded as table-row mutation.
Drawer sections are:

### Pemohon

- full name;
- NIP/NIM;
- email;
- position;
- role.

### Pengajuan WFA

- real `booking_id`;
- Jadwal WFA from `schedule_date`;
- Diajukan from `created_at`;
- request reason label;
- Other explanation when present;
- notes;
- current status.

Do not fabricate a formatted public ID such as `#ATD-...`. Use the actual booking ID unless Backend later provides a distinct display identifier.

### Lokasi

- full location description;
- latitude;
- longitude;
- booking-time radius from `radiusSnapshot`;
- small map only when both normalized coordinates are finite.
  Missing coordinates render an explicit unavailable state and no map. Missing radius does not fall back to a hardcoded `100`.

### Kelayakan

Show suitability label and score using the same nullable semantics as the table. The drawer may use more vertical space but must not invent additional scoring criteria that are absent from the booking response.

### Keputusan

For processed rows show:

```text
processed_at
processedBy.fullName
processedBy.role
```

If `processedBy` is null, render a truthful unavailable/automated-actor state. Do not substitute `approved_by` as a display name.

Rejected rows additionally show:

```text
rejectionReason.label
rejectionNote
```

Pending rows omit processed decision metadata and instead expose review actions in the footer.

## Decision interaction

The drawer is the canonical review context for Pending bookings.

Approval remains the existing explicit command:

```json
{ "status": "approved" }
```

Rejection reuses the INF-271 required-reason transaction. INF-275 must not create a second rejection business flow.

Recommended interaction:

```text
Review drawer
→ Reject
→ existing rejection modal opens with selected booking
→ reason + optional/required Other note validation
→ one Backend mutation
→ rejection success event
→ close rejection transaction
→ close or refresh the review drawer state
→ refresh list once using active query
```

Approve and reject controls are disabled while their respective command is in flight. Repeated clicks must not create duplicate mutations. A failed decision preserves the review context and does not locally claim success.

## Delete interaction

Delete remains a permanent destructive secondary action.

Confirmation must identify enough booking context to prevent accidental deletion, preferably applicant name and scheduled WFA date, and must state that the action cannot be restored.

Rules:

- disable repeated delete submission;
- do not request a delete reason because Backend does not store one;
- never locally remove a row as final authoritative state before Backend confirmation;
- after success, refetch using the unchanged active search/filter/page state;
- if deletion removes the only row on the current trailing page, move to the previous valid page before refetch;
- a Backend 404 means the booking is already unavailable: notify truthfully and refresh;
- other errors preserve the current server-authored rows and allow retry.

## State model

The redesigned feature separates persistent request/data state from transient presentation state:

```text
appliedQuery
  page
  limit
  search
  appliedFilters { status, dateFrom, dateTo }

draftFilters { status, dateFrom, dateTo }
rows / bookings
pagination
tableState { loading, error, hasSuccessfulPage }
filterState { open, validationMessage }
drawerState { open, selectedBooking, trigger, mapOwned }
decisionState { approvingId, rejecting/open transaction }
deleteState { record, submitting, error }
```

No legacy sort state belongs in `appliedQuery`.

## Loading, error, and empty states

Management Booking should adopt the stronger Attendance list behavior rather than hiding the last successful page whenever refresh fails.

- Initial load shows a centered loading state.
- After a successful page exists, a refresh keeps those rows visible and shows a lightweight updating indicator.
- A refresh error keeps the last successful rows visible, exposes an inline retry banner, and preserves the active query.
- Retry repeats the same request state without changing filters or pagination.
- Empty unfiltered data uses a no-bookings state.
- Empty filtered/search results use a no-match state.
- Out-of-range page recovery is handled rather than mislabeled as no matching data.

Service errors should preserve Backend `message`, HTTP status, and stable `code` when available. UI logic must not branch on parsed message text.

Decision and delete errors stay scoped to their transaction. They do not clear the authoritative table or close the drawer as if the mutation succeeded.

## Map lifecycle

Booking drawer map behavior follows the current container-scoped Attendance map pattern:

- initialize only after the visible drawer container exists;
- require both finite latitude and longitude;
- numeric zero is valid;
- one drawer owns one map instance;
- closing/replacing the selected booking destroys the previous map instance;
- legacy `booking-map-modal.html` is removed from the Management Booking composition once the drawer path is canonical.

## Accessibility and responsive behavior

- Search has a visible or screen-reader label.
- Filter trigger exposes expanded state and its controlled panel.
- Filter closes on Escape/outside click/explicit close and restores focus.
- Review/Detail controls have accessible names.
- Drawer uses `role="dialog"`, `aria-modal="true"`, title/description linkage, Escape close, focus containment, and focus restoration.
- Drawer backdrop is hidden from assistive technology.
- Status and suitability states are communicated in text, not by color alone.
- The table retains shared horizontal overflow on narrow layouts.
- The filter adapts to a fixed/full-width panel on narrow screens.
- The right drawer becomes full-width naturally on small viewports while preserving the same state and action semantics.
- Icon-only overflow/destructive controls have explicit accessible labels.

Row-wide click is optional. If implemented, it must have Enter/Space keyboard equivalence and every nested action must stop propagation. A dedicated Review/Detail button remains sufficient and is lower-risk for this scope.

## Expected repository areas

Likely modify:

```text
src/management-booking.html
src/partials/table/table-booking.html
src/js/features/wfaBooking/bookingList.js
src/js/features/wfaBooking/bookingList.contract.js
src/js/features/wfaBooking/bookingRejection.js
src/js/services/bookingService.js
src/js/index.js
```

Likely create:

```text
src/partials/table/booking-table-filter.html
src/partials/modal/booking-detail-drawer.html
src/js/features/wfaBooking/bookingManagementDirectoryQuery.js
src/js/features/wfaBooking/bookingDetailDrawerLifecycle.js
focused tests under tests/
```

The exact split may reuse existing shared map/focus helpers instead of creating Booking-specific duplicates. The plan must verify actual reuse seams before adding new primitives.

## Testing strategy

Implementation follows TDD. Focused coverage must lock:

- canonical request state and omission of deprecated sort parameters;
- date filter validation and draft/applied behavior;
- service serialization for `search`, `status`, `date_from`, `date_to`, `page`, and `limit`;
- nested request/rejection normalization and `processed_by` mapping;
- numeric zero versus null suitability behavior;
- the eight locked table columns and absence of map/sort affordances;
- compact two-line location presentation;
- filter accessibility and responsive contracts;
- drawer data sections, focus lifecycle, map lifecycle, and unavailable states;
- approve from review context without duplicate submission;
- reuse of the INF-271 rejection transaction and one list refresh after success;
- delete busy state, 404 handling, active-query preservation, and trailing-page recovery;
- page composition removes the old booking map modal path;
- existing WFA settings/rejection behavior remains green.

Final verification requires focused Node tests, `npm run build`, Prettier check for touched files, `git diff --check`, scope review, and authenticated desktop+narrow runtime evidence when INF-274 is available in the target Backend.

## Acceptance criteria

- Management Booking uses the shared Management Attendance/Pengguna admin table, filter, badge, pagination, drawer, dark-mode, and responsive language.
- Table columns are exactly `Pemohon | Jadwal WFA | Diajukan | Alasan | Lokasi | Kelayakan | Status | Aksi` unless a later explicit product decision changes them.
- `schedule_date` and `created_at` remain separate columns.
- Search is server-side and advertises only applicant name/NIP/NIM.
- Status and WFA schedule date range are server-driven filters applied before pagination.
- Deprecated `sortBy` / `sortOrder` are absent from new FE request state and no sortable-header affordance is shown.
- The location table cell is compact text only; coordinates, radius, and map exist only in the drawer.
- Nested `request_reason.other_text`, `rejection_reason.note`, and `processed_by` map correctly.
- Nullable suitability renders unavailable rather than fabricated zero; numeric zero remains valid.
- Pending rows open Review without mutation; approve/reject occur from review context.
- Rejection reuses INF-271's required-reason transaction.
- Delete is secondary, guarded against duplicate submission, and reconciles through server refetch.
- Active request state survives drawer, decision, delete, paging, and retry interactions.
- Loading/error/empty states remain truthful and retain the last successful page on refresh failure.
- Focused tests and production build pass; desktop and narrow runtime evidence is attached when Backend dependency is available.

## Out of scope

- Backend changes or a new `GET /api/bookings/:id` endpoint;
- WFA eligibility, recommendation, or scoring algorithm changes;
- KPI cards, charts, analytics, reports, or exports;
- SPA/framework/global-store migration;
- a generic admin-table framework rewrite;
- Management Attendance or Management Pengguna redesign;
- fabricated avatar/photo, department, formatted booking display ID, location name/address split, or decision actor;
- dependency-audit remediation unrelated to INF-275.

## Docs / ADR note

No new ADR is required. The design preserves the accepted Web FE source-of-truth, service/API integration, RBAC, and multi-page Alpine boundaries. The spec and Linear INF-275 are the feature-level design record.

`DOCS/ADR UPDATE REQUIRED` is therefore **not triggered** unless implementation discovers that a shared admin component or service boundary must change architecture-wide.

## Completion boundary

Code completion and runtime completion are distinct.

The Web FE implementation may be code-complete when focused tests, production build, formatting, scope review, and PR review are green against the INF-274 contract fixtures.

INF-275 must remain open if the target Backend does not yet expose the verified INF-274 contract. Final runtime evidence requires authenticated verification of:

```text
server-side search
status/date filters
pagination/page size
Review/Detail drawer
location map/unavailable state
nullable suitability
approve
required-reason reject
processed actor display
delete and trailing-page recovery
keyboard/focus behavior
desktop and narrow layout
```

A merged PR alone is not sufficient evidence for Linear Done.
