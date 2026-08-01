# INF-269 Live Attendance Contract Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Management Attendance Web FE with the live INF-267 nested list/detail contract, derive checkout presentation safely, and enable Backend-authored sorting.

**Architecture:** Keep the Backend response contract isolated in pure list/detail adapters that produce canonical camel-case FE state. Query state owns validated URL-backed filters and sorting; Alpine delegates every list operation to the Backend and never reorders rows locally. Existing Task 7 detail-request WIP is completed against the live detail envelope rather than discarded.

**Tech Stack:** Multi-page HTML, Alpine.js, Axios, Webpack, Tailwind CSS, Node test runner.

## Global Constraints

- Work only in `E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\inf-269-attendance-audit-explorer` on `feature/inf-269-attendance-audit-explorer`.
- Preserve the existing uncommitted Task 7 changes in `attendanceLog.js` and `attendance-audit-state.test.js`.
- Web FE only; do not edit `E:\test\Infinit_Track_BE` or rebuild the Backend image.
- Normalize only the confirmed live nested contract; do not silently accept the obsolete flat list/detail fixtures.
- `time_out === null` means `open`; a non-empty time string means `completed`; missing, empty, or malformed values mean unknown (`""`).
- List location truth uses only `location.available`, `location.id`, and `location.description`; coordinates are detail-only.
- Sorting is server-driven. The browser must not filter, sort, slice, or recalculate totals.
- Backend sort allowlist: `attendance_date`, `time_in`, `time_out`, `full_name`, `status`, `created_at`.
- `Mode`, `Lokasi`, and `Aksi` remain non-sortable.

---

### Task 1: Replace the slim list adapter with the live nested contract

**Files:**

- Modify: `src/js/features/attendance/attendanceListRow.js`
- Modify: `tests/attendance-list-row.test.js`
- Modify if assertions depend on the obsolete fixture: `tests/attendance-list-normalization.test.js`

**Interfaces:**

- Consumes: one row from `GET /api/attendance` `body.data[]`.
- Produces: `deriveAttendanceCheckoutState(timeOut): "open" | "completed" | ""` and `normalizeAttendanceListRow(row): CanonicalAttendanceListRow`.

- [ ] **Step 1: Replace the flat fixture with the supplied live row and write failing checkout tests**

```js
const liveListRow = (overrides = {}) => ({
  id_attendance: 12041,
  attendance_date: "2026-07-23",
  user: {
    id: 45,
    full_name: "Muhammad Rizki Ramdani",
    nip_nim: "9BYYD3",
    role: "Internship",
  },
  time_in: "23:55",
  time_out: "23:55",
  work_duration: "00:00",
  mode: { key: "wfo", label: "WFO" },
  status: { key: "alpha", label: "Alpha" },
  location: { available: false, id: null, description: null },
  ...overrides,
});

test("normalizes the exact live nested attendance list row", () => {
  assert.deepEqual(normalizeAttendanceListRow(liveListRow()), {
    idAttendance: 12041,
    employeeId: 45,
    fullName: "Muhammad Rizki Ramdani",
    nipNim: "9BYYD3",
    roleName: "Internship",
    attendanceDate: "2026-07-23",
    timeIn: "23:55",
    timeOut: "23:55",
    workHour: "00:00",
    mode: "wfo",
    modeLabel: "WFO",
    status: "alpha",
    statusLabel: "Alpha",
    checkoutState: "completed",
    location: { available: false, id: null, description: "" },
  });
});

test.each([
  [null, "open"],
  ["17:00", "completed"],
  [undefined, ""],
  ["", ""],
  [17, ""],
])("derives checkout presentation from time_out %p", (timeOut, expected) => {
  assert.equal(deriveAttendanceCheckoutState(timeOut), expected);
});
```

- [ ] **Step 2: Run the list adapter test and confirm RED**

Run: `node --test tests/attendance-list-row.test.js`

Expected: FAIL because the current adapter reads flat `id`, `full_name`, `work_hour`, `information`, and `checkout_state` fields.

- [ ] **Step 3: Implement the strict nested adapter**

