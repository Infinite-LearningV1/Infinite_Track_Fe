# INF-160 Dashboard Real API Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the final real backend dashboard endpoints into the existing Web FE cockpit without redesign, remove dummy/preview runtime sources, and prove each section reads from its correct owner endpoint.

**Architecture:** Keep the current dashboard layering, but tighten it. Service files stay owner-endpoint fetchers, slice files become the only place that normalize backend payloads into UI-ready view models, `dashboard.js` and `dashboardCockpitService.js` compose truthful panel state, and the cockpit template only updates bindings/field blocks needed to reflect backend truth. Remove all preview-success runtime paths so empty, needs-data, and error states are surfaced honestly.

**Tech Stack:** Alpine.js, webpack, axios, Tailwind CSS, plain JavaScript modules, Node `node:test`

## Global Constraints

- Use worktree `C:\Users\Febriyadi\.claude\worktrees\Infinite_Track_Fe-wt-inf-160-dashboard-real-api-cockpit` for all edits and verification.
- Do not redesign the dashboard cockpit UI.
- Do not change backend contracts.
- Solve data-shape gaps in FE mapper/view-model code.
- Use `GET /api/summary/dashboard-analytics` only for recap dashboard owner surfaces.
- Use `GET /api/attendance/geofence-evidence` only for the geofence evidence owner surface.
- Use `GET /api/attendance/today-locations` only for the live map / today snapshot owner surface.
- Use `GET /api/analysis/fuzzy-ahp/dashboard?type=discipline|wfa|smart_ac` only for Fuzzy AHP tabs.
- Remove dummy/preview from the runtime primary path; if backend data is missing, show truthful empty / needsData / error states.
- Field UI may be added, changed, or removed if needed, but only by following the existing UI pattern.
- `DOCS/ADR UPDATE REQUIRED` applies because this work changes dashboard/reporting responsibility and source-of-truth behavior.
- Node version must remain `>=20` as declared in `package.json`.
- Prefer TDD: failing test, minimal code, passing test, commit.

---

## File structure and responsibilities

- `src/js/services/fuzzyAhpService.js`
  - Fetch the final Fuzzy AHP owner endpoint using `type` instead of the retired `dashboard-recap` contract.
  - Must not contain UI fallback logic.

- `src/js/features/dashboard/fahpFilterState.js`
  - Normalize local dashboard FAHP filter state to the final `type`-based request contract.

- `src/js/services/dashboard/historicalAnalyticsSlice.js`
  - Normalize dashboard analytics recap payload into KPI / trend / mode mix / insight view models.
  - Must never claim backend-ready preview data.

- `src/js/services/dashboard/geofenceEvidenceSlice.js`
  - Normalize the dedicated geofence evidence payload into one truthful geofence panel view model.

- `src/js/services/dashboard/liveMapSlice.js`
  - Normalize today-locations payload into truthful map marker / snapshot data.
  - Must not fall back to analytics map context.

- `src/js/services/dashboard/fahpRecapSlice.js`
  - Normalize final Fuzzy AHP `dashboard?type=...` payload into tab-ready panel state.

- `src/js/services/dashboardCockpitService.js`
  - Compose all slice/view-model inputs into final cockpit panels and section order.
  - Must remove preview/dummy runtime assembly.

- `src/js/features/dashboard/dashboard.js`
  - Alpine dashboard controller. Responsible for parallel fetching, storing raw responses, building slice state, and passing truthful sources into cockpit composition.
  - Still owns report/export/table state, but cockpit panels must read owner services instead of retired shell/dummy state.

- `src/partials/dashboard/dashboard-cockpit-grid.html`
  - Existing cockpit UI. Only binding- and field-level edits are allowed here.

- `src/js/features/dashboard/realApiCockpitDummyProvider.js`
- `src/js/features/dashboard/realApiCockpitShell.js`
- `src/js/features/dashboard/realApiCockpitShell.test.js`
  - Retired Phase 1/2 dummy provider lane. Remove or fully detach from runtime so the cockpit no longer advertises a dummy-backed shell.

