import test from "node:test";
import assert from "node:assert/strict";

import { dashboard } from "../../src/js/features/dashboard/dashboard.js";
import { buildFahpRequestParams } from "../../src/js/features/dashboard/fahpFilterState.js";
import { DASHBOARD_PANEL_STATES } from "../../src/js/services/dashboardCockpitService.js";

test("dashboard FAHP request params use the final type-based contract", () => {
  const component = dashboard();
  const params =
    component.getFahpRequestParams?.() ||
    buildFahpRequestParams(component.fahpFilterState);

  assert.deepEqual(params, { type: "discipline" });
});

test("dashboard initializes cockpit without the retired report workspace surface", () => {
  const component = dashboard();

  assert.equal("realApiCockpit" in component, false);
  assert.equal("cardSummaryData" in component, false);
  assert.equal("analyticsData" in component, false);
  assert.equal("reportWorkspace" in component, false);
  assert.equal(component.summaryData, null);
  assert.equal(component.isExportModalOpen, false);
  assert.equal(component.dashboardRange, "current_month");
  assert.equal(component.trendRange, "monthly");
  assert.ok(
    component.cockpit.kpis.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.LOADING,
    ),
  );
  assert.equal(component.cockpit.hero.state, DASHBOARD_PANEL_STATES.LOADING);
  assert.ok(
    component.cockpit.middlePanels.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.LOADING,
    ),
  );
  assert.ok(
    component.cockpit.bottomPanels.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.LOADING,
    ),
  );
});

test("dashboard applies cockpit state from legacy report sources without trusting embedded analytics", () => {
  const component = dashboard();
  let mapRenderQueued = 0;

  component.queueDashboardMapRender = () => {
    mapRenderQueued += 1;
  };

  const response = {
    summary: {
      total_ontime: 2,
      total_late: 1,
      total_alpha: 0,
      total_wfo: 1,
      total_wfh: 1,
      total_wfa: 1,
    },
    analytics: {
      executive_kpis: {
        avg_discipline: 82,
      },
      mode_mix: {
        totals: {
          wfo: 1,
          wfh: 1,
          wfa: 1,
        },
      },
    },
    report: {
      data: [
        {
          attendance_id: "att_001",
          nip_nim: "EMP001",
          full_name: "Andi Wijaya",
          role: "Employee",
          time_in: "08:00",
          time_out: "17:00",
          status: "ontime",
          information: "WFO",
          attendance_date: "2026-05-03",
          location_details: {
            coordinates: { latitude: -0.9, longitude: 119.8 },
            radius: 100,
            description: "Kantor Palu",
          },
        },
      ],
      pagination: {
        current_page: 2,
        total_pages: 3,
        total_records: 7,
        per_page: 5,
        has_prev_page: true,
        has_next_page: true,
      },
    },
  };

  component.applySummaryResponse(response);

  const modeMix = component.cockpit.middlePanels.find(
    (panel) => panel.key === "modeMix",
  );
  const averageDiscipline = component.cockpit.kpis.find(
    (panel) => panel.key === "averageDiscipline",
  );

  assert.equal(
    component.cockpit.hero.state,
    DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
  );
  assert.equal(component.cockpit.hero.data, null);
  assert.equal(component.getDashboardMapLocations().length, 0);
  assert.equal(mapRenderQueued, 1);
  assert.equal(modeMix.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.equal(
    averageDiscipline.state,
    DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
  );
  assert.equal(averageDiscipline.value, null);
  assert.equal(Object.prototype.hasOwnProperty.call(component.rawApiData, "analytics"), false);
  assert.deepEqual(component.summaryData, {
    summary: {
      onTime: 2,
      late: 1,
      alpha: 0,
      wfo: 1,
      wfh: 1,
      wfa: 1,
    },
    report: response.report.data,
  });
  assert.equal(component.attendanceData.length, 1);
  assert.equal(component.reportData, component.attendanceData);
  assert.equal(component.attendanceData[0].attendance_id, "att_001");
  assert.equal(component.attendanceData[0].full_name, "Andi Wijaya");
  assert.equal(component.rawApiData.summary, response.summary);
  assert.equal(component.rawApiData.report, response.report);
  assert.deepEqual(component.pagination, {
    current_page: 2,
    total_pages: 3,
    total_records: 7,
    has_prev_page: true,
    has_next_page: true,
    per_page: 5,
  });
});

test("dashboard renders active hero map only when today-locations hero is ready", () => {
  const component = dashboard();

  component.cockpit.hero = {
    state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
    data: {
      backendStatus: "partial_data",
      locations: [
        {
          key: "loc_001",
          latitude: -0.9,
          longitude: 119.8,
        },
      ],
    },
  };

  assert.equal(component.getDashboardMapLocations().length, 1);
  assert.equal(component.canRenderDashboardMap(), false);

  component.cockpit.hero.state = DASHBOARD_PANEL_STATES.READY;

  assert.equal(component.canRenderDashboardMap(), true);
});

test("dashboard preserves unavailable row discipline and location fields without fabricated defaults", () => {
  const component = dashboard();

  component.applySummaryResponse({
    summary: {
      total_ontime: 0,
      total_late: 0,
      total_alpha: 0,
    },
    report: {
      data: [
        {
          full_name: "Missing Fields",
          time_in: "08:00",
          time_out: "17:00",
          location_details: {},
        },
        {
          attendance_id: "att_zero",
          full_name: "Explicit Zero",
          discipline_score: 0,
          discipline_label: "0",
          location_details: {
            coordinates: { latitude: 0, longitude: 0 },
            radius: 0,
            description: "Zero coordinate point",
          },
        },
      ],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_records: 2,
        per_page: 5,
        has_prev_page: false,
        has_next_page: false,
      },
    },
  });

  const [missingRow, zeroRow] = component.attendanceData;

  assert.equal(missingRow.id_attendance, null);
  assert.match(missingRow.row_key, /^attendance_row_/);
  assert.equal(missingRow.role_name, null);
  assert.equal(missingRow.status, null);
  assert.equal(missingRow.information, null);
  assert.equal(missingRow.email, null);
  assert.equal(missingRow.phone_number, null);
  assert.equal(missingRow.work_hour, null);
  assert.equal(missingRow.discipline_score, null);
  assert.equal(missingRow.discipline_label, null);
  assert.equal(missingRow.location.radius, null);
  assert.equal(missingRow.location.description, null);
  assert.equal(missingRow.location_description, null);
  assert.equal(missingRow.latitude, null);
  assert.equal(missingRow.longitude, null);
  assert.equal(zeroRow.id_attendance, "att_zero");
  assert.equal(zeroRow.discipline_score, 0);
  assert.equal(zeroRow.discipline_label, "0");
  assert.equal(zeroRow.location.latitude, 0);
  assert.equal(zeroRow.location.longitude, 0);
  assert.equal(zeroRow.location.radius, 0);
  assert.equal(zeroRow.location.description, "Zero coordinate point");
});

