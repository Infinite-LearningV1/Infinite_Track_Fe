const DASHBOARD_PANEL_STATES = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  EMPTY: "empty",
  NEEDS_DATA: "needsData",
  BACKEND_REQUIRED: "backendRequired",
  ERROR: "error",
});

function createManagementKpiDefinition({
  key,
  title,
  tone,
  icon,
  valueFormat,
  unit,
  priority,
  comparisonText = "vs periode sebelumnya",
  trendLabel = null,
  trendTone = null,
  trendDirection = "up",
  displayUnit = null,
}) {
  return {
    key,
    title,
    meta: {
      tone,
      icon,
      valueFormat,
      unit,
      priority,
      comparisonText,
      trendLabel,
      trendTone,
      trendDirection,
      displayUnit,
    },
  };
}

const KPI_DEFINITIONS = [
  createManagementKpiDefinition({
    key: "attendanceRate",
    title: "Attendance Rate",
    tone: "neutral",
    icon: "calendar-check",
    valueFormat: "percent",
    unit: "%",
    priority: 1,
    trendLabel: "4.6%",
    trendTone: "positive",
    trendDirection: "up",
  }),
  createManagementKpiDefinition({
    key: "lateAlphaRisk",
    title: "Late / Alpha Risk",
    tone: "warning",
    icon: "alert-triangle",
    valueFormat: "count",
    unit: "records",
    priority: 2,
    trendLabel: "2",
    trendTone: "positive",
    trendDirection: "down",
    displayUnit: "Users",
  }),
  createManagementKpiDefinition({
    key: "averageDiscipline",
    title: "Avg Discipline",
    tone: "info",
    icon: "activity",
    valueFormat: "score",
    unit: "index",
    priority: 3,
    trendLabel: "3.1",
    trendTone: "positive",
    trendDirection: "up",
  }),
  createManagementKpiDefinition({
    key: "needsAttention",
    title: "Needs Attention",
    tone: "critical",
    icon: "user-check",
    valueFormat: "count",
    unit: "people",
    priority: 4,
    trendLabel: "3",
    trendTone: "negative",
    trendDirection: "up",
    displayUnit: "Users",
  }),
];

import { buildHistoricalAnalyticsViewModel } from "./dashboard/historicalAnalyticsSlice.js";
import { buildGeofenceEvidenceViewModel } from "./dashboard/geofenceEvidenceSlice.js";
import { buildLiveMapViewModel } from "./dashboard/liveMapSlice.js";

const MAP_VIEW_SOURCE_KEY = "dashboard-analytics.map_context";
const MAP_VIEW_SOURCE_NOTE =
  "Map context is a backend analytics snapshot for dashboard context.";
const MAP_VIEW_TRACKING_NOTE =
  "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.";
const MAP_CONTEXT_STATUSES = Object.freeze({
  READY: "ready",
  PARTIAL_DATA: "partial_data",
  NO_DATA: "no_data",
});

const HERO_PANEL_DEFINITION = {
  key: "mapContext",
  title: "Map View",
  subtitle: "Dashboard analytics map snapshot context",
};

const TODAY_LOCATIONS_SOURCE_KEY = "attendance.today-locations";
const TODAY_LOCATIONS_SOURCE_NOTE =
  "Today locations are explicit backend attendance rows for the current live-map scope.";
const TODAY_LOCATIONS_TRACKING_NOTE =
  "Markers reflect explicit today-locations rows only; they are not dashboard analytics snapshots or filtered report/export history.";

const LIVE_MAP_PANEL_DEFINITION = {
  key: "mapContext",
  title: "Today Locations / Live Map",
  subtitle:
    "Explicit today-locations backend feed for current attendance context",
};

const ATTENDANCE_MODE_COLORS = Object.freeze({
  WFO: "#2563eb",
  WFH: "#16a34a",
  WFA: "#f59e0b",
});

const PREVIEW_TODAY_LOCATION_ROWS = Object.freeze([
  {
    attendance_id: "preview-wfo-001",
    user_id: "EMP-001",
    full_name: "Andi Pratama",
    email: "andi.pratama@example.test",
    role_name: "Field Officer",
    mode: "WFO",
    status: "Checked In",
    attendance_date: "2026-06-30",
    time_in: "08:01",
    time_out: "17:02",
    latitude: -0.8954,
    longitude: 119.8591,
    description: "Preview WFO marker near Palu office zone.",
  },
  {
    attendance_id: "preview-wfo-002",
    user_id: "EMP-002",
    full_name: "Budi Santoso",
    email: "budi.santoso@example.test",
    role_name: "Operations Staff",
    mode: "WFO",
    status: "Checked In",
    attendance_date: "2026-06-30",
    time_in: "08:04",
    time_out: "17:05",
    latitude: -0.8991,
    longitude: 119.8672,
    description: "Preview WFO marker near central operations area.",
  },
  {
    attendance_id: "preview-wfo-003",
    user_id: "EMP-003",
    full_name: "Citra Lestari",
    email: "citra.lestari@example.test",
    role_name: "Admin Staff",
    mode: "WFO",
    status: "Checked In",
    attendance_date: "2026-06-30",
    time_in: "07:58",
    time_out: "17:01",
    latitude: -0.8898,
    longitude: 119.8527,
    description: "Preview WFO marker near attendance hub.",
  },
  {
    attendance_id: "preview-wfo-004",
    user_id: "EMP-004",
    full_name: "Dimas Putra",
    email: "dimas.putra@example.test",
    role_name: "Supervisor",
    mode: "WFO",
    status: "Checked In",
    attendance_date: "2026-06-30",
    time_in: "08:10",
    time_out: "17:15",
    latitude: -0.9052,
    longitude: 119.8546,
    description: "Preview WFO marker near office perimeter.",
  },
  {
    attendance_id: "preview-wfo-005",
    user_id: "EMP-005",
    full_name: "Eka Wulandari",
    email: "eka.wulandari@example.test",
    role_name: "Finance Staff",
    mode: "WFO",
    status: "Checked In",
    attendance_date: "2026-06-30",
    time_in: "08:03",
    time_out: "17:00",
    latitude: -0.8932,
    longitude: 119.8735,
    description: "Preview WFO marker near finance office zone.",
  },
  {
    attendance_id: "preview-wfh-001",
    user_id: "EMP-006",
    full_name: "Fajar Ramadhan",
    email: "fajar.ramadhan@example.test",
    role_name: "Remote Analyst",
    mode: "WFH",
    status: "Checked In",
    attendance_date: "2026-06-30",
    time_in: "08:20",
    time_out: "16:55",
    latitude: -0.8825,
    longitude: 119.8614,
    description: "Preview WFH marker from approved home location.",
  },
  {
    attendance_id: "preview-wfa-001",
    user_id: "EMP-007",
    full_name: "Gita Maharani",
    email: "gita.maharani@example.test",
    role_name: "Field Coordinator",
    mode: "WFA",
    status: "Checked In",
    attendance_date: "2026-06-30",
    time_in: "08:12",
    time_out: "17:08",
    latitude: -0.9111,
    longitude: 119.8668,
    description: "Preview WFA marker near client visit area.",
  },
  {
    attendance_id: "preview-wfa-002",
    user_id: "EMP-008",
    full_name: "Hendra Wijaya",
    email: "hendra.wijaya@example.test",
    role_name: "Surveyor",
    mode: "WFA",
    status: "Checked In",
    attendance_date: "2026-06-30",
    time_in: "08:30",
    time_out: "17:20",
    latitude: -0.8871,
    longitude: 119.8788,
    description: "Preview WFA marker from field survey point.",
  },
  {
    attendance_id: "preview-wfa-003",
    user_id: "EMP-009",
    full_name: "Intan Safitri",
    email: "intan.safitri@example.test",
    role_name: "Community Liaison",
    mode: "WFA",
    status: "Checked In",
    attendance_date: "2026-06-30",
    time_in: "08:18",
    time_out: "17:12",
    latitude: -0.9184,
    longitude: 119.8489,
    description: "Preview WFA marker near external meeting point.",
  },
  {
    attendance_id: "preview-wfa-004",
    user_id: "EMP-010",
    full_name: "Joko Nugroho",
    email: "joko.nugroho@example.test",
    role_name: "Technician",
    mode: "WFA",
    status: "Checked In",
    attendance_date: "2026-06-30",
    time_in: "08:25",
    time_out: "17:10",
    latitude: -0.9017,
    longitude: 119.8421,
    description: "Preview WFA marker near maintenance checkpoint.",
  },
]);

