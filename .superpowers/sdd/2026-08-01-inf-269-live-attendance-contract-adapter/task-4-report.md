# Task 4 Report: URL-backed server sort state

## RED

- Added state-level expectations for `toggleAttendanceSort(sortBy)` and
  `attendanceSortDirection(sortBy)` before source changes.
- Ran `node --test tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js`.
- The new sort tests failed as expected with `TypeError: state.toggleAttendanceSort is not a function`; page composition also reported the missing function. This confirmed the action was absent rather than a fixture or assertion defect.
- The same RED run exposed four inherited expectations in the permitted state test that still expected uppercase `mode`; they were aligned with Task 3's canonical lowercase mode normalization and canonical sort query state.

## GREEN

- Added the minimal Alpine actions backed by Task 3's `ATTENDANCE_SORT_KEYS`,
  canonical URL serializer, and request mapper.
- Focused gate after formatting:

  ```powershell
  node --test tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js
  ```

  Result: 47 passing, 0 failing.
- `npx prettier --write` completed for the four Task 4 source/test files.
- `git diff --check` completed with no whitespace errors.

## Request and history proof

- Each valid sort click cancels a pending search, resets `page` to 1, writes
  exactly one `pushState`, and performs exactly one list fetch.
- The ASC request is asserted as `{ page: 1, limit: 10, search: "ayu", sortBy: "full_name", sortOrder: "ASC" }` while preserving unrelated `debug=1` URL state.
- The cycle is ASC, DESC, then empty sort fields for the Backend default.
- `mode` is rejected as a sort key with no history write and no fetch.
- Sorted response tests assert the returned row order remains `[3, 1, 2]`; no client-side reorder or `Array.sort` was added.

## Files

- `src/js/features/attendance/attendanceLog.js`
- `tests/attendance-audit-state.test.js`
- `tests/attendance-list-state.test.js`
- `tests/attendance-page-composition.test.js`

## Self-review

- Uses only Task 3's canonical sort keys and query boundary; no duplicate sort normalization was introduced.
- Does not change table/header markup, which remains Task 5 ownership.
- The loading guard and invalid-key guard produce no side effects.
- `attendanceSortDirection` reports `ascending`, `descending`, or `none` for template accessibility.

## Commit

- `feat(attendance): add server sort state` (this report is committed with the Task 4 changes; the exact hash is recorded in the orchestrator handoff).

## Concerns

- The focused Node test command emits the pre-existing package warning that the project lacks `"type": "module"`; tests still exit successfully.
- Task 5 must bind the new actions to sortable header markup and verify the runtime accessibility affordances.

## Test-strength follow-up: round 1

- Extended the sort cycle proof with exact requests and pushed URLs for ASC,
  DESC, Backend-default empty sort, and a fourth click to a new key that starts
  at ASC. The default transition explicitly omits both sort query fields.
- Added a full state/history/request snapshot for invalid-key and loading
  guards while a debounce timer is pending. Both guards leave the timer,
  query/page, history, URL, and request list unchanged.
- Added active-sort persistence proof across filter Apply, page-size changes,
  popstate restoration, and rejected fetch followed by retry. Each scenario
  asserts canonical sort state, accessibility direction, and exact request or
  URL sort fields; retry retains the active sort after rejection.
- Exact verification commands and results:

  ```powershell
  npx prettier --write tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js
  node --test tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js
  git diff --check
  ```

  Result: Prettier completed; the focused Node gate reported 48 passing and 0
  failing; `git diff --check` completed without whitespace errors.

## Test-strength follow-up: round 3

- Extended both guard snapshots with distinctive `draftFilters`, open-filter
  state, validation text, open drawer state, and a lifecycle-owned canonical
  `selectedAttendanceDetail`.
- The selected detail is seeded by opening the drawer and replacing through its
  lifecycle; its snapshot includes canonical identity, employee, attendance,
  mode/status, notes, booking, and location fields. Direct setter seeding was
  not used.
- Exact verification commands and results:

  ```powershell
  npx prettier --write tests/attendance-audit-state.test.js
  node --test tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js
  git diff --check
  ```

  Result: Prettier completed; the focused Node gate reported 48 passing and 0
  failing; `git diff --check` completed without whitespace errors.

## Test-strength follow-up: round 2

- Strengthened invalid-key and loading guard snapshots with distinctive,
  non-default applied search, rows, pagination, `tableState` values (including
  `error` and `hasSuccessfulPage`), and both list/detail request IDs.
- The loading guard snapshot deliberately starts with `tableState.loading`
  already true. Both paths prove it remains unchanged while the pending timer,
  list data, pagination, error/success state, request IDs, URL/history, and
  request list remain exact.
- Exact verification commands:

  ```powershell
  npx prettier --write tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js
  node --test tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js
  git diff --check
  ```

  Result: Prettier completed; the focused Node gate reported 48 passing and 0
  failing; `git diff --check` completed without whitespace errors.

## Test-strength follow-up: round 4

- Replaced the invalid-key/loading guard fixture's direct filter-state
  assignments with the canonical filter lifecycle: `openFilter()`, draft date
  edits that create an invalid range, and awaited `applyFilters()` validation.
- Asserted that the real validation path returns `false`, retains the invalid
  draft, leaves the filter open, and produces the canonical date-range message
  before either sort guard snapshot is taken.
- Preserved the canonical drawer lifecycle seeding and the existing exhaustive
  snapshots. Both invalid-key and loading guards still prove no mutation or
  cancellation across query/list/filter/drawer state, request IDs, the pending
  search timer, history, URL, and network requests.
- Exact verification commands:

  ```powershell
  npx prettier --write tests/attendance-audit-state.test.js .superpowers/sdd/2026-08-01-inf-269-live-attendance-contract-adapter/task-4-report.md
  node --test tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js
  git diff --check
  ```

  Result: Prettier completed; the focused Node gate reported 48 passing and 0
  failing; `git diff --check` completed without whitespace errors. The focused
  gate still emits the pre-existing package warning about the missing
  `"type": "module"` declaration.
