import test from "node:test";
import assert from "node:assert/strict";
import { buildWfaFahpViewModel } from "../../src/js/services/dashboard/wfaFahpSlice.js";

const fixture = (
  candidates = [
    {
      place_id: "place-1",
      name: "Workspace One",
      status: "ranked",
      final_score: 88.25,
      final_label: "Sangat Layak",
      rank: 1,
    },
  ],
) => ({
  success: true,
  data: {
    candidates,
    searchCriteria: { center_latitude: -6.2 },
    methodology: {
      criteria_weights: {
        location_type: 0.4,
        distance_factor: 0.3,
        facility_score: 0.3,
        consistency_ratio: 0.06,
      },
    },
  },
});

test("maps ranked WFA analysis to cockpit view model", () => {
  const result = buildWfaFahpViewModel(fixture());
  assert.equal(result.type, "wfa");
  assert.equal(result.status, "ready");
  assert.equal(result.needsData, false);
  assert.deepEqual(result.consistency, {
    CR: 0.06,
    threshold: null,
    isConsistent: null,
    summaryLabel: null,
  });
  assert.deepEqual(result.rankingPreview.items[0], {
    id: "place-1",
    name: "Workspace One",
    label: "Sangat Layak",
    score: 88.25,
    rank: 1,
  });
});
test("keeps empty and insufficient evidence truthful", () => {
  assert.equal(buildWfaFahpViewModel(fixture([])).status, "empty");
  const result = buildWfaFahpViewModel(
    fixture([{ status: "insufficient_facility_data" }]),
  );
  assert.equal(result.status, "needs_data");
  assert.deepEqual(result.rankingPreview.items, []);
});
test("rejects malformed WFA contract", () => {
  assert.throws(
    () => buildWfaFahpViewModel({ success: true, data: { candidates: [] } }),
    /Invalid WFA FAHP analysis contract/,
  );
});
