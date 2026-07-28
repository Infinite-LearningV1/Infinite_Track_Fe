# INF-269 Attendance Audit Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Management Attendance server-driven audit table, combined filters, URL-backed query state, detail drawer, and robust permanent-delete recovery against the locked INF-267 contract.

**Architecture:** Create a dedicated pure query module and a testable Alpine feature state machine. The list, detail, and delete boundaries remain independent: list rows/pagination are server-authored, detail is fetched by attendance ID with its own stale-response token, and delete always reconciles through a server refetch. Reuse Management Pengguna visual/focus/map primitives while keeping Attendance fields and Backend contracts feature-owned.

**Tech Stack:** Multi-page HTML, Alpine.js, JavaScript ES modules, Axios through `authRequest`, Tailwind CSS, Leaflet via the existing map adapter, Node `node:test`, Webpack/PostCSS.

## Global Constraints

- Start only after the INF-268 plan is implemented and verified.
- Create `feature/inf-269-attendance-audit-explorer` from the verified `feature/inf-268-attendance-truthfulness` HEAD in its own isolated worktree.
- Scope is Web FE only. INF-267 is external: contract fixtures may prove serialization/normalization, but runtime search/filter/sort/detail remains `Needs Verification` until the compatible Backend exists.
- Do not locally filter, sort, slice, synthesize totals, widen a list row into detail, or invent location/profile data.
- Canonical public query keys are `page`, `limit`, `search`, `from`, `to`, `mode`, `status`, `checkout_state`, `sortBy`, and `sortOrder`.
- Mode values are `WFO`, `WFH`, `WFA`; checkout-state values are `completed`, `open`; status keys must stay aligned with the canonical Attendance badge/Backend contract.
- Follow TDD task-by-task and make small commits. Required final gates are focused tests, production build, `git diff --check`, scope review, and full-suite comparison to the inherited baseline.

---

### Task 0: Create the stacked isolated worktree

**Files:**

- Create worktree directory: `E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\inf-269-attendance-audit-explorer`
- Create branch: `feature/inf-269-attendance-audit-explorer`

- [ ] **Step 1: Confirm the INF-268 source worktree is clean and verified**

```powershell
git -C E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\inf-268-attendance-truthfulness status --short
git -C E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\inf-268-attendance-truthfulness branch --show-current
```

Expected: no status output, and branch `feature/inf-268-attendance-truthfulness`.

- [ ] **Step 2: Create the child branch in its own worktree**

```powershell
git -C E:\skrisi\clonefee\Infinite_Track_Fe worktree add E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\inf-269-attendance-audit-explorer -b feature/inf-269-attendance-audit-explorer feature/inf-268-attendance-truthfulness
```

Expected: worktree created at the verified INF-268 HEAD.

- [ ] **Step 3: Install dependencies without rewriting the manifest**

Run in the new worktree: `npm install`

Expected: exit code 0; if `package-lock.json` changes despite an unchanged dependency graph, inspect and restore only that incidental lockfile change with a targeted patch before continuing.

- [ ] **Step 4: Prove the inherited INF-268 focused gate**

```powershell
node --test tests/attendance-list-normalization.test.js tests/attendance-list-state.test.js tests/attendance-truthfulness-template.test.js tests/attendance-location-truth.test.js tests/map-detail-modal-truthfulness.test.js tests/user-detail-drawer-lifecycle.test.js
```

Expected: PASS. Stop if the inherited Attendance baseline is not green.

### Task 1: Create the canonical Attendance query contract

**Files:**

- Create: `src/js/features/attendance/attendanceDirectoryQuery.js`
- Create: `tests/attendance-directory-query.test.js`

- [ ] **Step 1: Write failing parse, validation, serialization, and request tests**

The test matrix must cover defaults, allowlists, strict dates, preservation of unrelated URL keys, omission of defaults, and snake-case Backend mapping:

