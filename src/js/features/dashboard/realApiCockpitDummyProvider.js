export const DASHBOARD_REAL_API_ENDPOINTS = Object.freeze({
  dashboardAnalytics: "GET /api/summary/dashboard-analytics",
  geofenceEvidence: "GET /api/attendance/geofence-evidence",
  todayLocations: "GET /api/attendance/today-locations",
  fahpDiscipline: "GET /api/analysis/fuzzy-ahp/dashboard?type=discipline",
  fahpWfa: "GET /api/analysis/fuzzy-ahp/dashboard?type=wfa",
  fahpSmartAc: "GET /api/analysis/fuzzy-ahp/dashboard?type=smart_ac",
});

export const DASHBOARD_REAL_API_PHASES = Object.freeze({
  SHELL: "phase-1-shell",
  DUMMY_PROVIDER: "phase-2-dummy-provider",
  REAL_PROVIDER: "phase-3-real-provider",
});

const CONTRACT_SOURCE_NOTE =
  "Dummy data mirrors the final dashboard cockpit API shape but does not call backend endpoints in Phase 1/2.";

function createEndpointStub({
  key,
  endpoint,
  owner,
  state = "ready",
  payload,
}) {
  return {
    key,
    endpoint,
    owner,
    phase: DASHBOARD_REAL_API_PHASES.DUMMY_PROVIDER,
    provider: "dummy",
    state,
    sourceNote: CONTRACT_SOURCE_NOTE,
    payload,
  };
}

export function createDashboardRealApiDummyContract() {
  return {
    phase: DASHBOARD_REAL_API_PHASES.DUMMY_PROVIDER,
    provider: "dummy",
    sourceNote: CONTRACT_SOURCE_NOTE,
    endpoints: [
      createEndpointStub({
        key: "dashboardAnalytics",
        endpoint: DASHBOARD_REAL_API_ENDPOINTS.dashboardAnalytics,
        owner: "historical-overview",
        payload: {
          attendanceRate: 92,
          onTime: 184,
          late: 13,
          alpha: 3,
          workModeMix: [
            { key: "wfo", label: "WFO", count: 128, percentage: 64 },
            { key: "wfh", label: "WFH", count: 44, percentage: 22 },
            { key: "wfa", label: "WFA", count: 28, percentage: 14 },
          ],
          trend: [
            { label: "Mon", onTime: 31, late: 2, alpha: 0 },
            { label: "Tue", onTime: 34, late: 3, alpha: 1 },
            { label: "Wed", onTime: 29, late: 4, alpha: 1 },
            { label: "Thu", onTime: 37, late: 2, alpha: 0 },
            { label: "Fri", onTime: 36, late: 2, alpha: 1 },
          ],
        },
      }),
      createEndpointStub({
        key: "geofenceEvidence",
        endpoint: DASHBOARD_REAL_API_ENDPOINTS.geofenceEvidence,
        owner: "geofence-evidence",
        payload: {
          state: "partial_evidence",
          enterEvents: 42,
          exitEvents: 39,
          outsideGeofence: 3,
          latestEvidence: [
            {
              id: "geo_dummy_001",
              employeeName: "Dummy Employee A",
              event: "EXIT",
              confidence: "review_required",
              timestamp: "2026-06-29T08:42:00+08:00",
            },
            {
              id: "geo_dummy_002",
              employeeName: "Dummy Employee B",
              event: "ENTER",
              confidence: "matched",
              timestamp: "2026-06-29T09:05:00+08:00",
            },
          ],
        },
      }),
      createEndpointStub({
        key: "todayLocations",
        endpoint: DASHBOARD_REAL_API_ENDPOINTS.todayLocations,
        owner: "live-operations-map",
        payload: {
          activeLocations: 31,
          staleLocations: 4,
          markers: [
            {
              id: "loc_dummy_001",
              name: "Dummy Employee A",
              latitude: -0.9008,
              longitude: 119.8787,
              mode: "WFO",
              freshness: "current",
            },
            {
              id: "loc_dummy_002",
              name: "Dummy Employee B",
              latitude: -0.9131,
              longitude: 119.8706,
              mode: "WFA",
              freshness: "stale",
            },
          ],
        },
      }),
      createEndpointStub({
        key: "fahpDiscipline",
        endpoint: DASHBOARD_REAL_API_ENDPOINTS.fahpDiscipline,
        owner: "fahp-discipline",
        payload: {
          type: "discipline",
          score: 0.82,
          label: "Stable discipline",
          recommendation: "Monitor late clusters before escalation.",
        },
      }),
      createEndpointStub({
        key: "fahpWfa",
        endpoint: DASHBOARD_REAL_API_ENDPOINTS.fahpWfa,
        owner: "fahp-wfa",
        payload: {
          type: "wfa",
          score: 0.76,
          label: "WFA eligible with review",
          recommendation:
            "Use geofence evidence before approving broad WFA changes.",
        },
      }),
      createEndpointStub({
        key: "fahpSmartAc",
        endpoint: DASHBOARD_REAL_API_ENDPOINTS.fahpSmartAc,
        owner: "fahp-smart-ac",
        payload: {
          type: "smart_ac",
          score: 0.69,
          label: "Smart AC review needed",
          recommendation:
            "Keep recommendation non-authoritative until backend feed is wired.",
        },
      }),
    ],
    phase3TransitionPlan: [
      "Keep this dummy contract shape stable while creating the real provider.",
      "Introduce a real provider that maps each endpoint response into the same endpoint entries.",
      "Switch the dashboard shell from dummy provider to real provider only after endpoint verification evidence exists.",
    ],
  };
}