test("dashboard loadSummaryData uses the explicit analytics response for cockpit KPIs", async () => {
  const component = dashboard();
  const notifications = [];
  const reportCalls = [];
  const analyticsCalls = [];
  const originalLog = console.log;

  component.searchQuery = "  Rina  ";
  component.dashboardRange = "current_month";
  component.filters.period = "all";
  component.filters.page = 2;
  component.filters.limit = 10;
  component.filters.sortBy = "attendance_date";
  component.filters.sortOrder = "desc";
  component.queueDashboardMapRender = () => {};
  component.showNotification = (message, type) => {
    notifications.push({ message, type });
  };
  component.fetchSummaryReport = async (params) => {
    reportCalls.push(params);
    return {
      summary: {
        total_ontime: 5,
        total_late: 1,
        total_alpha: 0,
        total_wfo: 3,
        total_wfh: 1,
        total_wfa: 1,
      },
      analytics: {
        executive_kpis: {
          avg_discipline: 12,
        },
      },
      report: {
        data: [
          {
            attendance_id: "att_001",
            nip_nim: "EMP001",
            full_name: "Rina",
            role: "Staff",
            status: "ontime",
            information: "WFO",
            attendance_date: "2026-05-01",
            location_details: {},
          },
        ],
        pagination: {
          current_page: 2,
          total_pages: 3,
          total_records: 21,
          per_page: 10,
          has_prev_page: true,
          has_next_page: true,
        },
      },
    };
  };
  component.fetchDashboardAnalytics = async (params) => {
    analyticsCalls.push(params);
    return {
      data: {
        executive_kpis: {
          avg_discipline: 78.5,
        },
      },
    };
  };
  component.fetchTodayLocations = async () => ({ data: [] });
  component.fetchFuzzyAhpAnalysis = async () => {
    throw new Error("fuzzy ahp detail should be loaded on demand only");
  };

  console.log = () => {};

  try {
    await component.loadSummaryData();
  } finally {
    console.log = originalLog;
  }

  const averageDiscipline = component.cockpit.kpis.find(
    (panel) => panel.key === "averageDiscipline",
  );

  assert.deepEqual(reportCalls, [
    {
      period: "all",
      page: 2,
      limit: 10,
      search: "Rina",
      sortBy: "attendance_date",
      sortOrder: "desc",
    },
  ]);
  assert.deepEqual(analyticsCalls, [{ period: "current_month" }]);
  assert.equal(component.filters.search, "Rina");
  assert.equal(averageDiscipline.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(averageDiscipline.value, "78.5");
  assert.equal(Object.prototype.hasOwnProperty.call(component.rawApiData, "analytics"), false);
  assert.deepEqual(component.rawApiData.historicalAnalytics, {
    request: { period: "current_month" },
    response: {
      data: {
        executive_kpis: {
          avg_discipline: 78.5,
        },
      },
    },
    viewModel: {
      kpis: {
        avg_discipline: 78.5,
      },
      trend: { points: [] },
      modeMix: { totals: {}, percentages: {} },
      insights: { items: [] },
      windowMeta: {
        requestedWindow: null,
        executedWindow: null,
      },
    },
  });
  assert.equal(component.attendanceData.length, 1);
  assert.equal(component.error, null);
  assert.equal(component.loading, false);
  assert.equal(component.isLoading, false);
  assert.deepEqual(notifications, []);
});

test("dashboard loadSummaryData keeps report params stable while requesting analytics, geofence, today locations, and Fuzzy AHP", async () => {
  const component = dashboard();
  const reportCalls = [];
  const analyticsCalls = [];
  const geofenceCalls = [];
  const todayLocationCalls = [];
  const fuzzyAhpCalls = [];
  const originalLog = console.log;

  component.queueDashboardMapRender = () => {};
  component.filters.period = "all";
  component.filters.page = 2;
  component.filters.limit = 10;
  component.filters.sortBy = "attendance_date";
  component.filters.sortOrder = "desc";
  component.searchQuery = "  Rina  ";
  component.dashboardRange = "current_month";

  component.fetchSummaryReport = async (params) => {
    reportCalls.push(params);
    return {
      summary: {
        total_ontime: 5,
        total_late: 1,
        total_alpha: 0,
      },
      report: {
        data: [],
        pagination: {
          current_page: 2,
          total_pages: 3,
          total_records: 21,
          per_page: 10,
          has_prev_page: true,
          has_next_page: true,
        },
      },
    };
  };

  component.fetchDashboardAnalytics = async (params) => {
    analyticsCalls.push(params);
    return {
      data: {
        executive_kpis: {
          avg_discipline: 78.5,
        },
      },
    };
  };

  component.fetchGeofenceEvidence = async (params) => {
    geofenceCalls.push(params);
    return {
      data: {
        status: "empty",
        raw_counts: {
          total_events: 0,
          enter_events: 0,
          exit_events: 0,
          unique_users: 0,
        },
      },
    };
  };

  component.fetchTodayLocations = async () => {
    todayLocationCalls.push(true);
    return {
      data: [],
    };
  };

  component.fetchFuzzyAhpAnalysis = async (params) => {
    fuzzyAhpCalls.push(params);
    return {
      data: {
        type: params.type,
        type_label: "Discipline",
        status: "ready",
        needs_data: false,
        consistency: {
          CR: 0.04,
          threshold: 0.1,
          is_consistent: true,
          summary_label: "Consistent",
        },
        criteria_weights: [
          {
            key: "attendance",
            label: "Attendance",
            display_label: "Attendance",
            value: 0.45,
          },
        ],
        ranking_preview: {
          items: [{ label: "Andi", score: 0.91 }],
        },
        distribution: { excellent: 1 },
      },
    };
  };

  console.log = () => {};

  try {
    await component.loadSummaryData();
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(reportCalls, [
    {
      period: "all",
      page: 2,
      limit: 10,
      search: "Rina",
      sortBy: "attendance_date",
      sortOrder: "desc",
    },
  ]);
  assert.deepEqual(analyticsCalls, [{ period: "current_month" }]);
  assert.deepEqual(geofenceCalls, [{ period: "current_month" }]);
  assert.equal(todayLocationCalls.length, 1);
  assert.deepEqual(fuzzyAhpCalls, [{ type: "discipline" }]);
});

test("dashboard loadSummaryData keeps report rows when analytics fails but today locations explicitly returns no rows", async () => {
  const component = dashboard();
  const notifications = [];
  const warnings = [];
  const originalLog = console.log;
  const originalWarn = console.warn;

  component.queueDashboardMapRender = () => {};
  component.showNotification = (message, type) => {
    notifications.push({ message, type });
  };
  component.fetchSummaryReport = async () => ({
    summary: {
      total_ontime: 2,
      total_late: 1,
      total_alpha: 0,
      total_wfo: 1,
      total_wfh: 1,
      total_wfa: 1,
    },
    report: {
      data: [
        {
          attendance_id: "att_002",
          full_name: "Andi Wijaya",
          role: "Employee",
          status: "late",
          information: "WFH",
          attendance_date: "2026-05-03",
          location_details: {},
        },
      ],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_records: 1,
        per_page: 5,
        has_prev_page: false,
        has_next_page: false,
      },
    },
  });
  component.fetchDashboardAnalytics = async () => {
    throw new Error("analytics request failed");
  };
  component.fetchTodayLocations = async () => ({
    data: [],
  });
  component.fetchFuzzyAhpAnalysis = async () => {
    throw new Error("fahp unavailable");
  };

  console.log = () => {};
  console.warn = (...args) => {
    warnings.push(args.join(" "));
  };

  try {
    await component.loadSummaryData();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  const hero = component.cockpit.hero;
  const averageDiscipline = component.cockpit.kpis.find(
    (panel) => panel.key === "averageDiscipline",
  );
  const historicalTrend = component.cockpit.middlePanels.find(
    (panel) => panel.key === "historicalTrend",
  );

  assert.equal(component.attendanceData.length, 1);
  assert.equal(component.attendanceData[0].attendance_id, "att_002");
  assert.equal(Object.prototype.hasOwnProperty.call(component.rawApiData, "analytics"), false);
  assert.equal(component.error, null);
  assert.equal(hero.state, DASHBOARD_PANEL_STATES.EMPTY);
  assert.equal(hero.data.source, "attendance.today-locations");
  assert.equal(hero.data.totalRows, 0);
  assert.match(
    hero.message,
    /today locations backend feed returned no attendance rows/i,
  );
  assert.ok(
    component.cockpit.kpis.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.ERROR,
    ),
  );
  assert.ok(
    component.cockpit.middlePanels.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.ERROR,
    ),
  );
  assert.equal(averageDiscipline.state, DASHBOARD_PANEL_STATES.ERROR);
  assert.match(averageDiscipline.message, /analytics request failed/i);
  assert.equal(historicalTrend.state, DASHBOARD_PANEL_STATES.ERROR);
  assert.match(historicalTrend.message, /analytics request failed/i);
  assert.equal(component.loading, false);
  assert.equal(component.isLoading, false);
  assert.deepEqual(notifications, []);
  assert.ok(
    warnings.some((message) =>
      message.includes("Dashboard analytics request failed"),
    ),
  );
});

