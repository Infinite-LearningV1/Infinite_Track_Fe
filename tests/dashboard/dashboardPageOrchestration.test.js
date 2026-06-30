import test from "node:test";
import assert from "node:assert/strict";

import {
  createDashboardPageState,
  dashboard,
} from "../../src/js/features/dashboard/dashboard.js";

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
