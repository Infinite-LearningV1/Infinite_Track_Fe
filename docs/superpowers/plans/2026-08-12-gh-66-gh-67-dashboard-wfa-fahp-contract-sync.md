# GH-66 + GH-67 Dashboard WFA FAHP Contract Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the FAHP dashboard tab/error presentation regression and synchronize the WFA dashboard analysis flow with the dedicated Backend contract using explicit coordinates and schedule date.

**Architecture:** Keep `dashboard()` as the Alpine owner of tab selection and WFA context. Discipline/Smart AC continue through the generic dashboard FAHP endpoint, while WFA goes through a dedicated request builder, transport method, and response normalizer before entering the existing cockpit presentation model. The Fuzzy AHP partial becomes the single visual owner for FAHP navigation/status so runtime state cannot look like a fourth tab.

**Tech Stack:** Alpine.js 3.14.1, JavaScript ES modules, Axios through `authRequest`, static HTML include partials, Tailwind CSS 4, Node.js `node:test`, Webpack 5.

## Global Constraints

- Work only in `E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\dashboard-wfa-fahp-contract-sync` on `fix/dashboard-wfa-fahp-contract-sync`.
- Base implementation source is `origin/develop@d0bf4d159f48b13b472d2cbdf7b9ba2ec4d56795` plus local design commit `4843116`.
- GitHub #66 owns presentation hierarchy only; GitHub #67 owns WFA contract synchronization.
- Backend remains authoritative for FAHP weights, facility evidence, ranking, score, label, and eligibility decisions.
- WFA must use `GET /api/analysis/fuzzy-ahp/wfa` with explicit `lat`, `lon`, and `schedule_date`; `radius_meters` is optional and never fabricated.
- Discipline and Smart AC remain on `GET /api/analysis/fuzzy-ahp/dashboard?type=...`.
- Do not infer authoritative WFA coordinates from Live Map, attendance rows, or global state.
- Do not call `GET /api/wfa/recommendations` for this dashboard analysis surface.
- Do not add an Alpine global store, new frontend framework, or broad dashboard redesign.
- Do not push or create a PR unless the user explicitly requests it.
- Node.js runtime must remain compatible with repository requirement `>=20`; current worktree runtime is Node `v24.16.0`.
- Preserve `authRequest` as the HTTP/session boundary; do not create WFA-specific auth handling.
- Missing WFA context is local validation, not a transport error; Backend rejection remains authoritative once transport occurs.
- A valid 200 WFA response with insufficient facility evidence must not become fabricated `ready` ranking data.
- Missing consistency threshold/boolean must remain unavailable rather than being coerced to `0` or `false`.
- The three navigation options are exactly `Discipline`, `WFA`, and `Smart AC` in every runtime state.
- Baseline before implementation: `npm run build` passes; focused FAHP suite has 12 tests with 2 pass / 10 fail due known stale contract expectations.

## File Structure Lock

**Create:**

- `src/js/features/dashboard/wfaFahpContext.js` — pure WFA context defaults, validation, and request serialization.
- `src/js/services/dashboard/wfaFahpSlice.js` — dedicated Backend WFA analysis response normalizer/slice.
- `tests/dashboard/wfaFahpContext.test.js` — context/request contract tests.
- `tests/dashboard/wfaFahpSlice.test.js` — WFA response normalization tests.
- `tests/dashboard/wfaFahpCockpit.test.js` — cockpit adaptation and nullable consistency tests.

**Modify:**

- `src/js/services/fuzzyAhpService.js` — explicit generic vs WFA HTTP methods.
- `src/js/features/dashboard/fahpFilterState.js` — canonical tab selector validation only.
- `src/js/services/dashboard/fahpRecapSlice.js` — preserve canonical Discipline/Smart AC recap mapping and nullable consistency semantics.
- `src/js/services/dashboardCockpitService.js` — route raw FAHP responses to the correct normalizer and preserve active type.
- `src/js/components/fuzzyAhpPanel.js` — render unavailable consistency truthfully.
- `src/js/features/dashboard/dashboard.js` — WFA context state, service orchestration, and one active type owner.
- `src/partials/dashboard/dashboard-cockpit-grid.html` — delegate every Fuzzy AHP runtime state to the focused partial instead of owning a second tab implementation.
- `src/partials/dashboard/fuzzy-ahp-panel.html` — single FAHP navigation/status/context/result surface.
- `tests/fuzzy-ahp-service.test.js` — transport split and stale contract cleanup.
- `tests/dashboard/fahpRecapContractSync.test.js` — current Discipline/Smart AC Backend recap fixture.
- `tests/dashboard/fahpRecapSlice.test.js` — current tab/filter + recap normalization semantics.
- `tests/dashboard/dashboardPageOrchestration.test.js` — WFA selection/request isolation and refresh behavior.
- `tests/dashboard-cockpit-template.test.js` — exactly three tabs, separated status, explicit WFA context form.

## Canonical Interfaces

The tasks below must use these names consistently:

```js
// src/js/services/fuzzyAhpService.js
FuzzyAhpService#getDashboardFahpAnalysis({ type })
FuzzyAhpService#getWfaFahpAnalysis({ lat, lon, schedule_date, radius_meters? })
getDashboardFahpAnalysis(params)
getWfaFahpAnalysis(params)

// src/js/features/dashboard/wfaFahpContext.js
createDefaultWfaFahpContext()
validateWfaFahpContext(context)
buildWfaFahpRequestParams(context)

// src/js/services/dashboard/wfaFahpSlice.js
buildWfaFahpViewModel(response)
createWfaFahpSliceState(response, request)
```

```js
// dashboard() interaction methods
selectFahpType(type);
runWfaFahpAnalysis();
fetchFahpForDashboardRefresh();
invalidateWfaFahpResult();
```

---

### Task 1: Split Generic Dashboard FAHP Transport from Dedicated WFA Transport

**Files:**

- Modify: `src/js/services/fuzzyAhpService.js:1-31`
- Modify: `src/js/features/dashboard/fahpFilterState.js:1-11`
- Modify: `src/js/services/dashboard/fahpRecapSlice.js:1-48`
- Test: `tests/fuzzy-ahp-service.test.js`
- Test: `tests/dashboard/fahpRecapContractSync.test.js`
- Test: `tests/dashboard/fahpRecapSlice.test.js`

**Interfaces:**

- Consumes: `authRequest`, `API_CONFIG.BASE_URL`, dashboard tab values `discipline | wfa | smart_ac`.
- Produces: `getDashboardFahpAnalysis({ type })`, `getWfaFahpAnalysis(params)`, and a current-shape Discipline/Smart AC recap view model.
- The generic transport MUST reject `type === "wfa"`; WFA transport MUST never append `type=wfa` to the generic route.

- [ ] **Step 1: Replace stale transport tests with the canonical split and make them fail against current production code**

Use tests equivalent to:

```js
test("dashboard FAHP transport keeps Discipline on the generic endpoint", async () => {
  const seen = [];
  const service = new FuzzyAhpService(async (config) => {
    seen.push(config);
    return { data: { success: true, data: { type: "discipline" } } };
  });
  await service.getDashboardFahpAnalysis({ type: "discipline" });
  assert.deepEqual(seen, [
    {
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard`,
      params: { type: "discipline" },
    },
  ]);
});

test("generic dashboard FAHP transport rejects WFA", async () => {
  const service = new FuzzyAhpService(async () => ({ data: {} }));
  await assert.rejects(
    service.getDashboardFahpAnalysis({ type: "wfa" }),
    /dedicated WFA/i,
  );
});