const FUZZY_AHP_SOURCE_KEY = "analysis.fuzzy-ahp";
const FUZZY_AHP_PREVIEW_SOURCE_KEY = "analysis.fuzzy-ahp.preview";
const GEOFENCE_EVIDENCE_PREVIEW_SOURCE_KEY = "analysis.geofence-evidence.preview";
const PREVIEW_GEOFENCE_EVIDENCE = Object.freeze({
  status: "ready",
  rawCounts: {
    enter_events: 24,
    exit_events: 21,
    total_events: 45,
    unique_users: 12,
  },
  isPreview: true,
  source: GEOFENCE_EVIDENCE_PREVIEW_SOURCE_KEY,
  finalAttendanceAuthority: "backend attendance records",
});
const PREVIEW_FUZZY_AHP_DECISIONS = Object.freeze([
  {
    key: "discipline",
    title: "Discipline",
    summary:
      "Preview-only discipline decision set for cockpit layout validation while the backend Fuzzy AHP feed is unavailable.",
    consistencyRatio: 0.058,
    consistencyThreshold: 0.1,
    consistencyStatus: "Konsisten",
    isConsistent: true,
    updatedAtLabel: "Perhitungan Fuzzy AHP diperbarui per 18 Mei 2025",
    criteriaWeights: [
      { label: "Kehadiran", weight: 0.352 },
      { label: "Ketepatan Waktu", weight: 0.248 },
      { label: "Kepatuhan Aturan", weight: 0.198 },
      { label: "Produktivitas", weight: 0.128 },
      { label: "Kerja Sama", weight: 0.074 },
    ],
    rankings: [
      { label: "Rizky Ananda", score: 0.842 },
      { label: "Dewi Lestari", score: 0.781 },
      { label: "Budi Santoso", score: 0.763 },
      { label: "Siti Nurhaliza", score: 0.719 },
      { label: "Agus Setiawan", score: 0.688 },
    ],
  },
  {
    key: "wfa",
    title: "WFA",
    summary:
      "Preview-only WFA decision set that keeps criteria, weights, and ranking visible without becoming reporting truth.",
    consistencyRatio: 0.064,
    consistencyThreshold: 0.1,
    consistencyStatus: "Konsisten",
    isConsistent: true,
    updatedAtLabel: "Perhitungan Fuzzy AHP diperbarui per 18 Mei 2025",
    criteriaWeights: [
      { label: "Kesiapan Lokasi", weight: 0.334 },
      { label: "Riwayat Presensi", weight: 0.261 },
      { label: "Kebutuhan Peran", weight: 0.207 },
      { label: "Bukti Geofence", weight: 0.124 },
      { label: "Kapasitas Tim", weight: 0.074 },
    ],
    rankings: [
      { label: "Dewi Lestari", score: 0.814 },
      { label: "Rizky Ananda", score: 0.798 },
      { label: "Siti Nurhaliza", score: 0.742 },
      { label: "Budi Santoso", score: 0.701 },
      { label: "Agus Setiawan", score: 0.673 },
    ],
  },
  {
    key: "smart-ac",
    title: "Smart AC",
    summary:
      "Preview-only Smart AC decision set for cockpit UI validation while backend scoring remains unwired.",
    consistencyRatio: 0.071,
    consistencyThreshold: 0.1,
    consistencyStatus: "Konsisten",
    isConsistent: true,
    updatedAtLabel: "Perhitungan Fuzzy AHP diperbarui per 18 Mei 2025",
    criteriaWeights: [
      { label: "Jam Operasional", weight: 0.318 },
      { label: "Kepadatan Ruangan", weight: 0.272 },
      { label: "Konsumsi Energi", weight: 0.203 },
      { label: "Pola Kehadiran", weight: 0.129 },
      { label: "Kenyamanan", weight: 0.078 },
    ],
    rankings: [
      { label: "Ruang Operasi", score: 0.821 },
      { label: "Ruang Admin", score: 0.779 },
      { label: "Ruang Rapat", score: 0.744 },
      { label: "Ruang Arsip", score: 0.706 },
      { label: "Lobby", score: 0.682 },
    ],
  },
]);

const MIDDLE_PANEL_DEFINITIONS = [
  {
    key: "historicalTrend",
    title: "Historical Attendance Trend",
    subtitle: "",
  },
  {
    key: "modeMix",
    title: "Attendance Mode",
    subtitle: "WFO / WFH / WFA count + percentage",
  },
];

const BOTTOM_PANEL_DEFINITIONS = [
  {
    key: "fuzzyAhp",
    title: "Fuzzy AHP Decision Center",
    subtitle: "Decision support output once backend feed is wired",
  },
  {
    key: "geofenceEvidence",
    title: "Geofence Evidence Context",
    subtitle: "ENTER / EXIT + attendance evidence",
  },
];

const DASHBOARD_SECTION_DEFINITIONS = Object.freeze({
  historicalOverview: {
    key: "historicalOverview",
    title: "Historical Overview",
  },
  geofenceEvidence: {
    key: "geofenceEvidence",
    title: "Geofence Evidence",
  },
  fahpRecap: {
    key: "fahpRecap",
    title: "FAHP Analysis Recap",
  },
  liveOperationsMap: {
    key: "liveOperationsMap",
    title: "Live Operations Map",
  },
});

const HISTORICAL_TREND_CHART = Object.freeze({
  baselineY: 185,
  leftX: 24,
  min: 0,
  rightX: 948,
  topY: 20,
});

const HISTORICAL_TREND_MONTH_LABELS = Object.freeze([
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]);

const HISTORICAL_TREND_RANGE_DEFINITIONS = Object.freeze([
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "annually", label: "Annually" },
]);

const HISTORICAL_TREND_SERIES_DEFINITIONS = Object.freeze([
  {
    key: "ontime",
    label: "On Time",
    color: "#465fff",
    gradientId: "historicalTrendOntimeGradient",
    metricTone: "positive",
  },
  {
    key: "late",
    label: "Late",
    color: "#f59e0b",
    gradientId: "historicalTrendLateGradient",
    metricTone: "warning",
  },
  {
    key: "alpha",
    label: "Alpha",
    color: "#ef4444",
    gradientId: "historicalTrendAlphaGradient",
    metricTone: "critical",
  },
]);

const HISTORICAL_TREND_PREVIEW_RANGES = HISTORICAL_TREND_RANGE_DEFINITIONS.map(
  (range) =>
    createHistoricalTrendRange({
      ...range,
      seriesLabels: {
        ontime: "Present",
      },
      yAxisLabels: ["100", "75", "50", "25", "0"],
      seriesValues: {
        monthly: {
          ontime: [
            { label: "1 Mei", value: 72 },
            { label: "8 Mei", value: 86 },
            { label: "15 Mei", value: 82 },
            { label: "22 Mei", value: 83 },
            { label: "29 Mei", value: 87, displayValue: "92.4%" },
          ],
          late: [
            { label: "1 Mei", value: 33 },
            { label: "8 Mei", value: 29 },
            { label: "15 Mei", value: 23 },
            { label: "22 Mei", value: 31 },
            { label: "29 Mei", value: 26, displayValue: "6.1%" },
          ],
          alpha: [
            { label: "1 Mei", value: 7.1 },
            { label: "8 Mei", value: 8.2 },
            { label: "15 Mei", value: 6.3 },
            { label: "22 Mei", value: 7.2 },
            { label: "29 Mei", value: 8, displayValue: "2.5%" },
          ],
        },
        quarterly: {
          ontime: [
            { label: "Q1", value: 78 },
            { label: "Q2", value: 82 },
            { label: "Q3", value: 80 },
            { label: "Q4", value: 88 },
          ],
          late: [
            { label: "Q1", value: 29 },
            { label: "Q2", value: 25 },
            { label: "Q3", value: 31 },
            { label: "Q4", value: 27 },
          ],
          alpha: [
            { label: "Q1", value: 8 },
            { label: "Q2", value: 7 },
            { label: "Q3", value: 9 },
            { label: "Q4", value: 6 },
          ],
        },
        annually: {
          ontime: [
            { label: "2019", value: 68 },
            { label: "2020", value: 73 },
            { label: "2021", value: 77 },
            { label: "2022", value: 81 },
            { label: "2023", value: 86 },
            { label: "2024", value: 90 },
          ],
          late: [
            { label: "2019", value: 34 },
            { label: "2020", value: 31 },
            { label: "2021", value: 28 },
            { label: "2022", value: 24 },
            { label: "2023", value: 21 },
            { label: "2024", value: 18 },
          ],
          alpha: [
            { label: "2019", value: 12 },
            { label: "2020", value: 10 },
            { label: "2021", value: 8 },
            { label: "2022", value: 6 },
            { label: "2023", value: 4 },
            { label: "2024", value: 2 },
          ],
        },
      }[range.key],
    }),
);

const MODE_MIX_COLORS = {
  wfo: "#2563eb",
  wfh: "#16a34a",
  wfa: "#f59e0b",
};

function getStateLabel(state) {
  return (
    {
      loading: "Loading",
      ready: "Ready",
      empty: "Empty",
      needsData: "Needs Data",
      backendRequired: "Backend Required",
      error: "Error",
    }[state] || state
  );
}

function getDefinitionByKey(definitions, key) {
  return definitions.find((definition) => definition.key === key);
}

function getKpiDefinition(key) {
  return getDefinitionByKey(KPI_DEFINITIONS, key);
}

function getMiddlePanelDefinition(key) {
  return getDefinitionByKey(MIDDLE_PANEL_DEFINITIONS, key);
}

function getBottomPanelDefinition(key) {
  return getDefinitionByKey(BOTTOM_PANEL_DEFINITIONS, key);
}

function createPanel({
  key,
  title,
  subtitle = "",
  state,
  value = null,
  detail = "",
  message = "",
  note = "",
  data = null,
  meta = {},
}) {
  return {
    key,
    title,
    subtitle,
    state,
    stateLabel: getStateLabel(state),
    value,
    detail,
    message,
    note,
    data,
    meta,
  };
}

function createLoadingPanel(definition, meta = {}) {
  return createPanel({
    ...definition,
    state: DASHBOARD_PANEL_STATES.LOADING,
    message: "Loading panel data.",
    meta,
  });
}

