import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFahpRequestParams,
  createDefaultFahpFilterState,
} from "../../src/js/features/dashboard/fahpFilterState.js";
import {
  buildFahpDashboardRecapViewModel,
  createFahpRecapSliceState,
} from "../../src/js/services/dashboard/fahpRecapSlice.js";

test("FAHP recap slice uses independent filter params and recap-only contract", () => {
  const filterState = createDefaultFahpFilterState();
  const params = buildFahpRequestParams({
    ...filterState,
    category: "discipline",
  });

  assert.deepEqual(params, {
    category: "discipline",
    analysis_type: null,
  });

  const result = buildFahpDashboardRecapViewModel({
    success: true,
    filter: params,
    data: {
      status: "ready",
      sections: [
        {
          key: "discipline",
          title: "Discipline",
          summary: "Top category",
          topRank: "Tepat Waktu",
          distribution: { "Tepat Waktu": 0.82 },
          consistency: 0.04,
          generatedAt: "2026-06-25T10:00:00.000Z",
        },
      ],
    },
  });

  assert.equal(result.sections[0].key, "discipline");
});

test("FAHP recap slice state preserves recap data as the only dashboard-side source", () => {
  const request = {
    category: "discipline",
    analysis_type: "summary",
  };
  const response = {
    success: true,
    filter: request,
    data: {
      status: "ready",
      sections: [
        {
          key: "discipline",
          title: "Discipline",
          summary: "Top category",
          topRank: "Tepat Waktu",
          distribution: { "Tepat Waktu": 0.82 },
          consistency: 0.04,
          generatedAt: "2026-06-25T10:00:00.000Z",
        },
      ],
    },
  };

  const state = createFahpRecapSliceState(response, request);

  assert.deepEqual(state, {
    status: "ready",
    data: {
      status: "ready",
      sections: [
        {
          key: "discipline",
          title: "Discipline",
          summary: "Top category",
          topRank: "Tepat Waktu",
          distribution: { "Tepat Waktu": 0.82 },
          consistency: 0.04,
          generatedAt: "2026-06-25T10:00:00.000Z",
        },
      ],
      filter: request,
    },
    error: null,
    request,
    meta: {},
  });
  assert.equal(Object.prototype.hasOwnProperty.call(state, "rankings"), false);
});
