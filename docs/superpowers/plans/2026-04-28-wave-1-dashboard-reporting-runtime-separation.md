# Wave 1 Dashboard Reporting Runtime Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the dirty salvage branch safely, create a clean Wave 1 worktree from `develop`, move only the dashboard/reporting runtime files into it, and fix the known sort and table mismatches until the branch is ready for Wave 1 review.

**Architecture:** Treat `feature/branch-governance-only` as a read-only salvage source after one technical checkpoint commit. Create a new Wave 1 branch from `develop` inside `.worktrees/`, import only the three dashboard/reporting files, then make the minimum runtime corrections needed for server-driven sorting and correct table semantics. Keep verification honest: use repo-backed checks plus `npm run build`, and preserve `REQUIRES REPO VERIFICATION` for backend/runtime truths that the repo alone cannot prove.

**Tech Stack:** Git worktrees, Git branches, Node 20+, Webpack, Alpine.js, Axios, HTML partials

---

## File map

- `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/features/dashboard/dashboard.js`
  - Owns dashboard Alpine component state, server-driven report loading, pagination, and sort UI behavior.
- `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/reportService.js`
  - Owns summary report API request construction and mock fallback behavior.
- `E:/skrisi/clonefee/Infinite_Track_Fe/src/partials/table/table-dashboard-report.html`
  - Owns dashboard report table headers, body field rendering, and pagination controls.
- `E:/skrisi/clonefee/Infinite_Track_Fe/.gitignore`
  - Already ignores `.worktrees/`; this is a prerequisite check, not a planned code change.
- `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-28-working-tree-stream-separation-design.md`
  - Approved design spec that defines the Wave 1 boundary and gates.
- `E:/skrisi/clonefee/Infinite_Track_Fe/package.json`
  - Provides the only locked verification command in the repo: `npm run build`.

## Scope boundary

This plan intentionally covers **only Wave 1**:
- freeze the salvage state,
- create the clean Wave 1 worktree,
- migrate the three dashboard/reporting files,
- fix the known runtime mismatches,
- verify with repo-backed commands.

This plan does **not** cover Wave 2 env/deploy truth or Wave 3 build/deploy governance. Those need separate plans after Wave 1 is complete.

---

### Task 1: Freeze the salvage source and verify the worktree directory policy

**Files:**
- Review: `E:/skrisi/clonefee/Infinite_Track_Fe/.gitignore:13-26`
- Review: `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-28-working-tree-stream-separation-design.md`

- [ ] **Step 1: Verify the current dirty state still matches the audited Wave 1 scope**

Run:
```bash
git status --short
```

Expected: the working tree still includes the local dashboard/reporting files plus env/docs noise, and there are no unresolved merge conflicts.

- [ ] **Step 2: Verify the preferred worktree directory exists**

Run:
```bash
ls -d .worktrees 2>/dev/null || ls -d worktrees 2>/dev/null
```

Expected: `.worktrees` is printed.

- [ ] **Step 3: Verify the local worktree directory is ignored by git**

Run:
```bash
git check-ignore -q .worktrees && printf ".worktrees ignored\n"
```

Expected: `.worktrees ignored`

- [ ] **Step 4: Create the salvage checkpoint commit on `feature/branch-governance-only`**

Run:
```bash
git add \
  .env.example \
  env.example.txt \
  .env.production.example \
  src/js/features/dashboard/dashboard.js \
  src/js/services/reportService.js \
  src/partials/table/table-dashboard-report.html \
  docs/superpowers/2026-04-21-backend-refresh-token-prompt.md \
  docs/superpowers/plans/2026-04-19-docker-compose-nginx-gateway.md \
  docs/superpowers/plans/2026-04-26-worktree-review-stream-map-execution.md \
  docs/superpowers/specs/2026-04-19-docker-compose-design.md \
  docs/superpowers/specs/2026-04-22-web-fe-refresh-session-adoption-design.md \
  docs/superpowers/specs/2026-04-26-worktree-review-stream-map-design.md && \
git commit -m "$(cat <<'EOF'
chore: checkpoint salvage state before wave 1 split
EOF
)"
```

Expected: a new local checkpoint commit is created on `feature/branch-governance-only`. This commit is technical-only and not review-ready.

