# INF-268 Attendance Truthfulness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Management Attendance page truthful to the current Backend list contract without adding INF-269 filters, sorting, or detail behavior.

**Architecture:** Keep the current page-level Alpine component and server-paginated list, but isolate response normalization into pure functions, inject service/timer dependencies for deterministic tests, and remove every UI behavior that claims unsupported sorting or fabricated location detail. This branch is a compatibility cleanup that INF-269 will build on.

**Tech Stack:** Multi-page HTML, Alpine.js, JavaScript ES modules, Axios through `authRequest`, Tailwind CSS, Node `node:test`, Webpack/PostCSS.

## Global Constraints

- Work only in `E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\inf-268-attendance-truthfulness` on `feature/inf-268-attendance-truthfulness`.
- Preserve the stacked base `feat/inf-249-management-pengguna-table-redesign`; do not edit `develop` or `master`.
- Scope is Web FE only. Do not implement Backend INF-267 or simulate missing Backend filters, sorting, or detail.
- Follow TDD for each behavior change: write the focused failing test, run it and observe the expected failure, implement the smallest fix, rerun to green, then commit.
- Do not turn the accepted full-suite baseline into a false green claim: baseline is 511 tests, 491 pass, 20 unrelated dashboard/FAHP/live-map failures.
- Required final gates: all focused Attendance tests pass, `npm run build` passes, `git diff --check` passes, and the full suite is compared with the accepted baseline.

---

### Task 1: Lock the current list envelope and page-size compatibility

**Files:**

- Create: `tests/attendance-list-normalization.test.js`
- Modify: `src/js/features/attendance/attendanceLog.js`

- [ ] **Step 1: Write failing tests for canonical and compatibility pagination keys**

Create a slim fixture and assert that explicit zero/false values survive normalization:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAttendanceListResponse } from "../src/js/features/attendance/attendanceLog.js";

const attendancePage = (data = [], pagination = {}) => ({
  data,
  pagination: {
    current_page: 1,
    total_pages: 1,
    total_records: data.length,
    records_per_page: 10,
    has_prev_page: false,
    has_next_page: false,
    ...pagination,
  },
});

test("normalizes records_per_page and preserves explicit zero/false metadata", () => {
  assert.deepEqual(
    normalizeAttendanceListResponse({
      data: [],
      pagination: {
        current_page: 2,
        total_pages: 0,
        total_records: 0,
        records_per_page: 25,
        has_prev_page: true,
        has_next_page: false,
      },
    }),
    {
      data: [],
      pagination: {
        current_page: 2,
        total_pages: 0,
        total_records: 0,
        records_per_page: 25,
        has_prev_page: true,
        has_next_page: false,
      },
    },
  );
});

test("uses per_page only as a compatibility fallback", () => {
  const result = normalizeAttendanceListResponse({
    data: [{ id_attendance: 7 }],
    pagination: { per_page: 50 },
  });
  assert.equal(result.pagination.records_per_page, 50);
});
```

- [ ] **Step 2: Run the new test and confirm RED**

Run: `node --test tests/attendance-list-normalization.test.js`

Expected: FAIL because `normalizeAttendanceListResponse` is not exported.

- [ ] **Step 3: Add the pure normalizer and canonical state key**

In `attendanceLog.js`, export a normalizer using nullish semantics:

```js
export function normalizeAttendanceListResponse(response = {}) {
  const pagination = response.pagination ?? {};
  return {
    data: Array.isArray(response.data) ? response.data : [],
    pagination: {
      current_page: pagination.current_page ?? 1,
      total_pages: pagination.total_pages ?? 1,
      total_records: pagination.total_records ?? 0,
      records_per_page:
        pagination.records_per_page ?? pagination.per_page ?? 10,
      has_prev_page: pagination.has_prev_page ?? false,
      has_next_page: pagination.has_next_page ?? false,
    },
  };
}
```

Change component pagination state and template-facing calculations from `per_page` to `records_per_page`. In `fetchAttendance()`, normalize once and update `filters.limit` from `records_per_page`.

- [ ] **Step 4: Run focused normalization tests and confirm GREEN**

Run: `node --test tests/attendance-list-normalization.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/attendance-list-normalization.test.js src/js/features/attendance/attendanceLog.js
git commit -m "fix(attendance): normalize pagination truthfully"
```

### Task 2: Make list behavior injectable and retain server-authored state

**Files:**

- Create: `tests/attendance-list-state.test.js`
- Modify: `src/js/features/attendance/attendanceLog.js`

- [ ] **Step 1: Write failing tests for request parameters and server-owned rows**

Use an injected service to prove the component sends only the current list contract and never filters or sorts locally:

```js
test("fetchAttendance sends current server query and keeps server row order", async () => {
  const calls = [];
  const component = attendanceLogAlpineData({
    getAttendanceLog: async (params) => {
      calls.push(params);
      return attendancePage([
        { id_attendance: 2, full_name: "Zulu" },
        { id_attendance: 1, full_name: "Alpha" },
      ]);
    },
  });
  component.filters.search = "12345";
  component.filters.page = 3;
  component.filters.limit = 25;

  await component.fetchAttendance();

  assert.deepEqual(calls, [{ search: "12345", page: 3, limit: 25 }]);
  assert.deepEqual(
    component.attendanceData.map((row) => row.id_attendance),
    [2, 1],
  );
});
```

Add tests that `changePage`, `changeLimit`, and debounced search reset or preserve page correctly and trigger exactly one request.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-list-state.test.js`

