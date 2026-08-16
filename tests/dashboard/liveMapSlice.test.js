import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLiveMapViewModel,
  createLiveMapSliceState,
} from "../../src/js/services/dashboard/liveMapSlice.js";
import { createDashboardCockpitStateFromSources } from "../../src/js/services/dashboardCockpitService.js";

test("liveMapSlice maps today-locations rows only and does not need analytics fallback markers", () => {
  const response = {
    success: true,
    data: [
      {
        user_id: 1,
        full_name: "Rina",
        latitude: -6.2,
        longitude: 106.8,
      },
    ],
  };

  const result = buildLiveMapViewModel(response);

  assert.equal(result.locations.length, 1);
  assert.deepEqual(result.locations[0], {
    user_id: 1,
    full_name: "Rina",
    latitude: -6.2,
    longitude: 106.8,
  });
});

test("cockpit hero consumes the dedicated live-map slice instead of rebuilding from a raw response", () => {
  const liveMapSlice = createLiveMapSliceState(
    {
      data: [
        {
          attendance_id: "att_001",
          full_name: "Andi Wijaya",
          latitude: -0.9,
          longitude: 119.8,
        },
      ],
    },
    { range: "current_month" },
  );

  const cockpit = createDashboardCockpitStateFromSources({
    analyticsResponse: { data: {} },
    todayLocations: liveMapSlice,
  });

  assert.equal(cockpit.hero.state, "ready");
  assert.equal(cockpit.hero.data.source, "attendance.today-locations");
  assert.equal(cockpit.hero.data.locations.length, 1);
  assert.equal(cockpit.hero.data.locations[0].latitude, -0.9);
  assert.equal(cockpit.hero.data.locations[0].modeColor, "#2563eb");
  assert.equal(cockpit.hero.data.modeSummary.total, 1);
});

test("liveMapSlice preserves valid empty payloads while marking malformed payloads invalid", () => {
  const validEmpty = buildLiveMapViewModel({ data: [] });
  const malformed = buildLiveMapViewModel({ data: {} });

  assert.deepEqual(validEmpty.locations, []);
  assert.equal(validEmpty.authority, "attendance.today-locations");
  assert.equal(malformed.locations, false);
  assert.equal(malformed.authority, "attendance.today-locations");
});

test("cockpit hero keeps malformed today-locations conservative without preview markers", () => {
  const validEmptyCockpit = createDashboardCockpitStateFromSources({
    analyticsResponse: { data: {} },
    todayLocations: createLiveMapSliceState({ data: [] }),
  });
  const malformedCockpit = createDashboardCockpitStateFromSources({
    analyticsResponse: { data: {} },
    todayLocations: createLiveMapSliceState({ data: {} }),
  });

  assert.equal(validEmptyCockpit.hero.state, "empty");
  assert.equal(malformedCockpit.hero.state, "needsData");
  assert.match(malformedCockpit.hero.message, /payload is invalid/i);
  assert.equal(malformedCockpit.hero.data, null);
});