test("WFA FAHP transport uses the dedicated endpoint", async () => {
  const seen = [];
  const service = new FuzzyAhpService(async (config) => {
    seen.push(config);
    return { data: { success: true, data: { candidates: [] } } };
  });
  await service.getWfaFahpAnalysis({
    lat: -6.2,
    lon: 106.816666,
    schedule_date: "2026-08-14",
  });
  assert.deepEqual(seen[0], {
    method: "get",
    url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/wfa`,
    params: { lat: -6.2, lon: 106.816666, schedule_date: "2026-08-14" },
  });
});
```

Also replace `category/analysis_type/sections` fixtures in the two recap tests with the current Backend recap shape: `data.type`, `type_label`, `status`, `needs_data`, `consistency`, `criteria_weights`, `ranking_preview`, `distribution`, and generated/window metadata. Keep WFA out of these recap fixtures.

- [ ] **Step 2: Run the transport + recap tests and verify the new assertions fail for the intended reasons**

Run:

```bash
node --test tests/fuzzy-ahp-service.test.js tests/dashboard/fahpRecapContractSync.test.js tests/dashboard/fahpRecapSlice.test.js
```

Expected before implementation: failures for missing `getDashboardFahpAnalysis` / `getWfaFahpAnalysis`, generic WFA not being rejected, and stale recap expectations no longer matching the existing tests.

- [ ] **Step 3: Implement the explicit transport methods and canonical tab validation**

Use this responsibility split in `fuzzyAhpService.js`:

```js
const DASHBOARD_TYPES = new Set(["discipline", "smart_ac"]);

async getDashboardFahpAnalysis({ type = "discipline" } = {}) {
  if (!DASHBOARD_TYPES.has(type)) {
    throw new Error(`WFA uses the dedicated WFA FAHP endpoint; invalid dashboard type: ${type}.`);
  }
  const response = await this.requestExecutor({
    method: "get",
    url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard`,
    params: { type },
  });
  return response.data;
}

async getWfaFahpAnalysis(params) {
  const response = await this.requestExecutor({
    method: "get",
    url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/wfa`,
    params,
  });
  return response.data;
}
```

Export the two explicit convenience functions with the same names. For Task 1 only, keep a temporary compatibility alias so the still-unmodified `dashboard.js` remains runnable between commits:

```js
getFuzzyAhpAnalysis(params) {
  return this.getDashboardFahpAnalysis(params);
}

export const getFuzzyAhpAnalysis = (params) =>
  fuzzyAhpService.getFuzzyAhpAnalysis(params);
```

The compatibility alias inherits the generic method's WFA rejection, so it cannot send `type=wfa`. Task 5 updates the production consumer to the explicit exports and then removes this alias and its compatibility-only test.

In `fahpFilterState.js`, keep selection separate from transport:

```js
const FAHP_TYPES = new Set(["discipline", "wfa", "smart_ac"]);

export function createDefaultFahpFilterState() {
  return { type: "discipline" };
}

export function buildFahpRequestParams(state) {
  const type = state?.type || "discipline";
  if (!FAHP_TYPES.has(type)) {
    throw new Error(`Invalid FAHP type: ${type}`);
  }
  return { type };
}
```

In `fahpRecapSlice.js`, keep the current Backend keys and stop coercing missing consistency evidence:

```js
isConsistent:
  typeof data.consistency?.is_consistent === "boolean"
    ? data.consistency.is_consistent
    : null,
```

Do not add WFA raw-candidate parsing to `fahpRecapSlice.js`.

- [ ] **Step 4: Run the focused generic-contract tests**

Run the same three-file `node --test` command. Expected: all Task 1 tests pass; no test expects `dashboard-recap`, `category`, or `analysis_type` anymore.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/js/services/fuzzyAhpService.js src/js/features/dashboard/fahpFilterState.js src/js/services/dashboard/fahpRecapSlice.js tests/fuzzy-ahp-service.test.js tests/dashboard/fahpRecapContractSync.test.js tests/dashboard/fahpRecapSlice.test.js
git commit -m "refactor(GH-67): split dashboard and WFA FAHP transport"
```

---

### Task 2: Add Explicit WFA Analysis Context Validation and Request Serialization

**Files:**

- Create: `src/js/features/dashboard/wfaFahpContext.js`
- Create: `tests/dashboard/wfaFahpContext.test.js`

**Interfaces:**

- Consumes: page-local form values `latitude`, `longitude`, `scheduleDate`, `radiusMeters`.
- Produces: `createDefaultWfaFahpContext()`, `validateWfaFahpContext(context)`, and `buildWfaFahpRequestParams(context)`.
- UI state values may be strings for Alpine inputs; serialized `lat`, `lon`, and optional `radius_meters` MUST be finite numbers.
- Frontend validates shape/ranges/date syntax only. It MUST NOT duplicate Backend future-date, duplicate-booking, or eligibility policy.

- [ ] **Step 1: Write failing pure-contract tests**

Create tests equivalent to:

```js
test("default WFA FAHP context is empty page-local input state", () => {
  assert.deepEqual(createDefaultWfaFahpContext(), {
    latitude: "",
    longitude: "",
    scheduleDate: "",
    radiusMeters: "",
    validationError: null,
  });
});

test("WFA request builder serializes explicit coordinates and date", () => {
  assert.deepEqual(
    buildWfaFahpRequestParams({
      latitude: "-6.200000",
      longitude: "106.816666",
      scheduleDate: "2026-08-14",
      radiusMeters: "",
    }),
    {
      lat: -6.2,
      lon: 106.816666,
      schedule_date: "2026-08-14",
    },
  );
});
```

```js
test("WFA request builder includes radius only when explicitly provided", () => {
  assert.deepEqual(
    buildWfaFahpRequestParams({
      latitude: -6.2,
      longitude: 106.816666,
      scheduleDate: "2026-08-14",
      radiusMeters: "3500",
    }),
    {
      lat: -6.2,
      lon: 106.816666,
      schedule_date: "2026-08-14",
      radius_meters: 3500,
    },
  );
});

test("invalid WFA context is rejected before transport", () => {
  assert.throws(
    () =>
      buildWfaFahpRequestParams({
        latitude: "",
        longitude: "181",
        scheduleDate: "14-08-2026",
        radiusMeters: "0",
      }),
    (error) => error.code === "WFA_FAHP_CONTEXT_INVALID",
  );
});
```

Add these exact validation cases to the test file:

| Input mutation               | Expected message                                   |
| ---------------------------- | -------------------------------------------------- |
| `latitude: "91"`             | `Latitude must be a number between -90 and 90.`    |
| `longitude: "-181"`          | `Longitude must be a number between -180 and 180.` |
| `scheduleDate: "2026-02-30"` | `Schedule date must be a valid YYYY-MM-DD date.`   |
| `scheduleDate: "14-08-2026"` | `Schedule date must be a valid YYYY-MM-DD date.`   |
| `radiusMeters: "0"`          | `Radius must be a positive number when provided.`  |
| `radiusMeters: "abc"`        | `Radius must be a positive number when provided.`  |

- [ ] **Step 2: Run the new test file and verify it fails because the module does not exist**

```bash
node --test tests/dashboard/wfaFahpContext.test.js
```

Expected: module-not-found or missing-export failure.

- [ ] **Step 3: Implement the pure context module**
      Implement a local date parser modeled after the existing dashboard-range validation, without enforcing Backend eligibility:

```js
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value) {
  if (!DATE_REGEX.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}
```

`validateWfaFahpContext(context)` must return:

```js
{ isValid: true, message: "", request }
// or one of the exact invalid results below:
{ isValid: false, message: "WFA analysis requires latitude, longitude, and schedule date.", request: null }
{ isValid: false, message: "Latitude must be a number between -90 and 90.", request: null }
{ isValid: false, message: "Longitude must be a number between -180 and 180.", request: null }
{ isValid: false, message: "Schedule date must be a valid YYYY-MM-DD date.", request: null }
{ isValid: false, message: "Radius must be a positive number when provided.", request: null }
```

`buildWfaFahpRequestParams(context)` calls the validator and, when invalid, throws an `Error` whose `code` is exactly `WFA_FAHP_CONTEXT_INVALID` and whose message is the validation message.

Validation order must be deterministic and use the exact messages above: missing required context → latitude range → longitude range → date syntax/validity → optional radius validity.

- [ ] **Step 4: Run the pure-context tests**

```bash
node --test tests/dashboard/wfaFahpContext.test.js
```

Expected: all tests pass and no HTTP/service module is imported by this file.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/js/features/dashboard/wfaFahpContext.js tests/dashboard/wfaFahpContext.test.js
git commit -m "feat(GH-67): add explicit WFA FAHP context contract"
```

---

### Task 3: Normalize the Dedicated Backend WFA Analysis Response

**Files:**

- Create: `src/js/services/dashboard/wfaFahpSlice.js`
- Create: `tests/dashboard/wfaFahpSlice.test.js`

**Interfaces:**

- Consumes: Backend envelope `{ success, data: { candidates, searchCriteria, methodology } }` from `/analysis/fuzzy-ahp/wfa`.
- Produces: the same presentation-facing field family consumed by `dashboardCockpitService`: `type`, `typeLabel`, `status`, `needsData`, `consistency`, `criteriaWeights`, `rankingPreview`, `distribution`, plus bounded `evidence` metadata.
- `consistency.isConsistent` and `consistency.threshold` are nullable because the current WFA pipeline does not author them.
- Only candidates with `status === "ranked"`, positive rank, and finite `final_score` may enter `rankingPreview.items`.

- [ ] **Step 1: Write failing WFA response normalization tests**

Use a canonical fixture:

```js
const rankedResponse = {
  success: true,
  data: {
    candidates: [
      {
        place_id: "place-1",
        name: "Workspace One",
        address: "Jakarta",
        status: "ranked",
        facility_score: 82.5,
        facility_confidence: 80,
        final_score: 88.25,
        final_label: "Sangat Layak",
        rank: 1,
      },
    ],
    searchCriteria: { center_latitude: -6.2, center_longitude: 106.816666 },
    methodology: {
      criteria_weights: {
        location_type: 0.4,
        distance_factor: 0.3,
        facility_score: 0.3,
        consistency_ratio: 0.06,
        weighting_method: "fuzzy_ahp",
      },
      facility_matrix: { consistency_ratio: 0.05 },
    },
  },
};
```

Assert the ready mapping exactly:

```js
const result = buildWfaFahpViewModel(rankedResponse);
assert.equal(result.type, "wfa");
assert.equal(result.typeLabel, "WFA");
assert.equal(result.status, "ready");
assert.equal(result.needsData, false);
assert.deepEqual(result.consistency, {
  CR: 0.06,
  threshold: null,
  isConsistent: null,
  summaryLabel: null,
});
assert.deepEqual(
  result.criteriaWeights.map(({ key, value }) => ({ key, value })),
  [
    { key: "location_type", value: 0.4 },
    { key: "distance_factor", value: 0.3 },
    { key: "facility_score", value: 0.3 },
  ],
);
assert.deepEqual(result.rankingPreview.items[0], {
  id: "place-1",
  name: "Workspace One",
  label: "Sangat Layak",
  score: 88.25,
  rank: 1,
});
```

Add tests for:

```text
candidates: []
→ status = empty, needsData = false, rankingPreview.items = []

only insufficient_facility_data / facility_enrichment_failed candidates
→ status = needs_data, needsData = true, rankingPreview.items = []

mixed ranked + non-ranked candidates
→ status = ready, preview contains ranked candidates only

missing candidates/methodology/three required weight values
→ throw "Invalid WFA FAHP analysis contract"
```

- [ ] **Step 2: Run the WFA slice tests and verify module-not-found/missing-export failure**

```bash
node --test tests/dashboard/wfaFahpSlice.test.js
```

- [ ] **Step 3: Implement the dedicated normalizer with explicit required criteria**

Lock the criteria metadata in one constant:

```js
const WFA_CRITERIA = [
  {
    key: "location_type",
    label: "Location Type",
    displayLabel: "Location Type",
  },
  {
    key: "distance_factor",
    label: "Distance Factor",
    displayLabel: "Distance Factor",
  },
  {
    key: "facility_score",
    label: "Facility Score",
    displayLabel: "Facility Score",
  },
];
```

Build `criteriaWeights` as:

```js
const criteriaWeights = WFA_CRITERIA.map(({ key, label, displayLabel }) => ({
  key,
  label,
  display_label: displayLabel,
  value: Number(weights[key]),
}));

if (criteriaWeights.some((criterion) => !Number.isFinite(criterion.value))) {
  throw new Error(
    "Invalid WFA FAHP analysis contract: criteria weights are incomplete.",
  );
}
```

Derive candidate state without recomputing any score:

```js
const ranked = data.candidates
  .filter(
    (candidate) =>
      candidate?.status === "ranked" &&
      Number.isFinite(Number(candidate.rank)) &&
      Number(candidate.rank) > 0 &&
      Number.isFinite(Number(candidate.final_score)),
  )
  .sort((left, right) => Number(left.rank) - Number(right.rank));
```

Return the canonical view model:

```js
return {
  type: "wfa",
  typeLabel: "WFA",
  generatedAt: null,
  timezone: null,
  requestedWindow: null,
  executedWindow: null,
  status: ranked.length
    ? "ready"
    : data.candidates.length
      ? "needs_data"
      : "empty",
  needsData: !ranked.length && data.candidates.length > 0,
  consistency: {
    CR: Number.isFinite(Number(weights.consistency_ratio))
      ? Number(weights.consistency_ratio)
      : null,
    threshold: null,
    isConsistent: null,
    summaryLabel: null,
  },
  criteriaWeights,
  rankingPreview: {
    top_n: 5,
    items: ranked.slice(0, 5).map((candidate) => ({
      id: candidate.place_id,
      name: candidate.name || "",
      label: candidate.final_label ?? null,
      score: Number(candidate.final_score),
      rank: Number(candidate.rank),
    })),
  },
  distribution: null,
  evidence: {
    searchCriteria: data.searchCriteria ?? null,
    facilityMatrix: data.methodology.facility_matrix ?? null,
    candidateStatuses: data.candidates.map(
      (candidate) => candidate?.status ?? null,
    ),
  },
};
```

`createWfaFahpSliceState(response, request)` must mirror the existing slice convention:

```js
const data = buildWfaFahpViewModel(response);
return { status: data.status, data, error: null, request, meta: {} };
```

Do not expose raw provider payloads beyond the bounded `evidence` fields above.

- [ ] **Step 4: Run the WFA slice tests**

```bash
node --test tests/dashboard/wfaFahpSlice.test.js
```

Expected: all normalization/status/contract-failure tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/js/services/dashboard/wfaFahpSlice.js tests/dashboard/wfaFahpSlice.test.js
git commit -m "feat(GH-67): normalize dedicated WFA FAHP analysis"
```

---

### Task 4: Adapt Canonical WFA Data into the Existing Cockpit and Preserve Unknown Consistency

**Files:**

- Modify: `src/js/services/dashboardCockpitService.js:1616-1866,2017-2079`
- Modify: `src/js/components/fuzzyAhpPanel.js:1-108`
- Create: `tests/dashboard/wfaFahpCockpit.test.js`
- Test: `tests/dashboard-cockpit-template.test.js` only for component-facing assumptions that do not require HTML edits yet.

**Interfaces:**

- Consumes: raw generic recap response or raw dedicated WFA analysis response plus `fuzzyAhpActiveType`.
- Produces: one `panel.data.decisions` presentation contract for the existing `createFuzzyAhpViewState` consumer.
- Unknown `isConsistent` remains `null`; presentation must display an unavailable state without amber "Needs Review" fabrication.
- [ ] **Step 1: Write failing cockpit/view-state tests**

Cover these cases:

```js
test("WFA raw analysis becomes the canonical ready FAHP panel", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    fuzzyAhpResponse: rankedResponse,
    fuzzyAhpActiveType: "wfa",
  });
  const panel = cockpit.bottomPanels.find((item) => item.key === "fuzzyAhp");

  assert.equal(panel.state, "ready");
  assert.equal(panel.data.activeType, "wfa");
  assert.equal(panel.data.decisions[0].key, "wfa");
  assert.equal(panel.data.decisions[0].consistencyRatio, 0.06);
  assert.equal(panel.data.decisions[0].consistencyThreshold, null);
  assert.equal(panel.data.decisions[0].isConsistent, null);
  assert.equal(panel.data.decisions[0].rankings[0].name, "Workspace One");
});

test("WFA request error keeps WFA selected in fallback panel data", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    fuzzyAhpResponse: null,
    fuzzyAhpError: new Error("provider unavailable"),
    fuzzyAhpActiveType: "wfa",
  });
  const panel = cockpit.bottomPanels.find((item) => item.key === "fuzzyAhp");
  assert.equal(panel.state, "error");
  assert.equal(panel.data.activeType, "wfa");
});
```

Also test malformed WFA 200 payload → local FAHP panel `error`; `createFuzzyAhpViewState` with null threshold/boolean → `isConsistent === null`, label `Tidak tersedia`, threshold label `—`; and both `createDashboardCockpitLoadingState("wfa")` and `createDashboardCockpitErrorState("failed", "wfa")` expose `data.activeType === "wfa"` with exactly three `typeOptions`.

- [ ] **Step 2: Run the new cockpit test and verify it fails**

```bash
node --test tests/dashboard/wfaFahpCockpit.test.js
```

- [ ] **Step 3: Add contract routing and local normalization failure handling to the cockpit**

Import `buildWfaFahpViewModel`. Make the internal normalizer return both value and contract error so malformed WFA data does not fail the entire dashboard:

```js
function normalizeFuzzyAhpResponse(fuzzyAhpResponse = null) {
  if (fuzzyAhpResponse === null || typeof fuzzyAhpResponse === "undefined") {
    return { value: null, error: null };
  }
  if (typeof fuzzyAhpResponse !== "object" || Array.isArray(fuzzyAhpResponse)) {
    return { value: false, error: null };
  }

  try {
    const data = fuzzyAhpResponse?.data;
    const isWfaAnalysis =
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      (Object.prototype.hasOwnProperty.call(data, "candidates") ||
        Object.prototype.hasOwnProperty.call(data, "searchCriteria") ||
        Object.prototype.hasOwnProperty.call(data, "methodology"));
    const viewModel = isWfaAnalysis
      ? buildWfaFahpViewModel(fuzzyAhpResponse)
      : buildFahpDashboardRecapViewModel(fuzzyAhpResponse);
    return {
      value: { ...viewModel, source: FUZZY_AHP_SOURCE_KEY },
      error: null,
    };
  } catch (error) {
    return { value: null, error };
  }
}
```

Add `fuzzyAhpActiveType = "discipline"` to `createDashboardCockpitStateFromSources` and `loadDashboardCockpitState`, then call:

```js
const normalization = normalizeFuzzyAhpResponse(fuzzyAhpResponse);
const effectiveFahpError = fuzzyAhpError || normalization.error;
buildExplicitFuzzyAhpPanel(
  normalization.value,
  effectiveFahpError,
  fuzzyAhpActiveType,
);
```

Update every fallback branch in `buildExplicitFuzzyAhpPanel` to call `createFuzzyAhpFallbackData(activeType)` rather than silently resetting to Discipline.

Also change the top-level signatures to:

```js
createDashboardCockpitLoadingState((fuzzyAhpActiveType = "discipline"));
createDashboardCockpitErrorState(message, (fuzzyAhpActiveType = "discipline"));
```

Inside `createDashboardCockpitLoadingState`, replace only the existing `bottomPanels` assignment with:

```js
const bottomPanels = BOTTOM_PANEL_DEFINITIONS.map((panel) =>
  panel.key === "fuzzyAhp"
    ? createPanel({
        ...panel,
        state: DASHBOARD_PANEL_STATES.LOADING,
        message: "Loading panel data.",
        data: createFuzzyAhpFallbackData(fuzzyAhpActiveType),
      })
    : createLoadingPanel(panel),
);
```

Inside `createDashboardCockpitErrorState`, replace only the existing `bottomPanels` assignment with:

```js
const bottomPanels = BOTTOM_PANEL_DEFINITIONS.map((panel) =>
  panel.key === "fuzzyAhp"
    ? createPanel({
        ...panel,
        state: DASHBOARD_PANEL_STATES.ERROR,
        message,
        data: createFuzzyAhpFallbackData(fuzzyAhpActiveType),
      })
    : createErrorPanel(panel, message),
);
```

Leave the existing hero, KPI, middle-panel, and `composeCockpit` construction unchanged.

Preserve tri-state consistency in `buildFuzzyAhpDecisionPayload`:

````js
const explicitConsistency = fuzzyAhp.consistency?.isConsistent;
const isConsistent =
  typeof explicitConsistency === "boolean" ? explicitConsistency : null;

Replace only the consistency-related assignments in the existing return object with:

```js
consistencyRatio: fuzzyAhp.consistency?.CR ?? null,
  consistencyThreshold: fuzzyAhp.consistency?.threshold ?? null,
  consistencyStatus:
    fuzzyAhp.consistency?.summaryLabel ||
    (isConsistent === true
      ? "Consistent"
      : isConsistent === false
        ? "Needs Review"
        : null),
