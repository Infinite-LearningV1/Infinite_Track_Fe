import test from "node:test";
import assert from "node:assert/strict";
import { buildFahpDashboardRecapViewModel } from "../../src/js/services/dashboard/fahpRecapSlice.js";

test("accepts canonical dashboard recap shape", () => {
  const result = buildFahpDashboardRecapViewModel({
    success: true,
    data: {
      type: "discipline",
      type_label: "Discipline",
      status: "ready",
      needs_data: false,
      consistency: { CR: 0.04, threshold: 0.1, is_consistent: true },
      criteria_weights: [
        { key: "a", label: "A", display_label: "A", value: 0.5 },
      ],
      ranking_preview: { items: [] },
      distribution: {},
    },
  });
  assert.equal(result.type, "discipline");
  assert.equal(result.status, "ready");
  assert.equal(result.consistency.isConsistent, true);
});
test("rejects malformed recap", () => {
  assert.throws(
    () =>
      buildFahpDashboardRecapViewModel({
        success: true,
        data: { status: "ready" },
      }),
    /Invalid FAHP dashboard recap contract/,
  );
});
