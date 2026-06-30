import test from "node:test";
import assert from "node:assert/strict";
import {
  DASHBOARD_PANEL_STATES,
  createDashboardCockpitErrorState,
  createDashboardCockpitLoadingState,
  createDashboardCockpitState,
  createDashboardCockpitStateFromSources,
} from "./dashboardCockpitService.js";

function createMapContext(points, status = "ready") {
  return { status, points };
}

test("cockpit loading state marks every panel as loading", () => {
  const cockpit = createDashboardCockpitLoadingState();

  assert.ok(
    cockpit.kpis.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.LOADING,
    ),
  );
  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.LOADING);
  assert.ok(
    cockpit.middlePanels.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.LOADING,
    ),
  );
  assert.ok(
    cockpit.bottomPanels.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.LOADING,
    ),
  );
  assert.ok(
    cockpit.panels.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.LOADING,
    ),
  );
});

test("geofence evidence view model preserves dedicated operational context", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    geofenceEvidenceResponse: {
      data: {
        status: "ready",
        needs_data: false,
        authority: "attendance.geofence-evidence",
        final_attendance_authority: "attendance records",
        reason: "Dedicated endpoint available",
        window: { from: "2026-06-01", to: "2026-06-30" },
        raw_counts: {
          total_events: 10,
          enter_events: 6,
          exit_events: 4,
          unique_users: 5,
        },
        operational_context: {
          activity_label: "Morning attendance",
          activity_note: "Using dedicated evidence feed",
          enter_context: "6 enters detected",
          exit_context: "4 exits detected",
          dashboard_note: "Backend truth only",
        },
      },
    },
  });

  const panel = cockpit.bottomPanels.find((entry) => entry.key === "geofenceEvidence");
  assert.equal(panel.state, DASHBOARD_PANEL_STATES.READY);
  assert.match(panel.note, /backend truth only/i);
});

test("cockpit source boundary ignores legacy embedded analytics in report response", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    reportResponse: {
      summary: {
        total_ontime: 21,
        total_late: 19,
        total_alpha: 0,
      },
      analytics: {
        executive_kpis: {
          avg_discipline: 78.5,
        },
        historical_trend: {
          points: [
            {
              date: "2026-04-01",
              on_time: 21,
              late: 5,
              alpha: 1,
            },
          ],
        },
      },
    },
  });

  const averageDiscipline = cockpit.kpis.find(
    (panel) => panel.key === "averageDiscipline",
  );
  const historicalTrend = cockpit.middlePanels.find(
    (panel) => panel.key === "historicalTrend",
  );

  assert.equal(
    averageDiscipline.state,
    DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
  );
  assert.equal(averageDiscipline.value, null);
  assert.equal(historicalTrend.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.equal(historicalTrend.data?.isPreview, true);
  assert.equal(historicalTrend.data?.source, "dummy-preview");
});

test("cockpit average discipline comes from executive_kpis.avg_discipline instead of legacy discipline_index", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    analyticsResponse: {
      data: {
        executive_kpis: {
          avg_discipline: 88.25,
          discipline_index: 12,
          raw_counts: {
            discipline_users_analyzed: 4,
          },
        },
      },
    },
  });

  const averageDiscipline = cockpit.kpis.find(
    (panel) => panel.key === "averageDiscipline",
  );

  assert.equal(averageDiscipline.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(averageDiscipline.value, "88.3");
  assert.match(averageDiscipline.detail, /avg_discipline/);
  assert.doesNotMatch(averageDiscipline.detail, /discipline index/i);
});

test("cockpit source boundary accepts explicit analytics response", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    reportResponse: {
      summary: {
        total_ontime: 21,
        total_late: 19,
        total_alpha: 0,
      },
    },
    analyticsResponse: {
      data: {
        executive_kpis: {
          avg_discipline: 78.5,
        },
      },
    },
  });

  const averageDiscipline = cockpit.kpis.find(
    (panel) => panel.key === "averageDiscipline",
  );

  assert.equal(averageDiscipline.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(averageDiscipline.value, "78.5");
});

test("cockpit surfaces explicit analytics request failures without pretending data is merely pending", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    reportResponse: {
      summary: {
        total_ontime: 21,
        total_late: 19,
        total_alpha: 0,
      },
    },
    analyticsError: new Error("analytics request failed"),
  });

  const averageDiscipline = cockpit.kpis.find(
    (panel) => panel.key === "averageDiscipline",
  );
  const historicalTrend = cockpit.middlePanels.find(
    (panel) => panel.key === "historicalTrend",
  );

  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.ERROR);
  assert.equal(cockpit.hero.data, null);
  assert.match(cockpit.hero.message, /analytics request failed/i);
  assert.match(
    cockpit.hero.note,
    /will not fall back to historical report-row coordinates/i,
  );
  assert.equal(averageDiscipline.state, DASHBOARD_PANEL_STATES.ERROR);
  assert.match(averageDiscipline.message, /analytics request failed/i);
  assert.equal(historicalTrend.state, DASHBOARD_PANEL_STATES.ERROR);
  assert.equal(historicalTrend.data, null);
  assert.match(historicalTrend.message, /analytics request failed/i);
  assert.match(
    historicalTrend.note,
    /will not derive trend from summary totals/i,
  );
});

