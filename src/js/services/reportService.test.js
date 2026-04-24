import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

import { getSummaryReport } from "./reportService.js";

test("getSummaryReport surfaces API failures instead of returning dev mock data", async (t) => {
  t.mock.method(axios, "get", async () => {
    throw new Error("network down");
  });

  await assert.rejects(
    getSummaryReport({ period: "all", page: 1, limit: 10, search: "andi" }),
    /Failed to fetch summary report: network down/,
  );
});
