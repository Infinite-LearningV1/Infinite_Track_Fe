import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_FILE_PATH = fileURLToPath(import.meta.url);
const TEST_DIR = path.dirname(TEST_FILE_PATH);
const PAGE_PATH = path.resolve(
  TEST_DIR,
  "../src/management-backend-settings.html",
);
const FORM_PARTIAL_PATH = path.resolve(
  TEST_DIR,
  "../src/partials/form/form-backend-operational-settings.html",
);
const INDEX_PATH = path.resolve(TEST_DIR, "../src/js/index.js");
const ROLE_ACCESS_PATH = path.resolve(
  TEST_DIR,
  "../src/js/utils/roleBasedAccess.js",
);

test("backend operational settings page shell is registered and stays truthful", () => {
  const pageHtml = fs.readFileSync(PAGE_PATH, "utf8");
  const formPartial = fs.readFileSync(FORM_PARTIAL_PATH, "utf8");
  const indexJs = fs.readFileSync(INDEX_PATH, "utf8");
  const roleBasedAccess = fs.readFileSync(ROLE_ACCESS_PATH, "utf8");

  assert.ok(
    pageHtml.includes("page: 'managementBackendSettings'"),
    "Expected page shell to register managementBackendSettings page key",
  );

  assert.ok(
    pageHtml.includes('x-data="backendOperationalSettingsAlpineData()"'),
    "Expected page shell to mount backendOperationalSettingsAlpineData()",
  );

  assert.ok(
    pageHtml.includes("./partials/form/form-backend-operational-settings.html"),
    "Expected page shell to include backend operational settings form partial",
  );

  assert.match(
    indexJs,
    /window\.backendOperationalSettingsAlpineData\s*=\s*backendOperationalSettingsAlpineData;/,
    "Expected index.js to expose backendOperationalSettingsAlpineData globally",
  );

  assert.match(
    roleBasedAccess,
    /"\/management-backend-settings\.html": \[ROLES\.ADMIN, ROLES\.MANAGEMENT\]/,
    "Expected role-based access map to protect /management-backend-settings.html for Admin/Management",
  );

  for (const settingLabel of [
    "GEOFENCE_RADIUS_DEFAULT_M",
    "AUTO_CHECKOUT_IDLE_MIN",
    "AUTO_CHECKOUT_TBUFFER_MIN",
    "LATE_CHECKOUT_TOLERANCE_MIN",
    "DEFAULT_SHIFT_END",
  ]) {
    assert.ok(
      formPartial.includes(settingLabel),
      `Expected form partial to render ${settingLabel}`,
    );
  }

  for (const backendField of [
    "geofenceRadiusDefaultM",
    "autoCheckoutIdleMin",
    "autoCheckoutTBufferMin",
    "lateCheckoutToleranceMin",
    "defaultShiftEnd",
  ]) {
    assert.ok(
      formPartial.includes(backendField),
      `Expected form partial to render backend field ${backendField}`,
    );
  }

  assert.ok(
    !formPartial.includes('x-model="form.AHP_CR_THRESHOLD"'),
    "Expected form partial to keep AHP_CR_THRESHOLD non-editable",
  );

  assert.ok(
    formPartial.includes("not secrets") ||
      formPartial.includes("bukan secret") ||
      formPartial.includes("bukan secrets"),
    "Expected form partial to explain these settings are not secrets",
  );
});
