import test from "node:test";
import assert from "node:assert/strict";

import { API_CONFIG } from "../config/env.js";
import { ReportService } from "./reportService.js";

test("ReportService#getSummaryReport requests canonical summary reports path", async () => {
  const seenConfigs = [];
  const responseData = {
    success: true,
    summary: {},
    report: { data: [], pagination: {} },
  };
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return { data: responseData };
  });

  const response = await service.getSummaryReport({
    period: "weekly",
    page: 2,
    limit: 5,
  });

  assert.equal(response, responseData);
  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary/reports`,
      params: {
        period: "weekly",
        page: 2,
        limit: 5,
      },
    },
  ]);
});

test("ReportService#getSummaryReport defaults canonical period to monthly", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        summary: {},
        report: { data: [], pagination: {} },
      },
    };
  });

  await service.getSummaryReport();

  assert.deepEqual(seenConfigs[0].params, {
    period: "monthly",
    page: 1,
    limit: 10,
  });
});

test("ReportService#getSummaryReport sends q only when search is non-empty", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        summary: {},
        report: { data: [], pagination: {} },
      },
    };
  });

  await service.getSummaryReport({ search: " andi ", page: 1, limit: 10 });
  await service.getSummaryReport({ search: "   ", page: 2, limit: 20 });

  assert.deepEqual(seenConfigs[0].params, {
    period: "monthly",
    page: 1,
    limit: 10,
    q: "andi",
  });
  assert.deepEqual(seenConfigs[1].params, {
    period: "monthly",
    page: 2,
    limit: 20,
  });
});

test("ReportService#getSummaryReport forwards valid range params", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        summary: {},
        report: { data: [], pagination: {} },
      },
    };
  });

  await service.getSummaryReport({
    period: "range",
    from: "2026-05-01",
    to: "2026-05-30",
    page: 3,
    limit: 25,
  });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary/reports`,
      params: {
        period: "range",
        from: "2026-05-01",
        to: "2026-05-30",
        page: 3,
        limit: 25,
      },
    },
  ]);
});

test("ReportService#getSummaryReport forwards sort params when provided", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        summary: {},
        report: { data: [], pagination: {} },
      },
    };
  });

  await service.getSummaryReport({
    period: "monthly",
    page: 1,
    limit: 10,
    sortBy: "discipline_score",
    sortOrder: "desc",
  });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary/reports`,
      params: {
        period: "monthly",
        page: 1,
        limit: 10,
        sortBy: "discipline_score",
        sortOrder: "desc",
      },
    },
  ]);
});

test("ReportService#getSummaryReport rejects invalid range before request", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        summary: {},
        report: { data: [], pagination: {} },
      },
    };
  });

  await assert.rejects(
    service.getSummaryReport({ period: "range", from: "2026-05-01" }),
    /range period requires from and to dates/,
  );
  await assert.rejects(
    service.getSummaryReport({
      period: "range",
      from: "2026-05-01",
      to: "05-30-2026",
    }),
    /range period requires from and to dates in YYYY-MM-DD format/,
  );
  await assert.rejects(
    service.getSummaryReport({
      period: "range",
      from: "2026-05-01",
      to: "2026-06-01",
    }),
    /range period cannot exceed 31 days/,
  );

  assert.deepEqual(seenConfigs, []);
});

test("ReportService#getSummaryReport rejects non-canonical period before request", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        summary: {},
        report: { data: [], pagination: {} },
      },
    };
  });

  await assert.rejects(
    service.getSummaryReport({ period: "yearly" }),
    /period must be one of: daily, weekly, monthly, range/,
  );

  assert.deepEqual(seenConfigs, []);
});

test("ReportService#getSummaryReport falls back from all to monthly and warns", async () => {
  const seenConfigs = [];
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        summary: {},
        report: { data: [], pagination: {} },
      },
    };
  });

  try {
    await service.getSummaryReport({ period: "all" });
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(seenConfigs[0].params, {
    period: "monthly",
    page: 1,
    limit: 10,
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /period=all is not supported/);
});

test("ReportService#getSummaryReport canonical path does not send search aliases", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        summary: {},
        report: { data: [], pagination: {} },
      },
    };
  });

  await service.getSummaryReport({
    search: " andi ",
    query: "legacy-query",
    keyword: "legacy-keyword",
  });

  assert.equal(seenConfigs[0].url, `${API_CONFIG.BASE_URL}/summary/reports`);
  assert.equal(seenConfigs[0].params.q, "andi");
  assert.equal("search" in seenConfigs[0].params, false);
  assert.equal("query" in seenConfigs[0].params, false);
  assert.equal("keyword" in seenConfigs[0].params, false);
});

test("ReportService#getLegacySummaryReport remains available for deprecated summary path", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        summary: {},
        report: { data: [], pagination: {} },
      },
    };
  });

  await service.getLegacySummaryReport({
    period: "all",
    page: 1,
    limit: 10,
    search: " andi ",
  });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary`,
      params: {
        period: "all",
        page: 1,
        limit: 10,
        search: "andi",
        q: "andi",
        query: "andi",
        keyword: "andi",
      },
    },
  ]);
});