```js
test("parses the complete canonical query", () => {
  const parsed = parseAttendanceDirectoryQuery(
    new URLSearchParams(
      "page=3&limit=25&search=ayu&from=2026-07-01&to=2026-07-31&mode=WFH&status=late&checkout_state=open&sortBy=attendance_date&sortOrder=ASC",
    ),
  );
  assert.equal(parsed.page, 3);
  assert.deepEqual(parsed.appliedFilters, {
    from: "2026-07-01",
    to: "2026-07-31",
    mode: "WFH",
    status: "late",
    checkoutState: "open",
  });
});

test("rejects incomplete and reversed date drafts", () => {
  assert.deepEqual(
    validateAttendanceDateRange({ from: "2026-07-02", to: "" }),
    {
      valid: false,
      message: "Tanggal mulai dan selesai harus diisi bersama.",
    },
  );
});
```

Assert `toAttendanceRequestParams()` emits `checkout_state`, never `checkoutState`, and includes allowlisted sort only.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-directory-query.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement immutable defaults and pure functions**

Export:

```js
export const ATTENDANCE_PAGE_SIZES = Object.freeze([10, 25, 50, 100]);
export const ATTENDANCE_MODES = Object.freeze(["WFO", "WFH", "WFA"]);
export const ATTENDANCE_CHECKOUT_STATES = Object.freeze(["completed", "open"]);
export const ATTENDANCE_SORT_KEYS = Object.freeze([
  "attendance_date",
  "full_name",
  "time_in",
  "time_out",
  "status",
]);
export const DEFAULT_ATTENDANCE_QUERY = Object.freeze({
  page: 1,
  limit: 10,
  search: "",
  appliedFilters: Object.freeze({
    from: "",
    to: "",
    mode: "",
    status: "",
    checkoutState: "",
  }),
  sortBy: "attendance_date",
  sortOrder: "DESC",
});
export function parseAttendanceDirectoryQuery(searchParams) {}
export function serializeAttendanceDirectoryQuery(
  state,
  existingSearchParams,
) {}
export function toAttendanceRequestParams(state) {}
export function validateAttendanceDateRange(filters) {}
```

Use a managed-key list so unrelated query/hash state survives serialization. Invalid URL values fall back safely; invalid draft dates block Apply without mutating applied state. Add an assertion that `DEFAULT_ATTENDANCE_QUERY` has exactly the shape above and that parsing an empty query returns a fresh nested `appliedFilters` object rather than mutating the frozen default.

- [ ] **Step 4: Run query tests and confirm GREEN**

Run: `node --test tests/attendance-directory-query.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/js/features/attendance/attendanceDirectoryQuery.js tests/attendance-directory-query.test.js
git commit -m "feat(attendance): define audit query contract"
```

### Task 2: Extend the Attendance service for the INF-267 contract

**Files:**

- Modify: `src/js/services/attendanceService.js`
- Create: `tests/attendance-service-contract.test.js`

- [ ] **Step 1: Write failing URL and error-preservation tests**

Extract URL construction into a pure export so it is testable without mocking Axios:

```js
test("buildAttendanceListUrl serializes every defined public parameter", () => {
  assert.equal(
    buildAttendanceListUrl("http://api.test/api", {
      page: 2,
      limit: 25,
      search: "Ayu",
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "WFH",
      status: "late",
      checkout_state: "open",
      sortBy: "attendance_date",
      sortOrder: "DESC",
    }),
    "http://api.test/api/attendance?page=2&limit=25&search=Ayu&from=2026-07-01&to=2026-07-31&mode=WFH&status=late&checkout_state=open&sortBy=attendance_date&sortOrder=DESC",
  );
});
```

