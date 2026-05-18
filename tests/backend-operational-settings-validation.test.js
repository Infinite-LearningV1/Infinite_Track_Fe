import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultBackendOperationalSettingsForm,
  hasBackendOperationalSettingsChanges,
  validateBackendOperationalSettingsForm,
} from "../src/js/features/backendOperationalSettings/backendOperationalSettings.js";

test("validateBackendOperationalSettingsForm requires all five INF-142 fields", () => {
  const errors = validateBackendOperationalSettingsForm(
    createDefaultBackendOperationalSettingsForm(),
  );

  assert.deepEqual(errors, {
    GEOFENCE_RADIUS_DEFAULT_M: "GEOFENCE_RADIUS_DEFAULT_M wajib diisi dengan bilangan bulat.",
    AUTO_CHECKOUT_IDLE_MIN: "AUTO_CHECKOUT_IDLE_MIN wajib diisi dengan bilangan bulat.",
    AUTO_CHECKOUT_TBUFFER_MIN: "AUTO_CHECKOUT_TBUFFER_MIN wajib diisi dengan bilangan bulat.",
    LATE_CHECKOUT_TOLERANCE_MIN: "LATE_CHECKOUT_TOLERANCE_MIN wajib diisi dengan bilangan bulat.",
    DEFAULT_SHIFT_END: "DEFAULT_SHIFT_END wajib diisi dalam format HH:mm.",
  });
});

test("validateBackendOperationalSettingsForm accepts valid shell-only input", () => {
  const errors = validateBackendOperationalSettingsForm({
    GEOFENCE_RADIUS_DEFAULT_M: "100",
    AUTO_CHECKOUT_IDLE_MIN: "15",
    AUTO_CHECKOUT_TBUFFER_MIN: "10",
    LATE_CHECKOUT_TOLERANCE_MIN: "120",
    DEFAULT_SHIFT_END: "17:00",
  });

  assert.deepEqual(errors, {});
});

test("hasBackendOperationalSettingsChanges compares normalized values", () => {
  const baseline = {
    GEOFENCE_RADIUS_DEFAULT_M: "100",
    AUTO_CHECKOUT_IDLE_MIN: "15",
    AUTO_CHECKOUT_TBUFFER_MIN: "10",
    LATE_CHECKOUT_TOLERANCE_MIN: "120",
    DEFAULT_SHIFT_END: "17:00",
  };

  assert.equal(
    hasBackendOperationalSettingsChanges({ ...baseline }, baseline),
    false,
  );

  assert.equal(
    hasBackendOperationalSettingsChanges(
      {
        ...baseline,
        AUTO_CHECKOUT_IDLE_MIN: "20",
      },
      baseline,
    ),
    true,
  );
});
