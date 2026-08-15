# GH-66 + GH-67 WFA Date-Range Dashboard FAHP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the existing Management `/api/analysis/fuzzy-ahp/dashboard` endpoint for explicit date-range WFA analysis, persist reproducible WFA criterion snapshots for new bookings, and render Backend-authored criteria weights, consistency, evidence coverage, and location ranking without reintroducing manual live-analysis inputs.

**Architecture:** Backend issue #142 owns the contract. New booking scoring persists an immutable `wfa_scoring_snapshot`; the Dashboard WFA service selects Approved bookings by inclusive `from/to`, validates compatible snapshots, deterministically groups physical locations, averages criterion vectors, and runs the canonical WFA FAHP engine. Web FE keeps its Dashboard presets but resolves them to concrete dates for WFA, reuses `getDashboardFahpAnalysis`, strictly normalizes the WFA location response, and renders methodology + ranking + evidence under the existing three-tab cockpit.

**Tech Stack:** Backend Node.js, Express, express-validator, Sequelize/MySQL, Jest/Supertest, existing `fuzzyAhpEngine`; Web FE Alpine.js, `authRequest`, Node `node:test`, static HTML partials, Webpack; Git worktrees for isolated implementation.

## Global Constraints

- Source spec: `docs/superpowers/specs/2026-08-15-gh-66-gh-67-wfa-date-range-dashboard-analysis-design.md`.
- Backend tracking issue: `Infinite-LearningV1/Infinit_Track_BE#142`.
- Web FE tracking: GH-66 navigation/status isolation and GH-67 `[Web FE] Adopt date-range WFA FAHP on existing dashboard analysis contract`.
- Do **not** add `/api/analysis/fuzzy-ahp/wfa/recap`.
- Reuse `GET /api/analysis/fuzzy-ahp/dashboard?type=wfa&from=YYYY-MM-DD&to=YYYY-MM-DD`.
- Keep `GET /api/analysis/fuzzy-ahp/wfa?lat&lon&schedule_date[&radius_meters]` as live recommendation only.
- Keep generic `/api/analysis/fuzzy-ahp?type=wfa` retirement behavior unchanged unless another issue explicitly changes it.
- WFA Dashboard requires explicit inclusive `from/to`, Asia/Jakarta business-date semantics, scoped by `booking.schedule_date`, maximum 31 days.
- Web FE presets are UI convenience; WFA transport sends concrete `from/to`, not a WFA `period` enum.
- Criteria weights and CR are Backend-authored and do not change merely because the date range changes.
- WFA ranking entity is a physical location, never a user.
- Only Approved (`status = 1`) bookings are in the historical WFA population.
- Never reconstruct missing criterion values from final `suitability_score`, labels, descriptions, or user data.
- New booking scoring persists a server-authored immutable `wfa_scoring_snapshot` in the same transaction as final suitability fields.
- Legacy rows without a compatible snapshot count as evidence gaps; if no compatible evidence remains, return `needs_data`.
- Physical grouping uses normalized-description compatibility plus immutable-anchor distance `<=25m`; blank descriptions may use proximity-only fallback.
- No client-side FAHP math, physical grouping, score aggregation, labels, or CR calculation.
- A Smart AC/Discipline payload must fail WFA normalization.
- WFA must render Criteria Weights + Consistency + location ranking for academic explainability.
- Exactly three navigation tabs remain: `Discipline | WFA | Smart AC`; status stays outside navigation.
- Backend dirty main checkout must not be modified. At implementation time create a clean Backend worktree from then-current `origin/develop` using `superpowers:using-git-worktrees`.
- Existing FE isolated worktree remains `E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\dashboard-wfa-fahp-contract-sync`; do not modify the main FE checkout.
- Existing untracked `webpack-dev-server.log` and `webpack-dev-server.err.log` remain untouched/uncommitted.
- TDD: write/replace tests first, observe meaningful RED, implement minimal production change, observe GREEN, then commit.
- No push or PR unless explicitly requested.

## Source-of-Truth Audit That Changes the Plan

Current Backend `Booking` stores `suitability_score`, `suitability_label`, and `radius_snapshot` but not `location_type_score`, `distance_factor_score`, or `facility_score`. The live recommendation pipeline computes the three criteria before producing `final_score`.

Therefore the old 2026-08-13 recap plan is invalid for the new academic claim. Averaging final scores may be a historical recap, but it cannot be labeled as freshly reproducible date-range FAHP criteria analysis. This plan first fixes evidence persistence, then builds date-range analysis from compatible snapshots.

## Web FE GH-67 Synchronization Checkpoint

This plan implements the rewritten GH-67 issue, not the original explicit-context issue body. The following old acceptance paths are retired:

```text
Dashboard WFA -> /analysis/fuzzy-ahp/wfa?lat&lon&schedule_date
manual latitude/longitude input
manual schedule date input
manual radius input
Run WFA Analysis button
```

The replacement path is canonical:

```text
Dashboard range preset/state
-> deterministic explicit {from,to}
-> getDashboardFahpAnalysis({ type: 'wfa', from, to })
-> /analysis/fuzzy-ahp/dashboard
-> strict WFA date-range normalizer
-> methodology + location ranking + evidence UI
```

GH-67 completion requires range changes while WFA is active to refetch the analysis, and wrong-type/Smart AC payloads must fail closed. No task may retain the old manual-input behavior merely to preserve provisional tests.

## File Responsibility Map

### Backend repository `Infinite-LearningV1/Infinit_Track_BE`

