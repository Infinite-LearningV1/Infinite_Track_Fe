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
    dashboardRangeOptions: [
      { value: "30d", label: "Last 30 Days" },
      { value: "current_month", label: "Current Month" },
    ],
    trendRange: "monthly",
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
      const ranges = Array.isArray(panel?.data?.ranges)
        ? panel.data.ranges
        : [];
      const fallbackKey =
        panel?.data?.defaultRangeKey || ranges[0]?.key || "monthly";
      const selectedKey = this.trendRange || fallbackKey;

      return (
        ranges.find((range) => range.key === selectedKey) ||
        ranges.find((range) => range.key === fallbackKey) ||
        ranges[0] || {
          metrics: [],
          series: [],
          xAxisLabels: [],
          yAxisLabels: [],
        }
      );
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
            this.geofenceEvidenceError?.message || "geofence evidence unavailable",
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
        todayLocationsResponse === null || typeof todayLocationsResponse === "undefined"
          ? null
          : createLiveMapSliceState(todayLocationsResponse, analyticsRequestParams);

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
            : createFahpRecapSliceState(
                fuzzyAhpResponse,
                this.fahpFilterState,
              ),
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
        return fallbackRange;
      }

      this.dashboardRangeState = candidateRange;
      return candidateRange;
    },

    getDashboardAnalyticsRequestParams() {
      return buildDashboardRangeRequestParams(this.syncDashboardRangeState());
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
        const marker = L.marker([location.latitude, location.longitude]).addTo(
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
        });
      } else {
        map.setView(
          [firstLocation.latitude, firstLocation.longitude],
          defaultZoom,
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
        console.error("Error loading summary data:", error);
        this.applySummaryError(error);
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

          console.log(`Export payload loaded for selected summary report period:`, {
            range: reportFilters,
            summaryStats: response.summary,
            recordCount: exportRows.length,
            totalRecords: exportTotalMetadata.value || 0,
          });

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
        const error = new Error(
          fahpSlice.error || "fahp recap unavailable",
        );
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
