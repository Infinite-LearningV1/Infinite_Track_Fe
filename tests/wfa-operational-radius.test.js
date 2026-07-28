import test from "node:test";
import assert from "node:assert/strict";

import {
  createBackendOperationalSettingsFormFromResponse,
  toBackendOperationalSettingsPayload,
  validateBackendOperationalSettingsForm,
} from "../src/js/features/backendOperationalSettings/backendOperationalSettings.js";
import {
  OPERATIONAL_SETTING_BACKEND_FIELDS,
  OPERATIONAL_SETTING_KEYS,
} from "../src/js/features/backendOperationalSettings/backendOperationalSettings.constants.js";
import { assertOperationalSettingsResponse } from "../src/js/services/backendOperationalSettingsService.js";

const CANONICAL = {
  geofenceRadiusDefaultM: 100,
  autoCheckoutIdleMin: 10,
  autoCheckoutTBufferMin: 30,
  lateCheckoutToleranceMin: 15,
  defaultShiftEnd: "17:00:00",
  wfaRequestRadiusM: 125,
};

test("operational settings contract requires WFA request radius", () => {
  assert.ok(OPERATIONAL_SETTING_KEYS.includes("wfaRequestRadiusM"));
  assert.ok(OPERATIONAL_SETTING_BACKEND_FIELDS.includes("wfaRequestRadiusM"));
  assert.equal(assertOperationalSettingsResponse(CANONICAL), CANONICAL);

  const { wfaRequestRadiusM, ...missingRadius } = CANONICAL;
  assert.throws(
    () => assertOperationalSettingsResponse(missingRadius),
    /wfaRequestRadiusM/,
  );
});

test("WFA radius projects to a string form and back to an integer payload", () => {
  const form = createBackendOperationalSettingsFormFromResponse(CANONICAL);
  assert.equal(form.wfaRequestRadiusM, "125");

  const payload = toBackendOperationalSettingsPayload(form);
  assert.equal(payload.wfaRequestRadiusM, 125);
});

test("WFA radius accepts only positive integer input", () => {
  const validForm = createBackendOperationalSettingsFormFromResponse(CANONICAL);
  assert.deepEqual(validateBackendOperationalSettingsForm(validForm), {});

  for (const invalidValue of ["", "0", "-1", "1.5", "abc"]) {
    const errors = validateBackendOperationalSettingsForm({
      ...validForm,
      wfaRequestRadiusM: invalidValue,
    });
    assert.match(errors.wfaRequestRadiusM, /bilangan bulat positif/);
  }
});