- [ ] **Step 5: Confirm the salvage branch is now clean and ready to act as a read-only source**

Run:
```bash
git status --short
```

Expected: no modified or untracked files remain in the current workspace.

---

### Task 2: Create the clean Wave 1 worktree from `develop`

**Files:**
- Review: `E:/skrisi/clonefee/Infinite_Track_Fe/package.json:6-10`
- Review: `E:/skrisi/clonefee/Infinite_Track_Fe/.gitignore:25`

- [ ] **Step 1: Fetch the latest remote refs before branching from `develop`**

Run:
```bash
git fetch origin
```

Expected: remote refs update successfully.

- [ ] **Step 2: Create the Wave 1 worktree from `origin/develop`**

Run:
```bash
git worktree add \
  -b "feature/wave1-dashboard-reporting-runtime" \
  ".worktrees/wave1-dashboard-reporting-runtime" \
  origin/develop
```

Expected: git creates `.worktrees/wave1-dashboard-reporting-runtime` and checks out `feature/wave1-dashboard-reporting-runtime` from the `origin/develop` tip.

- [ ] **Step 3: Install dependencies inside the new worktree**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" status --short && \
npm --prefix ".worktrees/wave1-dashboard-reporting-runtime" install
```

Expected: `git status --short` prints nothing, then dependencies install successfully.

- [ ] **Step 4: Verify the clean baseline build in the new worktree**

Run:
```bash
npm --prefix ".worktrees/wave1-dashboard-reporting-runtime" run build
```

Expected: webpack build completes with exit code 0. A Browserslist age warning is acceptable; a build error is not. If the baseline build fails here, stop and investigate before importing any Wave 1 files.

- [ ] **Step 5: Record the new worktree as the only active workspace for Wave 1**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" branch --show-current && \
git -C ".worktrees/wave1-dashboard-reporting-runtime" status --short
```

Expected: branch name `feature/wave1-dashboard-reporting-runtime` and no local changes.

---

### Task 3: Import only the Wave 1 files from the salvage source

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/js/features/dashboard/dashboard.js`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/js/services/reportService.js`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/partials/table/table-dashboard-report.html`

- [ ] **Step 1: Inspect the develop-vs-salvage delta for only the Wave 1 files**

Run:
```bash
git diff --name-status origin/develop...feature/branch-governance-only -- \
  src/js/features/dashboard/dashboard.js \
  src/js/services/reportService.js \
  src/partials/table/table-dashboard-report.html
```

Expected: exactly these three files appear.

- [ ] **Step 2: Copy only the Wave 1 files from the salvage branch into the Wave 1 worktree**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" checkout feature/branch-governance-only -- \
  src/js/features/dashboard/dashboard.js \
  src/js/services/reportService.js \
  src/partials/table/table-dashboard-report.html
```

Expected: only the three Wave 1 files become modified inside `.worktrees/wave1-dashboard-reporting-runtime`.

- [ ] **Step 3: Verify the imported change set is still limited to the three Wave 1 files**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" status --short
```

Expected:
```text
M  src/js/features/dashboard/dashboard.js
M  src/js/services/reportService.js
M  src/partials/table/table-dashboard-report.html
```

- [ ] **Step 4: Build the imported Wave 1 state before making any corrective edits**

Run:
```bash
npm --prefix ".worktrees/wave1-dashboard-reporting-runtime" run build
```

Expected: build still passes. This confirms the split reproduces the current Wave 1 runtime state cleanly in isolation.

- [ ] **Step 5: Commit the raw Wave 1 split checkpoint**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" add \
  src/js/features/dashboard/dashboard.js \
  src/js/services/reportService.js \
  src/partials/table/table-dashboard-report.html && \
git -C ".worktrees/wave1-dashboard-reporting-runtime" commit -m "$(cat <<'EOF'
chore: isolate wave 1 dashboard reporting runtime
EOF
)"
```

Expected: the new Wave 1 branch now has one clean checkpoint containing only the imported Wave 1 files.

---

### Task 4: Make the report service forward the server-driven sort contract

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/js/services/reportService.js:26-77`

- [ ] **Step 1: Prove the current imported service does not yet forward `sortBy` or `sortOrder`**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" grep -n "sortBy\|sortOrder" -- src/js/services/reportService.js
```

