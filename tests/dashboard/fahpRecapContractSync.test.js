import test from "node:test";
import assert from "node:assert/strict";

import { buildFahpDashboardRecapViewModel } from "../../src/js/services/dashboard/fahpRecapSlice.js";

test("FAHP dashboard recap contract sync accepts only the new dashboard recap contract shape", () => {
  const response = {
    success: true,
    filter: {
      category: "discipline",
      analysis_type: "summary",
    },
    data: {
      status: "ready",
      sections: [
        {
          key: "discipline",
          title: "Discipline",
          summary: "Top category available",
          topRank: "Tepat Waktu",
          distribution: { "Tepat Waktu": 0.82 },
          consistency: 0.04,
          generatedAt: "2026-06-25T10:00:00.000Z",
        },
      ],
    },
  };

  const result = buildFahpDashboardRecapViewModel(response);

  assert.equal(result.status, "ready");
  assert.deepEqual(result.filter, {
    category: "discipline",
    analysis_type: "summary",
  });
  assert.equal(result.sections.length, 1);
  assert.deepEqual(result.sections[0], {
    key: "discipline",
    title: "Discipline",
    summary: "Top category available",
    topRank: "Tepat Waktu",
    distribution: { "Tepat Waktu": 0.82 },
    consistency: 0.04,
    generatedAt: "2026-06-25T10:00:00.000Z",
  });
});

test("FAHP dashboard recap contract sync rejects malformed or incomplete recap payloads", () => {
  assert.throws(
    () => buildFahpDashboardRecapViewModel({ success: true, data: { status: "ready" } }),
    /Invalid FAHP dashboard recap contract/,
  );

  assert.throws(
    () =>
      buildFahpDashboardRecapViewModel({
        success: true,
        filter: {
          category: "discipline",
          analysis_type: "summary",
        },
        sections: [],
      }),
    /Invalid FAHP dashboard recap contract/,
  );
});
