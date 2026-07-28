# INF-268 / INF-269 Management Attendance Web FE Design

**Date:** 2026-07-28
**Repository:** `Infinite-LearningV1/Infinite_Track_Fe`
**Scope:** Web FE only
**Issues:** INF-268, INF-269
**External dependency:** INF-267 Backend contract

## Objective

Deliver a truthful, server-driven Management Attendance audit explorer without duplicating Dashboard analytics or inventing Backend data. Work is split into two isolated, reviewable stages:

1. INF-268 removes misleading controls and fabricated fields against the current Backend contract.
2. INF-269 adds the approved audit table, combined filters, detail drawer, and delete recovery against the locked INF-267 contract.

The Web FE must remain a consumer of Backend truth. It must never locally filter or sort one paginated page as if that represented the full dataset.

## Delivery topology

The approved stacked branch model is:

```text
feat/inf-249-management-pengguna-table-redesign
└── feature/inf-268-attendance-truthfulness
    └── feature/inf-269-attendance-audit-explorer
```

Each branch has its own isolated worktree and PR. INF-268 targets the INF-249 stacked base. INF-269 targets INF-268. Promotion to `develop` occurs only after the prerequisite chain is ready.

The base includes the approved Management Pengguna table/filter/drawer language and INF-263 server-driven query patterns. These are reference implementations and reuse targets, not Attendance business contracts.

## External contract boundary

INF-267 remains owned by Backend and is not implemented or modified here. The Web FE adapter targets these public parameters:

```text
page
limit
search
from
to
mode
status
checkout_state
sortBy
sortOrder
```

The expected list response remains the Attendance pagination envelope:

```json
{
  "data": [],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_records": 0,
    "records_per_page": 10,
    "has_next_page": false,
    "has_prev_page": false
  }
}
```

Detail is loaded only from `GET /api/attendance/:id`. Permanent deletion remains `DELETE /api/attendance/:id`.

Until INF-267 is available, contract fixtures and focused tests may validate request serialization and response normalization. Runtime filter, sort, and detail evidence must remain `Needs Verification`; no client fallback may simulate missing Backend behavior.

## Stage 1: INF-268 truthfulness cleanup

INF-268 preserves the current server-driven list while removing UI claims the current Backend cannot honor.

### Behavior

- Read `records_per_page` as the canonical page-size response key, with a narrowly documented `per_page` compatibility fallback.
- Preserve explicit zero and false values with nullish checks.
- Advertise search for name and NIP/NIM only.
- Remove interactive sort affordances and sort-state mutation while the Backend ignores sorting.
- Show `attendance_date` in each row.
- Rename `Information` to `Mode` and retain canonical WFO/WFH/WFA badge mapping.
- Remove fabricated radius, description, email, phone, and browser-alert coordinate fallbacks.
- Render absent values as unavailable or omit them.
- Preserve server-driven search, pagination, page-size, loading, empty, error, and hard-delete behavior.

### Non-goals

INF-268 does not add the combined filter, public sorting, detail endpoint, new drawer, analytics, exports, or client-side replacements for INF-267.

## Stage 2: INF-269 audit explorer

### Information architecture

```text
Management Attendance
→ visible search + one combined Filter trigger
→ total result context
→ server-paginated audit table
→ row opens right-side detail drawer
→ overflow action menu owns permanent delete
```

There are no KPI cards, charts, live-map hero, FAHP, report summaries, or export controls.

### Canonical query state

The feature owns one applied request state:

```text
page
limit
search
from
to
mode
status
checkoutState
sortBy
sortOrder
```

URL parsing and serialization use Backend public names. Search, applied filters, sorting, and page-size changes reset page to 1. Paging, opening detail, and deletion preserve all applied criteria.

List rows and pagination metadata come directly from the Backend response. The browser performs no row filtering, sorting, slicing, total calculation, or detail widening.

### Combined filter component

The toolbar keeps search visible and uses one accessible `Filter` trigger. The anchored filter shell follows Management Pengguna interaction and visual patterns while Attendance field configuration remains feature-owned.

The filter contains:

- date range;
- mode: WFO, WFH, WFA;
- canonical status;
- checkout state: completed, open;
- Apply;
- Clear/reset.

Mode and checkout-state values are locked by INF-267. Status choices must come from the canonical Backend status contract already used by the Attendance badge mapper or from an explicit Backend reference response; the Web FE must not invent new status keys. If the final INF-267 contract changes those keys, only the Attendance field configuration and contract fixtures change, not the generic filter shell.

The date range uses strict date-only values. The UI rejects an incomplete or reversed range before Apply while retaining the draft for correction; Backend validation remains authoritative after submission.

`draftFilters` remains separate from `appliedQuery`. Opening, editing, or dismissing the popover does not fetch. Apply commits the draft, resets page, synchronizes URL state, fetches once, and closes the popover. Clear/reset removes filter criteria while preserving unrelated URL parameters.

The popover closes on successful Apply, Escape, outside click, or explicit close, and restores focus to its trigger. An active-filter count communicates applied criteria. Narrow layouts may use a full-width or sheet-like presentation without changing state semantics.

### Table

The table reuses the approved Management Pengguna container, borders, radius, shadow, header hierarchy, row spacing, hover/focus/open-row treatment, badges, overflow menu, pagination, page-size control, loading/error/empty states, dark mode, and horizontal overflow behavior.

Attendance columns are fixed to:

```text
Pegawai | Tanggal | Kehadiran | Mode | Status | Lokasi | Aksi
```

- **Pegawai:** avatar or initials, full name, NIP/NIM, role.
- **Tanggal:** attendance date and optional weekday.
- **Kehadiran:** time in to time out, work duration, explicit Alpha or open-checkout state.
- **Mode:** canonical WFO/WFH/WFA badge.
- **Status:** canonical status badge.
- **Lokasi:** compact availability or label; never raw coordinates.
- **Aksi:** shared overflow pattern with permanent delete only.

Only INF-267 allowlisted fields are sortable. Sort controls write request state; arrows reflect applied Backend order. Unsupported columns have no sort affordance.

### Row interaction and detail drawer

A non-action row click or keyboard activation performs:

1. set selected attendance ID and open the drawer in loading state;
2. request `GET /api/attendance/:id`;
3. render only the successful full detail response.

List rows are never treated as detail. A request token prevents an older detail response or error from replacing the current selection. The action menu and any location action stop row event propagation.

The read-only drawer reuses the Management Pengguna shell, overlay, spacing, section cards, close behavior, focus trap, focus restoration, and responsive behavior.

Sections are:

- **Employee:** name, NIP/NIM, email, role.
- **Attendance record:** attendance ID, date, time in, time out, work duration, mode, status, notes, optional booking ID.
- **Location evidence:** description, latitude, longitude, radius, and a small map only when coordinates are finite and valid.

Missing attendance location renders an explicit unavailable state. Profile WFH location, default coordinates, default radius, and generic descriptions are prohibited.

Map construction is deferred until the drawer and map container are visible. Closing or replacing detail cancels deferred work and destroys the previous map instance.

### Delete flow

Permanent delete lives in the overflow menu and may also appear in the drawer footer.

Confirmation names the employee, attendance date, and attendance times, and states that deletion cannot be restored. It does not request a reason because Backend does not store one.

While deleting, repeated submission is disabled. Success refetches the active query. If the final row on a trailing page is deleted, the feature requests the previous valid page. A delete `404` means the record is already unavailable: notify truthfully and refresh active state.

The feature never locally removes a row as authoritative state before the Backend refetch succeeds.

## State model

The Attendance feature maintains these independent boundaries:

- `appliedQuery`: canonical server request and URL state;
- `draftFilters`: uncommitted filter UI state;
- `rows` and `pagination`: latest successful server page;
- `tableState`: loading, error, retry, last successful page;
- `detailState`: selected ID, request token, loading, error, full detail;
- `deleteState`: selected record, confirmation, submitting, error.

List and detail request tokens independently prevent stale success and stale failure from overwriting newer state.

## Error and empty-state truthfulness

- A list failure retains applied criteria and the last successful rows while exposing retry state.
- A detail failure remains contained in the drawer.
- A missing detail record renders record unavailable and may trigger a list refresh.
- Validation errors expose the Backend message without changing criteria or inventing fallback behavior.
- Active criteria with `total_records = 0` render no-match copy.
- `data = []` with `total_records > 0` and an out-of-range page renders an empty-page/recovery state, not no-match copy.
- An empty unfiltered directory uses a distinct no-records state.
- Missing location is unavailable, never configured by inference.

## Accessibility

- Rows support click, Enter, and Space activation with a visible focus state.
- Row action controls have accessible names and stop row activation.
- Filter trigger exposes expanded state, controlled panel, active count, Escape/outside close, and focus return.
- Drawer exposes dialog semantics, an accessible title, close button, Escape, focus trap, and focus restoration.
- Active pagination controls are disabled against redundant requests.
- Delete confirmation prevents repeated submission and retains focus containment.
- Status, mode, loading, errors, and location availability use text in addition to color.

## Testing and evidence

Implementation follows TDD. Focused coverage includes:

- current pagination mapper and truthfulness cleanup;
- canonical query parse/serialize/request mapping;
- draft versus applied filter behavior;
- search debounce and cross-interaction cancellation;
- server-authored rows and pagination;
- allowlisted sort state;
- list and detail stale-response races;
- realistic slim-list versus full-detail fixtures;
- table/detail/delete error boundaries;
- delete `404` and trailing-page recovery;
- filter, table, drawer, keyboard, focus, and responsive template contracts;
- map lifecycle and zero-coordinate handling.

Verification gates are:

1. focused Attendance and shared drawer/filter tests;
2. production build;
3. `git diff --check` and worktree cleanliness;
4. full-suite comparison against the accepted baseline;
5. desktop and narrow runtime screenshots when the compatible Backend is available.

The accepted stacked baseline currently has 511 tests: 491 pass and 20 unrelated dashboard/FAHP/live-map tests fail. These failures remain a separately reported baseline and are not represented as green.

## Scope exclusions

- Backend INF-267 implementation;
- client-side substitutes for missing Backend filters, sorting, or detail;
- attendance check-in/checkout business logic;
- KPI cards, analytics, maps outside record detail, reporting, or export;
- soft delete, void, restore, delete reasons, or audit-trail redesign;
- Management Pengguna redesign or a parallel admin-table token system.

## Completion boundary

INF-268 is complete when its focused tests and build pass and the current page is truthful against the current Backend.

INF-269 code can be complete against the locked contract when focused tests, build, review, and static accessibility/responsive contracts pass. It is not runtime-verified until INF-267 is available and desktop/narrow authenticated evidence confirms search, combined filters, sorting, pagination, detail, map, delete, and history behavior.