- `src/js/services/dashboardCockpitService.test.js`
  - Main composition contract tests. Update it to assert truthful owner-endpoint behavior instead of preview fallback behavior.

- `src/js/features/dashboard/dashboardCockpitState.test.js`
  - Dashboard controller/state tests. Update it to assert truthful state flow and no dummy shell import/runtime.

- `src/js/features/dashboard/dashboardTemplateRegression.test.js`
  - Use if needed to lock the existing cockpit template structure while allowing binding-level field edits.

- `src/js/services/reportService.js`
  - Legacy summary/report service. Audit only; keep it for report/export concerns, but do not let it remain a cockpit owner for geofence/map/FAHP.

## Verification model for this repo

This repo does not define one catch-all frontend test script. Use the existing explicit commands instead:

- `node --test src/js/services/dashboardCockpitService.test.js`
- `node --test src/js/features/dashboard/dashboardCockpitState.test.js`
- `node --test src/js/features/dashboard/realApiCockpitShell.test.js` (before deleting or repurposing it)
- `npm run build`
- `npm run lint`

Runtime proof requires valid backend credentials and a running local FE session, so runtime login verification remains **REQUIRES REPO VERIFICATION** until credentials are provided.

---

### Task 1: Replace the retired Fuzzy AHP request contract with the final owner endpoint

**Files:**
- Modify: `src/js/services/fuzzyAhpService.js`
- Modify: `src/js/features/dashboard/fahpFilterState.js`
- Modify: `src/js/features/dashboard/dashboard.js`
- Test: `src/js/features/dashboard/dashboardCockpitState.test.js`

**Interfaces:**
- Consumes: dashboard FAHP tab selection state from `dashboard.js`
- Produces:
  - `getFuzzyAhpAnalysis({ type }) => Promise<object>`
  - `createDefaultFahpFilterState() => { type: "discipline" }`
  - `buildFahpRequestParams(state) => { type: string }`

- [ ] **Step 1: Write the failing request-contract test expectation in the dashboard state test**

Add or update a focused test that proves the controller will request the final owner endpoint using `type` values.

```js
test("dashboard FAHP request params use the final type-based contract", () => {
  const component = dashboard();
  const params = component.getFahpRequestParams?.() || buildFahpRequestParams(component.fahpFilterState);

  assert.deepEqual(params, { type: "discipline" });
});
```

- [ ] **Step 2: Run the targeted test to confirm the old `category` / `analysis_type` contract fails**

Run: `node --test src/js/features/dashboard/dashboardCockpitState.test.js`
Expected: FAIL because FAHP state/request helpers still expose `category` / `analysis_type`.

- [ ] **Step 3: Replace the service contract in `fuzzyAhpService.js`**

Update the service to validate the final type list and call the final endpoint.

```js
const ALLOWED_TYPES = ["discipline", "wfa", "smart_ac"];

export class FuzzyAhpService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  async getFuzzyAhpAnalysis({ type = "discipline" } = {}) {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new Error(
        `Invalid type: ${type}. Allowed types are ${ALLOWED_TYPES.join(", ")}.`,
      );
    }

    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard`,
      params: { type },
    });

    return response.data;
  }
}
```

- [ ] **Step 4: Replace local filter state in `fahpFilterState.js`**

Update the default filter state and request builder to the final contract.

```js
export function createDefaultFahpFilterState() {
  return {
    type: "discipline",
  };
}

