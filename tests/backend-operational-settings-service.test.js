import test from "node:test";
import assert from "node:assert/strict";

import {
  BackendOperationalSettingsService,
  OPERATIONAL_SETTINGS_URL,
  assertAllowedOperationalSettingsPayload,
  assertOperationalSettingsResponse,
} from "../src/js/services/backendOperationalSettingsService.js";

const CANONICAL_SETTINGS = {
  geofenceRadiusDefaultM: 100,
  autoCheckoutIdleMin: 10,
  autoCheckoutTBufferMin: 30,
  lateCheckoutToleranceMin: 15,
  defaultShiftEnd: "17:00:00",
  wfaRequestRadiusM: 100,
};

test("assertAllowedOperationalSettingsPayload rejects AHP threshold and unknown keys", () => {
  assert.throws(
    () =>
      assertAllowedOperationalSettingsPayload({
        AHP_CR_THRESHOLD: "0.9",
      }),
    /Unsupported operational setting key: AHP_CR_THRESHOLD/,
  );

  assert.throws(
    () =>
      assertAllowedOperationalSettingsPayload({
        ahpCrThreshold: 0.9,
      }),
    /Unsupported operational setting key: ahpCrThreshold/,
  );
});

test("getOperationalSettings reads the backend canonical raw typed object", async () => {
  const seenConfigs = [];
  const service = new BackendOperationalSettingsService(async (config) => {
    seenConfigs.push(config);
    return { data: CANONICAL_SETTINGS };
  });

  const settings = await service.getOperationalSettings();

  assert.deepEqual(settings, CANONICAL_SETTINGS);
  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: OPERATIONAL_SETTINGS_URL,
    },
  ]);
});

test("updateOperationalSettings patches canonical backend fields and returns latest state", async () => {
  const seenConfigs = [];
  const service = new BackendOperationalSettingsService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        ...CANONICAL_SETTINGS,
        autoCheckoutIdleMin: config.data.autoCheckoutIdleMin,
        defaultShiftEnd: "18:00:00",
      },
    };
  });

  const settings = await service.updateOperationalSettings({
    autoCheckoutIdleMin: 12,
    defaultShiftEnd: "18:00",
  });

  assert.equal(settings.autoCheckoutIdleMin, 12);
  assert.equal(settings.defaultShiftEnd, "18:00:00");
  assert.deepEqual(seenConfigs, [
    {
      method: "patch",
      url: OPERATIONAL_SETTINGS_URL,
      data: {
        autoCheckoutIdleMin: 12,
        defaultShiftEnd: "18:00",
      },
    },
  ]);
});

test("assertOperationalSettingsResponse rejects incomplete backend state", () => {
  assert.throws(
    () =>
      assertOperationalSettingsResponse({
        geofenceRadiusDefaultM: 100,
      }),
    /missing fields: autoCheckoutIdleMin, autoCheckoutTBufferMin, lateCheckoutToleranceMin, defaultShiftEnd, wfaRequestRadiusM/,
  );
});
