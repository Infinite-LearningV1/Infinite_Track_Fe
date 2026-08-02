# INF-269 Attendance Table Layout Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present Management Attendance as one coherent table frame with explicit Detail/Delete actions, Indonesian weekday dates, compact work-duration totals, and plain two-line-clamped location text.

**Architecture:** Keep the existing server-driven Attendance query/detail/delete state unchanged. Add one pure feature-owned presentation module, expose its functions through the existing Alpine factory, then move the toolbar into the table shell and bind the revised cells/actions in the built HTML artifact.

**Tech Stack:** Multi-page HTML, Alpine.js, JavaScript ES modules, Tailwind CSS, Webpack/PostCSS, Node `node:test`, parse5.

## Global Constraints

- Work only in `E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\inf-269-attendance-audit-explorer` on `feature/inf-269-attendance-audit-explorer`.
- Web FE-only: do not change Backend code, API parameters, response normalization, or runtime data.
- Preserve Backend row order and the existing server-driven search, filters, sorting, pagination, detail, and permanent-delete recovery.
- Keep the seven columns: Pegawai, Tanggal, Kehadiran, Mode, Status, Lokasi, Aksi.
- Keep Mode and Status as Backend-label-first categorical badges.
- Remove only the Location badge; Location must remain list-summary text and must never use list coordinates or initialize a map.
- Detail and Delete actions must remain accessible and must call the existing canonical state actions.
- Do not perform a live destructive delete during runtime verification.
- Treat the established 20 non-Attendance full-suite failures as a separately reported baseline; do not claim the full suite is green.

## File and Interface Map

- Create `src/js/features/attendance/attendancePresentation.js`: pure date, duration, and location presentation functions.
- Create `tests/attendance-presentation.test.js`: exhaustive pure-helper contract tests.
- Modify `src/js/features/attendance/attendanceLog.js`: expose presentation helpers and a detail-loading predicate to Alpine.
- Modify `src/management-attendance.html`: remove the separate toolbar card and leave page composition to the Attendance table partial.
- Modify `src/partials/table/table-attendance.html`: own the unified frame, toolbar, state feedback, explicit actions, and revised cell bindings.
- Modify `tests/attendance-page-composition.test.js`: lock one-frame source composition and Alpine helper exposure.
- Modify `tests/attendance-audit-state.test.js`: lock detail-button loading identity if needed by the state predicate.
- Modify `tests/attendance-audit-table.test.js`: lock explicit actions, non-clickable rows, and truthful cell bindings.
- Modify `tests/attendance-built-page-contract.test.js`: inspect the production-built DOM for the complete one-frame/action/presentation contract.
- Modify `tests/attendance-truthfulness-template.test.js` only where existing Location or Alpha expectations conflict with the approved design.

---

### Task 1: Add pure Attendance presentation helpers

**Files:**

- Create: `src/js/features/attendance/attendancePresentation.js`
- Create: `tests/attendance-presentation.test.js`
- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `tests/attendance-page-composition.test.js`

**Interfaces:**

- Consumes: canonical list values `attendanceDate: string`, `workHour: string`, and `location: { available: boolean, description: unknown }`.
- Produces: `formatAttendanceDateLabel(value): string`, `formatAttendanceWorkDuration(value): string`, and `getAttendanceLocationText(location): string`.
- Alpine exposes the same three function names without mutating list rows.

- [ ] **Step 1: Write failing pure-helper tests**

Create `tests/attendance-presentation.test.js` with explicit examples:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  formatAttendanceDateLabel,
  formatAttendanceWorkDuration,
  getAttendanceLocationText,
} from "../src/js/features/attendance/attendancePresentation.js";

test("formats Backend date-only evidence with Indonesian weekday", () => {
  assert.equal(formatAttendanceDateLabel("2026-07-23"), "Kamis, 23 Juli 2026");
  assert.equal(
    formatAttendanceDateLabel("2024-02-29"),
    "Kamis, 29 Februari 2024",
  );
  assert.equal(formatAttendanceDateLabel("2026-02-30"), "-");
  assert.equal(formatAttendanceDateLabel("2026/07/23"), "-");
  assert.equal(formatAttendanceDateLabel(""), "-");
});

