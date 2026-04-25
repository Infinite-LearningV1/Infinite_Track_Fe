import { getSummaryReport } from "../../services/reportService.js";
import {
  generatePDFReport,
  generateExcelReport,
} from "../../utils/reportGenerator.js";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils.js";
import { deleteAttendance } from "../../services/attendanceService.js";
import {
  getStatusBadgeClass,
  getStatusBadgeText,
  getInfoBadgeClass,
  getInfoBadgeText,
} from "../../utils/badgeHelpers.js";
import {
  applyDashboardPageSize,
  applyDashboardPeriod,
  applyDashboardSearch,
  buildDashboardRequestParams,
  createEmptyDashboardPagination,
  normalizeDashboardPagination,
  sortDashboardRows,
} from "./dashboardTableState.js";

/**
 * Alpine.js component untuk dashboard functionality
 */
export function dashboard() {
  return {
    // Dashboard table strategy: server-driven.
    // Request state lives in `filters`, server pagination lives in `pagination`,
    // and rendered rows live in `reportData`. Do not add a second local
    // search/pagination model for the active table path.
    loading: false,
    error: null,

    // Pagination state
    pagination: createEmptyDashboardPagination(5),

    // Filter state
    filters: {
      period: "all",
      page: 1,
      limit: 5,
      search: "",
    },

    // Table state properties
    isLoading: false,
    errorMessage: null,

    // Search input/debounce UI state
    searchQuery: "",
    searchTimeout: null,

    // Modal states (legacy)
    isDeleteModalOpen: false,
    deleteConfirmMessage: "",
    deleteTargetId: null,

    // Raw API data untuk export
    rawApiData: null,

    // Export state
    isExporting: false,

    // Data properties
    summaryData: {
      summary: {
        onTime: 0,
        late: 0,
        alpha: 0,
        wfo: 0,
        wfh: 0,
        wfa: 0,
      },
      report: [],
    },

    // Summary data untuk card - terpengaruh period filter (cards update when period changes)
    cardSummaryData: {
      onTime: 1,
      late: 15,
      alpha: 0,
      wfo: 13,
      wfh: 1,
      wfa: 2,
    },

    // Summary statistics data untuk tabel - terpengaruh period filter
    summaryStatsData: {
      total_ontime: 0,
      total_late: 0,
      total_alpha: 0,
      total_wfo: 0,
      total_wfh: 0,
      total_wfa: 0,
    },

    // Analytics data (new)
    analyticsData: {
      discipline_index: 0,
      performance_trend: "stable",
      avg_work_hours: 0,
    },

    // Report data for table display
    reportData: [],

    // Available period options
    periodOptions: [
      { value: "all", label: "All Time" },
      { value: "daily", label: "Daily" },
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" },
    ],

    // Sorting functionality
    currentSort: { field: null, direction: "asc" },

    get sortedReportData() {
      return sortDashboardRows(this.reportData, this.currentSort);
    },

    /**
     * Initialize component
     */
    async init() {
      console.log("Dashboard component initialized");

      // Set some initial test data immediately
      this.summaryData = {
        summary: {
          onTime: 1,
          late: 15,
          alpha: 0,
          wfo: 13,
          wfh: 1,
          wfa: 2,
        },
        report: [],
      };

      // Initial card summary data (akan diupdate dari API)
      this.cardSummaryData = {
        onTime: 1,
        late: 15,
        alpha: 0,
        wfo: 13,
        wfh: 1,
        wfa: 2,
      };

      this.analyticsData = {
        discipline_index: 78.5,
        performance_trend: "improving",
        avg_work_hours: 8.2,
      };

      this.searchQuery = this.filters.search;

      console.log("Initial test data set:", this.summaryData);

      await this.loadSummaryData();
    },

    /**
     * Load summary data dari API - menggunakan period filter untuk semua tampilan dashboard
     */
    async loadSummaryData() {
      this.loading = true;
      this.isLoading = true;
      this.error = null;
      this.errorMessage = null;

      try {
        console.log(
          `Loading dashboard data for page: ${this.filters.page}, search: ${this.filters.search}, period: ${this.filters.period}`,
        );

        const response = await getSummaryReport(
          buildDashboardRequestParams(this.filters),
        );

        console.log(
          `Dashboard API call made with period='${this.filters.period}'`,
        );

        // Handle API response format dan mapping field names
        if (response && response.summary) {
          // Map API field names ke component field names
          const mappedSummary = {
            onTime: response.summary.total_ontime || 0,
            late: response.summary.total_late || 0,
            alpha: response.summary.total_alpha || 0,
            wfo: response.summary.total_wfo || 0,
            wfh: response.summary.total_wfh || 0,
            wfa: response.summary.total_wfa || 0,
          };

          // Update card summary data (terpengaruh period filter)
          this.cardSummaryData = { ...mappedSummary };
          console.log(
            `✅ Card summary data updated for period '${this.filters.period}':`,
            this.cardSummaryData,
          );

          // Extract analytics data
          this.analyticsData = response.analytics || {
            discipline_index: 0,
            performance_trend: "stable",
            avg_work_hours: 0,
          };

          // Extract report data dari nested structure
          const reportData = response.report?.data || response.report || [];

          this.pagination = normalizeDashboardPagination(
            response.report?.pagination || {},
            this.filters.limit,
          );
          this.reportData = reportData.map((item, index) => ({
            id_attendance: item.attendance_id || `attendance_${index}`,
            id:
              item.nip_nim ||
              item.user_id ||
              `EMP${String(index + 1).padStart(3, "0")}`,
            full_name: item.full_name || "Unknown User",
            role_name: item.role || "Employee",
            time_in: item.time_in || null,
            time_out: item.time_out || null,
            work_hour:
              item.work_hour ||
              this.calculateWorkHours(item.time_in, item.time_out),
            status: item.status || "Present",
            information:
              item.location_details?.category || item.information || "N/A",
            attendance_date: item.attendance_date || null,
            nip_nim: item.nip_nim || null,
            email: item.email || null,
            notes: item.notes || null,
            phone_number: item.phone_number || null,
            // Discipline data (new)
            discipline_score: item.discipline_score || 0,
            discipline_label: item.discipline_label || "Unknown",
            // Location mapping - exact same structure as attendance table expects
            location: {
              latitude: item.location_details?.coordinates?.latitude || null,
              longitude: item.location_details?.coordinates?.longitude || null,
              radius: item.location_details?.radius || 100,
              description:
                item.location_details?.description || "Location not specified",
            },
            location_description:
              item.location_details?.description || "Location not specified",
            // Additional location details for compatibility
            latitude: item.location_details?.coordinates?.latitude || null,
            longitude: item.location_details?.coordinates?.longitude || null,
            ...item, // spread any additional fields
          }));

          this.summaryData = {
            summary: mappedSummary,
            report: reportData,
          };

          // Simpan juga raw API response untuk export
          this.rawApiData = {
            summary: response.summary,
            report: response.report,
          };

          console.log("Summary data loaded successfully:", this.summaryData);
          console.log("Report data mapped:", this.reportData);
        } else {
          // No valid response data
          console.warn("No valid data received from API");
          this.handleEmptyApiResponse();
        }
      } catch (error) {
        console.error("Error loading summary data:", error);
        this.loading = false;
        this.isLoading = false;
        this.errorMessage = error.message;

        // Clear all data and show error state - no mock data fallback
        this.summaryData = null;
        this.rawApiData = null; // Critical: No mock data for export
        this.analyticsData = null;
        this.reportData = [];

        // Preserve canonical search state so users can retry the same query
        this.pagination = createEmptyDashboardPagination(this.filters.limit);

        // Show user-friendly error message
        this.showNotification(
          "Failed to load dashboard data. Please check your connection and try again.",
          "error",
        );
      } finally {
        this.loading = false;
        this.isLoading = false;
      }
    },

    /**
     * Load data khusus untuk export dengan period filter - ambil SEMUA data
     */
    async loadExportData() {
      try {
        console.log(`Loading export data with period: ${this.filters.period}`);

        const response = await getSummaryReport({
          period: this.filters.period,
          page: 1,
          limit: 10000,
          search: "",
        });

        if (response && response.summary) {
          // Update rawApiData untuk export
          const exportData = {
            summary: response.summary,
            report: response.report,
          };

          console.log(`Export data loaded successfully:`, {
            period: this.filters.period,
            summaryStats: response.summary,
            recordCount: response.report?.data?.length || 0,
            totalRecords: response.report?.pagination?.total_records || 0,
          });

          return exportData;
        } else {
          throw new Error("No valid export data received from API");
        }
      } catch (error) {
        console.error("Error loading export data:", error);
        throw error;
      }
    },

    /**
     * Calculate work hours from check in and check out times
     */
    calculateWorkHours(checkIn, checkOut) {
      if (!checkIn || !checkOut) return null;

      try {
        const timeIn = new Date(`2000-01-01T${checkIn}`);
        const timeOut = new Date(`2000-01-01T${checkOut}`);
        const diffMs = timeOut - timeIn;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(
          (diffMs % (1000 * 60 * 60)) / (1000 * 60),
        );

        return `${diffHours}h ${diffMinutes}m`;
      } catch (error) {
        return null;
      }
    },

    /**
     * Handle period change - mempengaruhi semua tampilan dashboard
     */
    async onPeriodChange() {
      this.filters = applyDashboardPeriod(this.filters, this.filters.period);
      console.log(`🔄 Period filter changed to: ${this.filters.period}`);
      console.log("📊 Reloading dashboard data dengan period filter baru");

      await this.loadSummaryData();

      this.showNotification(
        `Dashboard updated untuk period: ${this.filters.period}`,
        "info",
      );
    },

    /**
     * Change page for pagination
     */
    changePage(newPage) {
      if (newPage >= 1 && newPage <= this.pagination.total_pages) {
        this.filters.page = newPage;
        this.loadSummaryData();
      }
    },

    /**
     * Get discipline score color class
     */
    getDisciplineScoreColor(score) {
      if (score >= 85) return "bg-green-500";
      if (score >= 70) return "bg-blue-500";
      if (score >= 55) return "bg-yellow-500";
      return "bg-red-500";
    },

    /**
     * Validate export payload before handing it to generators
     */
    validateExportData(exportData, fileType) {
      if (!exportData || !exportData.summary || !exportData.report) {
        console.error(`No valid export data available for ${fileType}`);
        this.showNotification(
          "Failed to load export data. Please try again.",
          "error",
        );
        return false;
      }

      const hasReportRows = Boolean(exportData.report.data || exportData.report);
      const hasSummaryObject = typeof exportData.summary === "object";

      if (!hasReportRows || !hasSummaryObject) {
        console.error(`Invalid export data structure for ${fileType}`);
        this.showNotification(
          `Invalid data structure for ${fileType} export`,
          "error",
        );
        return false;
      }

      return true;
    },

    /**
     * Download report as PDF
     */
    async downloadPDF() {
      try {
        console.log(
          `Generating PDF report with period filter: ${this.filters.period}`,
        );

        const exportData = await this.loadExportData();
        if (!this.validateExportData(exportData, "PDF")) {
          return;
        }

        console.log(
          "Valid export data being sent to PDF generator:",
          exportData,
        );
        generatePDFReport(exportData, this.filters.period);
        this.showNotification("PDF report downloaded successfully!", "success");
      } catch (error) {
        console.error("Error generating PDF:", error);
        this.showNotification("Failed to generate PDF report", "error");
      }
    },

    /**
     * Download report as Excel
     */
    async downloadExcel() {
      try {
        console.log(
          `Generating Excel report with period filter: ${this.filters.period}`,
        );

        const exportData = await this.loadExportData();
        if (!this.validateExportData(exportData, "Excel")) {
          return;
        }

        console.log(
          "Valid export data being sent to Excel generator:",
          exportData,
        );
        generateExcelReport(exportData, this.filters.period);
        this.showNotification(
          "Excel report downloaded successfully!",
          "success",
        );
      } catch (error) {
        console.error("Error generating Excel:", error);
        this.showNotification("Failed to generate Excel report", "error");
      }
    },

    /**
     * Export to PDF - wrapper function for stats-card-group.html
     */
    async exportToPDF() {
      this.isExporting = true;
      try {
        await this.downloadPDF();
      } finally {
        this.isExporting = false;
      }
    },

    /**
     * Export to Excel - wrapper function for stats-card-group.html
     */
    async exportToExcel() {
      this.isExporting = true;
      try {
        await this.downloadExcel();
      } finally {
        this.isExporting = false;
      }
    },

    /**
     * Show notification (can be extended with toast library)
     */
    showNotification(message, type = "info") {
      // Simple alert for now - can be replaced with better notification system
      if (type === "success") {
        console.log(`✅ ${message}`);
      } else if (type === "error") {
        console.error(`❌ ${message}`);
        alert(message); // Show error to user
      } else {
        console.info(`ℹ️ ${message}`);
      }
    },

    /**
     * Refresh data
     */
    async refresh() {
      console.log("Refreshing dashboard data...");
      await this.loadSummaryData();
    },

    /**
     * Format date untuk display
     */
    formatDate(dateString) {
      if (!dateString) return "-";
      try {
        return new Date(dateString).toLocaleDateString("id-ID");
      } catch (error) {
        return dateString;
      }
    },

    /**
     * Format time untuk display
     */
    formatTime(timeString) {
      if (!timeString) return "-";
      try {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString(
          "id-ID",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        );
      } catch (error) {
        return timeString;
      }
    },

    /**
     * Get status badge class
     */
    getStatusClass(status) {
      const statusClasses = {
        "On Time": "bg-green-100 text-green-800",
        Late: "bg-yellow-100 text-yellow-800",
        Alpha: "bg-red-100 text-red-800",
        Present: "bg-green-100 text-green-800",
        Absent: "bg-red-100 text-red-800",
      };

      return statusClasses[status] || "bg-gray-100 text-gray-800";
    },

    /**
     * Get work type badge class
     */
    getWorkTypeClass(workType) {
      const workTypeClasses = {
        WFO: "bg-blue-100 text-blue-800",
        WFH: "bg-purple-100 text-purple-800",
        WFA: "bg-indigo-100 text-indigo-800",
      };
      return workTypeClasses[workType] || "bg-gray-100 text-gray-800";
    },

    /**
     * Get initials dari nama (menggunakan avatarUtils)
     */
    getInitials,

    /**
     * Get avatar color based on name (menggunakan avatarUtils)
     */
    getAvatarColor,

    /**
     * View location on map (exact same as attendance table)
     */
    viewLocation(attendanceItem) {
      console.log("Dashboard viewLocation called with:", attendanceItem);

      // Siapkan payload untuk modal peta - exactly same structure as attendance table
      const locationPayload = {
        fullName: attendanceItem.full_name || "Unknown User",
        email: attendanceItem.email || "-",
        position: attendanceItem.role_name || "-",
        phoneNumber: attendanceItem.phone_number || "-",
        latitude: attendanceItem.location?.latitude || attendanceItem.latitude,
        longitude:
          attendanceItem.location?.longitude || attendanceItem.longitude,
        radius: attendanceItem.location?.radius || attendanceItem.radius || 100,
        description:
          attendanceItem.location?.description ||
          attendanceItem.location_description ||
          "Lokasi absensi karyawan",
      };

      console.log("Prepared location payload:", locationPayload);

      // Call global function untuk membuka modal peta - exactly same as attendance table
      if (typeof window.openMapDetailModal === "function") {
        console.log("Calling window.openMapDetailModal");
        window.openMapDetailModal(locationPayload);
      } else {
        console.warn("openMapDetailModal function not found");
        // Fallback: tampilkan koordinat dalam alert - exactly same as attendance table
        if (locationPayload.latitude && locationPayload.longitude) {
          alert(
            `Koordinat: ${locationPayload.latitude}, ${locationPayload.longitude}`,
          );
        } else {
          alert("Koordinat lokasi tidak tersedia");
        }
      }
    },

    /**
     * Sorting functionality
     */
    changeSort(field) {
      if (this.currentSort.field === field) {
        this.currentSort.direction =
          this.currentSort.direction === "asc" ? "desc" : "asc";
      } else {
        this.currentSort.field = field;
        this.currentSort.direction = "asc";
      }

      // Here you can implement actual sorting logic
      console.log("Sorting by:", field, this.currentSort.direction);
    },

    /**
     * Get sort icon (exact same as attendance table)
     */
    getSortIcon(fieldName) {
      if (this.currentSort.field !== fieldName) {
        return ""; // No icon if field is not being sorted
      }

      return this.currentSort.direction === "asc" ? "↑" : "↓";
    },
    /**
     * Get status badge CSS classes (using universal badge helper)
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
     * Get information badge CSS classes (using universal badge helper)
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
     * Confirm delete menggunakan alert modal (warning) + OK/Batal
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
        await this.loadSummaryData?.();
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
     * Handle empty API response
     */
    handleEmptyApiResponse() {
      console.warn(
        `API returned empty response for period: ${this.filters.period}`,
      );

      this.cardSummaryData = {
        onTime: 0,
        late: 0,
        alpha: 0,
        wfo: 0,
        wfh: 0,
        wfa: 0,
      };

      this.summaryData = {
        summary: {
          onTime: 0,
          late: 0,
          alpha: 0,
          wfo: 0,
          wfh: 0,
          wfa: 0,
        },
        report: [],
      };

      this.analyticsData = {
        discipline_index: 0,
        performance_trend: "stable",
        avg_work_hours: 0,
      };

      this.pagination = createEmptyDashboardPagination(this.filters.limit);

      // Critical: No raw API data means no export capability
      this.rawApiData = null;
      this.reportData = [];

      this.showNotification("No data available from server", "info");
    },

    debouncedSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.filters = applyDashboardSearch(this.filters, this.searchQuery);
        this.searchQuery = this.filters.search;
        this.loadSummaryData();
      }, 1000);
    },

    changeEntriesPerPage(newLimit) {
      this.filters = applyDashboardPageSize(this.filters, newLimit);
      this.loadSummaryData();
    },
  };
}