- Create `src/models/migrations/20260815010000-add-wfa-scoring-snapshot.cjs` â€” nullable JSON snapshot column.
- Modify `src/models/booking.model.js` â€” map `wfa_scoring_snapshot`.
- Modify `src/analytics/config.fahp.js` â€” add canonical WFA methodology version constant.
- Modify `src/utils/fuzzyAhpEngine.js` â€” expose WFA methodology version with canonical weights/CR.
- Modify `src/services/wfaRecommendation.service.js` â€” build immutable booking scoring snapshot without changing live public semantics.
- Modify `src/controllers/booking.controller.js` â€” persist snapshot atomically with booking.
- Create `tests/wfaScoringSnapshotMigration.test.js`.
- Modify `tests/wfaRecommendationService.test.js`.
- Modify `tests/wfaControllerContract.test.js` â€” extend the existing booking/WFA controller contract with `Booking.create` snapshot persistence assertions.
- Create `src/services/wfaDashboardAnalysis.service.js` â€” date-range evidence validation, physical clustering, criterion aggregation, FAHP ranking, states/evidence.
- Create `tests/wfaDashboardAnalysisService.test.js`.
- Modify `src/services/fuzzyAhpAnalysis.service.js` â€” dispatch WFA Dashboard to the dedicated service and shape dashboard output.
- Modify `src/controllers/analysis.controller.js` â€” remove Dashboard `type=wfa` 410 branch; forward `from/to`.
- Modify `src/middlewares/validator.js` â€” type-aware dashboard date-range validation.
- Modify `docs/openapi.yaml` â€” document WFA dashboard `from/to`, methodology, states, evidence, ranking.
- Modify `tests/analysisFuzzyAhpDashboardRecapRoute.test.js`.
- Modify `tests/analysisFuzzyAhpControllerValidation.test.js` â€” add the WFA dashboard `from/to` validation matrix alongside existing controller/query contract coverage.
- Modify `tests/clientCriticalOpenApiContract.test.js` and `tests/openApiRuntimeDriftContract.test.js` â€” lock the documented WFA dashboard query/response and runtime route parity.

### Web FE repository `Infinite-LearningV1/Infinite_Track_Fe`

- Modify `src/js/components/dashboardRange/dashboardRange.js` â€” add pure WFA explicit-date resolver without breaking existing analytics request builder.
- Modify `tests/dashboard-range-state.test.js`.
- Modify `src/js/services/fuzzyAhpService.js` â€” allow WFA in dashboard transport and send `from/to`.
- Modify `tests/fuzzy-ahp-service.test.js`.
- Delete `src/js/features/dashboard/wfaFahpContext.js` and its test after replacement tests are green.
- Delete/replace old live-candidate `src/js/services/dashboard/wfaFahpSlice.js` with `src/js/services/dashboard/wfaDashboardFahpSlice.js`.
- Create `tests/dashboard/wfaDashboardFahpSlice.test.js`.
- Modify `src/js/features/dashboard/dashboard.js` â€” WFA uses dashboard transport, explicit resolved dates, stale invalidation, no manual run action.
- Modify `tests/dashboard/dashboardPageOrchestration.test.js`.
- Modify `src/js/services/dashboardCockpitService.js` and `tests/dashboard/wfaFahpCockpit.test.js` â€” type-aware WFA methodology/ranking/evidence model.
- Modify `src/js/components/fuzzyAhpPanel.js` and `tests/dashboard/fuzzy-ahp-panel.test.js` â€” expose WFA criteria/consistency/ranking view state.
- Modify `src/partials/dashboard/fuzzy-ahp-panel.html` and `tests/dashboard/wfaFahpTemplate.test.js` â€” render academic WFA analysis and remove manual inputs.
- Preserve `tests/dashboard-cockpit-template.test.js` as GH-66 regression evidence.

## Cross-Repo Execution Order

1. Backend methodology version + immutable scoring snapshot.
2. Backend pure date-range WFA analysis service.
3. Backend dashboard dispatcher/HTTP validation/OpenAPI.
4. Backend regression checkpoint including live WFA.
5. Web FE explicit date resolver + dashboard transport.
6. Web FE strict WFA contract + cockpit/view-state.
7. Web FE orchestration/template removal of manual flow.
8. Cross-repo verification and runtime evidence.

---

### Task 1: Backend â€” Persist reproducible WFA scoring snapshot

**Files:**

- Create: `src/models/migrations/20260815010000-add-wfa-scoring-snapshot.cjs`
- Modify: `src/models/booking.model.js`
- Modify: `src/analytics/config.fahp.js`
- Modify: `src/utils/fuzzyAhpEngine.js`
- Modify: `src/services/wfaRecommendation.service.js`
- Modify: `src/controllers/booking.controller.js`
- Create: `tests/wfaScoringSnapshotMigration.test.js`
- Modify: `tests/wfaRecommendationService.test.js`
- Modify: `tests/wfaControllerContract.test.js`

**Interfaces:**

- Produce `WFA_MATRIX_VERSION` from `src/analytics/config.fahp.js`.
- `fuzzyEngine.getWfaAhpWeights()` adds `version` while preserving existing keys.
- `scoreBookingLocation(...)` adds `scoringSnapshot` to its internal booking-use result; live `analyze(...)` response must not require a breaking shape change.
- `Booking.wfa_scoring_snapshot` is nullable JSON and server-owned.

- [ ] **Step 1: Create the clean Backend worktree before any Backend edit**

Use `superpowers:using-git-worktrees`, fetch latest `origin/develop`, then create a clean branch such as `feat/gh-142-wfa-date-range-analysis` in a separate worktree. Verify:

```cmd
git status --short --branch
git rev-parse --show-toplevel
git log -1 --oneline
```

Expected: clean feature worktree; dirty `E:\test\Infinit_Track_BE` remains untouched.

