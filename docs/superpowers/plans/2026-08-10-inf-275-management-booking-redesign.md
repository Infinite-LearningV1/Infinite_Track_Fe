# INF-275 Management Booking Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Management Booking into a truthful server-driven WFA approval/review queue with the locked eight-column table, combined filters, right-side review/detail drawer, INF-274 contract mapping, and safe decision/delete recovery.

**Architecture:** Preserve the current multi-page HTML + Alpine.js boundary. `bookingListAlpineData()` stays the page coordinator, while pure query normalization and drawer/map lifecycle move to focused WFA Booking modules; `bookingService` remains the only API boundary through `authRequest`.

**Tech Stack:** HTML static includes, Alpine.js 3, JavaScript ES modules, Tailwind CSS, Axios via `authRequest`, Leaflet via existing `MapDetailModal`, Node `node:test`, Webpack/PostCSS, Prettier.

## Global Constraints

- Work only in `E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\inf-275-management-booking-redesign` on `feature/inf-275-management-booking-redesign`.
- Base integration branch is `develop`; never edit `develop` or `master` directly.
- INF-274 is Backend source of truth; Web FE must not invent a detail endpoint, booking actor, score, radius, location schema, or status.
- Canonical list request keys are `page`, `limit`, `search`, `status`, `date_from`, and `date_to` only.
- `sortBy` and `sortOrder` are deprecated Backend no-ops and must disappear from the redesigned FE state, service request, and table affordances.
- Table columns are exactly `Pemohon | Jadwal WFA | Diajukan | Alasan | Lokasi | Kelayakan | Status | Aksi`.
- Table location is text-only; coordinates, radius, and map exist only in the drawer.
- `null` suitability is unavailable; numeric zero remains a valid score.
- Rejection must reuse the existing INF-271 rejection transaction; do not create a second rejection business flow.
- Follow TDD per task, make bounded commits, and preserve Admin/Management access behavior.
- Do not run `npm audit fix`; inherited dependency audit findings are outside INF-275.

---## File Structure Lock

Create:

```text
src/js/features/wfaBooking/bookingManagementDirectoryQuery.js
src/js/features/wfaBooking/bookingDetailDrawerLifecycle.js
src/partials/table/booking-table-filter.html
src/partials/modal/booking-detail-drawer.html
```

Modify:

```text
src/management-booking.html
src/partials/table/table-booking.html
src/js/features/wfaBooking/bookingList.js
src/js/features/wfaBooking/bookingList.contract.js
src/js/features/wfaBooking/bookingRejection.js   # only if review/drawer integration requires event context
src/js/services/bookingService.js
src/js/index.js
```

Focused tests should live under `tests/` using the existing Node `node:test` style. Prefer adding booking-specific tests rather than widening Attendance/User tests unless a shared primitive actually changes.

`bookingList.js` is currently large; new pure request/filter and drawer/map concerns must not be added inline when they can live in the focused modules above.

---

### Task 0: Reconfirm the isolated baseline

**Files:**

- Read only: repository and existing WFA tests

**Interfaces:**

- Consumes: current isolated worktree at `b6156e1` + spec commit `cfb0ce8`
- Produces: fresh baseline evidence before implementation
- [ ] **Step 1: Confirm branch, HEAD, and clean status**

```powershell
git branch --show-current
git status --short
git log -3 --oneline
```

Expected: branch `feature/inf-275-management-booking-redesign`; no implementation changes before Task 1.

- [ ] **Step 2: Run the inherited focused WFA gate**

```powershell
node --test tests/wfa-booking-contract.test.js tests/wfa-booking-rejection.test.js tests/wfa-page-shell.test.js
```

Expected: 25 tests pass, 0 fail, matching the planning baseline.

- [ ] **Step 3: Run production build**

```powershell
npm run build
```

Expected: exit code 0.

- [ ] **Step 4: Record full-suite baseline for later comparison**

```powershell
node --test
```

Expected: record exact pass/fail counts. Do not fix unrelated inherited failures in INF-275; stop only if a failure is in current WFA Booking behavior that blocks a trustworthy baseline.

---

### Task 1: Define the canonical Management Booking query contract

**Files:**

- Create: `src/js/features/wfaBooking/bookingManagementDirectoryQuery.js`
- Create: `tests/booking-management-directory-query.test.js`

**Interfaces:**

- Produces: `DEFAULT_BOOKING_MANAGEMENT_QUERY`, `BOOKING_MANAGEMENT_PAGE_SIZES`, `validateBookingManagementDateRange(filters)`, `toBookingManagementRequestParams(state)`
- Consumes later: `bookingList.js`, `bookingService.js`, filter state tests
- [ ] **Step 1: Write failing query contract tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BOOKING_MANAGEMENT_QUERY,
  validateBookingManagementDateRange,
  toBookingManagementRequestParams,
} from "../src/js/features/wfaBooking/bookingManagementDirectoryQuery.js";

