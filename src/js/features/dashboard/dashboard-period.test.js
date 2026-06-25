import test from "node:test";
import assert from "node:assert/strict";

import { reportService } from "../../services/reportService.js";
import { dashboard } from "./dashboard.js";

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

test("initial load fetches analytics, report, and today locations in parallel without fuzzy ahp detail", async () => {
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
  component.fetchTodayLocations = createDeferredFetch("todayLocations", {
    data: [],
  });
  component.fetchFuzzyAhpAnalysis = async () => {
    calls.push({ name: "fuzzyAhp" });
    throw new Error("fuzzy ahp must be lazy-loaded on demand only");
  };

  const loadPromise = component.loadSummaryData();
  await Promise.resolve();

  assert.deepEqual(
    calls.map((call) => call.name),
    ["report", "analytics", "todayLocations"],
  );

  resolvers.todayLocations();
  await Promise.resolve();
  assert.equal(component.loading, true);

  resolvers.analytics();
  await Promise.resolve();
  assert.equal(component.loading, true);

  resolvers.report();
  await loadPromise;

  assert.equal(component.loading, false);
});

test("dashboard analytics range change refetches analytics and reports without refetching today locations", async () => {
  const component = dashboard();
  const reportCalls = [];
  const analyticsCalls = [];
  let todayLocationCalls = 0;
  let fuzzyAhpCalls = 0;

  component.queueDashboardMapRender = () => {};
  component.showNotification = () => {};
  component.filters.period = "all";
  component.dashboardRange = "30d";
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
  component.fetchTodayLocations = async () => {
    todayLocationCalls += 1;
    return { data: [] };
  };
  component.fetchFuzzyAhpAnalysis = async () => {
    fuzzyAhpCalls += 1;
    return { data: { rankings: [] } };
  };

  await component.loadSummaryData();

  component.dashboardRange = "current_month";
  await component.onDashboardRangeChange();

  assert.equal(reportCalls.length, 2);
  assert.deepEqual(analyticsCalls, [
    { period: "30d" },
    { period: "current_month" },
  ]);
  assert.equal(todayLocationCalls, 1);
  assert.equal(fuzzyAhpCalls, 0);
});

test("fuzzy ahp detail lazy-loads on demand only", async () => {
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
  component.fetchGeofenceEvidence = async () => ({ data: { status: "empty", events: [] } });
  component.fetchFuzzyAhpAnalysis = async (params) => {
    fuzzyAhpCalls += 1;
    seenParams = params;
    return {
      success: true,
      filter: params,
      data: {
        status: "ready",
        sections: [
          {
            key: params.category,
            title: "Discipline",
            summary: "Top category",
            topRank: "Tepat Waktu",
            distribution: { "Tepat Waktu": 0.75 },
            consistency: 0.04,
            generatedAt: "2026-06-25T10:00:00.000Z",
          },
        ],
      },
    };
  };

  await component.loadSummaryData();

  assert.equal(fuzzyAhpCalls, 0);

  await component.loadFuzzyAhpDetail({
    category: "discipline",
    analysis_type: "summary",
  });

  const fuzzyAhp = component.cockpit.bottomPanels.find(
    (panel) => panel.key === "fuzzyAhp",
  );
  assert.equal(fuzzyAhpCalls, 1);
  assert.deepEqual(seenParams, {
    category: "discipline",
    analysis_type: "summary",
  });
  assert.equal(fuzzyAhp.state, "ready");
  assert.equal(fuzzyAhp.data.topRanking.label, "Tepat Waktu");
  assert.equal(Object.prototype.hasOwnProperty.call(component.rawApiData, "fuzzyAhp"), false);
  assert.deepEqual(component.rawApiData.fahpRecap, {
    status: "ready",
    data: {
      status: "ready",
      sections: [
        {
          key: "discipline",
          title: "Discipline",
          summary: "Top category",
          topRank: "Tepat Waktu",
          distribution: { "Tepat Waktu": 0.75 },
          consistency: 0.04,
          generatedAt: "2026-06-25T10:00:00.000Z",
        },
      ],
      filter: {
        category: "discipline",
        analysis_type: "summary",
      },
    },
    error: null,
    request: {
      category: "discipline",
      analysis_type: "summary",
    },
    meta: {},
  });
});

test("dashboard rejects legacy FAHP detail type semantics", async () => {
  const component = dashboard();

  component.queueDashboardMapRender = () => {};
  component.showNotification = () => {};
  component.rawApiData = {
    summary: { total_ontime: 1 },
    report: { data: [] },
  };
  component.fuzzyAhpResponse = { stale: true };
  component.cockpit = { bottomPanels: [] };
  component.fetchFuzzyAhpAnalysis = async () => {
    throw new Error("legacy request should not be forwarded");
  };

  await component.loadFuzzyAhpDetail({ type: "discipline" });

  assert.match(component.fuzzyAhpError?.message || "", /invalid category/i);
  assert.equal(component.fuzzyAhpResponse, null);
  assert.deepEqual(component.fahpFilterState, {
    category: null,
    analysis_type: null,
  });
  assert.equal(component.rawApiData.fahpRecap, undefined);
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
  assert.equal(component.dashboardRange, "30d");
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