function createErrorPanel(definition, message, meta = {}) {
  return createPanel({
    ...definition,
    state: DASHBOARD_PANEL_STATES.ERROR,
    message,
    meta,
  });
}

function hasExplicitCount(summary, field) {
  return Number.isFinite(summary?.[field]);
}

function hasSummaryCounts(summary = {}) {
  return ["total_ontime", "total_late", "total_alpha"].every((field) =>
    hasExplicitCount(summary, field),
  );
}

function formatNumericValue(value, digits = 1) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function getHistoricalTrendScaleMax(maxValue) {
  if (maxValue <= 10) {
    return 10;
  }

  if (maxValue <= 25) {
    return 25;
  }

  if (maxValue <= 50) {
    return 50;
  }

  if (maxValue <= 100) {
    return 100;
  }

  return Math.ceil(maxValue / 50) * 50;
}

function getHistoricalTrendPointValue(point) {
  if (point && typeof point === "object") {
    return firstFiniteNumber(point.value);
  }

  return firstFiniteNumber(point);
}

function createHistoricalTrendScale(seriesValues = {}) {
  const scaleValues = Object.values(seriesValues)
    .flat()
    .map(getHistoricalTrendPointValue)
    .filter((value) => value !== null);
  const maxValue = Math.max(0, ...scaleValues);
  const max = getHistoricalTrendScaleMax(maxValue);
  const step = max / 5;

  return {
    min: HISTORICAL_TREND_CHART.min,
    max,
    yAxisLabels: Array.from({ length: 6 }, (_, index) =>
      formatNumericValue(max - step * index),
    ),
  };
}

function createModeMixChartStyle(segments) {
  let cursor = 0;
  const stops = segments.map((segment) => {
    const start = cursor;
    cursor += segment.percentage;
    return `${segment.color} ${formatNumericValue(start, 2)}% ${formatNumericValue(cursor, 2)}%`;
  });

  return `background: conic-gradient(${stops.join(", ")});`;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value === null || typeof value === "undefined") {
      continue;
    }

    if (typeof value === "number") {
      if (Number.isFinite(value)) {
        return value;
      }

      continue;
    }

    if (typeof value !== "string") {
      continue;
    }

    const candidate = value.trim();

    if (candidate === "") {
      continue;
    }

    const number = Number(candidate);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function getMapContext(analytics = null) {
  const mapContext = analytics?.map_context ?? analytics?.mapContext;

  if (typeof mapContext === "undefined" || mapContext === null) {
    return null;
  }

  return mapContext &&
    typeof mapContext === "object" &&
    !Array.isArray(mapContext)
    ? mapContext
    : false;
}

function normalizeMapContextStatus(status) {
  if (typeof status !== "string") {
    return null;
  }

  const normalized = status.trim().toLowerCase();

  return Object.values(MAP_CONTEXT_STATUSES).includes(normalized)
    ? normalized
    : null;
}

function hasPresentValue(value) {
  return value !== null && typeof value !== "undefined" && value !== "";
}

function firstPresentValue(...values) {
  return values.find(hasPresentValue) ?? null;
}

function normalizeWorkMode(mode) {
  const normalizedMode = String(mode || "").trim().toUpperCase();

  return ["WFO", "WFH", "WFA"].includes(normalizedMode) ? normalizedMode : "WFO";
}

function getAttendanceModeColor(mode) {
  return ATTENDANCE_MODE_COLORS[normalizeWorkMode(mode)] || ATTENDANCE_MODE_COLORS.WFO;
}

function createLiveMapModeSummary(locations = []) {
  const summary = {
    total: locations.length,
    WFO: { key: "WFO", label: "WFO", description: "Work From Office", value: 0, color: ATTENDANCE_MODE_COLORS.WFO },
    WFH: { key: "WFH", label: "WFH", description: "Work From Home", value: 0, color: ATTENDANCE_MODE_COLORS.WFH },
    WFA: { key: "WFA", label: "WFA", description: "Work From Anywhere", value: 0, color: ATTENDANCE_MODE_COLORS.WFA },
  };

  locations.forEach((location) => {
    summary[normalizeWorkMode(location.mode)].value += 1;
  });

  return {
    total: summary.total,
    modes: [summary.WFO, summary.WFH, summary.WFA].map((mode) => ({
      ...mode,
      percentage: summary.total ? Math.round((mode.value / summary.total) * 100) : 0,
    })),
  };
}

function createMapLocationKey(point, index) {
  const pointId = firstPresentValue(
    point?.id,
    point?.point_id,
    point?.attendance_id,
    point?.id_attendance,
  );

  if (pointId) {
    return pointId;
  }

  const fallbackParts = [
    point?.user_id || point?.nip_nim,
    point?.attendance_date,
    point?.label || point?.user_name || point?.full_name || point?.fullName,
    index,
  ].filter(hasPresentValue);

  return `map_context_${fallbackParts.join("_")}`;
}

function createMapLocation(point, index, metadata = {}) {
  const {
    source = MAP_VIEW_SOURCE_KEY,
    sourceNote = MAP_VIEW_SOURCE_NOTE,
    trackingNote = MAP_VIEW_TRACKING_NOTE,
  } = metadata;
  const latitude = firstFiniteNumber(
    point?.coordinates?.latitude,
    point?.location?.latitude,
    point?.location_details?.coordinates?.latitude,
    point?.latitude,
    point?.lat,
  );
  const longitude = firstFiniteNumber(
    point?.coordinates?.longitude,
    point?.location?.longitude,
    point?.location_details?.coordinates?.longitude,
    point?.longitude,
    point?.lng,
    point?.lon,
  );

  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  const radius = firstFiniteNumber(
    point?.radius_m,
    point?.geofence_radius,
    point?.radius,
    point?.location?.radius,
    point?.location_details?.radius,
  );
  const label = firstPresentValue(
    point?.label,
    point?.user_name,
    point?.full_name,
    point?.fullName,
    "Unknown Location",
  );
  const userName = firstPresentValue(
    point?.user_name,
    point?.full_name,
    point?.fullName,
  );
  const mode = firstPresentValue(
    point?.mode,
    point?.work_mode,
    point?.location_details?.category,
    point?.information,
  );
  const description = firstPresentValue(
    point?.description,
    point?.location?.description,
    point?.location_details?.description,
    point?.location_description,
    point?.address,
    "Location details unavailable",
  );

  return {
    key: createMapLocationKey(point, index),
    pointId: point?.id || point?.point_id || null,
    attendanceId: point?.attendance_id || point?.id_attendance || null,
    userId: point?.user_id || point?.nip_nim || null,
    label,
    userName,
    fullName: userName || label,
    email: point?.email || "-",
    roleName: point?.role || point?.role_name || point?.position || "-",
    phoneNumber:
      point?.phone_number || point?.phoneNumber || point?.phone || "-",
    mode,
    modeColor: getAttendanceModeColor(mode),
    status: point?.status || "-",
    information: mode || "-",
    attendanceDate: point?.attendance_date || null,
    timeIn: point?.time_in || null,
    timeOut: point?.time_out || null,
    latitude,
    longitude,
    radius: Number.isFinite(radius) && radius > 0 ? radius : null,
    description,
    source,
    sourceNote,
    trackingNote,
  };
}

function ensureUniqueMapLocationKeys(locations = []) {
  const seenKeys = new Map();

  return locations.map((location) => {
    const seenCount = seenKeys.get(location.key) ?? 0;
    seenKeys.set(location.key, seenCount + 1);

    if (seenCount === 0) {
      return location;
    }

    return {
      ...location,
      key: `${location.key}__${seenCount + 1}`,
    };
  });
}

function createUnavailableKpi(key, state, message) {
  const definition = getKpiDefinition(key);

  return createPanel({
    key,
    title: definition.title,
    state,
    message,
    meta: definition.meta,
  });
}

function getAnalyticsErrorMessage(analyticsError) {
  if (typeof analyticsError === "string" && analyticsError.trim()) {
    return analyticsError.trim();
  }

  if (
    typeof analyticsError?.message === "string" &&
    analyticsError.message.trim()
  ) {
    return analyticsError.message.trim();
  }

  return "Dashboard analytics request failed.";
}

function hasExplicitAnalytics(analytics = null) {
  return Boolean(
    analytics && typeof analytics === "object" && !Array.isArray(analytics),
  );
}

function hasExplicitAnalyticsField(analytics = null, fieldName) {
  return Boolean(
    analytics &&
    typeof analytics === "object" &&
    !Array.isArray(analytics) &&
    Object.prototype.hasOwnProperty.call(analytics, fieldName),
  );
}

function getExecutiveKpis(analytics = null) {
  const executiveKpis = buildHistoricalAnalyticsViewModel(analytics).kpis;

  return executiveKpis &&
    typeof executiveKpis === "object" &&
    !Array.isArray(executiveKpis)
    ? executiveKpis
    : null;
}

function getExecutiveRawCounts(analytics = null) {
  const executiveKpis = getExecutiveKpis(analytics);
  const rawCounts = executiveKpis?.raw_counts ?? executiveKpis?.rawCounts;

  return rawCounts && typeof rawCounts === "object" && !Array.isArray(rawCounts)
    ? rawCounts
    : null;
}

function getModeMix(analytics = null) {
  const modeMix = buildHistoricalAnalyticsViewModel(analytics).modeMix;

  return modeMix && typeof modeMix === "object" && !Array.isArray(modeMix)
    ? modeMix
    : null;
}