- [ ] **Step 2: Write migration/model RED tests**

Create `tests/wfaScoringSnapshotMigration.test.js` following the repository migration-test pattern. Assert migration source adds exactly one nullable JSON column:

```js
expect(addColumn).toHaveBeenCalledWith(
  "bookings",
  "wfa_scoring_snapshot",
  expect.objectContaining({ allowNull: true }),
);
```

Add a model contract assertion that `Booking.rawAttributes.wfa_scoring_snapshot.type.key` is JSON-compatible and nullable.

Run:

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaScoringSnapshotMigration.test.js
```

Expected: RED because the migration/model field does not exist.

- [ ] **Step 3: Add failing canonical methodology metadata test**

In `tests/wfaRecommendationService.test.js` or the engine-focused WFA suite:

```js
const weights = fuzzyEngine.getWfaAhpWeights();
expect(weights).toEqual(
  expect.objectContaining({
    version: expect.any(String),
    location_type: expect.any(Number),
    distance_factor: expect.any(Number),
    facility_score: expect.any(Number),
    consistency_ratio: expect.any(Number),
    weighting_method: expect.any(String),
  }),
);
expect(weights.version).toMatch(/^wfa_fahp_v\d+$/);
```

Expected RED: `version` absent.

- [ ] **Step 4: Add failing booking-scoring snapshot test**

Test `scoreBookingLocation` with mocked Geoapify/facility/engine evidence and assert:

```js
expect(result).toMatchObject({
  status: "ranked",
  suitabilityScore: 84.25,
  suitabilityLabel: "Sangat Tinggi",
  scoringSnapshot: {
    schema_version: 1,
    methodology_version: expect.any(String),
    criteria: {
      location_type_score: 80,
      distance_factor_score: 72.5,
      facility_score: 90,
    },
    methodology: {
      weights: {
        location_type: expect.any(Number),
        distance_factor: expect.any(Number),
        facility_score: expect.any(Number),
      },
      consistency_ratio: expect.any(Number),
      weighting_method: expect.any(String),
    },
    evidence: expect.objectContaining({
      distance_meters: expect.any(Number),
      facility_confidence: expect.any(Number),
    }),
    result: { score: 84.25, label: "Sangat Tinggi" },
  },
});
```

Also assert insufficient facility data returns `scoringSnapshot: null`; no fake criterion vector is stored.

- [ ] **Step 5: Add failing booking persistence assertion**

In the focused create-booking controller contract, mock `scoreBookingLocation` with a snapshot and assert `Booking.create` receives:

```js
expect.objectContaining({
  suitability_score: 84.25,
  suitability_label: "Sangat Tinggi",
  wfa_scoring_snapshot: scoringSnapshot,
});
```

Add a second case where scoring is insufficient and snapshot is `null`.

- [ ] **Step 6: Implement migration/model/version minimally**

Migration shape:

```js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("bookings", "wfa_scoring_snapshot", {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("bookings", "wfa_scoring_snapshot");
  },
};
```

Add to `booking.model.js`:

```js
wfa_scoring_snapshot: {
  type: DataTypes.JSON,
  allowNull: true
},
```

Add one canonical constant in `config.fahp.js`:

```js
export const WFA_MATRIX_VERSION = "wfa_fahp_v1";
```

Return it from `getWfaAhpWeights()` as `version` in both cached and fresh paths.

- [ ] **Step 7: Refactor booking scoring to preserve internal criterion evidence without changing live semantics**

During candidate enrichment, retain an internal criterion record before public serialization:

```js
const criterionEvidence = {
  locationTypeScore: candidate.locationTypeScore,
  distanceScore: candidate.distanceScore,
  facilityScore: evidence.facilityScore,
};
```

Create a focused helper used only by booking scoring:

```js
const buildBookingScoringSnapshot = ({
  candidate,
  criterionEvidence,
  final,
  wfaWeights,
  facilityConfidence,
}) => ({
  schema_version: 1,
  methodology_version: wfaWeights.version,
  captured_at: new Date().toISOString(),
  criteria: {
    location_type_score: criterionEvidence.locationTypeScore,
    distance_factor_score: criterionEvidence.distanceScore,
    facility_score: criterionEvidence.facilityScore,
  },
  methodology: {
    weights: {
      location_type: wfaWeights.location_type,
      distance_factor: wfaWeights.distance_factor,
      facility_score: wfaWeights.facility_score,
    },
    consistency_ratio: wfaWeights.consistency_ratio,
    weighting_method: wfaWeights.weighting_method,
  },
  evidence: {
    place_id: candidate.placeId,
    location_type: candidate.locationType,
    distance_meters: candidate.distanceMeters,
    facility_confidence: facilityConfidence,
  },
  result: { score: final.score, label: final.label },
});
```

Keep this evidence internal to `scoreBookingLocation`; do not require `analyze()` consumers to send or author it.

- [ ] **Step 8: Persist snapshot in the existing booking transaction**

Destructure `scoringSnapshot` from `scoreBookingLocation` and add:

```js
wfa_scoring_snapshot: scoringSnapshot,
```

to the existing `Booking.create` payload. Do not accept a request-body snapshot.

- [ ] **Step 9: Run focused Task 1 tests GREEN**

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaScoringSnapshotMigration.test.js tests/wfaRecommendationService.test.js tests/wfaControllerContract.test.js
```

Expected: Task 1 assertions PASS and existing live scoring cases remain green.

- [ ] **Step 10: Commit Task 1**

