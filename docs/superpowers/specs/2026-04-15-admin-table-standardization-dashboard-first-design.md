# Admin Table Standardization Dashboard-First Design

## Purpose
Define the first execution phase for Web FE admin table standardization by:
1. declaring an explicit search/pagination strategy per table (`INF-124`), and
2. implementing the first canonical table-state contract on Dashboard (`INF-109`).

This phase is intentionally narrow. It establishes the table standard where ambiguity is highest, then proves the standard in one live feature instead of attempting a cross-table refactor in one pass.

## Current design context
- This design applies only to **Web FE** in `Infinite_Track_Fe`.
- The active admin table surfaces in scope are:
  - Dashboard
  - Attendance
  - Booking
  - User
- Current table behavior is mixed:
  - Dashboard contains overlapping server-driven and local table state.
  - Attendance is already mostly server-driven.
  - Booking is already mostly server-driven.
  - User is client-driven over locally fetched data.
- The goal of this phase is not to make all tables behave identically. The goal is to make each table’s strategy **explicit, predictable, and internally consistent**.

## Goals
- Declare one explicit search/pagination strategy for each admin table.
- Remove ambiguous hybrid behavior from Dashboard.
- Define one canonical table-state contract for the Dashboard table.
- Align active Dashboard template bindings with the canonical state.
- Use Dashboard as the first concrete implementation of the standard.

## Non-goals
- Implement Dashboard sorting behavior (`INF-110`).
- Fix Booking page-size/request-limit mismatch (`INF-120`).
- Fix Booking map action enable/disable correctness (`INF-121`).
- Standardize Booking modal orchestration (`INF-122`).
- Standardize modal/popup contracts across all tables (`INF-125`).
- Perform cross-feature residue cleanup (`INF-126`).
- Rewrite Attendance, Booking, or User table internals in this phase.

## Standardization decision
Each admin table must declare one explicit search/pagination strategy.

### Table strategy assignments
- **Dashboard** → server-driven
- **Attendance** → server-driven
- **Booking** → server-driven
- **User** → client-driven

## Standard definitions
### Server-driven table
A table is server-driven when:
- the rendered rows are sourced from the active API response,
- request state lives in `filters`,
- pagination state lives in `pagination`,
- UI controls update request state and then trigger fetch,
- the feature does not maintain a second local pagination/search model for the same active table path.

### Client-driven table
A table is client-driven when:
- the source rows are loaded into local memory,
- search and pagination are computed locally,
- page-size/page/search changes do not trigger server fetch per interaction,
- the table does not pretend to be server-paginated.

## Why these assignments are correct for the current repo
- **Dashboard** already fetches paginated report data from `getSummaryReport()` and renders from API-backed report rows, but still carries local filtering/pagination residue. Standardizing it as server-driven removes ambiguity with minimal conceptual churn.
- **Attendance** already uses `filters` + `pagination` + fetch on search/sort/page changes.
- **Booking** already uses `filters` + `pagination` + fetch on search/filter/page changes.
- **User** currently fetches users once and computes `filteredUsers`, `paginatedUsers`, `totalPages`, and `showingInfo` locally.

This means the design follows the repo’s actual behavior instead of forcing all tables into one identical technical model.

## Dashboard canonical contract (`INF-109`)
The Dashboard table must keep only one active table-state contract.

### Canonical Dashboard state
The active Dashboard table surface should use only these state families:
- `filters`
  - `period`
  - `page`
  - `limit`
  - `search`
- `pagination`
  - `current_page`
  - `total_pages`
  - `total_records`
  - `has_prev_page`
  - `has_next_page`
  - `per_page`
- `reportData`
- `isLoading`
- `errorMessage`

### Allowed supporting UI state
The feature may still keep supporting UI state that does not create a second table model, such as:
- search input text bound to the field, if that text synchronizes into `filters.search`
- export state
- notification state
- summary / analytics state for the surrounding page
- current sort icon state, as long as it does not introduce another active row-ordering path in this phase

### State that must no longer define the active Dashboard table path
The following state families must stop driving live Dashboard table behavior:
- duplicate `pagination` declarations
- `entriesPerPage`
- `currentPage`
- `filteredAttendanceData`
- `paginatedAttendanceData`
- `totalPages`
- local `showingInfo`
- local paging helpers tied to `currentPage`
- search branches that replace API-backed rows with client-filtered rows for the active table path

