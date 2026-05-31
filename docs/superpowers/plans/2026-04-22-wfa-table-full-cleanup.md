# WFA Table Full Cleanup Implementation Plan

> **Status:** Historical implementation plan, not current runtime evidence. Any `Expected: PASS` lines below describe intended verification outcomes at planning time and do not by themselves prove current repo/runtime state.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the management WFA/booking table so it keeps one truthful server-driven contract for controls and one clear owner for map/detail actions, while removing stale or misleading wiring.

**Architecture:** Keep WFA/booking table server-driven. Use `filters` as the single request state, `bookings` plus `pagination` as the response state, and tighten UI truthfulness so page controls, sort state, and map/detail actions all resolve through one canonical flow instead of split ownership between page root, feature logic, and modal helpers.

**Tech Stack:** Alpine.js, Webpack multi-page HTML partials, existing booking service layer, booking map modal component, `npm run build` verification.

---

## File structure and responsibilities

### Active source to keep and clean

- `src/js/features/wfaBooking/bookingList.js`
  - canonical booking table state, request contract, row mapping, and booking actions
- `src/partials/table/table-booking.html`
  - canonical table UI contract for rows, sort affordances, pagination controls, and actions
- `src/management-booking.html`
  - page-level Alpine composition and ownership boundary for booking table + booking modal state
- `src/js/services/bookingService.js`
  - API boundary for booking query params and action requests

### Possible residue cleanup target

- `src/js/index.js`
  - only booking-related global/stale wiring if proven non-canonical after active ownership is clarified

### Modal owner target

- `src/js/components/modal/bookingMapModal.js`
- `src/partials/modal/booking-map-modal.html`

The end state for this phase must have **one clear owner** for booking map/detail action flow.

---

### Task 1: Align entries-per-page and page controls to the active server-driven request contract

**Files:**

- Modify: `src/js/features/wfaBooking/bookingList.js`
- Modify: `src/management-booking.html`
- Modify: `src/partials/table/table-booking.html` (only if control bindings live there)
- Test: `src/js/features/wfaBooking/bookingList.js`

- [ ] **Step 1: Write the failing entries-per-page drift check**

Run:

```bash
node -e "const fs=require('fs');const page=fs.readFileSync('src/management-booking.html','utf8');const partial=fs.readFileSync('src/partials/table/table-booking.html','utf8');const feature=fs.readFileSync('src/js/features/wfaBooking/bookingList.js','utf8');const pageUsesPaginationPerPage=page.includes('pagination.per_page')||partial.includes('pagination.per_page');const featureUsesFiltersLimit=feature.includes('filters.limit');console.log({pageUsesPaginationPerPage,featureUsesFiltersLimit});process.exit(pageUsesPaginationPerPage&&featureUsesFiltersLimit?1:0)"
```

Expected: FAIL if UI control still reads response-side `pagination.per_page` while request uses `filters.limit`.

- [ ] **Step 2: Verify where the drift lives**

Run:

```bash
grep -n -E "pagination\.per_page|filters\.limit|changePage\(1\)|entries|limit" src/management-booking.html src/partials/table/table-booking.html src/js/features/wfaBooking/bookingList.js || true
```

Expected: output pinpoints whether the page-size UI is bound to response-side pagination instead of request filters.

- [ ] **Step 3: Make the page-size control write to the request contract**

Update the active page/partial control so it binds to the same request state used by `bookingList.js` (`filters.limit`) and calls a dedicated handler that resets page to `1` and refetches. In `bookingList.js`, keep the request contract explicit and server-driven:

```js
filters: {
  search: "",
  sortBy: "created_at",
  sortOrder: "DESC",
  page: 1,
  limit: 10,
  // keep any currently active booking filters
}
```

If a `changeLimit(newLimit)` helper does not exist, add the minimal implementation:

```js
changeLimit(newLimit) {
  const parsedLimit = Number(newLimit);
  this.filters.limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
  this.filters.page = 1;
  this.fetchBookings();
},
```

- [ ] **Step 4: Re-run the entries-per-page drift check**

Run:

```bash
node -e "const fs=require('fs');const page=fs.readFileSync('src/management-booking.html','utf8');const partial=fs.readFileSync('src/partials/table/table-booking.html','utf8');const usesFiltersLimit=page.includes('filters.limit')||partial.includes('filters.limit');const usesPaginationPerPage=page.includes('pagination.per_page')||partial.includes('pagination.per_page');console.log({usesFiltersLimit,usesPaginationPerPage});process.exit(usesFiltersLimit&&!usesPaginationPerPage?0:1)"
```