export function buildFahpRequestParams(state) {
  return {
    type: state?.type || "discipline",
  };
}
```

- [ ] **Step 5: Update the controller call site in `dashboard.js`**

Make sure FAHP refresh/load uses the new request params directly.

```js
fetchFahpRecap: async (params = this.fahpFilterState) => {
  const requestParams = buildFahpRequestParams(params);
  const nextFilterState = {
    ...createDefaultFahpFilterState(),
    ...requestParams,
  };
  const response = await this.fetchFuzzyAhpAnalysis(requestParams);

  this.fahpFilterState = nextFilterState;
  this.fuzzyAhpResponse = response;
  this.fuzzyAhpError = null;
  this.rawApiData = {
    ...(this.rawApiData || {}),
    fahpRecap: createFahpRecapSliceState(response, requestParams),
  };

  return this.buildFahpSliceState(response);
},
```

- [ ] **Step 6: Run the targeted controller test again**

Run: `node --test src/js/features/dashboard/dashboardCockpitState.test.js`
Expected: PASS for the new type-based request contract and no references to `category` / `analysis_type` in dashboard FAHP request flow.

- [ ] **Step 7: Commit the FAHP request-contract migration**

```bash
git add src/js/services/fuzzyAhpService.js src/js/features/dashboard/fahpFilterState.js src/js/features/dashboard/dashboard.js src/js/features/dashboard/dashboardCockpitState.test.js
git commit -m "refactor: adopt final FAHP dashboard request contract"
```

---

### Task 2: Rebuild dashboard slice/view-model contracts around final backend payloads

**Files:**
- Modify: `src/js/services/dashboard/historicalAnalyticsSlice.js`
- Modify: `src/js/services/dashboard/geofenceEvidenceSlice.js`
- Modify: `src/js/services/dashboard/liveMapSlice.js`
- Modify: `src/js/services/dashboard/fahpRecapSlice.js`
- Test: `src/js/services/dashboardCockpitService.test.js`

**Interfaces:**
- Consumes:
  - analytics response from `getDashboardAnalytics()`
  - geofence response from `getGeofenceEvidence()`
  - today-locations response from `getTodayLocations()`
  - FAHP response from `getFuzzyAhpAnalysis()`
- Produces:
  - `createHistoricalAnalyticsSliceState(response, request)`
  - `createGeofenceEvidenceSliceState(response, request)`
  - `createLiveMapSliceState(response, request)`
  - `createFahpRecapSliceState(response, request)`
  - all four must produce truthful view models with no preview-ready state

- [ ] **Step 1: Add or update a failing geofence view-model test case in `dashboardCockpitService.test.js`**

Add a focused test that expects operational context fields to survive normalization.

```js
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
```

- [ ] **Step 2: Run the cockpit service test to confirm current slice contracts are incomplete**

Run: `node --test src/js/services/dashboardCockpitService.test.js`
Expected: FAIL because the current geofence and FAHP slice contracts do not preserve the full final payload.

- [ ] **Step 3: Expand `geofenceEvidenceSlice.js` into the final dedicated payload shape**

Replace the minimalist view model with one that carries all final geofence fields.

```js
export function buildGeofenceEvidenceViewModel(response) {
  const data = response?.data || {};
  const operationalContext = data.operational_context || {};
  const window = data.window || response?.executed_window || null;

  return {
    status: data.status || "empty",
    needsData: Boolean(data.needs_data),
    reason: data.reason || null,
    authority: data.authority || null,
    finalAttendanceAuthority: data.final_attendance_authority || null,
    window,
    rawCounts: {
      total_events: data.raw_counts?.total_events || 0,
      enter_events: data.raw_counts?.enter_events || 0,
      exit_events: data.raw_counts?.exit_events || 0,
      unique_users: data.raw_counts?.unique_users || 0,
    },
    operationalContext: {
      activity_label: operationalContext.activity_label || null,
      activity_note: operationalContext.activity_note || null,
      enter_context: operationalContext.enter_context || null,
      exit_context: operationalContext.exit_context || null,
      dashboard_note: operationalContext.dashboard_note || null,
    },
  };
}
```

- [ ] **Step 4: Rewrite `fahpRecapSlice.js` to the final backend contract**

Replace the retired `filter` / `sections` validation with a final dashboard payload validator.

```js
function isValidCriteriaWeight(entry) {
  return (
    entry &&
    typeof entry.key === "string" &&
    typeof entry.label === "string" &&
    typeof entry.display_label === "string" &&
    typeof entry.value === "number" &&
    Number.isFinite(entry.value)
  );
}