function getModeMixTotals(analytics = null) {
  const modeMix = getModeMix(analytics);
  const totals = modeMix?.totals;

  return totals && typeof totals === "object" && !Array.isArray(totals)
    ? totals
    : null;
}

function getModeMixPercentages(analytics = null) {
  const modeMix = getModeMix(analytics);
  const percentages = modeMix?.percentages;

  return percentages &&
    typeof percentages === "object" &&
    !Array.isArray(percentages)
    ? percentages
    : null;
}

function buildAttendanceRateKpi(analytics = null, analyticsError = null) {
  if (analyticsError) {
    return createPanel({
      key: "attendanceRate",
      title: "Attendance Rate",
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(analyticsError)} Attendance rate remains unavailable until the explicit analytics response succeeds.`,
      meta: getKpiDefinition("attendanceRate").meta,
    });
  }

  if (!hasExplicitAnalytics(analytics)) {
    return createUnavailableKpi(
      "attendanceRate",
      DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      "Attendance rate waits for explicit dashboard analytics executive_kpis.",
    );
  }

  const executiveKpis = getExecutiveKpis(analytics);
  const rawCounts = getExecutiveRawCounts(analytics);
  const attendanceRate = firstFiniteNumber(executiveKpis?.attendance_rate);
  const totalRecords = firstFiniteNumber(rawCounts?.total_attendance_records);
  const presentCount = firstFiniteNumber(rawCounts?.total_present);
  const onTimeCount = firstFiniteNumber(
    rawCounts?.total_on_time,
    rawCounts?.total_ontime,
  );
  const lateCount = firstFiniteNumber(rawCounts?.total_late);

  if (attendanceRate === null) {
    return createUnavailableKpi(
      "attendanceRate",
      DASHBOARD_PANEL_STATES.NEEDS_DATA,
      "Attendance rate is not available in dashboard analytics for this period.",
    );
  }

  if (totalRecords === 0) {
    return createPanel({
      key: "attendanceRate",
      title: "Attendance Rate",
      state: DASHBOARD_PANEL_STATES.EMPTY,
      message:
        "Dashboard analytics returned zero attendance records for the active period.",
      meta: getKpiDefinition("attendanceRate").meta,
    });
  }

  return createPanel({
    key: "attendanceRate",
    title: "Attendance Rate",
    state: DASHBOARD_PANEL_STATES.READY,
    value: `${formatNumericValue(attendanceRate)}%`,
    detail:
      Number.isFinite(totalRecords) &&
      Number.isFinite(presentCount) &&
      Number.isFinite(onTimeCount) &&
      Number.isFinite(lateCount)
        ? `${presentCount} present records (${onTimeCount} on time, ${lateCount} late) out of ${totalRecords} explicit analytics attendance records.`
        : "Explicit backend attendance rate for the active period.",
    meta: getKpiDefinition("attendanceRate").meta,
  });
}

function buildLateAlphaRiskKpi(analytics = null, analyticsError = null) {
  if (analyticsError) {
    return createPanel({
      key: "lateAlphaRisk",
      title: "Late / Alpha Risk",
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(analyticsError)} Late / alpha risk remains unavailable until the explicit analytics response succeeds.`,
      meta: getKpiDefinition("lateAlphaRisk").meta,
    });
  }

  if (!hasExplicitAnalytics(analytics)) {
    return createUnavailableKpi(
      "lateAlphaRisk",
      DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      "Late / alpha risk waits for explicit dashboard analytics executive_kpis.",
    );
  }

  const executiveKpis = getExecutiveKpis(analytics);
  const rawCounts = getExecutiveRawCounts(analytics);
  const riskShare = firstFiniteNumber(executiveKpis?.late_alpha_risk);
  const lateCount = firstFiniteNumber(rawCounts?.total_late);
  const alphaCount = firstFiniteNumber(rawCounts?.total_alpha);
  const riskCount =
    Number.isFinite(lateCount) && Number.isFinite(alphaCount)
      ? lateCount + alphaCount
      : null;

  if (riskShare === null && riskCount === null) {
    return createUnavailableKpi(
      "lateAlphaRisk",
      DASHBOARD_PANEL_STATES.NEEDS_DATA,
      "Late / alpha risk is not available in dashboard analytics for this period.",
    );
  }

  if (riskCount === 0) {
    return createPanel({
      key: "lateAlphaRisk",
      title: "Late / Alpha Risk",
      state: DASHBOARD_PANEL_STATES.EMPTY,
      message:
        "Dashboard analytics returned zero late or alpha records for the active period.",
      meta: getKpiDefinition("lateAlphaRisk").meta,
    });
  }

  const value =
    riskCount === null
      ? `${formatNumericValue(riskShare)}%`
      : String(riskCount);
  const detail =
    riskShare === null
      ? "Explicit backend late / alpha count for the active period."
      : `${formatNumericValue(riskShare)}% of explicit analytics attendance records were late or alpha.`;

  return createPanel({
    key: "lateAlphaRisk",
    title: "Late / Alpha Risk",
    state: DASHBOARD_PANEL_STATES.READY,
    value,
    detail,
    meta: getKpiDefinition("lateAlphaRisk").meta,
  });
}

function buildAverageDisciplineKpi(analytics = null, analyticsError = null) {
  if (analyticsError) {
    return createPanel({
      key: "averageDiscipline",
      title: "Avg Discipline",
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(analyticsError)} Average discipline remains unavailable until the explicit analytics response succeeds.`,
      meta: getKpiDefinition("averageDiscipline").meta,
    });
  }

  if (!hasExplicitAnalytics(analytics)) {
    return createUnavailableKpi(
      "averageDiscipline",
      DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      "Average discipline waits for explicit dashboard analytics executive_kpis.",
    );
  }

  const executiveKpis = getExecutiveKpis(analytics);
  const rawCounts = getExecutiveRawCounts(analytics);
  const disciplineIndex = firstFiniteNumber(executiveKpis?.avg_discipline);
  const analyzedUsers = firstFiniteNumber(rawCounts?.discipline_users_analyzed);

  if (disciplineIndex === null) {
    return createUnavailableKpi(
      "averageDiscipline",
      DASHBOARD_PANEL_STATES.NEEDS_DATA,
      "Average discipline is not available in dashboard analytics for this period.",
    );
  }

  return createPanel({
    key: "averageDiscipline",
    title: "Avg Discipline",
    state: DASHBOARD_PANEL_STATES.READY,
    value: formatNumericValue(disciplineIndex),
    detail: Number.isFinite(analyzedUsers)
      ? `Explicit backend executive_kpis.avg_discipline across ${analyzedUsers} analyzed users.`
      : "Explicit backend executive_kpis.avg_discipline for the active period.",
    meta: getKpiDefinition("averageDiscipline").meta,
  });
}

function buildNeedsAttentionKpi(analytics = null, analyticsError = null) {
  if (analyticsError) {
    return createPanel({
      key: "needsAttention",
      title: "Needs Attention",
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(analyticsError)} Needs-attention count remains unavailable until the explicit analytics response succeeds.`,
      meta: getKpiDefinition("needsAttention").meta,
    });
  }

  if (!hasExplicitAnalytics(analytics)) {
    return createUnavailableKpi(
      "needsAttention",
      DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      "Needs-attention count waits for explicit dashboard analytics executive_kpis.",
    );
  }

  const executiveKpis = getExecutiveKpis(analytics);
  const needsAttention = firstFiniteNumber(
    executiveKpis?.needs_attention,
    executiveKpis?.needsAttention,
  );

  if (needsAttention === null) {
    return createUnavailableKpi(
      "needsAttention",
      DASHBOARD_PANEL_STATES.NEEDS_DATA,
      "Needs-attention count is not available in dashboard analytics for this period.",
    );
  }

  return createPanel({
    key: "needsAttention",
    title: "Needs Attention",
    state: DASHBOARD_PANEL_STATES.READY,
    value: String(needsAttention),
    detail:
      needsAttention === 0
        ? "Explicit backend analytics returned zero needs-attention users for the active period."
        : "Explicit backend needs-attention count for the active period.",
    meta: getKpiDefinition("needsAttention").meta,
  });
}

function buildKpis(analytics = null, analyticsError = null) {
  return [
    buildAttendanceRateKpi(analytics, analyticsError),
    buildLateAlphaRiskKpi(analytics, analyticsError),
    buildAverageDisciplineKpi(analytics, analyticsError),
    buildNeedsAttentionKpi(analytics, analyticsError),
  ];
}

