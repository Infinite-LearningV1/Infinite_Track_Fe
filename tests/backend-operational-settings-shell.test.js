import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_FILE_PATH = fileURLToPath(import.meta.url);
const TEST_DIR = path.dirname(TEST_FILE_PATH);
const SIDEBAR_PATH = path.resolve(
  TEST_DIR,
  "../src/partials/common/sidebar.html",
);
const ROLE_ACCESS_PATH = path.resolve(
  TEST_DIR,
  "../src/js/utils/roleBasedAccess.js",
);

test("operational settings is wired as a main navigation item and Admin/Management protection", () => {
  const sidebar = fs.readFileSync(SIDEBAR_PATH, "utf8");
  const roleBasedAccess = fs.readFileSync(ROLE_ACCESS_PATH, "utf8");

  assert.ok(
    sidebar.includes('href="management-backend-settings.html"'),
    "Expected sidebar to include management-backend-settings.html",
  );

  assert.ok(
    sidebar.includes("Operational Settings"),
    "Expected sidebar to label the page as Operational Settings",
  );

  assert.ok(
    sidebar.includes("page === 'managementBackendSettings'"),
    "Expected Operational Settings main item active state to include managementBackendSettings page key",
  );

  assert.doesNotMatch(
    sidebar,
    /menu-dropdown-item[\s\S]*Backend Settings/,
    "Expected Operational Settings to be removed from the Management submenu",
  );

  assert.match(
    roleBasedAccess,
    /"\/management-backend-settings\.html": \[ROLES\.ADMIN, ROLES\.MANAGEMENT\]/,
    "Expected role-based access map to protect /management-backend-settings.html for Admin and Management",
  );
});
