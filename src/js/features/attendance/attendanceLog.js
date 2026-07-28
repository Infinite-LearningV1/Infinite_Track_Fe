/**
 * Attendance Log Feature
 * Mengelola state dan logika untuk halaman log absensi
 */

import {
  getAttendanceLog,
  deleteAttendance,
} from "../../services/attendanceService.js";
import {
  formatDateTime,
  formatTime,
  formatDate,
} from "../../utils/dateTimeFormatter.js";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils.js";
import {
  firstFiniteMapNumber,
  hasFiniteCoordinates,
} from "../../utils/mapLocationTruth.js";
import {
  getStatusBadgeClass,
  getStatusBadgeText,
  getInfoBadgeClass,
  getInfoBadgeText,
} from "../../utils/badgeHelpers.js";

export function normalizeAttendanceListResponse(response = {}) {
  const pagination = response.pagination ?? {};
  return {
    data: Array.isArray(response.data) ? response.data : [],
    pagination: {
      current_page: pagination.current_page ?? 1,
      total_pages: pagination.total_pages ?? 1,
      total_records: pagination.total_records ?? 0,
      records_per_page:
        pagination.records_per_page ?? pagination.per_page ?? 10,
      has_prev_page: pagination.has_prev_page ?? false,
      has_next_page: pagination.has_next_page ?? false,
    },
  };
}

export function buildAttendanceLocation(attendanceItem = {}) {
  return {
    fullName: attendanceItem.full_name ?? "",
    latitude: firstFiniteMapNumber(
      attendanceItem.location?.latitude,
      attendanceItem.latitude,
    ),
    longitude: firstFiniteMapNumber(
      attendanceItem.location?.longitude,
      attendanceItem.longitude,
    ),
    radius: firstFiniteMapNumber(
      attendanceItem.location?.radius,
      attendanceItem.radius,
    ),
    description:
      attendanceItem.location?.description ??
      attendanceItem.location_description ??
      "",
  };
}

/**
 * Alpine.js data untuk halaman attendance log
 * @returns {Object} - Alpine.js data object
 */
