/**
 * Attendance audit list state.
 * The Backend owns row order, pagination, filters, and totals.
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
import {
  ATTENDANCE_PAGE_SIZES,
  DEFAULT_ATTENDANCE_QUERY,
  parseAttendanceDirectoryQuery,
  serializeAttendanceDirectoryQuery,
  toAttendanceRequestParams,
} from "./attendanceDirectoryQuery.js";
import { normalizeAttendanceListRow } from "./attendanceListRow.js";

const emptyPagination = () => ({
  current_page: 1,
  total_pages: 1,
  total_records: 0,
  records_per_page: 10,
  has_prev_page: false,
  has_next_page: false,
});

const cloneDefaultQuery = () => ({
  ...DEFAULT_ATTENDANCE_QUERY,
  appliedFilters: { ...DEFAULT_ATTENDANCE_QUERY.appliedFilters },
});

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
    fullName: attendanceItem.fullName ?? attendanceItem.full_name ?? "",
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

export function attendanceLogAlpineData(overrides = {}) {
  const services = {
    getAttendanceLog: overrides.getAttendanceLog || getAttendanceLog,
    deleteAttendance: overrides.deleteAttendance || deleteAttendance,
  };
  const browser =
    overrides.browser !== undefined
      ? overrides.browser
      : typeof window !== "undefined"
        ? window
        : null;
  const schedule = overrides.setTimeout || globalThis.setTimeout;
  const cancelSchedule = overrides.clearTimeout || globalThis.clearTimeout;

  return {
    rows: [],
    pagination: emptyPagination(),
    appliedQuery: cloneDefaultQuery(),
    draftFilters: { ...DEFAULT_ATTENDANCE_QUERY.appliedFilters },
    tableState: {
      loading: false,
      error: "",
      hasSuccessfulPage: false,
    },
    latestListRequestId: 0,
    searchTimer: null,
    popstateHandler: null,

    // Transitional template aliases. Canonical state remains the properties
    // above and is the only state sent to the server.
    get attendanceData() {
      return this.rows;
    },
    set attendanceData(value) {
      this.rows = value;
    },
    get filters() {
      return this.appliedQuery;
    },
    get searchQuery() {
      return this.appliedQuery.search;
    },
    set searchQuery(value) {
      this.appliedQuery.search = value ?? "";
    },
    get searchTerm() {
      return this.searchQuery;
    },
    set searchTerm(value) {
      this.searchQuery = value;
    },
    get isLoading() {
      return this.tableState.loading;
    },
    get errorMessage() {
      return this.tableState.error;
    },

    isDeleteModalOpen: false,
    deleteConfirmMessage: "",
    deleteTargetId: null,
    isDeleting: false,

    async init() {
      if (browser) {
        this.applyUrlState({ fetch: false });
        const current = browser.location.search.replace(/^\?/, "");
        const canonical = serializeAttendanceDirectoryQuery(
          this.appliedQuery,
          new URLSearchParams(browser.location.search),
        ).toString();
        if (canonical !== current) this.syncUrl("replace");
        this.popstateHandler = async () => {
          await this.applyUrlState();
        };
        browser.addEventListener("popstate", this.popstateHandler);
      }
      await this.fetchAttendance();
    },

    applyParsedQuery(parsed) {
      this.appliedQuery = {
        ...parsed,
        appliedFilters: { ...parsed.appliedFilters },
      };
      this.draftFilters = { ...parsed.appliedFilters };
    },

    async applyUrlState({ fetch = true } = {}) {
      if (!browser) return false;
      this.cancelPendingSearch();
      this.applyParsedQuery(
        parseAttendanceDirectoryQuery(
          new URLSearchParams(browser.location.search),
        ),
      );
      if (fetch) return this.fetchAttendance();
      return true;
    },

    syncUrl(mode = "none") {
      if (!browser || mode === "none") return;
      const query = serializeAttendanceDirectoryQuery(
        this.appliedQuery,
        new URLSearchParams(browser.location.search),
      ).toString();
      const url = `${browser.location.pathname}${query ? `?${query}` : ""}${browser.location.hash || ""}`;
      browser.history[`${mode}State`]({}, "", url);
    },

    destroy() {
      this.cancelPendingSearch();
      if (browser && this.popstateHandler) {
        browser.removeEventListener("popstate", this.popstateHandler);
        this.popstateHandler = null;
      }
    },

    async fetchAttendance() {
      const requestId = ++this.latestListRequestId;
      this.tableState.loading = true;
      this.tableState.error = "";

      try {
        const response = await services.getAttendanceLog(
          toAttendanceRequestParams(this.appliedQuery),
        );
        if (requestId !== this.latestListRequestId) return false;

        const normalized = normalizeAttendanceListResponse(response);
        this.rows = normalized.data.map(normalizeAttendanceListRow);
        this.pagination = normalized.pagination;
        this.appliedQuery.page = normalized.pagination.current_page;
        this.appliedQuery.limit = normalized.pagination.records_per_page;
        this.tableState.hasSuccessfulPage = true;
        return true;
      } catch (error) {
        if (requestId !== this.latestListRequestId) return false;
        this.tableState.error = error.message || "Gagal memuat data absensi";
        console.error("Error fetching attendance:", error);
        if (typeof globalThis.window?.showAlertModal === "function") {
          globalThis.window.showAlertModal({
            type: "danger",
            title: "Gagal Memuat Data Absensi",
            message: this.tableState.error,
            buttonText: "OK",
          });
        }
        return false;
      } finally {
        if (requestId === this.latestListRequestId) {
          this.tableState.loading = false;
        }
      }
    },

    cancelPendingSearch() {
      if (this.searchTimer === null) return;
      cancelSchedule(this.searchTimer);
      this.searchTimer = null;
    },

    onSearchChange() {
      this.cancelPendingSearch();
      let timer = null;
      timer = schedule(async () => {
        if (this.searchTimer !== timer) return;
        this.searchTimer = null;
        this.appliedQuery.page = 1;
        this.syncUrl("replace");
        await this.fetchAttendance();
      }, 300);
      this.searchTimer = timer;
    },

    handleSearchInput() {
      this.onSearchChange();
    },

    debouncedSearch() {
      this.onSearchChange();
    },

    async changePage(newPage) {
      this.cancelPendingSearch();
      if (
        this.tableState.loading ||
        newPage === this.appliedQuery.page ||
        newPage < 1 ||
        newPage > this.pagination.total_pages
      ) {
        return false;
      }
      this.appliedQuery.page = newPage;
      this.syncUrl("push");
      return this.fetchAttendance();
    },

    async changeLimit(newLimit) {
      this.cancelPendingSearch();
      const parsed = Number(newLimit);
      this.appliedQuery.limit = ATTENDANCE_PAGE_SIZES.includes(parsed)
        ? parsed
        : DEFAULT_ATTENDANCE_QUERY.limit;
      this.appliedQuery.page = 1;
      this.syncUrl("push");
      return this.fetchAttendance();
    },

    async applyFilters() {
      this.cancelPendingSearch();
      this.appliedQuery.appliedFilters = { ...this.draftFilters };
      this.appliedQuery.page = 1;
      this.syncUrl("push");
      return this.fetchAttendance();
    },

    async resetFilters() {
      this.cancelPendingSearch();
      this.draftFilters = { ...DEFAULT_ATTENDANCE_QUERY.appliedFilters };
      this.appliedQuery.appliedFilters = { ...this.draftFilters };
      this.appliedQuery.page = 1;
      this.syncUrl("push");
      return this.fetchAttendance();
    },

    confirmDelete(attendanceId) {
      this.deleteTargetId = attendanceId;
      if (typeof globalThis.window?.showAlertModal === "function") {
        globalThis.window.showAlertModal({
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

    async executeDelete() {
      if (!this.deleteTargetId || this.isDeleting) return;
      this.isDeleting = true;
      try {
        await services.deleteAttendance(this.deleteTargetId);
        this.deleteTargetId = null;
        globalThis.window?.showInlineAlert?.({
          type: "success",
          title: "Data Absensi Dihapus",
          message: "Data absensi berhasil dihapus dari sistem.",
        });
        await this.fetchAttendance();
      } catch (error) {
        console.error("Error deleting attendance:", error);
        this.deleteTargetId = null;
        globalThis.window?.showInlineAlert?.({
          type: "danger",
          title: "Gagal Menghapus Data",
          message:
            error.message || "Terjadi kesalahan saat menghapus data absensi.",
        });
      } finally {
        this.isDeleting = false;
      }
    },

    viewLocation(attendanceItem) {
      if (!this.hasAttendanceCoordinates(attendanceItem)) return;
      globalThis.window?.openMapDetailModal?.(
        buildAttendanceLocation(attendanceItem),
      );
    },

    getStatusBadgeClass,
    getStatusBadgeText,
    getInfoBadgeClass,
    getInfoBadgeText(info) {
      return info ? getInfoBadgeText(info) : "-";
    },
    hasAttendanceCoordinates(log) {
      return hasFiniteCoordinates({
        latitude: firstFiniteMapNumber(log.location?.latitude, log.latitude),
        longitude: firstFiniteMapNumber(log.location?.longitude, log.longitude),
      });
    },
    getInitials,
    getAvatarColor,
    formatDateTime,
    formatTime,
    formatDate,
  };
}
