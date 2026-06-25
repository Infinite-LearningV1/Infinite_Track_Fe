import test from "node:test";
import assert from "node:assert/strict";

import { createDashboardPageState } from "../../src/js/features/dashboard/dashboard.js";

test("loadDashboard keeps a rejected geofence fetch local while other slices still update", async () => {
  const page = createDashboardPageState({
    fetchHistorical: async () => ({ status: "ready", response: "historical" }),
    fetchGeofence: async () => {
      throw new Error("geofence request failed");
    },
    fetchLiveMap: async () => ({ status: "ready", response: "live-map" }),
    fetchFahpRecap: async () => ({ status: "ready", response: "fahp" }),
  });

  await page.loadDashboard();

  assert.deepEqual(page.historicalSlice, {
    status: "ready",
    response: "historical",
  });
  assert.equal(page.geofenceSlice.status, "error");
  assert.equal(page.geofenceSlice.error, "geofence request failed");
  assert.deepEqual(page.liveMapSlice, {
    status: "ready",
    response: "live-map",
  });
  assert.deepEqual(page.fahpSlice, {
    status: "ready",
    response: "fahp",
  });
});

test("refreshFahpRecap refetches only the FAHP slice without reloading the dashboard", async () => {
  const calls = [];
  let fahpResponses = 0;
  const page = createDashboardPageState({
    fetchHistorical: async () => {
      calls.push("historical");
      return { status: "ready", response: "historical" };
    },
    fetchGeofence: async () => {
      calls.push("geofence");
      return { status: "ready", response: "geofence" };
    },
    fetchLiveMap: async () => {
      calls.push("liveMap");
      return { status: "ready", response: "live-map" };
    },
    fetchFahpRecap: async () => {
      calls.push("fahp");
      fahpResponses += 1;
      return { status: "ready", response: `fahp-${fahpResponses}` };
    },
  });

  await page.loadDashboard();
  assert.deepEqual(calls, ["historical", "geofence", "liveMap", "fahp"]);
  assert.equal(page.fahpSlice.response, "fahp-1");

  calls.length = 0;
  await page.refreshFahpRecap();

  assert.deepEqual(calls, ["fahp"]);
  assert.deepEqual(page.historicalSlice, {
    status: "ready",
    response: "historical",
  });
  assert.deepEqual(page.geofenceSlice, {
    status: "ready",
    response: "geofence",
  });
  assert.deepEqual(page.liveMapSlice, {
    status: "ready",
    response: "live-map",
  });
  assert.equal(page.fahpSlice.response, "fahp-2");
});