Add detail URL assertions for IDs including `0`, and assert missing IDs reject before a request. Preserve `error.response.status` and Backend message on thrown service errors so the feature can distinguish 404 and validation failures.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-service-contract.test.js`

Expected: FAIL because list URL construction is private and `getAttendanceById` does not exist.

- [ ] **Step 3: Implement service helpers and detail call**

Export `buildAttendanceListUrl(baseUrl, params)`, `getAttendanceById(attendanceId)`, and a shared error normalizer that attaches `status` and `code` to the thrown `Error`. Append parameters only when they are neither `undefined`, `null`, nor empty string.

- [ ] **Step 4: Run service/query tests**

Run: `node --test tests/attendance-service-contract.test.js tests/attendance-directory-query.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/js/services/attendanceService.js tests/attendance-service-contract.test.js
git commit -m "feat(attendance): support audit list and detail contract"
```

### Task 3: Replace the list component with URL-backed server state

**Files:**

- Create: `src/js/features/attendance/attendanceListRow.js`
- Modify: `src/js/features/attendance/attendanceLog.js`
- Create: `tests/attendance-list-row.test.js`
- Create: `tests/attendance-audit-state.test.js`

- [ ] **Step 1: Write failing initialization, history, debounce, and race tests**

Use injected services, browser, and timers. Prove that a stale success and stale failure cannot overwrite the latest request:

```js
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

const slimAttendanceRow = (overrides = {}) => ({
  id_attendance: 42,
  id: 7,
  full_name: "Ayu Lestari",
  nip_nim: "2026007",
  role_name: "Staff",
  attendance_date: "2026-07-28",
  time_in: "08:00",
  time_out: "17:00",
  work_hour: "09:00",
  information: "WFH",
  status: "ontime",
  checkout_state: "completed",
  location: { latitude: -0.91, longitude: 119.87 },
  ...overrides,
});

test("only the newest list response may update rows", async () => {
  const resolvers = [];
  const state = attendanceLogAlpineData({
    getAttendanceLog: () =>
      new Promise((resolve, reject) => resolvers.push({ resolve, reject })),
    browser: fakeBrowser("?search=first"),
  });
  const first = state.fetchAttendance();
  state.searchQuery = "second";
  const second = state.fetchAttendance();
  resolvers[1].resolve(
    attendancePage([slimAttendanceRow({ id_attendance: 2 })]),
  );
  await second;
  resolvers[0].resolve(
    attendancePage([slimAttendanceRow({ id_attendance: 1 })]),
  );
  await first;
  assert.equal(state.rows[0].idAttendance, 2);
});
```

In `tests/attendance-list-row.test.js`, lock the slim INF-267 list fixture above and assert the pure mapper produces exactly:

```js
{
  idAttendance: 42,
  employeeId: 7,
  fullName: "Ayu Lestari",
  nipNim: "2026007",
  roleName: "Staff",
  attendanceDate: "2026-07-28",
  timeIn: "08:00",
  timeOut: "17:00",
  workHour: "09:00",
  mode: "WFH",
  status: "ontime",
  checkoutState: "completed",
  location: { latitude: -0.91, longitude: 119.87 },
}
```

The mapper accepts `mode` as the canonical field and `information` only as the documented transition alias. It copies only list fields, uses `firstFiniteMapNumber` for coordinates, and never adds email, notes, radius, description, booking ID, or other detail-only fields. Cover URL hydration, popstate, push/replace semantics, search cancellation before paging/filter/sort/page-size, and keeping the last successful rows visible on a list error.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-list-row.test.js tests/attendance-audit-state.test.js`

Expected: FAIL because canonical query/history/race state is not wired.

- [ ] **Step 3: Implement the list state machine**

Use state names from the design:

```js
rows: [],
pagination: { current_page: 1, total_pages: 1, total_records: 0, records_per_page: 10, has_prev_page: false, has_next_page: false },
appliedQuery: {
  ...DEFAULT_ATTENDANCE_QUERY,
  appliedFilters: { ...DEFAULT_ATTENDANCE_QUERY.appliedFilters },
},
draftFilters: { ...DEFAULT_ATTENDANCE_QUERY.appliedFilters },
tableState: { loading: false, error: "", hasSuccessfulPage: false },
latestListRequestId: 0,
```