isConsistent,
````

Keep the existing `key`, `title`, `summary`, `updatedAtLabel`, `criteriaWeights`, `rankings`, and `distribution` assignments unchanged.

- [ ] **Step 4: Make `createFuzzyAhpViewState` tri-state instead of boolean-coercing unavailable evidence**

Use:

```js
const explicitConsistency =
  typeof activeDecision?.isConsistent === "boolean"
    ? activeDecision.isConsistent
    : null;
const derivedConsistency =
  explicitConsistency === null &&
  Number.isFinite(consistencyRatio) &&
  Number.isFinite(threshold)
    ? consistencyRatio <= threshold
    : null;
const isConsistent = explicitConsistency ?? derivedConsistency;
```

`normalizeConsistencyStatusLabel` must return `"Tidak tersedia"` when neither an explicit label nor a boolean consistency result exists.
Do not derive a threshold for WFA. `formatDecimal(null, ...)` already renders `—`; keep that truthful behavior.

- [ ] **Step 5: Run cockpit + normalizer regression tests**

```bash
node --test tests/dashboard/wfaFahpSlice.test.js tests/dashboard/wfaFahpCockpit.test.js tests/dashboard/fahpRecapContractSync.test.js tests/dashboard/fahpRecapSlice.test.js
```

Expected: WFA ready/needs-data/error semantics and generic recap semantics all pass together.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/js/services/dashboardCockpitService.js src/js/components/fuzzyAhpPanel.js tests/dashboard/wfaFahpCockpit.test.js
git commit -m "refactor(GH-67): adapt WFA FAHP into cockpit state"
```

---

### Task 5: Wire Explicit WFA Context and Single Active-Type Ownership into `dashboard()`

**Files:**

- Modify: `src/js/services/fuzzyAhpService.js: remove Task 1 compatibility alias after dashboard migration`
- Modify: `src/js/features/dashboard/dashboard.js:1-50,85-390,1384-1500,1736-1778`
- Modify/Test: `src/js/features/dashboard/dashboard-period.test.js: focused FAHP section`
- Test: `tests/dashboard/dashboardPageOrchestration.test.js`

**Interfaces:**

- Consumes: Task 1 service exports, Task 2 context builder, Task 3 WFA slice state.
- Produces: page-local `wfaFahpContext`, `selectFahpType(type)`, `runWfaFahpAnalysis()`, `fetchFahpForDashboardRefresh()`, and `invalidateWfaFahpResult()`.
- `fahpFilterState.type` is the only active-tab source of truth.
- Selecting WFA is not itself permission to send a request; the user must submit valid explicit context.

- [ ] **Step 1: Add failing orchestration tests for selection isolation**

```js
test("selecting WFA changes the active type without sending either FAHP request", async () => {
  const component = dashboard();
  let genericCalls = 0;
  let wfaCalls = 0;
  component.fetchDashboardFahpAnalysis = async () => {
    genericCalls += 1;
  };
  component.fetchWfaFahpAnalysis = async () => {
    wfaCalls += 1;
  };

  await component.selectFahpType("wfa");

  assert.equal(component.fahpFilterState.type, "wfa");
  assert.equal(genericCalls, 0);
  assert.equal(wfaCalls, 0);
});
```

Add these tests too:

```js
test("invalid WFA context blocks transport and records validation feedback", async () => {
  const component = dashboard();
  let wfaCalls = 0;
  component.fetchWfaFahpAnalysis = async () => {
    wfaCalls += 1;
  };
  component.fahpFilterState = { type: "wfa" };

  const result = await component.runWfaFahpAnalysis();

  assert.equal(result, false);
  assert.equal(wfaCalls, 0);
  assert.match(
    component.wfaFahpContext.validationError,
    /location|coordinate|date/i,
  );
});

