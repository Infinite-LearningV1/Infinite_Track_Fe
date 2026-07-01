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
import { buildFahpDashboardRecapViewModel } from "./dashboard/fahpRecapSlice.js";

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

const FUZZY_AHP_SOURCE_KEY = "analysis.fuzzy-ahp";
const FUZZY_AHP_TYPE_OPTIONS = Object.freeze([
  { key: "discipline", title: "Discipline" },
  { key: "wfa", title: "WFA" },
  { key: "smart_ac", title: "Smart AC" },
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
  const statusModeCandidate =
    typeof point?.status === "string" ? point.status.trim().toUpperCase() : null;
  const inferredStatusMode =
    statusModeCandidate === "WFO" ||
    statusModeCandidate === "WFH" ||
    statusModeCandidate === "WFA"
      ? statusModeCandidate
      : null;
  const mode = firstPresentValue(
    point?.mode,
    point?.work_mode,
    inferredStatusMode,
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
    attendanceDate: point?.attendance_date || point?.date || null,
    timeIn: point?.time_in || point?.check_in_time || null,
    timeOut: point?.time_out || point?.check_out_time || null,
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

function createHistoricalAnalyticsResponseEnvelope(analytics = null) {
  return analytics && typeof analytics === "object" && !Array.isArray(analytics)
    ? { data: analytics }
    : null;
}

function getExecutiveKpis(analytics = null) {
  const executiveKpis = buildHistoricalAnalyticsViewModel(
    createHistoricalAnalyticsResponseEnvelope(analytics),
  ).kpis;

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
  const modeMix = buildHistoricalAnalyticsViewModel(
    createHistoricalAnalyticsResponseEnvelope(analytics),
  ).modeMix;

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
  const trendPayload = buildHistoricalAnalyticsViewModel(
    createHistoricalAnalyticsResponseEnvelope(analytics),
  ).trend;

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
    return createPanel({
      ...getMiddlePanelDefinition("historicalTrend"),
      state: DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      message:
        "Historical attendance trend waits for explicit dashboard analytics historical_trend.",
      note: "Web FE will not derive trend from summary totals or use preview chart data.",
      data: null,
    });
  }

  if (!hasExplicitAnalyticsField(analytics, "historical_trend")) {
    return createPanel({
      ...getMiddlePanelDefinition("historicalTrend"),
      state: DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      message:
        "Historical attendance trend waits for explicit dashboard analytics historical_trend.",
      note: "Web FE will not derive trend from summary totals or use preview chart data.",
      data: null,
    });
  }

  const normalizedTrend = normalizeHistoricalTrend(analytics);

  if (!normalizedTrend) {
    return createPanel({
      ...getMiddlePanelDefinition("historicalTrend"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Historical attendance trend backend payload is invalid; historical_trend must be an object with explicit points.",
      note: "Web FE will not substitute preview ranges when backend trend payload is malformed.",
      data: null,
    });
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

function normalizeFuzzyAhpResponse(fuzzyAhpResponse = null) {
  if (fuzzyAhpResponse === null || typeof fuzzyAhpResponse === "undefined") {
    return null;
  }

  if (typeof fuzzyAhpResponse !== "object" || Array.isArray(fuzzyAhpResponse)) {
    return false;
  }

  const viewModel = buildFahpDashboardRecapViewModel(fuzzyAhpResponse);

  return {
    ...viewModel,
    source: FUZZY_AHP_SOURCE_KEY,
  };
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

function buildFuzzyAhpUpdatedAtLabel(fuzzyAhp) {
  if (!fuzzyAhp?.generatedAt) {
    return "Menunggu pembaruan backend Fuzzy AHP";
  }

  const timezoneLabel = fuzzyAhp.timezone ? ` (${fuzzyAhp.timezone})` : "";
  return `Backend generated at ${fuzzyAhp.generatedAt}${timezoneLabel}`;
}

function buildFuzzyAhpDecisionPayload(fuzzyAhp) {
  return {
    key: fuzzyAhp.type || "discipline",
    title: fuzzyAhp.typeLabel || fuzzyAhp.type || "Fuzzy AHP",
    summary:
      fuzzyAhp.consistency?.summaryLabel ||
      "Decision support output is shown only from the explicit backend Fuzzy AHP feed.",
    consistencyRatio: fuzzyAhp.consistency?.CR ?? null,
    consistencyThreshold: fuzzyAhp.consistency?.threshold ?? null,
    consistencyStatus:
      fuzzyAhp.consistency?.summaryLabel ||
      (fuzzyAhp.consistency?.isConsistent ? "Consistent" : "Needs Review"),
    isConsistent: Boolean(fuzzyAhp.consistency?.isConsistent),
    updatedAtLabel: buildFuzzyAhpUpdatedAtLabel(fuzzyAhp),
    criteriaWeights: fuzzyAhp.criteriaWeights.map((criterion) => ({
      label: criterion.display_label || criterion.label || criterion.key,
      weight: criterion.value,
    })),
    rankings: Array.isArray(fuzzyAhp.rankingPreview?.items)
      ? fuzzyAhp.rankingPreview.items.map((item, index) => ({
          label: item.label || `Alternative ${index + 1}`,
          score: item.score,
        }))
      : [],
    distribution: fuzzyAhp.distribution || null,
  };
}

function createFuzzyAhpFallbackData(activeType = "discipline") {
  return {
    typeOptions: FUZZY_AHP_TYPE_OPTIONS,
    activeType,
  };
}

function buildExplicitFuzzyAhpPanel(fuzzyAhp = null, fuzzyAhpError = null) {
  if (fuzzyAhpError) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.ERROR,
      message: `${getAnalyticsErrorMessage(fuzzyAhpError)} Fuzzy AHP output remains unavailable until the explicit backend feed succeeds.`,
      note: "Web FE will not fabricate criteria, weights, or ranking from summary or analytics sources.",
      data: createFuzzyAhpFallbackData(),
    });
  }

  if (fuzzyAhp === null) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      message:
        "Fuzzy AHP waits for the explicit analysis.fuzzy-ahp dashboard backend feed.",
      note: "No dummy criteria, weights, rankings, or preview decisions are used as runtime Fuzzy AHP truth.",
      data: createFuzzyAhpFallbackData(),
    });
  }

  if (fuzzyAhp === false) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Fuzzy AHP backend payload is invalid; expected an explicit object response.",
      note: "Web FE will not coerce non-object Fuzzy AHP payloads into decision support output.",
      data: createFuzzyAhpFallbackData(),
    });
  }

  if (!fuzzyAhp.status) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Fuzzy AHP backend payload is incomplete; status must be present for the dashboard recap contract.",
      note: "Web FE will not treat malformed Fuzzy AHP recap payloads as empty backend output.",
      data: {
        ...createFuzzyAhpFallbackData(fuzzyAhp.type || "discipline"),
        ...fuzzyAhp,
      },
    });
  }

  if (fuzzyAhp.needsData) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Fuzzy AHP backend payload reports needs_data for this dashboard scope.",
      note: "Decision support output is shown only from the explicit backend Fuzzy AHP feed.",
      data: {
        ...createFuzzyAhpFallbackData(fuzzyAhp.type || "discipline"),
        ...fuzzyAhp,
      },
    });
  }

  if (fuzzyAhp.status === "empty") {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.EMPTY,
      message:
        "Fuzzy AHP backend feed returned no recap output for this dashboard scope.",
      note: "Web FE will not substitute dummy Fuzzy AHP decisions for empty backend output.",
      data: {
        ...createFuzzyAhpFallbackData(fuzzyAhp.type || "discipline"),
        ...fuzzyAhp,
      },
    });
  }

  if (!Array.isArray(fuzzyAhp.criteriaWeights) || fuzzyAhp.criteriaWeights.length === 0) {
    return createPanel({
      ...getBottomPanelDefinition("fuzzyAhp"),
      state: DASHBOARD_PANEL_STATES.NEEDS_DATA,
      message:
        "Fuzzy AHP backend payload is incomplete; criteria_weights must include explicit final dashboard weights.",
      note: "Web FE will not fabricate criteria weights from legacy sections or summary data.",
      data: {
        ...createFuzzyAhpFallbackData(fuzzyAhp.type || "discipline"),
        ...fuzzyAhp,
      },
    });
  }

  const decisionPayload = buildFuzzyAhpDecisionPayload(fuzzyAhp);

  return createPanel({
    ...getBottomPanelDefinition("fuzzyAhp"),
    state: DASHBOARD_PANEL_STATES.READY,
    detail: Number.isFinite(fuzzyAhp.consistency?.CR)
      ? `Explicit backend Fuzzy AHP ${fuzzyAhp.typeLabel || fuzzyAhp.type || "recap"} returned ${fuzzyAhp.criteriaWeights.length} criteria weight(s); CR value is ${formatNumericValue(fuzzyAhp.consistency.CR, 2)}.`
      : `Explicit backend Fuzzy AHP ${fuzzyAhp.typeLabel || fuzzyAhp.type || "recap"} returned ${fuzzyAhp.criteriaWeights.length} criteria weight(s).`,
    note: "Decision support output is shown only from the explicit backend Fuzzy AHP feed.",
    data: {
      ...fuzzyAhp,
      typeOptions: FUZZY_AHP_TYPE_OPTIONS,
      activeType: decisionPayload.key,
      activeDecisionKey: decisionPayload.key,
      decisions: [decisionPayload],
      updatedAtLabel: decisionPayload.updatedAtLabel,
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
      state: DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
      message:
        "Geofence evidence waits for the explicit attendance.geofence-evidence backend feed.",
      note: "No dummy geofence evidence is used as runtime attendance-supporting truth.",
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
    note:
      geofenceEvidence.operationalContext.dashboard_note ||
      "Geofence events are supporting evidence only; they never become final attendance truth.",
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