Export `normalizeAttendanceListRow(row)` from `attendanceListRow.js` with the exact field mapping above. Normalize each returned list row once, preserving Backend order. Expose compatibility getters only where the existing template needs them during this task. Every server interaction must call `toAttendanceRequestParams(this.appliedQuery)`. `syncUrl()` uses the pure serializer and preserves unrelated parameters/hash.

- [ ] **Step 4: Run state, query, and INF-268 regression tests**

Run:

```bash
node --test tests/attendance-list-row.test.js tests/attendance-audit-state.test.js tests/attendance-directory-query.test.js tests/attendance-list-normalization.test.js tests/attendance-location-truth.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/js/features/attendance/attendanceListRow.js src/js/features/attendance/attendanceLog.js tests/attendance-list-row.test.js tests/attendance-audit-state.test.js
git commit -m "feat(attendance): add server-authored audit state"
```

### Task 4: Build the combined filter and toolbar contract

**Files:**

- Create: `src/partials/table/attendance-table-filter.html`
- Modify: `src/management-attendance.html`
- Modify: `src/js/features/attendance/attendanceLog.js`
- Create: `tests/attendance-filter-popover.test.js`
- Modify: `tests/attendance-audit-state.test.js`

- [ ] **Step 1: Write failing state and template tests**

Assert draft edits do not fetch, Apply validates and fetches once, Clear resets only managed filters, active count reflects applied criteria, and unsuccessful validation leaves the popover/draft open.

Template assertions must include:

```js
assert.match(filter, /:aria-expanded="isFilterOpen"/);
assert.match(filter, /aria-controls="attendanceTableFilterPopover"/);
assert.match(filter, /@click\.outside="closeFilter\(\)"/);
assert.match(filter, /@keydown\.escape\.window="closeFilter\(\)"/);
assert.match(filter, /x-model="draftFilters\.from"/);
assert.match(filter, /x-model="draftFilters\.checkoutState"/);
assert.match(filter, /@click="applyFilters\(\)"/);
assert.match(filter, /@click="clearFilters\(\)"/);
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-filter-popover.test.js tests/attendance-audit-state.test.js`

Expected: FAIL because the partial and draft/applied methods do not exist.

- [ ] **Step 3: Implement the toolbar and filter partial**

Keep visible search and one Filter trigger. Include date range, mode, status, and checkout state. Status options must use the canonical keys already recognized by the Attendance status mapper: `ontime`, `late`, `early`, `alpha`. Implement `openFilter`, `closeFilter`, `applyFilters`, `clearFilters`, `activeFilterCount`, and `filterValidationMessage`.

On successful Apply: copy draft to applied, page 1, push history, fetch once, close, and restore trigger focus. On invalid date range: retain draft, do not fetch, and expose the message with `role="alert"`.

- [ ] **Step 4: Run filter and state tests**

Run: `node --test tests/attendance-filter-popover.test.js tests/attendance-audit-state.test.js tests/attendance-directory-query.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/partials/table/attendance-table-filter.html src/management-attendance.html src/js/features/attendance/attendanceLog.js tests/attendance-filter-popover.test.js tests/attendance-audit-state.test.js
git commit -m "feat(attendance): add combined audit filters"
```

### Task 5: Redesign the audit table and real server sort controls

**Files:**

- Modify: `src/partials/table/table-attendance.html`
- Modify: `src/js/features/attendance/attendanceLog.js`
- Create: `tests/attendance-audit-table.test.js`
- Modify: `tests/attendance-audit-state.test.js`

- [ ] **Step 1: Write failing seven-column, keyboard, and sort tests**

Assert the fixed labels and absence of old columns:

```js
for (const label of [
  "Pegawai",
  "Tanggal",
  "Kehadiran",
  "Mode",
  "Status",
  "Lokasi",
  "Aksi",
]) {
  assert.match(table, new RegExp(`>${label}<`));
}
assert.doesNotMatch(table, />User ID</);
assert.doesNotMatch(table, />Koordinat</);
```

Assert rows have `tabindex="0"`, Enter/Space handlers, and a visible focus class; action controls call `.stop`. Assert only allowlisted headings call `toggleSort`, with `aria-sort` derived from applied state. Add state tests proving sort resets page, syncs URL, and fetches once. Add an error/retry assertion: after one successful page followed by a failed refresh, the table still renders the previous `rows`, exposes the request error with `role="alert"`, and a `retryAttendanceList()` button refetches the unchanged `appliedQuery`.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-audit-table.test.js tests/attendance-audit-state.test.js`

Expected: FAIL on the legacy nine-column table.

- [ ] **Step 3: Implement the server-driven table**

Render exactly the seven approved columns from normalized list keys (`idAttendance`, `fullName`, `nipNim`, `roleName`, `attendanceDate`, `timeIn`, `timeOut`, `workHour`, `mode`, `status`, `checkoutState`, `location`). Row click/Enter/Space calls `openAttendanceDetail(log.idAttendance)`. Overflow action menu owns permanent delete and stops propagation.

Implement `toggleSort`, `sortAriaValue`, and `sortIndicator` using `ATTENDANCE_SORT_KEYS`; do not reorder `rows`. Distinguish no records, no match, and out-of-range empty page through a pure `emptyStateMessage` getter. Do not hide the last successful table merely because `tableState.error` is set: render an error/retry banner above the retained rows, and show an error-only state only when no successful page has ever loaded. `retryAttendanceList()` delegates to `fetchAttendance()` without changing query/history.

- [ ] **Step 4: Run table/state tests**

Run: `node --test tests/attendance-audit-table.test.js tests/attendance-audit-state.test.js tests/attendance-filter-popover.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/partials/table/table-attendance.html src/js/features/attendance/attendanceLog.js tests/attendance-audit-table.test.js tests/attendance-audit-state.test.js
git commit -m "feat(attendance): build server-driven audit table"
```

### Task 6: Add detail normalization and a container-scoped drawer map

**Files:**

- Create: `src/js/features/attendance/attendanceDetailDrawerLifecycle.js`
- Create: `src/partials/modal/attendance-detail-drawer.html`
- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `src/js/components/modal/mapDetailModal.js`
- Modify: `src/management-attendance.html`
- Modify: `src/js/index.js`
- Create: `tests/attendance-detail-drawer-lifecycle.test.js`
- Create: `tests/attendance-detail-drawer-template.test.js`
- Modify: `tests/map-detail-modal-truthfulness.test.js`

- [ ] **Step 1: Write failing detail and map lifecycle tests**

Use a realistic full-detail fixture distinct from the slim list fixture. Assert no default radius/description, numeric-string coordinates including zero are accepted, missing coordinates initialize no map, close is idempotent, reopen destroys first, and deferred open-close leaves no map.

```js
const fullDetail = (overrides = {}) => ({
  id_attendance: 9,
  employee: {
    full_name: "Ayu",
    nip_nim: "123",
    email: "ayu@test",
    role_name: "Staff",
  },
  attendance_date: "2026-07-28",
  time_in: "08:00",
  time_out: "17:00",
  work_hour: "09:00",
  information: "WFH",
  status: "ontime",
  notes: "Backend detail",
  location: { latitude: "0", longitude: "119.8" },
  ...overrides,
});