## Dashboard data flow after the change
1. User changes period, search, page, or entries-per-page.
2. The UI updates `filters`.
3. `loadSummaryData()` fetches using the current `filters` values.
4. The response updates:
   - `reportData`
   - `pagination`
   - dashboard summary / analytics state
5. The active table partial renders only from `reportData` and `pagination`.

## Search behavior design
Dashboard search must become explicitly server-driven.

### Required behavior
- the search input remains usable as text input state,
- on debounced search, `filters.search` is updated from the input value,
- `filters.page` resets to `1`,
- `loadSummaryData()` is called,
- the fetched response becomes the only source for `reportData` and `pagination`.

### Explicitly forbidden behavior in this phase
- fetching one dataset and then applying local filtering as the active search path,
- replacing `reportData` with `filteredAttendanceData` during search,
- overriding `pagination` to a fake local single-page result while search is active.

## Pagination behavior design
Dashboard pagination must stay server-driven.

### Required behavior
- changing page updates `filters.page` and reloads data,
- changing entries-per-page updates `filters.limit`, resets `filters.page` to `1`, and reloads data,
- showing-info and page controls read from the same `pagination` object that comes from the active response.

### Explicitly forbidden behavior in this phase
- local page navigation through a separate `currentPage`,
- local page counting through a second `totalPages`,
- showing-info derived from a different row model than the rendered rows.

## Sorting behavior boundary
Sorting is out of scope for this phase.

### Decision
- `currentSort`, `changeSort()`, and `getSortIcon()` may remain as UI-facing state.
- This phase will not connect sorting to server request params or local row sorting.
- The design avoids expanding into `INF-110`.

This preserves scope discipline while keeping existing UI affordances untouched until sorting is handled explicitly.

## Expected file changes
### Primary file
- `src/js/features/dashboard/dashboard.js`

### Possible supporting file
- `src/partials/table/table-dashboard-report.html`

The partial already appears close to the desired contract because it renders from `reportData` and `pagination`. It should only be changed if an active binding still points to a legacy Dashboard state path.

## Implementation constraints
- Follow the existing server-driven patterns already present in Attendance and Booking.
- Do not introduce a new abstraction shared across all tables in this phase.
- Prefer deleting or bypassing legacy Dashboard table state instead of layering new compatibility state on top.
- Keep the implementation local to Dashboard unless a template binding requires a small accompanying change.

## Verification plan
This phase is complete only if all of the following are true.

### 1. Initial Dashboard load
- rows render correctly,
- pagination metadata renders correctly,
- loading and error state still behave normally.

### 2. Dashboard search
- typing in search updates the request path through `filters.search`,
- search resets page to `1`,
- `reportData` remains sourced from the active response,
- pagination remains response-driven during search.

### 3. Dashboard entries-per-page
- selecting a new page size updates `filters.limit`,
- page resets to `1`,
- the table reloads using the new limit,
- row count and visible pagination remain aligned.

### 4. Dashboard page navigation
- `changePage()` remains server-driven,
- page controls stay aligned with `pagination.current_page`, `has_prev_page`, and `has_next_page`.

### 5. Dashboard regression checks
- dashboard summary cards still update,
- analytics still update,
- export behavior remains unaffected,
- no active Dashboard template path depends on removed local pagination/search state.

## Risks and failure modes
- If search input state is kept separate but not synchronized into `filters.search`, the code will still look standardized while requests remain incomplete.
- If `reportData` stays API-backed but showing-info or page buttons still read from local residue state, the UI will remain internally contradictory.
- If Dashboard keeps both local and server pagination helpers alive, future bug fixes will continue to drift between duplicate paths.
- If this phase tries to solve sorting too, scope will likely expand into unrelated behavior changes and reduce confidence in the core table-state cleanup.

## Operational recommendation
Execute this phase as a focused Dashboard-first standardization pass:
1. declare the explicit table strategies through the implementation choices in this spec,
2. make Dashboard fully server-driven in search and pagination,
3. leave modal standardization, sorting, and residue cleanup for their dedicated follow-up issues.

## Summary rule
**Declare the strategy per table, then make Dashboard obey one server-driven table contract end-to-end.**
