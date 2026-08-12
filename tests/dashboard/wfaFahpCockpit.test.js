import test from "node:test";
import assert from "node:assert/strict";
import {
  createDashboardCockpitStateFromSources,
  createDashboardCockpitLoadingState,
  createDashboardCockpitErrorState,
} from "../../src/js/services/dashboardCockpitService.js";
import { createFuzzyAhpViewState } from "../../src/js/components/fuzzyAhpPanel.js";

const rankedResponse = {
  success: true,
  data: {
    candidates: [
      {
        place_id: "place-1",
        name: "Workspace One",
        status: "ranked",
        final_score: 88.25,
        final_label: "Sangat Layak",
        rank: 1,
      },
    ],
    methodology: {
      criteria_weights: {
        location_type: 0.4,
        distance_factor: 0.3,
        facility_score: 0.3,
        consistency_ratio: 0.06,
      },
    },
  },
};
test("WFA raw analysis becomes canonical ready panel", () => {
  const panel = createDashboardCockpitStateFromSources({
    fuzzyAhpResponse: rankedResponse,
    fuzzyAhpActiveType: "wfa",
  }).bottomPanels.find((item) => item.key === "fuzzyAhp");
  assert.equal(panel.state, "ready");
  assert.equal(panel.data.activeType, "wfa");
  assert.equal(panel.data.decisions[0].isConsistent, null);
  assert.equal(panel.data.decisions[0].rankings[0].name, "Workspace One");
});
test("WFA errors preserve selected type", () => {
  const panel = createDashboardCockpitStateFromSources({
    fuzzyAhpError: new Error("provider unavailable"),
    fuzzyAhpActiveType: "wfa",
  }).bottomPanels.find((item) => item.key === "fuzzyAhp");
  assert.equal(panel.state, "error");
  assert.equal(panel.data.activeType, "wfa");
});
test("unknown consistency remains unavailable", () => {
  const state = createFuzzyAhpViewState(
    {
      title: "x",
      data: {
        decisions: [
          {
            key: "wfa",
            consistencyRatio: 0.06,
            consistencyThreshold: null,
            isConsistent: null,
            criteriaWeights: [],
            rankings: [],
          },
        ],
      },
    },
    "wfa",
  );
  assert.equal(state.isConsistent, null);
  assert.equal(state.consistencyStatusLabel, "Tidak tersedia");
});
test("loading and error preserve three options and active type", () => {
  for (const panel of [
    createDashboardCockpitLoadingState("wfa"),
    createDashboardCockpitErrorState("failed", "wfa"),
  ].map((state) =>
    state.bottomPanels.find((item) => item.key === "fuzzyAhp"),
  )) {
    assert.equal(panel.data.activeType, "wfa");
    assert.equal(panel.data.typeOptions.length, 3);
  }
});
