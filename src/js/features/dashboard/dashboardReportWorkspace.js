export const REPORT_WORKSPACE_STATES = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  EMPTY: "empty",
  NEEDS_DATA: "needsData",
  ERROR: "error",
});

const INSIGHT_DEFINITIONS = [
  ["totalRecords", "Total Records"],
  ["onTimeRatio", "On Time Ratio"],
  ["lateAlpha", "Late + Alpha"],
  ["dominantMode", "Dominant Work Mode"],
];

const VISUAL_DEFINITIONS = [
  ["attendanceTrend", "Attendance Trend"],
  ["workModeDistribution", "Work Mode Distribution"],
  ["statusDistribution", "Status Distribution"],
];

function createCard({
  key,
  title,
  state,
  value = null,
  detail = "",
  message = "",
  source = "active-summary-report",
  data = null,
}) {
  return {
    key,
    title,
    state,
    value,
    detail,
    message,
    source,
    data,
  };
}

function createCollection(definitions, createItem) {
  return definitions.map(([key, title]) => createItem(key, title));
}

function createLoadingCollection(definitions) {
  return createCollection(definitions, (key, title) =>
    createCard({
      key,
      title,
      state: REPORT_WORKSPACE_STATES.LOADING,
      message: "Loading report workspace data.",
    }),
  );
}

function createErrorCollection(definitions, message) {
  return createCollection(definitions, (key, title) =>
    createCard({
      key,
      title,
      state: REPORT_WORKSPACE_STATES.ERROR,
      message,
    }),
  );
}

function isFiniteCount(value) {
  return Number.isFinite(value);
}

function sumExplicitCounts(values) {
  return values.every(isFiniteCount)
    ? values.reduce((total, value) => total + value, 0)
    : null;
}

function formatPercent(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  return `${Math.round((value / total) * 100)}%`;
}

