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
  getStatusBadgeClass,
  getStatusBadgeText,
  getInfoBadgeClass,
  getInfoBadgeText,
} from "../../utils/badgeHelpers.js";

/**
 * Alpine.js data untuk halaman attendance log
 * @returns {Object} - Alpine.js data object
 */
export function attendanceLogAlpineData() {
  return {
    // State data
    attendanceData: [],
    pagination: {
      current_page: 1,
      total_pages: 1,
      total_records: 0,
      has_prev_page: false,
      has_next_page: false,
      per_page: 10,
    },
    filters: {
      search: "",
      sortBy: "time_in",
      sortOrder: "DESC",
      page: 1,
      limit: 10,
    },
    isLoading: true,
    errorMessage: "",

    // Sort fields that are actively supported by current backend contract
    supportedSortFields: ["id", "full_name", "time_in", "time_out", "status"],

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

        const response = await getAttendanceLog(this.filters);

        // Update data dan pagination
        this.attendanceData = response.data || [];
        this.pagination = {
          current_page: response.pagination?.current_page || 1,
          total_pages: response.pagination?.total_pages || 1,
          total_records: response.pagination?.total_records || 0,
          has_prev_page: response.pagination?.has_prev_page || false,
          has_next_page: response.pagination?.has_next_page || false,
          per_page: response.pagination?.per_page || 10,
        };

        if (response.pagination?.per_page) {
          this.filters.limit = response.pagination.per_page;
        }
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
        clearTimeout(this.searchTimer);
      }

      // Set timer baru untuk debounce 500ms
      this.searchTimer = setTimeout(() => {
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
     * Change sorting
     * @param {string} newSortBy - Field untuk sorting
     */
    changeSort(newSortBy) {
      if (!this.isSortFieldSupported(newSortBy)) {
        return;
      }

      // Jika field sama, toggle order
      if (this.filters.sortBy === newSortBy) {
        this.filters.sortOrder =
          this.filters.sortOrder === "ASC" ? "DESC" : "ASC";
      } else {
        this.filters.sortBy = newSortBy;
        this.filters.sortOrder = "DESC"; // Default ke DESC untuk field baru
      }

      this.filters.page = 1; // Reset ke halaman pertama
      this.fetchAttendance();
    },

    /**
     * Change page
     * @param {number} newPage - Nomor halaman baru
     */
    changePage(newPage) {
      if (newPage >= 1 && newPage <= this.pagination.total_pages) {
        this.filters.page = newPage;
        this.fetchAttendance();
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
      this.fetchAttendance();
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
      if (!this.deleteTargetId) return;

      try {
        await deleteAttendance(this.deleteTargetId);

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
      }
    },

    /**
     * View location detail
     * @param {Object} attendanceItem - Data attendance item
     */
    viewLocation(attendanceItem) {
      // Siapkan payload untuk modal peta
      const locationPayload = {
        fullName: attendanceItem.full_name || "Unknown User",
        email: attendanceItem.email || "-",
        position: attendanceItem.role_name || "-",
        phoneNumber: attendanceItem.phone_number || "-",
        latitude: attendanceItem.location?.latitude || attendanceItem.latitude,
        longitude:
          attendanceItem.location?.longitude || attendanceItem.longitude,
        radius: attendanceItem.location?.radius || attendanceItem.radius || 100, // Default radius 100m
        description:
          attendanceItem.location?.description ||
          attendanceItem.location_description ||
          "Lokasi absensi karyawan",
      };

      // Call global function untuk membuka modal peta
      if (typeof window.openMapDetailModal === "function") {
        window.openMapDetailModal(locationPayload);
      } else {
        console.warn("openMapDetailModal function not found");
        // Fallback: tampilkan koordinat dalam alert
        if (locationPayload.latitude && locationPayload.longitude) {
          alert(
            `Koordinat: ${locationPayload.latitude}, ${locationPayload.longitude}`,
          );
        }
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
      return getInfoBadgeText(info);
    },

    /**
     * Get sort icon
     * @param {string} fieldName - Field name untuk sorting
     * @returns {string} - Icon class atau empty string
     */
    getSortIcon(fieldName) {
      if (!this.isSortFieldSupported(fieldName)) {
        return "";
      }

      if (this.filters.sortBy !== fieldName) {
        return ""; // Tidak ada icon jika field tidak sedang di-sort
      }

      return this.filters.sortOrder === "ASC" ? "↑" : "↓";
    },

    isSortFieldSupported(fieldName) {
      return this.supportedSortFields.includes(fieldName);
    },

    // Avatar utility functions (imported from utils)
    getInitials,
    getAvatarColor, // Formatting functions for templates
    formatDateTime,
    formatTime,
    formatDate,
  };
}
