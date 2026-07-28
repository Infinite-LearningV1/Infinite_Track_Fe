import test from "node:test";
import assert from "node:assert/strict";

import {
  WFA_REASON_ENDPOINTS,
  createWfaSettingsService,
  normalizeWfaReason,
} from "../src/js/services/wfaSettingsService.js";

test("reason kinds map to separate endpoint families", () => {
  assert.match(WFA_REASON_ENDPOINTS.request, /request-reasons$/);
  assert.match(WFA_REASON_ENDPOINTS.rejection, /rejection-reasons$/);
});

test("reason response normalizes into the canonical FE shape", () => {
  assert.deepEqual(
    normalizeWfaReason({
      id: 7,
      label: "Pertemuan klien",
      is_active: true,
      is_other: false,
      sort_order: 2,
    }),
    {
      id: 7,
      label: "Pertemuan klien",
      isActive: true,
      isOther: false,
      sortOrder: 2,
    },
  );
});

test("service selects the correct endpoint and supported payload", async () => {
  const calls = [];
  const service = createWfaSettingsService(async (config) => {
    calls.push(config);
    return {
      data: {
        data: {
          reasons: [
            {
              id: 1,
              label: "Lainnya",
              is_active: true,
              is_other: true,
              sort_order: 99,
            },
          ],
        },
      },
    };
  });

  const reasons = await service.listWfaReasons("request");
  assert.equal(calls[0].method, "get");
  assert.equal(calls[0].url, WFA_REASON_ENDPOINTS.request);
  assert.equal(reasons[0].isOther, true);
});

test("service rejects unsupported kinds and payload fields before network", async () => {
  let networkCalls = 0;
  const service = createWfaSettingsService(async () => {
    networkCalls += 1;
  });

  await assert.rejects(
    () => service.listWfaReasons("unknown"),
    /Unsupported WFA reason kind/,
  );
  await assert.rejects(
    () =>
      service.createWfaReason("request", {
        label: "Client",
        code: "CLIENT",
      }),
    /Unsupported WFA reason field: code/,
  );
  assert.equal(networkCalls, 0);
});

test("service preserves Backend error metadata", async () => {
  const service = createWfaSettingsService(async () => {
    const error = new Error("request failed");
    error.response = {
      status: 409,
      data: {
        code: "WFA_REASON_CATALOG_CONFLICT",
        message: "Other reason already exists",
        details: { field: "is_other" },
      },
    };
    throw error;
  });

  await assert.rejects(
    () =>
      service.createWfaReason("request", {
        label: "Other",
        is_other: true,
      }),
    (error) => {
      assert.equal(error.code, "WFA_REASON_CATALOG_CONFLICT");
      assert.equal(error.status, 409);
      assert.deepEqual(error.details, { field: "is_other" });
      return true;
    },
  );
});