```js
export function deriveAttendanceCheckoutState(timeOut) {
  if (timeOut === null) return "open";
  if (typeof timeOut === "string" && timeOut.trim()) return "completed";
  return "";
}

export function normalizeAttendanceListRow(row = {}) {
  const user = row.user ?? {};
  const mode = row.mode ?? {};
  const status = row.status ?? {};
  const location = row.location ?? {};
  return {
    idAttendance: row.id_attendance ?? null,
    employeeId: user.id ?? null,
    fullName: user.full_name ?? "",
    nipNim: user.nip_nim ?? "",
    roleName: user.role ?? "",
    attendanceDate: row.attendance_date ?? "",
    timeIn: row.time_in ?? "",
    timeOut: row.time_out ?? "",
    workHour: row.work_duration ?? "",
    mode: mode.key ?? "",
    modeLabel: mode.label ?? "",
    status: status.key ?? "",
    statusLabel: status.label ?? "",
    checkoutState: deriveAttendanceCheckoutState(row.time_out),
    location: {
      available: location.available === true,
      id: location.id ?? null,
      description: location.description ?? "",
    },
  };
}
```

- [ ] **Step 4: Run focused list tests and confirm GREEN**

Run: `node --test tests/attendance-list-row.test.js tests/attendance-list-normalization.test.js`

Expected: PASS with the live fixture and no coordinate inference.

- [ ] **Step 5: Format, check, and commit**

```powershell
npx prettier --write src/js/features/attendance/attendanceListRow.js tests/attendance-list-row.test.js tests/attendance-list-normalization.test.js
git diff --check
git add src/js/features/attendance/attendanceListRow.js tests/attendance-list-row.test.js tests/attendance-list-normalization.test.js
git commit -m "fix(attendance): map live audit list contract"
```

### Task 2: Align detail normalization and complete the existing Task 7 request flow

**Files:**

- Modify: `src/js/features/attendance/attendanceDetailDrawerLifecycle.js`
- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `tests/attendance-detail-drawer-lifecycle.test.js`
- Modify: `tests/attendance-audit-state.test.js`
- Modify if fixture assertions require it: `tests/attendance-detail-drawer-template.test.js`

**Interfaces:**

- Consumes: the full Axios body returned by `getAttendanceById()`: `{ success, message, data }`.
- Produces: `normalizeAttendanceDetail(response): CanonicalAttendanceDetail`; completed `openAttendanceDetail(id)`, `retryAttendanceDetail()`, and request invalidation behavior.

- [ ] **Step 1: Replace the old detail fixture with a live nested envelope and write failing assertions**

```js
const liveDetailEnvelope = {
  success: true,
  message: "Detail absensi berhasil diambil",
  data: {
    id_attendance: 12041,
    attendance_date: "2026-07-23",
    time_in: "23:55",
    time_out: "23:55",
    work_duration: "00:00",
    mode: { key: "wfo", label: "WFO" },
    status: { key: "alpha", label: "Alpha" },
    notes: "Backend detail",
    booking_id: null,
    user: {
      id: 45,
      full_name: "Muhammad Rizki Ramdani",
      nip_nim: "9BYYD3",
      email: "rizki@example.test",
      role: "Internship",
    },
    location: null,
  },
};

test("normalizes only the live detail envelope data", () => {
  const detail = normalizeAttendanceDetail(liveDetailEnvelope);
  assert.equal(detail.employee.fullName, "Muhammad Rizki Ramdani");
  assert.equal(detail.employee.role, "Internship");
  assert.equal(detail.workHour, "00:00");
  assert.equal(detail.mode, "wfo");
  assert.equal(detail.modeLabel, "WFO");
  assert.equal(detail.status, "alpha");
  assert.equal(detail.statusLabel, "Alpha");
  assert.deepEqual(detail.location, {
    latitude: null,
    longitude: null,
    radius: null,
    description: "",
  });
});
```

- [ ] **Step 2: Run detail/state tests and confirm RED**

Run: `node --test tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-audit-state.test.js`

Expected: FAIL because the current detail adapter reads `employee`, `work_hour`, `information`, and scalar `status` at the envelope root.

- [ ] **Step 3: Implement envelope-aware strict detail mapping and finish the existing WIP**

```js
export function normalizeAttendanceDetail(response = {}) {
  const detail = response?.data ?? {};
  const employee = detail.user ?? {};
  const mode = detail.mode ?? {};
  const status = detail.status ?? {};
  const location = detail.location ?? {};
  return {
    idAttendance: detail.id_attendance ?? null,
    employee: {
      fullName: employee.full_name ?? "",
      nipNim: employee.nip_nim ?? "",
      email: employee.email ?? "",
      role: employee.role ?? "",
    },
    attendanceDate: detail.attendance_date ?? "",
    timeIn: detail.time_in ?? "",
    timeOut: detail.time_out ?? "",
    workHour: detail.work_duration ?? "",
    mode: mode.key ?? "",
    modeLabel: mode.label ?? "",
    status: status.key ?? "",
    statusLabel: status.label ?? "",
    notes: detail.notes ?? "",
    bookingId: detail.booking_id ?? null,
    location: {
      latitude: firstFiniteMapNumber(location.latitude),
      longitude: firstFiniteMapNumber(location.longitude),
      radius: firstFiniteMapNumber(location.radius),
      description: location.description ?? "",
    },
  };
}
```