function buildModeMixPanel(analytics = null, analyticsError = null) {
  if (analyticsError) {
    return createPanel({
      ...getMiddlePanelDefinition("modeMix"),
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(analyticsError)} Attendance mode mix remains unavailable until the explicit analytics response succeeds.`,
      note: "Web FE will not derive WFO / WFH / WFA distribution from report rows once dashboard analytics is the active authority.",
    });
  }

  if (!hasExplicitAnalytics(analytics)) {
    return createPanel({
      ...getMiddlePanelDefinition("modeMix"),
      state: DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      message:
        "Attendance mode mix waits for explicit dashboard analytics mode_mix.",
    });
  }

  if (!hasExplicitAnalyticsField(analytics, "mode_mix")) {
    return createPanel({
      ...getMiddlePanelDefinition("modeMix"),
      state: DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      message:
        "Attendance mode mix waits for explicit dashboard analytics mode_mix.",
    });
  }

  const totals = getModeMixTotals(analytics);
  const percentages = getModeMixPercentages(analytics);
  const totalWfo = firstFiniteNumber(totals?.wfo);
  const totalWfh = firstFiniteNumber(totals?.wfh);
  const totalWfa = firstFiniteNumber(totals?.wfa);

  if (totalWfo === null || totalWfh === null || totalWfa === null) {
    return createPanel({
      ...getMiddlePanelDefinition("modeMix"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Attendance mode totals are not available in dashboard analytics mode_mix for the active period.",
    });
  }

  const total = totalWfo + totalWfh + totalWfa;
  const segments = [
    { key: "wfo", label: "WFO", value: totalWfo },
    { key: "wfh", label: "WFH", value: totalWfh },
    { key: "wfa", label: "WFA", value: totalWfa },
  ].map((segment) => {
    const explicitPercentage = firstFiniteNumber(percentages?.[segment.key]);
    const hasExplicitPercentage =
      explicitPercentage !== null &&
      explicitPercentage >= 0 &&
      explicitPercentage <= 100;
    const derivedPercentage = total > 0 ? (segment.value / total) * 100 : 0;
    const percentage = hasExplicitPercentage
      ? explicitPercentage
      : derivedPercentage;

    return {
      ...segment,
      color: MODE_MIX_COLORS[segment.key],
      percentage,
      percentageLabel: `${formatNumericValue(percentage)}%`,
    };
  });

  if (total === 0) {
    return createPanel({
      ...getMiddlePanelDefinition("modeMix"),
      state: DASHBOARD_PANEL_STATES.EMPTY,
      message:
        "Dashboard analytics returned zero attendance mode records for the active period.",
      data: { total, segments },
    });
  }

  return createPanel({
    ...getMiddlePanelDefinition("modeMix"),
    state: DASHBOARD_PANEL_STATES.READY,
    detail:
      "Distribution from explicit dashboard analytics mode_mix totals for the active period.",
    data: { total, segments, chartStyle: createModeMixChartStyle(segments) },
  });
}

function getHistoricalTrendPointLabel(point, index) {
  if (point && typeof point === "object") {
    return point.label;
  }

  return HISTORICAL_TREND_MONTH_LABELS[index];
}

function getHistoricalTrendSeriesPointValue(point) {
  if (point && typeof point === "object") {
    return point.value;
  }

  return point;
}

function getHistoricalTrendPointX(index, length, stepX, horizontalRange) {
  if (length === 1) {
    return HISTORICAL_TREND_CHART.leftX + horizontalRange / 2;
  }

  return HISTORICAL_TREND_CHART.leftX + index * stepX;
}

function createTrendSeries(values, scale) {
  const verticalRange =
    HISTORICAL_TREND_CHART.baselineY - HISTORICAL_TREND_CHART.topY;
  const horizontalRange =
    HISTORICAL_TREND_CHART.rightX - HISTORICAL_TREND_CHART.leftX;
  const valueRange = scale.max - scale.min || 1;
  const stepX = values.length > 1 ? horizontalRange / (values.length - 1) : 0;

  return values.map((point, index) => {
    const value = getHistoricalTrendSeriesPointValue(point);

    return {
      label: getHistoricalTrendPointLabel(point, index),
      value,
      displayValue:
        point && typeof point === "object" ? point.displayValue || null : null,
      x: getHistoricalTrendPointX(index, values.length, stepX, horizontalRange),
      y:
        HISTORICAL_TREND_CHART.baselineY -
        ((value - scale.min) / valueRange) * verticalRange,
    };
  });
}

function formatPathNumber(value) {
  return formatNumericValue(value, 3);
}

function createTrendChartPath(series) {
  if (!series.length) {
    return "";
  }

  return series.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${formatPathNumber(point.x)} ${formatPathNumber(point.y)}`;
    }

    const previousPoint = series[index - 1];
    const controlX = (previousPoint.x + point.x) / 2;

    return `${path} C ${formatPathNumber(controlX)} ${formatPathNumber(previousPoint.y)}, ${formatPathNumber(controlX)} ${formatPathNumber(point.y)}, ${formatPathNumber(point.x)} ${formatPathNumber(point.y)}`;
  }, "");
}

function createTrendAreaPath(series) {
  if (!series.length) {
    return "";
  }

  const firstPoint = series[0];
  const lastPoint = series[series.length - 1];

  return `${createTrendChartPath(series)} L ${formatPathNumber(lastPoint.x)} ${HISTORICAL_TREND_CHART.baselineY} L ${formatPathNumber(firstPoint.x)} ${HISTORICAL_TREND_CHART.baselineY} Z`;
}

function formatTrendMetricDelta(delta) {
  if (!Number.isFinite(delta) || delta === 0) {
    return "0 vs prev";
  }

  return `${delta > 0 ? "+" : ""}${formatNumericValue(delta)} vs prev`;
}

function createHistoricalTrendMetrics(seriesEntries) {
  return seriesEntries.map((series) => {
    const currentValue = series.points.at(-1)?.value ?? 0;
    const previousValue = series.points.at(-2)?.value ?? currentValue;

    return {
      key: series.key,
      label: series.label,
      value: formatNumericValue(currentValue),
      change: formatTrendMetricDelta(currentValue - previousValue),
      tone: series.metricTone,
    };
  });
}

function createHistoricalTrendHoverPoints(series = []) {
  const totalPoints = Math.max(
    0,
    ...series.map((seriesEntry) => seriesEntry.points?.length || 0),
  );

  return Array.from({ length: totalPoints }, (_, index) => {
    const items = series
      .map((seriesEntry) => {
        const point = seriesEntry.points?.[index] || null;

        if (!point) {
          return null;
        }

        return {
          key: seriesEntry.key,
          label: seriesEntry.label,
          color: seriesEntry.color,
          value: point.value,
          displayValue: point.displayValue || null,
          x: point.x,
          y: point.y,
        };
      })
      .filter(Boolean);

    return {
      index,
      label: items[0]?.label || "",
      x: items[0]?.x ?? HISTORICAL_TREND_CHART.leftX,
      items,
    };
  });
}

function createHistoricalTrendRange({
  key,
  label,
  seriesValues = {},
  yAxisLabels = null,
  seriesLabels = {},
}) {
  const scale = createHistoricalTrendScale(seriesValues);
  const series = HISTORICAL_TREND_SERIES_DEFINITIONS.map((definition) => {
    const points = createTrendSeries(seriesValues[definition.key] ?? [], scale);

    return {
      ...definition,
      label: seriesLabels[definition.key] || definition.label,
      points,
      chartPath: createTrendChartPath(points),
      areaPath: createTrendAreaPath(points),
    };
  });

  return {
    key,
    label,
    metrics: createHistoricalTrendMetrics(series),
    series,
    hoverPoints: createHistoricalTrendHoverPoints(series),
    plotArea: {
      leftX: HISTORICAL_TREND_CHART.leftX,
      rightX: HISTORICAL_TREND_CHART.rightX,
      topY: HISTORICAL_TREND_CHART.topY,
      baselineY: HISTORICAL_TREND_CHART.baselineY,
      viewBoxWidth: 992,
      viewBoxHeight: 220,
    },
    xAxisLabels: series[0]?.points?.map((point) => point.label) ?? [],
    yAxisLabels: Array.isArray(yAxisLabels) && yAxisLabels.length ? yAxisLabels : scale.yAxisLabels,
  };
}

function parseHistoricalTrendDate(rawDate) {
  if (typeof rawDate !== "string") {
    return null;
  }

  const trimmedDate = rawDate.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedDate);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    raw: trimmedDate,
    year,
    monthIndex: month - 1,
    day,
  };
}

function createHistoricalTrendWindowLabelPoint(point) {
  return {
    label: `${String(point.day).padStart(2, "0")} ${HISTORICAL_TREND_MONTH_LABELS[point.monthIndex]}`,
    value: point.raw,
  };
}

function getHistoricalTrendPointDate(point) {
  return firstPresentValue(
    point?.date,
    point?.attendance_date,
    point?.attendanceDate,
  );
}

function normalizeHistoricalTrendPoint(point) {
  if (!point || typeof point !== "object") {
    return null;
  }

  const parsedDate = parseHistoricalTrendDate(
    getHistoricalTrendPointDate(point),
  );
  const onTime = firstFiniteNumber(point.on_time, point.onTime, point.ontime);
  const late = firstFiniteNumber(point.late);
  const alpha = firstFiniteNumber(point.alpha);

  if (!parsedDate || onTime === null || late === null || alpha === null) {
    return null;
  }

  if (onTime < 0 || late < 0 || alpha < 0) {
    return null;
  }

  return {
    date: parsedDate.raw,
    label: createHistoricalTrendWindowLabelPoint(parsedDate).label,
    ontime: onTime,
    late,
    alpha,
  };
}

function createHistoricalTrendRangeFailure(reason) {
  return {
    range: null,
    reason,
  };
}

function normalizeHistoricalTrendWindowPoints(points) {
  if (points.length <= 7) {
    return points;
  }

  const weeklyPoints = points.filter((_, index) => index % 7 === 0);
  const lastPoint = points[points.length - 1];

  if (weeklyPoints[weeklyPoints.length - 1]?.date !== lastPoint.date) {
    weeklyPoints.push(lastPoint);
  }

  return weeklyPoints;
}