test("cockpit historical trend becomes ready only with explicit backend points", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    reportResponse: {
      summary: {
        total_ontime: 21,
        total_late: 19,
        total_alpha: 0,
      },
    },
    analyticsResponse: {
      data: {
        historical_trend: {
          points: [
            { date: "2026-04-15", on_time: 68, late: 8, alpha: 1 },
            { attendance_date: "2026-04-01", onTime: 60, late: 12, alpha: 0 },
            { date: "2026-04-08", on_time: 64, late: 10, alpha: 2 },
          ],
        },
      },
    },
  });

  const historicalTrend = cockpit.middlePanels.find(
    (panel) => panel.key === "historicalTrend",
  );
  const selectedWindowRange = historicalTrend.data.ranges[0];

  assert.equal(historicalTrend.subtitle, "");
  assert.equal(historicalTrend.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(historicalTrend.data.isPreview, false);
  assert.equal(
    historicalTrend.data.source,
    "backend/dashboard-analytics.points",
  );
  assert.equal(historicalTrend.data.defaultRangeKey, "selectedWindow");
  assert.equal(historicalTrend.detail, "");
  assert.equal(historicalTrend.note, "");
  assert.equal(selectedWindowRange.key, "selectedWindow");
  assert.equal(selectedWindowRange.label, "Selected Window");
  assert.deepEqual(selectedWindowRange.xAxisLabels, [
    "01 Apr",
    "08 Apr",
    "15 Apr",
  ]);
  assert.deepEqual(selectedWindowRange.yAxisLabels, [
    "100",
    "80",
    "60",
    "40",
    "20",
    "0",
  ]);
  assert.deepEqual(
    selectedWindowRange.series.map((series) => series.key),
    ["ontime", "late", "alpha"],
  );
  assert.deepEqual(
    selectedWindowRange.metrics.map((metric) => metric.key),
    ["ontime", "late", "alpha"],
  );
  assert.equal(
    selectedWindowRange.series.find((series) => series.key === "alpha")
      .points[0].value,
    0,
  );
  assert.equal(selectedWindowRange.series[0].points[0].x, 24);
  assert.equal(selectedWindowRange.series[0].points[1].x, 486);
  assert.equal(selectedWindowRange.series[0].points[2].x, 948);
  assert.deepEqual(selectedWindowRange.plotArea, {
    leftX: 24,
    rightX: 948,
    topY: 20,
    baselineY: 185,
    viewBoxWidth: 992,
    viewBoxHeight: 220,
  });
  assert.deepEqual(
    selectedWindowRange.hoverPoints.map((point) => ({
      index: point.index,
      label: point.label,
      x: point.x,
      keys: point.items.map((item) => item.key),
    })),
    [
      {
        index: 0,
        label: "On Time",
        x: 24,
        keys: ["ontime", "late", "alpha"],
      },
      {
        index: 1,
        label: "On Time",
        x: 486,
        keys: ["ontime", "late", "alpha"],
      },
      {
        index: 2,
        label: "On Time",
        x: 948,
        keys: ["ontime", "late", "alpha"],
      },
    ],
  );
});

test("cockpit historical trend reduces long backend windows to weekly chart cadence", () => {
  const dailyPoints = Array.from({ length: 29 }, (_, index) => ({
    date: `2026-06-${String(index + 1).padStart(2, "0")}`,
    on_time: 60 + index,
    late: 20 + (index % 4),
    alpha: index % 3,
  }));

  const cockpit = createDashboardCockpitStateFromSources({
    analyticsResponse: {
      data: {
        historical_trend: {
          points: dailyPoints,
        },
      },
    },
  });

  const historicalTrend = cockpit.middlePanels.find(
    (panel) => panel.key === "historicalTrend",
  );
  const selectedWindowRange = historicalTrend.data.ranges[0];

  assert.equal(historicalTrend.state, DASHBOARD_PANEL_STATES.READY);
  assert.deepEqual(selectedWindowRange.xAxisLabels, [
    "01 Jun",
    "08 Jun",
    "15 Jun",
    "22 Jun",
    "29 Jun",
  ]);
  assert.equal(selectedWindowRange.series[0].points.length, 5);
  assert.equal(selectedWindowRange.series[1].points.length, 5);
  assert.equal(selectedWindowRange.series[2].points.length, 5);
});

test("cockpit historical trend stays conservative when backend points are incomplete", () => {
  const cockpit = createDashboardCockpitState({
    analytics: {
      historical_trend: {
        points: [
          {
            date: "2026-04-01",
            on_time: 21,
            late: 5,
          },
        ],
      },
    },
  });

  const historicalTrend = cockpit.middlePanels.find(
    (panel) => panel.key === "historicalTrend",
  );

  assert.equal(historicalTrend.state, DASHBOARD_PANEL_STATES.NEEDS_DATA);
  assert.equal(historicalTrend.data, null);
  assert.match(
    historicalTrend.message,
    /invalid historical_trend\.points values/i,
  );
  assert.match(
    historicalTrend.note,
    /will not derive trend from summary totals/i,
  );
});