```cmd
git add src/models/migrations/20260815010000-add-wfa-scoring-snapshot.cjs src/models/booking.model.js src/analytics/config.fahp.js src/utils/fuzzyAhpEngine.js src/services/wfaRecommendation.service.js src/controllers/booking.controller.js tests/wfaScoringSnapshotMigration.test.js tests/wfaRecommendationService.test.js tests/wfaControllerContract.test.js
git commit -m "feat(#142): persist reproducible WFA scoring evidence"
```

---

### Task 2: Backend â€” Deterministic physical grouping and criterion aggregation

**Files:**

- Create: `src/services/wfaDashboardAnalysis.service.js`
- Create: `tests/wfaDashboardAnalysisService.test.js`

**Interfaces:**

- `normalizeWfaDashboardDescription(value) -> string|null`.
- `validateWfaScoringSnapshot(snapshot, methodologyVersion) -> { valid, reason, criteria }`.
- `clusterWfaDashboardRows(rows, { distanceCalculator }?) -> clusters`.
- `buildWfaDashboardRanking(clusters, { weights, scoreCalculator }?) -> Promise<ranked[]>`.
- Reuse `calculateDistance` and canonical `fuzzyEngine.calculateWfaScore`.

- [ ] **Step 1: Write RED tests for snapshot validation**

Assert valid snapshot accepts finite `0..100` criteria and matching methodology. Assert these fail with explicit reason codes:

```text
MISSING_SNAPSHOT
INCOMPATIBLE_METHODOLOGY
INVALID_CRITERIA
```

Example:

```js
expect(validateWfaScoringSnapshot(null, "wfa_fahp_v1")).toEqual({
  valid: false,
  reason: "MISSING_SNAPSHOT",
});
```

- [ ] **Step 2: Write RED tests for deterministic <=25m anchor clustering**

Cover:

- normalized same description + <=25m groups;
- same description >25m separates;
- different non-blank descriptions do not merge solely by proximity;
- blank description proximity fallback;
- reversed input order produces same cluster membership;
- A-B <=25m, B-C <=25m, A-C >25m does not transitively merge all three.

- [ ] **Step 3: Write RED test for range-level criterion aggregation and canonical scoring**

Given two compatible snapshot rows in one physical location:

```js
criteria A = { location_type_score: 80, distance_factor_score: 60, facility_score: 90 }
criteria B = { location_type_score: 100, distance_factor_score: 80, facility_score: 70 }
```

Assert score calculator receives exact averages:

```js
expect(scoreCalculator).toHaveBeenCalledWith(
  {
    locationTypeScore: 90,
    distanceScore: 70,
    facilityScore: 80,
  },
  weights,
);
```

Assert ranked item contains:

```js
criteria_summary: {
  location_type_score: 90,
  distance_factor_score: 70,
  facility_score: 80
}
```

- [ ] **Step 4: Write RED sorting/top-N test**

Sort by:

```text
score DESC
analyzable_booking_count DESC
approved_booking_count DESC
location_label ASC
```

and verify only Top 5 are returned by the orchestration layer.

- [ ] **Step 5: Run RED**

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaDashboardAnalysisService.test.js
```

Expected: import/functions absent, not syntax failure.

- [ ] **Step 6: Implement pure helpers**

Use normalized internal rows with:

```js
{
  bookingId,
  locationId,
  description,
  normalizedDescription,
  latitude,
  longitude,
  snapshotValidation,
  criteria,
}
```

Do not query database inside pure grouping/aggregation helpers.

- [ ] **Step 7: Implement canonical ranking calculation**

For each cluster:

```js
const analyzableRows = cluster.rows.filter(
  (row) => row.snapshotValidation.valid,
);
if (!analyzableRows.length) return null;

const criteriaSummary = averageCriteria(analyzableRows);
const result = await scoreCalculator(
  {
    locationTypeScore: criteriaSummary.location_type_score,
    distanceScore: criteriaSummary.distance_factor_score,
    facilityScore: criteriaSummary.facility_score,
  },
  weights,
);
```

Counts:

```js
approved_booking_count: cluster.rows.length,
analyzable_booking_count: analyzableRows.length
```

- [ ] **Step 8: Run GREEN and commit**

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaDashboardAnalysisService.test.js
git add src/services/wfaDashboardAnalysis.service.js tests/wfaDashboardAnalysisService.test.js
git commit -m "feat(#142): add WFA date-range FAHP aggregation"
```

---

### Task 3: Backend â€” Approved date-range query, evidence counters, and semantic states

**Files:**

- Modify: `src/services/wfaDashboardAnalysis.service.js`
- Modify: `tests/wfaDashboardAnalysisService.test.js`

**Interfaces:**

- Produce `createWfaDashboardAnalysisService(dependencies?)`.
- Produce singleton `buildWfaDashboardAnalysis({ from, to })`.
- Query uses Approved status + `schedule_date [Op.between]` + required `location` association.

- [ ] **Step 1: Add RED persistence-boundary test**

Mock `Booking.findAll` and call:

```js
await service.buildAnalysis({ from: "2026-08-01", to: "2026-08-15" });
```

Assert:

```js
expect(bookingModel.findAll).toHaveBeenCalledWith(
  expect.objectContaining({
    where: {
      status: 1,
      schedule_date: { [Op.between]: ["2026-08-01", "2026-08-15"] },
    },
    include: [
      expect.objectContaining({ association: "location", required: true }),
    ],
  }),
);
```

- [ ] **Step 2: Add RED state tests**

Lock:

```text
0 Approved rows -> empty
Approved rows + 0 compatible snapshots -> needs_data
>=1 ranked group -> ready
```

Partial valid evidence remains `ready`.

- [ ] **Step 3: Add RED evidence counter test**

Expected shape:

```js
expect(result.evidence).toEqual({
  approved_booking_count: 4,
  analyzable_booking_count: 2,
  excluded_missing_snapshot_count: 1,
  excluded_incompatible_snapshot_count: 1,
  unique_location_count: 3,
  ranked_location_count: 2,
});
```

- [ ] **Step 4: Add RED methodology test**

Mock `getWfaAhpWeights()` and prove output criteria weights/CR/version come from the engine, not snapshot/UI constants.

- [ ] **Step 5: Run RED**

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaDashboardAnalysisService.test.js
```

- [ ] **Step 6: Implement service facade**

Canonical result:

```js
{
  type: 'wfa',
  type_label: 'WFA',
  status,
  timezone: 'Asia/Jakarta',
  requested_window: { from, to },
  criteria_weights: [
    { key: 'location_type', display_label: 'Tipe Lokasi', value: weights.location_type },
    { key: 'distance_factor', display_label: 'Faktor Jarak', value: weights.distance_factor },
    { key: 'facility_score', display_label: 'Skor Fasilitas', value: weights.facility_score }
  ],
  consistency: {
    CR: weights.consistency_ratio,
    threshold: 0.1,
    is_consistent: weights.consistency_ratio <= 0.1,
    summary_label: weights.consistency_ratio <= 0.1
      ? 'Konsistensi dapat diterima'
      : 'Konsistensi perlu ditinjau'
  },
  methodology: {
    version: weights.version,
    weighting_method: weights.weighting_method
  },
  ranking_preview: { top_n: 5, items: ranking.slice(0, 5) },
  evidence
}
```

- [ ] **Step 7: Run GREEN and commit**

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaDashboardAnalysisService.test.js
git add src/services/wfaDashboardAnalysis.service.js tests/wfaDashboardAnalysisService.test.js
git commit -m "feat(#142): build approved WFA date-range analysis"
```

---

### Task 4: Backend â€” Reuse dashboard endpoint, type-aware date validation, OpenAPI

**Files:**

- Modify: `src/services/fuzzyAhpAnalysis.service.js`
- Modify: `src/controllers/analysis.controller.js`
- Modify: `src/middlewares/validator.js`
- Modify: `docs/openapi.yaml`
- Modify: `tests/analysisFuzzyAhpDashboardRecapRoute.test.js`
- Modify: `tests/analysisFuzzyAhpControllerValidation.test.js`
- Modify: `tests/clientCriticalOpenApiContract.test.js`
- Modify: `tests/openApiRuntimeDriftContract.test.js` â€” keep the reused dashboard route and OpenAPI query contract synchronized.

**Interfaces:**

- `buildFuzzyAhpDashboardRecapPayload({ type, from, to })` accepts WFA explicit range.
- `GET /api/analysis/fuzzy-ahp/dashboard?type=wfa&from&to` returns WFA dashboard analysis.
- Discipline/Smart AC existing behavior remains stable.

- [ ] **Step 1: Replace old WFA 410 route expectation with RED success contract**

In `analysisFuzzyAhpDashboardRecapRoute.test.js`, mock `buildWfaDashboardAnalysis` and assert:

```js
const res = await request(app)
  .get(
    "/api/analysis/fuzzy-ahp/dashboard?type=wfa&from=2026-08-01&to=2026-08-15",
  )
  .set("Authorization", "Bearer test-token")
  .expect(200);

expect(mockBuildWfaDashboardAnalysis).toHaveBeenCalledWith({
  from: "2026-08-01",
  to: "2026-08-15",
});
expect(res.body.data.type).toBe("wfa");
```

This must fail against current 410 behavior.

- [ ] **Step 2: Add RED validation matrix**

WFA must return 400 for:

```text
missing from
missing to
invalid ISO date
from > to
inclusive range >31 days
period query used instead of explicit from/to
lat/lon/schedule_date/radius_meters on dashboard WFA
```

Valid Admin/Management WFA succeeds; User remains forbidden by existing role guard.

- [ ] **Step 3: Add regression assertion that generic `/fuzzy-ahp?type=wfa` still returns 410**

This prevents accidentally reviving the retired generic live-analysis path.

- [ ] **Step 4: Run route/validation RED**

```cmd
npm test -- --runInBand --runTestsByPath tests/analysisFuzzyAhpDashboardRecapRoute.test.js tests/analysisFuzzyAhpControllerValidation.test.js
```

- [ ] **Step 5: Implement type-aware validator**

For `type=wfa`, allow only `type`, `from`, `to`; validate both dates and reuse `validateHistoricalDateWindowQuery({ period: 'custom', from, to })` for ISO/order/31-day policy.

For Discipline/Smart AC, preserve their existing accepted query semantics.

- [ ] **Step 6: Remove Dashboard WFA 410 branch and dispatch service**

Controller:

```js
const { type, from, to } = req.query;
const data = await buildFuzzyAhpDashboardRecapPayload({ type, from, to });
```

Service dispatcher:

```js
if (type === "wfa") {
  return buildWfaDashboardAnalysis({ from, to });
}
```

Do not route WFA Dashboard through `wfaRecommendation.service.analyze()`.

- [ ] **Step 7: Update OpenAPI contract**

Document WFA Dashboard query and schemas for:

```text
requested_window
criteria_weights
consistency
methodology
ranking_preview.items[].criteria_summary
evidence
status = ready | empty | needs_data
```

Document that `from/to` are required conditionally for `type=wfa`, max 31 days.

- [ ] **Step 8: Run Backend contract GREEN**