Expected: PASS.

- [ ] **Step 5: Build-check after request-state alignment**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit the request-state alignment**

```bash
git add src/js/features/wfaBooking/bookingList.js src/management-booking.html src/partials/table/table-booking.html
git commit -m "refactor: align booking request state contract"
```

---

### Task 2: Make search and sort controls fully truthful to backend state

**Files:**

- Modify: `src/js/features/wfaBooking/bookingList.js`
- Modify: `src/partials/table/table-booking.html`
- Test: `src/js/features/wfaBooking/bookingList.js`

- [ ] **Step 1: Write the failing search/sort truthfulness check**

Run:

```bash
node -e "const fs=require('fs');const feature=fs.readFileSync('src/js/features/wfaBooking/bookingList.js','utf8');const hasSplitSearchState=feature.includes('searchTerm')&&feature.includes('filters.search')&&!feature.includes('get searchTerm()');const hasLocalFiltering=feature.includes('filteredBookings')||feature.includes('paginatedBookings');console.log({hasSplitSearchState,hasLocalFiltering});process.exit(hasSplitSearchState||hasLocalFiltering?1:0)"
```

Expected: FAIL if search still depends on split state or local filtering fallback.

- [ ] **Step 2: Verify active sort/search hooks**

Run:

```bash
grep -n -E "searchTerm|filters\.search|debouncedSearch|handleSearch|sortBy|sortOrder|changeSort\(|getSortIcon\(" src/js/features/wfaBooking/bookingList.js src/partials/table/table-booking.html || true
```

Expected: clear output of current search and sort hook points.

- [ ] **Step 3: Keep search fully server-driven and sort only on active supported fields**

In `bookingList.js`, ensure the search path ends in one canonical request state (`filters.search`) and fetches from backend. If a split input state exists only for UI buffering, convert it to a getter/setter proxy to `filters.search`, as in the attendance cleanup, or collapse it completely if simpler.

Add a supported-sort contract only if the partial currently exposes sortable columns that are not all truthfully supported. Keep only currently active/supported sort fields truthful; do not add new sort fields in this phase.

If needed, use this minimal pattern:

```js
supportedSortFields: ["full_name", "status", "created_at"],

isSortFieldSupported(fieldName) {
  return this.supportedSortFields.includes(fieldName);
},

changeSort(newSortBy) {
  if (!this.isSortFieldSupported(newSortBy)) {
    return;
  }

  if (this.filters.sortBy === newSortBy) {
    this.filters.sortOrder = this.filters.sortOrder === "ASC" ? "DESC" : "ASC";
  } else {
    this.filters.sortBy = newSortBy;
    this.filters.sortOrder = "DESC";
  }

  this.filters.page = 1;
  this.fetchBookings();
},
```

In `table-booking.html`, disable/demote unsupported sort affordances with `:disabled` and truthful styling, as done in attendance cleanup.

- [ ] **Step 4: Re-run the truthfulness check**

Run:

```bash
node -e "const fs=require('fs');const feature=fs.readFileSync('src/js/features/wfaBooking/bookingList.js','utf8');const hasLocalFiltering=feature.includes('filteredBookings')||feature.includes('paginatedBookings');console.log({hasLocalFiltering});process.exit(hasLocalFiltering?1:0)"
```

Expected: PASS.

- [ ] **Step 5: Build-check after search/sort cleanup**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit truthful search/sort cleanup**

```bash
git add src/js/features/wfaBooking/bookingList.js src/partials/table/table-booking.html
git commit -m "refactor: make booking controls truthful to backend state"
```

---

### Task 3: Collapse booking map/detail action ownership to one canonical owner

**Files:**

- Modify: `src/management-booking.html`
- Modify: `src/js/features/wfaBooking/bookingList.js`
- Modify: `src/js/components/modal/bookingMapModal.js` (only if needed to make ownership explicit)
- Modify: `src/partials/modal/booking-map-modal.html` (only if needed)
- Test: `src/management-booking.html`

- [ ] **Step 1: Write the failing modal-ownership overlap check**

Run:

```bash
node -e "const fs=require('fs');const page=fs.readFileSync('src/management-booking.html','utf8');const pageUsesFeature=page.includes('bookingListAlpineData()');const pageUsesModal=page.includes('bookingMapModalState()');console.log({pageUsesFeature,pageUsesModal});process.exit(pageUsesFeature&&pageUsesModal?1:0)"
```

Expected: FAIL if the page still composes overlapping owners for booking table + booking map modal state.

