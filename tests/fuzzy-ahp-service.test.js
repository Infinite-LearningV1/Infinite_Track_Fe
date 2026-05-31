import test from "node:test";
import assert from "node:assert/strict";

import { API_CONFIG } from "../src/js/config/env.js";
import {
  FuzzyAhpService,
  getFuzzyAhpAnalysis,
} from "../src/js/services/fuzzyAhpService.js";

test("FuzzyAhpService#getFuzzyAhpAnalysis requests canonical endpoint with type/period params", async () => {
  const seenConfigs = [];
  const service = new FuzzyAhpService(async (config) => {
    seenConfigs.push(config);
    return { data: { rankings: [{ key: "discipline", score: 0.91 }] } };
  });

  const response = await service.getFuzzyAhpAnalysis({
    type: "discipline",
    period: "weekly",
  });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp`,
      params: {
        type: "discipline",
        period: "weekly",
      },
    },
  ]);
  assert.deepEqual(response, {
    rankings: [{ key: "discipline", score: 0.91 }],
  });
});

test("FuzzyAhpService#getFuzzyAhpAnalysis rejects invalid type", async () => {
  const service = new FuzzyAhpService(async () => ({ data: {} }));

  await assert.rejects(
    service.getFuzzyAhpAnalysis({ type: "invalid-type" }),
    /invalid type/i,
  );
});

test("FuzzyAhpService#getFuzzyAhpAnalysis rejects invalid period", async () => {
  const service = new FuzzyAhpService(async () => ({ data: {} }));

  await assert.rejects(
    service.getFuzzyAhpAnalysis({ type: "wfa", period: "daily" }),
    /invalid period/i,
  );
});

test("FuzzyAhpService#getFuzzyAhpAnalysis propagates request errors", async () => {
  const requestError = new Error("fuzzy ahp request failed");
  const service = new FuzzyAhpService(async () => {
    throw requestError;
  });

  await assert.rejects(
    service.getFuzzyAhpAnalysis({ type: "smart_ac", period: "monthly" }),
    (error) => {
      assert.equal(error, requestError);
      return true;
    },
  );
});

test("getFuzzyAhpAnalysis convenience export exists", () => {
  assert.equal(typeof getFuzzyAhpAnalysis, "function");
});
