import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultBackendOperationalSettingsForm,
  hasBackendOperationalSettingsChanges,
  toBackendOperationalSettingsPayload,
  validateBackendOperationalSettingsForm,
} from "../src/js/features/backendOperationalSettings/backendOperationalSettings.js";

test("validateBackendOperationalSettingsForm requires all five INF-142 fields", () => {
  const errors = validateBackendOperationalSettingsForm(
    createDefaultBackendOperationalSettingsForm(),
  );

  assert.deepEqual(errors, {
    geofenceRadiusDefaultM:
      "Radius area absensi wajib diisi dengan bilangan bulat positif.",
    autoCheckoutIdleMin:
      "Batas idle sebelum checkout otomatis wajib diisi dengan bilangan bulat positif.",
    autoCheckoutTBufferMin:
      "Waktu penyangga checkout otomatis wajib diisi dengan bilangan bulat positif.",
    lateCheckoutToleranceMin:
      "Toleransi checkout terlambat wajib diisi dengan bilangan bulat positif.",
    defaultShiftEnd:
      "Jam selesai shift default wajib diisi dalam format HH:mm.",
  });
});

test("validateBackendOperationalSettingsForm accepts valid canonical form input", () => {
  const errors = validateBackendOperationalSettingsForm({
    geofenceRadiusDefaultM: "100",
    autoCheckoutIdleMin: "15",
    autoCheckoutTBufferMin: "10",
    lateCheckoutToleranceMin: "120",
    defaultShiftEnd: "17:00",
  });

  assert.deepEqual(errors, {});
});

test("validateBackendOperationalSettingsForm rejects zero, decimals, negatives, and malformed time", () => {
  const errors = validateBackendOperationalSettingsForm({
    geofenceRadiusDefaultM: "0",
    autoCheckoutIdleMin: "10.5",
    autoCheckoutTBufferMin: "-1",
    lateCheckoutToleranceMin: " ",
    defaultShiftEnd: "24:00",
  });

  assert.deepEqual(errors, {
    geofenceRadiusDefaultM:
      "Radius area absensi wajib diisi dengan bilangan bulat positif.",
    autoCheckoutIdleMin:
      "Batas idle sebelum checkout otomatis wajib diisi dengan bilangan bulat positif.",
    autoCheckoutTBufferMin:
      "Waktu penyangga checkout otomatis wajib diisi dengan bilangan bulat positif.",
    lateCheckoutToleranceMin:
      "Toleransi checkout terlambat wajib diisi dengan bilangan bulat positif.",
    defaultShiftEnd:
      "Jam selesai shift default wajib diisi dalam format HH:mm.",
  });
});

test("hasBackendOperationalSettingsChanges compares normalized values", () => {
  const baseline = {
    geofenceRadiusDefaultM: "100",
    autoCheckoutIdleMin: "15",
    autoCheckoutTBufferMin: "10",
    lateCheckoutToleranceMin: "120",
    defaultShiftEnd: "17:00",
  };

  assert.equal(
    hasBackendOperationalSettingsChanges({ ...baseline }, baseline),
    false,
  );

  assert.equal(
    hasBackendOperationalSettingsChanges(
      {
        ...baseline,
        autoCheckoutIdleMin: "20",
      },
      baseline,
    ),
    true,
  );
});

test("toBackendOperationalSettingsPayload serializes form values for PATCH", () => {
  assert.deepEqual(
    toBackendOperationalSettingsPayload({
      geofenceRadiusDefaultM: " 100 ",
      autoCheckoutIdleMin: "15",
      autoCheckoutTBufferMin: "10",
      lateCheckoutToleranceMin: "120",
      defaultShiftEnd: "17:00",
    }),
    {
      geofenceRadiusDefaultM: 100,
      autoCheckoutIdleMin: 15,
      autoCheckoutTBufferMin: 10,
      lateCheckoutToleranceMin: 120,
      defaultShiftEnd: "17:00",
    },
  );
});
