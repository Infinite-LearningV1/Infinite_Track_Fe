import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDashboardAnalyticsRangeDisplayValue,
  createDashboardAnalyticsHeaderState,
  resolveDashboardAnalyticsSelectedLabel,
} from "./dashboardAnalyticsHeader.js";

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
