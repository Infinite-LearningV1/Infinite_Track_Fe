import test from "node:test";
import assert from "node:assert/strict";

import { API_CONFIG } from "../config/env.js";
import { ReportService } from "./reportService.js";

test("ReportService#getSummaryReport uses injected request executor for summary request config", async () => {
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
    period: "weekly",
    page: 2,
    limit: 5,
    search: " andi ",
  });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary`,
      params: {
        period: "weekly",
        page: 2,
        limit: 5,
        search: "andi",
        q: "andi",
        query: "andi",
        keyword: "andi",
      },
    },
  ]);
});

test("ReportService#getSummaryReport forwards sort fields when sortBy is present", async () => {
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
    period: "daily",
    page: 3,
    limit: 25,
    sortBy: "attendance_date",
    sortOrder: "desc",
  });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary`,
      params: {
        period: "daily",
        page: 3,
        limit: 25,
        sortBy: "attendance_date",
        sortOrder: "desc",
      },
    },
  ]);
});

test("ReportService#getSummaryReport surfaces request-layer failures", async () => {
  const service = new ReportService(async () => {
    throw new Error("network down");
  });

  await assert.rejects(
    service.getSummaryReport({ period: "all", page: 1, limit: 10, search: "andi" }),
    /Failed to fetch summary report: network down/,
  );
});
