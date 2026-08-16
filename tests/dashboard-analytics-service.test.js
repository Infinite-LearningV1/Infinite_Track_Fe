import test from "node:test";
import assert from "node:assert/strict";

import { API_CONFIG } from "../src/js/config/env.js";
import {
  DashboardAnalyticsService,
  getDashboardAnalytics,
} from "../src/js/services/dashboardAnalyticsService.js";

test("DashboardAnalyticsService#getDashboardAnalytics requests canonical endpoint with 30d params", async () => {
  const seenConfigs = [];
  const service = new DashboardAnalyticsService(async (config) => {
    seenConfigs.push(config);
    return { data: { analytics: { ok: true } } };
  });

  const response = await service.getDashboardAnalytics();

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary/dashboard-analytics`,
      params: {
        period: "30d",
      },
    },
  ]);
  assert.deepEqual(response, { analytics: { ok: true } });
});

test("DashboardAnalyticsService#getDashboardAnalytics forwards custom range from/to", async () => {
  const seenConfigs = [];
  const service = new DashboardAnalyticsService(async (config) => {
    seenConfigs.push(config);
    return { data: { analytics: { points: [] } } };
  });

  await service.getDashboardAnalytics({
    period: "custom",
    from: "2026-05-01",
    to: "2026-05-30",
  });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary/dashboard-analytics`,
      params: {
        period: "custom",
        from: "2026-05-01",
        to: "2026-05-30",
      },
    },
  ]);
});

test("DashboardAnalyticsService#getDashboardAnalytics rejects invalid period", async () => {
  const service = new DashboardAnalyticsService(async () => ({ data: {} }));

  await assert.rejects(
    service.getDashboardAnalytics({ period: "yearly" }),
    /invalid period/i,
  );
});

test("DashboardAnalyticsService#getDashboardAnalytics rejects custom period without from/to", async () => {
  const service = new DashboardAnalyticsService(async () => ({ data: {} }));

  await assert.rejects(
    service.getDashboardAnalytics({ period: "custom", from: "2026-05-01" }),
    /requires both from and to/i,
  );
});

test("DashboardAnalyticsService#getDashboardAnalytics propagates request errors", async () => {
  const requestError = new Error("analytics request failed");
  const service = new DashboardAnalyticsService(async () => {
    throw requestError;
  });

  await assert.rejects(
    service.getDashboardAnalytics({ period: "current_month" }),
    (error) => {
      assert.equal(error, requestError);
      return true;
    },
  );
});

test("getDashboardAnalytics convenience export exists", () => {
  assert.equal(typeof getDashboardAnalytics, "function");
});
