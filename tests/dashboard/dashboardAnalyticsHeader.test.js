import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDashboardAnalyticsRangeDisplayValue,
  createDashboardAnalyticsHeaderState,
  createDashboardAnalyticsPresetOptions,
  resolveDashboardAnalyticsDateWindow,
  resolveDashboardAnalyticsSelectedLabel,
} from "../../src/js/components/dashboardRange/dashboardAnalyticsHeader.js";

test("custom dashboard analytics range uses the selected date window as the visible label", () => {
  const rangeState = {
    period: "custom",
    from: "2026-06-01",
    to: "2026-06-20",
  };

  assert.equal(
    resolveDashboardAnalyticsSelectedLabel(rangeState.period, rangeState),
    "1 Jun 2026 - 20 Jun 2026",
  );
  assert.equal(
    buildDashboardAnalyticsRangeDisplayValue(rangeState),
    "1 Jun 2026 - 20 Jun 2026",
  );
});

test("header state keeps the custom dashboard analytics range label in sync with the selected dates", () => {
  const rangeState = {
    period: "custom",
    from: "2026-06-01",
    to: "2026-06-20",
  };

  const headerState = createDashboardAnalyticsHeaderState(
    rangeState,
    new Date("2026-07-01T00:00:00+07:00"),
  );

  assert.equal(headerState.selectedLabel, "1 Jun 2026 - 20 Jun 2026");
  assert.equal(headerState.pickerInputValue, "1 Jun 2026 - 20 Jun 2026");
});

test("7-day preset label and visible window use rolling seven calendar dates", () => {
  const rangeState = { period: "current_week", from: null, to: null };
  const now = new Date("2026-08-15T05:00:00.000Z");

  assert.equal(
    createDashboardAnalyticsPresetOptions().find(
      (option) => option.value === "current_week",
    )?.label,
    "7 Hari",
  );
  assert.deepEqual(resolveDashboardAnalyticsDateWindow(rangeState, now), {
    from: "2026-08-09",
    to: "2026-08-15",
  });
  assert.equal(
    buildDashboardAnalyticsRangeDisplayValue(rangeState, now),
    "9 Agu 2026 - 15 Agu 2026",
  );
});