Expected: FAIL because the factory does not accept service/timer overrides and still owns sort fields.

- [ ] **Step 3: Inject services/timers and remove sort request state**

Change the factory signature to:

```js
export function attendanceLogAlpineData(overrides = {}) {
  const services = {
    getAttendanceLog: overrides.getAttendanceLog || getAttendanceLog,
    deleteAttendance: overrides.deleteAttendance || deleteAttendance,
  };
  const schedule = overrides.setTimeout || globalThis.setTimeout;
  const cancelSchedule = overrides.clearTimeout || globalThis.clearTimeout;
```

Keep `filters` exactly `{ search, page, limit }`. Route list/delete calls through `services`, and debounce through `schedule`/`cancelSchedule`. Do not map, sort, slice, or calculate totals from `attendanceData`.

- [ ] **Step 4: Run state and normalization tests**

Run: `node --test tests/attendance-list-state.test.js tests/attendance-list-normalization.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/attendance-list-state.test.js src/js/features/attendance/attendanceLog.js
git commit -m "refactor(attendance): isolate server list state"
```

### Task 3: Remove unsupported sort affordances and correct search copy

**Files:**

- Create: `tests/attendance-truthfulness-template.test.js`
- Modify: `src/management-attendance.html`
- Modify: `src/partials/table/table-attendance.html`
- Modify: `src/js/features/attendance/attendanceLog.js`

- [ ] **Step 1: Write a failing structural contract test**

Read both HTML files and assert:

```js
test("current attendance UI does not advertise unsupported sorting", () => {
  assert.doesNotMatch(table, /changeSort\(/);
  assert.doesNotMatch(table, /getSortIcon\(/);
  assert.doesNotMatch(table, /isSortFieldSupported\(/);
});

test("search copy names only current backend search fields", () => {
  assert.match(page, /Cari nama atau NIP\/NIM/);
  assert.doesNotMatch(page, /ID, atau status/);
});
```

Also inspect the JavaScript source and assert it no longer exposes `changeSort`, `getSortIcon`, or `supportedSortFields`.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-truthfulness-template.test.js`

Expected: FAIL on existing sortable header buttons and misleading placeholder.

- [ ] **Step 3: Replace sortable buttons with static headings**

In `table-attendance.html`, render plain `<th>` labels. In `management-attendance.html`, use `placeholder="Cari nama atau NIP/NIM..."`. Remove all sort state and methods from `attendanceLog.js`.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test tests/attendance-truthfulness-template.test.js tests/attendance-list-state.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/attendance-truthfulness-template.test.js src/management-attendance.html src/partials/table/table-attendance.html src/js/features/attendance/attendanceLog.js
git commit -m "fix(attendance): remove unsupported list claims"
```

### Task 4: Render truthful Attendance columns and missing values

**Files:**

- Modify: `tests/attendance-truthfulness-template.test.js`
- Modify: `src/partials/table/table-attendance.html`
- Modify: `src/js/features/attendance/attendanceLog.js`

- [ ] **Step 1: Add failing assertions for date, mode, and location truth**

```js
test("table shows attendance date and labels information as Mode", () => {
  assert.match(table, />\s*Attendance Date\s*</);
  assert.match(table, /x-text="log\.attendance_date \|\| '-'"/);
  assert.match(table, />\s*Mode\s*</);
  assert.doesNotMatch(table, />\s*Information\s*</);
});

test("location availability requires finite coordinates without a coordinate alert", () => {
  assert.match(table, /hasAttendanceCoordinates\(log\)/);
  assert.doesNotMatch(table, /!log\.location\?\.latitude/);
});
```

Assert empty/missing values render `-` or explicit `Lokasi tidak tersedia`, and zero coordinates are not treated as false.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-truthfulness-template.test.js`

Expected: FAIL because date is absent, `Information` is used, and truthiness checks reject zero.

- [ ] **Step 3: Update the table and add a finite-coordinate helper**

Import `firstFiniteMapNumber` and `hasFiniteCoordinates` from `src/js/utils/mapLocationTruth.js`. Use `attendance_date` as its own column, label the `information` badge as Mode, and gate the location button through:

```js
hasAttendanceCoordinates(log) {
  return hasFiniteCoordinates({
    latitude: firstFiniteMapNumber(log.location?.latitude, log.latitude),
    longitude: firstFiniteMapNumber(log.location?.longitude, log.longitude),
  });
}
```

Keep current row fields unchanged otherwise; INF-269 owns the later seven-column redesign.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/attendance-truthfulness-template.test.js tests/attendance-list-state.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/attendance-truthfulness-template.test.js src/partials/table/table-attendance.html src/js/features/attendance/attendanceLog.js
git commit -m "fix(attendance): render date mode and location truthfully"
```

