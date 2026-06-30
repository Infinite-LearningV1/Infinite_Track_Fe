import { getSummaryReport } from "../../services/reportService.js";
import { getDashboardAnalytics } from "../../services/dashboardAnalyticsService.js";
import { getTodayLocations } from "../../services/todayLocationsService.js";
import { getFuzzyAhpAnalysis } from "../../services/fuzzyAhpService.js";
import { getGeofenceEvidence } from "../../services/geofenceEvidenceService.js";
import {
  buildDashboardSectionOrder,
  createDashboardCockpitErrorState,
  createDashboardCockpitLoadingState,
  createDashboardCockpitStateFromSources,
} from "../../services/dashboardCockpitService.js";
import { classifyAuthFailure } from "../../services/authSessionRuntime.js";
import {
  createRealApiCockpitLoadingShell,
  createRealApiCockpitShell,
} from "./realApiCockpitShell.js";
import { createHistoricalAnalyticsSliceState } from "../../services/dashboard/historicalAnalyticsSlice.js";
import { createFahpRecapSliceState } from "../../services/dashboard/fahpRecapSlice.js";
import { createGeofenceEvidenceSliceState } from "../../services/dashboard/geofenceEvidenceSlice.js";
import { createLiveMapSliceState } from "../../services/dashboard/liveMapSlice.js";
import {
  buildDashboardRangeRequestParams,
  createDefaultDashboardRange,
  validateDashboardRange,
} from "../../components/dashboardRange/dashboardRange.js";
import {
  applyDashboardAnalyticsPreset,
  buildDashboardAnalyticsRangeDisplayValue,
  connectDashboardAnalyticsDatePicker,
  createDashboardAnalyticsHeaderState,
  createDashboardAnalyticsPresetOptions,
  openDashboardAnalyticsDatePicker,
  resolveDashboardAnalyticsSelectedLabel,
  syncDashboardAnalyticsDatePickerElement,
  syncDashboardAnalyticsHeaderState,
} from "../../components/dashboardRange/dashboardAnalyticsHeader.js";
import { createHistoricalTrendViewState } from "../../components/historicalTrendPanel.js";
import { createAttendanceModeViewState } from "../../components/attendanceModePanel.js";
import { createFuzzyAhpViewState } from "../../components/fuzzyAhpPanel.js";
import { createGeofenceEvidenceViewState } from "../../components/geofenceEvidencePanel.js";
import {
  applyDashboardPageSize,
  applyDashboardPeriod,
  applyDashboardSearch,
  buildDashboardRequestParams,
  createEmptyDashboardPagination,
  normalizeDashboardPagination,
} from "./dashboardTableState.js";
import {
  buildFahpRequestParams,
  createDefaultFahpFilterState,
} from "./fahpFilterState.js";
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

export function createDashboardPageState({
  fetchHistorical,
  fetchGeofence,
  fetchLiveMap,
  fetchFahpRecap,
}) {
  const resolveSliceState = async (fetchSlice) => {
    try {
      return await fetchSlice();
    } catch (error) {
      return {
        status: "error",
        error: error?.message || "Dashboard slice failed to load.",
      };
    }
  };

  return {
    historicalSlice: { status: "loading" },
    geofenceSlice: { status: "loading" },
    liveMapSlice: { status: "loading" },
    fahpSlice: { status: "loading" },
    async loadDashboard() {
      const [historicalSlice, geofenceSlice, liveMapSlice, fahpSlice] =
        await Promise.all([
          resolveSliceState(fetchHistorical),
          resolveSliceState(fetchGeofence),
          resolveSliceState(fetchLiveMap),
          resolveSliceState(fetchFahpRecap),
        ]);

      this.historicalSlice = historicalSlice;
      this.geofenceSlice = geofenceSlice;
      this.liveMapSlice = liveMapSlice;
      this.fahpSlice = fahpSlice;
    },
    async refreshFahpRecap(params) {
      this.fahpSlice = { status: "loading" };
      this.fahpSlice = await resolveSliceState(() => fetchFahpRecap(params));
      return this.fahpSlice;
    },
  };
}

/**
 * Alpine.js component untuk dashboard functionality
 */