export function buildFahpDashboardRecapViewModel(response) {
  const data = response?.data || {};

  return {
    type: data.type || null,
    typeLabel: data.type_label || null,
    generatedAt: data.generated_at || null,
    timezone: data.timezone || null,
    requestedWindow: data.requested_window || null,
    executedWindow: data.executed_window || null,
    status: data.status || "empty",
    needsData: Boolean(data.needs_data),
    consistency: {
      CR: data.consistency?.CR ?? null,
      threshold: data.consistency?.threshold ?? null,
      isConsistent: Boolean(data.consistency?.is_consistent),
      summaryLabel: data.consistency?.summary_label || null,
    },
    criteriaWeights: Array.isArray(data.criteria_weights)
      ? data.criteria_weights.filter(isValidCriteriaWeight)
      : [],
    rankingPreview: data.ranking_preview || null,
    distribution: data.distribution || null,
  };
}

export function createFahpRecapSliceState(response, request) {
  const data = buildFahpDashboardRecapViewModel(response);
  return {
    status: data.status,
    data,
    error: null,
    request,
    meta: {},
  };
}
```

- [ ] **Step 5: Harden `liveMapSlice.js` against analytics fallback assumptions**

Keep only explicit today-locations parsing.

```js
export function buildLiveMapViewModel(response) {
  const locations = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.data?.data)
      ? response.data.data
      : Array.isArray(response)
        ? response
        : [];

  return {
    locations,
    authority: response?.authority || "attendance.today-locations",
  };
}
```

- [ ] **Step 6: Keep `historicalAnalyticsSlice.js` narrow and truthful**

Do not infer geofence or map ownership here; keep only recap concerns.

```js
export function buildHistoricalAnalyticsViewModel(response) {
  const data =
    response?.data && typeof response.data === "object" && !Array.isArray(response.data)
      ? response.data
      : {};

  return {
    kpis: data.executive_kpis || {},
    trend: data.historical_trend || { points: [] },
    modeMix: data.mode_mix || { totals: {}, percentages: {} },
    insights: data.insights || { items: [] },
    windowMeta: {
      requestedWindow: response?.requested_window || null,
      executedWindow: response?.executed_window || null,
    },
  };
}
```

- [ ] **Step 7: Run the cockpit service test again**

Run: `node --test src/js/services/dashboardCockpitService.test.js`
Expected: PASS for updated geofence/FAHP/live-map slice expectations and no preview-ready slice contract assumptions.

- [ ] **Step 8: Commit the slice/view-model contract rewrite**

```bash
git add src/js/services/dashboard/historicalAnalyticsSlice.js src/js/services/dashboard/geofenceEvidenceSlice.js src/js/services/dashboard/liveMapSlice.js src/js/services/dashboard/fahpRecapSlice.js src/js/services/dashboardCockpitService.test.js
git commit -m "refactor: align dashboard slice contracts to backend owners"
```

---

### Task 3: Remove dummy runtime shell paths and rebuild cockpit composition around truthful owner states

**Files:**
- Modify: `src/js/services/dashboardCockpitService.js`
- Modify: `src/js/features/dashboard/dashboard.js`
- Delete: `src/js/features/dashboard/realApiCockpitDummyProvider.js`
- Delete: `src/js/features/dashboard/realApiCockpitShell.js`
- Modify or Delete: `src/js/features/dashboard/realApiCockpitShell.test.js`
- Test: `src/js/services/dashboardCockpitService.test.js`
- Test: `src/js/features/dashboard/dashboardCockpitState.test.js`

**Interfaces:**
- Consumes:
  - final slice states from Task 2
  - `getDashboardAnalytics`, `getGeofenceEvidence`, `getTodayLocations`, `getFuzzyAhpAnalysis`
- Produces:
  - `createDashboardCockpitStateFromSources(...)`
  - `dashboard().loadDashboard()` with no dummy shell dependency
  - no runtime import of `createRealApiCockpitShell`

- [ ] **Step 1: Add a failing state test that proves `dashboard.js` no longer imports or builds the dummy cockpit shell**

Update the state test to assert the retired shell state is gone.

```js
test("dashboard initializes without the retired realApiCockpit dummy shell", () => {
  const component = dashboard();

  assert.equal("realApiCockpit" in component, false);
  assert.ok(
    component.cockpit.kpis.every(
      (panel) => panel.state === DASHBOARD_PANEL_STATES.LOADING,
    ),
  );
});
```

- [ ] **Step 2: Run the dashboard state test to confirm the dummy shell is still wired in**

Run: `node --test src/js/features/dashboard/dashboardCockpitState.test.js`
Expected: FAIL because `dashboard.js` still imports and builds `createRealApiCockpitShell()`.

- [ ] **Step 3: Remove the dummy shell import and state from `dashboard.js`**

Delete these imports and state assignments.

```js
import {
  createRealApiCockpitLoadingShell,
  createRealApiCockpitShell,
} from "./realApiCockpitShell.js";
```

Remove any state shaped like this:

```js
realApiCockpit: createRealApiCockpitLoadingShell(),
```

and any init/update path like this:

```js
this.realApiCockpit = createRealApiCockpitShell();
```

- [ ] **Step 4: Remove preview/dummy assembly from `dashboardCockpitService.js`**

Delete preview constants and any success paths that return preview-backed `READY` or `BACKEND_REQUIRED` content instead of truthful owner states.

Specifically remove structures shaped like:

```js
const PREVIEW_GEOFENCE_EVIDENCE = Object.freeze({ ... });
const PREVIEW_FUZZY_AHP_DECISIONS = Object.freeze([ ... ]);
const PREVIEW_TODAY_LOCATIONS = Object.freeze([ ... ]);
```

Replace them with truthful state branches that only emit `READY` when the owner response is actually present and valid.

```js
if (!fahpResponse && !fahpError) {
  return createPanelState({
    key: "fuzzyAhp",
    state: DASHBOARD_PANEL_STATES.LOADING,
    data: null,
  });
}

