import test from "node:test";
import assert from "node:assert/strict";

import { reportService } from "../../src/js/services/reportService.js";
import { dashboard } from "../../src/js/features/dashboard/dashboard.js";

test("dashboard analytics range change reloads dashboard data without changing report/export period", async () => {
  const component = dashboard();
  const notifications = [];
  let loadSummaryCalls = 0;

  component.dashboardRange = "30d";
  component.filters.period = "all";
  component.filters.page = 4;
  component.loadSummaryData = async () => {
    loadSummaryCalls += 1;
  };
  component.showNotification = (message, type) => {
    notifications.push({ message, type });
  };

  await component.onDashboardRangeChange();

  assert.equal(loadSummaryCalls, 1);
  assert.equal(component.filters.period, "all");
  assert.equal(component.filters.page, 4);
  assert.deepEqual(notifications, [
    {
      message: "Dashboard analytics updated untuk range: 30d",
      type: "info",
    },
  ]);
});

test("today preset maps dashboard analytics and geofence requests to backend daily", async () => {
  const component = dashboard();
  const analyticsCalls = [];
  const geofenceCalls = [];

  component.queueDashboardMapRender = () => {};
  component.showNotification = () => {};
  component.dashboardRange = "current_month";
  component.dashboardRangeState = {
    period: "current_month",
    from: null,
    to: null,
  };
  component.fetchSummaryReport = async () => ({
    summary: {
      total_ontime: 1,
      total_late: 0,
      total_alpha: 0,
    },
    report: {
      data: [],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_records: 0,
        per_page: 5,
        has_prev_page: false,
        has_next_page: false,
      },
    },
  });
  component.fetchDashboardAnalytics = async (params) => {
    analyticsCalls.push(params);
    return { data: { executive_kpis: { avg_discipline: 88 } } };
  };
  component.fetchGeofenceEvidence = async (params) => {
    geofenceCalls.push(params);
    return {
      data: {
        status: "empty",
        raw_counts: {
          total_events: 0,
          enter_events: 0,
          exit_events: 0,
          unique_users: 0,
        },
      },
    };
  };
  component.fetchTodayLocations = async () => ({ data: [] });
  component.fetchDashboardFahpAnalysis = async () => ({
    data: {
      type: "discipline",
      type_label: "Discipline",
      status: "ready",
      criteria_weights: [
        {
          key: "attendance",
          label: "Attendance",
          display_label: "Attendance",
          value: 0.45,
        },
      ],
    },
  });

  await component.selectDashboardRangeOption("today");

  assert.deepEqual(analyticsCalls, [{ period: "daily" }]);
  assert.deepEqual(geofenceCalls, [{ period: "daily" }]);
});

test("current week preset maps dashboard analytics and geofence requests to backend weekly", async () => {
  const component = dashboard();
  const analyticsCalls = [];
  const geofenceCalls = [];

  component.queueDashboardMapRender = () => {};
  component.showNotification = () => {};
  component.dashboardRange = "current_month";
  component.dashboardRangeState = {
    period: "current_month",
    from: null,
    to: null,
  };
  component.fetchSummaryReport = async () => ({
    summary: {
      total_ontime: 1,
      total_late: 0,
      total_alpha: 0,
    },
    report: {
      data: [],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_records: 0,
        per_page: 5,
        has_prev_page: false,
        has_next_page: false,
      },
    },
  });
  component.fetchDashboardAnalytics = async (params) => {
    analyticsCalls.push(params);
    return { data: { executive_kpis: { avg_discipline: 88 } } };
  };
  component.fetchGeofenceEvidence = async (params) => {
    geofenceCalls.push(params);
    return {
      data: {
        status: "empty",
        raw_counts: {
          total_events: 0,
          enter_events: 0,
          exit_events: 0,
          unique_users: 0,
        },
      },
    };
  };
  component.fetchTodayLocations = async () => ({ data: [] });
  component.fetchDashboardFahpAnalysis = async () => ({
    data: {
      type: "discipline",
      type_label: "Discipline",
      status: "ready",
      criteria_weights: [
        {
          key: "attendance",
          label: "Attendance",
          display_label: "Attendance",
          value: 0.45,
        },
      ],
    },
  });

  await component.selectDashboardRangeOption("current_week");

  assert.deepEqual(analyticsCalls, [{ period: "weekly" }]);
  assert.deepEqual(geofenceCalls, [{ period: "weekly" }]);
});

