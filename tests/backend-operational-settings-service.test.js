import test from "node:test";
import assert from "node:assert/strict";

import {
  assertAllowedOperationalSettingsPayload,
  getOperationalSettings,
  updateOperationalSettings,
} from "../src/js/services/backendOperationalSettingsService.js";

test("assertAllowedOperationalSettingsPayload rejects unknown setting keys", () => {
  assert.throws(
    () =>
      assertAllowedOperationalSettingsPayload({
        AHP_CR_THRESHOLD: "0.9",
      }),
    /Unsupported operational setting key: AHP_CR_THRESHOLD/,
  );
});

test("getOperationalSettings is explicit about missing backend contract", async () => {
  await assert.rejects(
    () => getOperationalSettings(),
    /contract belum tersedia/i,
  );
});

test("updateOperationalSettings accepts INF-142 keys but stays shell-only", async () => {
  await assert.rejects(
    () =>
      updateOperationalSettings({
        GEOFENCE_RADIUS_DEFAULT_M: "100",
      }),
    /persist canonical settings/i,
  );
});
