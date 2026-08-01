/**
 * Attendance audit list state.
 * The Backend owns row order, pagination, filters, and totals.
 */

import {
  getAttendanceLog,
  getAttendanceById,
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
  validateAttendanceDateRange,
} from "./attendanceDirectoryQuery.js";
import { normalizeAttendanceListRow } from "./attendanceListRow.js";
import {
  createAttendanceDetailDrawerLifecycle,
  normalizeAttendanceDetail,
} from "./attendanceDetailDrawerLifecycle.js";
import { createFocusTrap } from "../../utils/focusTrap.js";

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
    getAttendanceById: overrides.getAttendanceById || getAttendanceById,
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
  const focusTrapFactory = overrides.createFocusTrap || createFocusTrap;
  const detailLifecycle = createAttendanceDetailDrawerLifecycle({
    mapAdapter: overrides.mapAdapter || {
      initialize(location) {
        globalThis.window?.attendanceDetailMap?.initializeMap(location);
      },
      destroy() {
        globalThis.window?.attendanceDetailMap?.destroyMap();
      },
    },
  });
  let attendanceDrawerFocusTrap = null;
  let attendanceDrawerPresentationId = 0;

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
    isFilterOpen: false,
    filterValidationMessage: "",
    isAttendanceDetailDrawerOpen: false,
    selectedAttendanceDetail: detailLifecycle.detail,
    detailState: {
      selectedId: null,
      requestId: 0,
      loading: false,
      error: "",
      unavailable: false,
      detail: null,
    },

    get searchQuery() {
      return this.appliedQuery.search;
    },
    set searchQuery(value) {
      this.appliedQuery.search = value ?? "";
    },
    get activeFilterCount() {
      const filters = this.appliedQuery.appliedFilters;
      return (
        (filters.from || filters.to ? 1 : 0) +
        (filters.mode ? 1 : 0) +
        (filters.status ? 1 : 0) +
        (filters.checkoutState ? 1 : 0)
      );
    },
    get emptyStateMessage() {
      if (this.appliedQuery.page > 1 && this.pagination.total_records > 0) {
        return "Halaman ini tidak lagi memiliki data. Kembali ke halaman sebelumnya.";
      }
      const filters = this.appliedQuery.appliedFilters;
      const hasCriteria =
        Boolean(this.appliedQuery.search) ||
        Boolean(
          filters.from ||
          filters.to ||
          filters.mode ||
          filters.status ||
          filters.checkoutState,
        );
      return hasCriteria
        ? "Tidak ada data absensi yang cocok dengan pencarian atau filter."
        : "Belum ada data absensi.";
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
      this.invalidateAttendanceDetailRequest();
      attendanceDrawerPresentationId += 1;
      detailLifecycle.close();
      this.isAttendanceDetailDrawerOpen = false;
      this.selectedAttendanceDetail = detailLifecycle.detail;
      attendanceDrawerFocusTrap?.deactivate();
      attendanceDrawerFocusTrap = null;
      if (browser && this.popstateHandler) {
        browser.removeEventListener("popstate", this.popstateHandler);
        this.popstateHandler = null;
      }
    },

    openAttendanceDrawerShell() {
      attendanceDrawerPresentationId += 1;
      const presentationId = attendanceDrawerPresentationId;
      detailLifecycle.openShell();
      this.isAttendanceDetailDrawerOpen = true;
      this.selectedAttendanceDetail = detailLifecycle.detail;

      const activateFocusTrap = () => {
        if (
          presentationId !== attendanceDrawerPresentationId ||
          !this.isAttendanceDetailDrawerOpen ||
          attendanceDrawerFocusTrap
        ) {
          return;
        }

        const panel = this.$refs?.attendanceDetailDrawerPanel;
        if (!panel) return;

        attendanceDrawerFocusTrap = focusTrapFactory(panel);
        attendanceDrawerFocusTrap.activate();
      };

      return typeof this.$nextTick === "function"
        ? this.$nextTick(activateFocusTrap)
        : activateFocusTrap();
    },

    replaceAttendanceDrawerDetail(detail) {
      const presentationId = attendanceDrawerPresentationId;
      const replaceDetail = () => {
        if (presentationId !== attendanceDrawerPresentationId) return false;
        const replaced = detailLifecycle.replace(detail);
        this.selectedAttendanceDetail = detailLifecycle.detail;
        return replaced;
      };

      return typeof this.$nextTick === "function"
        ? this.$nextTick(replaceDetail)
        : replaceDetail();
    },

    invalidateAttendanceDetailRequest() {
      const requestId = this.detailState.requestId + 1;
      this.detailState = {
        selectedId: null,
        requestId,
        loading: false,
        error: "",
        unavailable: false,
        detail: null,
      };
    },

    closeAttendanceDetail() {
      this.invalidateAttendanceDetailRequest();
      this.closeAttendanceDrawer({ preserveDetailRequestState: true });
    },

    closeAttendanceDrawer({ preserveDetailRequestState = false } = {}) {
      if (!preserveDetailRequestState) {
        this.invalidateAttendanceDetailRequest();
      }
      if (!this.isAttendanceDetailDrawerOpen) return;

      attendanceDrawerPresentationId += 1;
      detailLifecycle.close();
      this.isAttendanceDetailDrawerOpen = false;
      this.selectedAttendanceDetail = detailLifecycle.detail;
      attendanceDrawerFocusTrap?.deactivate();
      attendanceDrawerFocusTrap = null;
    },

    async openAttendanceDetail(attendanceId) {
      const requestId = this.detailState.requestId + 1;
      this.detailState = {
        selectedId: attendanceId,
        requestId,
        loading: true,
        error: "",
        unavailable: false,
        detail: null,
      };
      this.openAttendanceDrawerShell();

      try {
        const response = await services.getAttendanceById(attendanceId);
        if (requestId !== this.detailState.requestId) return false;

        const normalized = normalizeAttendanceDetail(response);
        this.detailState.detail = normalized;
        await this.replaceAttendanceDrawerDetail(response);
        return true;
      } catch (error) {
        if (requestId !== this.detailState.requestId) return false;

        this.detailState.detail = null;
        if (error?.status === 404) {
          this.detailState.error = "";
          this.detailState.unavailable = true;
          await this.fetchAttendance();
        } else {
          this.detailState.error =
            error?.message || "Gagal memuat detail absensi";
          this.detailState.unavailable = false;
        }
        return false;
      } finally {
        if (requestId === this.detailState.requestId) {
          this.detailState.loading = false;
        }
      }
    },

    async retryAttendanceDetail() {
      const attendanceId = this.detailState.selectedId;
      if (attendanceId === null || attendanceId === undefined) return false;
      return this.openAttendanceDetail(attendanceId);
    },

    handleAttendanceDrawerTab(event) {
      attendanceDrawerFocusTrap?.handleKeydown(event);
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

    async retryAttendanceList() {
      return this.fetchAttendance();
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

    openFilter() {
      this.draftFilters = { ...this.appliedQuery.appliedFilters };
      this.filterValidationMessage = "";
      this.isFilterOpen = true;
    },

    closeFilter() {
      if (!this.isFilterOpen) return;
      this.isFilterOpen = false;
      browser?.document
        ?.getElementById("attendanceTableFilterTrigger")
        ?.focus();
    },

    async applyFilters() {
      const validation = validateAttendanceDateRange(this.draftFilters);
      if (!validation.valid) {
        this.filterValidationMessage = validation.message;
        return false;
      }

      this.cancelPendingSearch();
      this.filterValidationMessage = "";
      this.appliedQuery.appliedFilters = { ...this.draftFilters };
      this.appliedQuery.page = 1;
      this.syncUrl("push");
      const result = await this.fetchAttendance();
      this.closeFilter();
      return result;
    },

    async clearFilters() {
      this.cancelPendingSearch();
      this.filterValidationMessage = "";
      this.draftFilters = { ...DEFAULT_ATTENDANCE_QUERY.appliedFilters };
      this.appliedQuery.appliedFilters = { ...this.draftFilters };
      this.appliedQuery.page = 1;
      this.syncUrl("push");
      const result = await this.fetchAttendance();
      this.closeFilter();
      return result;
    },

    async resetFilters() {
      return this.clearFilters();
    },

    confirmDelete(attendanceRecord) {
      const attendanceId = attendanceRecord?.idAttendance ?? attendanceRecord;
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

/**
 * Builds the Management Attendance root scope without evaluating accessors.
 * Object spread calls getters while composing the Alpine expression, which
 * disconnects aliases such as searchQuery from their canonical nested state.
 */
export function attendanceManagementPageData(
  mapDetailState = {},
  attendanceOverrides = {},
) {
  const shellState = {
    page: "managementAttendance",
    loaded: true,
    darkMode: false,
    stickyMenu: false,
    sidebarToggle: false,
    scrollTop: false,
    isAlertModalOpen: false,
    alertType: "success",
    alertTitle: "",
    alertMessage: "",
    alertButtonText: "OK",
  };
  const result = {};

  for (const source of [
    shellState,
    attendanceLogAlpineData(attendanceOverrides),
    mapDetailState,
  ]) {
    Object.defineProperties(result, Object.getOwnPropertyDescriptors(source));
  }

  return result;
}
