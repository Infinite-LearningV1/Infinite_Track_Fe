import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFahpRequestParams,
  createDefaultFahpFilterState,
} from "../../src/js/features/dashboard/fahpFilterState.js";
import { createFahpRecapSliceState } from "../../src/js/services/dashboard/fahpRecapSlice.js";

test("recap uses explicit dashboard type", () => {
  assert.deepEqual(buildFahpRequestParams(createDefaultFahpFilterState()), {
    type: "discipline",
  });
});
test("recap slice preserves canonical response", () => {
  const response = {
    success: true,
    data: {
      type: "discipline",
      type_label: "Discipline",
      status: "ready",
      needs_data: false,
      consistency: { CR: 0.04, is_consistent: null },
      criteria_weights: [],
      ranking_preview: { items: [] },
      distribution: {},
    },
  };
  const state = createFahpRecapSliceState(response, { type: "discipline" });
  assert.equal(state.status, "ready");
  assert.equal(state.data.consistency.isConsistent, null);
  assert.deepEqual(state.request, { type: "discipline" });
});
