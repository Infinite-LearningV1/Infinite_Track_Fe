import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDashboardRangeRequestParams,
  createDefaultDashboardRange,
  resolveDashboardRangeDateWindow,
  validateDashboardRange,
} from "../src/js/components/dashboardRange/dashboardRange.js";

test("createDefaultDashboardRange returns current_month as default", () => {
  assert.deepEqual(createDefaultDashboardRange(), {
    period: "current_month",
    from: null,
    to: null,
  });
});

test("validateDashboardRange accepts current_month without dates", () => {
  assert.deepEqual(
    validateDashboardRange({ period: "current_month", from: null, to: null }),
    {
      isValid: true,
      message: "",
    },
  );
});

test("validateDashboardRange rejects custom without from/to", () => {
  assert.deepEqual(
    validateDashboardRange({ period: "custom", from: null, to: null }),
    {
      isValid: false,
      message: "Custom period requires both from and to dates",
    },
  );
});

test("validateDashboardRange rejects custom window longer than 31 days", () => {
  assert.deepEqual(
    validateDashboardRange({
      period: "custom",
      from: "2026-05-01",
      to: "2026-06-01",
    }),
    {
      isValid: false,
      message: "Date range cannot exceed 31 days",
    },
  );
});

test("validateDashboardRange rejects invalid custom date format", () => {
  assert.deepEqual(
    validateDashboardRange({
      period: "custom",
      from: "2026/05/01",
      to: "2026-05-30",
    }),
    {
      isValid: false,
      message: "Invalid date format",
    },
  );
});

test("validateDashboardRange rejects reversed custom range", () => {
  assert.deepEqual(
    validateDashboardRange({
      period: "custom",
      from: "2026-05-30",
      to: "2026-05-01",
    }),
    {
      isValid: false,
      message: "To date must be on or after from date",
    },
  );
});

test("buildDashboardRangeRequestParams returns only period for today", () => {
  assert.deepEqual(
    buildDashboardRangeRequestParams({ period: "today", from: null, to: null }),
    { period: "daily" },
  );
});

test("buildDashboardRangeRequestParams returns period with from/to for custom", () => {
  assert.deepEqual(
    buildDashboardRangeRequestParams({
      period: "custom",
      from: "2026-05-01",
      to: "2026-05-30",
    }),
    {
      period: "custom",
      from: "2026-05-01",
      to: "2026-05-30",
    },
  );
});

test("resolveDashboardRangeDateWindow resolves explicit WFA windows", () => {
  assert.deepEqual(
    resolveDashboardRangeDateWindow(
      { period: "today", from: null, to: null },
      { today: "2026-08-15" },
    ),
    { from: "2026-08-15", to: "2026-08-15" },
  );
  assert.deepEqual(
    resolveDashboardRangeDateWindow(
      { period: "current_week", from: null, to: null },
      { today: "2026-08-15" },
    ),
    { from: "2026-08-09", to: "2026-08-15" },
  );
  assert.deepEqual(
    resolveDashboardRangeDateWindow(
      { period: "current_month", from: null, to: null },
      { today: "2026-08-15" },
    ),
    { from: "2026-08-01", to: "2026-08-15" },
  );
  assert.deepEqual(
    resolveDashboardRangeDateWindow(
      { period: "custom", from: "2026-08-03", to: "2026-08-09" },
      { today: "2026-08-15" },
    ),
    { from: "2026-08-03", to: "2026-08-09" },
  );
});


test("resolveDashboardRangeDateWindow derives business today in Asia/Jakarta", () => {
  assert.deepEqual(
    resolveDashboardRangeDateWindow(
      { period: "today", from: null, to: null },
      { now: new Date("2026-07-31T17:30:00.000Z") },
    ),
    { from: "2026-08-01", to: "2026-08-01" },
  );
});