test("cockpit historical trend rejects invalid backend dates", () => {
  const cockpit = createDashboardCockpitState({
    analytics: {
      historical_trend: {
        points: [
          {
            date: "2026-04-31",
            on_time: 21,
            late: 5,
            alpha: 1,
          },
        ],
      },
    },
  });

  const historicalTrend = cockpit.middlePanels.find(
    (panel) => panel.key === "historicalTrend",
  );

  assert.equal(historicalTrend.state, DASHBOARD_PANEL_STATES.NEEDS_DATA);
  assert.equal(historicalTrend.data, null);
  assert.match(
    historicalTrend.message,
    /invalid historical_trend\.points values/i,
  );
  assert.match(
    historicalTrend.note,
    /will not derive trend from summary totals/i,
  );
});

test("cockpit historical trend rejects negative backend counts", () => {
  const cockpit = createDashboardCockpitState({
    analytics: {
      historical_trend: {
        points: [
          {
            date: "2026-04-01",
            on_time: 21,
            late: 5,
            alpha: -1,
          },
        ],
      },
    },
  });

  const historicalTrend = cockpit.middlePanels.find(
    (panel) => panel.key === "historicalTrend",
  );

  assert.equal(historicalTrend.state, DASHBOARD_PANEL_STATES.NEEDS_DATA);
  assert.equal(historicalTrend.data, null);
  assert.match(
    historicalTrend.message,
    /invalid historical_trend\.points values/i,
  );
  assert.match(
    historicalTrend.note,
    /will not derive trend from summary totals/i,
  );
});