test("dashboard export modal opens and closes without changing export data", () => {
  const component = dashboard();

  assert.equal(component.isExportModalOpen, false);

  component.openExportModal();

  assert.equal(component.isExportModalOpen, true);

  component.closeExportModal();

  assert.equal(component.isExportModalOpen, false);
});

test("dashboard exportSelected delegates PDF and Excel options to existing export paths", async () => {
  const component = dashboard();
  const selectedFormats = [];

  component.exportToPDF = async () => {
    selectedFormats.push("pdf");
    return true;
  };
  component.exportToExcel = async () => {
    selectedFormats.push("excel");
    return true;
  };

  component.openExportModal();
  await component.exportSelected("pdf");

  assert.deepEqual(selectedFormats, ["pdf"]);
  assert.equal(component.isExportModalOpen, false);

  component.openExportModal();
  await component.exportSelected("excel");

  assert.deepEqual(selectedFormats, ["pdf", "excel"]);
  assert.equal(component.isExportModalOpen, false);
});

test("dashboard exportSelected keeps modal open when export payload validation fails", async () => {
  const component = dashboard();

  component.loadValidatedExportData = async () => null;
  component.showNotification = () => {};

  component.openExportModal();
  await component.exportSelected("pdf");

  assert.equal(component.isExportModalOpen, true);
  assert.equal(component.isExporting, false);
});

