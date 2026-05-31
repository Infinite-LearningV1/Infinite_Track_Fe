# Admin Table Standardization Dashboard-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin table search/pagination strategy explicit across Web FE and refactor Dashboard to use one canonical server-driven table contract end-to-end.

**Architecture:** This plan implements `INF-124` by declaring an explicit search/pagination strategy in each active admin table module, then implements `INF-109` by removing Dashboard’s hybrid local/server table state and keeping one canonical request/response contract. The Dashboard table becomes the reference implementation: request state lives in `filters`, response pagination lives in `pagination`, and rendered rows live in `reportData`.

**Tech Stack:** Alpine.js, webpack, axios, Tailwind CSS, plain JavaScript modules

---

## File structure and responsibilities

- `src/js/features/dashboard/dashboard.js`
  - Dashboard page state, request state, table row mapping, pagination state, search handlers, and dashboard-level summary/export behavior.
  - This is the primary implementation file for `INF-109`.

- `src/partials/table/table-dashboard-report.html`
  - Active Dashboard table partial. It should render from canonical Dashboard state only.
  - This file should only change if a binding still points to removed legacy Dashboard state.

- `src/js/features/attendance/attendanceLog.js`
  - Existing server-driven reference for Attendance table behavior.
  - Will receive a brief strategy comment only if needed to make the standard explicit in code.

- `src/js/features/wfaBooking/bookingList.js`
  - Existing server-driven reference for Booking table behavior.
  - Will receive a brief strategy comment only if needed to make the standard explicit in code.

- `src/js/features/userManagement/userListSimple.js`
  - Existing client-driven reference for User table behavior.
  - Will receive a brief strategy comment only if needed to make the standard explicit in code.

## Verification model for this repo

This repository does not currently define an automated frontend test runner in `package.json`. For this phase, verification uses:

- `npm run build` for syntax/module/bundling validation
- manual browser verification on the Dashboard page for search, page-size changes, and pagination behavior

The implementation should stay small and local so these checks are sufficient for this execution phase.

---

### Task 1: Declare explicit table strategy in code

**Files:**

- Modify: `src/js/features/dashboard/dashboard.js`
- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `src/js/features/wfaBooking/bookingList.js`
- Modify: `src/js/features/userManagement/userListSimple.js`

- [ ] **Step 1: Add a Dashboard strategy comment that declares it server-driven**

Add a concise comment near the Dashboard state section that makes the table contract explicit.

```js
// Dashboard table strategy: server-driven.
// Request state lives in `filters`, server pagination lives in `pagination`,
// and rendered rows live in `reportData`. Do not add a second local
// search/pagination model for the active table path.
```

- [ ] **Step 2: Add an Attendance strategy comment that declares it server-driven**

Place a short comment near the Attendance state section.

```js
// Attendance table strategy: server-driven.
// Search, sort, page, and limit changes update request state in `filters`
// and reload data from the API.
```

- [ ] **Step 3: Add a Booking strategy comment that declares it server-driven**

Place a short comment near the Booking state section.

```js
// Booking table strategy: server-driven.
// Request state lives in `filters`, response pagination lives in `pagination`,
// and rendered rows come from the latest booking fetch response.
```

- [ ] **Step 4: Add a User strategy comment that declares it client-driven**

Place a short comment near the User state section.

```js
// User table strategy: client-driven.
// Users are fetched once, then search and pagination are computed locally
// from `users`, `filteredUsers`, and `paginatedUsers`.
```

- [ ] **Step 5: Run build to verify the comment-only pass is clean**

Run: `npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build`
Expected: webpack production build completes successfully with no syntax errors.

