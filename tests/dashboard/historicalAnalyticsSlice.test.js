import test from "node:test";
import assert from "node:assert/strict";

import { buildHistoricalAnalyticsViewModel } from "../../src/js/services/dashboard/historicalAnalyticsSlice.js";

test("historicalAnalyticsSlice maps only historical analytics fields and ignores geofence/map ownership", () => {
  const response = {
    requested_window: { period: "30d", from: null, to: null },
    executed_window: { from: "2026-05-01", to: "2026-05-30" },
    data: {
      executive_kpis: { attendance_rate: 91 },
      historical_trend: {
        points: [{ date: "2026-05-01", on_time: 4, late: 1, alpha: 0 }],
      },
      mode_mix: { totals: { wfo: 4, wfh: 2, wfa: 1 } },
      insights: { items: [] },
      geofence_evidence_context: { should_not_be_used: true },
    },
  };

  const result = buildHistoricalAnalyticsViewModel(response);

  assert.equal(result.kpis.attendance_rate, 91);
  assert.equal(result.modeMix.totals.wfo, 4);
  assert.equal(
    Object.prototype.hasOwnProperty.call(result, "geofenceEvidence"),
    false,
  );
});