test("valid WFA context calls only the dedicated transport", async () => {
  const component = dashboard();
  const seen = [];
  component.fetchWfaFahpAnalysis = async (params) => {
    seen.push(params);
    return rankedResponse;
  };
  component.wfaFahpContext = {
    latitude: "-6.2",
    longitude: "106.816666",
    scheduleDate: "2026-08-14",
    radiusMeters: "",
    validationError: null,
  };
  component.applyCockpitSurfaceState = () => {};

  assert.equal(await component.runWfaFahpAnalysis(), true);
  assert.deepEqual(seen, [
    { lat: -6.2, lon: 106.816666, schedule_date: "2026-08-14" },
  ]);
  assert.equal(component.fahpFilterState.type, "wfa");
  assert.equal(component.rawApiData.wfaFahp.data.type, "wfa");
});
```

Add a refresh-isolation test:

```js
test("dashboard summary refresh does not silently re-request WFA analysis", async () => {
  const component = dashboard();
  let genericCalls = 0;
  component.fahpFilterState = { type: "wfa" };
  component.fuzzyAhpResponse = rankedResponse;
  component.fetchDashboardFahpAnalysis = async () => {
    genericCalls += 1;
    throw new Error("must not run");
  };

  const result = await component.fetchFahpForDashboardRefresh();

  assert.equal(genericCalls, 0);
  assert.equal(result.response, rankedResponse);
  assert.equal(result.error, component.fuzzyAhpError);
});
```

Keep the existing `refreshFahpRecap refetches only the FAHP slice` test for generic types and update method/property names only where the Task 1 service rename requires it.

Add stale-result invalidation coverage:

```js
test("editing WFA context invalidates the previously rendered WFA result", async () => {
  const component = dashboard();
  component.fahpFilterState = { type: "wfa" };
  component.fuzzyAhpResponse = rankedResponse;
  component.rawApiData = { wfaFahp: { data: { type: "wfa" } } };
  component.applyCockpitSurfaceState = async () => {};

  await component.invalidateWfaFahpResult();

  assert.equal(component.fuzzyAhpResponse, null);
  assert.equal(component.fuzzyAhpError, null);
  assert.equal(component.rawApiData.wfaFahp, null);
});
```

- [ ] **Step 2: Run orchestration tests and verify the new methods/state fail before implementation**

```bash
node --test tests/dashboard/dashboardPageOrchestration.test.js src/js/features/dashboard/dashboard-period.test.js
```

- [ ] **Step 3: Add imports and page-local state**

Replace the direct service import with:

```js
import {
  getDashboardFahpAnalysis,
  getWfaFahpAnalysis,
} from "../../services/fuzzyAhpService.js";
import { createWfaFahpSliceState } from "../../services/dashboard/wfaFahpSlice.js";
import {
  buildWfaFahpRequestParams,
  createDefaultWfaFahpContext,
  validateWfaFahpContext,
} from "./wfaFahpContext.js";
```

Initialize:

```js
const defaultWfaFahpContext = createDefaultWfaFahpContext();
```

Add these properties to the existing object returned by `dashboard()`:

```js
fahpFilterState: { ...defaultFahpFilterState },
wfaFahpContext: { ...defaultWfaFahpContext },
fetchDashboardFahpAnalysis: getDashboardFahpAnalysis,
fetchWfaFahpAnalysis: getWfaFahpAnalysis,
```

The existing `fetchFahpRecap` callback inside `init()` remains generic and calls only `this.fetchDashboardFahpAnalysis(requestParams)`. After these imports/property injections compile, remove the temporary Task 1 `getFuzzyAhpAnalysis` class method/export from `fuzzyAhpService.js` and remove its compatibility-only test; all dashboard production code must now use the explicit names.

- [ ] **Step 4: Implement `fetchFahpForDashboardRefresh()` and use it from `loadSummaryData()`**

```js
async fetchFahpForDashboardRefresh() {
  const { type } = buildFahpRequestParams(this.fahpFilterState);

  if (type === "wfa") {
    return {
      response: this.fuzzyAhpResponse,
      error: this.fuzzyAhpError,
    };
  }

  try {
    return {
      response: await this.fetchDashboardFahpAnalysis({ type }),
      error: null,
    };
  } catch (error) {
    return { response: null, error };
  }
},
```

In `loadSummaryData()`, replace the direct generic FAHP request with `this.fetchFahpForDashboardRefresh()`. Unpack its `{ response, error }` pair after `Promise.allSettled`; do not transform an active WFA selection back into a generic request during unrelated dashboard-range/report refreshes. Also change the loading reset to `this.cockpit = createDashboardCockpitLoadingState(this.fahpFilterState.type)` so WFA remains the visually active tab during unrelated dashboard refreshes. In `applySummaryError(error)`, call `createDashboardCockpitErrorState(message, this.fahpFilterState.type)` for the same reason.

- [ ] **Step 5: Implement explicit tab selection and WFA analysis submission**

Use a selection method that never sends WFA transport on tab click:

```js
async selectFahpType(type) {
  const nextFilterState = buildFahpRequestParams({ type });
  this.fahpFilterState = { ...nextFilterState };

  if (nextFilterState.type === "wfa") {
    this.fuzzyAhpResponse = null;
    this.fuzzyAhpError = null;
    this.wfaFahpContext = {
      ...this.wfaFahpContext,
      validationError: null,
    };
    this.rawApiData = {
      ...(this.rawApiData || {}),
      wfaFahp: null,
    };
    await this.applyCockpitSurfaceState({
      fuzzyAhpResponse: null,
      fuzzyAhpError: null,
    });
    return true;
  }

  return this.loadFuzzyAhpDetail(nextFilterState);
},
```

Add explicit stale-result invalidation before the submit method:

```js
async invalidateWfaFahpResult() {
  if (this.fahpFilterState.type !== "wfa") {
    return false;
  }

  this.fuzzyAhpResponse = null;
  this.fuzzyAhpError = null;
  this.wfaFahpContext = {
    ...this.wfaFahpContext,
    validationError: null,
  };
  this.rawApiData = {
    ...(this.rawApiData || {}),
    wfaFahp: null,
  };
  await this.applyCockpitSurfaceState({
    fuzzyAhpResponse: null,
    fuzzyAhpError: null,
  });
  return true;
},
```

Implement WFA submission as a separate intent:

````js
async runWfaFahpAnalysis() {
  this.fahpFilterState = { type: "wfa" };
  const validation = validateWfaFahpContext(this.wfaFahpContext);

  if (!validation.isValid) {
    this.wfaFahpContext = {
      ...this.wfaFahpContext,
      validationError: validation.message,
    };
    this.fuzzyAhpResponse = null;
    this.fuzzyAhpError = null;
    this.rawApiData = {
      ...(this.rawApiData || {}),
      wfaFahp: null,
    };
    await this.applyCockpitSurfaceState({ fuzzyAhpResponse: null, fuzzyAhpError: null });
    return false;
  }
```js
  const requestParams = buildWfaFahpRequestParams(this.wfaFahpContext);
  this.wfaFahpContext = { ...this.wfaFahpContext, validationError: null };
  this.fuzzyAhpResponse = null;
  this.fuzzyAhpError = null;
  this.rawApiData = {
    ...(this.rawApiData || {}),
    wfaFahp: null,
  };
  await this.applyCockpitSurfaceState({ fuzzyAhpResponse: null, fuzzyAhpError: null });

  try {
    const response = await this.fetchWfaFahpAnalysis(requestParams);
    const sliceState = createWfaFahpSliceState(response, requestParams);
    this.fuzzyAhpResponse = response;
    this.fuzzyAhpError = null;
    this.rawApiData = {
      ...(this.rawApiData || {}),
      wfaFahp: sliceState,
    };
    await this.applyCockpitSurfaceState({
      fuzzyAhpResponse: response,
      fuzzyAhpError: null,
    });
    return true;
  } catch (error) {
    this.fuzzyAhpResponse = null;
    this.fuzzyAhpError = error;
    await this.applyCockpitSurfaceState({
      fuzzyAhpResponse: null,
      fuzzyAhpError: error,
    });
    return false;
  }
},
````