- [ ] **Step 6: Commit the strategy declaration pass**

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add src/js/features/dashboard/dashboard.js src/js/features/attendance/attendanceLog.js src/js/features/wfaBooking/bookingList.js src/js/features/userManagement/userListSimple.js
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "refactor: declare admin table strategy contracts"
```

---

### Task 2: Remove duplicate Dashboard table state and keep one canonical contract

**Files:**

- Modify: `src/js/features/dashboard/dashboard.js`

- [ ] **Step 1: Remove duplicate Dashboard pagination declaration**

Keep one canonical `pagination` object near the top-level state and remove the duplicate placeholder declaration later in the file.

Keep this shape:

```js
pagination: {
  current_page: 1,
  total_pages: 1,
  total_records: 0,
  has_prev_page: false,
  has_next_page: false,
  per_page: 5,
},
```

Remove duplicate/placeholder variants like this:

```js
pagination: {
  current_page: 1,
  total_pages: 1,
  per_page: 10,
  total: 0,
},
```

- [ ] **Step 2: Add `search` to the canonical Dashboard request state**

Update the canonical `filters` object so all request-driving inputs live in one place.

```js
filters: {
  period: "all",
  page: 1,
  limit: 5,
  search: "",
},
```

- [ ] **Step 3: Remove local Dashboard table-state families that should no longer drive the active table path**

Delete the local/hybrid table-state properties that create a second model.

Remove these state entries:

```js
searchQuery: "",
searchTimeout: null,
entriesPerPage: 5,
currentPage: 1,
```

Then re-add only the UI input and debounce state you still need without reviving a second table model:

```js
searchQuery: "",
searchTimeout: null,
```

Do **not** re-add `entriesPerPage` or `currentPage`.

- [ ] **Step 4: Remove local computed helpers that model Dashboard rows/pages outside the server response**

Delete these Dashboard-only local helpers entirely:

```js
get filteredAttendanceData() { ... }
get paginatedAttendanceData() { ... }
get totalPages() { ... }
get showingInfo() { ... }
onSearchChange() { ... }
onEntriesPerPageChange() { ... }
previousPage() { ... }
nextPage() { ... }
goToPage(page) { ... }
getPageNumbers() { ... }
```

Also delete the earlier broken `showingInfo` getter that reads `this.paginationData`, because `paginationData` is not part of the canonical state.

- [ ] **Step 5: Run build to verify Dashboard still compiles after state removal**

Run: `npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build`
Expected: webpack production build completes successfully with no missing-property or syntax errors.

- [ ] **Step 6: Commit the Dashboard state cleanup pass**

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add src/js/features/dashboard/dashboard.js
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "refactor: remove duplicate dashboard table state"
```

---

### Task 3: Make Dashboard search explicitly server-driven

**Files:**

- Modify: `src/js/features/dashboard/dashboard.js`
- Test: manual Dashboard browser verification

- [ ] **Step 1: Pass `filters.search` into `getSummaryReport()`**

Update the Dashboard request path so search travels through canonical request state.

```js
const response = await getSummaryReport({
  period: this.period,
  page: this.filters.page,
  limit: this.filters.limit,
  search: this.filters.search,
});
```

Remove special-case fetch-limit logic like this:

```js
const effectiveLimit =
  this.searchQuery && this.searchQuery.trim() ? 100 : this.filters.limit;
```

Use `this.filters.limit` directly unless the API contract itself requires something else. This phase declares Dashboard search as server-driven, not hybrid.

- [ ] **Step 2: Stop replacing `reportData` with client-filtered rows during search**

Replace the hybrid branch in `loadSummaryData()` with one canonical assignment.

Delete this pattern:

```js
if (this.searchQuery && this.searchQuery.trim()) {
  this.reportData = this.filteredAttendanceData;
  const filteredCount = this.reportData.length;
  this.pagination = {
    current_page: 1,
    total_pages: 1,
    total_records: filteredCount,
    per_page: filteredCount,
    has_prev_page: false,
    has_next_page: false,
  };
} else {
  this.reportData = this.attendanceData;
}
```

Keep one canonical assignment instead:

```js
this.reportData = this.attendanceData;
```

- [ ] **Step 3: Make debounced search update canonical request state before reload**

Update the debounce handler so it synchronizes the input state into `filters.search`.

```js
debouncedSearch() {
  clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(() => {
    this.filters.search = this.searchQuery.trim();
    this.filters.page = 1;
    this.loadSummaryData();
  }, 1000);
},
```

- [ ] **Step 4: Reset search state correctly on empty/error responses**

Make sure reset paths do not revive local Dashboard row models. Keep only canonical response state resets.

Use this shape when clearing Dashboard rows:

```js
this.attendanceData = [];
this.reportData = [];
this.pagination = {
  current_page: 1,
  total_pages: 1,
  total_records: 0,
  per_page: 5,
  has_next_page: false,
  has_prev_page: false,
};
```

Do not recalculate rows or pages locally in any reset path.

- [ ] **Step 5: Run build to verify the server-driven search path compiles**

Run: `npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build`
Expected: webpack production build completes successfully.

- [ ] **Step 6: Manually verify Dashboard search is now server-driven**

Run: `npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" start`
Expected: local webpack dev server starts successfully.

Manual checks in browser:

- open the Dashboard page,
- type a search term,
- confirm rows update after debounce,
- confirm current page resets to page 1,
- confirm pagination still renders from response-backed `pagination`, not a fake single-page local override.