### Task 5: Remove fabricated location payload and browser-alert fallback

**Files:**

- Create: `tests/attendance-location-truth.test.js`
- Modify: `src/js/features/attendance/attendanceLog.js`

- [ ] **Step 1: Write failing normalization tests**

```js
test("buildAttendanceLocation never invents optional detail", () => {
  assert.deepEqual(
    buildAttendanceLocation({
      full_name: "Ayu",
      location: { latitude: "0", longitude: "119.8" },
    }),
    {
      fullName: "Ayu",
      latitude: 0,
      longitude: 119.8,
      radius: null,
      description: "",
    },
  );
});
```

Read the source and assert it contains neither `radius || 100`, `Lokasi absensi karyawan`, phone/email fabrication, nor `alert(`.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-location-truth.test.js`

Expected: FAIL because `buildAttendanceLocation` is missing and legacy fallbacks exist.

- [ ] **Step 3: Export and use a truthful location mapper**

Build only list-provided data with `firstFiniteMapNumber`; omit unrelated profile fields. `viewLocation()` must no-op when coordinates are invalid, and call `window.openMapDetailModal` only when the canonical helper exists. Do not call a browser alert.

- [ ] **Step 4: Run the location and shared map tests**

Run: `node --test tests/attendance-location-truth.test.js tests/map-detail-modal-truthfulness.test.js tests/user-detail-drawer-lifecycle.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/attendance-location-truth.test.js src/js/features/attendance/attendanceLog.js
git commit -m "fix(attendance): remove fabricated location detail"
```

### Task 6: Harden current delete refresh and error boundary without expanding scope

**Files:**

- Modify: `tests/attendance-list-state.test.js`
- Modify: `src/js/features/attendance/attendanceLog.js`

- [ ] **Step 1: Add failing delete-state tests**

Cover: no request without a target, double submit suppression, success clears the target and refetches once, failure clears submitting state and keeps the server list unchanged.

```js
test("successful delete refreshes authoritative server state", async () => {
  const events = [];
  const component = attendanceLogAlpineData({
    deleteAttendance: async (id) => events.push(["delete", id]),
    getAttendanceLog: async () => {
      events.push(["fetch"]);
      return attendancePage([]);
    },
  });
  component.deleteTargetId = 9;
  await component.executeDelete();
  assert.deepEqual(events, [["delete", 9], ["fetch"]]);
  assert.equal(component.isDeleting, false);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-list-state.test.js`

Expected: FAIL because `isDeleting` does not exist and repeat submission is not guarded.

- [ ] **Step 3: Add the minimal submitting guard**

Add `isDeleting`, return early while true, set it before the DELETE call, and reset it in `finally`. Keep modal/inline-alert integration intact and refetch from Backend after success; do not splice the local array.

- [ ] **Step 4: Run all INF-268 focused tests**

Run:

```bash
node --test tests/attendance-list-normalization.test.js tests/attendance-list-state.test.js tests/attendance-truthfulness-template.test.js tests/attendance-location-truth.test.js tests/map-detail-modal-truthfulness.test.js tests/user-detail-drawer-lifecycle.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/attendance-list-state.test.js src/js/features/attendance/attendanceLog.js
git commit -m "fix(attendance): guard authoritative delete refresh"
```

### Task 7: Verify INF-268 and prepare the stacked handoff

**Files:**

- Modify only if formatting is required: files changed in Tasks 1-6

- [ ] **Step 1: Run Prettier on the touched paths**

```bash
npx prettier --write src/js/features/attendance/attendanceLog.js src/management-attendance.html src/partials/table/table-attendance.html tests/attendance-list-normalization.test.js tests/attendance-list-state.test.js tests/attendance-truthfulness-template.test.js tests/attendance-location-truth.test.js
```

- [ ] **Step 2: Rerun focused tests after formatting**

Run the exact focused command from Task 6. Expected: PASS.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit code 0 with all page entrypoints emitted.

- [ ] **Step 4: Compare the full suite to the accepted baseline**

Run: `node --test`

Expected: no new Attendance failures. Report the known 20 unrelated failures separately; do not call the whole suite green unless they have independently disappeared for a verified reason.

- [ ] **Step 5: Check patch hygiene and scope**

```bash
git diff --check
git status --short
git diff --stat feat/inf-249-management-pengguna-table-redesign...HEAD
```

Expected: no whitespace errors; only INF-268 code/tests/docs are present.

- [ ] **Step 6: Commit formatting-only changes if any**

```bash
git add src/js/features/attendance/attendanceLog.js src/management-attendance.html src/partials/table/table-attendance.html tests
git commit -m "test(attendance): verify truthfulness cleanup"
```

Skip this commit when formatting produced no changes. Keep the worktree for review and as the base of the INF-269 stacked branch.
