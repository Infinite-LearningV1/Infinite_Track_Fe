import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_FILE_PATH = fileURLToPath(import.meta.url);
const TEST_DIR = path.dirname(TEST_FILE_PATH);
const SIDEBAR_PATH = path.resolve(TEST_DIR, "../src/partials/common/sidebar.html");
const AUTH_GUARD_PATH = path.resolve(TEST_DIR, "../src/js/utils/authGuard.js");
const ROLE_ACCESS_PATH = path.resolve(
  TEST_DIR,
  "../src/js/utils/roleBasedAccess.js",
);

test("management backend settings is wired into navigation and admin-only protection", () => {
  const sidebar = fs.readFileSync(SIDEBAR_PATH, "utf8");
  const authGuard = fs.readFileSync(AUTH_GUARD_PATH, "utf8");
  const roleBasedAccess = fs.readFileSync(ROLE_ACCESS_PATH, "utf8");

  assert.ok(
    sidebar.includes("href=\"management-backend-settings.html\""),
    "Expected Management submenu to include management-backend-settings.html",
  );

  assert.ok(
    sidebar.includes("page === 'managementBackendSettings'"),
    "Expected Management menu active state to include managementBackendSettings page key",
  );

  assert.ok(
    authGuard.includes('"/management-backend-settings.html"'),
    "Expected auth guard protected pages to include /management-backend-settings.html",
  );

  assert.match(
    roleBasedAccess,
    /"\/management-backend-settings\.html": \[ROLES\.ADMIN\]/,
    "Expected role-based access map to protect /management-backend-settings.html for Admin only",
  );
});
