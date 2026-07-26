import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { userListAlpineData } from "../src/js/features/userManagement/userListSimple.js";

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

test("roleBadgeClass maps each known role to a distinct badge.html-derived palette", () => {
  const data = userListAlpineData();

  const adminClass = data.roleBadgeClass("Admin");
  const managementClass = data.roleBadgeClass("Management");
  const employeeClass = data.roleBadgeClass("Employee");
  const internshipClass = data.roleBadgeClass("Internship");

  assert.match(adminClass, /bg-error-50/);
  assert.match(adminClass, /text-error-600/);
  assert.match(adminClass, /dark:bg-error-500\/15/);

  assert.match(managementClass, /bg-warning-50/);
  assert.match(managementClass, /text-warning-600/);
  assert.match(managementClass, /dark:bg-warning-500\/15/);

  assert.match(employeeClass, /bg-success-50/);
  assert.match(employeeClass, /text-success-600/);
  assert.match(employeeClass, /dark:bg-success-500\/15/);

  assert.match(internshipClass, /bg-blue-light-50/);
  assert.match(internshipClass, /text-blue-light-500/);
  assert.match(internshipClass, /dark:bg-blue-light-500\/15/);

  // All four known roles must resolve to visibly distinct palettes.
  const distinct = new Set([
    adminClass,
    managementClass,
    employeeClass,
    internshipClass,
  ]);
  assert.equal(distinct.size, 4);
});

test("roleBadgeClass matching is case-insensitive", () => {
  const data = userListAlpineData();
  assert.equal(data.roleBadgeClass("admin"), data.roleBadgeClass("Admin"));
  assert.equal(
    data.roleBadgeClass("MANAGEMENT"),
    data.roleBadgeClass("Management"),
  );
});

test("roleBadgeClass falls back to the gray/light palette for unknown or absent roles", () => {
  const data = userListAlpineData();
  const unknownClass = data.roleBadgeClass("SomeOtherRole");
  const emptyClass = data.roleBadgeClass("");
  const nullClass = data.roleBadgeClass(null);
  const undefinedClass = data.roleBadgeClass(undefined);

  for (const cls of [unknownClass, emptyClass, nullClass, undefinedClass]) {
    assert.match(cls, /bg-gray-100/);
    assert.match(cls, /text-gray-700/);
    assert.match(cls, /dark:bg-white\/5/);
  }
});
