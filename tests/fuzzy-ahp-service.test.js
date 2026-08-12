import test from "node:test";
import assert from "node:assert/strict";
import { API_CONFIG } from "../src/js/config/env.js";
import {
  FuzzyAhpService,
  getDashboardFahpAnalysis,
  getWfaFahpAnalysis,
} from "../src/js/services/fuzzyAhpService.js";

test("dashboard transport keeps Discipline on generic endpoint", async () => {
  const seen = [];
  const service = new FuzzyAhpService(async (config) => {
    seen.push(config);
    return {
      data: { success: true, data: { type: "discipline", status: "ready" } },
    };
  });
  await service.getDashboardFahpAnalysis({ type: "discipline" });
  assert.deepEqual(seen, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard`,
      params: { type: "discipline" },
    },
  ]);
});
test("generic dashboard transport rejects WFA", async () => {
  const service = new FuzzyAhpService(async () => ({ data: {} }));
  await assert.rejects(
    service.getDashboardFahpAnalysis({ type: "wfa" }),
    /dedicated WFA/i,
  );
});
test("WFA transport uses dedicated endpoint", async () => {
  const seen = [];
  const service = new FuzzyAhpService(async (config) => {
    seen.push(config);
    return { data: { success: true, data: { candidates: [] } } };
  });
  await service.getWfaFahpAnalysis({
    lat: -6.2,
    lon: 106.816666,
    schedule_date: "2026-08-14",
  });
  assert.deepEqual(seen[0], {
    method: "get",
    url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/wfa`,
    params: { lat: -6.2, lon: 106.816666, schedule_date: "2026-08-14" },
  });
});
test("explicit service exports exist", () => {
  assert.equal(typeof getDashboardFahpAnalysis, "function");
  assert.equal(typeof getWfaFahpAnalysis, "function");
});
