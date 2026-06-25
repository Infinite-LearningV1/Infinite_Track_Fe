import test from "node:test";
import assert from "node:assert/strict";

import { buildGeofenceEvidenceViewModel } from "../../src/js/services/dashboard/geofenceEvidenceSlice.js";

test("geofenceEvidenceSlice maps supporting evidence state without treating it as attendance truth", () => {
  const response = {
    requested_window: { period: "30d", from: null, to: null },
    executed_window: { from: "2026-05-01", to: "2026-05-30" },
    data: {
      status: "available",
      authority: "context_only",
      final_attendance_authority: "attendance_records",
      raw_counts: {
        total_events: 4,
        enter_events: 2,
        exit_events: 2,
        unique_users: 2,
      },
    },
  };

  const result = buildGeofenceEvidenceViewModel(response);

  assert.equal(result.rawCounts.total_events, 4);
  assert.equal(result.authority, "context_only");
  assert.equal(result.finalAttendanceAuthority, "attendance_records");
});
