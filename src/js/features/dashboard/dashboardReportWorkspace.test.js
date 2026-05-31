import test from "node:test";
import assert from "node:assert/strict";
import {
  REPORT_WORKSPACE_STATES,
  createDashboardReportWorkspaceErrorState,
  createDashboardReportWorkspaceLoadingState,
  createDashboardReportWorkspaceState,
} from "./dashboardReportWorkspace.js";

test("report workspace loading state exposes four insight cards", () => {
  const workspace = createDashboardReportWorkspaceLoadingState();

  assert.deepEqual(
    workspace.insights.map((card) => card.key),
    ["totalRecords", "onTimeRatio", "lateAlpha", "dominantMode"],
  );
  assert.ok(
    workspace.insights.every(
      (card) => card.state === REPORT_WORKSPACE_STATES.LOADING,
    ),
  );
  assert.ok(
    workspace.visuals.every(
      (chart) => chart.state === REPORT_WORKSPACE_STATES.LOADING,
    ),
  );
});

test("report workspace derives summary insights from explicit report summary fields", () => {
  const workspace = createDashboardReportWorkspaceState({
    summary: {
      total_ontime: 8,
      total_late: 1,
      total_alpha: 1,
      total_wfo: 6,
      total_wfh: 3,
      total_wfa: 1,
    },
    reportRows: [
      { attendance_date: "2026-05-01", status: "ontime", information: "WFO" },
      { attendance_date: "2026-05-01", status: "late", information: "WFH" },
      { attendance_date: "2026-05-02", status: "alpha", information: "WFA" },
    ],
    pagination: {
      total_records: 10,
      current_page: 1,
      per_page: 5,
    },
  });

  const totalRecords = workspace.insights.find(
    (card) => card.key === "totalRecords",
  );
  const onTimeRatio = workspace.insights.find(
    (card) => card.key === "onTimeRatio",
  );
  const dominantMode = workspace.insights.find(
    (card) => card.key === "dominantMode",
  );
  const attendanceTrend = workspace.visuals.find(
    (chart) => chart.key === "attendanceTrend",
  );

  assert.equal(totalRecords.state, REPORT_WORKSPACE_STATES.READY);
  assert.equal(totalRecords.value, "10");
  assert.equal(onTimeRatio.state, REPORT_WORKSPACE_STATES.READY);
  assert.equal(onTimeRatio.value, "80%");
  assert.match(onTimeRatio.detail, /active summary counts/i);
  assert.match(onTimeRatio.detail, /not a separate analytics contract/i);
  assert.equal(dominantMode.value, "WFO");
  assert.equal(attendanceTrend.state, REPORT_WORKSPACE_STATES.READY);
  assert.deepEqual(
    attendanceTrend.data.points.map((point) => point.count),
    [2, 1],
  );
});

test("report workspace keeps unavailable visuals truthful when report rows are missing", () => {
  const workspace = createDashboardReportWorkspaceState({
    summary: {},
    reportRows: [],
    pagination: {
      total_records: 0,
      current_page: 1,
      per_page: 5,
    },
  });

  const onTimeRatio = workspace.insights.find(
    (card) => card.key === "onTimeRatio",
  );
  const attendanceTrend = workspace.visuals.find(
    (chart) => chart.key === "attendanceTrend",
  );

  assert.equal(onTimeRatio.state, REPORT_WORKSPACE_STATES.NEEDS_DATA);
  assert.equal(attendanceTrend.state, REPORT_WORKSPACE_STATES.EMPTY);
  assert.match(attendanceTrend.message, /active report rows/i);
});

test("report workspace keeps explicit zero on-time ratio truthful when summary counts are present", () => {
  const workspace = createDashboardReportWorkspaceState({
    summary: {
      total_ontime: 0,
      total_late: 2,
      total_alpha: 1,
      total_wfo: 1,
      total_wfh: 1,
      total_wfa: 1,
    },
    reportRows: [],
    pagination: {
      total_records: 3,
      current_page: 1,
      per_page: 5,
    },
  });

  const onTimeRatio = workspace.insights.find(
    (card) => card.key === "onTimeRatio",
  );

  assert.equal(onTimeRatio.state, REPORT_WORKSPACE_STATES.READY);
  assert.equal(onTimeRatio.value, "0%");
});

test("report workspace does not invent a dominant work mode when all explicit mode counts are zero", () => {
  const workspace = createDashboardReportWorkspaceState({
    summary: {
      total_ontime: 0,
      total_late: 0,
      total_alpha: 0,
      total_wfo: 0,
      total_wfh: 0,
      total_wfa: 0,
    },
    reportRows: [],
    pagination: {
      total_records: 0,
      current_page: 1,
      per_page: 5,
    },
  });

  const dominantMode = workspace.insights.find(
    (card) => card.key === "dominantMode",
  );
  const workModeDistribution = workspace.visuals.find(
    (chart) => chart.key === "workModeDistribution",
  );

  assert.equal(dominantMode.state, REPORT_WORKSPACE_STATES.EMPTY);
  assert.match(dominantMode.message, /all explicit work-mode counts are zero/i);
  assert.equal(workModeDistribution.state, REPORT_WORKSPACE_STATES.EMPTY);
});

test("report workspace does not label visible row count as total records without pagination total", () => {
  const workspace = createDashboardReportWorkspaceState({
    summary: {
      total_ontime: 1,
      total_late: 0,
      total_alpha: 0,
      total_wfo: 1,
      total_wfh: 0,
      total_wfa: 0,
    },
    reportRows: [
      { attendance_date: "2026-05-01", status: "ontime", information: "WFO" },
      { attendance_date: "2026-05-02", status: "ontime", information: "WFO" },
    ],
    pagination: {
      current_page: 1,
      per_page: 5,
    },
  });

  const totalRecords = workspace.insights.find(
    (card) => card.key === "totalRecords",
  );

  assert.equal(totalRecords.state, REPORT_WORKSPACE_STATES.NEEDS_DATA);
  assert.match(totalRecords.message, /pagination total is unavailable/i);
});

test("report workspace error state isolates the full report shell", () => {
  const workspace = createDashboardReportWorkspaceErrorState(
    "report request failed",
  );

  assert.ok(
    workspace.insights.every(
      (card) => card.state === REPORT_WORKSPACE_STATES.ERROR,
    ),
  );
  assert.ok(
    workspace.visuals.every(
      (chart) => chart.state === REPORT_WORKSPACE_STATES.ERROR,
    ),
  );
});
