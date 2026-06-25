import test from "node:test";
import assert from "node:assert/strict";

import { createDashboardPageState } from "../../src/js/features/dashboard/dashboard.js";

test("dashboard page orchestration keeps one slice failure local and refreshes FAHP independently", async () => {
  const page = createDashboardPageState({
    fetchHistorical: async () => ({ status: "ready" }),
    fetchGeofence: async () => ({ status: "error", error: "geofence failed" }),
    fetchLiveMap: async () => ({ status: "ready" }),
    fetchFahpRecap: async () => ({ status: "ready" }),
  });

  await page.loadDashboard();

  assert.equal(page.geofenceSlice.status, "error");
  assert.equal(page.historicalSlice.status, "ready");
  assert.equal(page.liveMapSlice.status, "ready");

  await page.refreshFahpRecap();

  assert.equal(page.fahpSlice.status, "ready");
});