test("maps only canonical INF-274 list parameters", () => {
  const params = toBookingManagementRequestParams({
    page: 2,
    limit: 25,
    search: " Andi ",
    appliedFilters: {
      status: "pending",
      dateFrom: "2026-08-11",
      dateTo: "2026-08-20",
    },
  });
  assert.deepEqual(params, {
    page: 2,
    limit: 25,
    search: "Andi",
    status: "pending",
    date_from: "2026-08-11",
    date_to: "2026-08-20",
  });
  assert.equal("sortBy" in params, false);
  assert.equal("sortOrder" in params, false);
});
```

Add tests for defaults, valid `pending/approved/rejected`, omitted empty filters, one-sided `dateFrom` or `dateTo`, reversed two-sided ranges, invalid date-only values, and a fresh nested `appliedFilters` object.

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test tests/booking-management-directory-query.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure query module**

```js
export const BOOKING_MANAGEMENT_PAGE_SIZES = Object.freeze([10, 25, 50, 100]);
export const BOOKING_MANAGEMENT_STATUSES = Object.freeze([
  "pending",
  "approved",
  "rejected",
]);
export const DEFAULT_BOOKING_MANAGEMENT_QUERY = Object.freeze({
  page: 1,
  limit: 10,
  search: "",
  appliedFilters: Object.freeze({
    status: "",
    dateFrom: "",
    dateTo: "",
  }),
});
```

Implement strict `YYYY-MM-DD` validation using UTC round-trip validation. `validateBookingManagementDateRange()` permits both dates empty and permits a valid one-sided lower or upper bound because INF-274 accepts `date_from` and `date_to` independently; when both are present, reject `dateFrom > dateTo`. `toBookingManagementRequestParams()` must map camelCase filter state to Backend `date_from` / `date_to` and never emit sort keys.

- [ ] **Step 4: Run query tests and confirm GREEN**

```powershell
node --test tests/booking-management-directory-query.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/js/features/wfaBooking/bookingManagementDirectoryQuery.js tests/booking-management-directory-query.test.js
git commit -m "feat(INF-275): define booking management query contract"
```

---

### Task 2: Align the booking row and pagination normalizer with INF-274

**Files:**

- Modify: `src/js/features/wfaBooking/bookingList.contract.js`
- Modify: `tests/wfa-booking-contract.test.js`
- Create: `tests/booking-management-normalization.test.js`

**Interfaces:**

- Consumes: INF-274 list response projection
- Produces: `normalizeBooking(raw)`, `extractBookingCollection(response)`, normalized `processedBy`, nested reasons, truthful pagination metadata
- [ ] **Step 1: Extend failing normalization tests**

Use an INF-274-shaped fixture:

```js
const backendRow = {
  booking_id: 42,
  user_full_name: "Andi Saputra",
  user_nip_nim: "EMP-007",
  user_email: "andi@example.com",
  user_position_name: "Backend Engineer",
  user_role_name: "Employee",
  schedule_date: "2026-08-12",
  created_at: "2026-08-10T02:00:00.000Z",
  status: "pending",
  request_reason: {
    id: 3,
    label: "Meeting klien",
    is_other: false,
    other_text: null,
  },
  rejection_reason: null,
  processed_by: null,
  suitability_score: 0,
  suitability_label: "Tidak Direkomendasikan",
};
```

Assert:

```js
const normalized = normalizeBooking(backendRow);
assert.equal(normalized.requestOtherReason, "");
assert.equal(normalized.processedBy, null);
assert.equal(normalized.suitability_score, 0);
```

Add rejected fixture assertions for `rejection_reason.note`, processed fixture assertions for `processed_by.id/full_name/role`, and legacy fallback assertions for `request_other_reason`, `rejection_note`, `location.radius`, and root `radius`.

Add pagination fixture:

```js
const response = {
  data: {
    bookings: [backendRow],
    pagination: {
      current_page: 2,
      total_pages: 4,
      total_records: 31,
      records_per_page: 10,
      has_next_page: true,
      has_prev_page: true,
    },
  },
};
```

The normalized collection must preserve `records_per_page` instead of silently depending on `per_page`.

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test tests/wfa-booking-contract.test.js tests/booking-management-normalization.test.js
```

Expected: FAIL on nested `other_text`, nested rejection note, `processed_by`, and/or pagination mapping before implementation.- [ ] **Step 3: Implement canonical nested mapping**

Update reason normalization so the canonical paths win:

```js
requestOtherReason = String(
  booking.request_reason?.other_text ??
    booking.request_other_reason ??
    booking.requestOtherReason ??
    "",
).trim();

rejectionNote = String(
  booking.rejection_reason?.note ??
    booking.rejection_note ??
    booking.rejectionNote ??
    "",
).trim();
```

Normalize `processed_by` to:

```js
processedBy: booking.processed_by
  ? {
      id: toNullableNumber(booking.processed_by.id),
      fullName: String(booking.processed_by.full_name ?? "").trim(),
      role: String(booking.processed_by.role ?? "").trim(),
    }
  : null,
```

Reason objects retain `id`, `label`, and `isOther` (`is_other` from Backend). Retain `approved_by` only as compatibility data. Preserve numeric zero for coordinates, radius, and suitability with nullish checks rather than `||`.

- [ ] **Step 4: Run normalization tests and confirm GREEN**

```powershell
node --test tests/wfa-booking-contract.test.js tests/booking-management-normalization.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/js/features/wfaBooking/bookingList.contract.js tests/wfa-booking-contract.test.js tests/booking-management-normalization.test.js
git commit -m "fix(INF-275): align booking projection with INF-274"
```

---