- [ ] **Step 7: Commit the Dashboard search contract pass**

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add src/js/features/dashboard/dashboard.js
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "refactor: make dashboard search server-driven"
```

---

### Task 4: Keep Dashboard pagination and template bindings aligned with the canonical contract

**Files:**

- Modify: `src/js/features/dashboard/dashboard.js`
- Modify (only if needed): `src/partials/table/table-dashboard-report.html`
- Test: manual Dashboard browser verification

- [ ] **Step 1: Keep page changes strictly server-driven**

Ensure `changePage()` updates only canonical request state and reloads data.

```js
changePage(newPage) {
  if (newPage >= 1 && newPage <= this.pagination.total_pages) {
    this.filters.page = newPage;
    this.loadSummaryData();
  }
},
```

Do not restore any `currentPage`-based local navigation helpers.

- [ ] **Step 2: Keep page-size changes strictly server-driven**

Ensure the active page-size handler updates `filters.limit` and resets `filters.page`.

```js
changeEntriesPerPage(newLimit) {
  this.filters.limit = Number(newLimit) || 5;
  this.filters.page = 1;
  this.loadSummaryData();
},
```

- [ ] **Step 3: Verify the Dashboard partial uses only canonical row and pagination bindings**

The active table partial should continue to use bindings like these:

```html
<template x-for="log in reportData" :key="log.id_attendance"></template>
```

```html
x-text="((pagination.current_page - 1) * pagination.per_page) + 1"
```

```html
@click="changePage(pagination.current_page - 1)"
```

If you find any binding that points to removed local Dashboard state, replace it so it reads from `reportData` or `pagination` only.

- [ ] **Step 4: Run build after final Dashboard alignment**

Run: `npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build`
Expected: webpack production build completes successfully.

- [ ] **Step 5: Manually verify Dashboard page-size and pagination behavior in browser**

Run: `npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" start`
Expected: local webpack dev server starts successfully.

Manual checks in browser:

- change page size from 5 to 10 to 25,
- confirm rows reload and page resets to 1,
- click next/previous page controls,
- confirm page controls stay aligned with `pagination.current_page`, `has_prev_page`, and `has_next_page`,
- confirm summary cards and analytics still render and refresh normally.

- [ ] **Step 6: Commit the final Dashboard contract alignment pass**

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add src/js/features/dashboard/dashboard.js src/partials/table/table-dashboard-report.html
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "refactor: align dashboard table with canonical contract"
```

---

### Task 5: Final verification and handoff note

**Files:**

- Modify: `docs/superpowers/specs/2026-04-15-admin-table-standardization-dashboard-first-design.md` (only if implementation reveals a real spec mismatch)
- Test: manual Dashboard verification and build output

- [ ] **Step 1: Run one final production build**

Run: `npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build`
Expected: successful production build.

- [ ] **Step 2: Run one final manual regression pass on Dashboard**

Run: `npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" start`
Expected: dev server starts successfully.

Manual checks:

- initial Dashboard load works,
- search works and remains server-driven,
- page-size changes work and reset to page 1,
- pagination controls work,
- summary cards and analytics still update,
- sorting icons still render without any new sorting behavior being introduced,
- no visible Dashboard path depends on removed local pagination/search helpers.

- [ ] **Step 3: Record any spec mismatch immediately if one appears during execution**

If implementation reveals a real mismatch, update the spec before continuing. Example note format:

```md
## Implementation note

The API requires `search` plus `query` aliases for compatibility. The canonical contract remains server-driven, but request serialization includes both keys temporarily.
```

If no mismatch appears, do not edit the spec.

- [ ] **Step 4: Commit the final verification pass**

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add docs/superpowers/specs/2026-04-15-admin-table-standardization-dashboard-first-design.md src/js/features/dashboard/dashboard.js src/partials/table/table-dashboard-report.html src/js/features/attendance/attendanceLog.js src/js/features/wfaBooking/bookingList.js src/js/features/userManagement/userListSimple.js
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "chore: verify dashboard-first table standardization"
```

---

## Spec coverage check

- Explicit search/pagination strategy per table → Task 1
- Dashboard canonical state contract → Task 2
- Dashboard server-driven search flow → Task 3
- Dashboard server-driven pagination/page-size flow → Task 4
- Verification for load/search/page-size/pagination/summary/analytics → Tasks 3, 4, and 5
- Out-of-scope boundaries (sorting/modal/residue cleanup) are preserved by not adding any tasks for them

## Placeholder scan

- No `TODO`, `TBD`, or deferred placeholders remain in this plan.
- All file paths are explicit.
- All command steps include the exact command and expected outcome.

## Type and property consistency check

- Canonical request state consistently uses `filters.page`, `filters.limit`, and `filters.search`.
- Canonical response state consistently uses `pagination`.
- Canonical rendered rows consistently use `reportData`.
- Removed local Dashboard state is consistently named as `currentPage`, `entriesPerPage`, `filteredAttendanceData`, `paginatedAttendanceData`, and `totalPages`.
