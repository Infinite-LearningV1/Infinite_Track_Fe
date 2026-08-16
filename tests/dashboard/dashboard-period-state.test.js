import test from "node:test";
import assert from "node:assert/strict";

import { dashboard } from "../../src/js/features/dashboard/dashboard.js";

function createDashboardComponent() {
  const component = dashboard();
  const summaryCalls = [];
  const notifications = [];

  component.fetchSummaryReport = async (params) => {
    summaryCalls.push(params);
    return {
      summary: {
        total_ontime: 0,
        total_late: 0,
        total_alpha: 0,
        total_wfo: 0,
        total_wfh: 0,
        total_wfa: 0,
      },
      report: {
        data: [],
        pagination: {},
      },
    };
  };
  component.fetchDashboardAnalytics = async () => ({
    data: {
      executive_kpis: {},
      historical_trend: { points: [] },
      mode_mix: { totals: {}, percentages: {} },
      insights: { items: [] },
    },
  });
  component.fetchGeofenceEvidence = async () => ({
    data: {
      status: "empty",
      raw_counts: {
        total_events: 0,
        enter_events: 0,
        exit_events: 0,
        unique_users: 0,
      },
      authority: "attendance.geofence-evidence",
      final_attendance_authority: "attendance.summary-report",
      reason: null,
      needs_data: false,
    },
  });
  component.fetchTodayLocations = async () => ({ data: [] });
  component.showNotification = (message, type = "info") => {
    notifications.push({ message, type });
  };

  return { component, summaryCalls, notifications };
}

test("dashboard summary report defaults to monthly period state", () => {
  const { component } = createDashboardComponent();

  assert.equal(component.period, "monthly");
  assert.equal(component.filters.period, "monthly");
  assert.deepEqual(
    component.periodOptions.map((option) => option.value),
    ["daily", "weekly", "monthly", "range"],
  );
  assert.equal(
    component.periodOptions.some((option) => option.value === "all"),
    false,
  );
});

test("dashboard range period requires valid from and to before loading summary data", async () => {
  const { component, summaryCalls, notifications } = createDashboardComponent();

  component.filters.period = "range";
  component.filters.from = "2026-05-01";
  component.filters.to = "";

  await component.onPeriodChange();

  assert.equal(summaryCalls.length, 0);
  assert.equal(
    component.errorMessage,
    "range period requires from and to dates",
  );
  assert.deepEqual(notifications.at(-1), {
    message: "range period requires from and to dates",
    type: "error",
  });

  component.filters.to = "2026-05-30";
  await component.onPeriodChange();

  assert.equal(summaryCalls.length, 1);
  assert.equal(summaryCalls[0].period, "range");
  assert.equal(summaryCalls[0].from, "2026-05-01");
  assert.equal(summaryCalls[0].to, "2026-05-30");
});

test("dashboard searchQuery is trimmed and passed to summary report service path", async () => {
  const { component, summaryCalls } = createDashboardComponent();

  component.searchQuery = "  Alice Admin  ";

  await component.loadSummaryData({ includeTodayLocations: false });

  assert.equal(summaryCalls.length, 1);
  assert.equal(summaryCalls[0].search, "Alice Admin");
  assert.equal(Object.hasOwn(summaryCalls[0], "q"), false);
});

test("dashboard init wires pageState to real owner fetch paths instead of cached projections", async () => {
  const { component } = createDashboardComponent();
  const calls = [];

  component.fetchSummaryReport = async () => ({
    summary: {
      total_ontime: 0,
      total_late: 0,
      total_alpha: 0,
      total_wfo: 0,
      total_wfh: 0,
      total_wfa: 0,
    },
    report: {
      data: [],
      pagination: {},
    },
  });
  component.fetchDashboardAnalytics = async () => {
    calls.push("historical");
    return {
      data: {
        executive_kpis: {},
        historical_trend: { points: [] },
        mode_mix: { totals: {}, percentages: {} },
        insights: { items: [] },
      },
    };
  };
  component.fetchGeofenceEvidence = async () => {
    calls.push("geofence");
    return {
      data: {
        status: "empty",
        raw_counts: {
          total_events: 0,
          enter_events: 0,
          exit_events: 0,
          unique_users: 0,
        },
        authority: "attendance.geofence-evidence",
        final_attendance_authority: "attendance.summary-report",
        reason: null,
        needs_data: false,
      },
    };
  };
  component.fetchTodayLocations = async () => {
    calls.push("liveMap");
    return { data: [] };
  };
  component.fetchFuzzyAhpAnalysis = async () => {
    calls.push("fahp");
    return {
      filter: {
        category: "discipline",
        analysis_type: null,
      },
      data: {
        status: "ready",
        sections: [],
      },
    };
  };

  await component.init();
  calls.length = 0;

  await component.pageState.loadDashboard();

  assert.deepEqual(calls, ["historical", "geofence", "liveMap", "fahp"]);
});
