import test from "node:test";
import assert from "node:assert/strict";

import { buildLiveMapViewModel } from "../../src/js/services/dashboard/liveMapSlice.js";

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