if (fahpError) {
  return createPanelState({
    key: "fuzzyAhp",
    state: DASHBOARD_PANEL_STATES.ERROR,
    message: getAnalyticsErrorMessage(fahpError),
    data: null,
  });
}
```

- [ ] **Step 5: Delete the retired shell files and repurpose or delete the shell test**

If no runtime code imports the shell after Step 3, delete the retired files.

```bash
git rm src/js/features/dashboard/realApiCockpitDummyProvider.js src/js/features/dashboard/realApiCockpitShell.js src/js/features/dashboard/realApiCockpitShell.test.js
```

If the endpoint constants are still useful for test fixtures, keep only a tiny constant module and rewrite the test around the new truthful runtime behavior instead of the dummy provider phase model.

- [ ] **Step 6: Re-run the two targeted test files**

Run:
- `node --test src/js/services/dashboardCockpitService.test.js`
- `node --test src/js/features/dashboard/dashboardCockpitState.test.js`

Expected: PASS with no runtime dependence on the retired dummy shell/provider and no preview-success panel assertions.

- [ ] **Step 7: Commit the cockpit composition cleanup**

```bash
git add src/js/services/dashboardCockpitService.js src/js/features/dashboard/dashboard.js src/js/services/dashboardCockpitService.test.js src/js/features/dashboard/dashboardCockpitState.test.js
git commit -m "refactor: remove dashboard cockpit dummy runtime paths"
```

---

### Task 4: Update cockpit template bindings and panel copy to match the final backend fields without redesign

**Files:**
- Modify: `src/partials/dashboard/dashboard-cockpit-grid.html`
- Modify: `src/js/services/dashboardCockpitService.js`
- Test: `src/js/features/dashboard/dashboardTemplateRegression.test.js`
- Test: `src/js/features/dashboard/dashboardCockpitState.test.js`

**Interfaces:**
- Consumes: final panel data from `createDashboardCockpitStateFromSources(...)`
- Produces: existing cockpit UI structure with updated field-level bindings only

- [ ] **Step 1: Add a failing regression assertion for the final geofence and FAHP field copy**

Extend the relevant dashboard state/template regression tests so they assert truthful field-level copy is present and preview copy is gone.

```js
test("cockpit geofence panel surfaces dedicated owner copy instead of preview copy", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    geofenceEvidenceResponse: {
      data: {
        status: "ready",
        needs_data: false,
        authority: "attendance.geofence-evidence",
        final_attendance_authority: "attendance records",
        reason: "Dedicated source available",
        raw_counts: {
          total_events: 5,
          enter_events: 3,
          exit_events: 2,
          unique_users: 3,
        },
        operational_context: {
          activity_label: "Morning attendance",
          activity_note: "Dedicated feed",
          enter_context: "3 enters",
          exit_context: "2 exits",
          dashboard_note: "No preview fallback",
        },
      },
    },
  });

  const panel = cockpit.bottomPanels.find((entry) => entry.key === "geofenceEvidence");
  assert.match(panel.note, /no preview fallback/i);
});
```

- [ ] **Step 2: Run the template/state regression file and confirm old copy still leaks through**

Run: `node --test src/js/features/dashboard/dashboardCockpitState.test.js`
Expected: FAIL because some cockpit panel notes/subtitles/messages still reflect preview-era wording.

- [ ] **Step 3: Update field-level panel composition in `dashboardCockpitService.js`**

Replace preview-oriented text with backend-owner text while keeping the same panel structure.

```js
const LIVE_MAP_PANEL_DEFINITION = {
  key: "mapContext",
  title: "Today Locations / Live Map",
  subtitle:
    "Explicit today-locations backend feed for current attendance context",
};