### Task 3: Make the booking service serialize only the canonical list query

**Files:**

- Modify: `src/js/services/bookingService.js`
- Create: `tests/booking-management-service.test.js`

**Interfaces:**

- Consumes: object produced by `toBookingManagementRequestParams()`
- Produces: `buildBookingsListUrl(baseUrl, params)` and service errors retaining `status`, `code`, and Backend `message`
- [ ] **Step 1: Write failing URL and error-preservation tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildBookingsListUrl } from "../src/js/services/bookingService.js";

test("serializes INF-274 management query and omits legacy sort", () => {
  const url = buildBookingsListUrl("/api", {
    page: 2,
    limit: 25,
    search: "Andi",
    status: "pending",
    date_from: "2026-08-11",
    date_to: "2026-08-20",
    sortBy: "schedule_date",
    sortOrder: "ASC",
  });
  assert.equal(
    url,
    "/api/bookings?page=2&limit=25&search=Andi&status=pending&date_from=2026-08-11&date_to=2026-08-20",
  );
});
```

Inject a request executor into a small list-service factory or expose the existing error normalizer so tests can prove Backend `response.data.code`, HTTP status, and message survive without relying on real Axios.

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test tests/booking-management-service.test.js
```

Expected: FAIL because canonical URL construction is not exported and date filters are not currently serialized.

- [ ] **Step 3: Implement pure list URL construction and structured errors**

Use an explicit allowlist:

```js
const BOOKING_LIST_QUERY_KEYS = [
  "page",
  "limit",
  "search",
  "status",
  "date_from",
  "date_to",
];
```

`buildBookingsListUrl(baseUrl, params)` appends only those keys when the value is not `undefined`, `null`, or `""`. `getBookings(params)` delegates URL construction to that helper. Do not append `sortBy` or `sortOrder` even if old callers pass them during the transition.

Reuse `createBookingServiceError()` for list failures, decision commands, and `deleteBooking()` so Task 9 can distinguish Backend 404 from other failures. The thrown error preserves:

```text
message
code
status
details
fieldErrors
```

- [ ] **Step 4: Run service and command regression tests**

```powershell
node --test tests/booking-management-service.test.js tests/wfa-booking-rejection.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/js/services/bookingService.js tests/booking-management-service.test.js
git commit -m "feat(INF-275): serialize management booking query"
```

---

### Task 4: Refactor `bookingListAlpineData` into truthful server-authored list state

**Files:**

- Modify: `src/js/features/wfaBooking/bookingList.js`
- Create: `tests/booking-management-list-state.test.js`

**Interfaces:**

- Consumes: `DEFAULT_BOOKING_MANAGEMENT_QUERY`, `toBookingManagementRequestParams`, `normalizeBooking`, `extractBookingCollection`, `getBookings`
- Produces: `appliedQuery`, `draftFilters`, `tableState`, canonical paging/search/filter methods used by table/filter partials
- [ ] **Step 1: Write failing list-state tests with injected services**

Refactor the factory signature to `bookingListAlpineData(overrides = {})` and test it without DOM globals. Resolve dependencies once at factory construction: `requestBookings = overrides.getBookings || getBookings`, `approveCommand = overrides.approveBooking || approveBookingCommand`, `deleteCommand = overrides.deleteBooking || deleteBooking`, and `notify = overrides.notify || ((payload) => globalThis.window?.showInlineAlert?.(payload))`.

```js
test("newest list response wins and previous successful rows survive refresh failure", async () => {
  const pending = [];
  const state = bookingListAlpineData({
    getBookings: () =>
      new Promise((resolve, reject) => pending.push({ resolve, reject })),
  });

  const first = state.fetchBookings();
  state.appliedQuery.search = "baru";
  const second = state.fetchBookings();

  pending[1].resolve({
    data: {
      bookings: [{ booking_id: 2 }],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_records: 1,
        records_per_page: 10,
      },
    },
  });
  await second;
  pending[0].resolve({
    data: {
      bookings: [{ booking_id: 1 }],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_records: 1,
        records_per_page: 10,
      },
    },
  });
  await first;

  assert.equal(state.bookings[0].id, 2);
});
```

Add tests proving:

- initial state contains no `sortBy`, `sortOrder`, `sortFieldMap`, `changeSort`, or sort icon API;
- search debounce resets page to 1 and requests once;
- `changePage()` preserves search and applied filters;
- `changeLimit()` resets page to 1;
- Backend `records_per_page` becomes canonical `pagination.per_page`/`items_per_page` compatibility aliases only at presentation boundary;
- a failed refresh after a successful page leaves `bookings` untouched and sets `tableState.error`;
- stale success and stale failure cannot replace the newest request state.

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test tests/booking-management-list-state.test.js
```

Expected: FAIL against the legacy filter/sort/loading state.

- [ ] **Step 3: Implement the canonical list state**

Use this shape:

```js
appliedQuery: {
  page: 1,
  limit: 10,
  search: "",
  appliedFilters: { status: "", dateFrom: "", dateTo: "" },
},
draftFilters: { status: "", dateFrom: "", dateTo: "" },
tableState: { loading: false, error: "", hasSuccessfulPage: false },
latestListRequestId: 0,
```

`fetchBookings()` must call:

```js
const requestId = ++this.latestListRequestId;
const response = await requestBookings(
  toBookingManagementRequestParams(this.appliedQuery),
);
if (requestId !== this.latestListRequestId) return;
```

Map pagination from Backend `current_page`, `total_pages`, `total_records`, `records_per_page`, `has_next_page`, and `has_prev_page`. Keep old aliases only where existing template code temporarily requires them during staged implementation.

Remove legacy public sort state and methods rather than leaving dead compatibility behavior in the new component.

- [ ] **Step 4: Run state, query, service, and normalization tests**

```powershell
node --test tests/booking-management-list-state.test.js tests/booking-management-directory-query.test.js tests/booking-management-service.test.js tests/wfa-booking-contract.test.js tests/booking-management-normalization.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/js/features/wfaBooking/bookingList.js tests/booking-management-list-state.test.js
git commit -m "refactor(INF-275): stabilize booking list state"
```

---

### Task 5: Add the combined Booking filter and truthful toolbar

**Files:**

- Create: `src/partials/table/booking-table-filter.html`
- Modify: `src/management-booking.html`
- Modify: `src/js/features/wfaBooking/bookingList.js`
- Create: `tests/booking-management-filter.test.js`

**Interfaces:**

- Consumes: `draftFilters`, `appliedQuery.appliedFilters`, `validateBookingManagementDateRange()`
- Produces: `openFilter()`, `closeFilter()`, `applyFilters()`, `clearFilters()`, `activeFilterCount`, `filterValidationMessage`
- [ ] **Step 1: Write failing filter state/template tests**

State assertions:

```js
test("editing filter draft does not fetch until Apply", async () => {
  let calls = 0;
  const state = bookingListAlpineData({
    getBookings: async () => {
      calls += 1;
      return { data: { bookings: [], pagination: {} } };
    },
  });

  state.draftFilters.status = "pending";
  state.draftFilters.dateFrom = "2026-08-11";
  state.draftFilters.dateTo = "2026-08-20";
  assert.equal(calls, 0);

  await state.applyFilters();
  assert.equal(calls, 1);
  assert.equal(state.appliedQuery.page, 1);
  assert.equal(state.appliedQuery.appliedFilters.status, "pending");
});
```

Template assertions must prove the partial has:

```text
:aria-expanded="isFilterOpen"
aria-controls="bookingTableFilterPopover"
@click.outside="closeFilter()"
@keydown.escape.window="closeFilter()"
x-model="draftFilters.status"
x-model="draftFilters.dateFrom"
x-model="draftFilters.dateTo"
@click="applyFilters()"
@click="clearFilters()"
activeFilterCount
```

Assert the page/table exposes exactly one search input with placeholder `Cari nama atau NIP/NIM...` and no inline legacy Status select.

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test tests/booking-management-filter.test.js tests/booking-management-list-state.test.js
```

Expected: FAIL because the combined Booking filter does not exist.

- [ ] **Step 3: Implement filter behavior and toolbar composition**

Follow the current Attendance filter shell. A successful Apply must:

```js
const validation = validateBookingManagementDateRange(this.draftFilters);
if (!validation.valid) {
  this.filterValidationMessage = validation.message;
  return false;
}
this.appliedQuery.appliedFilters = { ...this.draftFilters };
this.appliedQuery.page = 1;
await this.fetchBookings();
this.closeFilter();
return true;
```

`clearFilters()` resets only `status`, `dateFrom`, and `dateTo`, resets page to 1, and fetches once. `activeFilterCount` counts status as one and any applied date criterion (`dateFrom`, `dateTo`, or both) as one date filter group.

Move page size to the table pagination band. Search stays visible in the table toolbar and uses the existing debounce after being rewired to `appliedQuery.search`.

- [ ] **Step 4: Run filter/list tests and confirm GREEN**

```powershell
node --test tests/booking-management-filter.test.js tests/booking-management-list-state.test.js tests/booking-management-directory-query.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/management-booking.html src/partials/table/booking-table-filter.html src/js/features/wfaBooking/bookingList.js tests/booking-management-filter.test.js
git commit -m "feat(INF-275): add booking queue filters"
```

---

### Task 6: Replace the legacy Booking table with the locked eight-column approval queue

**Files:**

- Modify: `src/partials/table/table-booking.html`
- Modify: `src/js/features/wfaBooking/bookingList.js`
- Create: `tests/booking-management-table.test.js`

**Interfaces:**

- Consumes: normalized booking row and canonical pagination/list state
- Produces: `openBookingDetail(booking)`, compact presentation helpers, Review/Detail and overflow entry points
- [ ] **Step 1: Write failing table contract tests**

Assert exactly these headers:

```js
for (const label of [
  "Pemohon",
  "Jadwal WFA",
  "Diajukan",
  "Alasan",
  "Lokasi",
  "Kelayakan",
  "Status",
  "Aksi",
]) {
  assert.match(table, new RegExp(`>\\s*${label}\\s*<`));
}
```

Also assert:

- no `ID`, `Position`, `Notes`, or `Koordinat` header;
- no `changeSort`, `getSortIcon`, `aria-sort`, or sort arrow markup;
- no location `View` button or direct map action;
- location cell uses `line-clamp-2` and a bounded width;
- suitability does not contain the legacy progress-bar width binding;
- pending rows expose Review; processed rows expose Detail;
- destructive delete is secondary/overflow, not a dominant always-visible primary action;
- `schedule_date` and `created_at` are rendered in different cells;
- `0` suitability can render `0.00 / 100` while `null` renders unavailable.

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test tests/booking-management-table.test.js
```

Expected: FAIL on the current nine-column sortable table.

- [ ] **Step 3: Implement the eight-column table using shared admin visual tokens**

Use the Attendance table shell (`rounded-2xl`, `border-gray-200`, `dark:bg-white/[0.03]`, shared header typography, horizontal scrollbar, and pagination rhythm) without copying Attendance business fields.

Pemohon renders initials, name, then `NIP/NIM Â· Position`. Location is text-only. Kelayakan uses label + formatted score text. Keep status text-carrying badge behavior.
Use a dedicated action control pattern:

```text
pending    â†’ Review + overflow
approved   â†’ Detail + overflow
rejected   â†’ Detail + overflow
```

Opening Review/Detail calls `openBookingDetail(booking)` only. It must never call approve/reject.

Pagination uses canonical Backend totals and page-size state. Keep the previous successful table visible during refresh and show a retry banner when `tableState.error` is set after prior success.

- [ ] **Step 4: Run table/list/filter tests and confirm GREEN**

```powershell
node --test tests/booking-management-table.test.js tests/booking-management-list-state.test.js tests/booking-management-filter.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/partials/table/table-booking.html src/js/features/wfaBooking/bookingList.js tests/booking-management-table.test.js
git commit -m "feat(INF-275): redesign management booking table"
```

---

### Task 7: Add the right-side Booking review/detail drawer and map lifecycle

**Files:**

- Create: `src/js/features/wfaBooking/bookingDetailDrawerLifecycle.js`
- Create: `src/partials/modal/booking-detail-drawer.html`
- Modify: `src/js/features/wfaBooking/bookingList.js`
- Modify: `src/management-booking.html`
- Modify: `src/js/index.js`
- Create: `tests/booking-detail-drawer-lifecycle.test.js`
- Create: `tests/booking-detail-drawer-template.test.js`
- Read/regression-test only: `src/js/components/modal/mapDetailModal.js` (existing container-scoped implementation should remain unchanged)

**Interfaces:**

- Consumes: one normalized booking row; existing `MapDetailModal`; existing `createFocusTrap`
- Produces: `createBookingDetailDrawerLifecycle({ mapAdapter })`, `openBookingDetail(booking)`, `closeBookingDetail()`, `handleBookingDrawerTab(event)`
- [ ] **Step 1: Write failing lifecycle tests**

```js
test("drawer owns map only when coordinates are finite", () => {
  const calls = [];
  const lifecycle = createBookingDetailDrawerLifecycle({
    mapAdapter: {
      initialize: (location) => calls.push(["init", location]),
      destroy: () => calls.push(["destroy"]),
    },
  });

  lifecycle.open({
    employee_name: "Andi",
    location_latitude: 0,
    location_longitude: 119.8,
    radiusSnapshot: null,
    location_name: "Palu",
  });

  assert.equal(lifecycle.isOpen, true);
  assert.equal(calls[0][0], "init");
  lifecycle.close();
  assert.deepEqual(calls.at(-1), ["destroy"]);
});
```

Add tests for missing coordinates, repeated open replacing/destroying old map work, idempotent close, and `processedBy = null` remaining null rather than being inferred from `approved_by`.

- [ ] **Step 2: Write failing drawer template/page composition tests**

Assert `role="dialog"`, `aria-modal="true"`, title/description IDs, Escape close, Tab focus handler, accessible close button, and sections:

```text
Pemohon
Pengajuan WFA
Lokasi
Kelayakan
Keputusan
```

Assert the page includes `booking-detail-drawer.html` and no longer includes `booking-map-modal.html`. Assert exactly one `bookingDetailMapContainer` with `data-location-map` exists.

- [ ] **Step 3: Run and confirm RED**

```powershell
node --test tests/booking-detail-drawer-lifecycle.test.js tests/booking-detail-drawer-template.test.js
```

Expected: FAIL because the canonical Booking drawer does not exist.

- [ ] **Step 4: Implement the lifecycle and register a Booking-scoped map instance**

Reuse the already container-scoped `MapDetailModal`; do not duplicate Leaflet code. Register:

```js
window.bookingDetailMap = new MapDetailModal("bookingDetailMapContainer");
```

`bookingDetailDrawerLifecycle.js` owns `isOpen`, `selectedBooking`, and whether it owns map work. `bookingListAlpineData` exposes `drawerState: { open: false, selectedBooking: null }` as the Alpine presentation mirror used by the template and decision tasks. It initializes the injected map adapter only when both coordinates are finite and destroys owned work on replace/close.

In `bookingListAlpineData`, `openBookingDetail(booking)` records `document.activeElement` implicitly through the existing `createFocusTrap` flow, sets drawer state open, and inside `$nextTick()`:

```js
bookingDrawerLifecycle.open(booking);
bookingDrawerFocusTrap = createFocusTrap(this.$refs.bookingDetailDrawerPanel);
bookingDrawerFocusTrap.activate();
```

After lifecycle open, synchronize `drawerState.open = lifecycle.isOpen` and `drawerState.selectedBooking = lifecycle.selectedBooking`. `closeBookingDetail()` closes lifecycle, sets `drawerState` back to `{ open: false, selectedBooking: null }`, deactivates the focus trap, and restores focus through the existing trap. `handleBookingDrawerTab(event)` delegates to `focusTrap.handleKeydown(event)`.

- [ ] **Step 5: Implement the drawer partial**

Render full normalized row data only; no network request. Pending footer renders Approve and Reject actions. Processed bookings render decision metadata; rejected bookings additionally render rejection reason/note.

Location block rules:

```text
finite lat + lng â†’ description + coordinates + optional radius + map
missing coordinate â†’ full description when present + explicit â€œKoordinat lokasi tidak tersedia.â€ + no map
missing radius â†’ omit radius value; never show 100 m fallback unless the normalizer received an allowed legacy radius
```

For `processedBy = null`, show `Pelaku pemrosesan tidak tersedia` (or equivalent truthful copy), never a fabricated admin name.

- [ ] **Step 6: Remove the legacy booking map modal from page composition**

Remove `<include src="./partials/modal/booking-map-modal.html">` from `management-booking.html`. Do not delete shared/global legacy files in this task unless repository search proves no other consumer exists; removing composition is sufficient for INF-275.

- [ ] **Step 7: Run drawer, map, focus, and existing WFA tests**

```powershell
node --test tests/booking-detail-drawer-lifecycle.test.js tests/booking-detail-drawer-template.test.js tests/focus-trap.test.js tests/map-detail-modal-truthfulness.test.js tests/wfa-booking-contract.test.js tests/wfa-page-shell.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/js/features/wfaBooking/bookingDetailDrawerLifecycle.js src/js/features/wfaBooking/bookingList.js src/partials/modal/booking-detail-drawer.html src/management-booking.html src/js/index.js tests/booking-detail-drawer-lifecycle.test.js tests/booking-detail-drawer-template.test.js
git commit -m "feat(INF-275): add booking review drawer"
```

---

### Task 8: Move approval/rejection decisions into the review context

**Files:**

- Modify: `src/js/features/wfaBooking/bookingList.js`
- Modify: `src/partials/modal/booking-detail-drawer.html`
- Read only: `src/js/features/wfaBooking/bookingRejection.js` (existing open/succeeded events are sufficient; do not duplicate or modify the rejection transaction)
- Modify: `tests/wfa-booking-rejection.test.js`
- Create: `tests/booking-management-decision-state.test.js`

**Interfaces:**

- Consumes: existing `approveBooking(bookingId)`, `WFA_BOOKING_REJECTION_EVENTS.open`, `WFA_BOOKING_REJECTION_EVENTS.succeeded`
- Produces: `decisionState.approvingId`, guarded `approveSelectedBooking()`, `openRejectBooking(selectedBooking)`, one authoritative list refresh after success

- [ ] **Step 1: Write failing approval busy-state tests**

```js
test("duplicate approval is blocked and failure keeps review context", async () => {
  let resolveApproval;
  let calls = 0;
  const state = bookingListAlpineData({
    approveBooking: () => {
      calls += 1;
      return new Promise((resolve) => {
        resolveApproval = resolve;
      });
    },
    getBookings: async () => ({ data: { bookings: [], pagination: {} } }),
  });

  state.drawerState.selectedBooking = { id: 42, status: "pending" };
  const first = state.approveSelectedBooking();
  const second = state.approveSelectedBooking();
  assert.equal(calls, 1);
  await second;
  resolveApproval({ success: true });
  await first;
});
```

Add a failure case proving the drawer remains open/selected and no success status is synthesized locally.

- [ ] **Step 2: Write failing rejection integration tests**

Prove that Review â†’ Reject dispatches the existing open event and does not mutate immediately. On `wfa-booking-rejection:succeeded`, the list coordinator must:

```text
close/reset the matching review drawer
refresh the active query exactly once
show success feedback once
```

The rejection modal remains owner of reason loading, Other-note validation, submit busy state, and Backend mutation.

- [ ] **Step 3: Run and confirm RED**

```powershell
node --test tests/booking-management-decision-state.test.js tests/wfa-booking-rejection.test.js
```

Expected: FAIL on missing drawer-owned approval state and review-context assertions.

- [ ] **Step 4: Implement decision state without duplicating rejection logic**

Add:

```js
decisionState: {
  approvingId: null,
  approvalError: "",
},
```

`approveSelectedBooking()` may run only for a selected pending booking and only when `approvingId === null`. It calls the explicit service command once, then on confirmed success closes the drawer and calls `fetchBookings()` once. On failure it clears busy state, stores/shows the error, and keeps the review context open.

`openRejectBooking(booking)` remains a pure event dispatch to INF-271. Do not copy reason catalog state into `bookingList.js`.

`handleRejectionSucceeded(eventDetail)` closes the matching review drawer if open and performs exactly one authoritative `fetchBookings()` using unchanged applied query.

- [ ] **Step 5: Run decision/rejection regression tests**

```powershell
node --test tests/booking-management-decision-state.test.js tests/wfa-booking-rejection.test.js tests/wfa-page-shell.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/js/features/wfaBooking/bookingList.js src/partials/modal/booking-detail-drawer.html tests/booking-management-decision-state.test.js tests/wfa-booking-rejection.test.js
git commit -m "feat(INF-275): move booking decisions into review context"
```

---

### Task 9: Make permanent delete a secondary authoritative transaction

**Files:**

- Modify: `src/js/features/wfaBooking/bookingList.js`
- Modify: `src/partials/table/table-booking.html`
- Modify: `src/partials/modal/booking-detail-drawer.html`
- Create: `tests/booking-management-delete.test.js`

**Interfaces:**

- Consumes: structured delete errors from `bookingService`, active `appliedQuery`, canonical pagination
- Produces: `deleteState`, `confirmDelete(booking)`, guarded `executeDelete()`, trailing-page recovery
- [ ] **Step 1: Write failing delete recovery tests**

Cover duplicate-submit protection, active-query preservation, 404 recovery, and trailing-page recovery.

```js
test("deleting the only row on a trailing page refetches the previous page", async () => {
  const requests = [];
  const state = bookingListAlpineData({
    deleteBooking: async () => ({ success: true }),
    getBookings: async (params) => {
      requests.push(params);
      return {
        data: {
          bookings: [],
          pagination: {
            current_page: 2,
            total_pages: 2,
            total_records: 20,
            records_per_page: 10,
          },
        },
      };
    },
  });

  state.appliedQuery.page = 3;
  state.bookings = [
    { id: 99, employee_name: "Andi", schedule_date: "2026-08-15" },
  ];
  state.pagination.total_records = 21;
  state.deleteState.record = state.bookings[0];
  await state.executeDelete();

  assert.equal(state.appliedQuery.page, 2);
  assert.equal(requests[0].page, 2);
});
```

For a service error with `status === 404`, assert warning feedback plus refetch of unchanged active criteria. For other failures, assert rows remain untouched and delete context can be retried.

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test tests/booking-management-delete.test.js
```

