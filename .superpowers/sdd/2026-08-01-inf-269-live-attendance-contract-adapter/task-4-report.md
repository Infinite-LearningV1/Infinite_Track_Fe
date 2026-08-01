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
