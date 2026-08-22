import test from "node:test";
import assert from "node:assert/strict";
import { dashboard } from "../../src/js/features/dashboard/dashboard.js";

test("selecting WFA resolves range and uses dashboard transport", async () => {
  const component = dashboard();
  component.dashboardRangeState = {
    period: "custom",
    from: "2026-08-01",
    to: "2026-08-15",
  };
  component.dashboardRange = "custom";
  const calls = [];
  component.fetchDashboardFahpAnalysis = async (params) => {
    calls.push(params);
    return {
      success: true,
      data: {
        type: "wfa",
        status: "empty",
        requested_window: { from: params.from, to: params.to },
        criteria_weights: [
          { key: "location_type", value: 0.4 },
          { key: "distance_factor", value: 0.3 },
          { key: "facility_score", value: 0.3 },
        ],
        consistency: { CR: 0.06, threshold: 0.1, is_consistent: true },
        methodology: {
          version: "wfa_fahp_v1",
          weighting_method: "backend-authored",
        },
        ranking_preview: { top_n: 5, items: [] },
        evidence: {
          approved_booking_count: 0,
          analyzable_booking_count: 0,
          excluded_missing_snapshot_count: 0,
          excluded_incompatible_snapshot_count: 0,
          unique_location_count: 0,
          ranked_location_count: 0,
        },
      },
    };
  };
  component.applyCockpitSurfaceState = () => {};
  await component.selectFahpType("wfa");
  assert.equal(component.fahpFilterState.type, "wfa");
  assert.deepEqual(calls.at(-1), {
    type: "wfa",
    from: "2026-08-01",
    to: "2026-08-15",
  });
});

test("selecting WFA publishes loading state while the date-range request is pending", async () => {
  const component = dashboard();
  component.dashboardRangeState = {
    period: "custom",
    from: "2026-08-01",
    to: "2026-08-15",
  };
  component.dashboardRange = "custom";

  let resolveRequest;
  component.fetchDashboardFahpAnalysis = () =>
    new Promise((resolve) => {
      resolveRequest = resolve;
    });

  const pending = component.selectFahpType("wfa");
  await Promise.resolve();

  const pendingPanel = component.cockpit.bottomPanels.find(
    (item) => item.key === "fuzzyAhp",
  );
  assert.equal(pendingPanel.state, "loading");
  assert.equal(pendingPanel.data.activeType, "wfa");

  resolveRequest({
    success: true,
    data: {
      type: "wfa",
      status: "empty",
      requested_window: { from: "2026-08-01", to: "2026-08-15" },
      criteria_weights: [
        { key: "location_type", value: 0.4 },
        { key: "distance_factor", value: 0.3 },
        { key: "facility_score", value: 0.3 },
      ],
      consistency: { CR: 0.06, threshold: 0.1, is_consistent: true },
      methodology: {
        version: "wfa_fahp_v1",
        weighting_method: "backend-authored",
      },
      ranking_preview: { top_n: 5, items: [] },
      evidence: {
        approved_booking_count: 0,
        analyzable_booking_count: 0,
        excluded_missing_snapshot_count: 0,
        excluded_incompatible_snapshot_count: 0,
        unique_location_count: 0,
        ranked_location_count: 0,
      },
    },
  });
  await pending;
});

test("WFA range change invalidates stale result before refetch", async () => {
  const component = dashboard();
  component.fahpFilterState = { type: "wfa" };
  component.dashboardRange = "custom";
  component.dashboardRangeState = {
    period: "custom",
    from: "2026-08-01",
    to: "2026-08-15",
  };
  component.fuzzyAhpResponse = { stale: true };
  component.applyCockpitSurfaceState = () => {};
  component.showNotification = () => {};
  component.fetchSummaryReport = async () => ({
    summary: { total_ontime: 0, total_late: 0, total_alpha: 0 },
    report: { data: [], pagination: {} },
  });
  component.fetchDashboardAnalytics = async () => ({ analytics: {} });
  component.fetchGeofenceEvidence = async () => ({ data: {} });
  component.fetchTodayLocations = async () => ({ data: [] });
  const calls = [];
  component.fetchDashboardFahpAnalysis = async (params) => {
    calls.push(params);
    return {
      success: true,
      data: {
        type: "wfa",
        status: "empty",
        requested_window: params,
        criteria_weights: [
          { key: "location_type", value: 0.4 },
          { key: "distance_factor", value: 0.3 },
          { key: "facility_score", value: 0.3 },
        ],
        consistency: { CR: 0.06, threshold: 0.1, is_consistent: true },
        methodology: {
          version: "wfa_fahp_v1",
          weighting_method: "backend-authored",
        },
        ranking_preview: { top_n: 5, items: [] },
        evidence: {
          approved_booking_count: 0,
          analyzable_booking_count: 0,
          excluded_missing_snapshot_count: 0,
          excluded_incompatible_snapshot_count: 0,
          unique_location_count: 0,
          ranked_location_count: 0,
        },
      },
    };
  };
  component.dashboardRangeState = {
    period: "custom",
    from: "2026-08-03",
    to: "2026-08-09",
  };
  await component.onDashboardRangeChange();
  assert.deepEqual(calls.at(-1), {
    type: "wfa",
    from: "2026-08-03",
    to: "2026-08-09",
  });
  assert.equal(
    component.fuzzyAhpResponse.data.requested_window.from,
    "2026-08-03",
  );
});