Expected: FAIL against the current ID-only delete state.

- [ ] **Step 3: Implement delete transaction state**

Use:

```js
deleteState: {
  record: null,
  submitting: false,
  error: "",
},
```

`confirmDelete(booking)` stores the whole normalized record so the confirmation can show applicant and scheduled date. `executeDelete()` returns immediately when already submitting.

After confirmed success:

1. compute whether current page would become empty using the pre-delete row count and canonical total;
2. decrement `appliedQuery.page` only when on a page greater than 1 and deleting the final visible row;
3. close/reset any drawer that owns the deleted booking;
4. call `fetchBookings()` exactly once.

Do not `splice()` the table as authoritative final state.

For 404, notify that the booking is already unavailable and refetch. Other errors preserve rows and expose retry-safe failure state.

- [ ] **Step 4: Render delete only as secondary UI**

The table action overflow and optional drawer footer may open delete confirmation. Permanent delete must not sit beside Review/Detail as an equally prominent always-visible primary button.

Confirmation copy must include:

```text
<employee name>
Jadwal WFA: <formatted schedule_date>
Tindakan ini permanen dan tidak dapat dipulihkan.
```

Do not ask for a delete reason.

- [ ] **Step 5: Run delete/list/table tests**

```powershell
node --test tests/booking-management-delete.test.js tests/booking-management-list-state.test.js tests/booking-management-table.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/js/features/wfaBooking/bookingList.js src/partials/table/table-booking.html src/partials/modal/booking-detail-drawer.html tests/booking-management-delete.test.js
git commit -m "feat(INF-275): harden booking delete recovery"
```

