/**
 * Attendance API Service
 * Mengenkapsulasi logika panggilan API untuk manajemen data absensi
 */

import { API_CONFIG, envLog } from "../config/env.js";
import { authRequest } from "./authRequest.js";

/**
 * Mengambil daftar log absensi dari API
 * @param {Object} params - Parameter query
 * @param {string} params.search - Kata kunci pencarian
 * @param {string} params.sortBy - Field untuk sorting (default: 'time_in')
 * @param {string} params.sortOrder - Order sorting ('ASC' atau 'DESC', default: 'DESC')
 * @param {number} params.page - Halaman (default: 1)
 * @param {number} params.limit - Jumlah data per halaman (default: 10)
 * @returns {Promise} - Promise yang resolve dengan data attendance dan pagination
 */
export async function getAttendanceLog(params = {}) {
  try {
    // Buat query string dari parameter
    const queryParams = new URLSearchParams();

    if (params.search) {
      queryParams.append("search", params.search);
    }
    if (params.sortBy) {
      queryParams.append("sortBy", params.sortBy);
    }
    if (params.sortOrder) {
      queryParams.append("sortOrder", params.sortOrder);
    }
    if (params.page) {
      queryParams.append("page", params.page);
    }
    if (params.limit) {
      queryParams.append("limit", params.limit);
    }

    const url = `${API_CONFIG.BASE_URL}/attendance${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

    envLog("info", "GET Attendance Log:", { url, params });

    const response = await authRequest({
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

    // Format error untuk penggunaan yang lebih mudah
    if (error.response) {
      const errorMessage =
        error.response.data?.message || "Gagal mengambil data absensi";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error("Terjadi kesalahan saat mengambil data absensi");
    }
  }
}

/**
 * Menghapus data absensi berdasarkan ID
 * @param {string|number} attendanceId - ID absensi yang akan dihapus
 * @returns {Promise} - Promise yang resolve dengan response data
 */
export async function deleteAttendance(attendanceId) {
  try {
    if (!attendanceId) {
      throw new Error("ID absensi tidak valid");
    }

    const url = `${API_CONFIG.BASE_URL}/attendance/${attendanceId}`;

    envLog("info", "DELETE Attendance:", { url, attendanceId });

    const response = await authRequest({
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

    // Format error untuk penggunaan yang lebih mudah
    if (error.response) {
      const errorMessage =
        error.response.data?.message || "Gagal menghapus data absensi";
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error("Terjadi kesalahan saat menghapus data absensi");
    }
  }
}