test("cockpit state derives only explicit analytics-backed metrics", () => {
  const cockpit = createDashboardCockpitState({
    summary: {
      total_ontime: 21,
      total_late: 19,
      total_alpha: 0,
      total_wfo: 10,
      total_wfh: 11,
      total_wfa: 13,
    },
    analytics: {
      executive_kpis: {
        attendance_rate: 100,
        late_alpha_risk: 47.5,
        avg_discipline: 78.5,
        raw_counts: {
          total_attendance_records: 40,
          total_present: 40,
          total_on_time: 21,
          total_late: 19,
          total_alpha: 0,
        },
      },
      mode_mix: {
        totals: {
          wfo: 10,
          wfh: 11,
          wfa: 13,
        },
      },
      map_context: {
        status: "ready",
        summary: { total_points: 2 },
        geofence_context: { source: "backend" },
        points: [
          {
            id: "point_001",
            attendance_id: "att_001",
            user_id: "user_001",
            label: "Kantor Palu",
            user_name: "Andi Wijaya",
            email: "andi@example.test",
            role: "Employee",
            phone_number: "081234567890",
            mode: "WFO",
            status: "ontime",
            attendance_date: "2026-05-03",
            time_in: "08:00:00",
            time_out: "17:00:00",
            coordinates: { latitude: -0.9, longitude: 119.8 },
            radius: 100,
            description: "Kantor Palu",
          },
          {
            id: "point_002",
            label: "Budi Tanpa Koordinat",
          },
        ],
      },
    },
    report: {
      data: [],
    },
  });

  const attendanceRate = cockpit.kpis.find(
    (panel) => panel.key === "attendanceRate",
  );
  const lateAlphaRisk = cockpit.kpis.find(
    (panel) => panel.key === "lateAlphaRisk",
  );
  const averageDiscipline = cockpit.kpis.find(
    (panel) => panel.key === "averageDiscipline",
  );
  const needsAttention = cockpit.kpis.find(
    (panel) => panel.key === "needsAttention",
  );
  const hero = cockpit.hero;
  const historicalTrend = cockpit.middlePanels.find(
    (panel) => panel.key === "historicalTrend",
  );
  const modeMix = cockpit.middlePanels.find((panel) => panel.key === "modeMix");
  const fuzzyAhp = cockpit.bottomPanels.find(
    (panel) => panel.key === "fuzzyAhp",
  );
  const geofenceEvidence = cockpit.bottomPanels.find(
    (panel) => panel.key === "geofenceEvidence",
  );

  assert.equal(attendanceRate.title, "Attendance Rate");
  assert.equal(attendanceRate.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(attendanceRate.value, "100%");
  assert.match(attendanceRate.detail, /40 present records/);
  assert.match(attendanceRate.detail, /21 on time, 19 late/);

  assert.equal(lateAlphaRisk.title, "Late / Alpha Risk");
  assert.equal(lateAlphaRisk.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(lateAlphaRisk.value, "19");
  assert.match(
    lateAlphaRisk.detail,
    /47\.5% of explicit analytics attendance records/,
  );

  assert.equal(averageDiscipline.title, "Avg Discipline");
  assert.equal(averageDiscipline.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(averageDiscipline.value, "78.5");

  assert.equal(needsAttention.title, "Needs Attention");
  assert.equal(needsAttention.state, DASHBOARD_PANEL_STATES.NEEDS_DATA);
  assert.match(needsAttention.message, /not available in dashboard analytics/i);

  assert.equal(hero.key, "mapContext");
  assert.equal(hero.title, "Map View");
  assert.doesNotMatch(hero.title, /live map/i);
  assert.equal(hero.state, DASHBOARD_PANEL_STATES.READY);
  assert.match(hero.message, /1 backend map_context point/i);
  assert.match(hero.note, /dashboard analytics snapshot/i);
  assert.match(
    hero.note,
    /not continuous tracking or filtered report\/export history/i,
  );
  assert.equal(hero.data.locations.length, 1);
  assert.equal(hero.data.unavailableCount, 1);
  assert.equal(hero.data.totalRows, 2);
  assert.equal(hero.data.source, "dashboard-analytics.map_context");
  assert.equal(hero.data.backendStatus, "ready");
  assert.deepEqual(hero.data.summary, { total_points: 2 });
  assert.deepEqual(hero.data.geofenceContext, { source: "backend" });
  assert.equal(hero.data.tileProvider, "OpenStreetMap");
  assert.deepEqual(hero.data.locations[0], {
    key: "point_001",
    pointId: "point_001",
    attendanceId: "att_001",
    userId: "user_001",
    label: "Kantor Palu",
    userName: "Andi Wijaya",
    fullName: "Andi Wijaya",
    email: "andi@example.test",
    roleName: "Employee",
    phoneNumber: "081234567890",
    mode: "WFO",
    modeColor: "#2563eb",
    status: "ontime",
    information: "WFO",
    attendanceDate: "2026-05-03",
    timeIn: "08:00:00",
    timeOut: "17:00:00",
    latitude: -0.9,
    longitude: 119.8,
    radius: 100,
    description: "Kantor Palu",
    source: "dashboard-analytics.map_context",
    sourceNote:
      "Map context is a backend analytics snapshot for dashboard context.",
    trackingNote:
      "Markers reflect snapshot context only; they are not continuous tracking or filtered report/export history.",
  });
  assert.equal(historicalTrend.subtitle, "");
  assert.equal(historicalTrend.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.equal(historicalTrend.data.isPreview, true);
  assert.equal(historicalTrend.data.source, "dummy-preview");
  assert.equal(historicalTrend.data.defaultRangeKey, "monthly");
  assert.deepEqual(
    historicalTrend.data.ranges.map((range) => ({
      key: range.key,
      label: range.label,
    })),
    [
      { key: "monthly", label: "Monthly" },
      { key: "quarterly", label: "Quarterly" },
      { key: "annually", label: "Annually" },
    ],
  );
  const monthlyPreviewRange = historicalTrend.data.ranges.find(
    (range) => range.key === "monthly",
  );
  const annualPreviewRange = historicalTrend.data.ranges.find(
    (range) => range.key === "annually",
  );
  assert.deepEqual(monthlyPreviewRange.xAxisLabels, [
    "1 Mei",
    "8 Mei",
    "15 Mei",
    "22 Mei",
    "29 Mei",
  ]);
  assert.deepEqual(monthlyPreviewRange.yAxisLabels, [
    "100",
    "75",
    "50",
    "25",
    "0",
  ]);
  assert.deepEqual(
    monthlyPreviewRange.series.map((series) => ({
      key: series.key,
      label: series.label,
    })),
    [
      { key: "ontime", label: "Present" },
      { key: "late", label: "Late" },
      { key: "alpha", label: "Alpha" },
    ],
  );
  assert.deepEqual(
    monthlyPreviewRange.metrics.map((metric) => metric.key),
    ["ontime", "late", "alpha"],
  );
  assert.ok(
    historicalTrend.data.ranges.every(
      (range) =>
        range.series.length === 3 &&
        range.metrics.length === 3 &&
        range.series.every(
          (series) =>
            series.points.length >= 4 &&
            /^M /.test(series.chartPath) &&
            /^M /.test(series.areaPath) &&
            series.chartPath.includes(" C "),
        ),
    ),
  );
  assert.equal(
    annualPreviewRange.series
      .find((series) => series.key === "alpha")
      .points.at(-2).value,
    4,
  );
  assert.equal(
    annualPreviewRange.series
      .find((series) => series.key === "alpha")
      .points.at(-1).value,
    2,
  );
  assert.equal(historicalTrend.note, "");

  assert.equal(modeMix.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(modeMix.data.total, 34);
  assert.deepEqual(
    modeMix.data.segments.map((segment) => segment.value),
    [10, 11, 13],
  );
  assert.deepEqual(
    modeMix.data.segments.map((segment) => segment.percentageLabel),
    ["29.4%", "32.4%", "38.2%"],
  );
  assert.deepEqual(
    modeMix.data.segments.map((segment) => segment.color),
    ["#2563eb", "#16a34a", "#f59e0b"],
  );
  assert.match(modeMix.data.chartStyle, /conic-gradient/);

  assert.equal(fuzzyAhp.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.equal(
    fuzzyAhp.subtitle,
    "Decision support output once backend feed is wired",
  );
  assert.doesNotMatch(fuzzyAhp.subtitle, /cr, weights, ranking, distribution/i);
  assert.equal(fuzzyAhp.data, null);
  assert.match(fuzzyAhp.message, /explicit analysis\.fuzzy-ahp dashboard backend feed/i);
  assert.match(
    fuzzyAhp.note,
    /no dummy criteria, weights, rankings, or preview decisions/i,
  );
  assert.equal(geofenceEvidence.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
});

test("cockpit Map View stays backend-required until map_context analytics are available", () => {
  const cockpit = createDashboardCockpitState({
    summary: {
      total_ontime: 1,
      total_late: 0,
      total_alpha: 0,
    },
  });

  assert.equal(cockpit.hero.title, "Map View");
  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.match(
    cockpit.hero.message,
    /analytics\.map_context is not available/i,
  );
  assert.match(
    cockpit.hero.note,
    /map_context\.points instead of reusing historical report rows/i,
  );
  assert.equal(cockpit.hero.data, null);
});

test("cockpit Map View rejects non-object map_context analytics payloads", () => {
  const cockpit = createDashboardCockpitState({
    summary: {},
    analytics: {
      map_context: [
        {
          attendance_id: "att_invalid_payload",
        },
      ],
    },
  });

  assert.equal(cockpit.hero.title, "Map View");
  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.NEEDS_DATA);
  assert.match(
    cockpit.hero.message,
    /requires an explicit object with points and status/i,
  );
  assert.match(
    cockpit.hero.note,
    /will not coerce non-object analytics payloads into map markers/i,
  );
  assert.equal(cockpit.hero.data, null);
});

test("cockpit Map View maps no_data map_context to an empty panel without report-row fallback", () => {
  const cockpit = createDashboardCockpitState({
    summary: {},
    analytics: {
      map_context: createMapContext([], "no_data"),
    },
  });

  assert.equal(cockpit.hero.title, "Map View");
  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.EMPTY);
  assert.match(cockpit.hero.message, /reports no_data/i);
  assert.match(
    cockpit.hero.note,
    /falling back to historical report rows or invented markers/i,
  );
  assert.deepEqual(cockpit.hero.data.locations, []);
  assert.equal(cockpit.hero.data.unavailableCount, 0);
  assert.equal(cockpit.hero.data.totalRows, 0);
  assert.equal(cockpit.hero.data.backendStatus, "no_data");
  assert.equal(cockpit.hero.data.source, "dashboard-analytics.map_context");
});

test("cockpit Map View preserves partial_data semantics while exposing backend-authored markers", () => {
  const cockpit = createDashboardCockpitState({
    summary: {},
    analytics: {
      map_context: createMapContext(
        [
          {
            label: "Partial Office",
            user_name: "Partial User",
            mode: "WFA",
            status: "late",
            attendance_date: "2026-05-03",
            coordinates: { latitude: -0.91, longitude: 119.81 },
          },
        ],
        "partial_data",
      ),
    },
  });

  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.NEEDS_DATA);
  assert.equal(cockpit.hero.data.backendStatus, "partial_data");
  assert.equal(cockpit.hero.data.locations.length, 1);
  assert.match(cockpit.hero.message, /backend status is partial_data/i);
});

test("cockpit Map View keeps valid markers even when backend radius is zero or invalid", () => {
  const cockpit = createDashboardCockpitState({
    summary: {},
    analytics: {
      map_context: createMapContext([
        {
          attendance_id: "att_zero_radius",
          label: "Zero Radius",
          coordinates: { latitude: -0.91, longitude: 119.81 },
          radius: 0,
          description: "Zero radius point",
        },
        {
          attendance_id: "att_invalid_radius",
          label: "Invalid Radius",
          coordinates: { latitude: -0.92, longitude: 119.82 },
          radius: "invalid",
          description: "Invalid radius point",
        },
      ]),
    },
  });

  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(cockpit.hero.data.locations.length, 2);
  assert.deepEqual(
    cockpit.hero.data.locations.map((location) => ({
      attendanceId: location.attendanceId,
      radius: location.radius,
    })),
    [
      { attendanceId: "att_zero_radius", radius: null },
      { attendanceId: "att_invalid_radius", radius: null },
    ],
  );
  assert.equal(cockpit.hero.data.unavailableCount, 0);
});

test("cockpit Map View generates unique fallback keys when point IDs are absent", () => {
  const cockpit = createDashboardCockpitState({
    summary: {},
    analytics: {
      map_context: createMapContext([
        {
          user_id: "user_001",
          attendance_date: "2026-05-03",
          user_name: "Andi Wijaya",
          label: "Office A",
          coordinates: { latitude: -0.91, longitude: 119.81 },
        },
        {
          user_id: "user_001",
          attendance_date: "2026-05-03",
          user_name: "Andi Wijaya",
          label: "Office B",
          coordinates: { latitude: -0.92, longitude: 119.82 },
        },
      ]),
    },
  });

  const locationKeys = cockpit.hero.data.locations.map(
    (location) => location.key,
  );

  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(locationKeys.length, 2);
  assert.equal(new Set(locationKeys).size, 2);
  assert.ok(locationKeys.every((key) => key.startsWith("map_context_")));
});

test("cockpit Map View deduplicates repeated backend point ids for Alpine marker keys", () => {
  const cockpit = createDashboardCockpitState({
    summary: {},
    analytics: {
      map_context: createMapContext([
        {
          id: "point_duplicate",
          attendance_id: "att_duplicate",
          user_name: "Andi Wijaya",
          coordinates: { latitude: -0.91, longitude: 119.81 },
          description: "Office A",
        },
        {
          id: "point_duplicate",
          attendance_id: "att_duplicate",
          user_name: "Budi Pratama",
          coordinates: { latitude: -0.92, longitude: 119.82 },
          description: "Office B",
        },
      ]),
    },
  });

  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.READY);
  assert.deepEqual(
    cockpit.hero.data.locations.map((location) => location.key),
    ["point_duplicate", "point_duplicate__2"],
  );
  assert.ok(
    cockpit.hero.data.locations.every(
      (location) => location.pointId === "point_duplicate",
    ),
  );
});

test("cockpit Map View rejects whitespace-only coordinates instead of coercing them to zero", () => {
  const cockpit = createDashboardCockpitState({
    summary: {},
    analytics: {
      map_context: createMapContext([
        {
          id: "point_blank_latitude",
          label: "Blank Latitude",
          coordinates: { latitude: "   ", longitude: "119.81" },
        },
        {
          id: "point_blank_longitude",
          label: "Blank Longitude",
          coordinates: { latitude: "-0.91", longitude: "   " },
        },
      ]),
    },
  });

  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.NEEDS_DATA);
  assert.deepEqual(cockpit.hero.data.locations, []);
  assert.equal(cockpit.hero.data.unavailableCount, 2);
  assert.match(cockpit.hero.message, /no points included valid coordinates/i);
});

test("cockpit Map View rejects coerced boolean, array, and object coordinates", () => {
  const cockpit = createDashboardCockpitState({
    summary: {},
    analytics: {
      map_context: createMapContext([
        {
          id: "point_boolean_latitude",
          label: "Boolean Latitude",
          coordinates: { latitude: false, longitude: "119.81" },
        },
        {
          id: "point_array_longitude",
          label: "Array Longitude",
          coordinates: { latitude: "-0.91", longitude: [119.82] },
        },
        {
          id: "point_object_latitude",
          label: "Object Latitude",
          coordinates: { latitude: { value: -0.92 }, longitude: "119.83" },
        },
      ]),
    },
  });

  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.NEEDS_DATA);
  assert.deepEqual(cockpit.hero.data.locations, []);
  assert.equal(cockpit.hero.data.unavailableCount, 3);
  assert.match(cockpit.hero.message, /no points included valid coordinates/i);
});

test("cockpit KPI metadata keeps the new management shell without deprecated presentation flags", () => {
  const cockpit = createDashboardCockpitState({ summary: {} });

  assert.deepEqual(
    cockpit.kpis.map((panel) => ({
      key: panel.key,
      title: panel.title,
      meta: panel.meta,
    })),
    [
      {
        key: "attendanceRate",
        title: "Attendance Rate",
        meta: {
          tone: "neutral",
          icon: "calendar-check",
          valueFormat: "percent",
          unit: "%",
          priority: 1,
          comparisonText: "vs periode sebelumnya",
          trendLabel: "4.6%",
          trendTone: "positive",
          trendDirection: "up",
          displayUnit: null,
        },
      },
      {
        key: "lateAlphaRisk",
        title: "Late / Alpha Risk",
        meta: {
          tone: "warning",
          icon: "alert-triangle",
          valueFormat: "count",
          unit: "records",
          priority: 2,
          comparisonText: "vs periode sebelumnya",
          trendLabel: "2",
          trendTone: "positive",
          trendDirection: "down",
          displayUnit: "Users",
        },
      },
      {
        key: "averageDiscipline",
        title: "Avg Discipline",
        meta: {
          tone: "info",
          icon: "activity",
          valueFormat: "score",
          unit: "index",
          priority: 3,
          comparisonText: "vs periode sebelumnya",
          trendLabel: "3.1",
          trendTone: "positive",
          trendDirection: "up",
          displayUnit: null,
        },
      },
      {
        key: "needsAttention",
        title: "Needs Attention",
        meta: {
          tone: "critical",
          icon: "user-check",
          valueFormat: "count",
          unit: "people",
          priority: 4,
          comparisonText: "vs periode sebelumnya",
          trendLabel: "3",
          trendTone: "negative",
          trendDirection: "up",
          displayUnit: "Users",
        },
      },
    ],
  );

  assert.ok(
    cockpit.kpis.every((panel) => !("presentation" in (panel.meta || {}))),
  );
});

test("cockpit average discipline stays backend-required until explicit analytics arrives", () => {
  const cockpit = createDashboardCockpitState({ summary: {} });

  const averageDiscipline = cockpit.kpis.find(
    (panel) => panel.key === "averageDiscipline",
  );

  assert.equal(averageDiscipline.title, "Avg Discipline");
  assert.equal(
    averageDiscipline.state,
    DASHBOARD_PANEL_STATES.BACKEND_REQUIRED,
  );
  assert.match(
    averageDiscipline.message,
    /explicit dashboard analytics executive_kpis/i,
  );
  assert.equal(averageDiscipline.value, null);
});

test("cockpit summary-only sources do not fabricate analytics-backed KPIs or mode mix", () => {
  const cockpit = createDashboardCockpitState({ summary: {} });

  const attendanceRate = cockpit.kpis.find(
    (panel) => panel.key === "attendanceRate",
  );
  const lateAlphaRisk = cockpit.kpis.find(
    (panel) => panel.key === "lateAlphaRisk",
  );
  const needsAttention = cockpit.kpis.find(
    (panel) => panel.key === "needsAttention",
  );
  const modeMix = cockpit.middlePanels.find((panel) => panel.key === "modeMix");

  assert.equal(attendanceRate.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.match(
    attendanceRate.message,
    /explicit dashboard analytics executive_kpis/i,
  );
  assert.equal(lateAlphaRisk.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.match(
    lateAlphaRisk.message,
    /explicit dashboard analytics executive_kpis/i,
  );
  assert.equal(needsAttention.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.match(
    needsAttention.message,
    /explicit dashboard analytics executive_kpis/i,
  );
  assert.equal(modeMix.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.match(modeMix.message, /explicit dashboard analytics mode_mix/i);
});

test("cockpit zeroed summary totals still do not fabricate analytics-backed empty states", () => {
  const cockpit = createDashboardCockpitState({
    summary: {
      total_ontime: 0,
      total_late: 0,
      total_alpha: 0,
      total_wfo: 0,
      total_wfh: 0,
      total_wfa: 0,
    },
  });

  const attendanceRate = cockpit.kpis.find(
    (panel) => panel.key === "attendanceRate",
  );
  const lateAlphaRisk = cockpit.kpis.find(
    (panel) => panel.key === "lateAlphaRisk",
  );
  const modeMix = cockpit.middlePanels.find((panel) => panel.key === "modeMix");

  assert.equal(attendanceRate.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.equal(lateAlphaRisk.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.equal(modeMix.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.equal(modeMix.data, null);
});

test("cockpit mode mix becomes ready only when explicit mode_mix totals are present", () => {
  const cockpit = createDashboardCockpitState({
    analytics: {
      mode_mix: {
        totals: {
          wfo: 10,
          wfh: 11,
          wfa: 13,
        },
      },
    },
  });

  const modeMix = cockpit.middlePanels.find((panel) => panel.key === "modeMix");

  assert.equal(modeMix.state, DASHBOARD_PANEL_STATES.READY);
  assert.deepEqual(
    modeMix.data.segments.map((segment) => segment.value),
    [10, 11, 13],
  );
  assert.deepEqual(
    modeMix.data.segments.map((segment) => segment.percentageLabel),
    ["29.4%", "32.4%", "38.2%"],
  );
  assert.match(modeMix.data.chartStyle, /conic-gradient/);
});

test("cockpit mode mix prefers explicit backend percentages when they are valid", () => {
  const cockpit = createDashboardCockpitState({
    analytics: {
      mode_mix: {
        totals: {
          wfo: 10,
          wfh: 11,
          wfa: 13,
        },
        percentages: {
          wfo: 30,
          wfh: 32,
          wfa: 38,
        },
      },
    },
  });

  const modeMix = cockpit.middlePanels.find((panel) => panel.key === "modeMix");

  assert.equal(modeMix.state, DASHBOARD_PANEL_STATES.READY);
  assert.deepEqual(
    modeMix.data.segments.map((segment) => segment.percentageLabel),
    ["30%", "32%", "38%"],
  );
});

test("cockpit mode mix falls back to derived percentages when backend percentages are invalid", () => {
  const cockpit = createDashboardCockpitState({
    analytics: {
      mode_mix: {
        totals: {
          wfo: 10,
          wfh: 11,
          wfa: 13,
        },
        percentages: {
          wfo: -1,
          wfh: 120,
          wfa: null,
        },
      },
    },
  });

  const modeMix = cockpit.middlePanels.find((panel) => panel.key === "modeMix");

  assert.equal(modeMix.state, DASHBOARD_PANEL_STATES.READY);
  assert.deepEqual(
    modeMix.data.segments.map((segment) => segment.percentageLabel),
    ["29.4%", "32.4%", "38.2%"],
  );
});

test("cockpit hero uses explicit today locations feed as live map source when available", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    analyticsResponse: {
      data: {
        executive_kpis: {
          attendance_rate: 92,
          late_alpha_risk: 8,
          avg_discipline: 78.5,
        },
      },
    },
    todayLocations: {
      data: [
        {
          attendance_id: "att_001",
          full_name: "Andi Wijaya",
          status: "ontime",
          work_mode: "WFO",
          attendance_date: "2026-05-03",
          latitude: -0.9,
          longitude: 119.8,
          radius: 100,
          location_description: "Kantor Palu",
        },
      ],
      authority: "attendance.today-locations",
    },
  });

  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(cockpit.hero.title, "Today Locations / Live Map");
  assert.equal(cockpit.hero.data.source, "attendance.today-locations");
  assert.equal(cockpit.hero.data.locations.length, 1);
});

test("cockpit hero stays backend-required when today locations feed is unavailable", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    analyticsResponse: {
      data: {},
    },
  });

  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.BACKEND_REQUIRED);
  assert.match(
    cockpit.hero.message,
    /today locations backend feed is not available/i,
  );
  assert.equal(cockpit.hero.data, null);
});

test("cockpit fuzzy ahp preserves final dashboard recap payload", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    fuzzyAhpResponse: {
      data: {
        type: "discipline",
        type_label: "Discipline",
        generated_at: "2026-06-25T10:00:00.000Z",
        timezone: "Asia/Makassar",
        requested_window: { from: "2026-06-01", to: "2026-06-30" },
        executed_window: { from: "2026-06-01", to: "2026-06-25" },
        status: "ready",
        needs_data: false,
        consistency: {
          CR: 0.06,
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
          {
            key: "punctuality",
            label: "Punctuality",
            display_label: "Punctuality",
            value: 0.35,
          },
        ],
        ranking_preview: { items: [{ label: "Andi", score: 0.91 }] },
        distribution: { excellent: 2, good: 5 },
      },
    },
  });

  const fuzzyAhp = cockpit.bottomPanels.find(
    (panel) => panel.key === "fuzzyAhp",
  );

  assert.equal(fuzzyAhp.state, DASHBOARD_PANEL_STATES.READY);
  assert.equal(fuzzyAhp.data.source, "analysis.fuzzy-ahp");
  assert.equal(fuzzyAhp.data.type, "discipline");
  assert.equal(fuzzyAhp.data.typeLabel, "Discipline");
  assert.equal(fuzzyAhp.data.consistency.CR, 0.06);
  assert.equal(fuzzyAhp.data.criteriaWeights.length, 2);
  assert.deepEqual(fuzzyAhp.data.rankingPreview, {
    items: [{ label: "Andi", score: 0.91 }],
  });
  assert.deepEqual(fuzzyAhp.data.distribution, { excellent: 2, good: 5 });
  assert.match(fuzzyAhp.note, /explicit backend fuzzy ahp feed/i);
});

