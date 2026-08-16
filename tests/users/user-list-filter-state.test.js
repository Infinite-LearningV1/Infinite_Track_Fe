import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { userListAlpineData } from "../../src/js/features/userManagement/userListSimple.js";
import { roleBadgeClass } from "../../src/js/utils/roleBadge.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const listSource = readFileSync(
  join(root, "src", "js", "features", "userManagement", "userListSimple.js"),
  "utf8",
);

test("row mapping source: division falls back to null, never invented defaults", () => {
  assert.match(
    listSource,
    /division:\s*user\.division_name\s*\|\|\s*user\.division\s*\|\|\s*null/,
  );
});

test("row mapping source: createdAt/formattedCreatedAt are removed (no created_at field from the API)", () => {
  assert.doesNotMatch(listSource, /createdAt/);
  assert.doesNotMatch(listSource, /formattedCreatedAt/);
});

test("row mapping source: photo falls back to null, never invented defaults", () => {
  assert.match(listSource, /const photo = user\.photo \?\? null;/);
});

test("entriesPerPage defaults to 10", () => {
  const data = userListAlpineData();
  assert.equal(data.entriesPerPage, 10);
});

test("filter state defaults use stable IDs and canonical location status", () => {
  const data = userListAlpineData();
  assert.equal(data.isFilterOpen, false);
  assert.equal(data.filterRole, "");
  assert.equal(data.filterDivision, "");
  assert.equal(data.filterWfhStatus, "");
  assert.deepEqual(data.appliedFilters, {
    role: "",
    division: "",
    locationStatus: "",
  });
});

test("availableRoles starts empty before reference data loads", () => {
  const data = userListAlpineData();
  assert.deepEqual(data.availableRoles, []);
});

test("availableDivisions starts as an empty array before init() populates it", () => {
  const data = userListAlpineData();
  assert.deepEqual(data.availableDivisions, []);
});

// roleBadgeClass palette mapping now lives in tests/role-badge.test.js
// against the shared src/js/utils/roleBadge.js util. These two tests only
// confirm userListSimple.js delegates to that util instead of keeping its
// own copy of the mapping.
test("roleBadgeClass source delegates to the shared roleBadge util", () => {
  assert.match(
    listSource,
    /import\s*\{\s*roleBadgeClass[^}]*\}\s*from\s*"..\/..\/utils\/roleBadge\.js"/,
  );
});

test("roleBadgeClass output matches the shared roleBadge util for every role", () => {
  const data = userListAlpineData();

  for (const role of [
    "Admin",
    "Management",
    "Employee",
    "Internship",
    "SomeOtherRole",
    "",
    null,
    undefined,
  ]) {
    assert.equal(data.roleBadgeClass(role), roleBadgeClass(role));
  }
});