function buildTrendPoints(reportRows = []) {
  const grouped = reportRows.reduce((accumulator, row) => {
    if (!row?.attendance_date) {
      return accumulator;
    }

    accumulator[row.attendance_date] =
      (accumulator[row.attendance_date] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({ date, count }));
}

function buildStatusSegments(reportRows = []) {
  const grouped = reportRows.reduce((accumulator, row) => {
    const key = String(row?.status || "unknown").toLowerCase();
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(grouped).map(([key, count]) => ({
    key,
    label: key,
    value: count,
  }));
}

function buildModeSegments(summary = {}) {
  const counts = [summary.total_wfo, summary.total_wfh, summary.total_wfa];
  if (!counts.every(isFiniteCount)) {
    return null;
  }

  return [
    { key: "wfo", label: "WFO", value: summary.total_wfo },
    { key: "wfh", label: "WFH", value: summary.total_wfh },
    { key: "wfa", label: "WFA", value: summary.total_wfa },
  ];
}

function hasNonZeroSegment(modeSegments) {
  return Array.isArray(modeSegments)
    ? modeSegments.some((segment) => segment.value > 0)
    : false;
}

function getDominantMode(modeSegments) {
  if (!hasNonZeroSegment(modeSegments)) {
    return null;
  }

  return (
    [...modeSegments].sort((left, right) => right.value - left.value)[0] ?? null
  );
}

export function createDashboardReportWorkspaceLoadingState() {
  return {
    insights: createLoadingCollection(INSIGHT_DEFINITIONS),
    visuals: createLoadingCollection(VISUAL_DEFINITIONS),
  };
}

export function createDashboardReportWorkspaceErrorState(message) {
  return {
    insights: createErrorCollection(INSIGHT_DEFINITIONS, message),
    visuals: createErrorCollection(VISUAL_DEFINITIONS, message),
  };
}

export function createDashboardReportWorkspaceState({
  summary = {},
  reportRows = [],
  pagination = {},
} = {}) {
  const summaryTotal = sumExplicitCounts([
    summary.total_ontime,
    summary.total_late,
    summary.total_alpha,
  ]);
  const modeSegments = buildModeSegments(summary);
  const hasModeSegments = Array.isArray(modeSegments);
  const hasNonZeroModeSegments = hasNonZeroSegment(modeSegments);
  const trendPoints = buildTrendPoints(reportRows);
  const statusSegments = buildStatusSegments(reportRows);
  const totalRecords = Number.isFinite(pagination.total_records)
    ? pagination.total_records
    : null;
  const dominantMode = getDominantMode(modeSegments);

  return {
    insights: [
      totalRecords !== null
        ? createCard({
            key: "totalRecords",
            title: "Total Records",
            state: REPORT_WORKSPACE_STATES.READY,
            value: String(totalRecords),
            detail: "Record count from the active paginated report response.",
            source: "report.pagination.total_records",
          })
        : createCard({
            key: "totalRecords",
            title: "Total Records",
            state: REPORT_WORKSPACE_STATES.NEEDS_DATA,
            message:
              "The active report response shows visible rows, but the pagination total is unavailable for a truthful total-record count.",
            source: "report.pagination.total_records",
          }),
      summaryTotal !== null
        ? createCard({
            key: "onTimeRatio",
            title: "On Time Ratio",
            state: REPORT_WORKSPACE_STATES.READY,
            value: formatPercent(summary.total_ontime, summaryTotal) ?? "0%",
            detail:
              "Derived from the active summary counts, not a separate analytics contract.",
            source: "summary.total_ontime/total_late/total_alpha",
          })
        : createCard({
            key: "onTimeRatio",
            title: "On Time Ratio",
            state: REPORT_WORKSPACE_STATES.NEEDS_DATA,
            message:
              "The active summary response does not expose enough explicit counts to derive an on-time ratio safely.",
            source: "summary.total_ontime/total_late/total_alpha",
          }),
      summaryTotal !== null
        ? createCard({
            key: "lateAlpha",
            title: "Late + Alpha",
            state: REPORT_WORKSPACE_STATES.READY,
            value: String(summary.total_late + summary.total_alpha),
            detail:
              "Derived from explicit late and alpha counts in the active summary response.",
            source: "summary.total_late/total_alpha",
          })
        : createCard({
            key: "lateAlpha",
            title: "Late + Alpha",
            state: REPORT_WORKSPACE_STATES.NEEDS_DATA,
            message:
              "Late and alpha counts are not explicit enough to derive a combined report-risk total.",
            source: "summary.total_late/total_alpha",
          }),
      dominantMode
        ? createCard({
            key: "dominantMode",
            title: "Dominant Work Mode",
            state: REPORT_WORKSPACE_STATES.READY,
            value: dominantMode.label,
            detail:
              "Derived from explicit segmented work-mode counts in the active summary response.",
            source: "summary.total_wfo/total_wfh/total_wfa",
            data: { segments: modeSegments },
          })
        : hasModeSegments
          ? createCard({
              key: "dominantMode",
              title: "Dominant Work Mode",
              state: REPORT_WORKSPACE_STATES.EMPTY,
              message:
                "The active summary response exposes work-mode fields, but all explicit work-mode counts are zero.",
              source: "summary.total_wfo/total_wfh/total_wfa",
              data: { segments: modeSegments },
            })
          : createCard({
              key: "dominantMode",
              title: "Dominant Work Mode",
              state: REPORT_WORKSPACE_STATES.NEEDS_DATA,
              message:
                "Segmented work-mode counts are not available in the active summary response.",
              source: "summary.total_wfo/total_wfh/total_wfa",
            }),
    ],
    visuals: [
      trendPoints.length > 0
        ? createCard({
            key: "attendanceTrend",
            title: "Attendance Trend",
            state: REPORT_WORKSPACE_STATES.READY,
            detail: "Grouped from the current report rows only.",
            source: "active report rows",
            data: { points: trendPoints },
          })
        : createCard({
            key: "attendanceTrend",
            title: "Attendance Trend",
            state: REPORT_WORKSPACE_STATES.EMPTY,
            message:
              "There are no active report rows to group into a visible attendance trend.",
            source: "active report rows",
          }),
      hasNonZeroModeSegments
        ? createCard({
            key: "workModeDistribution",
            title: "Work Mode Distribution",
            state: REPORT_WORKSPACE_STATES.READY,
            detail: "Segmented from explicit summary mode counts.",
            source: "summary.total_wfo/total_wfh/total_wfa",
            data: { segments: modeSegments },
          })
        : hasModeSegments
          ? createCard({
              key: "workModeDistribution",
              title: "Work Mode Distribution",
              state: REPORT_WORKSPACE_STATES.EMPTY,
              message:
                "The active summary response exposes work-mode fields, but every explicit work-mode count is zero.",
              source: "summary.total_wfo/total_wfh/total_wfa",
              data: { segments: modeSegments },
            })
          : createCard({
              key: "workModeDistribution",
              title: "Work Mode Distribution",
              state: REPORT_WORKSPACE_STATES.NEEDS_DATA,
              message:
                "Segmented work-mode counts are unavailable for the active report period.",
              source: "summary.total_wfo/total_wfh/total_wfa",
            }),
      statusSegments.length > 0
        ? createCard({
            key: "statusDistribution",
            title: "Status Distribution",
            state: REPORT_WORKSPACE_STATES.READY,
            detail: "Grouped from the currently visible report rows.",
            source: "active report rows",
            data: { segments: statusSegments },
          })
        : createCard({
            key: "statusDistribution",
            title: "Status Distribution",
            state: REPORT_WORKSPACE_STATES.EMPTY,
            message: "There are no active report rows to summarize by status.",
            source: "active report rows",
          }),
    ],
  };
}
