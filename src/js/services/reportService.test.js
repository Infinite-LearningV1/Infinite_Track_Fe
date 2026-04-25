import test from "node:test";
import assert from "node:assert/strict";

import { ReportService } from "./reportService.js";

test("ReportService#getSummaryReport surfaces request-layer failures", async () => {
  const service = new ReportService(async () => {
    throw new Error("network down");
  });

  await assert.rejects(
    service.getSummaryReport({ period: "all", page: 1, limit: 10, search: "andi" }),
    /Failed to fetch summary report: network down/,
  );
});
