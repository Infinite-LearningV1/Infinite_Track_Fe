/**
 * Booking API Service
 * Mengenkapsulasi logika panggilan API untuk manajemen data booking WFA
 */

import { API_CONFIG, envLog } from "../config/env.js";
import { authRequest } from "./authRequest.js";

const BOOKING_LIST_QUERY_KEYS = [
  "page",
  "limit",
  "search",
  "status",
  "date_from",
  "date_to",
];

export function buildBookingsListUrl(baseUrl, params = {}) {
  const queryParams = new URLSearchParams();
  for (const key of BOOKING_LIST_QUERY_KEYS) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, value);
    }
  }
  return `${baseUrl}/bookings${queryParams.toString() ? `?${queryParams}` : ""}`;
}

/**
 * Mengambil daftar booking dari API
 * @param {Object} params - Parameter query
 * @param {string} params.status - Filter status (pending, approved, rejected)
 * @param {string} params.search - Kata kunci pencarian nama/role
 * @param {string} params.sortBy - Field untuk sorting (default: 'custom')
 * @param {string} params.sortOrder - Order sorting ('ASC' atau 'DESC', default: 'DESC')
 * @param {number} params.page - Halaman (default: 1)
 * @param {number} params.limit - Jumlah data per halaman (default: 10)
 * @returns {Promise} - Promise yang resolve dengan data booking dan pagination
 */
export async function getBookings(params = {}) {
  try {
    const url = buildBookingsListUrl(API_CONFIG.BASE_URL, params);

    envLog("info", "GET Bookings:", { url, params });

    const response = await authRequest({
      method: "get",
      url,
      headers: {
        "Content-Type": "application/json",
      },
    });

    envLog("info", "Bookings Response:", response.data);

    return response.data;
  } catch (error) {
    envLog("error", "Error fetching bookings:", error);

    // Format error untuk penggunaan yang lebih mudah
    throw createBookingServiceError(
      error,
      error.request
        ? "Tidak dapat terhubung ke server. Periksa koneksi internet Anda."
        : "Terjadi kesalahan saat mengambil data booking",
    );
  }
}

/**
 * Update status booking
 * @param {string|number} bookingId - ID booking yang akan diupdate
 * @param {string} status - Status baru (approved, rejected)
 * @returns {Promise} - Promise yang resolve dengan response data
 */
export async function updateBookingStatus(bookingId, status) {
  try {
    if (!bookingId) {
      throw new Error("ID booking tidak valid");
    }

    if (!status || !["approved", "rejected"].includes(status)) {
      throw new Error("Status tidak valid");
    }

    const url = `${API_CONFIG.BASE_URL}/bookings/${bookingId}`;

    envLog("info", "PATCH Booking Status:", { url, bookingId, status });

    const response = await authRequest({
      method: "patch",
      url,
      data: { status },
      headers: {
        "Content-Type": "application/json",
      },
    });

    envLog("info", "Update Booking Status Response:", response.data);

    return response.data;
  } catch (error) {
    envLog("error", "Error updating booking status:", error);

    throw createBookingServiceError(
      error,
      error.request
        ? "Tidak dapat terhubung ke server. Periksa koneksi internet Anda."
        : "Terjadi kesalahan saat mengupdate status booking",
    );
  }
}

/**
 * Menghapus data booking berdasarkan ID
 * @param {string|number} bookingId - ID booking yang akan dihapus
 * @returns {Promise} - Promise yang resolve dengan response data
 */
export async function deleteBooking(bookingId) {
  try {
    if (!bookingId) {
      throw new Error("ID booking tidak valid");
    }

    const url = `${API_CONFIG.BASE_URL}/bookings/${bookingId}`;

    envLog("info", "DELETE Booking:", { url, bookingId });

    const response = await authRequest({
      method: "delete",
      url,
      headers: {
        "Content-Type": "application/json",
      },
    });

    envLog("info", "Delete Booking Response:", response.data);

    return response.data;
  } catch (error) {
    envLog("error", "Error deleting booking:", error);

    throw createBookingServiceError(
      error,
      error.request
        ? "Tidak dapat terhubung ke server. Periksa koneksi internet Anda."
        : "Terjadi kesalahan saat menghapus data booking",
    );
  }
}

function createBookingServiceError(error, fallbackMessage) {
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

function assertBookingId(bookingId) {
  const parsed = Number(bookingId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Booking ID must be a positive integer.");
  }
  return parsed;
}

function assertRejectionCommand(command = {}) {
  const reasonId = Number(command.rejectionReasonId);
  if (!Number.isInteger(reasonId) || reasonId <= 0) {
    throw new Error("Rejection reason ID must be a positive integer.");
  }

  if (
    command.rejectionNote !== null &&
    command.rejectionNote !== undefined &&
    typeof command.rejectionNote !== "string"
  ) {
    throw new Error("Rejection note must be a string or null.");
  }

  return {
    rejectionReasonId: reasonId,
    rejectionNote: String(command.rejectionNote ?? "").trim() || null,
  };
}

function createBookingCommandService(requestExecutor = authRequest) {
  return {
    async approveBooking(bookingId) {
      const id = assertBookingId(bookingId);

      try {
        const response = await requestExecutor({
          method: "patch",
          url: `${API_CONFIG.BASE_URL}/bookings/${id}`,
          data: { status: "approved" },
          headers: { "Content-Type": "application/json" },
        });
        return response.data;
      } catch (error) {
        throw createBookingServiceError(error, "Gagal menyetujui booking.");
      }
    },

    async rejectBooking(bookingId, command) {
      const id = assertBookingId(bookingId);
      const normalized = assertRejectionCommand(command);

      try {
        const response = await requestExecutor({
          method: "patch",
          url: `${API_CONFIG.BASE_URL}/bookings/${id}`,
          data: {
            status: "rejected",
            rejection_reason_id: normalized.rejectionReasonId,
            rejection_note: normalized.rejectionNote,
          },
          headers: { "Content-Type": "application/json" },
        });
        return response.data;
      } catch (error) {
        throw createBookingServiceError(error, "Gagal menolak booking.");
      }
    },
  };
}

const bookingCommandService = createBookingCommandService();

const approveBooking = (bookingId) =>
  bookingCommandService.approveBooking(bookingId);
const rejectBooking = (bookingId, command) =>
  bookingCommandService.rejectBooking(bookingId, command);

export {
  createBookingServiceError,
  createBookingCommandService,
  approveBooking,
  rejectBooking,
};