Keep `loadFuzzyAhpDetail` generic. Add an early guard so a direct legacy call with `{ type: "wfa" }` delegates to `selectFahpType("wfa")` rather than reaching the generic service.

- [ ] **Step 6: Pass the active type into every cockpit rebuild and keep raw slice ownership separate**

In `applyCockpitSurfaceState()` and `applySummaryResponse()`, add:

```js
fuzzyAhpActiveType: this.fahpFilterState.type,
```

Before rebuilding `rawApiData` in `applySummaryResponse`, preserve the prior type-specific slice and build only the active slice:

```js
const previousFahpRecap = this.rawApiData?.fahpRecap ?? null;
const previousWfaFahp = this.rawApiData?.wfaFahp ?? null;
const activeGenericFahpSlice =
  this.fahpFilterState.type !== "wfa" &&
  fuzzyAhpResponse !== null &&
  typeof fuzzyAhpResponse !== "undefined"
    ? createFahpRecapSliceState(fuzzyAhpResponse, this.fahpFilterState)
    : null;
```

Then assign:

```js
fahpRecap:
  this.fahpFilterState.type === "wfa"
    ? previousFahpRecap
    : activeGenericFahpSlice,
wfaFahp: previousWfaFahp,
```

This prevents a WFA raw response from ever entering `createFahpRecapSliceState` and prevents an unrelated dashboard refresh from rebuilding WFA evidence against mutable form values. `runWfaFahpAnalysis()` is the only code path that creates `rawApiData.wfaFahp`, using the exact request object that produced that response.