Expected: no output.

- [ ] **Step 2: Update `getSummaryReport` so the request contract forwards sort fields when present**

Replace the top of `getSummaryReport` with:
```js
  /**
   * Mendapatkan summary report dari backend
   * @param {Object} params - Request parameters
   * @param {string} params.period - Period filter ('daily', 'weekly', 'monthly', 'all')
   * @param {number} params.page - Page number for pagination
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query
   * @param {string|null} params.sortBy - Backend sort field
   * @param {string} params.sortOrder - Backend sort order ('asc' or 'desc')
   * @returns {Promise<Object>} Response data containing summary, report, and analytics
   */
  async getSummaryReport(params = {}) {
    const {
      period = "all",
      page = 1,
      limit = 10,
      search = "",
      sortBy = null,
      sortOrder = "asc",
    } = params;

    try {
      // Attempt to call the real API
      const queryParams = { period, page, limit };
      if (search && String(search).trim() !== "") {
        const s = String(search).trim();
        // include common synonyms to maximize compatibility with backend
        queryParams.search = s;
        queryParams.q = s;
        queryParams.query = s;
        queryParams.keyword = s;
      }
      if (sortBy) {
        queryParams.sortBy = sortBy;
        queryParams.sortOrder = sortOrder;
      }

      const response = await axios.get(`${API_CONFIG.BASE_URL}/summary`, {
        params: queryParams,
        headers: getAuthHeaders(),
      });
```

- [ ] **Step 3: Verify the service now contains the sort contract fields**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" grep -n "sortBy\|sortOrder" -- src/js/services/reportService.js
```

Expected: output shows the doc comment, destructuring, and query parameter forwarding lines.

- [ ] **Step 4: Rebuild after the service change**

Run:
```bash
npm --prefix ".worktrees/wave1-dashboard-reporting-runtime" run build
```

Expected: build passes.

- [ ] **Step 5: Commit the request-contract fix**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" add src/js/services/reportService.js && \
git -C ".worktrees/wave1-dashboard-reporting-runtime" commit -m "$(cat <<'EOF'
fix: forward dashboard report sort contract
EOF
)"
```

Expected: one commit containing only the service-layer fix.

---

### Task 5: Remove the duplicate sort handler block from the dashboard component

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/js/features/dashboard/dashboard.js:115-117`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/js/features/dashboard/dashboard.js:682-708`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/js/features/dashboard/dashboard.js:858-885`

- [ ] **Step 1: Prove the imported dashboard file still defines two `changeSort(field)` methods**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" grep -n "changeSort(field)" -- src/js/features/dashboard/dashboard.js
```

Expected: two matches.

- [ ] **Step 2: Keep the top-level `currentSort` state and delete the older duplicate sort block near the map view section**

Delete this entire block:
```js
    /**
     * Sorting functionality
     */
    currentSort: { field: null, direction: "asc" },

    changeSort(field) {
      if (this.currentSort.field === field) {
        this.currentSort.direction =
          this.currentSort.direction === "asc" ? "desc" : "asc";
      } else {
        this.currentSort.field = field;
        this.currentSort.direction = "asc";
      }

      // Here you can implement actual sorting logic
      console.log("Sorting by:", field, this.currentSort.direction);
    },

    /**
     * Get sort icon (exact same as attendance table)
     */
    getSortIcon(fieldName) {
      if (this.currentSort.field !== fieldName) {
        return ""; // No icon if field is not being sorted
      }

      return this.currentSort.direction === "asc" ? "↑" : "↓";
    },
```

Keep this as the only active sort implementation:
```js
    changeSort(field) {
      const allowedSortFields = ["full_name", "status", "attendance_date"];
      if (!allowedSortFields.includes(field)) {
        return;
      }

      if (this.filters.sortBy === field) {
        this.filters.sortOrder =
          this.filters.sortOrder === "asc" ? "desc" : "asc";
      } else {
        this.filters.sortBy = field;
        this.filters.sortOrder = "asc";
      }

      this.currentSort = {
        field: this.filters.sortBy,
        direction: this.filters.sortOrder,
      };
      this.filters.page = 1;
      this.loadSummaryData();
    },

    getSortIcon(fieldName) {
      if (this.currentSort.field !== fieldName) {
        return "";
      }

      return this.currentSort.direction === "asc" ? "↑" : "↓";
    },
```