test("initial load fetches report, analytics, geofence, today locations, and Fuzzy AHP in parallel", async () => {
  const component = dashboard();
  const calls = [];
  const resolvers = {};

  const createDeferredFetch = (name, response) => async (params) => {
    calls.push({ name, params, startedAt: calls.length });
    return new Promise((resolve) => {
      resolvers[name] = () => resolve(response);
    });
  };

  component.queueDashboardMapRender = () => {};
  component.showNotification = () => {};
  component.fetchSummaryReport = createDeferredFetch("report", {
    summary: {
      total_ontime: 1,
      total_late: 0,
      total_alpha: 0,
    },
    report: {
      data: [],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_records: 0,
        per_page: 5,
        has_prev_page: false,
        has_next_page: false,
      },
    },
  });
  component.fetchDashboardAnalytics = createDeferredFetch("analytics", {
    data: {
      executive_kpis: {
        avg_discipline: 88,
      },
    },
  });
  component.fetchGeofenceEvidence = createDeferredFetch("geofence", {
    data: {
      status: "empty",
      raw_counts: {
        total_events: 0,
        enter_events: 0,
        exit_events: 0,
        unique_users: 0,
      },
    },
  });
  component.fetchTodayLocations = createDeferredFetch("todayLocations", {
    data: [],
  });
  component.fetchDashboardFahpAnalysis = createDeferredFetch("fuzzyAhp", {
    data: {
      type: "discipline",
      type_label: "Discipline",
      status: "ready",
      needs_data: false,
      consistency: {
        CR: 0.06,
        threshold: 0.1,
        is_consistent: true,
        summary_label: "Consistent",
      },
      criteria_weights: [
        {
          key: "attendance",
          label: "Attendance",
          display_label: "Attendance",
          value: 0.45,
        },
      ],
      ranking_preview: {
        items: [{ label: "Andi", score: 0.91 }],
      },
      distribution: { excellent: 1 },
    },
  });

  const loadPromise = component.loadSummaryData();
  await Promise.resolve();

  assert.deepEqual(
    calls.map((call) => call.name),
    ["report", "analytics", "geofence", "fuzzyAhp", "todayLocations"],
  );

  resolvers.todayLocations();
  await Promise.resolve();
  assert.equal(component.loading, true);

  resolvers.fuzzyAhp();
  await Promise.resolve();
  assert.equal(component.loading, true);

  resolvers.analytics();
  await Promise.resolve();
  assert.equal(component.loading, true);

  resolvers.geofence();
  await Promise.resolve();
  assert.equal(component.loading, true);

  resolvers.report();
  await loadPromise;

  assert.equal(component.loading, false);
});

test("report range change syncs dashboard analytics to the selected custom window", async () => {
  const component = dashboard();
  const reportCalls = [];
  const analyticsCalls = [];
  let todayLocationCalls = 0;
  let fuzzyAhpCalls = 0;

  component.queueDashboardMapRender = () => {};
  component.showNotification = () => {};
  component.filters.period = "range";
  component.filters.from = "2026-06-01";
  component.filters.to = "2026-06-20";
  component.dashboardRange = "current_month";
  component.dashboardRangeState = {
    period: "current_month",
    from: null,
    to: null,
  };
  component.fetchSummaryReport = async (params) => {
    reportCalls.push(params);
    return {
      summary: {
        total_ontime: 1,
        total_late: 0,
        total_alpha: 0,
      },
      report: {
        data: [],
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_records: 0,
          per_page: 5,
          has_prev_page: false,
          has_next_page: false,
        },
      },
    };
  };
  component.fetchDashboardAnalytics = async (params) => {
    analyticsCalls.push(params);
    return {
      data: {
        executive_kpis: {
          avg_discipline: 88,
        },
      },
    };
  };
  component.fetchGeofenceEvidence = async () => ({
    data: {
      status: "empty",
      raw_counts: {
        total_events: 0,
        enter_events: 0,
        exit_events: 0,
        unique_users: 0,
      },
    },
  });
  component.fetchTodayLocations = async () => {
    todayLocationCalls += 1;
    return { data: [] };
  };
  component.fetchDashboardFahpAnalysis = async () => {
    fuzzyAhpCalls += 1;
    return {
      data: {
        type: "discipline",
        type_label: "Discipline",
        status: "ready",
        criteria_weights: [
          {
            key: "attendance",
            label: "Attendance",
            display_label: "Attendance",
            value: 0.45,
          },
        ],
      },
    };
  };

  await component.onPeriodChange();

  assert.deepEqual(component.dashboardRangeState, {
    period: "custom",
    from: "2026-06-01",
    to: "2026-06-20",
  });
  assert.equal(component.dashboardRange, "custom");
  assert.deepEqual(analyticsCalls, [
    { period: "custom", from: "2026-06-01", to: "2026-06-20" },
  ]);
  assert.deepEqual(reportCalls, [
    {
      period: "range",
      from: "2026-06-01",
      to: "2026-06-20",
      page: 1,
      limit: 5,
      search: "",
      sortBy: null,
      sortOrder: "asc",
    },
  ]);
  assert.equal(todayLocationCalls, 1);
  assert.equal(fuzzyAhpCalls, 1);
});