---

### Task 10: Lock page composition, accessibility, responsive behavior, and regression coverage

**Files:**

- Create: `tests/booking-management-page-contract.test.js`
- Modify only when an assertion exposes a real defect: INF-275 files from Tasks 1-9

**Interfaces:**

- Consumes: completed Management Booking page
- Produces: final static contract coverage before runtime verification
- [ ] **Step 1: Write the final page-composition test**

Assert:

- one Management Booking search input with truthful placeholder;
- one `booking-table-filter.html` include;
- one `table-booking.html` include;
- one `booking-detail-drawer.html` include;
- one existing WFA rejection modal include;
- no booking map modal include;
- no KPI cards, charts, FAHP panel, export controls, or live-map surface;
- table wrapper uses horizontal overflow and dark-mode tokens aligned with current admin screens;
- filter has narrow fixed/full-width-safe classes;
- drawer uses full-width small-screen behavior and bounded desktop max width;
- every icon-only control has an accessible label;
- filter and drawer expose Escape/focus contracts;
- textual status/suitability/unavailable states exist so color is not the only signal.

Example:

```js
assert.match(page, /booking-detail-drawer\.html/);
assert.doesNotMatch(page, /booking-map-modal\.html/);
assert.match(filter, /:aria-expanded="isFilterOpen"/);
assert.match(drawer, /role="dialog"/);
assert.match(drawer, /aria-modal="true"/);
assert.match(drawer, /@keydown\.tab="handleBookingDrawerTab\(\$event\)"/);
```

- [ ] **Step 2: Run and fix only real INF-275 defects**

```powershell
node --test tests/booking-management-page-contract.test.js
```

Expected: PASS after minimal corrections. Do not broaden changes into a generic admin component rewrite.

- [ ] **Step 3: Run the complete focused Booking gate**