test("dashboard openMapLocation delegates backend coordinates to the existing detail modal flow", () => {
  const component = dashboard();
  let detailPayload = null;

  component.viewLocation = (payload) => {
    detailPayload = payload;
  };

  component.openMapLocation({
    fullName: "Andi Wijaya",
    email: "andi@example.test",
    roleName: "Employee",
    phoneNumber: "081234567890",
    status: "ontime",
    information: "WFO",
    attendanceDate: "2026-05-03",
    timeIn: "08:00:00",
    timeOut: "17:00:00",
    source: "dashboard-analytics.map_context",
    sourceNote:
      "Map context is a backend analytics snapshot for dashboard context.",
    trackingNote:
      "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
    latitude: -0.9,
    longitude: 119.8,
    radius: 100,
    description: "Kantor Palu",
  });

  assert.deepEqual(detailPayload, {
    full_name: "Andi Wijaya",
    email: "andi@example.test",
    role_name: "Employee",
    phone_number: "081234567890",
    status: "ontime",
    information: "WFO",
    attendance_date: "2026-05-03",
    time_in: "08:00:00",
    time_out: "17:00:00",
    source: "dashboard-analytics.map_context",
    source_note:
      "Map context is a backend analytics snapshot for dashboard context.",
    tracking_note:
      "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
    latitude: -0.9,
    longitude: 119.8,
    radius: 100,
    location_description: "Kantor Palu",
    location: {
      latitude: -0.9,
      longitude: 119.8,
      radius: 100,
      description: "Kantor Palu",
    },
  });
});

test("dashboard createDashboardMapPopup shows provenance and uses the canonical detail action", () => {
  const component = dashboard();
  const originalDocument = globalThis.document;
  let selectedLocation = null;

  const createElement = (tagName) => ({
    tagName,
    className: "",
    textContent: "",
    type: "",
    children: [],
    listeners: {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    },
    click() {
      this.listeners.click?.();
    },
  });

  globalThis.document = { createElement };
  component.openMapLocation = (location) => {
    selectedLocation = location;
  };

  const location = {
    fullName: "Andi Wijaya",
    email: "andi@example.test",
    roleName: "Employee",
    status: "ontime",
    information: "WFO",
    attendanceDate: "2026-05-03",
    latitude: -0.9,
    longitude: 119.8,
    radius: 100,
    description: "Kantor Palu",
    sourceNote:
      "Map context is a backend analytics snapshot for dashboard context.",
    trackingNote:
      "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
  };

  try {
    const popup = component.createDashboardMapPopup(location);

    assert.equal(popup.children[0].textContent, "Andi Wijaya");
    assert.equal(popup.children[5].textContent, "Coordinates: -0.9, 119.8");
    assert.equal(
      popup.children[6].textContent,
      "Map context is a backend analytics snapshot for dashboard context.",
    );
    assert.equal(
      popup.children[7].textContent,
      "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
    );

    popup.children[8].click();
    assert.equal(selectedLocation, location);
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  }
});