test("normalizes only detail-response evidence", () => {
  const detail = normalizeAttendanceDetail(fullDetail());
  assert.equal(detail.location.latitude, 0);
  assert.equal(detail.location.radius, null);
  assert.equal(detail.location.description, "");
});
```

Template tests assert dialog semantics, title/description linkage, Escape, Tab trap, loading/error/unavailable states, all three approved sections, and no edit controls. Extend `tests/map-detail-modal-truthfulness.test.js` to prove `MapDetailModal` accepts a container ID, passes the resolved element (not a hardcoded string) to Leaflet, and cancels timers per instance. Add a page composition assertion that `management-attendance.html` contains exactly one `attendanceDetailMapContainer` and no longer includes `map-detail-modal.html` or `mapDetailContainer`.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-detail-drawer-template.test.js tests/map-detail-modal-truthfulness.test.js`

Expected: FAIL because lifecycle and partial do not exist and the map adapter still hardcodes `mapDetailContainer`.

- [ ] **Step 3: Make the existing Leaflet adapter container-scoped**

Change `MapDetailModal` to accept `containerId = "mapDetailContainer"` in its constructor, store it, resolve `document.getElementById(this.containerId)`, and call `L.map(container, options)`. Keep `window.mapDetailModal = new MapDetailModal("mapDetailContainer")` for existing User/Booking consumers. Export the class and, in `index.js`, create the sole Attendance instance as `window.attendanceDetailMap = new MapDetailModal("attendanceDetailMapContainer")`. Generalize the CSS selectors with a shared class or `[data-location-map]` so the new drawer container is styled without duplicating IDs.

- [ ] **Step 4: Give the Attendance component sole ownership of drawer presentation**

Mirror the proven user drawer lifecycle but keep it inside the single object returned by `attendanceLogAlpineData(overrides)`. Export `normalizeAttendanceDetail`, `createEmptyAttendanceDetail`, and `createAttendanceDetailDrawerLifecycle({ mapAdapter })`. The factory creates one lifecycle from `overrides.mapAdapter` or a thin adapter delegating to `window.attendanceDetailMap.initializeMap()` / `destroyMap()`; tests inject a fake adapter. Do not register a second Alpine component.

The returned Attendance object owns `isAttendanceDetailDrawerOpen`, the presentation lifecycle, and the focus-trap handle. Task 6 implements presentation-only APIs: `openAttendanceDrawerShell()` opens an empty/loading-capable shell and activates the focus trap; `replaceAttendanceDrawerDetail(detail)` calls `lifecycle.replace(detail)` after `this.$nextTick()` so the visible `attendanceDetailMapContainer` can initialize; `closeAttendanceDrawer()` calls `lifecycle.close()`, destroys/cancels the map, deactivates the trap, and restores focus; `handleAttendanceDrawerTab(event)` delegates to `createFocusTrap`. Task 6 does not call `getAttendanceById`, create request tokens, or handle HTTP errors.

- [ ] **Step 5: Add the read-only drawer partial and remove the old modal path**

Render Employee, Attendance record, and Location evidence sections. Loading/error stay inside the drawer. Use one `<div id="attendanceDetailMapContainer" data-location-map>` only for valid detail coordinates. Include the drawer partial inside the existing body-level Attendance Alpine scope. Remove `<include src="./partials/modal/map-detail-modal.html">` from `management-attendance.html`; INF-269 no longer opens a separate location modal from a list row.

- [ ] **Step 6: Run drawer and shared lifecycle tests**

Run:

```bash
node --test tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-detail-drawer-template.test.js tests/user-detail-drawer-lifecycle.test.js tests/focus-trap.test.js tests/map-detail-modal-truthfulness.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/js/features/attendance/attendanceDetailDrawerLifecycle.js src/js/features/attendance/attendanceLog.js src/js/components/modal/mapDetailModal.js src/js/index.js src/partials/modal/attendance-detail-drawer.html src/management-attendance.html tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-detail-drawer-template.test.js tests/map-detail-modal-truthfulness.test.js
git commit -m "feat(attendance): add audit detail drawer"
```

### Task 7: Wire detail-by-ID with stale-response and 404 handling

**Files:**

- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `tests/attendance-audit-state.test.js`

- [ ] **Step 1: Write failing detail-request race tests**