```cmd
npm test -- --runInBand --runTestsByPath tests/analysisFuzzyAhpDashboardRecapRoute.test.js tests/analysisFuzzyAhpControllerValidation.test.js tests/clientCriticalOpenApiContract.test.js tests/openApiRuntimeDriftContract.test.js tests/analysisFuzzyAhpWfaRoute.test.js tests/analysisFuzzyAhpWfaContract.test.js
npm run lint
git diff --check
```

Expected: new WFA Dashboard tests green; existing live WFA focused tests remain green.

- [ ] **Step 9: Commit Task 4**

```cmd
git add src/services/fuzzyAhpAnalysis.service.js src/controllers/analysis.controller.js src/middlewares/validator.js docs/openapi.yaml tests/analysisFuzzyAhpDashboardRecapRoute.test.js tests/analysisFuzzyAhpControllerValidation.test.js tests/clientCriticalOpenApiContract.test.js tests/openApiRuntimeDriftContract.test.js
git commit -m "feat(#142): reuse dashboard endpoint for WFA date-range FAHP"
```

---

### Task 5: Web FE â€” Resolve Dashboard presets to explicit WFA dates and reuse dashboard transport

**Files:**

- Modify: `src/js/components/dashboardRange/dashboardRange.js`
- Modify: `tests/dashboard-range-state.test.js`
- Modify: `src/js/services/fuzzyAhpService.js`
- Modify: `tests/fuzzy-ahp-service.test.js`

**Interfaces:**

- Add `resolveDashboardRangeDateWindow(rangeState, { today }?) -> { from, to }`.
- `getDashboardFahpAnalysis({ type, from, to })` accepts `wfa` and sends explicit range.
- Existing non-WFA callers continue to work without forced WFA date params.

- [ ] **Step 1: Add date resolver RED tests**

Use injected `today: '2026-08-15'` to avoid wall-clock tests:

```js
assert.deepEqual(
  resolveDashboardRangeDateWindow(
    { period: "today", from: null, to: null },
    { today: "2026-08-15" },
  ),
  { from: "2026-08-15", to: "2026-08-15" },
);

assert.deepEqual(
  resolveDashboardRangeDateWindow(
    { period: "current_month", from: null, to: null },
    { today: "2026-08-15" },
  ),
  { from: "2026-08-01", to: "2026-08-15" },
);

assert.deepEqual(
  resolveDashboardRangeDateWindow(
    { period: "custom", from: "2026-08-03", to: "2026-08-09" },
    { today: "2026-08-15" },
  ),
  { from: "2026-08-03", to: "2026-08-09" },
);
```

Lock the internal `current_week` preset to the existing rolling-7-day analytics meaning. With injected `today: '2026-08-15'`, assert exactly `{ from: '2026-08-09', to: '2026-08-15' }`. The user-facing copy may say `7 Days`; do not reinterpret it as Monday-Sunday calendar week.

- [ ] **Step 2: Add dashboard transport RED**

```js
await service.getDashboardFahpAnalysis({
  type: "wfa",
  from: "2026-08-01",
  to: "2026-08-15",
});

assert.deepEqual(requestExecutor.mock.calls[0][0].params, {
  type: "wfa",
  from: "2026-08-01",
  to: "2026-08-15",
});
```

Current service must fail because WFA is rejected from `DASHBOARD_TYPES`.

- [ ] **Step 3: Run RED**

```cmd
node --test tests/dashboard-range-state.test.js tests/fuzzy-ahp-service.test.js
```

- [ ] **Step 4: Implement pure date resolver**

Keep `buildDashboardRangeRequestParams` for existing analytics. Add a separate resolver because WFA Backend intentionally receives no period enum.

The resolver validates the existing range state first and returns exact ISO dates only.

- [ ] **Step 5: Allow WFA dashboard transport without changing live transport**

Set dashboard types to:

```js
new Set(["discipline", "wfa", "smart_ac"]);
```

For WFA, require non-empty `from/to` and send them. Preserve `getWfaFahpAnalysis` only as a live-analysis service API for genuine non-Dashboard consumers; after Task 7, the Management Dashboard must have zero imports/calls to it.

- [ ] **Step 6: Run GREEN and commit**

```cmd
node --test tests/dashboard-range-state.test.js tests/fuzzy-ahp-service.test.js
git add src/js/components/dashboardRange/dashboardRange.js tests/dashboard-range-state.test.js src/js/services/fuzzyAhpService.js tests/fuzzy-ahp-service.test.js
git commit -m "refactor(GH-67): route WFA through dashboard date range"
```

---

### Task 6: Web FE â€” Strict WFA Dashboard FAHP normalizer and academic cockpit model

**Files:**

- Create: `src/js/services/dashboard/wfaDashboardFahpSlice.js`
- Create: `tests/dashboard/wfaDashboardFahpSlice.test.js`
- Modify: `src/js/services/dashboardCockpitService.js`
- Modify: `tests/dashboard/wfaFahpCockpit.test.js`
- Modify: `src/js/components/fuzzyAhpPanel.js`
- Modify: `tests/dashboard/fuzzy-ahp-panel.test.js`

**Interfaces:**

- `createWfaDashboardFahpSliceState(response, request)` validates only WFA dashboard shape.
- Presentation kind: `wfa_date_range_analysis`.
- WFA cockpit includes `criteriaWeights`, `consistency`, `methodology`, `rankingPreview`, `evidence`, `requestedWindow`.

- [ ] **Step 1: Write strict WFA normalizer RED tests**

Valid payload must preserve:

```text
type=wfa
status
requested_window.from/to
criteria_weights[location_type,distance_factor,facility_score]
consistency.CR/threshold/is_consistent
methodology.version/weighting_method
location ranking + criteria_summary
truthful evidence counts
```

Reject:

```text
type=smart_ac
ranking item with user_id/name-only identity
Smart AC criteria: history/checkin_pattern/context/transition
missing requested_window
non-finite score/criterion weight/criterion summary
negative evidence counts
analyzable > approved
```

- [ ] **Step 2: Write cockpit RED test for academic WFA model**

Assert active WFA ready model exposes:

```js
{
  kind: 'wfa_date_range_analysis',
  state: 'ready',
  criteriaWeights: expect.arrayContaining([
    expect.objectContaining({ key: 'location_type', displayLabel: 'Tipe Lokasi' }),
    expect.objectContaining({ key: 'distance_factor', displayLabel: 'Faktor Jarak' }),
    expect.objectContaining({ key: 'facility_score', displayLabel: 'Skor Fasilitas' })
  ]),
  consistency: expect.objectContaining({ isConsistent: true }),
  rankingPreview: expect.any(Object),
  evidence: expect.any(Object)
}
```

Add wrong-type fail-closed assertion.

- [ ] **Step 3: Run RED**

```cmd
node --test tests/dashboard/wfaDashboardFahpSlice.test.js tests/dashboard/wfaFahpCockpit.test.js tests/dashboard/fuzzy-ahp-panel.test.js
```

- [ ] **Step 4: Implement strict slice**

Do not map WFA through generic user-ranking heuristics. Explicitly require location identity and WFA criterion keys.

Map Backend semantic states:

```text
ready -> ready
empty -> empty
needs_data -> needsData
malformed/transport -> error
```

- [ ] **Step 5: Make cockpit normalization type-driven**

`normalizeFuzzyAhpResponse(response, activeType)` must dispatch by `activeType`; it must not infer type from arbitrary payload fields.

- [ ] **Step 6: Expose WFA criteria/consistency view state**

Unlike the superseded recap design, WFA now intentionally renders the academic methodology cards because Backend is returning a defined date-range FAHP contract.

- [ ] **Step 7: Run GREEN and commit**

```cmd
node --test tests/dashboard/wfaDashboardFahpSlice.test.js tests/dashboard/wfaFahpCockpit.test.js tests/dashboard/fuzzy-ahp-panel.test.js
git add src/js/services/dashboard/wfaDashboardFahpSlice.js tests/dashboard/wfaDashboardFahpSlice.test.js src/js/services/dashboardCockpitService.js tests/dashboard/wfaFahpCockpit.test.js src/js/components/fuzzyAhpPanel.js tests/dashboard/fuzzy-ahp-panel.test.js
git commit -m "fix(GH-66,GH-67): isolate WFA date-range FAHP presentation"
```

---

### Task 7: Web FE â€” Dashboard orchestration and template migration off manual WFA flow

**Files:**

- Modify: `src/js/features/dashboard/dashboard.js`
- Modify: `tests/dashboard/dashboardPageOrchestration.test.js`
- Delete: `src/js/features/dashboard/wfaFahpContext.js`
- Delete: `tests/dashboard/wfaFahpContext.test.js`
- Delete: `src/js/services/dashboard/wfaFahpSlice.js` after replacement import is green.
- Delete: `tests/dashboard/wfaFahpSlice.test.js` after replacement coverage is green.
- Modify: `src/partials/dashboard/fuzzy-ahp-panel.html`
- Modify: `tests/dashboard/wfaFahpTemplate.test.js`
- Regression: `tests/dashboard-cockpit-template.test.js`

**Interfaces:**

- WFA selection resolves `dashboardRangeState -> {from,to}` and calls `fetchDashboardFahpAnalysis`.
- Remove `wfaFahpContext`, `buildWfaFahpRequestParams`, `validateWfaFahpContext`, and manual `runWfaFahpAnalysis` Dashboard behavior.
- Range changes while WFA is active refetch WFA with new concrete dates.

- [ ] **Step 1: Replace orchestration tests first and verify RED**

Assert selecting WFA:

```js
await page.selectFahpType("wfa");

assert.equal(page.fahpFilterState.type, "wfa");
assert.equal(page.fuzzyAhpResponse, null); // stale decision invalidated before await
assert.deepEqual(fetchDashboardFahpAnalysis.mock.calls.at(-1)[0], {
  type: "wfa",
  from: "2026-08-01",
  to: "2026-08-15",
});
```

Use injected/fixed Dashboard range state in the test.

Assert changing Dashboard range while WFA active first invalidates the old WFA decision, then triggers a new WFA Dashboard request using the new explicit boundaries. The previous ranking must not remain visible while that request is pending.

- [ ] **Step 2: Replace template expectations and verify RED**

Assert WFA panel contains academic sections:

```text
Criteria Weights
Consistency
WFA Location Ranking / Top WFA Locations
Evidence
```

Assert absence of:

```text
Latitude
Longitude
Schedule date
Radius meters
Run WFA Analysis
```

Assert GH-66 navigation remains exactly three tabs and status is outside nav.

- [ ] **Step 3: Run RED**

```cmd
node --test tests/dashboard/dashboardPageOrchestration.test.js tests/dashboard/wfaFahpTemplate.test.js tests/dashboard-cockpit-template.test.js
```

Expected: failures identify current manual WFA implementation.

- [ ] **Step 4: Remove manual WFA state/imports and use explicit WFA date resolver**

Dashboard orchestration pattern:

```js
const requestParams = buildFahpRequestParams(this.fahpFilterState);
if (requestParams.type === "wfa") {
  const { from, to } = resolveDashboardRangeDateWindow(
    this.syncDashboardRangeState(),
  );
  return this.fetchDashboardFahpAnalysis({ type: "wfa", from, to });
}
return this.fetchDashboardFahpAnalysis(requestParams);
```