test("cockpit fuzzy ahp filters malformed criteria weights without adapting legacy sections", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    fuzzyAhpResponse: {
      data: {
        type: "wfa",
        type_label: "WFA",
        status: "ready",
        criteria_weights: [
          {
            key: "location",
            label: "Location",
            display_label: "Location",
            value: 0.62,
          },
          {
            key: "invalid",
            label: "Invalid",
            display_label: "Invalid",
            value: "0.38",
          },
        ],
      },
    },
  });

  const fuzzyAhp = cockpit.bottomPanels.find(
    (panel) => panel.key === "fuzzyAhp",
  );

  assert.equal(fuzzyAhp.state, DASHBOARD_PANEL_STATES.READY);
  assert.deepEqual(fuzzyAhp.data.criteriaWeights, [
    {
      key: "location",
      label: "Location",
      display_label: "Location",
      value: 0.62,
    },
  ]);
  assert.equal(fuzzyAhp.data.activeDecisionKey, "wfa");
  assert.equal(Array.isArray(fuzzyAhp.data.decisions), true);
  assert.equal(fuzzyAhp.data.decisions.length, 1);
  assert.equal(fuzzyAhp.data.decisions[0].key, "wfa");
  assert.equal(fuzzyAhp.data.decisions[0].criteriaWeights[0].weight, 0.62);
});

