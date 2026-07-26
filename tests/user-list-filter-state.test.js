import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { userListAlpineData } from "../src/js/features/userManagement/userListSimple.js";
import { roleBadgeClass } from "../src/js/utils/roleBadge.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const listSource = readFileSync(
  join(root, "src", "js", "features", "userManagement", "userListSimple.js"),
  "utf8",
);

function makeUser(overrides = {}) {
  return {
    id: 1,
    fullName: "Default User",
    role: "Admin",
    division: null,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

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
  assert.match(listSource, /photo:\s*user\.photo\s*\|\|\s*null/);
});

test("entriesPerPage defaults to 10", () => {
  const data = userListAlpineData();
  assert.equal(data.entriesPerPage, 10);
});

test("filter state defaults: drafts, appliedFilters, and popover start closed/empty", () => {
  const data = userListAlpineData();
  assert.equal(data.isFilterOpen, false);
  assert.equal(data.filterRole, "");
  assert.equal(data.filterDivision, "");
  assert.equal(data.filterWfhStatus, "");
  assert.deepEqual(data.appliedFilters, {
    role: "",
    division: "",
    wfhStatus: "",
  });
});

test("role filter narrows filteredUsers to the applied role", () => {
  const data = userListAlpineData();
  data.users = [
    makeUser({ id: 1, fullName: "Alice", role: "Admin" }),
    makeUser({ id: 2, fullName: "Bob", role: "User" }),
  ];
  data.appliedFilters = { role: "Admin", division: "", wfhStatus: "" };

  assert.deepEqual(
    data.filteredUsers.map((u) => u.id),
    [1],
  );
});

test("division filter narrows filteredUsers to the applied division", () => {
  const data = userListAlpineData();
  data.users = [
    makeUser({ id: 1, fullName: "Alice", division: "IT" }),
    makeUser({ id: 2, fullName: "Bob", division: "Finance" }),
  ];
  data.appliedFilters = { role: "", division: "IT", wfhStatus: "" };

  assert.deepEqual(
    data.filteredUsers.map((u) => u.id),
    [1],
  );
});

test("wfhStatus filter uses Tersedia/Belum diatur semantics from wfhStatusFor", () => {
  const data = userListAlpineData();
  data.users = [
    makeUser({ id: 1, fullName: "Alice", latitude: -0.9, longitude: 119.8 }),
    makeUser({ id: 2, fullName: "Bob", latitude: null, longitude: null }),
  ];

  data.appliedFilters = { role: "", division: "", wfhStatus: "Tersedia" };
  assert.deepEqual(
    data.filteredUsers.map((u) => u.id),
    [1],
  );

  data.appliedFilters = { role: "", division: "", wfhStatus: "Belum diatur" };
  assert.deepEqual(
    data.filteredUsers.map((u) => u.id),
    [2],
  );
});

test("filters compose with searchQuery", () => {
  const data = userListAlpineData();
  data.users = [
    makeUser({ id: 1, fullName: "Alice Wonder", role: "Admin" }),
    makeUser({ id: 2, fullName: "Alice Cooper", role: "User" }),
  ];
  data.searchQuery = "alice";
  data.appliedFilters = { role: "Admin", division: "", wfhStatus: "" };

  assert.deepEqual(
    data.filteredUsers.map((u) => u.id),
    [1],
  );
});

test("empty-string applied filters are no-ops", () => {
  const data = userListAlpineData();
  data.users = [
    makeUser({ id: 1, fullName: "Alice", role: "Admin", division: "IT" }),
    makeUser({ id: 2, fullName: "Bob", role: "User", division: "Finance" }),
  ];
  data.appliedFilters = { role: "", division: "", wfhStatus: "" };

  assert.deepEqual(
    data.filteredUsers.map((u) => u.id),
    [1, 2],
  );
});

test("applyFilters copies drafts into appliedFilters, closes popover, resets currentPage", () => {
  const data = userListAlpineData();
  data.isFilterOpen = true;
  data.currentPage = 3;
  data.filterRole = "Admin";
  data.filterDivision = "IT";
  data.filterWfhStatus = "Tersedia";

  data.applyFilters();

  assert.deepEqual(data.appliedFilters, {
    role: "Admin",
    division: "IT",
    wfhStatus: "Tersedia",
  });
  assert.equal(data.isFilterOpen, false);
  assert.equal(data.currentPage, 1);
});

test("resetFilters clears both draft and applied filters, resets currentPage, keeps popover state unchanged", () => {
  const data = userListAlpineData();
  data.currentPage = 4;
  data.filterRole = "Admin";
  data.filterDivision = "IT";
  data.filterWfhStatus = "Tersedia";
  data.appliedFilters = {
    role: "Admin",
    division: "IT",
    wfhStatus: "Tersedia",
  };
  data.isFilterOpen = true;

  data.resetFilters();

  assert.equal(data.filterRole, "");
  assert.equal(data.filterDivision, "");
  assert.equal(data.filterWfhStatus, "");
  assert.deepEqual(data.appliedFilters, {
    role: "",
    division: "",
    wfhStatus: "",
  });
  assert.equal(data.currentPage, 1);
  assert.equal(data.isFilterOpen, true);
});

test("availableRoles returns unique, sorted, non-empty roles from loaded users", () => {
  const data = userListAlpineData();
  data.users = [
    makeUser({ id: 1, role: "User" }),
    makeUser({ id: 2, role: "Admin" }),
    makeUser({ id: 3, role: "Admin" }),
    makeUser({ id: 4, role: "" }),
    makeUser({ id: 5, role: null }),
  ];

  assert.deepEqual(data.availableRoles, ["Admin", "User"]);
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