test("fuzzy ahp detail refreshes on demand using the final type contract", async () => {
  const component = dashboard();
  let fuzzyAhpCalls = 0;
  let seenParams = null;

  component.queueDashboardMapRender = () => {};
  component.showNotification = () => {};
  component.fetchSummaryReport = async () => ({
    summary: {
      total_ontime: 1,
      total_late: 0,
      total_alpha: 0,
    },
    report: {
      data: [],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_records: 0,
        per_page: 5,
        has_prev_page: false,
        has_next_page: false,
      },
    },
  });
  component.fetchDashboardAnalytics = async () => ({
    data: {
      executive_kpis: {
        avg_discipline: 88,
      },
    },
  });
  component.fetchTodayLocations = async () => ({ data: [] });
  component.fetchGeofenceEvidence = async () => ({
    data: {
      status: "empty",
      raw_counts: {
        total_events: 0,
        enter_events: 0,
        exit_events: 0,
        unique_users: 0,
      },
    },
  });
  component.fetchDashboardFahpAnalysis = async (params) => {
    fuzzyAhpCalls += 1;
    seenParams = params;
    return {
      data: {
        type: params.type,
        type_label: "Discipline",
        generated_at: "2026-06-25T10:00:00.000Z",
        timezone: "Asia/Jakarta",
        status: "ready",
        needs_data: false,
        consistency: {
          CR: 0.04,
          threshold: 0.1,
          is_consistent: true,
          summary_label: "Consistent",
        },
        criteria_weights: [
          {
            key: "attendance",
            label: "Attendance",
            display_label: "Attendance",
            value: 0.45,
          },
        ],
        ranking_preview: {
          items: [{ label: "Tepat Waktu", score: 0.75 }],
        },
        distribution: { "Tepat Waktu": 1 },
      },
    };
  };

  await component.loadSummaryData();
  assert.equal(fuzzyAhpCalls, 1);

  component.pageState = {
    refreshFahpRecap: async (requestParams) => {
      component.fuzzyAhpResponse =
        await component.fetchDashboardFahpAnalysis(requestParams);
      component.rawApiData = {
        ...(component.rawApiData || {}),
        fahpRecap: {
          request: requestParams,
        },
      };
      return { status: "ready" };
    },
  };

  await component.loadFuzzyAhpDetail({ type: "discipline" });

  const fuzzyAhp = component.cockpit.bottomPanels.find(
    (panel) => panel.key === "fuzzyAhp",
  );
  assert.equal(fuzzyAhpCalls, 2);
  assert.deepEqual(seenParams, { type: "discipline" });
  assert.equal(fuzzyAhp.state, "ready");
  assert.equal(fuzzyAhp.data.activeDecisionKey, "discipline");
  assert.equal(fuzzyAhp.data.decisions[0].rankings[0].label, "Tepat Waktu");
  assert.equal(
    Object.prototype.hasOwnProperty.call(component.rawApiData, "fuzzyAhp"),
    false,
  );
  assert.deepEqual(component.rawApiData.fahpRecap.request, {
    type: "discipline",
  });
});

test("report period change remains scoped to filters.period and resets report pagination", async () => {
  const component = dashboard();
  let loadSummaryCalls = 0;

  component.dashboardRange = "30d";
  component.filters.period = "monthly";
  component.filters.page = 4;
  component.loadSummaryData = async () => {
    loadSummaryCalls += 1;
  };
  component.showNotification = () => {};

  await component.onPeriodChange();

  assert.equal(loadSummaryCalls, 1);
  assert.equal(component.dashboardRange, "current_month");
  assert.deepEqual(component.dashboardRangeState, {
    period: "current_month",
    from: null,
    to: null,
  });
  assert.equal(component.filters.period, "monthly");
  assert.equal(component.filters.page, 1);
});

test("export fetch uses summary report period state instead of analytics dashboard range", async () => {
  const component = dashboard();
  const exportCalls = [];
  const originalRequestExecutor = reportService.requestExecutor;

  component.dashboardRange = "30d";
  component.dashboardRangeState = {
    period: "30d",
    from: null,
    to: null,
  };
  component.filters.period = "range";
  component.filters.from = "2026-05-01";
  component.filters.to = "2026-05-30";
  component.fetchSummaryReport = async (params) => {
    exportCalls.push(params);
    return {
      summary: {
        total_ontime: 1,
        total_late: 0,
        total_alpha: 0,
      },
      report: {
        data: [{ attendance_id: "att-1" }],
        pagination: {
          total_records: 1,
        },
      },
    };
  };
  reportService.requestExecutor = async () => {
    throw new Error(
      "export must use the dashboard component fetchSummaryReport seam",
    );
  };

  try {
    await component.loadExportData();
  } finally {
    reportService.requestExecutor = originalRequestExecutor;
  }

  assert.deepEqual(exportCalls, [
    {
      period: "range",
      from: "2026-05-01",
      to: "2026-05-30",
      page: 1,
      limit: 5000,
    },
  ]);
});
