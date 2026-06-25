import test from "node:test";
import assert from "node:assert/strict";

import { API_CONFIG } from "../src/js/config/env.js";
import {
  FuzzyAhpService,
  getFuzzyAhpAnalysis,
} from "../src/js/services/fuzzyAhpService.js";

test("FuzzyAhpService#getFuzzyAhpAnalysis requests dashboard recap endpoint with independent filter params", async () => {
  const seenConfigs = [];
  const service = new FuzzyAhpService(async (config) => {
    seenConfigs.push(config);
    return { data: { rankings: [{ key: "discipline", score: 0.91 }] } };
  });

  const response = await service.getFuzzyAhpAnalysis({
    category: "discipline",
    analysis_type: null,
  });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard-recap`,
      params: {
        category: "discipline",
        analysis_type: null,
      },
    },
  ]);
  assert.deepEqual(response, {
    rankings: [{ key: "discipline", score: 0.91 }],
  });
});

test("FuzzyAhpService#getFuzzyAhpAnalysis rejects invalid category", async () => {
  const service = new FuzzyAhpService(async () => ({ data: {} }));

  await assert.rejects(
    service.getFuzzyAhpAnalysis({ category: "invalid-type" }),
    /invalid category/i,
  );
});

test("FuzzyAhpService#getFuzzyAhpAnalysis rejects invalid analysis_type", async () => {
  const service = new FuzzyAhpService(async () => ({ data: {} }));

  await assert.rejects(
    service.getFuzzyAhpAnalysis({ category: "wfa", analysis_type: "daily" }),
    /invalid analysis_type/i,
  );
});

test("FuzzyAhpService#getFuzzyAhpAnalysis propagates request errors", async () => {
  const requestError = new Error("fuzzy ahp request failed");
  const service = new FuzzyAhpService(async () => {
    throw requestError;
  });

  await assert.rejects(
    service.getFuzzyAhpAnalysis({
      category: "smart_ac",
      analysis_type: "summary",
    }),
    (error) => {
      assert.equal(error, requestError);
      return true;
    },
  );
});

test("FuzzyAhpService#getFuzzyAhpAnalysis rejects legacy type semantics without category", async () => {
  const service = new FuzzyAhpService(async () => ({ data: {} }));

  await assert.rejects(
    service.getFuzzyAhpAnalysis({ type: "discipline" }),
    /invalid category/i,
  );
});

test("getFuzzyAhpAnalysis convenience export exists", () => {
  assert.equal(typeof getFuzzyAhpAnalysis, "function");
});