```powershell
node --test tests/wfa-booking-contract.test.js tests/wfa-booking-rejection.test.js tests/wfa-page-shell.test.js tests/booking-management-directory-query.test.js tests/booking-management-normalization.test.js tests/booking-management-service.test.js tests/booking-management-list-state.test.js tests/booking-management-filter.test.js tests/booking-management-table.test.js tests/booking-detail-drawer-lifecycle.test.js tests/booking-detail-drawer-template.test.js tests/booking-management-decision-state.test.js tests/booking-management-delete.test.js tests/booking-management-page-contract.test.js tests/focus-trap.test.js tests/map-detail-modal-truthfulness.test.js
```

Expected: all focused tests PASS.

- [ ] **Step 4: Commit final contract coverage**

```powershell
git add tests/booking-management-page-contract.test.js src/management-booking.html src/partials/table src/partials/modal src/js/features/wfaBooking src/js/services/bookingService.js src/js/index.js
git commit -m "test(INF-275): lock management booking redesign contracts"
```

---

### Task 11: Final verification and runtime evidence gate

**Files:**

- Modify only for formatting or verified defects: files changed by Tasks 1-10
- Evidence: PR description/screenshots or repository evidence path if the team uses one

**Interfaces:**

- Consumes: completed INF-275 branch
- Produces: merge-ready verification evidence; runtime gaps remain explicitly `Needs Verification`
- [ ] **Step 1: Format touched files**

Use the exact touched file list from:

```powershell
git diff --name-only origin/develop...HEAD
```

Run `npx prettier --write` only on touched `.js`, `.html`, and `.md` files. Do not reformat unrelated repository files.

- [ ] **Step 2: Re-run the complete focused Booking gate**

Run the exact focused `node --test` command from Task 10.

Expected: PASS with zero focused failures.

- [ ] **Step 3: Run repository formatting/lint check and production build**

```powershell
npm run lint
npm run build
```

Expected: both exit 0. If `npm run lint` exposes inherited unrelated formatting drift, distinguish it from files changed by INF-275 and do not mass-format unrelated code.

- [ ] **Step 4: Compare full suite to Task 0 baseline**

```powershell
node --test
```

Expected: no new failures relative to Task 0. Any inherited unrelated failures must be reported with exact counts and names rather than represented as green.

- [ ] **Step 5: Check patch hygiene and branch scope**

```powershell
git diff --check origin/develop...HEAD
git status --short
git diff --stat origin/develop...HEAD
git log --oneline origin/develop..HEAD
```

Expected: only INF-275 Web FE code/tests/docs; worktree clean after any final verification commit.

- [ ] **Step 6: Run authenticated runtime verification when INF-274 is available**

```powershell
npm run start
```

Verify with Admin/Management access on desktop and narrow viewport:

```text
initial approval-first list
server-side name/NIP search
status filter Apply/Clear
schedule-date range Apply/Clear
page size and pagination
Review pending booking without mutation
full location only in drawer
map with valid coordinates and unavailable state without them
null suitability vs numeric zero
approve success/failure and duplicate guard
required-reason rejection and Other-note validation
processed_by display on processed rows
rejected reason/note display
permanent delete, 404 recovery, trailing-page recovery
Escape, focus trap/restoration, dark mode, narrow layout
```

Capture desktop and narrow screenshots/recording. If target Backend does not yet contain INF-274, record these paths as `Needs Verification`; do not use mock data as runtime proof.

- [ ] **Step 7: Commit verification-only corrections if any**

If formatting or verified defects changed files after Task 10:

```powershell
git add src/management-booking.html src/partials/table/table-booking.html src/partials/table/booking-table-filter.html src/partials/modal/booking-detail-drawer.html src/js/features/wfaBooking src/js/services/bookingService.js src/js/index.js tests/booking-management-*.test.js tests/booking-detail-drawer-*.test.js tests/wfa-booking-contract.test.js tests/wfa-booking-rejection.test.js tests/wfa-page-shell.test.js docs/superpowers/specs/2026-08-10-inf-275-management-booking-redesign-design.md docs/superpowers/plans/2026-08-10-inf-275-management-booking-redesign.md
git commit -m "chore(INF-275): finalize management booking verification"
```

Skip this commit when verification leaves the tree unchanged.

## Definition of Done for this plan

INF-275 is implementation-complete only when:

```text
focused Booking tests pass
npm run lint has no INF-275 formatting failure
npm run build passes
full suite introduces no new failure versus baseline
git diff --check is clean
branch scope is bounded to INF-275
Management Booking consumes INF-274 truthfully
no client-side sort/filter/pagination authority is introduced
no fabricated booking/location/scoring/decision data exists
approve/reject/delete duplicate submissions are guarded
old booking map modal is absent from Management Booking composition
```

Linear **Done** additionally requires authenticated runtime evidence against a Backend containing INF-274. A merged PR without that evidence is not sufficient if the acceptance criteria remain unverified.

## Docs / ADR update note

The implementation is expected to require **no new ADR** because it preserves existing multi-page Alpine, service/API, auth/RBAC, and source-of-truth boundaries. Update the spec/plan only if implementation discovers a contract decision that changes the approved design. If a shared component boundary is changed architecture-wide, mark `DOCS/ADR UPDATE REQUIRED` and stop to review that widening before proceeding.
