import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const table = readFileSync(
  join(root, "src", "partials", "table", "table-user.html"),
  "utf8",
);

const filterPartial = readFileSync(
  join(root, "src", "partials", "table", "user-table-filter.html"),
  "utf8",
);

test("table-user.html includes the filter partial instead of inlining its markup", () => {
  assert.match(
    table,
    /<include\s+src=["']\.\/user-table-filter\.html["']\s*>\s*<\/include>/,
    "table-user.html must include ./user-table-filter.html rather than inline the popover",
  );
  assert.doesNotMatch(
    table,
    /userTableFilterPopover/,
    "the filter popover markup must not be hardcoded in table-user.html",
  );
});

test("Filter button carries aria-expanded and aria-controls wiring", () => {
  assert.match(filterPartial, /:aria-expanded="isFilterOpen"/);
  assert.match(filterPartial, /aria-controls="userTableFilterPopover"/);
  assert.match(filterPartial, /@click="isFilterOpen = !isFilterOpen"/);
  assert.match(filterPartial, /type="button"/);
});

test("Filter popover panel has the anchored id and x-show binding", () => {
  assert.match(filterPartial, /id="userTableFilterPopover"/);
  assert.match(filterPartial, /x-show="isFilterOpen"/);
});

test("popover closes on outside click and Escape", () => {
  assert.match(filterPartial, /@click\.outside="isFilterOpen = false"/);
  assert.match(
    filterPartial,
    /@keydown\.escape\.window="isFilterOpen = false"/,
  );
});

test("Role, Divisi, and Status Lokasi WFH selects bind their x-model state", () => {
  assert.match(filterPartial, /x-model="filterRole"/);
  assert.match(filterPartial, /x-model="filterDivision"/);
  assert.match(filterPartial, /x-model="filterWfhStatus"/);
});

test("Divisi options bind division.name, not division.id", () => {
  assert.match(filterPartial, /:value="division\.name"/);
  assert.doesNotMatch(filterPartial, /:value="division\.id"/);
});

test("Status Lokasi WFH exposes exact Tersedia and Belum diatur options", () => {
  assert.match(filterPartial, /value="Tersedia"/);
  assert.match(filterPartial, />Tersedia</);
  assert.match(filterPartial, /value="Belum diatur"/);
  assert.match(filterPartial, />Belum diatur</);
});

test("footer buttons wire Reset to resetFilters() and Apply to applyFilters()", () => {
  assert.match(filterPartial, /@click="resetFilters\(\)"/);
  assert.match(filterPartial, /@click="applyFilters\(\)"/);
});

test("Role, Divisi, and Status Lokasi WFH selects each have a visible label", () => {
  const labelOpenTags = filterPartial.match(/<label\b/g) || [];
  assert.equal(
    labelOpenTags.length >= 3,
    true,
    "expected at least 3 labels in the filter popover",
  );
  assert.match(filterPartial, /for="userTableFilterRole"[\s\S]{0,200}>Role</);
  assert.match(
    filterPartial,
    /for="userTableFilterDivision"[\s\S]{0,200}>Divisi \/ Program</,
  );
  assert.match(
    filterPartial,
    /for="userTableFilterWfhStatus"[\s\S]{0,200}>Status Lokasi WFH</,
  );
});

test("availableRoles feeds the Role select via x-for", () => {
  assert.match(filterPartial, /x-for="role in availableRoles"/);
});

test("availableDivisions feeds the Divisi select via x-for and is disabled when empty", () => {
  assert.match(filterPartial, /x-for="division in availableDivisions"/);
  assert.match(filterPartial, /:disabled="availableDivisions\.length === 0"/);
});