test("dashboard renderDashboardMap draws radius circles only for positive finite values", async () => {
  const component = dashboard();
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const markerCoordinates = [];
  const circleLayers = [];
  const popupNodes = [];
  let fitBoundsCalls = 0;
  let invalidateSizeCalls = 0;

  const createElement = (tagName) => ({
    tagName,
    className: "",
    textContent: "",
    type: "",
    children: [],
    listeners: {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    },
  });

  const mapContainer = { id: "dashboardMapView", isConnected: true };
  const fakeMap = {
    remove() {},
    stop() {},
    off() {},
    getContainer() {
      return mapContainer;
    },
    fitBounds() {
      fitBoundsCalls += 1;
    },
    setView() {},
    invalidateSize() {
      invalidateSizeCalls += 1;
    },
  };

  component.cockpit.hero = {
    state: DASHBOARD_PANEL_STATES.READY,
    data: {
      locations: [
        {
          fullName: "Radius Ready",
          email: "ready@example.test",
          roleName: "Employee",
          status: "ontime",
          information: "WFO",
          attendanceDate: "2026-05-03",
          latitude: -0.9,
          longitude: 119.8,
          radius: 100,
          description: "Ready point",
          sourceNote:
            "Map context is a backend analytics snapshot for dashboard context.",
          trackingNote:
            "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
        },
        {
          fullName: "Zero Radius",
          email: "zero@example.test",
          roleName: "Employee",
          status: "ontime",
          information: "WFH",
          attendanceDate: "2026-05-03",
          latitude: -0.91,
          longitude: 119.81,
          radius: 0,
          description: "Zero radius point",
          sourceNote:
            "Map context is a backend analytics snapshot for dashboard context.",
          trackingNote:
            "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
        },
        {
          fullName: "Missing Radius",
          email: "missing@example.test",
          roleName: "Employee",
          status: "late",
          information: "WFA",
          attendanceDate: "2026-05-03",
          latitude: -0.92,
          longitude: 119.82,
          radius: null,
          description: "Missing radius point",
          sourceNote:
            "Map context is a backend analytics snapshot for dashboard context.",
          trackingNote:
            "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
        },
      ],
    },
  };

  component.getDashboardLeaflet = async () => ({
    map() {
      return fakeMap;
    },
    divIcon(options) {
      return options;
    },
    tileLayer() {
      return {
        addTo() {
          return this;
        },
      };
    },
    layerGroup() {
      return {
        addTo() {
          return this;
        },
        clearLayers() {
          return this;
        },
      };
    },
    marker(coordinates) {
      markerCoordinates.push(coordinates);
      return {
        addTo() {
          return this;
        },
        bindPopup(popup) {
          popupNodes.push(popup);
          return this;
        },
      };
    },
    circle(coordinates, options) {
      circleLayers.push({ coordinates, options });
      return {
        addTo() {
          return this;
        },
      };
    },
    featureGroup() {
      return {
        getBounds() {
          return { north: -0.9, south: -0.92, east: 119.82, west: 119.8 };
        },
      };
    },
  });

  globalThis.document = {
    getElementById(id) {
      return id === "dashboardMapView" ? mapContainer : null;
    },
    createElement,
  };
  globalThis.window = {
    setTimeout(callback) {
      callback();
      return 0;
    },
  };

  try {
    await component.renderDashboardMap();
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }

    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }

  assert.equal(markerCoordinates.length, 3);
  assert.equal(circleLayers.length, 1);
  assert.equal(circleLayers[0].options.radius, 100);
  assert.equal(popupNodes.length, 3);
  assert.equal(fitBoundsCalls, 1);
  assert.equal(invalidateSizeCalls, 1);
});

test("dashboard renderDashboardMap reuses the existing Leaflet map instead of destroying it during refresh", async () => {
  const component = dashboard();
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const mapContainer = { id: "dashboardMapView", isConnected: true };
  const markerCoordinates = [];
  let mapCreateCalls = 0;
  let mapRemoveCalls = 0;
  let clearLayersCalls = 0;

  const createElement = (tagName) => ({
    tagName,
    className: "",
    textContent: "",
    type: "",
    children: [],
    listeners: {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    },
  });

  const fakeMap = {
    stop() {},
    off() {},
    remove() {
      mapRemoveCalls += 1;
    },
    getContainer() {
      return mapContainer;
    },
    fitBounds() {},
    setView() {},
    invalidateSize() {},
  };

  component.dashboardMapRenderToken = 1;
  component.cockpit.hero = {
    state: DASHBOARD_PANEL_STATES.READY,
    data: {
      locations: [
        {
          fullName: "Persistent Marker",
          userName: "Persistent Marker",
          status: "ontime",
          mode: "WFO",
          attendanceDate: "2026-05-03",
          latitude: -0.9,
          longitude: 119.8,
          radius: 100,
          description: "Persistent point",
          sourceNote:
            "Map context is a backend analytics snapshot for dashboard context.",
          trackingNote:
            "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
        },
      ],
    },
  };

  component.getDashboardLeaflet = async () => ({
    map() {
      mapCreateCalls += 1;
      return fakeMap;
    },
    divIcon(options) {
      return options;
    },
    tileLayer() {
      return {
        addTo() {
          return this;
        },
      };
    },
    layerGroup() {
      return {
        addTo() {
          return this;
        },
        clearLayers() {
          clearLayersCalls += 1;
          return this;
        },
      };
    },
    marker(coordinates) {
      markerCoordinates.push(coordinates);
      return {
        addTo() {
          return this;
        },
        bindPopup() {
          return this;
        },
      };
    },
    circle() {
      return {
        addTo() {
          return this;
        },
      };
    },
    featureGroup() {
      return {
        getBounds() {
          return { north: -0.9, south: -0.9, east: 119.8, west: 119.8 };
        },
      };
    },
  });

  globalThis.document = {
    getElementById(id) {
      return id === "dashboardMapView" ? mapContainer : null;
    },
    createElement,
  };
  globalThis.window = {
    setTimeout(callback) {
      callback();
      return 0;
    },
  };

  try {
    await component.renderDashboardMap(1);
    await component.renderDashboardMap(1);
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }

    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }

  assert.equal(mapCreateCalls, 1);
  assert.equal(mapRemoveCalls, 0);
  assert.equal(markerCoordinates.length, 2);
  assert.ok(clearLayersCalls >= 4);
});