test("formats Backend HH:mm work duration as compact Indonesian copy", () => {
  assert.equal(formatAttendanceWorkDuration("10:15"), "10j 15m");
  assert.equal(formatAttendanceWorkDuration("10:00"), "10j");
  assert.equal(formatAttendanceWorkDuration("00:15"), "15m");
  assert.equal(formatAttendanceWorkDuration("00:00"), "0m");
  assert.equal(formatAttendanceWorkDuration("10:60"), "Durasi tidak tersedia");
  assert.equal(
    formatAttendanceWorkDuration(undefined),
    "Durasi tidak tersedia",
  );
});

test("derives plain Location copy only from list availability and description", () => {
  assert.equal(
    getAttendanceLocationText({ available: true, description: "Kantor Palu" }),
    "Kantor Palu",
  );
  assert.equal(
    getAttendanceLocationText({ available: true, description: "   " }),
    "Lokasi tersedia",
  );
  assert.equal(
    getAttendanceLocationText({
      available: false,
      description: "Koordinat lama",
    }),
    "Lokasi tidak tersedia",
  );
});
```

- [ ] **Step 2: Run the helper test and confirm RED**

Run:

```powershell
node --test tests/attendance-presentation.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` because `attendancePresentation.js` does not exist.

- [ ] **Step 3: Implement the pure presentation module**

Create `src/js/features/attendance/attendancePresentation.js`:

```js
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const WORK_DURATION_PATTERN = /^(\d+):([0-5]\d)$/;

const INDONESIAN_DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatAttendanceDateLabel(value) {
  if (typeof value !== "string") return "-";
  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return "-";

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "-";
  }

  return INDONESIAN_DATE_FORMATTER.format(date);
}

export function formatAttendanceWorkDuration(value) {
  if (typeof value !== "string") return "Durasi tidak tersedia";
  const match = WORK_DURATION_PATTERN.exec(value.trim());
  if (!match) return "Durasi tidak tersedia";

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isSafeInteger(hours)) return "Durasi tidak tersedia";

  const parts = [];
  if (hours > 0) parts.push(`${hours}j`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(" ") || "0m";
}

export function getAttendanceLocationText(location = {}) {
  if (location?.available !== true) return "Lokasi tidak tersedia";
  const description =
    typeof location.description === "string" ? location.description.trim() : "";
  return description || "Lokasi tersedia";
}
```

- [ ] **Step 4: Expose helpers through the Alpine Attendance factory**

Import the three functions in `attendanceLog.js` and expose them on the returned state object by reference:

```js
import {
  formatAttendanceDateLabel,
  formatAttendanceWorkDuration,
  getAttendanceLocationText,
} from "./attendancePresentation.js";

// In the returned state object:
formatAttendanceDateLabel,
formatAttendanceWorkDuration,
getAttendanceLocationText,
```

Extend `tests/attendance-page-composition.test.js`:

```js
for (const helper of [
  "formatAttendanceDateLabel",
  "formatAttendanceWorkDuration",
  "getAttendanceLocationText",
]) {
  assert.equal(typeof pageState[helper], "function", helper);
}
```

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run:

```powershell
node --test tests/attendance-presentation.test.js tests/attendance-page-composition.test.js tests/attendance-list-row.test.js
```

Expected: all tests pass; strict list normalization remains unchanged.

- [ ] **Step 6: Format, check, and commit Task 1**

Run:

```powershell
npx prettier --write src/js/features/attendance/attendancePresentation.js src/js/features/attendance/attendanceLog.js tests/attendance-presentation.test.js tests/attendance-page-composition.test.js
git diff --check
git add src/js/features/attendance/attendancePresentation.js src/js/features/attendance/attendanceLog.js tests/attendance-presentation.test.js tests/attendance-page-composition.test.js
git commit -m "feat(attendance): add audit presentation helpers"
```

---

### Task 2: Unify the Attendance frame and expose explicit actions

**Files:**

- Modify: `src/management-attendance.html`
- Modify: `src/partials/table/table-attendance.html`
- Modify: `src/js/features/attendance/attendanceLog.js`
- Modify: `tests/attendance-page-composition.test.js`
- Modify: `tests/attendance-audit-state.test.js`
- Modify: `tests/attendance-audit-table.test.js`
- Modify: `tests/attendance-built-page-contract.test.js`

**Interfaces:**

- Consumes: existing `searchQuery`, `onSearchChange()`, filter partial state, `tableState`, `openAttendanceDetail(id)`, `confirmDelete(record)`, and `deleteState.submitting`.
- Produces: one `data-attendance-audit-shell`, child markers `data-attendance-toolbar`, `data-attendance-table-region`, and `data-attendance-pagination`, plus `isAttendanceDetailLoadingFor(id): boolean`.

- [ ] **Step 1: Write failing built-composition assertions for one frame**

Refactor the build setup in `tests/attendance-built-page-contract.test.js` into a cached document helper so additional tests reuse one production build. Add assertions equivalent to:

```js
const shells = descendants(document).filter(
  (node) => attribute(node, "data-attendance-audit-shell") !== null,
);
assert.equal(shells.length, 1);