export function dashboard() {
  const defaultDashboardRange = createDefaultDashboardRange();
  const defaultFahpFilterState = createDefaultFahpFilterState();

  return {
    // State management
    loading: false,
    error: null,
    period: "monthly",
    dashboardRangeState: { ...defaultDashboardRange },
    dashboardRange: defaultDashboardRange.period,
    dashboardRangeOptions: createDashboardAnalyticsPresetOptions(),
    dashboardHeaderState: createDashboardAnalyticsHeaderState(
      defaultDashboardRange,
    ),
    trendRange: "monthly",
    activeTrendHoverIndex: null,
    fahpFilterState: { ...defaultFahpFilterState },

    // Pagination state
    pagination: createEmptyDashboardPagination(5),

    // Filter state
    filters: {
      period: "monthly",
      from: null,
      to: null,
      page: 1,
      limit: 5,
      search: "",
      sortBy: null,
      sortOrder: "asc",
    },

    // Table state properties
    isLoading: false,
    errorMessage: null,
    attendanceData: [],

    // Search state
    searchQuery: "",
    searchTimeout: null,

    // Modal states (legacy)
    isDeleteModalOpen: false,
    deleteConfirmMessage: "",
    deleteTargetId: null,

    // Raw API data untuk export
    rawApiData: null,
    dashboardAnalyticsResponse: null,
    dashboardAnalyticsError: null,
    todayLocations: null,
    todayLocationsError: null,
    fuzzyAhpResponse: null,
    fuzzyAhpError: null,
    geofenceEvidenceResponse: null,
    geofenceEvidenceError: null,
    pageState: null,
    fetchSummaryReport: getSummaryReport,
    fetchDashboardAnalytics: getDashboardAnalytics,
    fetchTodayLocations: getTodayLocations,
    fetchFuzzyAhpAnalysis: getFuzzyAhpAnalysis,
    fetchGeofenceEvidence: getGeofenceEvidence,

    // Export state
    isExporting: false,
    isExportModalOpen: false,

    // Data properties
    summaryData: null,
    cockpit: createDashboardCockpitLoadingState(),
    realApiCockpit: createRealApiCockpitLoadingShell(),
    dashboardSectionOrder: buildDashboardSectionOrder(),
    dashboardMap: null,
    dashboardLeaflet: null,
    dashboardMapTileLayer: null,
    dashboardMapMarkerLayer: null,
    dashboardMapRadiusLayer: null,
    dashboardMapRenderToken: 0,

    // Summary statistics data untuk tabel - terpengaruh period filter
    summaryStatsData: {
      total_ontime: 0,
      total_late: 0,
      total_alpha: 0,
      total_wfo: 0,
      total_wfh: 0,
      total_wfa: 0,
    },

    // Report data for table display
    reportData: [],

    // Available period options
    periodOptions: [
      { value: "daily", label: "Daily" },
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" },
      { value: "range", label: "Custom Range" },
    ],

    // Sorting functionality
    currentSort: { field: null, direction: "asc" },

    /**
     * Initialize component
     */
    async init() {
      this.realApiCockpit = createRealApiCockpitShell();
      this.pageState = createDashboardPageState({
        fetchHistorical: async () => {
          const requestParams = this.getDashboardAnalyticsRequestParams();
          const response = await this.fetchDashboardAnalytics(requestParams);
          const sliceState = createHistoricalAnalyticsSliceState(
            response,
            requestParams,
          );

          this.dashboardAnalyticsResponse = sliceState.response;
          this.dashboardAnalyticsError = null;
          this.rawApiData = {
            ...(this.rawApiData || {}),
            historicalAnalytics: sliceState,
          };

          return this.buildHistoricalSliceState(sliceState.response);
        },
        fetchGeofence: async () => {
          const requestParams = this.getDashboardAnalyticsRequestParams();
          const response = await this.fetchGeofenceEvidence(requestParams);
          const sliceState = createGeofenceEvidenceSliceState(
            response,
            requestParams,
          );

          this.geofenceEvidenceResponse = sliceState.response;
          this.geofenceEvidenceError = null;
          this.rawApiData = {
            ...(this.rawApiData || {}),
            geofenceEvidence: sliceState,
          };

          return this.buildGeofenceSliceState(sliceState.response);
        },
        fetchLiveMap: async () => {
          const requestParams = this.getDashboardAnalyticsRequestParams();
          const response = await this.fetchTodayLocations();
          const sliceState = createLiveMapSliceState(response, requestParams);

          this.todayLocations = sliceState;
          this.todayLocationsError = null;
          this.rawApiData = {
            ...(this.rawApiData || {}),
            todayLocations: sliceState,
          };

          return this.buildLiveMapSliceState(sliceState);
        },
        fetchFahpRecap: async (params = this.fahpFilterState) => {
          const requestParams = buildFahpRequestParams(params);
          const nextFilterState = {
            ...createDefaultFahpFilterState(),
            ...requestParams,
          };
          const response = await this.fetchFuzzyAhpAnalysis(requestParams);

          this.fahpFilterState = nextFilterState;
          this.fuzzyAhpResponse = response;
          this.fuzzyAhpError = null;
          this.rawApiData = {
            ...(this.rawApiData || {}),
            fahpRecap: createFahpRecapSliceState(response, requestParams),
          };

          return this.buildFahpSliceState(response);
        },
      });
      this.syncDashboardHeaderState();
      this.$nextTick?.(() => {
        this.initDashboardDatePicker();
      });
      await this.loadSummaryData();
    },

    hasAvailableValue(value) {
      if (value === null || value === undefined) {
        return false;
      }

      return typeof value !== "string" || value.trim() !== "";
    },

    getOptionalBackendValue(value, fallback = null) {
      return this.hasAvailableValue(value) ? value : fallback;
    },

    getSelectedTrendRange(panel) {
      return this.getHistoricalTrendViewState(panel).selectedRange;
    },

    getHistoricalTrendViewState(panel) {
      return createHistoricalTrendViewState(
        panel,
        this.trendRange,
        this.activeTrendHoverIndex,
      );
    },

    getFuzzyAhpViewState(panel, activeDecisionKey = null) {
      return createFuzzyAhpViewState(panel, activeDecisionKey);
    },

    getGeofenceEvidenceViewState(panel) {
      return createGeofenceEvidenceViewState(panel);
    },

    setActiveTrendHover(panel, event) {
      const selectedRange = this.getSelectedTrendRange(panel);
      const hoverPoints = Array.isArray(selectedRange?.hoverPoints)
        ? selectedRange.hoverPoints
        : [];
      const plotArea = selectedRange?.plotArea || null;
      const axisFrame = selectedRange?.axisFrame || {
        translateX: 46,
        width: 932,
      };

      if (!hoverPoints.length || !plotArea) {
        this.activeTrendHoverIndex = null;
        return;
      }

      const plotElement = event.currentTarget;
      const bounds = plotElement?.getBoundingClientRect?.();

      if (!bounds || bounds.width <= 0) {
        this.activeTrendHoverIndex = null;
        return;
      }

      const pointerX = Math.min(
        Math.max(event.clientX - bounds.left, 0),
        bounds.width,
      );
      const renderedX = (pointerX / bounds.width) * 1000;
      const frameX = Number(axisFrame.translateX) || 46;
      const frameWidth = Number(axisFrame.width) || 932;
      const leftX = Number(plotArea.leftX);
      const rightX = Number(plotArea.rightX);

      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      hoverPoints.forEach((point, index) => {
        const pointX = Number(point?.x);
        const renderedPointX =
          Number.isFinite(pointX) &&
          Number.isFinite(leftX) &&
          Number.isFinite(rightX) &&
          rightX > leftX
            ? frameX + ((pointX - leftX) / (rightX - leftX)) * frameWidth
            : frameX;
        const distance = Math.abs(renderedPointX - renderedX);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      this.activeTrendHoverIndex = closestIndex;
    },

    clearActiveTrendHover() {
      this.activeTrendHoverIndex = null;
    },

    getAttendanceModeViewState(panel) {
      return createAttendanceModeViewState(panel);
    },

    buildHistoricalSliceState(response = this.dashboardAnalyticsResponse) {
      if (response) {
        return { status: "ready", response };
      }

      if (this.dashboardAnalyticsError) {
        return {
          status: "error",
          error:
            this.dashboardAnalyticsError?.message ||
            "historical analytics unavailable",
        };
      }

      return { status: "loading" };
    },

    buildGeofenceSliceState(response = this.geofenceEvidenceResponse) {
      if (response) {
        return { status: "ready", response };
      }

      if (this.geofenceEvidenceError) {
        return {
          status: "error",
          error:
            this.geofenceEvidenceError?.message ||
            "geofence evidence unavailable",
        };
      }

      return { status: "loading" };
    },

    buildLiveMapSliceState(response = this.todayLocations) {
      if (response) {
        return { status: "ready", response };
      }

      if (this.todayLocationsError) {
        return {
          status: "error",
          error: this.todayLocationsError?.message || "live map unavailable",
        };
      }

      return { status: "loading" };
    },

    buildFahpSliceState(response = this.fuzzyAhpResponse) {
      if (response) {
        return { status: "ready", response };
      }

      if (this.fuzzyAhpError) {
        return {
          status: "error",
          error: this.fuzzyAhpError?.message || "fahp recap unavailable",
        };
      }

      return { status: "loading" };
    },

    applySummaryResponse(
      response,
      analyticsResponse = null,
      analyticsError = null,
      todayLocationsResponse = null,
      todayLocationsError = null,
      fuzzyAhpResponse = null,
      fuzzyAhpError = null,
      geofenceEvidenceResponse = null,
      geofenceEvidenceError = null,
    ) {
      if (!response?.summary) {
        this.handleEmptyApiResponse();
        return;
      }

      const mappedSummary = {
        onTime: response.summary.total_ontime,
        late: response.summary.total_late,
        alpha: response.summary.total_alpha,
        wfo: response.summary.total_wfo,
        wfh: response.summary.total_wfh,
        wfa: response.summary.total_wfa,
      };
      const reportData = response.report?.data || response.report || [];
      const reportPagination = response.report?.pagination || {};
      const analyticsRequestParams = this.getDashboardAnalyticsRequestParams();
      const liveMapSlice =
        todayLocationsResponse === null ||
        typeof todayLocationsResponse === "undefined"
          ? null
          : createLiveMapSliceState(
              todayLocationsResponse,
              analyticsRequestParams,
            );

      this.cockpit = createDashboardCockpitStateFromSources({
        reportResponse: response,
        analyticsResponse,
        analyticsError,
        todayLocations: liveMapSlice,
        todayLocationsError,
        fuzzyAhpResponse,
        fuzzyAhpError,
        geofenceEvidenceResponse,
        geofenceEvidenceError,
      });
      this.pagination = normalizeDashboardPagination(
        reportPagination,
        this.filters.limit,
      );
      this.attendanceData = reportData.map((item, index) => {
        const latitude = this.getOptionalBackendValue(
          item.location_details?.coordinates?.latitude,
        );
        const longitude = this.getOptionalBackendValue(
          item.location_details?.coordinates?.longitude,
        );
        const radius = this.getOptionalBackendValue(
          item.location_details?.radius,
        );
        const locationDescription = this.getOptionalBackendValue(
          item.location_details?.description,
        );

        const attendanceId = this.getOptionalBackendValue(
          item.attendance_id,
          this.getOptionalBackendValue(item.id_attendance),
        );
        const rowKey =
          attendanceId ||
          this.getOptionalBackendValue(item.nip_nim) ||
          this.getOptionalBackendValue(item.user_id) ||
          `attendance_row_${index}`;

        return {
          ...item,
          row_key: rowKey,
          id_attendance: attendanceId,
          id:
            item.nip_nim ||
            item.user_id ||
            `EMP${String(index + 1).padStart(3, "0")}`,
          full_name: this.getOptionalBackendValue(item.full_name),
          role_name: this.getOptionalBackendValue(item.role),
          time_in: this.getOptionalBackendValue(item.time_in),
          time_out: this.getOptionalBackendValue(item.time_out),
          work_hour: this.getOptionalBackendValue(item.work_hour),
          status: this.getOptionalBackendValue(item.status),
          information: this.getOptionalBackendValue(
            item.location_details?.category,
            this.getOptionalBackendValue(item.information),
          ),
          attendance_date: this.getOptionalBackendValue(item.attendance_date),
          nip_nim: this.getOptionalBackendValue(item.nip_nim),
          email: this.getOptionalBackendValue(item.email),
          notes: this.getOptionalBackendValue(item.notes),
          phone_number: this.getOptionalBackendValue(item.phone_number),
          discipline_score: this.getOptionalBackendValue(item.discipline_score),
          discipline_label: this.getOptionalBackendValue(item.discipline_label),
          location: {
            latitude,
            longitude,
            radius,
            description: locationDescription,
          },
          location_description: locationDescription,
          latitude,
          longitude,
        };
      });
      this.reportData = this.attendanceData;
      this.summaryData = {
        summary: mappedSummary,
        report: reportData,
      };
      const historicalAnalyticsSlice = createHistoricalAnalyticsSliceState(
        analyticsResponse,
        analyticsRequestParams,
      );

      this.rawApiData = {
        summary: response.summary,
        report: response.report,
        historicalAnalytics: historicalAnalyticsSlice,
        todayLocations: liveMapSlice,
        fahpRecap:
          fuzzyAhpResponse === null || typeof fuzzyAhpResponse === "undefined"
            ? null
            : createFahpRecapSliceState(fuzzyAhpResponse, this.fahpFilterState),
        geofenceEvidence: createGeofenceEvidenceSliceState(
          geofenceEvidenceResponse,
          analyticsRequestParams,
        ),
      };
      this.dashboardAnalyticsResponse = historicalAnalyticsSlice.response;
      this.dashboardAnalyticsError = analyticsError;
      this.todayLocations = liveMapSlice;
      this.todayLocationsError = todayLocationsError;
      this.fuzzyAhpResponse = fuzzyAhpResponse;
      this.fuzzyAhpError = fuzzyAhpError;
      this.geofenceEvidenceResponse = geofenceEvidenceResponse;
      this.geofenceEvidenceError = geofenceEvidenceError;
      this.queueDashboardMapRender();
    },

    syncDashboardRangeState() {
      const candidateRange = {
        ...this.dashboardRangeState,
        period: this.dashboardRange,
      };
      const validation = validateDashboardRange(candidateRange);

      if (!validation.isValid) {
        const fallbackRange = createDefaultDashboardRange();
        this.dashboardRangeState = { ...fallbackRange };
        this.dashboardRange = fallbackRange.period;
        this.syncDashboardHeaderState();
        return fallbackRange;
      }

      this.dashboardRangeState = candidateRange;
      this.syncDashboardHeaderState();
      return candidateRange;
    },

    syncDashboardHeaderState() {
      this.dashboardHeaderState = syncDashboardAnalyticsHeaderState(
        this.dashboardHeaderState,
        this.dashboardRangeState,
      );
      this.syncDashboardDatePicker();
      return this.dashboardHeaderState;
    },

    getDashboardAnalyticsRequestParams() {
      return buildDashboardRangeRequestParams(this.syncDashboardRangeState());
    },

    getDashboardRangeLabel() {
      return resolveDashboardAnalyticsSelectedLabel(this.dashboardRange);
    },

    getDashboardRangeDisplayLabel() {
      return buildDashboardAnalyticsRangeDisplayValue(this.dashboardRangeState);
    },

    toggleDashboardRangeDropdown() {
      this.dashboardHeaderState = {
        ...this.dashboardHeaderState,
        isDropdownOpen: !this.dashboardHeaderState.isDropdownOpen,
      };
    },

    closeDashboardRangeDropdown() {
      if (!this.dashboardHeaderState.isDropdownOpen) {
        return;
      }

      this.dashboardHeaderState = {
        ...this.dashboardHeaderState,
        isDropdownOpen: false,
      };
    },

    async selectDashboardRangeOption(period) {
      const nextRange = applyDashboardAnalyticsPreset(
        period,
        this.dashboardRangeState,
      );
      this.dashboardRange = nextRange.period;
      this.dashboardRangeState = { ...nextRange };
      this.dashboardHeaderState = {
        ...this.dashboardHeaderState,
        isDropdownOpen: false,
      };
      this.syncDashboardHeaderState();
      return this.onDashboardRangeChange();
    },

    setDashboardRangePreset(period) {
      const nextRange = applyDashboardAnalyticsPreset(
        period,
        this.dashboardRangeState,
      );
      this.dashboardRange = nextRange.period;
      this.dashboardRangeState = { ...nextRange };
      this.syncDashboardHeaderState();

      if (period !== "custom") {
        return this.onDashboardRangeChange();
      }

      this.$nextTick?.(() => {
        this.openDashboardDatePicker();
      });

      return Promise.resolve();
    },

    applyDashboardCustomRange(nextRange) {
      this.dashboardRange = nextRange.period;
      this.dashboardRangeState = { ...nextRange };
      this.syncDashboardHeaderState();
      return this.onDashboardRangeChange();
    },

    initDashboardDatePicker() {
      const element = this.$refs?.dashboardAnalyticsDatePicker;
      connectDashboardAnalyticsDatePicker(element, {
        rangeState: this.dashboardRangeState,
        onReady: (instance) => {
          this.dashboardHeaderState.pickerInstance = instance;
        },
        onRangeApply: (nextRange) => {
          this.applyDashboardCustomRange(nextRange);
        },
        onInvalid: (message) => {
          this.showNotification(message, "warning");
        },
      });
    },

    syncDashboardDatePicker() {
      syncDashboardAnalyticsDatePickerElement(
        this.$refs?.dashboardAnalyticsDatePicker,
        this.dashboardRangeState,
      );
    },

    openDashboardDatePicker() {
      openDashboardAnalyticsDatePicker(this.$refs?.dashboardAnalyticsDatePicker);
    },

    getCockpitKpiDisplayValue(card) {
      if (card?.state === "ready") {
        const value = card?.value || "—";
        const displayUnit = card?.meta?.displayUnit;

        return displayUnit ? `${value} ${displayUnit}` : value;
      }

      return {
        loading: "Loading...",
        empty: "No data",
        needsData: "Needs data",
        backendRequired: "Backend required",
        error: "Error",
      }[card?.state] || "—";
    },

    getCockpitKpiSupportText(card) {
      if (card?.state === "ready") {
        return (
          card?.meta?.comparisonText ||
          card.detail ||
          "Explicit backend metric for the active period."
        );
      }

      return card?.message || card?.stateLabel || "Metric unavailable.";
    },

    getCockpitKpiIconClass(card) {
      return {
        neutral: "text-brand-500 dark:text-brand-400",
        warning: "text-warning-500 dark:text-orange-400",
        info: "text-blue-500 dark:text-blue-400",
        critical: "text-error-600 dark:text-error-500",
      }[card?.meta?.tone] || "text-brand-500 dark:text-brand-400";
    },

    getCockpitKpiFooterClass(card) {
      if (card?.state === "ready" && card?.meta?.trendTone) {
        return {
          positive: "text-success-600 dark:text-success-500",
          negative: "text-error-600 dark:text-error-500",
          neutral: "text-gray-500 dark:text-gray-400",
        }[card.meta.trendTone] || "text-success-600 dark:text-success-500";
      }

      return {
        loading: "text-blue-600 dark:text-blue-400",
        ready: "text-success-600 dark:text-success-500",
        empty: "text-gray-500 dark:text-gray-400",
        needsData: "text-amber-600 dark:text-amber-400",
        backendRequired: "text-violet-600 dark:text-violet-400",
        error: "text-error-600 dark:text-error-500",
      }[card?.state] || "text-gray-500 dark:text-gray-400";
    },

    getCockpitKpiFooterLabel(card) {
      if (card?.state === "ready" && card?.meta?.trendLabel) {
        return card.meta.trendLabel;
      }

      return card?.stateLabel || "Unavailable";
    },

    getCockpitKpiIconSvg(icon) {
      return {
        "calendar-check": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.75 2.75C7.75 2.33579 8.08579 2 8.5 2C8.91421 2 9.25 2.33579 9.25 2.75V4H14.75V2.75C14.75 2.33579 15.0858 2 15.5 2C15.9142 2 16.25 2.33579 16.25 2.75V4H17C18.6569 4 20 5.34315 20 7V18C20 19.6569 18.6569 21 17 21H7C5.34315 21 4 19.6569 4 18V7C4 5.34315 5.34315 4 7 4H7.75V2.75ZM5.5 9.5V18C5.5 18.8284 6.17157 19.5 7 19.5H17C17.8284 19.5 18.5 18.8284 18.5 18V9.5H5.5ZM7 5.5C6.17157 5.5 5.5 6.17157 5.5 7V8H18.5V7C18.5 6.17157 17.8284 5.5 17 5.5H7ZM15.0303 12.4697C15.3232 12.7626 15.3232 13.2374 15.0303 13.5303L11.5303 17.0303C11.2374 17.3232 10.7626 17.3232 10.4697 17.0303L8.96967 15.5303C8.67678 15.2374 8.67678 14.7626 8.96967 14.4697C9.26256 14.1768 9.73744 14.1768 10.0303 14.4697L11 15.4393L13.9697 12.4697C14.2626 12.1768 14.7374 12.1768 15.0303 12.4697Z" fill="currentColor"/></svg>`,
        "alert-triangle": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.2892 3.86035C11.053 2.5396 12.947 2.5396 13.7108 3.86035L21.0592 16.5604C21.823 17.8811 20.876 19.5312 19.3483 19.5312H4.65167C3.12404 19.5312 2.17699 17.8811 2.94081 16.5604L10.2892 3.86035ZM12 8.75C11.5858 8.75 11.25 9.08579 11.25 9.5V13C11.25 13.4142 11.5858 13.75 12 13.75C12.4142 13.75 12.75 13.4142 12.75 13V9.5C12.75 9.08579 12.4142 8.75 12 8.75ZM12 16.5C11.4477 16.5 11 16.9477 11 17.5C11 18.0523 11.4477 18.5 12 18.5C12.5523 18.5 13 18.0523 13 17.5C13 16.9477 12.5523 16.5 12 16.5Z" fill="currentColor"/></svg>`,
        activity: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12H7.5L9.5 7L13.5 17L15.5 12H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        "user-check": `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 19C15.5 16.7909 13.2614 15 10.5 15C7.73858 15 5.5 16.7909 5.5 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.5 12C12.433 12 14 10.433 14 8.5C14 6.567 12.433 5 10.5 5C8.567 5 7 6.567 7 8.5C7 10.433 8.567 12 10.5 12Z" stroke="currentColor" stroke-width="1.5"/><path d="M16 11.5L17.5 13L20.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      }[icon] || "";
    },

    getCockpitKpiStateIconSvg(card) {
      if (card?.state === "ready" && card?.meta?.trendDirection) {
        return {
          up: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.9974 13.3339L7.9974 2.66634M4 6.66366L7.99987 2.66634L12 6.66366" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
          down: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.9974 2.66602L7.9974 13.3336M4 9.33634L7.99987 13.3337L12 9.33634" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        }[card.meta.trendDirection] || "";
      }

      return {
        loading: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2.66602V4.66602M8 11.3327V13.3327M13.3333 8L11.3333 8M4.66667 8L2.66667 8M11.7712 4.22852L10.357 5.64273M5.64298 10.357L4.22877 11.7712M11.7712 11.7715L10.357 10.3573M5.64298 5.64273L4.22877 4.22852" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
        ready: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.9974 2.66602L7.9974 13.3336M4 6.66334L7.99987 2.66602L12 6.66334" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        empty: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
        needsData: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.33333V8M8 10.6667H8.00667M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        backendRequired: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2.5L13 5.25V10.75L8 13.5L3 10.75V5.25L8 2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 5.83301V8.49967" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 10.833H8.00667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
        error: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.9974 13.3339L7.9974 2.66634M4 9.33652L7.99987 13.3338L12 9.33652" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
      }[card?.state] || "";
    },

    applyCockpitSurfaceState({
      reportResponse,
      analyticsResponse = this.dashboardAnalyticsResponse,
      analyticsError = this.dashboardAnalyticsError,
      todayLocations = this.todayLocations,
      todayLocationsError = this.todayLocationsError,
      fuzzyAhpResponse = this.fuzzyAhpResponse,
      fuzzyAhpError = this.fuzzyAhpError,
      geofenceEvidenceResponse = this.geofenceEvidenceResponse,
      geofenceEvidenceError = this.geofenceEvidenceError,
    } = {}) {
      this.cockpit = createDashboardCockpitStateFromSources({
        reportResponse,
        analyticsResponse,
        analyticsError,
        todayLocations,
        todayLocationsError,
        fuzzyAhpResponse,
        fuzzyAhpError,
        geofenceEvidenceResponse,
        geofenceEvidenceError,
      });
    },

    applySummaryError(error) {
      const message = error?.message || "Failed to load dashboard data.";
      this.error = message;
      this.errorMessage = message;
      this.cockpit = createDashboardCockpitErrorState(message);
      this.summaryData = null;
      this.attendanceData = [];
      this.rawApiData = null;
      this.dashboardAnalyticsResponse = null;
      this.dashboardAnalyticsError = error;
      this.todayLocations = null;
      this.todayLocationsError = null;
      this.fuzzyAhpResponse = null;
      this.fuzzyAhpError = null;
      this.geofenceEvidenceResponse = null;
      this.geofenceEvidenceError = null;
      this.reportData = [];
      this.pagination = createEmptyDashboardPagination(
        this.pagination?.per_page || this.filters.limit,
      );
      this.queueDashboardMapRender();
    },

    validateSummaryReportFilters() {
      if (this.filters.period !== "range") {
        return { isValid: true, message: "" };
      }

      const from = String(this.filters.from ?? "").trim();
      const to = String(this.filters.to ?? "").trim();

      if (!from || !to) {
        return {
          isValid: false,
          message: "range period requires from and to dates",
        };
      }

      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(from) || !datePattern.test(to)) {
        return {
          isValid: false,
          message:
            "range period requires from and to dates in YYYY-MM-DD format",
        };
      }

      const fromDate = new Date(`${from}T00:00:00.000Z`);
      const toDate = new Date(`${to}T00:00:00.000Z`);

      if (
        Number.isNaN(fromDate.getTime()) ||
        Number.isNaN(toDate.getTime()) ||
        fromDate.toISOString().slice(0, 10) !== from ||
        toDate.toISOString().slice(0, 10) !== to
      ) {
        return {
          isValid: false,
          message:
            "range period requires from and to dates in YYYY-MM-DD format",
        };
      }

      const rangeDays = (toDate.getTime() - fromDate.getTime()) / 86400000;
      if (rangeDays < 0) {
        return {
          isValid: false,
          message: "range period to date must be on or after from date",
        };
      }

      if (rangeDays + 1 > 31) {
        return {
          isValid: false,
          message: "range period cannot exceed 31 days",
        };
      }

      this.filters.from = from;
      this.filters.to = to;
      return { isValid: true, message: "" };
    },

    applySummaryFilterValidationError(message) {
      this.error = message;
      this.errorMessage = message;
      this.showNotification(message, "error");
    },

    getDashboardMapLocations() {
      return Array.isArray(this.cockpit?.hero?.data?.locations)
        ? this.cockpit.hero.data.locations
        : [];
    },

    canRenderDashboardMap() {
      return (
        this.getDashboardMapLocations().length > 0 &&
        this.cockpit?.hero?.state === "ready"
      );
    },

    queueDashboardMapRender() {
      if (typeof window === "undefined") {
        return;
      }

      const renderToken = ++this.dashboardMapRenderToken;
      const render = () => this.renderDashboardMap(renderToken);

      if (typeof this.$nextTick === "function") {
        this.$nextTick(render);
        return;
      }

      window.setTimeout(render, 0);
    },

    async getDashboardLeaflet() {
      if (this.dashboardLeaflet) {
        return this.dashboardLeaflet;
      }

      if (typeof window !== "undefined" && window.L) {
        this.dashboardLeaflet = window.L;
        return this.dashboardLeaflet;
      }

      const leafletModule = await import("leaflet");
      this.dashboardLeaflet = leafletModule.default || leafletModule;
      return this.dashboardLeaflet;
    },

    isDashboardMapContainerConnected(container) {
      if (!container) {
        return false;
      }

      return container.isConnected !== false;
    },

    ensureDashboardMapLayers(L) {
      if (!this.dashboardMapMarkerLayer) {
        this.dashboardMapMarkerLayer = L.layerGroup().addTo(this.dashboardMap);
      }

      if (!this.dashboardMapRadiusLayer) {
        this.dashboardMapRadiusLayer = L.layerGroup().addTo(this.dashboardMap);
      }
    },

    clearDashboardMapLayers() {
      this.dashboardMapMarkerLayer?.clearLayers?.();
      this.dashboardMapRadiusLayer?.clearLayers?.();
    },

    ensureDashboardMap(L, container, firstLocation, defaultZoom) {
      const activeContainer = this.dashboardMap?.getContainer?.();

      if (
        this.dashboardMap &&
        activeContainer &&
        activeContainer !== container
      ) {
        this.destroyDashboardMap();
      }

      if (!this.dashboardMap) {
        this.dashboardMap = L.map(container, {
          center: [firstLocation.latitude, firstLocation.longitude],
          zoom: defaultZoom,
          zoomControl: true,
          attributionControl: true,
          zoomAnimation: false,
        });

        this.dashboardMapTileLayer = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          },
        ).addTo(this.dashboardMap);
      }

      this.ensureDashboardMapLayers(L);
      return this.dashboardMap;
    },

    destroyDashboardMap() {
      if (!this.dashboardMap) {
        this.dashboardMapTileLayer = null;
        this.dashboardMapMarkerLayer = null;
        this.dashboardMapRadiusLayer = null;
        return;
      }

      this.dashboardMap.stop?.();
      this.clearDashboardMapLayers();
      this.dashboardMap.off?.();
      this.dashboardMap.remove();
      this.dashboardMap = null;
      this.dashboardMapTileLayer = null;
      this.dashboardMapMarkerLayer = null;
      this.dashboardMapRadiusLayer = null;
    },

    createDashboardMapMarkerIcon(L, location) {
      const color = location.modeColor || "#2563eb";

      return L.divIcon({
        className: "dashboard-attendance-marker",
        html: `<span style="--marker-color: ${color}" class="dashboard-attendance-marker__pin"></span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });
    },

    createDashboardMapPopup(location) {
      const content = document.createElement("div");
      content.className = "space-y-2 text-sm";

      const name = document.createElement("p");
      name.className = "font-semibold text-gray-900";
      name.textContent =
        location.label || location.fullName || "Unknown Location";
      content.appendChild(name);

      const identity = document.createElement("p");
      identity.className = "text-xs text-gray-600";
      identity.textContent = `User: ${location.userName || location.fullName || "Unavailable"}`;
      content.appendChild(identity);

      const attendanceMeta = document.createElement("p");
      attendanceMeta.className = "text-xs text-gray-600";
      attendanceMeta.textContent = `Status: ${location.status || "Unavailable"} • Date: ${location.attendanceDate || "Unavailable"}`;
      content.appendChild(attendanceMeta);

      const workMode = document.createElement("p");
      workMode.className = "text-xs text-gray-600";
      workMode.textContent = `Mode: ${location.mode || location.information || "Unavailable"} • Time: ${location.timeIn || "-"} / ${location.timeOut || "-"}`;
      content.appendChild(workMode);

      const description = document.createElement("p");
      description.className = "text-gray-600";
      description.textContent = location.description || "Unavailable";
      content.appendChild(description);

      const coordinates = document.createElement("p");
      coordinates.className = "text-xs text-gray-500";
      coordinates.textContent = `Coordinates: ${location.latitude}, ${location.longitude}`;
      content.appendChild(coordinates);

      const sourceNote = document.createElement("p");
      sourceNote.className = "text-xs text-gray-500";
      sourceNote.textContent = location.sourceNote || "Unavailable";
      content.appendChild(sourceNote);

      if (location.trackingNote) {
        const trackingNote = document.createElement("p");
        trackingNote.className = "text-xs text-gray-500";
        trackingNote.textContent = location.trackingNote;
        content.appendChild(trackingNote);
      }

      const detailButton = document.createElement("button");
      detailButton.type = "button";
      detailButton.className =
        "inline-flex items-center rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:border-blue-300 hover:text-blue-700";
      detailButton.textContent = "View location details";
      detailButton.addEventListener("click", () =>
        this.openMapLocation(location),
      );
      content.appendChild(detailButton);

      return content;
    },

    async renderDashboardMap(renderToken = this.dashboardMapRenderToken) {
      if (typeof document === "undefined") {
        return;
      }

      const container = document.getElementById("dashboardMapView");
      const canRender = this.canRenderDashboardMap();
      const locations = this.getDashboardMapLocations();

      if (!container || !this.isDashboardMapContainerConnected(container)) {
        this.destroyDashboardMap();
        return;
      }

      if (!canRender) {
        this.dashboardMap?.stop?.();
        this.clearDashboardMapLayers();
        return;
      }

      const L = await this.getDashboardLeaflet();

      if (renderToken !== this.dashboardMapRenderToken) {
        return;
      }

      if (
        !this.canRenderDashboardMap() ||
        !this.isDashboardMapContainerConnected(container)
      ) {
        return;
      }

      const firstLocation = locations[0];
      const defaultZoom = locations.length === 1 ? 16 : 13;
      const layers = [];
      const map = this.ensureDashboardMap(
        L,
        container,
        firstLocation,
        defaultZoom,
      );

      if (!map) {
        return;
      }

      map.stop?.();
      this.clearDashboardMapLayers();

      locations.forEach((location) => {
        const marker = L.marker([location.latitude, location.longitude], {
          icon: this.createDashboardMapMarkerIcon(L, location),
        }).addTo(
          this.dashboardMapMarkerLayer,
        );
        marker.bindPopup(this.createDashboardMapPopup(location));
        layers.push(marker);

        if (Number.isFinite(location.radius) && location.radius > 0) {
          const radiusLayer = L.circle(
            [location.latitude, location.longitude],
            {
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 0.1,
              radius: location.radius,
              weight: 2,
            },
          ).addTo(this.dashboardMapRadiusLayer);
          layers.push(radiusLayer);
        }
      });

      if (layers.length > 1) {
        map.fitBounds(L.featureGroup(layers).getBounds(), {
          padding: [32, 32],
          animate: false,
        });
      } else {
        map.setView(
          [firstLocation.latitude, firstLocation.longitude],
          defaultZoom,
          { animate: false },
        );
      }

      window.setTimeout(() => {
        if (
          renderToken !== this.dashboardMapRenderToken ||
          !this.dashboardMap
        ) {
          return;
        }

        const activeContainer = this.dashboardMap.getContainer?.();

        if (!this.isDashboardMapContainerConnected(activeContainer)) {
          return;
        }

        this.dashboardMap.invalidateSize();
      }, 0);
    },

    openMapLocation(location) {
      this.viewLocation({
        full_name: location.userName || location.fullName || location.label,
        email: location.email,
        role_name: location.roleName,
        phone_number: location.phoneNumber,
        status: location.status,
        information: location.mode || location.information,
        attendance_date: location.attendanceDate,
        time_in: location.timeIn,
        time_out: location.timeOut,
        source: location.source,
        source_note: location.sourceNote,
        tracking_note: location.trackingNote,
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius,
        location_description: location.description,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: location.radius,
          description: location.description,
        },
      });
    },

    /**
     * Load summary data dari API - report/export uses filters.period; dashboard analytics uses dashboardRange.
     */
    async loadSummaryData({ includeTodayLocations = true } = {}) {
      this.loading = true;
      this.isLoading = true;
      this.error = null;
      this.errorMessage = null;
      this.filters.search = String(this.searchQuery ?? "").trim();

      const filterValidation = this.validateSummaryReportFilters();
      if (!filterValidation.isValid) {
        this.loading = false;
        this.isLoading = false;
        this.applySummaryFilterValidationError(filterValidation.message);
        return false;
      }

      this.cockpit = createDashboardCockpitLoadingState();

      try {
        const dashboardRange = this.syncDashboardRangeState();

        console.log(
          `Loading dashboard data for page: ${this.filters.page}, search: ${this.filters.search}, report period: ${this.filters.period}, analytics range: ${dashboardRange.period}`,
        );

        const reportRequestParams = {
          ...buildDashboardRequestParams(this.filters),
          ...(this.filters.period === "range"
            ? { from: this.filters.from, to: this.filters.to }
            : {}),
          sortBy: this.filters.sortBy,
          sortOrder: this.filters.sortOrder,
        };
        const analyticsRequestParams =
          this.getDashboardAnalyticsRequestParams();
        const requests = [
          this.fetchSummaryReport(reportRequestParams),
          this.fetchDashboardAnalytics(analyticsRequestParams),
          this.fetchGeofenceEvidence(analyticsRequestParams),
        ];

        if (includeTodayLocations) {
          requests.push(this.fetchTodayLocations());
        }

        const [
          reportResult,
          analyticsResult,
          geofenceEvidenceResult,
          todayLocationsResult,
        ] = await Promise.allSettled(requests);

        if (reportResult.status !== "fulfilled") {
          throw reportResult.reason;
        }

        const analyticsResponse =
          analyticsResult.status === "fulfilled" ? analyticsResult.value : null;
        const analyticsError =
          analyticsResult.status === "fulfilled"
            ? null
            : analyticsResult.reason;
        const geofenceEvidenceResponse =
          geofenceEvidenceResult.status === "fulfilled"
            ? geofenceEvidenceResult.value
            : null;
        const geofenceEvidenceError =
          geofenceEvidenceResult.status === "fulfilled"
            ? null
            : geofenceEvidenceResult.reason;
        const todayLocations = includeTodayLocations
          ? todayLocationsResult.status === "fulfilled"
            ? createLiveMapSliceState(
                todayLocationsResult.value,
                analyticsRequestParams,
              )
            : null
          : this.todayLocations;
        const todayLocationsError = includeTodayLocations
          ? todayLocationsResult.status === "fulfilled"
            ? null
            : todayLocationsResult.reason
          : this.todayLocationsError;

        if (analyticsError) {
          console.warn(
            "Dashboard analytics request failed; keeping report rows and conservative cockpit state:",
            analyticsError,
          );
        }

        if (todayLocationsError && includeTodayLocations) {
          console.warn(
            "Today locations request failed; live map will stay truthful to the missing backend feed:",
            todayLocationsError,
          );
        }

        if (geofenceEvidenceError) {
          console.warn(
            "Geofence evidence request failed; evidence panel will stay truthful to the missing backend feed:",
            geofenceEvidenceError,
          );
        }

        console.log(
          `Dashboard API calls made with report period='${this.filters.period}' and analytics range='${this.dashboardRange}'`,
        );
        this.applySummaryResponse(
          reportResult.value,
          analyticsResponse,
          analyticsError,
          todayLocations?.response ?? null,
          todayLocationsError,
          this.fuzzyAhpResponse,
          this.fuzzyAhpError,
          geofenceEvidenceResponse,
          geofenceEvidenceError,
        );
        console.log("Summary data loaded successfully:", this.summaryData);
        console.log("Attendance data mapped:", this.attendanceData);
      } catch (error) {
        const authFailure = classifyAuthFailure(error);

        console.error("Error loading summary data:", error);
        this.applySummaryError(error);

        if (authFailure.kind === "refreshable" || authFailure.kind === "non_refreshable") {
          console.warn(
            "Dashboard summary request failed because the session is not valid; auth flow will handle user notification.",
            authFailure,
          );
          return false;
        }

        this.showNotification(
          "Failed to load dashboard data. Please check your connection and try again.",
          "error",
        );
      } finally {
        this.loading = false;
        this.isLoading = false;
      }
    },

    getExportTotalMetadata(pagination) {
      if (Object.prototype.hasOwnProperty.call(pagination, "total_records")) {
        return {
          exists: true,
          value: pagination.total_records,
        };
      }

      if (Object.prototype.hasOwnProperty.call(pagination, "total_items")) {
        return {
          exists: true,
          value: pagination.total_items,
        };
      }

      return {
        exists: false,
        value: undefined,
      };
    },

    extractExportReportRows(response) {
      if (Array.isArray(response?.report)) {
        return response.report;
      }

      if (Array.isArray(response?.report?.data)) {
        return response.report.data;
      }

      return null;
    },

    getExportPagination(response) {
      if (response?.report && !Array.isArray(response.report)) {
        return response.report.pagination || {};
      }

      return response?.pagination || {};
    },

    /**
     * Check whether the fetched export dataset covers the reported total rows
     * for the active period filter.
     */
    ensureExportDatasetComplete(response) {
      const reportRows = this.extractExportReportRows(response);
      const fetchedRows = Array.isArray(reportRows) ? reportRows.length : 0;
      const pagination = this.getExportPagination(response);
      const totalMetadata = this.getExportTotalMetadata(pagination);
      const totalRecordsRaw = totalMetadata.value;
      const totalRecords = Number(totalRecordsRaw);

      if (
        !totalMetadata.exists ||
        totalRecordsRaw === null ||
        (typeof totalRecordsRaw === "string" &&
          totalRecordsRaw.trim() === "") ||
        !Number.isFinite(totalRecords) ||
        totalRecords < 0 ||
        !Number.isInteger(totalRecords)
      ) {
        throw new Error(
          "Export data completeness could not be verified for the selected period.",
        );
      }

      if (totalRecords !== fetchedRows) {
        throw new Error(
          "Export data is incomplete or inconsistent for the selected period. Please narrow the filter or use a backend export path that supports the full dataset.",
        );
      }
    },

    getCanonicalSummaryReportFiltersForExport() {
      const validation = this.validateSummaryReportFilters();

      if (!validation.isValid) {
        throw new Error(
          validation.message || "Invalid summary report period for export.",
        );
      }

      return {
        period: this.filters.period,
        ...(this.filters.period === "range"
          ? {
              from: this.filters.from,
              to: this.filters.to,
            }
          : {}),
      };
    },

    async loadExportData() {
      try {
        const reportFilters = this.getCanonicalSummaryReportFiltersForExport();

        console.log(
          `Loading export payload for summary report period: ${reportFilters.period}`,
        );

        const response = await this.fetchSummaryReport({
          ...reportFilters,
          page: 1,
          limit: 5000,
        });

        if (response && response.summary) {
          this.ensureExportDatasetComplete(response);

          const exportData = {
            summary: response.summary,
            report: response.report,
          };
          const exportTotalMetadata = this.getExportTotalMetadata(
            this.getExportPagination(response),
          );
          const exportRows = this.extractExportReportRows(response) || [];

          console.log(
            `Export payload loaded for selected summary report period:`,
            {
              range: reportFilters,
              summaryStats: response.summary,
              recordCount: exportRows.length,
              totalRecords: exportTotalMetadata.value || 0,
            },
          );

          return exportData;
        }

        throw new Error(
          "Export payload is missing the required summary/report sections.",
        );
      } catch (error) {
        console.error("Error loading export payload:", error);
        throw error;
      }
    },

    hasRequiredExportStructure(exportData) {
      return Boolean(
        exportData?.summary &&
        (exportData.report?.data || exportData.report) &&
        typeof exportData.summary === "object",
      );
    },

    async loadValidatedExportData(format) {
      const exportData = await this.loadExportData();

      if (!exportData || !exportData.summary || !exportData.report) {
        console.error(
          `Export payload is missing required sections for ${format}`,
        );
        this.showNotification(
          "Failed to load the export payload. Please try again.",
          "error",
        );
        return null;
      }

      if (!this.hasRequiredExportStructure(exportData)) {
        console.error(`Export payload failed structural checks for ${format}`);
        this.showNotification(
          `The export payload is missing required summary/report structure for ${format} export.`,
          "error",
        );
        return null;
      }

      console.log(
        `Export payload passed structural checks for ${format} generation:`,
        exportData,
      );

      return exportData;
    },

    async onDashboardRangeChange() {
      console.log(
        `Dashboard analytics range changed to: ${this.dashboardRange}`,
      );

      await this.loadSummaryData({ includeTodayLocations: false });

      this.showNotification(
        `Dashboard analytics updated untuk range: ${this.dashboardRange}`,
        "info",
      );
    },

    async loadFuzzyAhpDetail(params = this.fahpFilterState) {
      const currentReportResponse = this.rawApiData
        ? {
            summary: this.rawApiData.summary,
            report: this.rawApiData.report,
          }
        : {};

      const requestParams = buildFahpRequestParams(params);
      if (!requestParams.category) {
        const error = new Error(
          "Invalid category: null. Allowed categories are discipline, wfa, smart_ac.",
        );
        this.fuzzyAhpResponse = null;
        this.fuzzyAhpError = error;
        await this.applyCockpitSurfaceState({
          reportResponse: currentReportResponse,
          fuzzyAhpResponse: null,
          fuzzyAhpError: error,
        });
        throw error;
      }

      this.fuzzyAhpError = null;
      await this.applyCockpitSurfaceState({
        reportResponse: currentReportResponse,
        fuzzyAhpResponse: null,
        fuzzyAhpError: null,
      });

      const fahpSlice = await this.pageState?.refreshFahpRecap(requestParams);

      await this.applyCockpitSurfaceState({
        reportResponse: currentReportResponse,
        fuzzyAhpResponse: this.fuzzyAhpResponse,
        fuzzyAhpError: this.fuzzyAhpError,
      });

      if (fahpSlice?.status === "error") {
        const error = new Error(fahpSlice.error || "fahp recap unavailable");
        this.fuzzyAhpResponse = null;
        this.fuzzyAhpError = error;
        await this.applyCockpitSurfaceState({
          reportResponse: currentReportResponse,
          fuzzyAhpResponse: null,
          fuzzyAhpError: error,
        });
        console.warn(
          "Fuzzy AHP request failed; decision panel will stay truthful to the missing backend feed:",
          error,
        );
      }
    },

    /**
     * Handle report/export period change - keeps filters.period as report/export owner.
     */
    async onPeriodChange() {
      console.log(`Period filter changed to: ${this.filters.period}`);
      console.log("Reloading report/export data dengan period filter baru");

      this.filters = applyDashboardPeriod(this.filters, this.filters.period);
      this.period = this.filters.period;
      const loaded = await this.loadSummaryData();

      if (loaded === false) {
        return;
      }

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
      if (score >= 85) return "bg-green-500"; // Excellent - Green
      if (score >= 70) return "bg-blue-500"; // Good - Blue
      if (score >= 55) return "bg-yellow-500"; // Needs Improvement - Yellow
      return "bg-red-500"; // Poor - Red
    },

    openExportModal() {
      this.isExportModalOpen = true;
    },

    closeExportModal() {
      this.isExportModalOpen = false;
    },

    async exportSelected(format) {
      // TODO(INF-166): Redesign export UX after this single-entry export wiring is stable.
      if (this.isExporting) {
        return;
      }

      if (format === "pdf") {
        if (await this.exportToPDF()) {
          this.closeExportModal();
        }
        return;
      }

      if (format === "excel") {
        if (await this.exportToExcel()) {
          this.closeExportModal();
        }
        return;
      }

      this.showNotification("Unsupported export format selected.", "error");
    },

    /**
     * Download report as PDF
     */
    async downloadPDF() {
      try {
        console.log(
          `Generating PDF report with period filter: ${this.filters.period}`,
        );

        const exportData = await this.loadValidatedExportData("PDF");
        if (!exportData) {
          return false;
        }

        generatePDFReport(exportData, this.filters.period);
        this.showNotification("PDF report downloaded successfully!", "success");
        return true;
      } catch (error) {
        console.error("Error generating PDF:", error);
        this.showNotification(
          error?.message || "Failed to generate PDF report",
          "error",
        );
        return false;
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

        const exportData = await this.loadValidatedExportData("Excel");
        if (!exportData) {
          return false;
        }

        generateExcelReport(exportData, this.filters.period);
        this.showNotification(
          "Excel report downloaded successfully!",
          "success",
        );
        return true;
      } catch (error) {
        console.error("Error generating Excel:", error);
        this.showNotification(
          error?.message || "Failed to generate Excel report",
          "error",
        );
        return false;
      }
    },

    /**
     * Export to PDF - wrapper function for stats-card-group.html
     */
    async exportToPDF() {
      this.isExporting = true;
      try {
        return await this.downloadPDF();
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
        return await this.downloadExcel();
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
    getAvatarColor /**
     * View location on map (exact same as attendance table)
     */,
    viewLocation(attendanceItem) {
      console.log("Dashboard viewLocation called with:", attendanceItem);

      // Siapkan payload untuk modal peta - exactly same structure as attendance table
      const locationPayload = {
        fullName: this.getOptionalBackendValue(
          attendanceItem.full_name,
          "Unavailable",
        ),
        email: this.getOptionalBackendValue(
          attendanceItem.email,
          "Unavailable",
        ),
        position: this.getOptionalBackendValue(
          attendanceItem.role_name,
          "Unavailable",
        ),
        phoneNumber: this.getOptionalBackendValue(
          attendanceItem.phone_number,
          "Unavailable",
        ),
        status: this.getOptionalBackendValue(
          attendanceItem.status,
          "Unavailable",
        ),
        attendanceDate: this.getOptionalBackendValue(
          attendanceItem.attendance_date,
          "Unavailable",
        ),
        workMode: this.getOptionalBackendValue(
          attendanceItem.information,
          "Unavailable",
        ),
        latitude: attendanceItem.location?.latitude ?? attendanceItem.latitude,
        longitude:
          attendanceItem.location?.longitude ?? attendanceItem.longitude,
        radius:
          attendanceItem.location?.radius ?? attendanceItem.radius ?? null,
        description: this.getOptionalBackendValue(
          attendanceItem.location?.description,
          this.getOptionalBackendValue(attendanceItem.location_description),
        ),
        sourceNote: this.getOptionalBackendValue(
          attendanceItem.source_note,
          "Unavailable",
        ),
        trackingNote: this.getOptionalBackendValue(
          attendanceItem.tracking_note,
        ),
      };

      console.log("Prepared location payload:", locationPayload);

      // Call global function untuk membuka modal peta - exactly same as attendance table
      if (typeof window.openMapDetailModal === "function") {
        console.log("Calling window.openMapDetailModal");
        window.openMapDetailModal(locationPayload);
      } else {
        console.warn("openMapDetailModal function not found");
        // Fallback: tampilkan koordinat dalam alert - exactly same as attendance table
        if (
          Number.isFinite(locationPayload.latitude) &&
          Number.isFinite(locationPayload.longitude)
        ) {
          alert(
            `Koordinat: ${locationPayload.latitude}, ${locationPayload.longitude}`,
          );
        } else {
          alert("Koordinat lokasi tidak tersedia");
        }
      }
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

      this.summaryData = null;
      this.cockpit = createDashboardCockpitStateFromSources();
      this.pagination = createEmptyDashboardPagination(this.filters.limit);
      this.rawApiData = null;
      this.dashboardAnalyticsResponse = null;
      this.dashboardAnalyticsError = null;
      this.todayLocations = null;
      this.todayLocationsError = null;
      this.fuzzyAhpResponse = null;
      this.fuzzyAhpError = null;
      this.geofenceEvidenceResponse = null;
      this.geofenceEvidenceError = null;
      this.attendanceData = [];
      this.reportData = [];

      this.queueDashboardMapRender();
      this.showNotification("No data available from server", "info");
    },

    // Debounced search function
    debouncedSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.filters = applyDashboardSearch(this.filters, this.searchQuery);
        this.loadSummaryData();
      }, 1000);
    },

    changeSort(field) {
      const allowedSortFields = ["full_name", "status", "attendance_date"];
      if (!allowedSortFields.includes(field)) {
        return;
      }

      if (this.filters.sortBy === field) {
        this.filters.sortOrder =
          this.filters.sortOrder === "asc" ? "desc" : "asc";
      } else {
        this.filters.sortBy = field;
        this.filters.sortOrder = "asc";
      }

      this.currentSort = {
        field: this.filters.sortBy,
        direction: this.filters.sortOrder,
      };
      this.filters.page = 1;
      this.loadSummaryData();
    },

    getSortIcon(fieldName) {
      if (this.currentSort.field !== fieldName) {
        return "";
      }

      return this.currentSort.direction === "asc" ? "↑" : "↓";
    },

    // Update filters limit and reload data
    changeEntriesPerPage(newLimit) {
      this.filters = applyDashboardPageSize(this.filters, newLimit);
      this.loadSummaryData();
    },
  };
}