Keep the existing uncommitted request-token implementation, but update its fixtures and assertions to the live envelope. Verify that a current 404 refreshes the active list once, stale errors do not refresh, close invalidates an in-flight request, and retry reuses the selected ID.

- [ ] **Step 4: Run the complete detail gate and confirm GREEN**

Run: `node --test tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-detail-drawer-template.test.js tests/attendance-audit-state.test.js tests/attendance-service-contract.test.js tests/map-detail-modal-truthfulness.test.js`

Expected: PASS; no old flat detail fixture remains.

- [ ] **Step 5: Format, check, and commit the preserved WIP plus adapter**

```powershell
npx prettier --write src/js/features/attendance/attendanceDetailDrawerLifecycle.js src/js/features/attendance/attendanceLog.js tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-detail-drawer-template.test.js tests/attendance-audit-state.test.js
git diff --check
git add src/js/features/attendance/attendanceDetailDrawerLifecycle.js src/js/features/attendance/attendanceLog.js tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-detail-drawer-template.test.js tests/attendance-audit-state.test.js
git commit -m "feat(attendance): connect live audit detail contract"
```

### Task 3: Enable the authoritative sort query and service contract

**Files:**

- Modify: `src/js/features/attendance/attendanceDirectoryQuery.js`
- Modify: `src/js/services/attendanceService.js`
- Modify: `tests/attendance-directory-query.test.js`
- Modify: `tests/attendance-service-contract.test.js`
- Modify: `src/partials/table/attendance-table-filter.html`
- Modify: `tests/attendance-filter-popover.test.js`

**Interfaces:**

- Produces: `ATTENDANCE_SORT_KEYS`, query state `{ sortBy, sortOrder }`, and Backend request parameters `sortBy`/`sortOrder`.
- Normalizes mode filter values to lowercase `wfo|wfh|wfa` as required by the live validator.

- [ ] **Step 1: Write failing query/service tests for live mode and sorting**

```js
test("parses and serializes an authoritative attendance sort", () => {
  const parsed = parseAttendanceDirectoryQuery(
    new URLSearchParams("mode=wfo&sortBy=full_name&sortOrder=ASC"),
  );
  assert.equal(parsed.appliedFilters.mode, "wfo");
  assert.equal(parsed.sortBy, "full_name");
  assert.equal(parsed.sortOrder, "ASC");
  assert.deepEqual(toAttendanceRequestParams(parsed), {
    page: 1,
    limit: 10,
    mode: "wfo",
    sortBy: "full_name",
    sortOrder: "ASC",
  });
});

test("discards unsupported sort keys and orphan sort orders", () => {
  const invalid = parseAttendanceDirectoryQuery(
    new URLSearchParams("sortBy=mode&sortOrder=ASC"),
  );
  assert.equal(invalid.sortBy, "");
  assert.equal(invalid.sortOrder, "");
});
```

Update the service URL assertion to include `sortBy=attendance_date&sortOrder=DESC` and prove unknown keys are still omitted.

- [ ] **Step 2: Run query/service tests and confirm RED**

Run: `node --test tests/attendance-directory-query.test.js tests/attendance-service-contract.test.js tests/attendance-filter-popover.test.js`

Expected: FAIL because sort keys are currently blocked, the service omits them, and mode values are uppercase.

- [ ] **Step 3: Implement validated sort state and lowercase mode values**

```js
export const ATTENDANCE_SORT_KEYS = Object.freeze([
  "attendance_date",
  "time_in",
  "time_out",
  "full_name",
  "status",
  "created_at",
]);
export const ATTENDANCE_SORT_ORDERS = Object.freeze(["ASC", "DESC"]);
export const ATTENDANCE_MODES = Object.freeze(["wfo", "wfh", "wfa"]);
```

Add `sortBy: ""` and `sortOrder: ""` to the frozen default. A valid `sortBy` with no order parses as `DESC`; an order without a valid key is discarded. Serialize and request-map both values only when `sortBy` is valid. Add `sortBy` and `sortOrder` to `ATTENDANCE_LIST_QUERY_KEYS` in the service. Change filter option values to lowercase while keeping visible labels uppercase.

- [ ] **Step 4: Run query/service/filter tests and confirm GREEN**

Run: `node --test tests/attendance-directory-query.test.js tests/attendance-service-contract.test.js tests/attendance-filter-popover.test.js`

Expected: PASS with exact live validator values.