- [ ] **Step 2: Verify booking map/detail action paths before editing**

Run:

```bash
grep -n -E "bookingListAlpineData\(|bookingMapModalState\(|openMap|openDetail|map|detail|modal" src/management-booking.html src/js/features/wfaBooking/bookingList.js src/js/components/modal/bookingMapModal.js src/partials/modal/booking-map-modal.html || true
```

Expected: output reveals which layer currently owns map/detail state and triggers.

- [ ] **Step 3: Collapse to one canonical owner**

Choose one owner for booking map/detail action flow and remove the overlapping path.

Recommended owner:

- feature-owned action entry in `bookingList.js`
- modal component owns rendering mechanics only
- page root should not compose two independent booking owners if one can delegate cleanly to the other

Acceptable implementation patterns:

- keep `bookingListAlpineData()` as the owner and invoke modal state/helpers through one explicit integration path
- or keep `bookingMapModalState()` as the owner only if booking actions in the table clearly delegate to it and the table feature no longer duplicates modal state

What is forbidden:

- two independent owners for the same booking map/detail modal behavior
- hidden fallback ownership through both page root spreads at once

- [ ] **Step 4: Re-run the overlap check**

Run:

```bash
node -e "const fs=require('fs');const page=fs.readFileSync('src/management-booking.html','utf8');const pageUsesFeature=page.includes('bookingListAlpineData()');const pageUsesModal=page.includes('bookingMapModalState()');console.log({pageUsesFeature,pageUsesModal})"
```

Expected: output reflects one clear ownership model; if both remain, the implementation must make delegation explicit and non-overlapping in code comments/structure.

- [ ] **Step 5: Build-check after ownership cleanup**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit modal/action ownership cleanup**

```bash
git add src/management-booking.html src/js/features/wfaBooking/bookingList.js src/js/components/modal/bookingMapModal.js src/partials/modal/booking-map-modal.html
git commit -m "refactor: clarify booking modal ownership"
```

---

### Task 4: Remove only clearly stale booking-related global residue in `index.js`

**Files:**

- Modify: `src/js/index.js`
- Test: `src/js/index.js`

- [ ] **Step 1: Write the failing stale-residue check**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/js/index.js','utf8');const markers=['menyetujui booking','hapus booking','.js-success-btn','.js-info-btn','.js-danger-btn'];const hits=markers.filter(m=>s.includes(m));console.log({hits});process.exit(hits.length===0?0:1)"
```

Expected: FAIL if the old booking-like DOM selector residue still exists in `index.js`.

- [ ] **Step 2: Verify the stale residue block**

Run:

```bash
grep -n -E "menyetujui booking|hapus booking|\.js-success-btn|\.js-info-btn|\.js-danger-btn" src/js/index.js || true
```

Expected: output points to the stale booking-like residue block.

- [ ] **Step 3: Remove only the stale residue block**

Delete only the clearly stale booking-like global listener block if it is no longer canonical after Task 3 ownership cleanup. Do not remove shared helpers that are still actively used by booking, attendance, dashboard, or user flows.

- [ ] **Step 4: Re-run the stale-residue check**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/js/index.js','utf8');const markers=['menyetujui booking','hapus booking','.js-success-btn','.js-info-btn','.js-danger-btn'];const hits=markers.filter(m=>s.includes(m));console.log({hits});process.exit(hits.length===0?0:1)"
```

Expected: PASS with `{ hits: [] }`.

- [ ] **Step 5: Build-check after residue cleanup**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit global residue cleanup**

```bash
git add src/js/index.js
git commit -m "refactor: remove stale booking global residue"
```

---

## Spec coverage check

- Keep booking/WFA server-driven: covered in Tasks 1-2.
- Ensure entries-per-page writes to request contract: covered in Task 1.
- Ensure search/sort are truthful to backend state: covered in Task 2.
- Ensure map/detail actions have one owner: covered in Task 3.
- Remove stale booking-like global residue only if truly stale: covered in Task 4.
- Keep scope away from full modal-system redesign: enforced across all tasks.
- Build safety after each task: covered throughout.

## Placeholder scan

No `TODO`, `TBD`, or vague implementation placeholders remain.

## Type consistency check

- Request contract remains `filters.search`, `filters.page`, `filters.limit`, `filters.sortBy`, `filters.sortOrder`.
- Response contract remains `bookings` and `pagination`.
- This plan does not introduce client-side `filteredBookings` / `paginatedBookings` models.
- Modal owner target remains singular and explicit, not split across page root + feature + modal helper.