export function attendanceLogAlpineData(overrides = {}) {
  const services = {
    getAttendanceLog: overrides.getAttendanceLog || getAttendanceLog,
    deleteAttendance: overrides.deleteAttendance || deleteAttendance,
  };
  const schedule = overrides.setTimeout || globalThis.setTimeout;
  const cancelSchedule = overrides.clearTimeout || globalThis.clearTimeout;

  return {
    // State data
    attendanceData: [],
    pagination: {
      current_page: 1,
      total_pages: 1,
      total_records: 0,
      has_prev_page: false,
      has_next_page: false,
      records_per_page: 10,
    },
    filters: {
      search: "",
      page: 1,
      limit: 10,
    },
    isLoading: true,
    errorMessage: "",

    // Search input proxy -> single request state (filters.search)
    get searchTerm() {
      return this.filters.search;
    },
    set searchTerm(value) {
      this.filters.search = value;
    },

    // Modal states (legacy)
    isDeleteModalOpen: false,
    deleteConfirmMessage: "",
    deleteTargetId: null,
    isDeleting: false,

    // Debounce timer untuk search
    searchTimer: null,

    /**
     * Initialize component
     */
    async init() {
      await this.fetchAttendance();
    },

    /**
     * Fetch attendance data dari API
     */
    async fetchAttendance() {
      try {
        this.isLoading = true;
        this.errorMessage = "";

        const response = await services.getAttendanceLog({ ...this.filters });
        const normalizedResponse = normalizeAttendanceListResponse(response);

        // Update data dan pagination
        this.attendanceData = normalizedResponse.data;
        this.pagination = normalizedResponse.pagination;
        this.filters.limit = normalizedResponse.pagination.records_per_page;
      } catch (error) {
        this.errorMessage = error.message || "Gagal memuat data absensi";
        console.error("Error fetching attendance:", error);

        // Tampilkan modal error
        if (typeof window.showAlertModal === "function") {
          window.showAlertModal({
            type: "danger",
            title: "Gagal Memuat Data Absensi",
            message: this.errorMessage,
            buttonText: "OK",
          });
        }
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Handle search input dengan debounce
     */
    handleSearchInput() {
      // Clear timer sebelumnya
      if (this.searchTimer) {
        cancelSchedule(this.searchTimer);
      }

      // Set timer baru untuk debounce 500ms
      this.searchTimer = schedule(() => {
        this.filters.page = 1; // Reset ke halaman pertama
        this.fetchAttendance();
      }, 500);
    },

    /**
     * Debounced search function untuk x-model
     */
    debouncedSearch() {
      this.handleSearchInput();
    },

    /**
     * Change page
     * @param {number} newPage - Nomor halaman baru
     */
    changePage(newPage) {
      if (newPage >= 1 && newPage <= this.pagination.total_pages) {
        this.filters.page = newPage;
        return this.fetchAttendance();
      }
    },

    /**
     * Change entries per page (server-driven)
     * @param {number|string} newLimit - Jumlah data per halaman
     */
    changeLimit(newLimit) {
      const parsedLimit = Number(newLimit);
      this.filters.limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
      this.filters.page = 1;
      return this.fetchAttendance();
    },

    /**
     * Confirm delete menggunakan alert modal (warning) + OK/Batal
     * @param {string} attendanceId - ID absensi yang akan dihapus
     */
    confirmDelete(attendanceId) {
      this.deleteTargetId = attendanceId;
      if (typeof window.showAlertModal === "function") {
        window.showAlertModal({
          type: "warning",
          title: "Konfirmasi Hapus Data",
          message:
            "Apakah Anda yakin ingin menghapus data absensi ini? Tindakan ini tidak dapat dibatalkan.",
          buttonText: "Ya, Hapus",
          secondaryButtonText: "Batal",
          onOk: () => this.executeDelete(),
        });
      }
    },

    /**
     * Execute delete attendance (dipanggil via alert confirm OK)
     */
    async executeDelete() {
      if (!this.deleteTargetId || this.isDeleting) return;

      this.isDeleting = true;

      try {
        await services.deleteAttendance(this.deleteTargetId);

        // Reset target
        this.deleteTargetId = null;

        // Tampilkan alert inline sukses
        if (typeof window.showInlineAlert === "function") {
          window.showInlineAlert({
            type: "success",
            title: "Data Absensi Dihapus",
            message: "Data absensi berhasil dihapus dari sistem.",
          });
        }

        // Refresh data
        await this.fetchAttendance();
      } catch (error) {
        console.error("Error deleting attendance:", error);

        // Reset target
        this.deleteTargetId = null;

        // Tampilkan alert inline error
        if (typeof window.showInlineAlert === "function") {
          window.showInlineAlert({
            type: "danger",
            title: "Gagal Menghapus Data",
            message:
              error.message || "Terjadi kesalahan saat menghapus data absensi.",
          });
        }
      } finally {
        this.isDeleting = false;
      }
    },

    /**
     * View location detail
     * @param {Object} attendanceItem - Data attendance item
     */
    viewLocation(attendanceItem) {
      if (!this.hasAttendanceCoordinates(attendanceItem)) {
        return;
      }

      const locationPayload = buildAttendanceLocation(attendanceItem);

      if (typeof window.openMapDetailModal === "function") {
        window.openMapDetailModal(locationPayload);
      }
    },

    /**
     * Format datetime menggunakan utility function
     * @param {string} isoString - ISO date string
     * @returns {string} - Formatted datetime
     */
    formatDateTime(isoString) {
      return formatDateTime(isoString);
    },

    /**
     * Get status badge class (using universal badge helper)
     */
    getStatusBadgeClass(status) {
      return getStatusBadgeClass(status);
    },

    /**
     * Get status badge text (using universal badge helper)
     */
    getStatusBadgeText(status) {
      return getStatusBadgeText(status);
    },

    /**
     * Get information badge class (using universal badge helper)
     */
    getInfoBadgeClass(info) {
      return getInfoBadgeClass(info);
    },

    /**
     * Get information badge text (using universal badge helper)
     */
    getInfoBadgeText(info) {
      return info ? getInfoBadgeText(info) : "-";
    },

    hasAttendanceCoordinates(log) {
      return hasFiniteCoordinates({
        latitude: firstFiniteMapNumber(log.location?.latitude, log.latitude),
        longitude: firstFiniteMapNumber(
          log.location?.longitude,
          log.longitude,
        ),
      });
    },

    // Avatar utility functions (imported from utils)
    getInitials,
    getAvatarColor, // Formatting functions for templates
    formatDateTime,
    formatTime,
    formatDate,
  };
}