Cover: drawer opens in loading state before the service resolves; only `getAttendanceById(id)` supplies rendered detail; stale success and stale error are ignored; current error stays in drawer; current 404 shows unavailable and triggers one list refresh.

```js
test("a slim list row is never rendered as full detail", async () => {
  const state = attendanceLogAlpineData({
    getAttendanceById: async () => fullDetail({ notes: "Backend detail" }),
  });
  state.rows = [{ idAttendance: 4 }];
  await state.openAttendanceDetail(4);
  assert.equal(state.detailState.detail.notes, "Backend detail");
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-audit-state.test.js`

Expected: FAIL because detail request state is not yet connected.

- [ ] **Step 3: Implement independent detail state**

Add:

```js
detailState: { selectedId: null, requestId: 0, loading: false, error: "", unavailable: false, detail: null }
```

`openAttendanceDetail(id)` resets `detailState`, calls `openAttendanceDrawerShell()`, increments the detail token, fetches by ID, and ignores stale completions. On current success it normalizes the response, stores it in `detailState.detail`, then calls `replaceAttendanceDrawerDetail(detailState.detail)`. `closeAttendanceDetail()` invalidates the token, resets request state, and delegates to `closeAttendanceDrawer()`. Current 404 handling and list refresh live here; Task 6 remains presentation-only. Do not mutate list rows with detail data.

- [ ] **Step 4: Run state and drawer tests**

Run: `node --test tests/attendance-audit-state.test.js tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-detail-drawer-template.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/js/features/attendance/attendanceLog.js tests/attendance-audit-state.test.js
git commit -m "feat(attendance): fetch race-safe audit detail"
```

### Task 8: Implement truthful permanent-delete recovery

**Files:**

- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `src/partials/table/table-attendance.html`
- Modify: `src/partials/modal/attendance-detail-drawer.html`
- Create: `tests/attendance-delete-recovery.test.js`

- [ ] **Step 1: Write failing confirmation and recovery tests**

Assert confirmation copy includes employee, date, and times; repeated submission is blocked; success refetches with active criteria; deleting the only row on page 3 refetches page 2; 404 notifies “already unavailable” and refreshes; other errors retain authoritative rows and delete context. Inject `notify(payload)` into the factory so tests can assert user-visible outcomes without a DOM/global.

```js
test("delete of the final trailing-page row recovers to the previous page", async () => {
  const calls = [];
  const notices = [];
  const state = attendanceLogAlpineData({
    deleteAttendance: async () => {},
    getAttendanceLog: async (params) => {
      calls.push(params);
      return attendancePage([]);
    },
    browser: null,
    notify: (payload) => notices.push(payload),
  });
  state.appliedQuery.page = 3;
  state.rows = [{ idAttendance: 8 }];
  state.pagination.total_records = 21;
  state.deleteState.record = { idAttendance: 8 };
  await state.executeDelete();
  assert.equal(state.appliedQuery.page, 2);
  assert.equal(calls[0].page, 2);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/attendance-delete-recovery.test.js`

Expected: FAIL because delete state does not yet own page recovery or 404 semantics.

- [ ] **Step 3: Implement delete state and menu/drawer entry points**

Use:

```js
deleteState: { record: null, submitting: false, error: "" }
```

At factory construction, define `notify = overrides.notify || ((payload) => window.showInlineAlert?.(payload))`, guarded for non-browser tests. Confirmation must not request a reason. On success, calculate the candidate page from the authoritative pre-delete total and current row count, sync URL when page changes, then fetch. On 404, call:

```js
notify({
  type: "warning",
  title: "Data Absensi Tidak Tersedia",
  message: "Data absensi ini sudah tidak tersedia. Daftar akan dimuat ulang.",
});
```

Then refetch the unchanged active query. For other failures, set `deleteState.error`, leave `deleteState.record` intact for retry/cancel, keep `rows` untouched, and notify with type `danger`. Never `splice()` rows as final state.