Update `src/js/features/dashboard/dashboard-period.test.js` to inject `fetchDashboardFahpAnalysis` instead of the removed ambiguous direct-service property. Preserve its existing assertion that generic Discipline data lives under `rawApiData.fahpRecap`.

- [ ] **Step 7: Run orchestration + focused contract tests**

```bash
node --test tests/dashboard/dashboardPageOrchestration.test.js src/js/features/dashboard/dashboard-period.test.js tests/fuzzy-ahp-service.test.js tests/dashboard/wfaFahpContext.test.js tests/dashboard/wfaFahpSlice.test.js tests/dashboard/wfaFahpCockpit.test.js
```

Expected: WFA tab selection produces zero network calls, valid WFA submission uses only the dedicated endpoint, generic tab refresh remains isolated, and raw slices never cross normalizers.

- [ ] **Step 8: Commit Task 5**

```bash
git add src/js/services/fuzzyAhpService.js src/js/features/dashboard/dashboard.js src/js/features/dashboard/dashboard-period.test.js tests/fuzzy-ahp-service.test.js tests/dashboard/dashboardPageOrchestration.test.js
git commit -m "feat(GH-67): wire explicit WFA dashboard analysis"
```

---

### Task 6: Make the Focused Fuzzy AHP Partial Own Navigation, Status, WFA Context, and All Runtime States

**Files:**

- Modify: `src/partials/dashboard/dashboard-cockpit-grid.html:171-290`
- Modify: `src/partials/dashboard/fuzzy-ahp-panel.html:1-142`
- Test: `tests/dashboard-cockpit-template.test.js`

**Interfaces:**

- Consumes: `panel`, `fahpFilterState.type`, `wfaFahpContext`, `selectFahpType(type)`, `runWfaFahpAnalysis()`, `invalidateWfaFahpResult()`, `getFuzzyAhpViewState(panel, type)`.
- Produces: one visual implementation of the three-tab segmented control for `loading/ready/empty/needsData/backendRequired/error` states.
- Runtime `panel.stateLabel` is supporting status only and MUST NOT be inside `<nav>`.
- The WFA form owns explicit coordinate/date input; it MUST NOT read or bind Live Map coordinates.

- [ ] **Step 1: Update template regression tests first so they fail against the duplicated current UI**

Add structural assertions:

```js
test("FAHP partial owns one stable three-option navigation and separate runtime status", () => {
  assert.equal((fuzzyAhpPartial.match(/<nav\b/g) ?? []).length, 1);
  assert.match(
    fuzzyAhpPartial,
    /x-for="option in panel\.data\.typeOptions \|\| \[\]"/,
  );
  assert.match(fuzzyAhpPartial, /@click="selectFahpType\(option\.key\)"/);
  assert.match(fuzzyAhpPartial, /fahpFilterState\.type === option\.key/);

  const navStart = fuzzyAhpPartial.indexOf("<nav");
  const navEnd = fuzzyAhpPartial.indexOf("</nav>", navStart);
  assert.equal(
    fuzzyAhpPartial.slice(navStart, navEnd).includes("panel.stateLabel"),
    false,
  );
  assert.match(fuzzyAhpPartial, /data-fahp-status/);
  assert.match(fuzzyAhpPartial, /x-text="panel\.stateLabel"/);
});
```

Add the WFA context contract assertions:

```js
test("FAHP partial exposes explicit WFA analysis context instead of hidden map inference", () => {
  assert.match(fuzzyAhpPartial, /fahpFilterState\.type === 'wfa'/);
  assert.match(fuzzyAhpPartial, /@submit\.prevent="runWfaFahpAnalysis\(\)"/);
  assert.match(fuzzyAhpPartial, /x-model="wfaFahpContext\.latitude"/);
  assert.match(fuzzyAhpPartial, /x-model="wfaFahpContext\.longitude"/);
  assert.match(fuzzyAhpPartial, /x-model="wfaFahpContext\.scheduleDate"/);
  assert.match(fuzzyAhpPartial, /x-model="wfaFahpContext\.radiusMeters"/);
  assert.equal(
    (fuzzyAhpPartial.match(/@input="invalidateWfaFahpResult\(\)"/g) ?? [])
      .length,
    4,
  );
  assert.match(fuzzyAhpPartial, /x-text="wfaFahpContext\.validationError"/);
  assert.doesNotMatch(
    fuzzyAhpPartial,
    /dashboardMap|cockpit\.hero|todayLocations/,
  );
});
```

Change old assertions that require `activeFahpTab` so they instead reject it:

```js
assert.doesNotMatch(fuzzyAhpPartial, /activeFahpTab/);
assert.match(
  fuzzyAhpPartial,
  /getFuzzyAhpViewState\(panel, fahpFilterState\.type\)/,
);
```

Pin the cockpit-grid delegation:

```js
assert.match(cockpitGrid, /get isFuzzyAhpPanel\(\)/);
assert.match(cockpitGrid, /panel\.key === 'fuzzyAhp'/);
assert.match(cockpitGrid, /x-if="isFuzzyAhpPanel"/);
assert.doesNotMatch(
  cockpitGrid,
  /loadFuzzyAhpDetail\(\{ type: option\.key \}\)/,
);
```

- [ ] **Step 2: Run the template test and confirm the new hierarchy assertions fail**

```bash
node --test tests/dashboard-cockpit-template.test.js
```

- [ ] **Step 3: Delegate every fuzzy panel state from the cockpit grid to `fuzzy-ahp-panel.html`**

Replace the fuzzy-ready-only ownership with:

```js
get isFuzzyAhpPanel() {
  return panel.key === 'fuzzyAhp';
},
get isGeofenceEvidenceReady() {
  return panel.key === 'geofenceEvidence' && panel.state === 'ready' && panel.data?.rawCounts;
},
get usesCustomLayout() {
  return this.isFuzzyAhpPanel || this.isGeofenceEvidenceReady;
}
```

Use `usesCustomLayout` for the outer transparent-wrapper classes and generic fallback guard. Render:

```html
<template x-if="isFuzzyAhpPanel">
  <include src="./fuzzy-ahp-panel.html"></include>
</template>
```

Remove the non-ready fuzzy `<nav>` block from `dashboard-cockpit-grid.html`; the generic `panel.stateLabel` badge remains only for non-FAHP panels.

- [ ] **Step 4: Remove nested active-tab state and make the focused partial use dashboard-owned selection**

Start the partial with:

```html
<div
  class="rounded-3xl border-0 bg-white px-4 py-3 shadow-sm sm:px-5 dark:bg-white/[0.03]"
  x-data="{
    get viewState() {
      return getFuzzyAhpViewState(panel, fahpFilterState.type);
    }
  }"
></div>
```

Keep the existing ready segmented-control classes as the canonical visual language, but bind active state to `fahpFilterState.type` and clicks to `selectFahpType(option.key)`.
Render status outside navigation, after the header row:

```html
<div data-fahp-status class="mt-3 flex items-center gap-2">
  <span
    class="rounded-full px-2.5 py-1 text-xs font-medium"
    :class="{
      'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300': panel.state === 'loading',
      'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300': panel.state === 'ready',
      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300': panel.state === 'empty',
      'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300': panel.state === 'needsData',
      'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300': panel.state === 'backendRequired',
      'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300': panel.state === 'error'
    }"
    x-text="panel.stateLabel"
  ></span>
</div>
```

This preserves status semantics but removes any fourth-tab affordance.

- [ ] **Step 5: Add the compact explicit WFA context form**

Use only local page state:

```html
<template x-if="fahpFilterState.type === 'wfa'">
  <form
    class="mt-4 grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2 xl:grid-cols-4 dark:border-gray-800 dark:bg-gray-900"
    @submit.prevent="runWfaFahpAnalysis()"
  >
    <label class="text-xs font-medium text-gray-600 dark:text-gray-300">
      Latitude
      <input
        type="number"
        step="any"
        x-model="wfaFahpContext.latitude"
        @input="invalidateWfaFahpResult()"
        class="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-950"
      />
    </label></form
></template>
```

```html
    <label class="text-xs font-medium text-gray-600 dark:text-gray-300">
      Longitude
      <input type="number" step="any" x-model="wfaFahpContext.longitude" @input="invalidateWfaFahpResult()" class="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-950" />
    </label>
    <label class="text-xs font-medium text-gray-600 dark:text-gray-300">
      Schedule date
      <input type="date" x-model="wfaFahpContext.scheduleDate" @input="invalidateWfaFahpResult()" class="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-950" />
    </label>
    <label class="text-xs font-medium text-gray-600 dark:text-gray-300">
      Radius meters (optional)
      <input type="number" min="1" step="1" x-model="wfaFahpContext.radiusMeters" @input="invalidateWfaFahpResult()" class="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-950" />
    </label>
    <div class="md:col-span-2 xl:col-span-4 flex flex-wrap items-center justify-between gap-3">
      <p
        x-show="wfaFahpContext.validationError"
        class="text-xs text-error-600 dark:text-error-400"
        x-text="wfaFahpContext.validationError"
      ></p>
      <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
        Run WFA Analysis
      </button>
    </div>
  </form>
</template>
```

Do not add geolocation permission, browser current-position lookup, reverse geocoding, or Live Map coupling in this issue.

- [ ] **Step 6: Render ready vs non-ready body content inside the same focused partial**

Change the existing ready metrics guard from:

```html
<template x-if="viewState.activeDecision"></template>
```

to:

```html
<template x-if="panel.state === 'ready' && viewState.activeDecision"></template>
```

Keep the current Consistency Check, Criteria Weights, and Ranking Preview markup inside that template unchanged.
Add a truthful non-ready block:

```html
<template x-if="panel.state !== 'ready'">
  <div
    class="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
  >
    <p
      class="text-sm leading-6 text-gray-600 dark:text-gray-300"
      x-text="panel.message"
    ></p>
    <p
      class="mt-3 text-sm text-gray-500 dark:text-gray-400"
      x-text="panel.note"
    ></p>
  </div>
</template>
```

For consistency styling, use three branches rather than treating `null` as inconsistent:

```html
:class="viewState.isConsistent === true ? 'text-success-600
dark:text-success-500' : viewState.isConsistent === false ? 'text-amber-500
dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'"
```

Hide the existing consistency icon when the Backend result is unknown by adding `x-show="viewState.isConsistent !== null"` to that icon `<span>`. Do not render success/warning icon semantics for unavailable Backend evidence. Also wrap the existing updated-at footer in `<template x-if="panel.state === 'ready'">...</template>` so error/loading/needs-data states do not display a misleading generated-at fallback.

- [ ] **Step 7: Run template + cockpit tests**

```bash
node --test tests/dashboard-cockpit-template.test.js tests/dashboard/wfaFahpCockpit.test.js
```

Expected: one fuzzy `<nav>`, three Backend-defined type options, separate status, no `activeFahpTab`, explicit WFA context form, four context inputs invalidate stale WFA results, unknown consistency is neutral, and updated-at metadata appears only for ready state.

- [ ] **Step 8: Commit Task 6**

```bash
git add src/partials/dashboard/dashboard-cockpit-grid.html src/partials/dashboard/fuzzy-ahp-panel.html tests/dashboard-cockpit-template.test.js
git commit -m "fix(GH-66): stabilize FAHP tabs across runtime states"
```

---

### Task 7: Run Cross-Issue Regression, Build, and Runtime Evidence Gates

**Files:**

- Verify all files changed by Tasks 1-6.
- No evidence-only source refactor is allowed during this task.

**Interfaces:**

- Consumes: completed #66 + #67 implementation.
- Produces: reproducible focused-test, lint, build, full-suite, diff, and manual runtime evidence for the eventual PR.

- [ ] **Step 1: Format only the files touched by this branch**

```bash
npx prettier --write src/js/services/fuzzyAhpService.js src/js/features/dashboard/fahpFilterState.js src/js/features/dashboard/wfaFahpContext.js src/js/services/dashboard/fahpRecapSlice.js src/js/services/dashboard/wfaFahpSlice.js src/js/services/dashboardCockpitService.js src/js/components/fuzzyAhpPanel.js src/js/features/dashboard/dashboard.js src/js/features/dashboard/dashboard-period.test.js src/partials/dashboard/dashboard-cockpit-grid.html src/partials/dashboard/fuzzy-ahp-panel.html tests/fuzzy-ahp-service.test.js tests/dashboard/fahpRecapContractSync.test.js tests/dashboard/fahpRecapSlice.test.js tests/dashboard/wfaFahpContext.test.js tests/dashboard/wfaFahpSlice.test.js tests/dashboard/wfaFahpCockpit.test.js tests/dashboard/dashboardPageOrchestration.test.js tests/dashboard-cockpit-template.test.js
```

- [ ] **Step 2: Run the complete focused #66/#67 gate**

```bash
node --test tests/fuzzy-ahp-service.test.js tests/dashboard/fahpRecapContractSync.test.js tests/dashboard/fahpRecapSlice.test.js tests/dashboard/wfaFahpContext.test.js tests/dashboard/wfaFahpSlice.test.js tests/dashboard/wfaFahpCockpit.test.js tests/dashboard/dashboardPageOrchestration.test.js src/js/features/dashboard/dashboard-period.test.js tests/dashboard-cockpit-template.test.js
```

Expected: zero failures. The pre-implementation 2-pass/10-fail focused baseline must be fully resolved rather than hidden or skipped.

- [ ] **Step 3: Run repository lint and production build**

```bash
npm run lint
npm run build
```

Expected: both commands exit 0. Do not run `npm audit fix` or dependency upgrades as part of these issues.

- [ ] **Step 4: Run the full repository suite and classify any remaining failures**

```bash
node --test
```

The branch starts from a non-green repository test baseline. If full-suite failures remain, record each failing test name and prove that no new unrelated failure was introduced. Any remaining failure inside the focused #66/#67 files is a blocker and must be fixed before completion.

- [ ] **Step 5: Audit forbidden legacy contract paths and source-of-truth leakage**

Run:

```bash
git grep -n "dashboard-recap" -- src/js tests
git grep -n "category.*analysis_type\|analysis_type.*category" -- src/js/services/fuzzyAhpService.js src/js/features/dashboard tests/fuzzy-ahp-service.test.js tests/dashboard
git grep -n "dashboardMap\|cockpit.hero\|todayLocations" -- src/partials/dashboard/fuzzy-ahp-panel.html src/js/features/dashboard/wfaFahpContext.js
```

Expected for the scoped FAHP implementation: no runtime dependency on `dashboard-recap`, no old `category/analysis_type` service contract, and no WFA context inference from Live Map/today-locations. Historical docs or unrelated services outside the scoped paths are not rewritten in this branch.

- [ ] **Step 6: Verify Git hygiene**

```bash
git diff --check origin/develop...HEAD
git status --short --branch
git log --oneline --decorate origin/develop..HEAD
```

Expected: `git diff --check` exits 0; only intended #66/#67 changes are present; commit history remains bounded and reviewable.

- [ ] **Step 7: Perform authenticated runtime checks when the local Backend/session is available**

Manual acceptance sequence:

```text
1. Open Dashboard → Fuzzy AHP Decision Center.
2. Confirm Discipline, WFA, Smart AC are the only navigation buttons.
3. Select WFA and confirm no WFA HTTP request fires on tab selection alone.
4. Submit missing/invalid context and confirm inline validation with no HTTP request.
5. Enter explicit latitude, longitude, and schedule date; submit.
6. Confirm request path is /api/analysis/fuzzy-ahp/wfa with those explicit query values.
7. Confirm successful ranked response renders Backend weights/ranking without client recomputation.
8. Edit any WFA context input and confirm the prior result disappears before another request is submitted.
9. Confirm a Backend/provider failure keeps WFA selected and renders Error outside the navigation control.
10. Switch to Discipline/Smart AC and confirm their generic dashboard requests still work.
```

If authenticated Backend/provider runtime is unavailable, mark only those runtime steps as **Needs Verification**; do not represent unit/build evidence as live API proof.

- [ ] **Step 8: Completion gate**

Before claiming #66/#67 implementation complete, verify all of the following from fresh command output:

```text
focused #66/#67 tests       PASS
npm run lint                PASS
npm run build               PASS
full suite                  no new scoped/unrelated regressions
legacy WFA dashboard route  absent from scoped runtime code
WFA hidden map inference    absent
three-tab hierarchy         pinned by template test
worktree status             understood and intentional
```

Do not push the branch or create a PR unless explicitly requested.

## Expected Commit Sequence

```text
4843116 docs(GH-66,GH-67): design dashboard WFA FAHP contract sync
<task-1> refactor(GH-67): split dashboard and WFA FAHP transport
<task-2> feat(GH-67): add explicit WFA FAHP context contract
<task-3> feat(GH-67): normalize dedicated WFA FAHP analysis
<task-4> refactor(GH-67): adapt WFA FAHP into cockpit state
<task-5> feat(GH-67): wire explicit WFA dashboard analysis
<task-6> fix(GH-66): stabilize FAHP tabs across runtime states
```

The plan document commit is added before implementation begins. Task commit hashes are intentionally not predetermined; their messages and boundaries are fixed above.