function createHistoricalTrendRangeFromPoints(points) {
  if (!points.length) {
    return createHistoricalTrendRangeFailure(
      "missing historical_trend.points entries",
    );
  }

  const windowPoints = normalizeHistoricalTrendWindowPoints(points);

  return {
    range: createHistoricalTrendRange({
      key: "selectedWindow",
      label: "Selected Window",
      seriesValues: {
        ontime: windowPoints.map((point) => ({
          label: point.label,
          value: point.ontime,
        })),
        late: windowPoints.map((point) => ({
          label: point.label,
          value: point.late,
        })),
        alpha: windowPoints.map((point) => ({
          label: point.label,
          value: point.alpha,
        })),
      },
    }),
    reason: "",
  };
}

function normalizeHistoricalTrend(analytics = null) {
  const trendPayload = buildHistoricalAnalyticsViewModel(analytics).trend;

  if (!trendPayload) {
    return null;
  }

  if (!Array.isArray(trendPayload.points)) {
    return {
      ranges: null,
      reason: "missing historical_trend.points array",
    };
  }

  const normalizedPoints = trendPayload.points.map(
    normalizeHistoricalTrendPoint,
  );

  if (normalizedPoints.some((point) => point === null)) {
    return {
      ranges: null,
      reason: "invalid historical_trend.points values",
    };
  }

  const chronologicalPoints = [...normalizedPoints].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const normalizedRange =
    createHistoricalTrendRangeFromPoints(chronologicalPoints);

  if (!normalizedRange.range) {
    return {
      ranges: null,
      reason: normalizedRange.reason,
    };
  }

  return {
    ranges: [normalizedRange.range],
    defaultRangeKey: normalizedRange.range.key,
    source: trendPayload.source || "backend/dashboard-analytics.points",
  };
}

function buildPreviewHistoricalTrendPanel() {
  const defaultRange = HISTORICAL_TREND_PREVIEW_RANGES[0];

  return createPanel({
    ...getMiddlePanelDefinition("historicalTrend"),
    state: DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
    data: {
      ranges: HISTORICAL_TREND_PREVIEW_RANGES,
      defaultRangeKey: defaultRange.key,
      isPreview: true,
      source: "dummy-preview",
    },
  });
}

function buildHistoricalTrendPanel(analytics = null, analyticsError = null) {
  if (analyticsError) {
    return createPanel({
      ...getMiddlePanelDefinition("historicalTrend"),
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(analyticsError)} Historical attendance trend remains unavailable until the explicit analytics response succeeds.`,
      note: "Web FE will not derive trend from summary totals or split merged late/alpha risk series.",
    });
  }

  if (!hasExplicitAnalytics(analytics)) {
    return buildPreviewHistoricalTrendPanel();
  }

  if (!hasExplicitAnalyticsField(analytics, "historical_trend")) {
    return buildPreviewHistoricalTrendPanel();
  }

  const normalizedTrend = normalizeHistoricalTrend(analytics);

  if (!normalizedTrend) {
    return buildPreviewHistoricalTrendPanel();
  }

  if (!normalizedTrend.ranges) {
    return createPanel({
      ...getMiddlePanelDefinition("historicalTrend"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message: `Backend trend payload is incomplete (${normalizedTrend.reason}); historical_trend.points must carry explicit On Time, Late, and Alpha counts for the selected dashboard window.`,
      note: "Web FE will not derive trend from summary totals or merged late/alpha KPI values.",
    });
  }

  const defaultRange =
    normalizedTrend.ranges.find(
      (range) => range.key === normalizedTrend.defaultRangeKey,
    ) ?? normalizedTrend.ranges[0];

  return createPanel({
    ...getMiddlePanelDefinition("historicalTrend"),
    state: DASHBOARD_PANEL_STATES.READY,
    data: {
      ranges: normalizedTrend.ranges,
      defaultRangeKey: defaultRange.key,
      isPreview: false,
      source: normalizedTrend.source,
    },
  });
}

function buildHeroPanel(analytics = null, analyticsError = null) {
  if (analyticsError) {
    return createPanel({
      ...HERO_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(analyticsError)} Map View remains unavailable until the explicit map_context analytics feed succeeds.`,
      note: "Web FE will not fall back to historical report-row coordinates for this map context panel.",
    });
  }

  const mapContext = getMapContext(analytics);

  if (mapContext === null) {
    return createPanel({
      ...HERO_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      message:
        "Backend analytics.map_context is not available for Map View yet.",
      note: "Map View waits for explicit backend-authored map_context.points instead of reusing historical report rows.",
    });
  }

  if (mapContext === false) {
    return createPanel({
      ...HERO_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Backend analytics.map_context payload is invalid; Map View requires an explicit object with points and status.",
      note: "Web FE will not coerce non-object analytics payloads into map markers.",
    });
  }

  const backendStatus = normalizeMapContextStatus(mapContext.status);
  const points = mapContext.points;

  if (!backendStatus) {
    return createPanel({
      ...HERO_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Backend analytics.map_context.status is missing or unsupported; expected ready, partial_data, or no_data.",
      note: "Map View stays unavailable rather than guessing map authority from report rows.",
      data: {
        backendStatus: mapContext.status || null,
        source: MAP_VIEW_SOURCE_KEY,
        summary: mapContext.summary || null,
        geofenceContext:
          mapContext.geofence_context || mapContext.geofenceContext || null,
      },
    });
  }

  if (!Array.isArray(points)) {
    return createPanel({
      ...HERO_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Backend analytics.map_context.points is missing or invalid; Map View requires an explicit points array.",
      note: "Web FE will not derive primary markers from /api/summary report rows.",
      data: {
        backendStatus,
        source: MAP_VIEW_SOURCE_KEY,
        summary: mapContext.summary || null,
        geofenceContext:
          mapContext.geofence_context || mapContext.geofenceContext || null,
      },
    });
  }

  const locations = ensureUniqueMapLocationKeys(
    points
      .map((point, index) => createMapLocation(point, index))
      .filter(Boolean),
  );
  const unavailableCount = points.length - locations.length;
  const sharedData = {
    locations,
    unavailableCount,
    totalRows: points.length,
    source: MAP_VIEW_SOURCE_KEY,
    backendStatus,
    summary: mapContext.summary || null,
    geofenceContext:
      mapContext.geofence_context || mapContext.geofenceContext || null,
    tileProvider: "OpenStreetMap",
  };

  if (backendStatus === MAP_CONTEXT_STATUSES.NO_DATA) {
    return createPanel({
      ...HERO_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.EMPTY,
      message:
        "Backend map_context reports no_data for the active dashboard scope.",
      note: "Map View stays empty instead of falling back to historical report rows or invented markers.",
      data: sharedData,
    });
  }

  if (!locations.length) {
    return createPanel({
      ...HERO_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message: points.length
        ? `Backend map_context reports ${backendStatus}, but no points included valid coordinates.`
        : `Backend map_context reports ${backendStatus}, but returned no points.`,
      note: "Map View will not derive primary markers from /api/summary report rows.",
      data: sharedData,
    });
  }

  if (backendStatus === MAP_CONTEXT_STATUSES.PARTIAL_DATA) {
    return createPanel({
      ...HERO_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message: `${locations.length} backend map_context point${locations.length === 1 ? "" : "s"} include explicit coordinates, but backend status is partial_data.`,
      note: "Partial map_context markers are shown as dashboard snapshot context, not complete report truth or report-row fallback.",
      data: sharedData,
    });
  }

  return createPanel({
    ...HERO_PANEL_DEFINITION,
    state: DASHBOARD_PANEL_STATES.READY,
    message: `${locations.length} backend map_context point${locations.length === 1 ? "" : "s"} include explicit coordinates.`,
    note: "Markers reflect backend map_context included in this dashboard analytics snapshot only; they are not continuous tracking or filtered report/export history.",
    data: sharedData,
  });
}

function buildFuzzyAhpPanel() {
  return buildExplicitFuzzyAhpPanel(null);
}