test("dashboard renderDashboardMap disables animated zoom transitions during refresh", async () => {
  const component = dashboard();
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const mapContainer = { id: "dashboardMapView", isConnected: true };
  const mapOptions = [];
  const fitBoundsOptions = [];
  const setViewOptions = [];

  const createElement = (tagName) => ({
    tagName,
    className: "",
    textContent: "",
    type: "",
    children: [],
    listeners: {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    },
  });

  const fakeMap = {
    stop() {},
    off() {},
    remove() {},
    getContainer() {
      return mapContainer;
    },
    fitBounds(_bounds, options) {
      fitBoundsOptions.push(options);
    },
    setView(_coords, _zoom, options) {
      setViewOptions.push(options);
    },
    invalidateSize() {},
  };

  component.dashboardMapRenderToken = 1;
  component.cockpit.hero = {
    state: DASHBOARD_PANEL_STATES.READY,
    data: {
      locations: [
        {
          fullName: "Animated A",
          userName: "Animated A",
          status: "ontime",
          mode: "WFO",
          attendanceDate: "2026-05-03",
          latitude: -0.9,
          longitude: 119.8,
          radius: 100,
          description: "Animated point A",
          sourceNote:
            "Map context is a backend analytics snapshot for dashboard context.",
          trackingNote:
            "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
        },
        {
          fullName: "Animated B",
          userName: "Animated B",
          status: "late",
          mode: "WFH",
          attendanceDate: "2026-05-03",
          latitude: -0.91,
          longitude: 119.81,
          radius: 0,
          description: "Animated point B",
          sourceNote:
            "Map context is a backend analytics snapshot for dashboard context.",
          trackingNote:
            "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
        },
      ],
    },
  };

  component.getDashboardLeaflet = async () => ({
    map(_container, options) {
      mapOptions.push(options);
      return fakeMap;
    },
    divIcon(options) {
      return options;
    },
    tileLayer() {
      return {
        addTo() {
          return this;
        },
      };
    },
    layerGroup() {
      return {
        addTo() {
          return this;
        },
        clearLayers() {
          return this;
        },
      };
    },
    marker() {
      return {
        addTo() {
          return this;
        },
        bindPopup() {
          return this;
        },
      };
    },
    circle() {
      return {
        addTo() {
          return this;
        },
      };
    },
    featureGroup() {
      return {
        getBounds() {
          return { north: -0.9, south: -0.91, east: 119.81, west: 119.8 };
        },
      };
    },
  });

  globalThis.document = {
    getElementById(id) {
      return id === "dashboardMapView" ? mapContainer : null;
    },
    createElement,
  };
  globalThis.window = {
    setTimeout(callback) {
      callback();
      return 0;
    },
  };

  try {
    await component.renderDashboardMap(1);

    component.cockpit.hero.data.locations = [
      {
        fullName: "Single Marker",
        userName: "Single Marker",
        status: "ontime",
        mode: "WFA",
        attendanceDate: "2026-05-03",
        latitude: -0.92,
        longitude: 119.82,
        radius: 50,
        description: "Single point",
        sourceNote:
          "Map context is a backend analytics snapshot for dashboard context.",
        trackingNote:
          "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
      },
    ];

    await component.renderDashboardMap(1);
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }

    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }

  assert.equal(mapOptions.length, 1);
  assert.equal(mapOptions[0].zoomAnimation, false);
  assert.deepEqual(fitBoundsOptions, [
    {
      padding: [32, 32],
      animate: false,
    },
  ]);
  assert.deepEqual(setViewOptions, [
    {
      animate: false,
    },
  ]);
});