const BOTTOM_PANEL_DEFINITIONS = [
  {
    key: "fuzzyAhp",
    title: "Fuzzy AHP Decision Center",
    subtitle: "Final backend owner tabs for discipline, WFA, and Smart AC",
  },
  {
    key: "geofenceEvidence",
    title: "Geofence Evidence Context",
    subtitle: "Dedicated ENTER / EXIT evidence owner",
  },
];
```

Also wire final field-level details so the panel exposes backend truth instead of preview text.

- [ ] **Step 4: Update the cockpit template bindings without changing the layout skeleton**

Keep the same section/card/tab structure, but update bindings to consume final field names such as:

```html
<p x-show="panel.reason" x-text="panel.reason"></p>
<p x-show="panel.data?.operationalContext?.activity_note" x-text="panel.data.operationalContext.activity_note"></p>
<p x-show="panel.data?.consistency?.summaryLabel" x-text="panel.data.consistency.summaryLabel"></p>
<p x-show="panel.data?.generatedAtLabel" x-text="panel.data.generatedAtLabel"></p>
```

Do not add a new layout. Only add, swap, or remove field-level elements that fit the existing component pattern.

- [ ] **Step 5: Re-run the targeted state/template test**

Run: `node --test src/js/features/dashboard/dashboardCockpitState.test.js`
Expected: PASS with existing cockpit structure preserved and preview-era field copy removed from owner-backed panels.

- [ ] **Step 6: Commit the cockpit binding cleanup**

```bash
git add src/partials/dashboard/dashboard-cockpit-grid.html src/js/services/dashboardCockpitService.js src/js/features/dashboard/dashboardCockpitState.test.js src/js/features/dashboard/dashboardTemplateRegression.test.js
git commit -m "refactor: align cockpit bindings to owner-backed dashboard fields"
```

---

### Task 5: Final repo verification pass, ADR/doc note update, and runtime proof preparation

**Files:**
- Modify: `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md`
- Modify if needed: `docs/superpowers/specs/2026-06-30-inf-160-dashboard-real-api-cockpit-design.md`
- Audit: `src/js/services/reportService.js`

**Interfaces:**
- Consumes: completed implementation from Tasks 1-4
- Produces:
  - updated ADR/documentation note for source-of-truth cockpit ownership
  - build/lint/test evidence
  - runtime verification checklist ready for credential-based proof

- [ ] **Step 1: Audit `reportService.js` and remove any leftover cockpit-owner dependence**

If dashboard cockpit still consumes geofence/map/FAHP data through `reportService`, move it to the owner services and keep `reportService` limited to report/export/table concerns.

Target shape:

```js
fetchSummaryReport: getSummaryReport,
fetchDashboardAnalytics: getDashboardAnalytics,
fetchTodayLocations: getTodayLocations,
fetchFuzzyAhpAnalysis: getFuzzyAhpAnalysis,
fetchGeofenceEvidence: getGeofenceEvidence,
```

The cockpit should no longer rely on `getMockSummaryData()` or any legacy FAHP owner in `reportService`.

- [ ] **Step 2: Update the ADR/doc note for cockpit source-of-truth alignment**

Add a concise note in `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md` documenting that cockpit dashboard panels now use strict owner endpoints and no longer fall back to preview runtime paths.

```md
- Dashboard cockpit recap panels remain lightweight consumers of `/api/summary/dashboard-analytics`.
- Geofence evidence, live map, and Fuzzy AHP surfaces each consume their dedicated owner endpoints directly.
- Web FE no longer treats preview or shell-era runtime data as a valid success path for operational dashboard panels.
```

- [ ] **Step 3: Run the explicit automated checks**

Run:
- `node --test src/js/services/dashboardCockpitService.test.js`
- `node --test src/js/features/dashboard/dashboardCockpitState.test.js`
- `npm run build`
- `npm run lint`

Expected:
- both node test files PASS
- webpack build completes successfully
- prettier check passes or reports only unrelated pre-existing issues that must be surfaced explicitly

- [ ] **Step 4: Prepare runtime proof checklist for the credentialed verification pass**

Because credentials are not yet available, do not claim runtime success. Instead prepare the exact manual proof checklist to execute once credentials arrive:

```md
1. Start FE from the active worktree.
2. Login with valid backend credentials.
3. Confirm network request to `/api/summary/dashboard-analytics` and KPI/trend/mode mix rendering.
4. Confirm network request to `/api/attendance/geofence-evidence` and dedicated geofence panel rendering.
5. Confirm network request to `/api/attendance/today-locations` and live marker rendering.
6. Confirm three FAHP tab requests to `/api/analysis/fuzzy-ahp/dashboard?type=...`.
7. Confirm no panel displays preview-ready data when its owner request fails.
```

- [ ] **Step 5: Commit the verification/docs pass**

```bash
git add docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md src/js/services/reportService.js docs/superpowers/specs/2026-06-30-inf-160-dashboard-real-api-cockpit-design.md
git commit -m "docs: record cockpit owner-endpoint source-of-truth alignment"
```

---

## Self-review checklist

- Spec coverage: Tasks 1-5 cover the final FAHP owner contract, all four dashboard owner slices, dummy/preview runtime removal, cockpit binding cleanup, documentation update, and runtime proof preparation.
- Placeholder scan: No `TBD`, `TODO`, or “similar to previous task” placeholders remain.
- Type consistency:
  - FAHP request contract is consistently `type`
  - slice outputs are consistently owner-backed view models
  - runtime state model is consistently `loading` / `ready` / `empty` / `needsData` / `error`

## Runtime verification status

Manual runtime proof still **REQUIRES REPO VERIFICATION** until valid backend credentials are provided and the FE is run against the live environment from this worktree.