import { createDashboardPageState } from "../../src/js/features/dashboard/dashboard.js";

test("loadDashboard keeps a rejected geofence fetch local while other slices still update", async () => {
  const page = createDashboardPageState({
    fetchHistorical: async () => ({ status: "ready", response: "historical" }),
    fetchGeofence: async () => {
      throw new Error("geofence request failed");
    },
    fetchLiveMap: async () => ({ status: "ready", response: "live-map" }),
    fetchFahpRecap: async () => ({ status: "ready", response: "fahp" }),
  });

  await page.loadDashboard();

  assert.deepEqual(page.historicalSlice, {
    status: "ready",
    response: "historical",
  });
  assert.equal(page.geofenceSlice.status, "error");
  assert.equal(page.geofenceSlice.error, "geofence request failed");
  assert.deepEqual(page.liveMapSlice, {
    status: "ready",
    response: "live-map",
  });
  assert.deepEqual(page.fahpSlice, {
    status: "ready",
    response: "fahp",
  });
});

test("loadExportData keeps canonical summary, period_summary, report, and analytics sections for export consumers", async () => {
  const component = dashboard();

  component.fetchSummaryReport = async () => ({
    summary: { total_ontime: 2, total_late: 1, total_alpha: 0 },
    period_summary: {
      attendance_rate: 71.77,
      average_discipline_score: 93.79,
      late_alpha_risk_users: 41,
      needs_attention_users: 38,
    },
    report: {
      data: [{ full_name: "Rina", user_id: 77, discipline_label: "Excellent" }],
      pagination: { total_records: 1 },
      user_attendance_summary: [{ full_name: "Rina Summary", user_id: 77 }],
    },
    analytics: {
      discipline_analysis: { average_discipline_score: 88 },
    },
  });

  const exportData = await component.loadExportData();

  assert.deepEqual(exportData.period_summary, {
    attendance_rate: 71.77,
    average_discipline_score: 93.79,
    late_alpha_risk_users: 41,
    needs_attention_users: 38,
  });
  assert.deepEqual(exportData.analytics, {
    discipline_analysis: { average_discipline_score: 88 },
  });
  assert.equal(
    exportData.report.user_attendance_summary[0].full_name,
    "Rina Summary",
  );
});

test("ensureExportDatasetComplete throws canonical contract error when total metadata is missing", () => {
  const component = dashboard();

  assert.throws(
    () =>
      component.ensureExportDatasetComplete({
        report: { data: [{}], pagination: {} },
      }),
    /Export data completeness could not be verified for the selected period/,
  );
});

test("selectExportFormat only updates local selection and does not export immediately", () => {
  const component = dashboard();

  component.selectExportFormat("excel");

  assert.equal(component.selectedExportFormat, "excel");
  assert.equal(component.isExporting, false);
});

test("confirmExport uses the selected format and closes modal on success", async () => {
  const component = dashboard();
  component.isExportModalOpen = true;
  component.selectedExportFormat = "excel";
  component.exportToExcel = async () => true;

  const result = await component.confirmExport();

  assert.equal(result, true);
  assert.equal(component.isExportModalOpen, false);
  assert.equal(component.exportInlineError, null);
});

test("confirmExport sets inline error when format is missing", async () => {
  const component = dashboard();
  component.selectedExportFormat = null;

  const result = await component.confirmExport();

  assert.equal(result, false);
  assert.equal(
    component.exportInlineError,
    "Select an export format before continuing.",
  );
});

test("refreshFahpRecap refetches only the FAHP slice without reloading the dashboard", async () => {
  const calls = [];
  let fahpResponses = 0;
  const page = createDashboardPageState({
    fetchHistorical: async () => {
      calls.push("historical");
      return { status: "ready", response: "historical" };
    },
    fetchGeofence: async () => {
      calls.push("geofence");
      return { status: "ready", response: "geofence" };
    },
    fetchLiveMap: async () => {
      calls.push("liveMap");
      return { status: "ready", response: "live-map" };
    },
    fetchFahpRecap: async () => {
      calls.push("fahp");
      fahpResponses += 1;
      return { status: "ready", response: `fahp-${fahpResponses}` };
    },
  });

  await page.loadDashboard();
  assert.deepEqual(calls, ["historical", "geofence", "liveMap", "fahp"]);
  assert.equal(page.fahpSlice.response, "fahp-1");

  calls.length = 0;
  await page.refreshFahpRecap();

  assert.deepEqual(calls, ["fahp"]);
  assert.deepEqual(page.historicalSlice, {
    status: "ready",
    response: "historical",
  });
  assert.deepEqual(page.geofenceSlice, {
    status: "ready",
    response: "geofence",
  });
  assert.deepEqual(page.liveMapSlice, {
    status: "ready",
    response: "live-map",
  });
  assert.equal(page.fahpSlice.response, "fahp-2");
});
