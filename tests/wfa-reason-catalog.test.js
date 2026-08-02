import test from "node:test";
import assert from "node:assert/strict";

import {
  WFA_REASON_ENDPOINTS,
  createWfaSettingsService,
  normalizeWfaReason,
} from "../src/js/services/wfaSettingsService.js";
import { wfaReasonCatalogAlpineData } from "../src/js/features/wfaSettings/wfaReasonCatalog.js";

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

function createCatalogService() {
  const calls = [];
  const rows = [
    {
      id: 1,
      label: "Client meeting",
      isActive: true,
      isOther: false,
      sortOrder: 1,
    },
    {
      id: 2,
      label: "Other",
      isActive: true,
      isOther: true,
      sortOrder: 99,
    },
  ];

  return {
    calls,
    service: {
      async listWfaReasons(kind) {
        calls.push(["list", kind]);
        return rows;
      },
      async createWfaReason(kind, payload) {
        calls.push(["create", kind, payload]);
        return {
          id: 3,
          label: payload.label,
          isActive: true,
          isOther: payload.is_other,
          sortOrder: payload.sort_order,
        };
      },
      async updateWfaReason(kind, id, payload) {
        calls.push(["update", kind, id, payload]);
        const current = rows.find((row) => row.id === id);
        return {
          ...current,
          label: payload.label ?? current.label,
          isActive: payload.is_active ?? current.isActive,
          isOther: payload.is_other ?? current.isOther,
          sortOrder: payload.sort_order ?? current.sortOrder,
        };
      },
    },
  };
}

test("catalog factory loads only its requested kind", async () => {
  const { service, calls } = createCatalogService();
  const state = wfaReasonCatalogAlpineData("request", service);
  await state.init();

  assert.deepEqual(calls, [["list", "request"]]);
  assert.equal(state.items.length, 2);
  assert.equal(state.isLoading, false);
});

test("catalog editor validates label and sort order", () => {
  const { service } = createCatalogService();
  const state = wfaReasonCatalogAlpineData("request", service);

  state.form = { label: "", isOther: false, sortOrder: "-1" };
  assert.equal(state.validateEditor(), false);
  assert.match(state.fieldErrors.label, /wajib/);
  assert.match(state.fieldErrors.sortOrder, /nol atau lebih besar/);
});

test("catalog blocks duplicate saves", async () => {
  let resolveCreate;
  let createCalls = 0;
  const service = {
    async listWfaReasons() {
      return [];
    },
    async createWfaReason() {
      createCalls += 1;
      return new Promise((resolve) => {
        resolveCreate = resolve;
      });
    },
    async updateWfaReason() {
      throw new Error("not used");
    },
  };

  const state = wfaReasonCatalogAlpineData("request", service);
  state.openCreate();
  state.form = { label: "Client", isOther: false, sortOrder: "1" };

  const first = state.saveEditor();
  const second = state.saveEditor();
  assert.equal(createCalls, 1);
  resolveCreate({
    id: 9,
    label: "Client",
    isActive: true,
    isOther: false,
    sortOrder: 1,
  });
  await Promise.all([first, second]);
});

test("catalog toggle resynchronizes one row and blocks duplicate requests", async () => {
  let resolveUpdate;
  let updateCalls = 0;
  const reason = {
    id: 1,
    label: "Client",
    isActive: true,
    isOther: false,
    sortOrder: 1,
  };
  const service = {
    async listWfaReasons() {
      return [reason];
    },
    async createWfaReason() {
      throw new Error("not used");
    },
    async updateWfaReason() {
      updateCalls += 1;
      return new Promise((resolve) => {
        resolveUpdate = resolve;
      });
    },
  };
  const state = wfaReasonCatalogAlpineData("request", service);
  await state.init();

  const first = state.setReasonActive(reason, false);
  const second = state.setReasonActive(reason, false);
  assert.equal(updateCalls, 1);
  resolveUpdate({ ...reason, isActive: false });
  await Promise.all([first, second]);
  assert.equal(state.items[0].isActive, false);
});

test("catalog maps stable Backend conflict codes to safe Indonesian copy", async () => {
  const conflict = new Error("Other reason already exists");
  conflict.code = "WFA_REASON_CATALOG_CONFLICT";
  const service = {
    async listWfaReasons() {
      return [];
    },
    async createWfaReason() {
      throw conflict;
    },
    async updateWfaReason() {
      throw new Error("not used");
    },
  };
  const state = wfaReasonCatalogAlpineData("request", service);
  state.openCreate();
  state.form = { label: "Lainnya", isOther: true, sortOrder: "99" };

  await state.saveEditor();

  assert.equal(
    state.saveError,
    "Katalog alasan bertentangan dengan aturan Backend. Muat ulang lalu periksa alasan Lainnya.",
  );
});
