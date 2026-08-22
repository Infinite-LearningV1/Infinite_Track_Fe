import test from "node:test";
import assert from "node:assert/strict";

import { API_CONFIG } from "../../src/js/config/env.js";
import {
  TodayLocationsService,
  getTodayLocations,
} from "../../src/js/services/todayLocationsService.js";

test("TodayLocationsService#getTodayLocations requests canonical endpoint with default limit=200", async () => {
  const seenConfigs = [];
  const service = new TodayLocationsService(async (config) => {
    seenConfigs.push(config);
    return { data: { locations: [] } };
  });

  const response = await service.getTodayLocations();

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/attendance/today-locations`,
      params: {
        limit: 200,
      },
    },
  ]);
  assert.deepEqual(response, { locations: [] });
});

test("TodayLocationsService#getTodayLocations forwards explicit limit", async () => {
  const seenConfigs = [];
  const service = new TodayLocationsService(async (config) => {
    seenConfigs.push(config);
    return { data: { locations: [{ id: 1 }] } };
  });

  await service.getTodayLocations({ limit: 75 });

  assert.deepEqual(seenConfigs, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/attendance/today-locations`,
      params: {
        limit: 75,
      },
    },
  ]);
});

test("TodayLocationsService#getTodayLocations propagates request errors", async () => {
  const requestError = new Error("today locations failed");
  const service = new TodayLocationsService(async () => {
    throw requestError;
  });

  await assert.rejects(service.getTodayLocations(), (error) => {
    assert.equal(error, requestError);
    return true;
  });
});

test("getTodayLocations convenience export exists", () => {
  assert.equal(typeof getTodayLocations, "function");
});
