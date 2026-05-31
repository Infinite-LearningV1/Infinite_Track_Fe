# Attendance Table Server-Driven Cleanup Implementation Plan

> **Status:** Historical implementation plan, not current runtime evidence. Any `Expected: PASS` lines below describe intended verification outcomes at planning time and do not by themselves prove current repo/runtime state.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the attendance table so all visible controls truthfully write to one server-driven request contract while rows and pagination remain fully response-driven.

**Architecture:** Keep attendance server-driven. Use `filters` as the single request state, `attendanceData` plus `pagination` as the response state, and clean any page-level or global residue that makes controls appear active without updating the backend request path.

**Tech Stack:** Alpine.js, Webpack multi-page HTML partials, existing attendance service layer, shared global modal helpers, `npm run build` verification.

---

## File structure and responsibilities

### Active source to keep and clean

- `src/js/features/attendance/attendanceLog.js`
  - canonical request state, response state, and active attendance actions
- `src/partials/table/table-attendance.html`
  - canonical table UI contract for rows, pagination, empty/error/loading states
- `src/management-attendance.html`
  - page-level attendance controls and bindings; must remain truthful to the same request state

### Possible residue cleanup target

- `src/js/index.js`
  - only if attendance-related helper/wiring is no longer truthful to active flow

### Reference implementations to reuse

- `src/js/features/wfaBooking/bookingList.js`
  - strongest server-driven pattern reference for request/response contract
- `src/js/services/attendanceService.js`
  - existing server-driven request path for attendance

---

### Task 1: Align active attendance request state to one server-driven contract

**Files:**

- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `src/management-attendance.html`
- Test: `src/js/features/attendance/attendanceLog.js`

- [ ] **Step 1: Write the failing entries-per-page truthfulness check**

Run:

```bash
node -e "const fs=require('fs');const page=fs.readFileSync('src/management-attendance.html','utf8');const feature=fs.readFileSync('src/js/features/attendance/attendanceLog.js','utf8');const pageBindsToPaginationPerPage=page.includes('pagination.per_page');const featureUsesFiltersLimit=feature.includes('filters.limit');console.log({pageBindsToPaginationPerPage,featureUsesFiltersLimit});process.exit(pageBindsToPaginationPerPage&&featureUsesFiltersLimit?1:0)"
```

Expected: FAIL because the page-level control still binds to `pagination.per_page` while the request contract uses `filters.limit`.

- [ ] **Step 2: Verify the failure reason matches the request/response drift**

Run:

```bash
grep -n -E "pagination\.per_page|filters\.limit|changePage\(1\)|entries" src/management-attendance.html src/js/features/attendance/attendanceLog.js || true
```

Expected: output shows the page control reading from `pagination.per_page` and the feature logic using `filters.limit`.

- [ ] **Step 3: Make page-level controls write to the same request contract**

In `src/management-attendance.html`, update the page-level entries-per-page control so it binds to the same active request state used by the feature source. The control should write to `filters.limit` and trigger the active attendance fetch path instead of presenting a value from response-only state.

In `src/js/features/attendance/attendanceLog.js`, keep the single active request state shape:

```js
filters: {
  search: "",
  sortBy: "time_in",
  sortOrder: "DESC",
  page: 1,
  limit: 10,
},
```

Do not introduce local pagination fallback state.

- [ ] **Step 4: Re-run the entries-per-page truthfulness check**

Run:

```bash
node -e "const fs=require('fs');const page=fs.readFileSync('src/management-attendance.html','utf8');const pageUsesFiltersLimit=page.includes('filters.limit');const pageUsesPaginationPerPage=page.includes('pagination.per_page');console.log({pageUsesFiltersLimit,pageUsesPaginationPerPage});process.exit(pageUsesFiltersLimit&&!pageUsesPaginationPerPage?0:1)"
```

Expected: PASS with `{ pageUsesFiltersLimit: true, pageUsesPaginationPerPage: false }`.

- [ ] **Step 5: Build-check after request-state alignment**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit the request-state alignment**

```bash
git add src/js/features/attendance/attendanceLog.js src/management-attendance.html
git commit -m "refactor: align attendance request state contract"
```

---

### Task 2: Make search and pagination controls fully truthful to backend state

**Files:**

- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `src/partials/table/table-attendance.html`
- Test: `src/js/features/attendance/attendanceLog.js`

- [ ] **Step 1: Write the failing search-state split check**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/js/features/attendance/attendanceLog.js','utf8');const usesSearchTerm=s.includes('searchTerm');const syncsFilters=s.includes('this.filters.search = this.searchTerm');console.log({usesSearchTerm,syncsFilters});process.exit(usesSearchTerm&&syncsFilters?1:0)"
```

Expected: FAIL if search still depends on a split UI state path instead of one straightforward request-state path.

- [ ] **Step 2: Verify the current search flow before editing**

Run:

```bash
grep -n -E "searchTerm|filters\.search|handleSearchInput|debouncedSearch|changePage\(|sortBy|sortOrder" src/js/features/attendance/attendanceLog.js src/partials/table/table-attendance.html || true
```

Expected: output shows current search/sort/page hooks and where state split still exists.

- [ ] **Step 3: Simplify search to one active request path**

In `src/js/features/attendance/attendanceLog.js`, keep search server-driven and ensure UI typing ends in one clear write to the active request state before fetch. If `searchTerm` remains as a UI buffer, it must remain explicitly synchronized into `filters.search`; if not needed, collapse it into one state path.

In `src/partials/table/table-attendance.html`, ensure the search input and active sorting controls only call handlers that update the backend request path. Do not add client-side filtering.

- [ ] **Step 4: Re-run the search-state check**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/js/features/attendance/attendanceLog.js','utf8');const localFiltering=s.includes('filteredAttendanceData')||s.includes('paginatedAttendanceData');console.log({localFiltering});process.exit(localFiltering?1:0)"
```

Expected: PASS with `{ localFiltering: false }`.

- [ ] **Step 5: Build-check after search/sort truthfulness cleanup**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit the truthful search/sort cleanup**

```bash
git add src/js/features/attendance/attendanceLog.js src/partials/table/table-attendance.html
git commit -m "refactor: make attendance controls truthful to backend state"
```

---

### Task 3: Remove stale attendance-related global residue only if it is not active

**Files:**

- Modify: `src/js/index.js`
- Test: `src/js/index.js`

- [ ] **Step 1: Write the failing residue check**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/js/index.js','utf8');const markers=['attendance','showInlineAlert','showAlertModal','openMapDetailModal'];const hits=markers.filter(m=>s.includes(m));console.log({hits})"
```

Expected: informative output showing attendance-related global helper surface. This step is exploratory and should only fail implementation if a clearly stale attendance-specific block is found.

- [ ] **Step 2: Verify whether any attendance-specific global block is misleading**

Run:

```bash
grep -n -E "attendance|showInlineAlert|showAlertModal|openMapDetailModal" src/js/index.js || true
```

Expected: output to inspect manually for attendance-specific residue that is no longer truthful to the active attendance table flow.

- [ ] **Step 3: Remove only clearly stale attendance residue if present**

If there is an attendance-related block in `src/js/index.js` that is no longer used or is misleading relative to the active attendance partial + feature logic, delete only that block. Do not redesign shared modal infrastructure. If no such stale residue exists, leave `src/js/index.js` unchanged.

- [ ] **Step 4: Build-check after residue decision**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit only if `index.js` changed**

```bash
git add src/js/index.js
git commit -m "refactor: remove stale attendance global wiring"
```

```
If `src/js/index.js` does not change, skip this commit.

---

## Spec coverage check
- Keep attendance server-driven: covered in Tasks 1-2.
- Ensure entries-per-page is truthful to request contract: covered in Task 1.
- Ensure search stays server-driven and not hybrid: covered in Task 2.
- Keep only currently supported sort affordances truthful: covered in Task 2.
- Evaluate and remove stale attendance-related residue only if warranted: covered in Task 3.
- Build safety after each phase: covered in every task.

## Placeholder scan
No `TODO`, `TBD`, or vague implementation instructions remain.

## Type consistency check
- Canonical request state remains `filters` with `search`, `page`, `limit`, `sortBy`, `sortOrder`.
- Canonical response state remains `attendanceData` and `pagination`.
- The plan does not introduce client-side `filteredAttendanceData` / `paginatedAttendanceData` style models.
```