Before any request settles, clear stale response/error and publish loading state for the selected type.

- [ ] **Step 5: Remove superseded files only after replacement imports compile**

Delete manual context and old live-candidate slice/tests. Search production code:

```cmd
findstr /s /n /i "wfaFahpContext runWfaFahpAnalysis buildWfaFahpRequestParams fetchWfaFahpAnalysis" src\js\*.js
```

Expected: no Management Dashboard dependency remains. A separate genuine live WFA feature may retain live service usage outside Dashboard if present.

- [ ] **Step 6: Render academic WFA result**

For ready state, template shows:

```text
WFA Analysis
<from> â€“ <to>

Criteria Weights
Tipe Lokasi
Faktor Jarak
Skor Fasilitas

Consistency
CR
Threshold
Status

Top WFA Locations
rank + location label + score + label
criterion summary
approved/analyzable counts

Evidence coverage note
```

For `needsData`, explain Approved WFA data exists but reproducible criterion snapshots are insufficient. Do not display stale ranking.

- [ ] **Step 7: Run GREEN and commit**

```cmd
node --test tests/dashboard/dashboardPageOrchestration.test.js tests/dashboard/wfaFahpTemplate.test.js tests/dashboard-cockpit-template.test.js tests/dashboard/wfaDashboardFahpSlice.test.js tests/dashboard/wfaFahpCockpit.test.js tests/dashboard/fuzzy-ahp-panel.test.js
git add -A src/js/features/dashboard/dashboard.js src/js/features/dashboard/wfaFahpContext.js src/js/services/dashboard/wfaFahpSlice.js src/partials/dashboard/fuzzy-ahp-panel.html tests/dashboard
git commit -m "fix(GH-66,GH-67): adopt WFA dashboard date-range analysis"
```

---

### Task 8: Cross-repo verification and evidence

**Files:** no new production scope; only fix failures caused by Tasks 1-7 within the same boundaries.

- [ ] **Step 1: Backend focused verification**

Run:

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaScoringSnapshotMigration.test.js tests/wfaRecommendationService.test.js tests/wfaControllerContract.test.js tests/wfaDashboardAnalysisService.test.js tests/analysisFuzzyAhpDashboardRecapRoute.test.js tests/analysisFuzzyAhpControllerValidation.test.js tests/analysisFuzzyAhpWfaRoute.test.js tests/analysisFuzzyAhpWfaContract.test.js tests/clientCriticalOpenApiContract.test.js tests/openApiRuntimeDriftContract.test.js
npm run lint
git diff --check
```

Record exact suites/tests/pass/fail counts.

- [ ] **Step 2: Backend broader regression**

Run repository-standard full/non-integration suite. If environment-backed integration fails for known external MySQL/provider reasons, distinguish infrastructure failure from code regression with exact suite names; do not claim full green without evidence.

- [ ] **Step 3: Web FE focused verification**

Run:

```cmd
node --test tests/dashboard-range-state.test.js tests/fuzzy-ahp-service.test.js tests/dashboard/wfaDashboardFahpSlice.test.js tests/dashboard/wfaFahpCockpit.test.js tests/dashboard/fuzzy-ahp-panel.test.js tests/dashboard/dashboardPageOrchestration.test.js tests/dashboard/wfaFahpTemplate.test.js tests/dashboard-cockpit-template.test.js
npm run build
git diff --check
```

Confirm removed manual WFA files/imports are absent and webpack logs remain untracked/unmodified.

- [ ] **Step 4: Web FE full test comparison**

Run full `node --test`. Compare any unrelated pre-existing failures to baseline; list exact names. Do not hide a new failure as baseline noise.

- [ ] **Step 5: Runtime contract verification**

With Backend + Web FE running against the same revisions, verify:

```text
1. Exactly three FAHP tabs.
2. WFA selection immediately clears previous Smart AC/Discipline content.
3. WFA request URL is /analysis/fuzzy-ahp/dashboard?type=wfa&from=...&to=....
4. No lat/lon/schedule_date/radius manual WFA request exists.
5. Criteria Weights display Backend values.
6. CR/threshold/status display Backend consistency.
7. Range changes alter WFA request dates and can alter location ranking.
8. Ranking rows are locations, never users.
9. Legacy-only range shows needs-data instead of fabricated FAHP.
10. Partial evidence range shows ready plus truthful evidence coverage.
11. Empty Approved range shows empty.
12. Transport failure shows WFA error with no stale ranking.
13. Live /analysis/fuzzy-ahp/wfa still works with its original lat/lon/date contract.
14. Discipline and Smart AC remain functional.
```

Capture screenshots/recording only when preparing delivery/PR evidence.

- [ ] **Step 6: Final repository status check**

Backend and FE separately:

```cmd
git status --short --branch
git log --oneline --decorate -8
git diff --check
```

Ensure no unrelated dirty files were committed.

## Completion Gate

Do not call the implementation complete until all of these are true:

- Backend #142 contract uses existing dashboard endpoint with explicit `from/to`.
- Reproducible snapshot persistence exists for new booking scoring.
- WFA Dashboard never fabricates historical criteria for legacy rows.
- Academic weights + CR + ranking are Backend-authored and rendered.
- Live WFA route and Discipline/Smart AC regressions are green.
- Web FE manual WFA context is removed from Management Dashboard.
- Web FE GH-67 uses only Dashboard `type=wfa&from&to` transport for Management WFA and refetches on active range changes.
- Wrong-type/Smart AC payloads cannot render under active WFA.
- Focused tests, lint/build, diff checks, and runtime evidence are recorded.
- No push/PR has occurred unless explicitly authorized.
