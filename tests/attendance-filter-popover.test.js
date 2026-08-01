import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const filterPath = fileURLToPath(
  new URL(
    "../src/partials/table/attendance-table-filter.html",
    import.meta.url,
  ),
);
const pagePath = fileURLToPath(
  new URL("../src/management-attendance.html", import.meta.url),
);

test("attendance page composes one visible search with the combined filter partial", () => {
  const page = readFileSync(pagePath, "utf8");

  assert.match(page, /placeholder="Cari nama atau NIP\/NIM\.\.\."/);
  assert.match(
    page,
    /<include\s+src="\.\/partials\/table\/attendance-table-filter\.html"\s*><\/include>/,
  );
  assert.equal(
    (page.match(/placeholder="Cari nama atau NIP\/NIM\.\.\."/g) || []).length,
    1,
  );
});

test("combined filter exposes accessible open and dismiss interactions", () => {
  const filter = readFileSync(filterPath, "utf8");

  assert.match(filter, /:aria-expanded="isFilterOpen"/);
  assert.match(filter, /aria-controls="attendanceTableFilterPopover"/);
  assert.match(filter, /@click="openFilter\(\)"/);
  assert.match(filter, /@click\.outside="closeFilter\(\)"/);
  assert.match(filter, /@keydown\.escape\.window="closeFilter\(\)"/);
  assert.match(filter, /id="attendanceTableFilterPopover"/);
});

test("combined filter binds every canonical draft and canonical actions", () => {
  const filter = readFileSync(filterPath, "utf8");

  assert.match(filter, /x-model="draftFilters\.from"/);
  assert.match(filter, /x-model="draftFilters\.to"/);
  assert.match(filter, /x-model="draftFilters\.mode"/);
  assert.match(filter, /x-model="draftFilters\.status"/);
  assert.match(filter, /x-model="draftFilters\.checkoutState"/);
  assert.match(filter, /@click="applyFilters\(\)"/);
  assert.match(filter, /@click="clearFilters\(\)"/);
  assert.doesNotMatch(filter, /sortBy|sortOrder|toggleSort|aria-sort/);
});

test("combined filter uses locked values and communicates applied count and errors", () => {
  const filter = readFileSync(filterPath, "utf8");

  for (const value of [
    "wfo",
    "wfh",
    "wfa",
    "ontime",
    "late",
    "early",
    "alpha",
    "completed",
    "open",
  ]) {
    assert.match(filter, new RegExp(`value="${value}"`));
  }
  assert.match(filter, /x-show="activeFilterCount > 0"/);
  assert.match(filter, /x-text="activeFilterCount"/);
  assert.match(filter, /role="alert"/);
  assert.match(filter, /x-text="filterValidationMessage"/);
});

test("combined filter remains usable while the table reports loading or errors", () => {
  const filter = readFileSync(filterPath, "utf8");

  assert.match(filter, /:disabled="tableState\.loading"/);
  assert.match(filter, /x-show="tableState\.loading"/);
  assert.match(filter, /x-show="tableState\.error"/);
  assert.match(filter, /@click="fetchAttendance\(\)"/);
  assert.match(filter, /sm:w-\[24rem\]/);
  assert.match(filter, /max-sm:fixed/);
});