test("cockpit fuzzy ahp does not normalize missing status into empty output", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    fuzzyAhpResponse: {
      data: {
        type: "discipline",
        criteria_weights: [
          {
            key: "attendance",
            label: "Attendance",
            display_label: "Attendance",
            value: 0.45,
          },
        ],
      },
    },
  });

  const fuzzyAhp = cockpit.bottomPanels.find(
    (panel) => panel.key === "fuzzyAhp",
  );

  assert.equal(fuzzyAhp.state, DASHBOARD_PANEL_STATES.NEEDS_DATA);
  assert.match(fuzzyAhp.message, /status must be present/i);
});

test("cockpit fuzzy ahp stays truthful when fuzzy ahp payload is incomplete", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    fuzzyAhpResponse: {
      data: {
        type: "discipline",
        status: "ready",
        criteria_weights: [],
      },
    },
  });

  const fuzzyAhp = cockpit.bottomPanels.find(
    (panel) => panel.key === "fuzzyAhp",
  );

  assert.equal(fuzzyAhp.state, DASHBOARD_PANEL_STATES.NEEDS_DATA);
  assert.equal(fuzzyAhp.data.type, "discipline");
  assert.match(fuzzyAhp.message, /criteria_weights must include explicit final dashboard weights/i);
});

test("cockpit error state isolates every panel as error", () => {
  const cockpit = createDashboardCockpitErrorState("summary request failed");

  assert.ok(
    cockpit.kpis.every((panel) => panel.state === DASHBOARD_PANEL_STATES.ERROR),
  );
  assert.equal(cockpit.hero.state, DASHBOARD_PANEL_STATES.ERROR);
  assert.ok(
    cockpit.middlePanels.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.ERROR,
    ),
  );
  assert.ok(
    cockpit.bottomPanels.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.ERROR,
    ),
  );
  assert.ok(
    cockpit.panels.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.ERROR,
    ),
  );
});
