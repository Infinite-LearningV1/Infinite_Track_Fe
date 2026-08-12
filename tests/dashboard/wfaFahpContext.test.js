import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultWfaFahpContext,
  buildWfaFahpRequestParams,
  validateWfaFahpContext,
} from "../../src/js/features/dashboard/wfaFahpContext.js";

test("default WFA context is page-local empty state", () => {
  assert.deepEqual(createDefaultWfaFahpContext(), {
    latitude: "",
    longitude: "",
    scheduleDate: "",
    radiusMeters: "",
    validationError: null,
  });
});
test("serializes explicit WFA coordinates and date", () => {
  assert.deepEqual(
    buildWfaFahpRequestParams({
      latitude: "-6.200000",
      longitude: "106.816666",
      scheduleDate: "2026-08-14",
      radiusMeters: "",
    }),
    { lat: -6.2, lon: 106.816666, schedule_date: "2026-08-14" },
  );
});
test("serializes explicit radius only when provided", () => {
  assert.deepEqual(
    buildWfaFahpRequestParams({
      latitude: -6.2,
      longitude: 106.816666,
      scheduleDate: "2026-08-14",
      radiusMeters: "3500",
    }),
    {
      lat: -6.2,
      lon: 106.816666,
      schedule_date: "2026-08-14",
      radius_meters: 3500,
    },
  );
});
for (const [field, value, message] of [
  ["latitude", "91", "Latitude must be a number between -90 and 90."],
  ["longitude", "-181", "Longitude must be a number between -180 and 180."],
  [
    "scheduleDate",
    "2026-02-30",
    "Schedule date must be a valid YYYY-MM-DD date.",
  ],
  [
    "scheduleDate",
    "14-08-2026",
    "Schedule date must be a valid YYYY-MM-DD date.",
  ],
  ["radiusMeters", "0", "Radius must be a positive number when provided."],
  ["radiusMeters", "abc", "Radius must be a positive number when provided."],
]) {
  test(`rejects invalid ${field}`, () => {
    const context = {
      latitude: "-6.2",
      longitude: "106.8",
      scheduleDate: "2026-08-14",
      radiusMeters: "",
    };
    context[field] = value;
    const result = validateWfaFahpContext(context);
    assert.equal(result.isValid, false);
    assert.equal(result.message, message);
    assert.throws(
      () => buildWfaFahpRequestParams(context),
      (error) => error.code === "WFA_FAHP_CONTEXT_INVALID",
    );
  });
}