function normalizeFahpDecisionRankings(rankings = []) {
  return rankings
    .map((ranking, index) => {
      const label = firstPresentValue(
        ranking?.label,
        ranking?.name,
        `Alternative ${index + 1}`,
      );
      const score = firstFiniteNumber(
        ranking?.score,
        ranking?.value,
        ranking?.weight,
      );

      if (!label || score === null) {
        return null;
      }

      return { label, score };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score);
}

function normalizeFahpCriteriaWeights(criteriaWeights = null, rankings = []) {
  if (Array.isArray(criteriaWeights)) {
    const normalizedCriteriaWeights = criteriaWeights
      .map((criterion, index) => {
        const label = firstPresentValue(
          criterion?.label,
          criterion?.name,
          criterion?.key,
          `Criterion ${index + 1}`,
        );
        const weight = firstFiniteNumber(
          criterion?.weight,
          criterion?.value,
          criterion?.score,
        );

        if (!label || weight === null) {
          return null;
        }

        return { label, weight };
      })
      .filter(Boolean)
      .sort((left, right) => right.weight - left.weight);

    if (normalizedCriteriaWeights.length) {
      return normalizedCriteriaWeights;
    }
  }

  return rankings.map((ranking) => ({
    label: ranking.label,
    weight: ranking.score,
  }));
}

function normalizeFahpDecision(decision, fallbackKey, fallbackTitle) {
  if (!decision || typeof decision !== "object" || Array.isArray(decision)) {
    return null;
  }

  const rankings = normalizeFahpDecisionRankings(decision.rankings);

  if (!rankings.length) {
    return null;
  }

  return {
    key: firstPresentValue(decision.key, fallbackKey),
    title: firstPresentValue(decision.title, fallbackTitle),
    summary: firstPresentValue(decision.summary, "Explicit backend Fuzzy AHP output."),
    consistencyRatio: firstFiniteNumber(
      decision.consistency_ratio,
      decision.consistencyRatio,
    ),
    criteriaWeights: normalizeFahpCriteriaWeights(decision.criteriaWeights, rankings),
    rankings,
  };
}

function normalizeFahpSectionDecision(section, index = 0) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    return null;
  }

  const distribution =
    section.distribution &&
    typeof section.distribution === "object" &&
    !Array.isArray(section.distribution)
      ? section.distribution
      : null;
  const rankings = distribution
    ? Object.entries(distribution)
        .map(([label, score]) =>
          typeof score === "number" && Number.isFinite(score)
            ? { label, score }
            : null,
        )
        .filter(Boolean)
        .sort((left, right) => right.score - left.score)
    : [];

  if (!rankings.length) {
    return null;
  }

  return {
    key: firstPresentValue(section.key, `decision-${index + 1}`),
    title: firstPresentValue(section.title, `Decision ${index + 1}`),
    summary: firstPresentValue(section.summary, "Explicit backend Fuzzy AHP output."),
    consistencyRatio:
      typeof section.consistency === "number" && Number.isFinite(section.consistency)
        ? section.consistency
        : null,
    criteriaWeights: normalizeFahpCriteriaWeights(section.criteriaWeights, rankings),
    rankings,
  };
}

function normalizeFuzzyAhpResponse(fuzzyAhpResponse = null) {
  if (fuzzyAhpResponse === null || typeof fuzzyAhpResponse === "undefined") {
    return null;
  }

  if (typeof fuzzyAhpResponse !== "object" || Array.isArray(fuzzyAhpResponse)) {
    return false;
  }

  const responsePayload =
    fuzzyAhpResponse?.data &&
    typeof fuzzyAhpResponse.data === "object" &&
    !Array.isArray(fuzzyAhpResponse.data)
      ? fuzzyAhpResponse.data
      : fuzzyAhpResponse;

  if (
    responsePayload &&
    typeof responsePayload === "object" &&
    !Array.isArray(responsePayload) &&
    Array.isArray(responsePayload.sections)
  ) {
    const decisions = responsePayload.sections
      .map((section, index) => normalizeFahpSectionDecision(section, index))
      .filter(Boolean);

    return decisions.length
      ? {
          source: FUZZY_AHP_SOURCE_KEY,
          decisions,
        }
      : false;
  }

  if (
    responsePayload &&
    typeof responsePayload === "object" &&
    !Array.isArray(responsePayload)
  ) {
    const normalizedDecision = normalizeFahpDecision(
      responsePayload,
      "overall",
      "Overall Decision",
    );

    return normalizedDecision
      ? {
          source: FUZZY_AHP_SOURCE_KEY,
          decisions: [normalizedDecision],
        }
      : false;
  }

  return false;
}

function buildTodayLocationsHeroPanel(
  todayLocations = null,
  todayLocationsError = null,
) {
  if (todayLocationsError) {
    return createPanel({
      ...LIVE_MAP_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(todayLocationsError)} Today Locations / Live Map remains unavailable until the explicit today-locations feed succeeds.`,
      note: "Web FE will not fall back to dashboard analytics map_context or historical report rows for this live map.",
    });
  }

  if (todayLocations === null) {
    return createPanel({
      ...LIVE_MAP_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      message:
        "Today locations backend feed is not available for the active period.",
      note: "Live map waits for explicit attendance.today-locations rows instead of dashboard analytics snapshots or historical report rows.",
    });
  }

  const liveMap = buildLiveMapViewModel(todayLocations);
  if (!Array.isArray(liveMap.locations)) {
    const previewLocations = ensureUniqueMapLocationKeys(
      PREVIEW_TODAY_LOCATION_ROWS.map((point, index) =>
        createMapLocation(point, index, {
          source: "attendance.today-locations.preview",
          sourceNote:
            "Preview-only sample rows shown because the backend today-locations payload is invalid.",
          trackingNote:
            "Preview markers are dummy attendance locations for UI validation only; they are not backend truth.",
        }),
      ).filter(Boolean),
    );
    const sharedData = {
      locations: previewLocations,
      unavailableCount: 0,
      totalRows: PREVIEW_TODAY_LOCATION_ROWS.length,
      source: "attendance.today-locations.preview",
      tileProvider: "OpenStreetMap",
      isPreview: true,
      modeSummary: createLiveMapModeSummary(previewLocations),
    };

    return createPanel({
      ...LIVE_MAP_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.READY,
      message:
        "10 preview attendance locations shown while the backend today-locations payload is invalid.",
      note: "Preview sample: 5 WFO, 1 WFH, and 4 WFA markers. Replace with explicit backend attendance rows for production truth.",
      data: sharedData,
    });
  }

  const locations = ensureUniqueMapLocationKeys(
    liveMap.locations
      .map((point, index) =>
        createMapLocation(point, index, {
          source: liveMap.authority,
          sourceNote: TODAY_LOCATIONS_SOURCE_NOTE,
          trackingNote: TODAY_LOCATIONS_TRACKING_NOTE,
        }),
      )
      .filter(Boolean),
  );
  const unavailableCount = liveMap.locations.length - locations.length;
  const sharedData = {
    locations,
    unavailableCount,
    totalRows: liveMap.locations.length,
    source: liveMap.authority,
    tileProvider: "OpenStreetMap",
    isPreview: false,
    modeSummary: createLiveMapModeSummary(locations),
  };

  if (liveMap.locations.length === 0) {
    return createPanel({
      ...LIVE_MAP_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.EMPTY,
      message:
        "Today locations backend feed returned no attendance rows for the active scope.",
      note: "Live map stays empty instead of falling back to dashboard analytics snapshots or report rows.",
      data: sharedData,
    });
  }

  if (!locations.length) {
    return createPanel({
      ...LIVE_MAP_PANEL_DEFINITION,
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message: `Today locations backend feed returned ${liveMap.locations.length} row${liveMap.locations.length === 1 ? "" : "s"}, but none included valid coordinates.`,
      note: "Live map will not invent coordinates from dashboard analytics or historical report rows.",
      data: sharedData,
    });
  }

  return createPanel({
    ...LIVE_MAP_PANEL_DEFINITION,
    state: DASHBOARD_PANEL_STATES.READY,
    message: `${locations.length} today-locations row${locations.length === 1 ? "" : "s"} include explicit coordinates.`,
    note: TODAY_LOCATIONS_TRACKING_NOTE,
    data: sharedData,
  });
}

function buildExplicitFuzzyAhpPanel(fuzzyAhp = null, fuzzyAhpError = null) {
  if (fuzzyAhpError) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(fuzzyAhpError)} Fuzzy AHP output remains unavailable until the explicit backend feed succeeds.`,
      note: "Web FE will not fabricate criteria, weights, or ranking from summary or analytics sources.",
    });
  }

  if (fuzzyAhp === null) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.READY,
      detail:
        "Preview-only Fuzzy AHP decision sets are shown while the backend feed is unavailable.",
      note: "Dummy criteria, weights, and rankings are for local cockpit layout validation only; they are not backend truth or report/export authority.",
      data: {
        source: FUZZY_AHP_PREVIEW_SOURCE_KEY,
        isPreview: true,
        decisions: PREVIEW_FUZZY_AHP_DECISIONS,
        activeDecisionKey: PREVIEW_FUZZY_AHP_DECISIONS[0].key,
      },
    });
  }

  if (fuzzyAhp === false) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Fuzzy AHP backend payload is invalid; expected an explicit object response.",
      note: "Web FE will not coerce non-object Fuzzy AHP payloads into decision support output.",
    });
  }

  if (!Array.isArray(fuzzyAhp.decisions) || fuzzyAhp.decisions.length === 0) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Fuzzy AHP backend payload is incomplete; decisions must contain explicit criteria and ranking output.",
      note: "Web FE will not fabricate criteria, weights, or ranking from summary or analytics sources.",
    });
  }

  const decisions = fuzzyAhp.decisions.filter(
    (decision) =>
      decision &&
      Array.isArray(decision.rankings) &&
      decision.rankings.length &&
      Array.isArray(decision.criteriaWeights) &&
      decision.criteriaWeights.length,
  );

  if (!decisions.length || decisions.length !== fuzzyAhp.decisions.length) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Fuzzy AHP backend decisions are incomplete; each decision must include explicit criteria weights and ranked alternatives.",
      note: "Web FE will not infer missing Fuzzy AHP decision fields.",
    });
  }

  const primaryDecision = decisions[0];

  return createPanel({
    ...getBottomPanelDefinition("fuzzyAhp"),
    state: DASHBOARD_PANEL_STATES.READY,
    detail: Number.isFinite(primaryDecision.consistencyRatio)
      ? `Explicit backend Fuzzy AHP returned ${decisions.length} decision set(s); primary CR value is ${formatNumericValue(primaryDecision.consistencyRatio, 2)}.`
      : `Explicit backend Fuzzy AHP returned ${decisions.length} decision set(s) for the active period.`,
    note: "Decision support output is shown only from the explicit backend Fuzzy AHP feed.",
    data: {
      source: firstPresentValue(fuzzyAhp.source, FUZZY_AHP_SOURCE_KEY),
      decisions,
      activeDecisionKey: primaryDecision.key,
    },
  });
}