- [ ] **Step 3: Verify only one `changeSort(field)` method remains**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" grep -n "changeSort(field)" -- src/js/features/dashboard/dashboard.js
```

Expected: one match.

- [ ] **Step 4: Rebuild after the dashboard cleanup**

Run:
```bash
npm --prefix ".worktrees/wave1-dashboard-reporting-runtime" run build
```

Expected: build passes.

- [ ] **Step 5: Commit the dashboard sort-handler cleanup**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" add src/js/features/dashboard/dashboard.js && \
git -C ".worktrees/wave1-dashboard-reporting-runtime" commit -m "$(cat <<'EOF'
fix: keep single dashboard sort handler
EOF
)"
```

Expected: one commit containing only the duplicate-handler cleanup.

---

### Task 6: Align the dashboard report table body with the Attendance Date header

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/partials/table/table-dashboard-report.html:130-148`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/partials/table/table-dashboard-report.html:219-233`

- [ ] **Step 1: Confirm the imported table still shows `Attendance Date` in the header but `log.work_hour` in the body**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" grep -n "Attendance Date\|log.work_hour" -- src/partials/table/table-dashboard-report.html
```

Expected: one header match and one body match.

- [ ] **Step 2: Replace the body cell so the fourth column renders `attendance_date`, not `work_hour`**

Replace this block:
```html
            <!-- Work Hour -->
            <td
              class="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white"
            >
              <span x-text="log.work_hour || '-'"> </span>
            </td>
```

With this block:
```html
            <!-- Attendance Date -->
            <td
              class="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white"
            >
              <span x-text="log.attendance_date || '-'"> </span>
            </td>
```

- [ ] **Step 3: Verify the table no longer references `log.work_hour` in the rendered column**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" grep -n "log.work_hour" -- src/partials/table/table-dashboard-report.html
```

Expected: no output.

- [ ] **Step 4: Rebuild after the table alignment change**

Run:
```bash
npm --prefix ".worktrees/wave1-dashboard-reporting-runtime" run build
```

Expected: build passes.

- [ ] **Step 5: Commit the table alignment fix**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" add src/partials/table/table-dashboard-report.html && \
git -C ".worktrees/wave1-dashboard-reporting-runtime" commit -m "$(cat <<'EOF'
fix: align dashboard report attendance date column
EOF
)"
```

Expected: one commit containing only the table-body fix.

---

### Task 7: Run the Wave 1 exit gate and prepare the handoff

**Files:**
- Review: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/js/features/dashboard/dashboard.js`
- Review: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/js/services/reportService.js`
- Review: `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/wave1-dashboard-reporting-runtime/src/partials/table/table-dashboard-report.html`
- Review: `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-28-working-tree-stream-separation-design.md:151-185`

- [ ] **Step 1: Verify the Wave 1 worktree only differs from `origin/develop` in the intended files**

Run:
```bash
git -C ".worktrees/wave1-dashboard-reporting-runtime" diff --name-status origin/develop...HEAD
```

Expected: only the three Wave 1 files appear unless you intentionally added a tiny support change to keep the branch buildable.

- [ ] **Step 2: Run the final Wave 1 build gate**

Run:
```bash
npm --prefix ".worktrees/wave1-dashboard-reporting-runtime" run build
```

Expected: build passes.

- [ ] **Step 3: Record the still-open runtime truth as a verification note, not as a hidden assumption**

Write this exact note in your review summary / PR draft:
```text
REQUIRES REPO VERIFICATION:
- confirm backend accepts sortBy and sortOrder for the summary endpoint,
- confirm end-to-end server-driven sorting behavior in the browser,
- confirm attendance_date values render in the intended human-readable format for real API payloads.
```

- [ ] **Step 4: Confirm Gate A is satisfied before starting Wave 2 planning**

Use this checklist:
```text
[ ] no duplicate changeSort implementation remains
[ ] reportService forwards sortBy and sortOrder when provided
[ ] table body column matches Attendance Date header
[ ] npm run build passes
[ ] unresolved backend/runtime truths are explicitly marked REQUIRES REPO VERIFICATION
```

Expected: all five boxes are checked before moving on.
