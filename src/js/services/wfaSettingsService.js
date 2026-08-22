import { API_CONFIG } from "../config/env.js";
import { authRequest } from "./authRequest.js";

const WFA_REASON_ENDPOINTS = Object.freeze({
  request: `${API_CONFIG.BASE_URL}/settings/wfa/request-reasons`,
  rejection: `${API_CONFIG.BASE_URL}/settings/wfa/rejection-reasons`,
});

const WFA_REASON_MUTATION_FIELDS = Object.freeze([
  "label",
  "is_active",
  "is_other",
  "sort_order",
]);

function assertWfaReasonKind(kind) {
  if (!Object.hasOwn(WFA_REASON_ENDPOINTS, kind)) {
    throw new Error(`Unsupported WFA reason kind: ${kind}`);
  }

  return kind;
}

function assertReasonId(reasonId) {
  const parsed = Number(reasonId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("WFA reason ID must be a positive integer.");
  }

  return parsed;
}

function assertWfaReasonPayload(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("WFA reason payload must be an object.");
  }

  for (const field of Object.keys(payload)) {
    if (!WFA_REASON_MUTATION_FIELDS.includes(field)) {
      throw new Error(`Unsupported WFA reason field: ${field}`);
    }
  }

  return payload;
}

function normalizeWfaReason(row = {}) {
  const id = Number(row.id ?? row.reason_id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("WFA reason response contains an invalid ID.");
  }

  const label = String(row.label ?? "").trim();
  if (!label) {
    throw new Error("WFA reason response contains an empty label.");
  }

  const sortOrder = Number(row.sort_order ?? row.sortOrder);

  return {
    id,
    label,
    isActive: Boolean(row.is_active ?? row.isActive),
    isOther: Boolean(row.is_other ?? row.isOther),
    sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
  };
}

function createWfaServiceError(error, fallbackMessage) {
  const backend = error?.response?.data;
  const serviceError = new Error(
    backend?.message || error?.message || fallbackMessage,
    { cause: error },
  );

  serviceError.code = backend?.code || null;
  serviceError.status = error?.response?.status || null;
  serviceError.details = backend?.details || null;
  serviceError.fieldErrors =
    backend?.field_errors || backend?.fieldErrors || null;
  return serviceError;
}

function extractReasonRows(responseData) {
  const rows =
    responseData?.data?.reasons ??
    responseData?.reasons ??
    responseData?.data ??
    responseData;

  if (!Array.isArray(rows)) {
    throw new Error("WFA reason response must contain a reasons array.");
  }

  return rows.map(normalizeWfaReason).sort((left, right) => {
    return (
      left.sortOrder - right.sortOrder ||
      left.label.localeCompare(right.label, "id-ID")
    );
  });
}

function extractReasonRow(responseData) {
  const reason =
    responseData?.data?.reason ??
    responseData?.reason ??
    responseData?.data ??
    responseData;
  return normalizeWfaReason(reason);
}

function createWfaSettingsService(requestExecutor = authRequest) {
  return {
    async listWfaReasons(kind) {
      try {
        assertWfaReasonKind(kind);
        const response = await requestExecutor({
          method: "get",
          url: WFA_REASON_ENDPOINTS[kind],
        });
        return extractReasonRows(response.data);
      } catch (error) {
        throw createWfaServiceError(error, "Gagal memuat alasan WFA.");
      }
    },

    async createWfaReason(kind, payload) {
      try {
        assertWfaReasonKind(kind);
        assertWfaReasonPayload(payload);
        const response = await requestExecutor({
          method: "post",
          url: WFA_REASON_ENDPOINTS[kind],
          data: payload,
        });
        return extractReasonRow(response.data);
      } catch (error) {
        throw createWfaServiceError(error, "Gagal menambahkan alasan WFA.");
      }
    },

    async updateWfaReason(kind, reasonId, payload) {
      try {
        assertWfaReasonKind(kind);
        const id = assertReasonId(reasonId);
        assertWfaReasonPayload(payload);
        const response = await requestExecutor({
          method: "patch",
          url: `${WFA_REASON_ENDPOINTS[kind]}/${id}`,
          data: payload,
        });
        return extractReasonRow(response.data);
      } catch (error) {
        throw createWfaServiceError(error, "Gagal memperbarui alasan WFA.");
      }
    },
  };
}

const defaultService = createWfaSettingsService();

const listWfaReasons = (kind) => defaultService.listWfaReasons(kind);
const createWfaReason = (kind, payload) =>
  defaultService.createWfaReason(kind, payload);
const updateWfaReason = (kind, reasonId, payload) =>
  defaultService.updateWfaReason(kind, reasonId, payload);

export {
  WFA_REASON_ENDPOINTS,
  WFA_REASON_MUTATION_FIELDS,
  assertWfaReasonKind,
  assertWfaReasonPayload,
  normalizeWfaReason,
  createWfaServiceError,
  createWfaSettingsService,
  listWfaReasons,
  createWfaReason,
  updateWfaReason,
};