function buildGeofenceEvidencePanel(
  geofenceEvidenceResponse = null,
  geofenceEvidenceError = null,
) {
  if (geofenceEvidenceError) {
    return createPanel({
      ...getBottomPanelDefinition("geofenceEvidence"),
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(geofenceEvidenceError)} Geofence evidence remains unavailable until the explicit backend feed succeeds.`,
      note: "Geofence events are supporting evidence only; they never become final attendance truth.",
    });
  }

  if (geofenceEvidenceResponse === null) {
    return createPanel({
      ...getBottomPanelDefinition("geofenceEvidence"),
      title: "Geofence Operational Context",
      subtitle: "Preview-only geofence event evidence",
      state: DASHBOARD_PANEL_STATES.READY,
      detail:
        "Preview-only geofence operational context is shown while the backend feed is unavailable.",
      note: "Dummy geofence event counts are for local cockpit layout validation only; final attendance validity remains determined by backend attendance records.",
      data: PREVIEW_GEOFENCE_EVIDENCE,
    });
  }

  const geofenceEvidence = buildGeofenceEvidenceViewModel(
    geofenceEvidenceResponse,
  );

  if (geofenceEvidence.needsData) {
    return createPanel({
      ...getBottomPanelDefinition("geofenceEvidence"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        geofenceEvidence.reason ||
        "Geofence evidence backend payload requires more data for this period.",
      note: "Geofence events are supporting evidence only; they never become final attendance truth.",
      data: geofenceEvidence,
    });
  }

  if (geofenceEvidence.status === "empty") {
    return createPanel({
      ...getBottomPanelDefinition("geofenceEvidence"),
      state: DASHBOARD_PANEL_STATES.EMPTY,
      message:
        geofenceEvidence.reason ||
        "Geofence evidence backend feed returned no supporting events for the active period.",
      note: "Geofence events are supporting evidence only; they never become final attendance truth.",
      data: geofenceEvidence,
    });
  }

  return createPanel({
    ...getBottomPanelDefinition("geofenceEvidence"),
    title: "Geofence Operational Context",
    subtitle: "ENTER / EXIT + attendance evidence",
    state: DASHBOARD_PANEL_STATES.READY,
    detail: `${geofenceEvidence.rawCounts.total_events} supporting geofence events for the active period. Final attendance authority remains ${geofenceEvidence.finalAttendanceAuthority || "unavailable"}.`,
    note: "Geofence events are supporting evidence only; they never become final attendance truth.",
    data: geofenceEvidence,
  });
}

export function buildDashboardSectionOrder() {
  return [
    "liveOperationsMap",
    "historicalOverview",
    "fahpRecap",
    "geofenceEvidence",
  ];
}

function createDashboardSections({ hero, middlePanels, bottomPanels }) {
  const historicalOverviewPanels = [];
  const historicalTrendPanel = getMiddlePanelDefinition("historicalTrend")
    ? middlePanels.find((panel) => panel.key === "historicalTrend")
    : null;
  const modeMixPanel = getMiddlePanelDefinition("modeMix")
    ? middlePanels.find((panel) => panel.key === "modeMix")
    : null;
  const geofenceEvidencePanel = getBottomPanelDefinition("geofenceEvidence")
    ? bottomPanels.find((panel) => panel.key === "geofenceEvidence")
    : null;
  const fuzzyAhpPanel = getBottomPanelDefinition("fuzzyAhp")
    ? bottomPanels.find((panel) => panel.key === "fuzzyAhp")
    : null;

  if (historicalTrendPanel) {
    historicalOverviewPanels.push(historicalTrendPanel);
  }

  if (modeMixPanel) {
    historicalOverviewPanels.push(modeMixPanel);
  }

  return buildDashboardSectionOrder().map((sectionKey) => {
    switch (sectionKey) {
      case "historicalOverview":
        return {
          ...DASHBOARD_SECTION_DEFINITIONS.historicalOverview,
          panels: historicalOverviewPanels,
        };
      case "geofenceEvidence":
        return {
          ...DASHBOARD_SECTION_DEFINITIONS.geofenceEvidence,
          panels: geofenceEvidencePanel ? [geofenceEvidencePanel] : [],
        };
      case "fahpRecap":
        return {
          ...DASHBOARD_SECTION_DEFINITIONS.fahpRecap,
          panels: fuzzyAhpPanel ? [fuzzyAhpPanel] : [],
        };
      case "liveOperationsMap":
        return {
          ...DASHBOARD_SECTION_DEFINITIONS.liveOperationsMap,
          panels: hero ? [hero] : [],
        };
      default:
        throw new Error(`Unsupported dashboard owner section: ${sectionKey}`);
    }
  });
}

function composeCockpit({ kpis, hero, middlePanels, bottomPanels }) {
  return {
    kpis,
    hero,
    middlePanels,
    bottomPanels,
    panels: [hero, ...middlePanels, ...bottomPanels],
    sections: createDashboardSections({ hero, middlePanels, bottomPanels }),
  };
}

function normalizeCockpitAnalyticsResponse(analyticsResponse = null) {
  if (
    !analyticsResponse ||
    typeof analyticsResponse !== "object" ||
    Array.isArray(analyticsResponse)
  ) {
    return null;
  }

  const responsePayload =
    analyticsResponse?.data &&
    typeof analyticsResponse.data === "object" &&
    !Array.isArray(analyticsResponse.data)
      ? analyticsResponse.data
      : analyticsResponse;

  return responsePayload?.analytics ?? responsePayload;
}

export function createDashboardCockpitStateFromSources({
  reportResponse = {},
  analyticsResponse = null,
  analyticsError = null,
  todayLocations = null,
  todayLocationsError = null,
  fuzzyAhpResponse = null,
  fuzzyAhpError = null,
  geofenceEvidenceResponse = null,
  geofenceEvidenceError = null,
} = {}) {
  const analytics = normalizeCockpitAnalyticsResponse(analyticsResponse);
  const fuzzyAhp = normalizeFuzzyAhpResponse(fuzzyAhpResponse);

  const hero =
    todayLocations !== null || todayLocationsError || !analyticsError
      ? buildTodayLocationsHeroPanel(todayLocations, todayLocationsError)
      : buildHeroPanel(null, analyticsError);

  return composeCockpit({
    kpis: buildKpis(analytics, analyticsError),
    hero,
    middlePanels: [
      buildHistoricalTrendPanel(analytics, analyticsError),
      buildModeMixPanel(analytics, analyticsError),
    ],
    bottomPanels: [
      buildExplicitFuzzyAhpPanel(fuzzyAhp, fuzzyAhpError),
      buildGeofenceEvidencePanel(
        geofenceEvidenceResponse,
        geofenceEvidenceError,
      ),
    ],
  });
}

export async function loadDashboardCockpitState({
  reportResponse = {},
  analyticsResponse = null,
  analyticsError = null,
  todayLocations = null,
  todayLocationsError = null,
  fuzzyAhpResponse = null,
  fuzzyAhpError = null,
  geofenceEvidenceResponse = null,
  geofenceEvidenceError = null,
} = {}) {
  return createDashboardCockpitStateFromSources({
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
}

export function createDashboardCockpitLoadingState() {
  const hero = createLoadingPanel(HERO_PANEL_DEFINITION);
  const middlePanels = MIDDLE_PANEL_DEFINITIONS.map((panel) =>
    createLoadingPanel(panel),
  );
  const bottomPanels = BOTTOM_PANEL_DEFINITIONS.map((panel) =>
    createLoadingPanel(panel),
  );

  return composeCockpit({
    kpis: KPI_DEFINITIONS.map((panel) =>
      createLoadingPanel({ key: panel.key, title: panel.title }, panel.meta),
    ),
    hero,
    middlePanels,
    bottomPanels,
  });
}

export function createDashboardCockpitState(response = {}) {
  const analytics = response?.analytics ?? null;
  const analyticsError = response?.analyticsError ?? null;
  const hero = buildHeroPanel(analytics, analyticsError);
  const middlePanels = [
    buildHistoricalTrendPanel(analytics, analyticsError),
    buildModeMixPanel(analytics, analyticsError),
  ];
  const bottomPanels = [buildFuzzyAhpPanel(), buildGeofenceEvidencePanel()];

  return composeCockpit({
    kpis: buildKpis(analytics, analyticsError),
    hero,
    middlePanels,
    bottomPanels,
  });
}

export function createDashboardCockpitErrorState(message) {
  const hero = createErrorPanel(HERO_PANEL_DEFINITION, message);
  const middlePanels = MIDDLE_PANEL_DEFINITIONS.map((panel) =>
    createErrorPanel(panel, message),
  );
  const bottomPanels = BOTTOM_PANEL_DEFINITIONS.map((panel) =>
    createErrorPanel(panel, message),
  );

  return composeCockpit({
    kpis: KPI_DEFINITIONS.map((panel) =>
      createErrorPanel(
        { key: panel.key, title: panel.title },
        message,
        panel.meta,
      ),
    ),
    hero,
    middlePanels,
    bottomPanels,
  });
}

export { DASHBOARD_PANEL_STATES };