test("dashboard renderDashboardMap ignores stale async renders after a newer token wins", async () => {
  const component = dashboard();
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const mapContainer = { id: "dashboardMapView", isConnected: true };
  const markerCoordinates = [];
  let mapCreateCalls = 0;
  let resolveFirstLeaflet;

  const firstLeafletPromise = new Promise((resolve) => {
    resolveFirstLeaflet = resolve;
  });

  const createElement = (tagName) => ({
    tagName,
    className: "",
    textContent: "",
    type: "",
    children: [],
    listeners: {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    },
  });

  const fakeMap = {
    stop() {},
    off() {},
    remove() {},
    getContainer() {
      return mapContainer;
    },
    fitBounds() {},
    setView() {},
    invalidateSize() {},
  };

  const fakeLeaflet = {
    map() {
      mapCreateCalls += 1;
      return fakeMap;
    },
    divIcon(options) {
      return options;
    },
    tileLayer() {
      return {
        addTo() {
          return this;
        },
      };
    },
    layerGroup() {
      return {
        addTo() {
          return this;
        },
        clearLayers() {
          return this;
        },
      };
    },
    marker(coordinates) {
      markerCoordinates.push(coordinates);
      return {
        addTo() {
          return this;
        },
        bindPopup() {
          return this;
        },
      };
    },
    circle() {
      return {
        addTo() {
          return this;
        },
      };
    },
    featureGroup() {
      return {
        getBounds() {
          return { north: -0.9, south: -0.9, east: 119.8, west: 119.8 };
        },
      };
    },
  };

  let getLeafletCalls = 0;
  component.getDashboardLeaflet = async () => {
    getLeafletCalls += 1;

    if (getLeafletCalls === 1) {
      return firstLeafletPromise;
    }

    return fakeLeaflet;
  };

  component.cockpit.hero = {
    state: DASHBOARD_PANEL_STATES.READY,
    data: {
      locations: [
        {
          fullName: "Newest Marker",
          userName: "Newest Marker",
          status: "ontime",
          mode: "WFO",
          attendanceDate: "2026-05-03",
          latitude: -0.9,
          longitude: 119.8,
          radius: 100,
          description: "Latest point",
          sourceNote:
            "Map context is a backend analytics snapshot for dashboard context.",
          trackingNote:
            "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
        },
      ],
    },
  };

  globalThis.document = {
    getElementById(id) {
      return id === "dashboardMapView" ? mapContainer : null;
    },
    createElement,
  };
  globalThis.window = {
    setTimeout(callback) {
      callback();
      return 0;
    },
  };

  try {
    component.dashboardMapRenderToken = 1;
    const staleRender = component.renderDashboardMap(1);

    component.dashboardMapRenderToken = 2;
    const winningRender = component.renderDashboardMap(2);
    await winningRender;

    resolveFirstLeaflet(fakeLeaflet);
    await staleRender;
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }

    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }

  assert.equal(mapCreateCalls, 1);
  assert.equal(markerCoordinates.length, 1);
  assert.deepEqual(markerCoordinates, [[-0.9, 119.8]]);
});

test("dashboard viewLocation preserves zero coordinates and unavailable radius in the map detail payload", () => {
  const component = dashboard();
  const detailPayloads = [];
  const originalWindow = globalThis.window;

  globalThis.window = {
    openMapDetailModal: (payload) => {
      detailPayloads.push(payload);
    },
  };

  try {
    component.viewLocation({
      full_name: "Zero Coordinate User",
      role_name: "Employee",
      phone_number: "081234567890",
      location: {
        latitude: 0,
        longitude: 0,
        radius: null,
        description: null,
      },
      latitude: 0,
      longitude: 0,
      radius: null,
      location_description: null,
    });
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }

  assert.deepEqual(detailPayloads, [
    {
      fullName: "Zero Coordinate User",
      email: "Unavailable",
      position: "Employee",
      phoneNumber: "081234567890",
      status: "Unavailable",
      attendanceDate: "Unavailable",
      workMode: "Unavailable",
      latitude: 0,
      longitude: 0,
      radius: null,
      description: null,
      sourceNote: "Unavailable",
      trackingNote: null,
    },
  ]);
});

test("dashboard applySummaryResponse preserves missing summary fields instead of zero-filling them", () => {
  const component = dashboard();
  const response = {
    summary: {
      total_ontime: 2,
      total_late: 1,
    },
    report: {
      data: [],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_records: 0,
        per_page: 5,
        has_prev_page: false,
        has_next_page: false,
      },
    },
  };

  component.applySummaryResponse(response);

  assert.deepEqual(component.summaryData, {
    summary: {
      onTime: 2,
      late: 1,
      alpha: undefined,
      wfo: undefined,
      wfh: undefined,
      wfa: undefined,
    },
    report: response.report.data,
  });
});

test("dashboard applySummaryError keeps page-level and table-level error state aligned", () => {
  const component = dashboard();

  component.applySummaryError(new Error("summary request failed"));

  assert.equal(component.error, "summary request failed");
  assert.equal(component.errorMessage, "summary request failed");
  assert.equal(component.summaryData, null);
  assert.equal(component.reportData.length, 0);
  assert.ok(
    component.cockpit.kpis.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.ERROR,
    ),
  );
  assert.equal(component.cockpit.hero.state, DASHBOARD_PANEL_STATES.ERROR);
  assert.ok(
    component.cockpit.middlePanels.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.ERROR,
    ),
  );
});