const shell = shells[0];
assert.ok(
  findDescendant(shell, (node) => attribute(node, "id") === "attendanceSearch"),
);
assert.ok(
  findDescendant(
    shell,
    (node) => attribute(node, "id") === "attendanceTableFilterTrigger",
  ),
);
assert.ok(
  findDescendant(
    shell,
    (node) => attribute(node, "data-attendance-table-region") !== null,
  ),
);
assert.ok(
  findDescendant(
    shell,
    (node) => attribute(node, "data-attendance-pagination") !== null,
  ),
);
```

Update `tests/attendance-page-composition.test.js` to assert the page contains only the table include and does not contain `id="attendanceSearch"` or the filter include directly.

- [ ] **Step 2: Write failing explicit-action and non-clickable-row tests**

Replace the old row-operability assertions in `tests/attendance-audit-table.test.js`:

```js
test("uses explicit Detail and Delete controls instead of a hidden row action", () => {
  assert.doesNotMatch(table, /<tr[^>]+tabindex="0"/);
  assert.doesNotMatch(table, /<tr[^>]+@click="openAttendanceDetail/);
  assert.doesNotMatch(
    table,
    /@keydown\.(?:enter|space)[^=]*="openAttendanceDetail/,
  );
  assert.doesNotMatch(
    table,
    /Buka aksi data absensi|x-data="\{ open: false \}"/,
  );

  assert.match(
    table,
    /@click\.stop="openAttendanceDetail\(log\.idAttendance\)"/,
  );
  assert.match(table, /title="Detail Absensi"/);
  assert.match(table, /@click\.stop="confirmDelete\(log\)"/);
  assert.match(table, /title="Hapus Absensi"/);
});
```

Add built-DOM assertions that the Aksi cell contains exactly two row action buttons with `type="button"`, the exact click bindings, and accessible labels.

- [ ] **Step 3: Write a failing identity-specific detail loading test**

Add to `tests/attendance-audit-state.test.js`:

```js
test("detail action loading belongs only to the selected attendance row", () => {
  const state = attendanceLogAlpineData({ browser: null });
  state.detailState.loading = true;
  state.detailState.selectedId = 42;

  assert.equal(state.isAttendanceDetailLoadingFor(42), true);
  assert.equal(state.isAttendanceDetailLoadingFor("42"), true);
  assert.equal(state.isAttendanceDetailLoadingFor(43), false);

  state.detailState.loading = false;
  assert.equal(state.isAttendanceDetailLoadingFor(42), false);
});
```

- [ ] **Step 4: Run Task 2 tests and confirm RED**

Run:

```powershell
npm run build
node --test tests/attendance-page-composition.test.js tests/attendance-audit-state.test.js tests/attendance-audit-table.test.js tests/attendance-built-page-contract.test.js
```

Expected: failures show the toolbar outside the shell, overflow action menu/row handlers still present, and the detail-loading predicate missing.

- [ ] **Step 5: Move the toolbar into the always-present Attendance shell**

In `management-attendance.html`, replace the current `space-y` wrapper, standalone search/filter card, and separate Attendance table include with only:

```html
<div class="space-y-5 sm:space-y-6">
  <include src="./partials/table/table-attendance.html"></include>
</div>
```

In `table-attendance.html`, make the one outer card always present:

```html
<div
  data-attendance-audit-shell
  class="overflow-hidden rounded-2xl border border-gray-200 bg-white pt-4 dark:border-gray-800 dark:bg-white/[0.03]"
>
  <div
    data-attendance-toolbar
    class="mb-4 flex flex-col gap-3 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
  >
    <div class="relative min-w-0 flex-1 lg:max-w-xl">
      <div
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
      >
        <svg
          class="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          ></path>
        </svg>
      </div>
      <label class="sr-only" for="attendanceSearch">Cari data kehadiran</label>
      <input
        id="attendanceSearch"
        type="search"
        x-model="searchQuery"
        @input="onSearchChange()"
        :disabled="tableState.loading"
        placeholder="Cari nama atau NIP/NIM..."
        class="focus:border-brand-500 focus:ring-brand-500/20 block w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 pl-10 text-sm text-gray-900 placeholder-gray-500 transition focus:ring-4 focus:outline-none disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
      />
    </div>
    <include src="./attendance-table-filter.html"></include>
  </div>
</div>
```

Inside that outer card, move the current state blocks without changing their conditions or copy. Their exact order is:

1. `x-show="tableState.loading && !tableState.hasSuccessfulPage"` initial loader;
2. `x-show="tableState.error && !tableState.hasSuccessfulPage && !tableState.loading"` initial error and retry;
3. `x-show="tableState.hasSuccessfulPage"` refresh-error banner and refresh loader;
4. `<div data-attendance-table-region>` containing the existing horizontal-scroll wrapper, table, rows, and empty state;
5. `<div data-attendance-pagination x-show="pagination.total_records > 0">` containing the existing page-size and pagination controls.

Remove the inner rounded card that currently wraps only a successful page. The outer `data-attendance-audit-shell` is the sole rounded/bordered frame for every state.

- [ ] **Step 6: Implement the detail-loading predicate**

Add to the Alpine state object in `attendanceLog.js`:

```js
isAttendanceDetailLoadingFor(attendanceId) {
  return (
    this.detailState.loading &&
    this.detailState.selectedId !== null &&
    this.detailState.selectedId !== undefined &&
    String(this.detailState.selectedId) === String(attendanceId)
  );
},
```

- [ ] **Step 7: Replace row and overflow actions with two icon buttons**

Remove `tabindex`, row `@click`, and row Enter/Space bindings. Keep only visual hover styling on `<tr>`.

Replace the overflow menu with an action group using Management User's visual pattern:

```html
<div class="flex items-center justify-center space-x-3">
  <button
    type="button"
    @click.stop="openAttendanceDetail(log.idAttendance)"
    :disabled="isAttendanceDetailLoadingFor(log.idAttendance)"
    :aria-busy="isAttendanceDetailLoadingFor(log.idAttendance)"
    :aria-label="`Lihat detail absensi ${log.fullName || ''}`"
    title="Detail Absensi"
    class="focus:ring-brand-500 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors hover:bg-blue-200 focus:ring-2 focus:outline-none disabled:cursor-wait disabled:opacity-60 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-800/50"
  >
    <svg
      x-show="!isAttendanceDetailLoadingFor(log.idAttendance)"
      class="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      ></path>
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      ></path>
    </svg>
    <svg
      x-show="isAttendanceDetailLoadingFor(log.idAttendance)"
      class="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        stroke-width="3"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M12 3a9 9 0 00-9 9h3a6 6 0 016-6V3z"
      ></path>
    </svg>
  </button>
  <button
    type="button"
    @click.stop="confirmDelete(log)"
    :disabled="deleteState.submitting"
    :aria-label="`Hapus data absensi ${log.fullName || ''}`"
    title="Hapus Absensi"
    class="focus:ring-error-500 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 transition-colors hover:bg-red-200 focus:ring-2 focus:outline-none disabled:cursor-wait disabled:opacity-60 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-800/50"
  >
    <svg
      class="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      ></path>
    </svg>
  </button>
</div>
```

Use the existing Management User eye/trash SVG paths. Do not add Edit or another menu.

- [ ] **Step 8: Run Task 2 tests and confirm GREEN**

Run:

```powershell
npm run build
node --test tests/attendance-page-composition.test.js tests/attendance-audit-state.test.js tests/attendance-audit-table.test.js tests/attendance-built-page-contract.test.js tests/attendance-filter-popover.test.js tests/attendance-delete-recovery.test.js
```

Expected: all tests pass; toolbar/filter bindings, detail loading, and delete recovery remain canonical.

- [ ] **Step 9: Format, check, and commit Task 2**

Run:

```powershell
npx prettier --write src/management-attendance.html src/partials/table/table-attendance.html src/js/features/attendance/attendanceLog.js tests/attendance-page-composition.test.js tests/attendance-audit-state.test.js tests/attendance-audit-table.test.js tests/attendance-built-page-contract.test.js
git diff --check
git add src/management-attendance.html src/partials/table/table-attendance.html src/js/features/attendance/attendanceLog.js tests/attendance-page-composition.test.js tests/attendance-audit-state.test.js tests/attendance-audit-table.test.js tests/attendance-built-page-contract.test.js
git commit -m "feat(attendance): unify audit table frame"
```

---

### Task 3: Bind weekday, duration, and plain clamped Location presentation

**Files:**

- Modify: `src/partials/table/table-attendance.html`
- Modify: `tests/attendance-audit-table.test.js`
- Modify: `tests/attendance-built-page-contract.test.js`
- Modify: `tests/attendance-truthfulness-template.test.js`

**Interfaces:**

- Consumes: Task 1 functions `formatAttendanceDateLabel`, `formatAttendanceWorkDuration`, and `getAttendanceLocationText` exposed through Alpine.
- Produces: one-line Indonesian date text, a two-line Kehadiran cell, and plain two-line-clamped Location text with matching `title`.

- [ ] **Step 1: Write failing cell-binding tests**

Update `tests/attendance-audit-table.test.js` to assert:

```js
assert.match(table, /formatAttendanceDateLabel\(log\.attendanceDate\)/);
assert.match(table, /formatAttendanceWorkDuration\(log\.workHour\)/);
assert.match(table, /getAttendanceCheckoutText\(log\)/);
assert.doesNotMatch(table, /String\(log\.status \|\| ''\).*alpha/s);

assert.match(table, /x-text="getAttendanceLocationText\(log\.location\)"/);
assert.match(table, /:title="getAttendanceLocationText\(log\.location\)"/);
assert.match(table, /line-clamp-2/);
assert.doesNotMatch(table, /log\.location\.available \? 'bg-success/);
```

The Location assertion must target the Location cell or element, not reject legitimate badge colors elsewhere in the table.

- [ ] **Step 2: Write failing built-artifact behavior assertions**

In `tests/attendance-built-page-contract.test.js`, locate the real Tanggal, Kehadiran, and Lokasi body-cell bindings. Assert:

```js
assert.equal(
  attribute(dateText, "x-text"),
  "formatAttendanceDateLabel(log.attendanceDate)",
);
assert.equal(
  attribute(durationText, "x-text"),
  "formatAttendanceWorkDuration(log.workHour)",
);
assert.equal(
  attribute(locationText, "x-text"),
  "getAttendanceLocationText(log.location)",
);
assert.equal(
  attribute(locationText, ":title"),
  "getAttendanceLocationText(log.location)",
);
assert.match(attribute(locationText, "class"), /line-clamp-2/);
assert.doesNotMatch(attribute(locationText, "class"), /rounded-full|bg-/);
```

Use `evaluateBinding` with the real Alpine helper functions or equivalent pure imports to prove `2026-07-23` renders `Kamis, 23 Juli 2026`, `10:15` renders `10j 15m`, and long Location text is preserved as the `title` value.

- [ ] **Step 3: Run Task 3 tests and confirm RED**

Run:

```powershell
npm run build
node --test tests/attendance-presentation.test.js tests/attendance-audit-table.test.js tests/attendance-built-page-contract.test.js tests/attendance-truthfulness-template.test.js
```

Expected: failures show raw date/work-duration bindings, the Alpha-only branch, and badge-wrapped Location.

- [ ] **Step 4: Bind the approved date and Kehadiran layout**

Use:

```html
<p
  class="text-theme-sm whitespace-nowrap text-gray-800 dark:text-white/90"
  x-text="formatAttendanceDateLabel(log.attendanceDate)"
></p>
```

Replace the Alpha split with one consistent Kehadiran block:

```html
<div>
  <p class="text-theme-sm text-gray-800 dark:text-white/90">
    <span x-text="log.timeIn || '-'"></span>
    <span aria-hidden="true"> - </span>
    <span x-text="getAttendanceCheckoutText(log)"></span>
  </p>
  <p class="text-theme-xs mt-0.5 text-gray-500 dark:text-gray-400">
    <span x-text="formatAttendanceWorkDuration(log.workHour)"></span>
    <span
      x-show="log.checkoutState === 'open'"
      class="text-warning-600 dark:text-warning-400 ml-1 font-medium"
      >· Checkout terbuka</span
    >
  </p>
</div>
```

Do not alter `getAttendanceCheckoutText` or weaken the exact-open condition.

- [ ] **Step 5: Replace the Location badge with clamped plain text**

Use one element for visible and complete text:

```html
<p
  class="text-theme-xs line-clamp-2 max-w-[260px] leading-5 text-gray-600 dark:text-gray-300"
  x-text="getAttendanceLocationText(log.location)"
  :title="getAttendanceLocationText(log.location)"
></p>
```

Remove the status dot, `rounded-full`, badge padding, availability color classes, and inline ternary copy. Do not change Mode or Status badge markup.

- [ ] **Step 6: Run Task 3 tests and confirm GREEN**

Run:

```powershell
npm run build
node --test tests/attendance-presentation.test.js tests/attendance-audit-table.test.js tests/attendance-built-page-contract.test.js tests/attendance-truthfulness-template.test.js tests/attendance-checkout-presentation.test.js tests/attendance-list-row.test.js
```

Expected: all tests pass; open/completed/unknown checkout semantics remain unchanged.

- [ ] **Step 7: Format, check, and commit Task 3**

Run:

```powershell
npx prettier --write src/partials/table/table-attendance.html tests/attendance-audit-table.test.js tests/attendance-built-page-contract.test.js tests/attendance-truthfulness-template.test.js
git diff --check
git add src/partials/table/table-attendance.html tests/attendance-audit-table.test.js tests/attendance-built-page-contract.test.js tests/attendance-truthfulness-template.test.js
git commit -m "feat(attendance): polish audit row presentation"
```

---

### Task 4: Verify the complete layout polish and runtime boundary

**Files:**

- Modify only if formatting or test evidence requires it: files changed in Tasks 1-3.

**Interfaces:**

- Verifies the full branch at the final HEAD; produces no new feature behavior.

- [ ] **Step 1: Run every Attendance test**

Run:

```powershell
$attendanceTests = Get-ChildItem tests -Filter 'attendance-*.test.js' | Sort-Object Name | ForEach-Object FullName
node --test $attendanceTests
```

Expected: zero Attendance failures and a total greater than the pre-polish baseline of 138 tests.

- [ ] **Step 2: Run shared action, focus, map, and auth-boundary regressions**

Run:

```powershell
$sharedTests = @(
  'tests/map-detail-modal-truthfulness.test.js',
  'tests/user-detail-drawer-lifecycle.test.js',
  'tests/focus-trap.test.js'
)
$authTests = Get-ChildItem tests -Filter 'auth-*.test.js' | Sort-Object Name | ForEach-Object FullName
node --test @sharedTests $authTests
```

Expected: no new failure compared with the known auth fixture baseline; report any inherited failure explicitly.

- [ ] **Step 3: Run production build and patch hygiene**

Run:

```powershell
npm run build
git diff --check
git status --short
git diff --stat 87f5fb2...HEAD
```

Expected: build exits 0; the diff contains only the approved Attendance layout polish, tests, spec, and plan.

- [ ] **Step 4: Compare the full repository suite with the inherited baseline**

Run:

```powershell
node --test
```

Expected: no Attendance failure and no increase beyond the established 20 non-Attendance failures. Record exact pass/fail totals; do not describe this repository-wide gate as green while any inherited failure remains.

- [ ] **Step 5: Verify runtime from the exact isolated worktree**

Before replacing port 3000, inspect its listener PID and command line. Ensure the listener serves this worktree, then open:

```text
http://127.0.0.1:3000/management-attendance.html
```

Verify when authentication permits:

- toolbar and table share one visible frame;
- explicit eye and trash buttons match Management User's action language;
- rows themselves do not open detail;
- date displays `Kamis, 23 Juli 2026`-style copy on one line;
- Kehadiran displays time range plus compact duration;
- Location is plain text, clamps after two lines, and exposes full text on hover;
- existing search/filter/sort/pagination/detail/delete-state behavior remains intact.

Do not execute a live permanent delete. Record authenticated interactions as `Needs Verification` if the browser redirects to Sign In.

- [ ] **Step 6: Request final whole-change review**

Generate a review package from `87f5fb2` to final HEAD. Ask a fresh reviewer to check layout/source-of-truth integrity, action accessibility, formatting edge cases, Location truthfulness, built-artifact test quality, and regressions in query/detail/delete behavior. Fix every Critical or Important finding through TDD before branch handoff.

- [ ] **Step 7: Commit only if verification changed tracked files**

If formatting or a necessary test correction changed tracked files:

```powershell
git add src tests docs
git commit -m "test(attendance): verify audit layout polish"
```

Otherwise leave the verified feature commits unchanged.