- [ ] **Step 5: Format, check, and commit**

```powershell
npx prettier --write src/js/features/attendance/attendanceDirectoryQuery.js src/js/services/attendanceService.js src/partials/table/attendance-table-filter.html tests/attendance-directory-query.test.js tests/attendance-service-contract.test.js tests/attendance-filter-popover.test.js
git diff --check
git add src/js/features/attendance/attendanceDirectoryQuery.js src/js/services/attendanceService.js src/partials/table/attendance-table-filter.html tests/attendance-directory-query.test.js tests/attendance-service-contract.test.js tests/attendance-filter-popover.test.js
git commit -m "feat(attendance): enable backend audit sorting"
```

### Task 4: Add URL-backed server sort behavior to Alpine state

**Files:**

- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `tests/attendance-audit-state.test.js`
- Modify: `tests/attendance-list-state.test.js`
- Modify: `tests/attendance-page-composition.test.js`

**Interfaces:**

- Produces: `toggleAttendanceSort(sortBy)` and `attendanceSortDirection(sortBy)`.
- Consumes: Task 3 query state and serializer/request mapper.

- [ ] **Step 1: Write failing state tests for sort cycling and request truth**

```js
test("sort cycles through ASC, DESC, and Backend default", async () => {
  const requests = [];
  const state = attendanceLogAlpineData({
    browser: fakeBrowser("?debug=1"),
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage();
    },
  });
  state.appliedQuery.page = 4;

  await state.toggleAttendanceSort("full_name");
  assert.equal(state.appliedQuery.page, 1);
  assert.equal(state.appliedQuery.sortBy, "full_name");
  assert.equal(state.appliedQuery.sortOrder, "ASC");
  assert.deepEqual(requests[0], {
    page: 1,
    limit: 10,
    sortBy: "full_name",
    sortOrder: "ASC",
  });

  await state.toggleAttendanceSort("full_name");
  assert.equal(state.appliedQuery.sortOrder, "DESC");
  await state.toggleAttendanceSort("full_name");
  assert.equal(state.appliedQuery.sortBy, "");
  assert.equal(state.appliedQuery.sortOrder, "");
});
```

Also assert one push-history write and one fetch per click, preservation of `debug=1`, cancellation of pending search, and rejection of `mode` as a sort key.

- [ ] **Step 2: Run state tests and confirm RED**

Run: `node --test tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js`

Expected: FAIL because the state exposes no sort actions.

- [ ] **Step 3: Implement the minimal server-sort state actions**

```js
async toggleAttendanceSort(sortBy) {
  if (!ATTENDANCE_SORT_KEYS.includes(sortBy) || this.tableState.loading) return false;
  this.cancelPendingSearch();
  if (this.appliedQuery.sortBy !== sortBy) {
    this.appliedQuery.sortBy = sortBy;
    this.appliedQuery.sortOrder = "ASC";
  } else if (this.appliedQuery.sortOrder === "ASC") {
    this.appliedQuery.sortOrder = "DESC";
  } else {
    this.appliedQuery.sortBy = "";
    this.appliedQuery.sortOrder = "";
  }
  this.appliedQuery.page = 1;
  this.syncUrl("push");
  return this.fetchAttendance();
}
```

Return `"ascending"`, `"descending"`, or `"none"` from `attendanceSortDirection(sortBy)` for template accessibility. Do not reorder `rows`.

- [ ] **Step 4: Run the state gate and confirm GREEN**

Run: `node --test tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js`

Expected: PASS with Backend request order preserved.

- [ ] **Step 5: Format, check, and commit**

```powershell
npx prettier --write src/js/features/attendance/attendanceLog.js tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js
git diff --check
git add src/js/features/attendance/attendanceLog.js tests/attendance-audit-state.test.js tests/attendance-list-state.test.js tests/attendance-page-composition.test.js
git commit -m "feat(attendance): add server sort state"
```

### Task 5: Bind the table to live labels, location truth, and accessible sorting

**Files:**

- Modify: `src/partials/table/table-attendance.html`
- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `tests/attendance-audit-table.test.js`
- Modify: `tests/attendance-truthfulness-template.test.js`

**Interfaces:**

- Consumes canonical list fields from Task 1 and sort actions from Task 4.
- Produces truthful seven-column presentation without list-coordinate dependency.

- [ ] **Step 1: Write failing template/state assertions**

Assert that:

```js
for (const [label, key] of [
  ["Pegawai", "full_name"],
  ["Tanggal", "attendance_date"],
  ["Kehadiran", "time_in"],
  ["Status", "status"],
]) {
  assert.match(table, new RegExp(`toggleAttendanceSort\\(\\'${key}\\'\\)`));
  assert.match(table, new RegExp(`attendanceSortDirection\\(\\'${key}\\'\\)`));
}
assert.doesNotMatch(table, /toggleAttendanceSort\(['"]mode/);
assert.match(table, /log\.location\.available/);
assert.match(table, /log\.location\.description/);
assert.doesNotMatch(table, /hasAttendanceCoordinates\(log\)/);
```

Add state-level assertions that list location availability never opens a coordinate map; only detail coordinates initialize Leaflet.

- [ ] **Step 2: Run table tests and confirm RED**

Run: `node --test tests/attendance-audit-table.test.js tests/attendance-truthfulness-template.test.js tests/attendance-audit-state.test.js`

Expected: FAIL because headers are static and the location badge still checks coordinates absent from the live list.

- [ ] **Step 3: Implement truthful bindings and sortable header buttons**

For the four sortable headers, render a real `<button type="button">` whose click calls `toggleAttendanceSort(key)`, whose disabled state follows `tableState.loading`, and whose parent `<th>` binds `:aria-sort="attendanceSortDirection(key)"`. Render an icon only from applied sort state.

Use `log.modeLabel || getInfoBadgeText(log.mode)` and `log.statusLabel || getStatusBadgeText(log.status)` for visible text while keeping key-based badge classes. Render location as:

```html
<span
  x-text="log.location.available
  ? (log.location.description || 'Lokasi tersedia')
  : 'Lokasi tidak tersedia'"
></span>
```

Do not bind list rows to latitude or longitude. Keep row order exactly as received.

- [ ] **Step 4: Run all Attendance template/state tests and confirm GREEN**

Run: `$tests = Get-ChildItem tests -Filter 'attendance-*.test.js' | ForEach-Object FullName; node --test $tests`

Expected: all Attendance tests pass.

- [ ] **Step 5: Format, check, and commit**

```powershell
npx prettier --write src/partials/table/table-attendance.html src/js/features/attendance/attendanceLog.js tests/attendance-audit-table.test.js tests/attendance-truthfulness-template.test.js
git diff --check
git add src/partials/table/table-attendance.html src/js/features/attendance/attendanceLog.js tests/attendance-audit-table.test.js tests/attendance-truthfulness-template.test.js
git commit -m "feat(attendance): render live audit contract"
```

### Task 6: Verify the complete Web FE contract against the live container

**Files:**

- Modify only if formatting is required: files changed in Tasks 1-5.

**Interfaces:**

- Verifies the whole branch; produces no new behavior.

- [ ] **Step 1: Run the complete focused Attendance suite**

```powershell
$attendanceTests = Get-ChildItem tests -Filter 'attendance-*.test.js' | ForEach-Object FullName
node --test $attendanceTests
```

Expected: zero Attendance failures.

- [ ] **Step 2: Run shared drawer/map/auth-boundary regressions**

Run:

```powershell
$sharedTests = @(
  'tests/map-detail-modal-truthfulness.test.js',
  'tests/user-detail-drawer-lifecycle.test.js',
  'tests/focus-trap.test.js'
)
$authTests = Get-ChildItem tests -Filter 'auth-*.test.js' | ForEach-Object FullName
node --test @sharedTests $authTests
```

Expected: zero new failures.

- [ ] **Step 3: Run the production build and patch hygiene checks**

```powershell
npm run build
git diff --check
git status --short
git diff --stat 32769eb...HEAD
```

Expected: build exits 0; only INF-269 Web FE implementation/tests/docs are present.

- [ ] **Step 4: Run the full repository test suite and compare inherited failures**

Run: `node --test`

Expected: no new Attendance failures. Report unrelated inherited failures separately with exact totals.

- [ ] **Step 5: Restart and verify runtime against the live Backend container**

Verify the existing port-3000 listener command line before stopping it. Start `npm run start` from the isolated INF-269 worktree and verify:

- authenticated list renders the supplied nested response;
- page size, search, filters, and pagination send the expected query;
- open/completed filtering remains Backend-authored while row checkout text is derived from `time_out`;
- sort URL/request/header state agree and rows remain in Backend order;
- detail loads the nested envelope and 404 refreshes the list;
- list location uses availability/description and detail map uses coordinates;
- delete recovery preserves applied query state.

Capture runtime limitations honestly if authentication or data prevents a path from being exercised.

- [ ] **Step 6: Commit formatting/evidence-only changes if present**

```powershell
git add src tests docs
git commit -m "test(attendance): verify live audit integration"
```

Skip this commit when verification produces no tracked changes.