test("dashboard empty response keeps the cockpit shell visible while clearing rows", () => {
  const component = dashboard();
  let mapRenderQueued = 0;

  component.queueDashboardMapRender = () => {
    mapRenderQueued += 1;
  };

  component.handleEmptyApiResponse();

  const modeMix = component.cockpit.middlePanels.find(
    (panel) => panel.key === "modeMix",
  );

  assert.equal(component.summaryData, null);
  assert.equal(component.rawApiData, null);
  assert.equal(component.attendanceData.length, 0);
  assert.equal(component.reportData.length, 0);
  assert.equal(
    component.cockpit.hero.state,
    DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
  );
  assert.equal(modeMix.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.equal(mapRenderQueued, 1);
  assert.deepEqual(component.pagination, {
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    has_prev_page: false,
    has_next_page: false,
    per_page: 5,
  });
});

test("dashboard rejects export data when backend total records exceed fetched rows", () => {
  const component = dashboard();

  assert.throws(
    () =>
      component.ensureExportDatasetComplete({
        report: {
          data: Array.from({ length: 10000 }, (_, index) => ({
            attendance_id: `att_${index}`,
          })),
          pagination: {
            total_records: 12000,
          },
        },
      }),
    /export data is incomplete/i,
  );
});

test("dashboard accepts export data when fetched rows match backend total records", () => {
  const component = dashboard();

  assert.doesNotThrow(() =>
    component.ensureExportDatasetComplete({
      report: {
        data: [{ attendance_id: "att_001" }, { attendance_id: "att_002" }],
        pagination: {
          total_records: 2,
        },
      },
    }),
  );
});

test("dashboard accepts export data when report rows are provided directly", () => {
  const component = dashboard();

  assert.doesNotThrow(() =>
    component.ensureExportDatasetComplete({
      report: [{ attendance_id: "att_001" }, { attendance_id: "att_002" }],
      pagination: {
        total_records: 2,
      },
    }),
  );
});

test("dashboard rejects direct report rows when completeness metadata is missing", () => {
  const component = dashboard();

  assert.throws(
    () =>
      component.ensureExportDatasetComplete({
        report: [{ attendance_id: "att_001" }],
      }),
    /completeness could not be verified/i,
  );
});

test("dashboard rejects export data when backend total records arrive as numeric strings", () => {
  const component = dashboard();

  assert.throws(
    () =>
      component.ensureExportDatasetComplete({
        report: {
          data: Array.from({ length: 10000 }, (_, index) => ({
            attendance_id: `att_${index}`,
          })),
          pagination: {
            total_records: "12000",
          },
        },
      }),
    /export data is incomplete/i,
  );
});

test("dashboard rejects export data when backend uses total_items pagination alias", () => {
  const component = dashboard();

  assert.throws(
    () =>
      component.ensureExportDatasetComplete({
        report: {
          data: Array.from({ length: 10000 }, (_, index) => ({
            attendance_id: `att_${index}`,
          })),
          pagination: {
            total_items: 12000,
          },
        },
      }),
    /export data is incomplete/i,
  );
});

test("dashboard rejects export data when backend total metadata is missing", () => {
  const component = dashboard();

  assert.throws(
    () =>
      component.ensureExportDatasetComplete({
        report: {
          data: [{ attendance_id: "att_001" }],
          pagination: {},
        },
      }),
    /completeness could not be verified/i,
  );
});

test("dashboard rejects export data when backend total metadata is non-numeric", () => {
  const component = dashboard();

  assert.throws(
    () =>
      component.ensureExportDatasetComplete({
        report: {
          data: [{ attendance_id: "att_001" }],
          pagination: {
            total_records: "unknown",
          },
        },
      }),
    /completeness could not be verified/i,
  );
});

test("dashboard rejects export data when backend total metadata is empty or invalid", () => {
  const component = dashboard();
  const invalidTotals = [null, "", "   ", Infinity, -1, 1.5];

  invalidTotals.forEach((total_records) => {
    assert.throws(
      () =>
        component.ensureExportDatasetComplete({
          report: {
            data: [{ attendance_id: "att_001" }],
            pagination: { total_records },
          },
        }),
      /completeness could not be verified/i,
    );
  });
});

test("dashboard rejects export data when backend total records are lower than fetched rows", () => {
  const component = dashboard();

  assert.throws(
    () =>
      component.ensureExportDatasetComplete({
        report: {
          data: [{ attendance_id: "att_001" }, { attendance_id: "att_002" }],
          pagination: {
            total_records: 1,
          },
        },
      }),
    /export data is incomplete or inconsistent/i,
  );
});

test("dashboard downloadPDF surfaces specific export failure reasons to the user", async () => {
  const component = dashboard();
  const notifications = [];

  component.loadExportData = async () => {
    throw new Error("Export data is incomplete for the selected period.");
  };
  component.showNotification = (message, type) => {
    notifications.push({ message, type });
  };

  await component.downloadPDF();

  assert.deepEqual(notifications, [
    {
      message: "Export data is incomplete for the selected period.",
      type: "error",
    },
  ]);
});

test("dashboard downloadExcel surfaces specific export failure reasons to the user", async () => {
  const component = dashboard();
  const notifications = [];

  component.loadExportData = async () => {
    throw new Error("Export data is incomplete for the selected period.");
  };
  component.showNotification = (message, type) => {
    notifications.push({ message, type });
  };

  await component.downloadExcel();

  assert.deepEqual(notifications, [
    {
      message: "Export data is incomplete for the selected period.",
      type: "error",
    },
  ]);
});