test("ReportService#getSummaryReport propagates request-layer failures", async () => {
  const error = new Error("network down");
  const service = new ReportService(async () => {
    throw error;
  });

  await assert.rejects(service.getSummaryReport({ period: "monthly" }), error);
});

test("ReportService#getDashboardAnalytics uses injected request executor for analytics request config", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        analytics: {
          historical_trend: { points: [] },
          map_context: { status: "no_data", points: [] },
        },
      },
    };
  });

  await service.getDashboardAnalytics({ period: "monthly" });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary/dashboard-analytics`,
      params: {
        period: "monthly",
      },
    },
  ]);
});

test("ReportService#getDashboardAnalytics forwards custom range params for backend-native analytics filters", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        analytics: {
          historical_trend: { points: [] },
          map_context: { status: "no_data", points: [] },
        },
      },
    };
  });

  await service.getDashboardAnalytics({
    period: "custom",
    from: "2026-05-10",
    to: "2026-05-10",
  });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary/dashboard-analytics`,
      params: {
        period: "custom",
        from: "2026-05-10",
        to: "2026-05-10",
      },
    },
  ]);
});

test("ReportService#getDashboardAnalytics returns the analytics payload without renaming snake_case fields", async () => {
  const analyticsPayload = {
    analytics: {
      historical_trend: {
        default_range_key: "weekly",
        points: [{ label: "Week 1", on_time_rate: 90 }],
      },
      map_context: {
        status: "ready",
        points: [
          {
            full_name: "Andi",
            coordinates: { latitude: -0.9, longitude: 119.8 },
          },
        ],
      },
    },
  };
  const service = new ReportService(async () => ({
    data: analyticsPayload,
  }));

  const response = await service.getDashboardAnalytics({ period: "weekly" });

  assert.equal(response, analyticsPayload);
  assert.deepEqual(response.analytics.historical_trend, {
    default_range_key: "weekly",
    points: [{ label: "Week 1", on_time_rate: 90 }],
  });
  assert.deepEqual(response.analytics.map_context, {
    status: "ready",
    points: [
      {
        full_name: "Andi",
        coordinates: { latitude: -0.9, longitude: 119.8 },
      },
    ],
  });
});

test("ReportService#getDashboardAnalytics surfaces request-layer failures", async () => {
  const service = new ReportService(async () => {
    throw new Error("analytics unavailable");
  });

  await assert.rejects(
    service.getDashboardAnalytics({ period: "all" }),
    /Failed to fetch dashboard analytics: analytics unavailable/,
  );
});

test("ReportService#getTodayLocations uses injected request executor for today locations request config", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        data: [],
      },
    };
  });

  await service.getTodayLocations();

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/attendance/today-locations`,
    },
  ]);
});

test("ReportService#getTodayLocations surfaces request-layer failures", async () => {
  const service = new ReportService(async () => {
    throw new Error("today locations unavailable");
  });

  await assert.rejects(
    service.getTodayLocations(),
    /Failed to fetch today locations: today locations unavailable/,
  );
});

test("ReportService#getFuzzyAhpAnalysis uses injected request executor for final FAHP dashboard request config", async () => {
  const seenConfigs = [];
  const service = new ReportService(async (config) => {
    seenConfigs.push(config);
    return {
      data: {
        success: true,
        data: {},
      },
    };
  });

  await service.getFuzzyAhpAnalysis({ type: "wfa" });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard`,
      params: { type: "wfa" },
    },
  ]);
});

test("ReportService#getFuzzyAhpAnalysis surfaces request-layer failures", async () => {
  const service = new ReportService(async () => {
    throw new Error("fuzzy ahp unavailable");
  });

  await assert.rejects(
    service.getFuzzyAhpAnalysis(),
    /Failed to fetch fuzzy ahp analysis: fuzzy ahp unavailable/,
  );
});