- [ ] **Step 4: Run delete, state, and table tests**

Run: `node --test tests/attendance-delete-recovery.test.js tests/attendance-audit-state.test.js tests/attendance-audit-table.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/js/features/attendance/attendanceLog.js src/partials/table/table-attendance.html src/partials/modal/attendance-detail-drawer.html tests/attendance-delete-recovery.test.js
git commit -m "feat(attendance): recover authoritative delete state"
```

### Task 9: Verify accessibility, responsive contracts, and integration boundaries

**Files:**

- Create: `tests/attendance-audit-page-contract.test.js`
- Modify only when tests expose a defect: Attendance files changed in Tasks 1-8

- [ ] **Step 1: Write the final page composition test**

Assert exactly one filter partial, table partial, and detail drawer include; no KPI/chart/export/live-map panel; dark-mode classes exist; table has horizontal overflow; narrow filter/drawer use full-width-safe classes; pagination disables redundant current/loading requests; status/mode/location expose visible text.

- [ ] **Step 2: Run and fix RED one assertion at a time**

Run: `node --test tests/attendance-audit-page-contract.test.js`

Expected initial result: FAIL for any missed composition or accessibility contract. Make only the smallest HTML/state corrections needed, rerunning until PASS.

- [ ] **Step 3: Run the complete focused Attendance gate**

```bash
node --test tests/attendance-list-normalization.test.js tests/attendance-list-state.test.js tests/attendance-list-row.test.js tests/attendance-location-truth.test.js tests/attendance-directory-query.test.js tests/attendance-service-contract.test.js tests/attendance-audit-state.test.js tests/attendance-filter-popover.test.js tests/attendance-audit-table.test.js tests/attendance-detail-drawer-lifecycle.test.js tests/attendance-detail-drawer-template.test.js tests/attendance-delete-recovery.test.js tests/attendance-audit-page-contract.test.js tests/focus-trap.test.js tests/map-detail-modal-truthfulness.test.js tests/user-detail-drawer-lifecycle.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/attendance-audit-page-contract.test.js src/management-attendance.html src/partials/table src/partials/modal src/js/features/attendance src/js/index.js
git commit -m "test(attendance): lock audit explorer contracts"
```

### Task 10: Build, compare baseline, and document runtime evidence honestly

**Files:**

- Modify only if formatting is required: files changed in Tasks 1-9

- [ ] **Step 1: Format all touched implementation and test files**

Run `npx prettier --write` with the explicit touched file list from `git diff --name-only feature/inf-268-attendance-truthfulness...HEAD`.

- [ ] **Step 2: Rerun the complete focused gate**

Run the exact focused command from Task 9. Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit code 0 and `management-attendance.html` emitted.

- [ ] **Step 4: Compare full suite to inherited baseline**

Run: `node --test`

Expected: no new Attendance failures. Report inherited unrelated failures separately and with exact counts.

- [ ] **Step 5: Check scope and patch hygiene**

```bash
git diff --check
git status --short
git diff --stat feature/inf-268-attendance-truthfulness...HEAD
```

Expected: only INF-269 Web FE implementation/tests/docs; no Backend or unrelated dashboard changes.

- [ ] **Step 6: Runtime verification boundary**

If INF-267-compatible Backend is available, run `npm run start` and verify authenticated desktop and narrow layouts for URL hydration, search, Apply/Clear filters, server sort, pagination, detail race/error, map reopen, delete recovery, popstate, keyboard, and focus. Capture screenshots.

If the compatible Backend is unavailable, record these runtime paths as `Needs Verification`; do not use client fixtures or mock success as runtime proof.

- [ ] **Step 7: Commit formatting/evidence-only changes if any**

```bash
git add src tests docs
git commit -m "chore(attendance): finalize audit explorer verification"
```

Skip this commit when there are no changes. Keep the worktree for code review and stacked PR feedback.
