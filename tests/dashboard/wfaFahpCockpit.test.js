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
    type: "wfa",
    status: "ready",
    requested_window: { from: "2026-08-01", to: "2026-08-15" },
    criteria_weights: [
      { key: "location_type", value: 0.4 },
      { key: "distance_factor", value: 0.3 },
      { key: "facility_score", value: 0.3 },
    ],
    consistency: { CR: 0.06, threshold: 0.1, is_consistent: true },
    methodology: {
      version: "wfa_fahp_v1",
      weighting_method: "backend-authored",
    },
    ranking_preview: {
      top_n: 5,
      items: [
        {
          rank: 1,
          location_key: "place-1",
          location_label: "Workspace One",
          score: 88.25,
          label: "Sangat Layak",
          criteria_summary: {
            location_type_score: 90,
            distance_factor_score: 80,
            facility_score: 85,
          },
          approved_booking_count: 2,
          analyzable_booking_count: 2,
        },
      ],
    },
    evidence: {
      approved_booking_count: 2,
      analyzable_booking_count: 2,
      excluded_missing_snapshot_count: 0,
      excluded_incompatible_snapshot_count: 0,
      unique_location_count: 1,
      ranked_location_count: 1,
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
  assert.equal(panel.data.decisions[0].isConsistent, true);
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


test("WFA empty and needs-data states explain date-range evidence truthfully", () => {
  for (const [status, expected] of [
    ["empty", /No eligible Approved WFA evidence exists in the selected date range/i],
    ["needs_data", /Approved WFA bookings exist in the selected date range.*reproducible FAHP criterion evidence is insufficient/i],
  ]) {
    const response = structuredClone(rankedResponse);
    response.data.status = status;
    response.data.ranking_preview.items = [];
    const panel = createDashboardCockpitStateFromSources({
      fuzzyAhpResponse: response,
      fuzzyAhpActiveType: "wfa",
    }).bottomPanels.find((item) => item.key === "fuzzyAhp");
    assert.match(panel.message, expected);
  }
});
