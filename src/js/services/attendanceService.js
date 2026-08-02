/**
 * Attendance API Service
 * Mengenkapsulasi logika panggilan API untuk manajemen data absensi
 */

import { API_CONFIG, envLog } from "../config/env.js";
import { authRequest } from "./authRequest.js";

const ATTENDANCE_LIST_QUERY_KEYS = Object.freeze([
  "page",
  "limit",
  "search",
  "from",
  "to",
  "mode",
  "status",
  "checkout_state",
  "sortBy",
  "sortOrder",
]);

function hasQueryValue(value) {
  return value !== undefined && value !== null && value !== "";
}

export function buildAttendanceListUrl(baseUrl, params = {}) {
  const queryParams = new URLSearchParams();

  for (const key of ATTENDANCE_LIST_QUERY_KEYS) {
    if (hasQueryValue(params[key])) {
      queryParams.append(key, params[key]);
    }
  }

  const attendanceUrl = `${baseUrl.replace(/\/+$/, "")}/attendance`;
  const query = queryParams.toString();
  return query ? `${attendanceUrl}?${query}` : attendanceUrl;
}

export function normalizeAttendanceServiceError(
  error,
  fallbackMessage,
  unexpectedMessage = fallbackMessage,
) {
  if (error?.response) {
    const normalized = new Error(
      error.response.data?.message || fallbackMessage,
    );
    normalized.status = error.response.status;

    const backendCode = error.response.data?.code;
    if (
      backendCode !== undefined &&
      backendCode !== null &&
      backendCode !== ""
    ) {
      normalized.code = backendCode;
    }

    return normalized;
  }

  if (error?.request) {
    return new Error(
      "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
    );
  }

  return new Error(unexpectedMessage);
}

/**
 * Mengambil daftar log absensi dari API
 * @param {Object} params - Parameter query
 * @param {string} params.search - Kata kunci pencarian
 * @param {number} params.page - Halaman (default: 1)
 * @param {number} params.limit - Jumlah data per halaman (default: 10)
 * @param {string} params.from - Tanggal awal (YYYY-MM-DD)
 * @param {string} params.to - Tanggal akhir (YYYY-MM-DD)
 * @param {string} params.mode - Mode kerja (WFO, WFH, WFA)
 * @param {string} params.status - Status absensi
 * @param {string} params.checkout_state - Status checkout
 * @param {Function} requestExecutor - Executor request (default: authRequest)
 * @returns {Promise} - Promise yang resolve dengan data attendance dan pagination
 */
export async function getAttendanceLog(
  params = {},
  requestExecutor = authRequest,
) {
  try {
    const url = buildAttendanceListUrl(API_CONFIG.BASE_URL, params);

    envLog("info", "GET Attendance Log:", { url, params });

    const response = await requestExecutor({
      method: "get",
      url,
      headers: {
        "Content-Type": "application/json",
      },
    });

    envLog("info", "Attendance Log Response:", response.data);

    return response.data;
  } catch (error) {
    envLog("error", "Error fetching attendance log:", error);

    throw normalizeAttendanceServiceError(
      error,
      "Gagal mengambil data absensi",
      "Terjadi kesalahan saat mengambil data absensi",
    );
  }
}

/**
 * Mengambil detail absensi berdasarkan ID.
 * @param {string|number} attendanceId - ID absensi
 * @param {Function} requestExecutor - Executor request (default: authRequest)
 * @returns {Promise<Object>} Detail absensi dari Backend
 */
export async function getAttendanceById(
  attendanceId,
  requestExecutor = authRequest,
) {
  if (
    attendanceId === undefined ||
    attendanceId === null ||
    (typeof attendanceId === "string" && attendanceId.trim() === "")
  ) {
    throw new Error("ID absensi tidak valid");
  }

  try {
    const url = `${API_CONFIG.BASE_URL.replace(/\/+$/, "")}/attendance/${attendanceId}`;

    envLog("info", "GET Attendance Detail:", { url, attendanceId });

    const response = await requestExecutor({
      method: "get",
      url,
      headers: {
        "Content-Type": "application/json",
      },
    });

    envLog("info", "Attendance Detail Response:", response.data);

    return response.data;
  } catch (error) {
    envLog("error", "Error fetching attendance detail:", error);
    throw normalizeAttendanceServiceError(
      error,
      "Gagal mengambil detail absensi",
      "Terjadi kesalahan saat mengambil detail absensi",
    );
  }
}

/**
 * Menghapus data absensi berdasarkan ID
 * @param {string|number} attendanceId - ID absensi yang akan dihapus
 * @returns {Promise} - Promise yang resolve dengan response data
 */
export async function deleteAttendance(
  attendanceId,
  requestExecutor = authRequest,
) {
  try {
    if (!attendanceId) {
      throw new Error("ID absensi tidak valid");
    }

    const url = `${API_CONFIG.BASE_URL}/attendance/${attendanceId}`;

    envLog("info", "DELETE Attendance:", { url, attendanceId });

    const response = await requestExecutor({
      method: "delete",
      url,
      headers: {
        "Content-Type": "application/json",
      },
    });

    envLog("info", "Delete Attendance Response:", response.data);

    return response.data;
  } catch (error) {
    envLog("error", "Error deleting attendance:", error);

    throw normalizeAttendanceServiceError(
      error,
      "Gagal menghapus data absensi",
      "Terjadi kesalahan saat menghapus data absensi",
    );
  }
}
