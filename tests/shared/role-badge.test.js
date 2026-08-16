import test from "node:test";
import assert from "node:assert/strict";

import { roleBadgeClass } from "../../src/js/utils/roleBadge.js";

test("roleBadgeClass maps each known role to a distinct badge.html-derived palette", () => {
  const adminClass = roleBadgeClass("Admin");
  const managementClass = roleBadgeClass("Management");
  const employeeClass = roleBadgeClass("Employee");
  const internshipClass = roleBadgeClass("Internship");

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
  assert.equal(roleBadgeClass("admin"), roleBadgeClass("Admin"));
  assert.equal(roleBadgeClass("MANAGEMENT"), roleBadgeClass("Management"));
});

test("roleBadgeClass falls back to the gray/light palette for unknown or absent roles", () => {
  const unknownClass = roleBadgeClass("SomeOtherRole");
  const emptyClass = roleBadgeClass("");
  const nullClass = roleBadgeClass(null);
  const undefinedClass = roleBadgeClass(undefined);

  for (const cls of [unknownClass, emptyClass, nullClass, undefinedClass]) {
    assert.match(cls, /bg-gray-100/);
    assert.match(cls, /text-gray-700/);
    assert.match(cls, /dark:bg-white\/5/);
  }
});
