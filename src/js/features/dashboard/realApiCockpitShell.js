import {
  DASHBOARD_REAL_API_PHASES,
  createDashboardRealApiDummyContract,
} from "./realApiCockpitDummyProvider.js";

export const REAL_API_COCKPIT_STATES = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  EMPTY: "empty",
  ERROR: "error",
  BACKEND_REQUIRED: "backendRequired",
});

const STATE_LABELS = Object.freeze({
  loading: "Loading",
  ready: "Dummy Ready",
  empty: "Empty",
  error: "Error",
  backendRequired: "Backend Required",
});

const ENDPOINT_LABELS = Object.freeze({
  dashboardAnalytics: "Hybrid Analytics",
  geofenceEvidence: "Geofence Evidence",
  todayLocations: "Today Locations",
  fahpDiscipline: "FAHP Discipline",
  fahpWfa: "FAHP WFA",
  fahpSmartAc: "FAHP Smart AC",
});

function getStateLabel(state) {
  return STATE_LABELS[state] || state;
}

function createMetric({ key, label, value, tone = "neutral" }) {
  return { key, label, value, tone };
}

function createEndpointPanel(endpointEntry) {
  return {
    key: endpointEntry.key,
    title: ENDPOINT_LABELS[endpointEntry.key] || endpointEntry.key,
    endpoint: endpointEntry.endpoint,
    owner: endpointEntry.owner,
    state: endpointEntry.state || REAL_API_COCKPIT_STATES.READY,
    stateLabel: getStateLabel(
      endpointEntry.state || REAL_API_COCKPIT_STATES.READY,
    ),
    provider: endpointEntry.provider,
    sourceNote: endpointEntry.sourceNote,
    payload: endpointEntry.payload,
  };
}

function buildOverviewMetrics(contract) {
  const readyEndpoints = contract.endpoints.filter(
    (endpoint) => endpoint.state === REAL_API_COCKPIT_STATES.READY,
  ).length;
  const totalEndpoints = contract.endpoints.length;

  return [
    createMetric({
      key: "phase",
      label: "Current phase",
      value: "Phase 1/2",
      tone: "info",
    }),
    createMetric({
      key: "provider",
      label: "Active provider",
      value: contract.provider,
      tone: "warning",
    }),
    createMetric({
      key: "endpointCoverage",
      label: "Dummy endpoints",
      value: `${readyEndpoints}/${totalEndpoints}`,
      tone: readyEndpoints === totalEndpoints ? "positive" : "warning",
    }),
    createMetric({
      key: "realApiRuntime",
      label: "Real API runtime",
      value: "Not wired",
      tone: "critical",
    }),
  ];
}

function buildSection(key, title, description, endpointKeys, panels) {
  return {
    key,
    title,
    description,
    panels: endpointKeys
      .map((endpointKey) => panels.find((panel) => panel.key === endpointKey))
      .filter(Boolean),
  };
}

export function createRealApiCockpitShell(
  contract = createDashboardRealApiDummyContract(),
) {
  const panels = contract.endpoints.map(createEndpointPanel);

  return {
    phase: contract.phase,
    phaseLabel: "Phase 1 shell + Phase 2 dummy provider",
    provider: contract.provider,
    state: REAL_API_COCKPIT_STATES.READY,
    stateLabel: getStateLabel(REAL_API_COCKPIT_STATES.READY),
    sourceNote: contract.sourceNote,
    overviewMetrics: buildOverviewMetrics(contract),
    sections: [
      buildSection(
        "analytics",
        "Hybrid Analytics Contract Shell",
        "Dashboard analytics panel prepared for the final summary analytics endpoint without runtime API consumption.",
        ["dashboardAnalytics"],
        panels,
      ),
      buildSection(
        "evidenceAndMap",
        "Evidence + Map Contract Shell",
        "Geofence evidence and today-locations panels share truthful dummy state before real provider wiring.",
        ["geofenceEvidence", "todayLocations"],
        panels,
      ),
      buildSection(
        "fahp",
        "FAHP Decision Contract Shell",
        "Discipline, WFA, and Smart AC decision panels mirror the final endpoint split but remain non-authoritative.",
        ["fahpDiscipline", "fahpWfa", "fahpSmartAc"],
        panels,
      ),
    ],
    phase3TransitionPlan: contract.phase3TransitionPlan,
    guardrails: [
      "No Phase 1/2 panel calls backend endpoints.",
      "Dummy data is marked as dummy and must not be presented as operational truth.",
      "Backend remains the source of truth once the Phase 3 provider is introduced.",
    ],
  };
}

export function createRealApiCockpitLoadingShell() {
  return {
    phase: DASHBOARD_REAL_API_PHASES.SHELL,
    phaseLabel: "Phase 1 isolated shell",
    provider: "none",
    state: REAL_API_COCKPIT_STATES.LOADING,
    stateLabel: getStateLabel(REAL_API_COCKPIT_STATES.LOADING),
    sourceNote: "Preparing isolated dashboard cockpit shell.",
    overviewMetrics: [],
    sections: [],
    phase3TransitionPlan: [],
    guardrails: [],
  };
}
