import test from "node:test";
import assert from "node:assert/strict";

import { dashboard } from "./dashboard.js";

test("dashboard period change uses filters.period as the selected period", async () => {
  const component = dashboard();
  const notifications = [];
  let loadSummaryCalls = 0;

  component.period = "all";
  component.filters.period = "weekly";
  component.loadSummaryData = async () => {
    loadSummaryCalls += 1;
  };
  component.showNotification = (message, type) => {
    notifications.push({ message, type });
  };

  await component.onPeriodChange();

  assert.equal(loadSummaryCalls, 1);
  assert.deepEqual(notifications, [
    {
      message: "Dashboard updated untuk period: weekly",
      type: "info",
    },
  ]);
});
