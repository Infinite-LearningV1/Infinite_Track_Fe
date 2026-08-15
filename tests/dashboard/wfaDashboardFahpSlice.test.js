import test from "node:test";
import assert from "node:assert/strict";
import { createWfaDashboardFahpSliceState } from "../../src/js/services/dashboard/wfaDashboardFahpSlice.js";

function response(overrides = {}) {
  return {
    success: true,
    data: {
      type: "wfa",
      type_label: "WFA",
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
            location_key: "loc-1",
            location_label: "Cafe A",
            score: 88.43,
            label: "Sangat Tinggi",
            criteria_summary: {
              location_type_score: 90,
              distance_factor_score: 75,
              facility_score: 86,
            },
            approved_booking_count: 4,
            analyzable_booking_count: 4,
          },
        ],
      },
      evidence: {
        approved_booking_count: 4,
        analyzable_booking_count: 4,
        excluded_missing_snapshot_count: 0,
        excluded_incompatible_snapshot_count: 0,
        unique_location_count: 1,
        ranked_location_count: 1,
      },
      ...overrides,
    },
  };
}

test("normalizes academic WFA date-range contract", () => {
  const slice = createWfaDashboardFahpSliceState(response(), {
    type: "wfa",
    from: "2026-08-01",
    to: "2026-08-15",
  });
  assert.equal(slice.kind, "wfa_date_range_analysis");
  assert.equal(slice.criteriaWeights[0].displayLabel, "Tipe Lokasi");
  assert.equal(slice.consistency.isConsistent, true);
  assert.equal(slice.rankingPreview.items[0].locationLabel, "Cafe A");
  assert.equal(slice.evidence.analyzable_booking_count, 4);
});

test("fails closed for wrong type and user ranking semantics", () => {
  assert.throws(
    () => createWfaDashboardFahpSliceState(response({ type: "smart_ac" })),
    /WFA.*type/i,
  );
  assert.throws(
    () =>
      createWfaDashboardFahpSliceState(
        response({
          ranking_preview: {
            top_n: 5,
            items: [
              {
                rank: 1,
                location_key: "u-1",
                location_label: "User",
                user_id: 7,
                score: 88,
                criteria_summary: {
                  location_type_score: 90,
                  distance_factor_score: 75,
                  facility_score: 86,
                },
              },
            ],
          },
        }),
      ),
    /physical locations/i,
  );
});

test("rejects missing window and invalid evidence counts", () => {
  assert.throws(
    () =>
      createWfaDashboardFahpSliceState(response({ requested_window: null })),
    /requested_window/i,
  );
  assert.throws(
    () =>
      createWfaDashboardFahpSliceState(
        response({
          evidence: {
            approved_booking_count: 1,
            analyzable_booking_count: 2,
            excluded_missing_snapshot_count: 0,
            excluded_incompatible_snapshot_count: 0,
            unique_location_count: 1,
            ranked_location_count: 1,
          },
        }),
      ),
    /evidence/i,
  );
});
