# GH-66 + GH-67 WFA Management Recap Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Management Dashboard WFA manual location-analysis flow with a Backend-owned recap of unique Approved WFA locations ranked by average persisted `suitability_score`, while preserving the three-tab FAHP navigation and preventing Smart AC user rankings from ever rendering as WFA.

**Architecture:** Backend adds `GET /api/analysis/fuzzy-ahp/wfa/recap`, scopes Approved bookings to the active Dashboard period, deterministically clusters physical locations within 25 meters, aggregates persisted suitability evidence, and returns a strict recap contract. Web FE removes manual WFA coordinates/date/radius state, requests that recap with the existing Dashboard range contract, normalizes only the WFA recap shape when the active type is WFA, and renders a location-ranking presentation that does not claim a fresh FAHP consistency/criteria analysis.

**Tech Stack:** Backend Node.js, Express, express-validator, Sequelize, Jest/Supertest; Web FE Alpine.js, `authRequest`, Node `node:test`, static HTML partials, Webpack; Git worktrees for isolation.

## Global Constraints

- This plan implements the approved revision spec: `docs/superpowers/specs/2026-08-13-gh-66-gh-67-wfa-management-recap-revision-design.md`.
- This plan **supersedes the WFA explicit-input tasks** in `docs/superpowers/plans/2026-08-12-gh-66-gh-67-dashboard-wfa-fahp-contract-sync.md`; the already-correct #66 decision that navigation has exactly `Discipline | WFA | Smart AC` remains valid.
- Management Dashboard WFA MUST NOT request latitude, longitude, schedule date, or radius from the user.
- Management Dashboard WFA uses only persisted Backend booking/location evidence; Web FE must not recompute suitability, grouping, average scores, labels, or ranks.
- Only booking status `Approved` (`status = 1`) contributes to the recap. Pending and Rejected bookings are excluded from the data query.
- `average_suitability_score` uses finite persisted scores only; `null`, missing, `NaN`, and non-finite values are excluded from the average and are never coerced to zero.
- Physical-location grouping is Backend-owned: normalized descriptions match and anchor distance is `<= 25` meters; a blank description falls back to proximity-only matching.
- Grouping uses deterministic sorted anchor clustering. Do not use moving centroids or transitive cluster merging.
- WFA ranking follows the active Dashboard range: `today -> daily`, `current_week -> weekly`, `current_month -> current_month`, `custom -> custom + from + to`.
- Ranking order is `average_suitability_score DESC`, then `approved_booking_count DESC`, then `location_label ASC`.
- Aggregate labels are authored by Backend using the canonical `fuzzyAhpEngine.getWfaScoreLabel()` score bands.
- The live recommendation endpoint `GET /api/analysis/fuzzy-ahp/wfa?lat&lon&schedule_date[&radius_meters]` remains unchanged for recommendation use cases outside this Management recap.
- `GET /api/analysis/fuzzy-ahp/dashboard?type=wfa` remains retired and must continue returning `410 WFA_ANALYSIS_MOVED`.
- A Smart AC or Discipline payload must fail WFA normalization; stale output from a previous tab may never be displayed under an active WFA tab.
- WFA recap does not render generic `Consistency Check` or `Criteria Weights` cards because the dashboard is aggregating persisted scoring evidence, not running a new pairwise FAHP decision matrix.
- Preserve `authRequest` session behavior, Admin/Management authorization, existing Dashboard range ownership, and existing Discipline/Smart AC contracts.
- Do not modify the dirty Backend `develop` checkout directly. At execution time use `superpowers:using-git-worktrees` and create a clean Backend worktree from then-current `origin/develop`.
- The existing FE worktree is `E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\dashboard-wfa-fahp-contract-sync` on `fix/dashboard-wfa-fahp-contract-sync`; do not edit the main FE checkout.
- Before Backend implementation starts, a dedicated Backend tracking issue must exist and be linked to the delivery. Do not hide Backend work under Web FE GitHub issue #67.
- Do not rewrite or squash the four local FE implementation commits that followed the old design. Correct them with bounded follow-up commits so review history shows the contract revision.
- Do not push or open PRs unless the user explicitly requests it.

## Current Baseline to Preserve/Replace Deliberately

- Backend live WFA focused baseline was green: `tests/analysisFuzzyAhpWfaContract.test.js` + `tests/analysisFuzzyAhpWfaRoute.test.js` = 18/18 tests passing.
- Current FE old-design baseline is green: 32/32 focused tests pass across service, WFA context, WFA candidate slice, cockpit, template, and dashboard orchestration.
- Those FE tests currently encode the now-superseded manual `lat/lon/scheduleDate/radiusMeters` behavior. Revised TDD must replace those expectations first and observe RED against current code before removing production behavior.
- Existing `webpack-dev-server.log` and `webpack-dev-server.err.log` are untracked runtime files in the FE worktree. Do not add, edit, or commit them.

## File Responsibility Map

### Backend repository: `Infinite-LearningV1/Infinit_Track_BE`

- Create `src/services/wfaManagementRecap.service.js` â€” pure normalization/clustering/aggregation plus period-scoped persistence orchestration.
- Modify `src/controllers/analysis.controller.js` â€” thin HTTP adapter for the recap service.
- Modify `src/routes/analysis.routes.js` â€” authenticated Admin/Management recap route; preserve live WFA route.
- Modify `src/middlewares/validator.js` â€” strict recap query validation using the existing historical date-window contract.
- Modify `docs/openapi.yaml` â€” document the new management recap endpoint and response states.
- Create `tests/wfaManagementRecapService.test.js` â€” pure grouping, aggregation, period, and state semantics.
- Create `tests/analysisFuzzyAhpWfaRecapRoute.test.js` â€” auth, validation, controller wiring, and HTTP response contract.
- Modify `tests/clientCriticalOpenApiContract.test.js` â€” lock the documented recap path/query/response schema.
- Modify `tests/openApiRuntimeDriftContract.test.js` â€” lock runtime/OpenAPI presence for the new analysis route.

### Web FE repository: `Infinite-LearningV1/Infinite_Track_Fe`

- Modify `src/js/services/fuzzyAhpService.js` â€” replace dashboard use of live WFA analysis transport with WFA recap transport.
- Delete `src/js/features/dashboard/wfaFahpContext.js` â€” superseded manual input state/request builder.
- Delete `src/js/services/dashboard/wfaFahpSlice.js` after the new recap normalizer is green â€” old candidate-analysis contract.
- Create `src/js/services/dashboard/wfaFahpRecapSlice.js` â€” strict management recap normalizer.
- Modify `src/js/features/dashboard/dashboard.js` â€” active-period WFA recap orchestration and stale-type invalidation.
- Modify `src/js/services/dashboardCockpitService.js` â€” active-type-aware normalization and WFA recap panel model.
- Modify `src/js/components/fuzzyAhpPanel.js` â€” dedicated WFA recap view state; generic analysis cards remain for Discipline/Smart AC.
- Modify `src/partials/dashboard/fuzzy-ahp-panel.html` â€” remove manual WFA form and render location recap.
- Keep `src/partials/dashboard/dashboard-cockpit-grid.html` delegation from #66; touch only if regression tests prove a required adjustment.
- Modify `tests/fuzzy-ahp-service.test.js`.
- Delete `tests/dashboard/wfaFahpContext.test.js` after replacement tests are red/green.
- Replace `tests/dashboard/wfaFahpSlice.test.js` with `tests/dashboard/wfaFahpRecapSlice.test.js`.
- Modify `tests/dashboard/wfaFahpCockpit.test.js`, `tests/dashboard/wfaFahpTemplate.test.js`, and `tests/dashboard/dashboardPageOrchestration.test.js`.

## Cross-Repo Execution Order

1. Backend pure clustering/aggregation contract.
2. Backend period-scoped persistence and state semantics.
3. Backend HTTP route + validation + OpenAPI; verify the live WFA route still passes.
4. Web FE recap transport + strict recap normalizer.
5. Web FE Dashboard orchestration and removal of explicit WFA context.
6. Web FE cockpit/view-state isolation.
7. Web FE template presentation.
8. Cross-repo regression, build, and runtime evidence.

Do not begin runtime integration claims for Web FE until Tasks 1-3 provide a verified Backend contract.

---

### Task 1: Backend deterministic physical-location clustering and ranking

**Files:**

- Create: `src/services/wfaManagementRecap.service.js`
- Create: `tests/wfaManagementRecapService.test.js`

**Interfaces:**

- Consumes: `calculateDistance(lat1, lon1, lat2, lon2)` from `src/utils/geofence.js`; `fuzzyEngine.getWfaScoreLabel(score)` from `src/utils/fuzzyAhpEngine.js`.
- Produces: `normalizeWfaLocationDescription(value)`, `clusterWfaLocationRows(rows, options?)`, and `buildWfaLocationRanking(clusters, options?)`.
- `clusterWfaLocationRows` input rows use `{ booking_id, location_id, created_at, suitability_score, location: { location_id, latitude, longitude, description } }`.
- `buildWfaLocationRanking` returns all scored location groups sorted deterministically; callers apply Top 5 slicing after evidence counts are known.

- [ ] **Step 1: At execution time create/verify a clean Backend worktree before writing tests**

Use `superpowers:using-git-worktrees`. The existing Backend `develop` checkout contains unrelated local changes and must remain untouched. A safe target is:

```text
E:\test\Infinit_Track_BE-worktrees\wfa-management-recap
```

Suggested branch:

```text
feat/wfa-management-recap
```

Verify inside the new worktree:

```cmd
git status --short --branch
git rev-parse --show-toplevel
git log -1 --oneline
```

Expected: clean status on the new feature branch based on then-current `origin/develop`. Install dependencies in that worktree with `npm ci` if `node_modules` is absent.

- [ ] **Step 2: Write failing normalization and clustering tests**

Create `tests/wfaManagementRecapService.test.js` with tests equivalent to:

```js
import { describe, expect, it } from "@jest/globals";
import {
  buildWfaLocationRanking,
  clusterWfaLocationRows,
  normalizeWfaLocationDescription,
} from "../src/services/wfaManagementRecap.service.js";

const row = ({
  bookingId,
  description,
  latitude,
  longitude,
  score,
  createdAt = "2026-08-01T00:00:00.000Z",
}) => ({
  booking_id: bookingId,
  location_id: bookingId + 100,
  created_at: createdAt,
  suitability_score: score,
  location: {
    location_id: bookingId + 100,
    description,
    latitude,
    longitude,
  },
});

describe("WFA management recap physical-location grouping", () => {
  it("normalizes description comparison without changing display text", () => {
    expect(normalizeWfaLocationDescription("  Jl.   Juanda No. 12  ")).toBe(
      "jl. juanda no. 12",
    );
    expect(normalizeWfaLocationDescription("   ")).toBeNull();
    expect(normalizeWfaLocationDescription(null)).toBeNull();
  });

  it("requires matching non-blank descriptions and <=25m anchor distance", () => {
    const rows = [
      row({
        bookingId: 1,
        description: "Jl. Juanda",
        latitude: -0.895,
        longitude: 119.872,
        score: 90,
      }),
      row({
        bookingId: 2,
        description: " jl.  juanda ",
        latitude: -0.89505,
        longitude: 119.87205,
        score: 80,
      }),
      row({
        bookingId: 3,
        description: "Jl. Juanda",
        latitude: -0.896,
        longitude: 119.873,
        score: 70,
      }),
      row({
        bookingId: 4,
        description: "Cafe Juanda",
        latitude: -0.89504,
        longitude: 119.87204,
        score: 95,
      }),
    ];

    const clusters = clusterWfaLocationRows(rows);
    expect(
      clusters.map((cluster) => cluster.rows.map((item) => item.bookingId)),
    ).toEqual([[4], [1, 2], [3]]);
  });

  it("uses proximity-only matching when description is blank", () => {
    const clusters = clusterWfaLocationRows([
      row({
        bookingId: 1,
        description: "Jl. Juanda",
        latitude: -0.895,
        longitude: 119.872,
        score: 90,
      }),
      row({
        bookingId: 2,
        description: null,
        latitude: -0.89504,
        longitude: 119.87204,
        score: 80,
      }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].rows).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Add a failing anchor-chain determinism test**

Use injected distance values to prove the algorithm is anchor-based rather than transitive:

```js
it("does not transitively merge a chain whose endpoints exceed 25m", () => {
  const rows = [
    row({
      bookingId: 3,
      description: "Same Place",
      latitude: 3,
      longitude: 0,
      score: 70,
    }),
    row({
      bookingId: 1,
      description: "Same Place",
      latitude: 1,
      longitude: 0,
      score: 90,
    }),
    row({
      bookingId: 2,
      description: "Same Place",
      latitude: 2,
      longitude: 0,
      score: 80,
    }),
  ];
  const distance = (latA, _lonA, latB) => {
    const pair = [latA, latB].sort().join(":");
    return { "1:2": 20, "2:3": 20, "1:3": 40 }[pair] ?? 100;
  };

  const clusters = clusterWfaLocationRows(rows, {
    distanceCalculator: distance,
  });
  expect(
    clusters.map((cluster) => cluster.rows.map((item) => item.bookingId)),
  ).toEqual([[1, 2], [3]]);
});
```

Also call the function with the input array reversed and assert the same cluster membership/order.

- [ ] **Step 4: Add failing aggregation, count, label, and tie-break tests**

```js
it("averages only finite scores but counts every approved row in the physical group", () => {
  const clusters = clusterWfaLocationRows([
    row({
      bookingId: 1,
      description: "Jl. Juanda",
      latitude: -0.895,
      longitude: 119.872,
      score: 90,
    }),
    row({
      bookingId: 2,
      description: "Jl. Juanda",
      latitude: -0.89502,
      longitude: 119.87202,
      score: 80,
    }),
    row({
      bookingId: 3,
      description: "Jl. Juanda",
      latitude: -0.89503,
      longitude: 119.87203,
      score: null,
    }),
  ]);

  const ranking = buildWfaLocationRanking(clusters, {
    scoreLabeler: (score) => (score >= 80 ? "Sangat Tinggi" : "Tinggi"),
  });

  expect(ranking[0]).toMatchObject({
    location_label: "Jl. Juanda",
    average_suitability_score: 85,
    aggregate_label: "Sangat Tinggi",
    approved_booking_count: 3,
    scored_booking_count: 2,
  });
});

it("sorts average desc, approved count desc, then label asc and omits unscored-only groups", () => {
  const clusters = clusterWfaLocationRows([
    row({
      bookingId: 1,
      description: "Beta",
      latitude: -0.89,
      longitude: 119.8,
      score: 80,
    }),
    row({
      bookingId: 2,
      description: "Alpha",
      latitude: -0.9,
      longitude: 119.9,
      score: 80,
    }),
    row({
      bookingId: 3,
      description: "Alpha",
      latitude: -0.90001,
      longitude: 119.90001,
      score: null,
    }),
    row({
      bookingId: 4,
      description: "No Score",
      latitude: -0.91,
      longitude: 119.91,
      score: null,
    }),
  ]);

  const ranking = buildWfaLocationRanking(clusters, {
    scoreLabeler: () => "Sangat Tinggi",
  });
  expect(ranking.map((item) => item.location_label)).toEqual(["Alpha", "Beta"]);
});
```

- [ ] **Step 5: Run the new service tests and verify RED**

Run from the Backend worktree:

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaManagementRecapService.test.js
```

Expected: FAIL because `wfaManagementRecap.service.js` and its exported helpers do not exist yet. A syntax/import failure in the test itself is not an acceptable RED state.

- [ ] **Step 6: Implement the minimal deterministic pure helpers**

Create `src/services/wfaManagementRecap.service.js` with this shape:

```js
import { calculateDistance } from "../utils/geofence.js";
import fuzzyEngine from "../utils/fuzzyAhpEngine.js";

export const WFA_RECAP_PROXIMITY_METERS = 25;
export const WFA_RECAP_TOP_N = 5;

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeWfaLocationDescription = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized || null;
};

const descriptionsMatch = (left, right) =>
  !left.normalizedDescription ||
  !right.normalizedDescription ||
  left.normalizedDescription === right.normalizedDescription;

const normalizeRow = (source) => ({
  bookingId: Number(source.booking_id),
  locationId: Number(source.location?.location_id ?? source.location_id),
  createdAt: source.created_at ?? null,
  displayDescription:
    typeof source.location?.description === "string" &&
    source.location.description.trim()
      ? source.location.description.trim()
      : null,
  normalizedDescription: normalizeWfaLocationDescription(
    source.location?.description,
  ),
  latitude: numberOrNull(source.location?.latitude),
  longitude: numberOrNull(source.location?.longitude),
  score: numberOrNull(source.suitability_score),
});

const compareNormalizedRows = (left, right) => {
  const leftBlank = left.normalizedDescription === null;
  const rightBlank = right.normalizedDescription === null;
  if (leftBlank !== rightBlank) return leftBlank ? 1 : -1;
  const descriptionOrder = (left.normalizedDescription ?? "").localeCompare(
    right.normalizedDescription ?? "",
  );
  if (descriptionOrder) return descriptionOrder;
  return (
    left.latitude - right.latitude ||
    left.longitude - right.longitude ||
    left.bookingId - right.bookingId ||
    left.locationId - right.locationId
  );
};

export const clusterWfaLocationRows = (
  rows,
  { distanceCalculator = calculateDistance } = {},
) => {
  const normalizedRows = rows
    .map(normalizeRow)
    .filter((item) => item.latitude !== null && item.longitude !== null)
    .sort(compareNormalizedRows);
  const clusters = [];

  for (const item of normalizedRows) {
    const cluster = clusters.find(
      ({ anchor }) =>
        descriptionsMatch(anchor, item) &&
        distanceCalculator(
          anchor.latitude,
          anchor.longitude,
          item.latitude,
          item.longitude,
        ) <= WFA_RECAP_PROXIMITY_METERS,
    );
    if (cluster) cluster.rows.push(item);
    else clusters.push({ anchor: item, rows: [item] });
  }
  return clusters;
};
```

Add the representative selector explicitly:

```js
const createdAtMillis = (value) => {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

const chooseRepresentativeRow = (rows) =>
  [...rows].sort((left, right) => {
    const leftBlank = left.normalizedDescription === null;
    const rightBlank = right.normalizedDescription === null;
    if (leftBlank !== rightBlank) return leftBlank ? 1 : -1;
    const descriptionOrder = (left.normalizedDescription ?? "").localeCompare(
      right.normalizedDescription ?? "",
    );
    if (descriptionOrder) return descriptionOrder;
    return (
      createdAtMillis(left.createdAt) - createdAtMillis(right.createdAt) ||
      left.bookingId - right.bookingId ||
      left.locationId - right.locationId
    );
  })[0];
```

`location_key` is Backend-authored and deterministic from the immutable cluster anchor:

```js
const buildLocationKey = (anchor) =>
  `wfa:${encodeURIComponent(anchor.normalizedDescription ?? "unnamed")}:${anchor.latitude.toFixed(6)},${anchor.longitude.toFixed(6)}`;
```

Then implement `buildWfaLocationRanking`:

```js
export const buildWfaLocationRanking = (
  clusters,
  { scoreLabeler = fuzzyEngine.getWfaScoreLabel } = {},
) =>
  clusters
    .map((cluster) => {
      const scoredRows = cluster.rows.filter((item) => item.score !== null);
      if (!scoredRows.length) return null;
      const average = Number(
        (
          scoredRows.reduce((sum, item) => sum + item.score, 0) /
          scoredRows.length
        ).toFixed(2),
      );
      const representative = chooseRepresentativeRow(cluster.rows);
      return {
        location_key: buildLocationKey(cluster.anchor),
        location_label:
          representative.displayDescription ||
          `${representative.latitude.toFixed(6)}, ${representative.longitude.toFixed(6)}`,
        latitude: representative.latitude,
        longitude: representative.longitude,
        average_suitability_score: average,
        aggregate_label: scoreLabeler(average),
        approved_booking_count: cluster.rows.length,
        scored_booking_count: scoredRows.length,
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.average_suitability_score - left.average_suitability_score ||
        right.approved_booking_count - left.approved_booking_count ||
        left.location_label.localeCompare(right.location_label),
    )
    .map((item, index) => ({ ...item, rank: index + 1 }));
```

Do not introduce DB access in these helpers yet.

- [ ] **Step 7: Run service tests and verify GREEN**

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaManagementRecapService.test.js
```

Expected: all Task 1 tests PASS.

- [ ] **Step 8: Commit Task 1 in the Backend worktree**

```cmd
git add src/services/wfaManagementRecap.service.js tests/wfaManagementRecapService.test.js
git commit -m "feat: add deterministic WFA management recap ranking"
```

### Task 2: Backend Approved-booking persistence, Dashboard period scope, and recap states

**Files:**

- Modify: `src/services/wfaManagementRecap.service.js`
- Modify: `tests/wfaManagementRecapService.test.js`

**Interfaces:**

- Consumes: `Booking` association `location` from `src/models/index.js`; `Op` from Sequelize; `buildEffectiveWindow({ period, from, to })` from `src/utils/historicalDateWindow.js`; Task 1 grouping/ranking helpers.
- Produces: `createWfaManagementRecapService(dependencies?)` and singleton `buildWfaManagementRecap({ period, from, to })`.
- Output contract: `{ type: 'wfa', status, period: { type, from, to }, ranking_preview: { top_n: 5, items }, evidence }`.

- [ ] **Step 1: Extend the service test with a mock persistence boundary and write the Approved-only/date-scope assertion**

Add imports and a helper:

```js
import { Op } from "sequelize";
import { createWfaManagementRecapService } from "../src/services/wfaManagementRecap.service.js";

const createService = ({
  rows,
  window = { startDateStr: "2026-08-01", endDateStr: "2026-08-31" },
}) => {
  const bookingModel = {
    findAll: jest.fn().mockResolvedValue(rows),
  };
  const buildEffectiveWindow = jest.fn().mockReturnValue(window);
  const service = createWfaManagementRecapService({
    bookingModel,
    buildEffectiveWindow,
    distanceCalculator: () => 0,
    scoreLabeler: (score) => (score >= 80 ? "Sangat Tinggi" : "Tinggi"),
  });
  return { service, bookingModel, buildEffectiveWindow };
};
```

Then add:

```js
it("queries only Approved bookings inside the effective Dashboard date window", async () => {
  const { service, bookingModel, buildEffectiveWindow } = createService({
    rows: [],
  });

  await service.buildRecap({ period: "current_month" });

  expect(buildEffectiveWindow).toHaveBeenCalledWith({
    period: "current_month",
    from: null,
    to: null,
  });
  expect(bookingModel.findAll).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        status: 1,
        schedule_date: { [Op.between]: ["2026-08-01", "2026-08-31"] },
      },
      include: [
        expect.objectContaining({
          association: "location",
          required: true,
        }),
      ],
    }),
  );
});
```

This test locks Pending/Rejected exclusion at the persistence boundary instead of filtering them in Web FE.

- [ ] **Step 2: Add failing tests for `empty`, `needs_data`, and partial-evidence `ready`**

```js
it("returns empty when no Approved booking exists in the period", async () => {
  const { service } = createService({ rows: [] });
  await expect(
    service.buildRecap({ period: "current_month" }),
  ).resolves.toEqual({
    type: "wfa",
    status: "empty",
    period: { type: "current_month", from: "2026-08-01", to: "2026-08-31" },
    ranking_preview: { top_n: 5, items: [] },
    evidence: {
      approved_booking_count: 0,
      scored_booking_count: 0,
      excluded_unscored_count: 0,
      unique_location_count: 0,
    },
  });
});

it("returns needs_data when Approved bookings exist but none has a finite persisted score", async () => {
  const rows = [
    row({
      bookingId: 1,
      description: "Jl. Juanda",
      latitude: -0.895,
      longitude: 119.872,
      score: null,
    }),
  ];
  const { service } = createService({ rows });
  const result = await service.buildRecap({ period: "current_month" });
  expect(result.status).toBe("needs_data");
  expect(result.ranking_preview.items).toEqual([]);
  expect(result.evidence).toEqual({
    approved_booking_count: 1,
    scored_booking_count: 0,
    excluded_unscored_count: 1,
    unique_location_count: 1,
  });
});

it("returns ready from scored rows and reports unscored Approved evidence without coercing it to zero", async () => {
  const rows = [
    row({
      bookingId: 1,
      description: "Jl. Juanda",
      latitude: -0.895,
      longitude: 119.872,
      score: 90,
    }),
    row({
      bookingId: 2,
      description: "Jl. Juanda",
      latitude: -0.89501,
      longitude: 119.87201,
      score: null,
    }),
  ];
  const { service } = createService({ rows });
  const result = await service.buildRecap({ period: "current_month" });

  expect(result.status).toBe("ready");
  expect(result.ranking_preview.items[0]).toMatchObject({
    average_suitability_score: 90,
    approved_booking_count: 2,
    scored_booking_count: 1,
  });
  expect(result.evidence).toMatchObject({
    approved_booking_count: 2,
    scored_booking_count: 1,
    excluded_unscored_count: 1,
    unique_location_count: 1,
  });
});
```

`unique_location_count` counts deterministic physical clusters from all Approved rows in range, including a cluster that has no finite score. Such an unscored-only cluster is evidence but is not allowed into `ranking_preview.items`.

- [ ] **Step 3: Add failing period-forwarding tests for daily, weekly, and custom ranges**

```js
it.each([
  [{ period: "daily" }, { period: "daily", from: null, to: null }],
  [{ period: "weekly" }, { period: "weekly", from: null, to: null }],
  [
    { period: "custom", from: "2026-08-03", to: "2026-08-09" },
    { period: "custom", from: "2026-08-03", to: "2026-08-09" },
  ],
])(
  "forwards the canonical dashboard period to buildEffectiveWindow: %j",
  async (request, expected) => {
    const { service, buildEffectiveWindow } = createService({ rows: [] });
    await service.buildRecap(request);
    expect(buildEffectiveWindow).toHaveBeenCalledWith(expected);
  },
);
```

For the custom case, configure the mocked effective window to return the same explicit boundaries and assert the response `period.from/to` uses the effective boundaries.

- [ ] **Step 4: Run the extended service tests and verify RED**

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaManagementRecapService.test.js
```

Expected: Task 1 tests still PASS, new persistence/state tests FAIL because `createWfaManagementRecapService` does not yet exist.

- [ ] **Step 5: Implement the persistence facade without moving business rules into the controller**

Extend `src/services/wfaManagementRecap.service.js`:

```js
import { Op } from "sequelize";
import { Booking } from "../models/index.js";
import { buildEffectiveWindow } from "../utils/historicalDateWindow.js";

const APPROVED_BOOKING_STATUS_ID = 1;

const defaultDependencies = {
  bookingModel: Booking,
  buildEffectiveWindow,
  distanceCalculator: calculateDistance,
  scoreLabeler: fuzzyEngine.getWfaScoreLabel,
};

export const createWfaManagementRecapService = (dependencies = {}) => {
  const resolved = { ...defaultDependencies, ...dependencies };

  const buildRecap = async ({
    period = "current_month",
    from = null,
    to = null,
  } = {}) => {
    const window = resolved.buildEffectiveWindow({ period, from, to });
    const approvedRows = await resolved.bookingModel.findAll({
      where: {
        status: APPROVED_BOOKING_STATUS_ID,
        schedule_date: {
          [Op.between]: [window.startDateStr, window.endDateStr],
        },
      },
      attributes: [
        "booking_id",
        "location_id",
        "schedule_date",
        "suitability_score",
        "created_at",
      ],
      include: [
        {
          association: "location",
          required: true,
          attributes: ["location_id", "latitude", "longitude", "description"],
        },
      ],
      order: [["booking_id", "ASC"]],
    });

    const clusters = clusterWfaLocationRows(approvedRows, {
      distanceCalculator: resolved.distanceCalculator,
    });
    const ranking = buildWfaLocationRanking(clusters, {
      scoreLabeler: resolved.scoreLabeler,
    });
    const scoredBookingCount = approvedRows.reduce(
      (count, source) =>
        count + (numberOrNull(source.suitability_score) !== null ? 1 : 0),
      0,
    );
    const approvedBookingCount = approvedRows.length;
    const status =
      approvedBookingCount === 0
        ? "empty"
        : scoredBookingCount === 0
          ? "needs_data"
          : "ready";

    return {
      type: "wfa",
      status,
      period: {
        type: period,
        from: window.startDateStr,
        to: window.endDateStr,
      },
      ranking_preview: {
        top_n: WFA_RECAP_TOP_N,
        items: ranking.slice(0, WFA_RECAP_TOP_N),
      },
      evidence: {
        approved_booking_count: approvedBookingCount,
        scored_booking_count: scoredBookingCount,
        excluded_unscored_count: approvedBookingCount - scoredBookingCount,
        unique_location_count: clusters.length,
      },
    };
  };

  return { buildRecap };
};

const wfaManagementRecapService = createWfaManagementRecapService();
export const buildWfaManagementRecap = (params) =>
  wfaManagementRecapService.buildRecap(params);
```

Do not query `User`, do not expose `user_full_name`, and do not invoke Geoapify or `wfaRecommendation.service.js` from this service.

- [ ] **Step 6: Run Task 1-2 service tests and verify GREEN**

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaManagementRecapService.test.js
```

Expected: all service tests PASS.

- [ ] **Step 7: Run existing historical-window tests to prove period helper compatibility**

```cmd
npm test -- --runInBand --runTestsByPath tests/historicalDateWindow.test.js
```

Expected: PASS; do not alter existing date-window semantics merely for the recap endpoint.

- [ ] **Step 8: Commit Task 2 in Backend**

```cmd
git add src/services/wfaManagementRecap.service.js tests/wfaManagementRecapService.test.js
git commit -m "feat: scope WFA management recap to approved bookings"
```

### Task 3: Backend recap HTTP route, strict query validation, and OpenAPI contract

**Files:**

- Modify: `src/controllers/analysis.controller.js`
- Modify: `src/routes/analysis.routes.js`
- Modify: `src/middlewares/validator.js`
- Modify: `docs/openapi.yaml`
- Create: `tests/analysisFuzzyAhpWfaRecapRoute.test.js`
- Modify: `tests/clientCriticalOpenApiContract.test.js`
- Modify: `tests/openApiRuntimeDriftContract.test.js` only if that test owns analysis-route drift coverage.

**Interfaces:**

- Consumes: `buildWfaManagementRecap({ period, from, to })` from Task 2; existing `verifyToken`, `roleGuard(['Admin', 'Management'])`, `validate`, and `validateHistoricalDateWindowQuery`.
- Produces: `GET /api/analysis/fuzzy-ahp/wfa/recap?period=<daily|weekly|current_month|custom>[&from=YYYY-MM-DD&to=YYYY-MM-DD]` with a default `period=current_month`.
- The recap route accepts only query keys `period`, `from`, and `to`; live recommendation query keys are intentionally invalid on this route.

- [ ] **Step 1: Write the failing route test with mocked service and auth boundaries**

Create `tests/analysisFuzzyAhpWfaRecapRoute.test.js` using the same `jest.unstable_mockModule` pattern as `analysisFuzzyAhpWfaRoute.test.js`. Mock the new service:

```js
const mockBuildRecap = jest.fn();

jest.unstable_mockModule(
  "../src/services/wfaManagementRecap.service.js",
  () => ({
    buildWfaManagementRecap: mockBuildRecap,
  }),
);
```

Set the resolved payload:

```js
const readyRecap = {
  type: "wfa",
  status: "ready",
  period: {
    type: "current_month",
    from: "2026-08-01",
    to: "2026-08-13",
  },
  ranking_preview: {
    top_n: 5,
    items: [
      {
        rank: 1,
        location_key: "wfa:jl.%20juanda:-0.895000,119.872000",
        location_label: "Jl. Juanda",
        latitude: -0.895,
        longitude: 119.872,
        average_suitability_score: 90,
        aggregate_label: "Sangat Tinggi",
        approved_booking_count: 2,
        scored_booking_count: 2,
      },
    ],
  },
  evidence: {
    approved_booking_count: 2,
    scored_booking_count: 2,
    excluded_unscored_count: 0,
    unique_location_count: 1,
  },
};
```

Primary success assertion:

```js
it("returns the WFA management recap to Management with current_month default", async () => {
  mockBuildRecap.mockResolvedValue(readyRecap);

  const res = await request(app)
    .get("/api/analysis/fuzzy-ahp/wfa/recap")
    .set("Authorization", "Bearer test-token")
    .set("x-test-role", "Management")
    .expect(200);

  expect(mockBuildRecap).toHaveBeenCalledWith({
    period: "current_month",
    from: undefined,
    to: undefined,
  });
  expect(res.body).toEqual({
    success: true,
    data: readyRecap,
    message: "WFA management recap retrieved successfully",
  });
});
```

- [ ] **Step 2: Add failing authorization and validation tests**

Add:

```js
it("returns 401 when unauthenticated", async () => {
  await request(app).get("/api/analysis/fuzzy-ahp/wfa/recap").expect(401);
  expect(mockBuildRecap).not.toHaveBeenCalled();
});

it("returns 403 for a normal User role", async () => {
  await request(app)
    .get("/api/analysis/fuzzy-ahp/wfa/recap")
    .set("Authorization", "Bearer test-token")
    .set("x-test-role", "User")
    .expect(403);
  expect(mockBuildRecap).not.toHaveBeenCalled();
});

it("returns 400 when custom period omits from/to", async () => {
  await request(app)
    .get("/api/analysis/fuzzy-ahp/wfa/recap?period=custom")
    .set("Authorization", "Bearer test-token")
    .expect(400);
  expect(mockBuildRecap).not.toHaveBeenCalled();
});

it.each(["lat", "lon", "schedule_date", "radius_meters"])(
  "rejects live recommendation query key %s on recap route",
  async (key) => {
    await request(app)
      .get(`/api/analysis/fuzzy-ahp/wfa/recap?${key}=1`)
      .set("Authorization", "Bearer test-token")
      .expect(400);
    expect(mockBuildRecap).not.toHaveBeenCalled();
  },
);
```

Add one valid custom range test and assert the controller forwards exact `period/from/to` values.

- [ ] **Step 3: Run the new route test and verify RED**

```cmd
npm test -- --runInBand --runTestsByPath tests/analysisFuzzyAhpWfaRecapRoute.test.js
```

Expected: FAIL because the recap route/controller/validator do not exist.

- [ ] **Step 4: Implement strict recap validation in `src/middlewares/validator.js`**

Near the existing FAHP validators, add:

```js
const WFA_FAHP_RECAP_QUERY_KEYS = new Set(["period", "from", "to"]);
const WFA_FAHP_RECAP_PERIODS = new Set([
  "daily",
  "weekly",
  "current_month",
  "custom",
]);

export const wfaFahpRecapValidation = [
  query().custom((_, { req }) => {
    const unknown = Object.keys(req.query ?? {}).find(
      (key) => !WFA_FAHP_RECAP_QUERY_KEYS.has(key),
    );
    if (unknown) {
      throw new Error(`Unsupported WFA recap query parameter: ${unknown}`);
    }

    const period = req.query.period ?? "current_month";
    if (!WFA_FAHP_RECAP_PERIODS.has(period)) {
      throw new Error(`Unsupported WFA recap period: ${period}`);
    }

    const message = validateHistoricalDateWindowQuery({
      period,
      from: req.query.from ?? null,
      to: req.query.to ?? null,
    });
    if (message) throw new Error(message);
    return true;
  }),
];
```

Reuse the existing historical window validation. Do not duplicate date parsing or custom-range limits.

- [ ] **Step 5: Implement the thin controller adapter**

Import the service into `src/controllers/analysis.controller.js` and add:

```js
export const getWfaFahpRecap = async (req, res, next) => {
  try {
    const { period = "current_month", from, to } = req.query;
    const data = await buildWfaManagementRecap({ period, from, to });

    return res.status(200).json({
      success: true,
      data,
      message: "WFA management recap retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};
```

The controller must not query `Booking`, group rows, calculate averages, or assign labels.

- [ ] **Step 6: Register the static recap route without changing live recommendation behavior**

In `src/routes/analysis.routes.js`, import `getWfaFahpRecap` and `wfaFahpRecapValidation`, then register:

```js
router.get(
  "/fuzzy-ahp/wfa/recap",
  roleGuard(["Admin", "Management"]),
  wfaFahpRecapValidation,
  validate,
  getWfaFahpRecap,
);
```

Keep the existing route unchanged:

```js
router.get(
  "/fuzzy-ahp/wfa",
  roleGuard(["Admin", "Management"]),
  wfaFahpValidation,
  validate,
  getWfaFahp,
);
```

Also keep the generic dashboard route unchanged so `type=wfa` remains a 410 migration response.

- [ ] **Step 7: Run route tests and verify GREEN**

```cmd
npm test -- --runInBand --runTestsByPath tests/analysisFuzzyAhpWfaRecapRoute.test.js
```

Expected: all recap route tests PASS.

- [ ] **Step 8: Re-run the existing live/migration WFA contract tests before touching OpenAPI**

```cmd
npm test -- --runInBand --runTestsByPath tests/analysisFuzzyAhpWfaRoute.test.js tests/analysisFuzzyAhpWfaContract.test.js
```

Expected: 18/18 existing live/migration tests remain PASS. A regression here is a blocker; do not update those tests to accommodate the recap feature.

- [ ] **Step 9: Add the recap operation and schemas to `docs/openapi.yaml`**

Document `GET /api/analysis/fuzzy-ahp/wfa/recap` with:

- Bearer auth.
- Admin/Management authorization note.
- Query parameters `period`, `from`, `to` only.
- Default `period=current_month`.
- `200` response with `type`, `status`, effective `period`, `ranking_preview`, and `evidence`.
- `400`, `401`, `403`, and server error responses following existing API conventions.
- Ranking item fields exactly: `rank`, `location_key`, `location_label`, `latitude`, `longitude`, `average_suitability_score`, `aggregate_label`, `approved_booking_count`, `scored_booking_count`.
- Status enum exactly: `ready`, `empty`, `needs_data`.
- Explicit description that only Approved bookings are considered and averages use finite persisted scores.

Do not alter the documented live `/analysis/fuzzy-ahp/wfa` request contract.

- [ ] **Step 10: Add/update OpenAPI contract tests and verify them**

In `tests/clientCriticalOpenApiContract.test.js`, assert the new path exists and contains the key query/response fields. If `tests/openApiRuntimeDriftContract.test.js` enumerates analysis runtime routes, add the recap route there too.

Run:

```cmd
npm test -- --runInBand --runTestsByPath tests/clientCriticalOpenApiContract.test.js tests/openApiRuntimeDriftContract.test.js
```

Expected: PASS.

- [ ] **Step 11: Run focused Backend lint for touched JavaScript files**

```cmd
npx eslint src/services/wfaManagementRecap.service.js src/controllers/analysis.controller.js src/routes/analysis.routes.js src/middlewares/validator.js tests/wfaManagementRecapService.test.js tests/analysisFuzzyAhpWfaRecapRoute.test.js
```

Expected: exit 0. Do not run an automatic fix across unrelated Backend files.

- [ ] **Step 12: Commit the Backend HTTP contract**

```cmd
git add src/controllers/analysis.controller.js src/routes/analysis.routes.js src/middlewares/validator.js docs/openapi.yaml tests/analysisFuzzyAhpWfaRecapRoute.test.js tests/clientCriticalOpenApiContract.test.js tests/openApiRuntimeDriftContract.test.js
git commit -m "feat: expose WFA management recap endpoint"
```

If `tests/openApiRuntimeDriftContract.test.js` required no change, omit it from `git add`; do not force an unrelated edit.

---

### Task 4: Web FE recap transport and strict WFA management normalizer

**Files:**

- Modify: `src/js/services/fuzzyAhpService.js`
- Create: `src/js/services/dashboard/wfaFahpRecapSlice.js`
- Delete after replacement is green: `src/js/services/dashboard/wfaFahpSlice.js`
- Modify: `tests/fuzzy-ahp-service.test.js`
- Create: `tests/dashboard/wfaFahpRecapSlice.test.js`
- Delete after replacement is green: `tests/dashboard/wfaFahpSlice.test.js`

**Interfaces:**

- Consumes: Backend Task 3 recap contract; existing `authRequest`; Dashboard range request params shaped as `{ period, from?, to? }`.
- Produces: `FuzzyAhpService#getWfaFahpRecap(params)`, exported `getWfaFahpRecap(params)`, `buildWfaFahpRecapViewModel(response)`, `createWfaFahpRecapSliceState(response, request)`.
- WFA recap normalized model uses `presentationKind: 'wfa_management_recap'`; it intentionally has no FAHP criteria/consistency decision payload.

- [ ] **Step 1: Replace the old live-analysis service expectation with a failing recap transport test**

In `tests/fuzzy-ahp-service.test.js`, delete the test that expects dashboard WFA to call `/analysis/fuzzy-ahp/wfa` with coordinates/date. Add:

```js
test("WFA dashboard transport uses the management recap endpoint and Dashboard period only", async () => {
  const seen = [];
  const service = new FuzzyAhpService(async (config) => {
    seen.push(config);
    return { data: { success: true, data: { type: "wfa", status: "empty" } } };
  });

  await service.getWfaFahpRecap({
    period: "custom",
    from: "2026-08-01",
    to: "2026-08-13",
  });

  assert.deepEqual(seen, [
    {
      method: "get",
      url: "/api/analysis/fuzzy-ahp/wfa/recap",
      params: {
        period: "custom",
        from: "2026-08-01",
        to: "2026-08-13",
      },
    },
  ]);
});

test("dashboard WFA service no longer exports the live-analysis helper", async () => {
  const module = await import("../src/js/services/fuzzyAhpService.js");
  assert.equal(typeof module.getWfaFahpRecap, "function");
  assert.equal("getWfaFahpAnalysis" in module, false);
});
```

Keep the generic service tests proving WFA is rejected from `/analysis/fuzzy-ahp/dashboard`.

- [ ] **Step 2: Write the failing strict recap normalizer tests**

Create `tests/dashboard/wfaFahpRecapSlice.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWfaFahpRecapViewModel,
  createWfaFahpRecapSliceState,
} from "../../src/js/services/dashboard/wfaFahpRecapSlice.js";

const readyResponse = {
  success: true,
  data: {
    type: "wfa",
    status: "ready",
    period: { type: "current_month", from: "2026-08-01", to: "2026-08-13" },
    ranking_preview: {
      top_n: 5,
      items: [
        {
          rank: 1,
          location_key: "wfa:juanda",
          location_label: "Jl. Juanda",
          latitude: -0.895,
          longitude: 119.872,
          average_suitability_score: 90.25,
          aggregate_label: "Sangat Tinggi",
          approved_booking_count: 4,
          scored_booking_count: 3,
        },
      ],
    },
    evidence: {
      approved_booking_count: 5,
      scored_booking_count: 4,
      excluded_unscored_count: 1,
      unique_location_count: 2,
    },
  },
};

test("maps WFA management recap without inventing FAHP criteria or consistency", () => {
  const model = buildWfaFahpRecapViewModel(readyResponse);
  assert.equal(model.type, "wfa");
  assert.equal(model.presentationKind, "wfa_management_recap");
  assert.equal(model.status, "ready");
  assert.equal(model.rankingPreview.items[0].name, "Jl. Juanda");
  assert.equal(model.rankingPreview.items[0].score, 90.25);
  assert.equal(model.rankingPreview.items[0].approvedBookingCount, 4);
  assert.deepEqual(model.criteriaWeights, []);
  assert.equal(model.consistency, null);
});

test("rejects Smart AC user ranking as a WFA recap contract", () => {
  assert.throws(
    () =>
      buildWfaFahpRecapViewModel({
        success: true,
        data: {
          type: "smart_ac",
          status: "ready",
          ranking_preview: { items: [{ name: "Yuli Sugiarti", score: 90.47 }] },
        },
      }),
    /Invalid WFA management recap contract/,
  );
});
```

Add cases for:

- `empty` with empty ranking.
- `needs_data` with empty ranking and non-zero Approved evidence.
- missing `location_key` or `location_label` on a ready ranking item.
- non-finite `average_suitability_score`.
- missing/invalid `approved_booking_count` or `scored_booking_count`.
- malformed evidence counts.

- [ ] **Step 3: Run the revised service + new slice tests and verify RED**

```cmd
node --test tests/fuzzy-ahp-service.test.js tests/dashboard/wfaFahpRecapSlice.test.js
```

Expected: FAIL because `getWfaFahpRecap` and `wfaFahpRecapSlice.js` do not exist and current code still exports the old live-analysis helper.

- [ ] **Step 4: Implement the recap transport and remove the dashboard live-analysis helper**

Change `src/js/services/fuzzyAhpService.js` to:

```js
const DASHBOARD_TYPES = ["discipline", "smart_ac"];

export class FuzzyAhpService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  async getDashboardFahpAnalysis({ type = "discipline" } = {}) {
    if (!DASHBOARD_TYPES.includes(type)) {
      throw new Error(
        `Invalid dashboard FAHP type: ${type}. Allowed types are ${DASHBOARD_TYPES.join(", ")}.`,
      );
    }
    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard`,
      params: { type },
    });
    return response.data;
  }

  async getWfaFahpRecap(params = {}) {
    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/wfa/recap`,
      params,
    });
    return response.data;
  }
}

const fuzzyAhpService = new FuzzyAhpService();
export const getDashboardFahpAnalysis = (params) =>
  fuzzyAhpService.getDashboardFahpAnalysis(params);
export const getWfaFahpRecap = (params) =>
  fuzzyAhpService.getWfaFahpRecap(params);
```

Do not retain `getWfaFahpAnalysis` as a compatibility alias in this Dashboard service module. The Backend live endpoint remains available independently.

- [ ] **Step 5: Implement the strict management recap slice**

Create `src/js/services/dashboard/wfaFahpRecapSlice.js` with a strict contract gate:

```js
const STATES = new Set(["ready", "empty", "needs_data"]);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const nonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

function contractData(response) {
  const data = response?.data;
  if (!data || data.type !== "wfa" || !STATES.has(data.status)) {
    throw new Error("Invalid WFA management recap contract");
  }
  if (
    !data.period ||
    !data.ranking_preview ||
    !Array.isArray(data.ranking_preview.items)
  ) {
    throw new Error("Invalid WFA management recap contract");
  }
  if (!data.evidence) throw new Error("Invalid WFA management recap contract");
  return data;
}

function normalizeItem(item) {
  if (
    !item ||
    typeof item.location_key !== "string" ||
    !item.location_key ||
    typeof item.location_label !== "string" ||
    !item.location_label ||
    !finite(item.average_suitability_score) ||
    !nonNegativeInteger(item.approved_booking_count) ||
    !nonNegativeInteger(item.scored_booking_count) ||
    !Number.isInteger(item.rank) ||
    item.rank < 1
  ) {
    throw new Error("Invalid WFA management recap contract");
  }

  return {
    id: item.location_key,
    name: item.location_label,
    locationLabel: item.location_label,
    latitude: finite(item.latitude) ? item.latitude : null,
    longitude: finite(item.longitude) ? item.longitude : null,
    label:
      typeof item.aggregate_label === "string" ? item.aggregate_label : null,
    score: item.average_suitability_score,
    rank: item.rank,
    approvedBookingCount: item.approved_booking_count,
    scoredBookingCount: item.scored_booking_count,
  };
}
```

`buildWfaFahpRecapViewModel` must return:

```js
{
  type: 'wfa',
  typeLabel: 'WFA',
  presentationKind: 'wfa_management_recap',
  status: data.status,
  needsData: data.status === 'needs_data',
  period: { ...data.period },
  consistency: null,
  criteriaWeights: [],
  rankingPreview: {
    items: data.ranking_preview.items.map(normalizeItem)
  },
  distribution: null,
  evidence: { ...data.evidence }
}
```

Validate that all four evidence counters are non-negative integers. For `empty` and `needs_data`, require `ranking_preview.items.length === 0`. For `ready`, require at least one valid ranking item.

Export:

```js
export function createWfaFahpRecapSliceState(response, request) {
  const data = buildWfaFahpRecapViewModel(response);
  return { status: data.status, data, error: null, request, meta: {} };
}
```

- [ ] **Step 6: Run the new transport/slice tests and verify GREEN**

```cmd
node --test tests/fuzzy-ahp-service.test.js tests/dashboard/wfaFahpRecapSlice.test.js
```

Expected: PASS.

- [ ] **Step 7: Delete superseded candidate-analysis slice files only after replacement is green**

Delete:

```text
src/js/services/dashboard/wfaFahpSlice.js
tests/dashboard/wfaFahpSlice.test.js
```

Then verify no production/test import still points to the deleted slice except code intentionally scheduled for Task 5:

```cmd
git grep -n "wfaFahpSlice" -- src tests
```

Expected at this checkpoint: only `dashboard.js` may still reference it; Task 5 removes that import before its tests go green.

- [ ] **Step 8: Commit the FE transport/normalizer boundary**

```cmd
git add src/js/services/fuzzyAhpService.js src/js/services/dashboard/wfaFahpRecapSlice.js tests/fuzzy-ahp-service.test.js tests/dashboard/wfaFahpRecapSlice.test.js
git add -u src/js/services/dashboard/wfaFahpSlice.js tests/dashboard/wfaFahpSlice.test.js
git commit -m "refactor(GH-67): consume WFA management recap contract"
```

### Task 5: Web FE active-type-safe cockpit model and WFA recap view state

**Files:**

- Modify: `src/js/services/dashboardCockpitService.js`
- Modify: `src/js/components/fuzzyAhpPanel.js`
- Modify: `tests/dashboard/wfaFahpCockpit.test.js`

**Interfaces:**

- Consumes: `buildWfaFahpRecapViewModel(response)` from Task 4; `buildFahpDashboardRecapViewModel(response)` for Discipline/Smart AC; active type `discipline | wfa | smart_ac`.
- Produces: `normalizeFuzzyAhpResponse(response, activeType)` with active-type dispatch, `fuzzyAhpLoading` support in cockpit composition, and view-state fields `isWfaManagementRecap`, `wfaRankingRows`, `wfaPeriodLabel`, `wfaEvidenceNote`.
- WFA panel data does not create a generic `decisions` entry and does not derive consistency/criteria metadata.

- [ ] **Step 1: Replace candidate-analysis cockpit fixtures with a failing management recap fixture**

Update `tests/dashboard/wfaFahpCockpit.test.js` so the WFA ready payload uses the Backend recap contract from Task 3. The primary assertion must be:

```js
test("WFA management recap becomes a location-only ready panel", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    fuzzyAhpActiveType: "wfa",
    fuzzyAhpResponse: readyWfaRecapResponse,
  });
  const panel = cockpit.bottomPanels.find((item) => item.key === "fuzzyAhp");
  const viewState = createFuzzyAhpViewState(panel, "wfa");

  assert.equal(panel.state, "ready");
  assert.equal(panel.data.presentationKind, "wfa_management_recap");
  assert.equal(viewState.isWfaManagementRecap, true);
  assert.equal(viewState.activeDecision, null);
  assert.deepEqual(viewState.criteriaRows, []);
  assert.equal(viewState.wfaRankingRows[0].label, "Jl. Juanda");
  assert.equal(viewState.wfaRankingRows[0].scoreLabel, "90.250");
  assert.equal(
    viewState.wfaRankingRows[0].bookingCountLabel,
    "4 approved bookings",
  );
});
```

- [ ] **Step 2: Add a failing cross-type contamination guard test**

```js
test("active WFA rejects a Smart AC response instead of rendering user rankings", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    fuzzyAhpActiveType: "wfa",
    fuzzyAhpResponse: {
      success: true,
      data: {
        type: "smart_ac",
        status: "ready",
        criteria_weights: [
          { key: "history", value: 0.332 },
          { key: "checkin_pattern", value: 0.256 },
        ],
        ranking_preview: {
          items: [
            {
              rank: 1,
              name: "Yuli Sugiarti",
              score: 90.47,
              label: "Sangat Tinggi",
            },
          ],
        },
      },
    },
  });

  const panel = cockpit.bottomPanels.find((item) => item.key === "fuzzyAhp");
  assert.equal(panel.state, "error");
  assert.equal(panel.data.activeType, "wfa");
  assert.equal(panel.data.decisions, undefined);
});
```

- [ ] **Step 3: Add failing WFA loading and state-semantics tests**

```js
test("WFA loading preserves three navigation options without stale decision data", () => {
  const cockpit = createDashboardCockpitStateFromSources({
    fuzzyAhpActiveType: "wfa",
    fuzzyAhpLoading: true,
    fuzzyAhpResponse: null,
  });
  const panel = cockpit.bottomPanels.find((item) => item.key === "fuzzyAhp");

  assert.equal(panel.state, "loading");
  assert.equal(panel.data.activeType, "wfa");
  assert.equal(panel.data.typeOptions.length, 3);
  assert.equal(panel.data.decisions, undefined);
});
```

Add `empty` and `needs_data` cases asserting the selected type stays WFA and no generic decision content is synthesized.

- [ ] **Step 4: Run cockpit tests and verify RED**

```cmd
node --test tests/dashboard/wfaFahpCockpit.test.js
```

Expected: FAIL because current cockpit dispatches by raw response shape and current WFA view state still models a candidate FAHP analysis.

- [ ] **Step 5: Make `normalizeFuzzyAhpResponse` dispatch by the selected type, never by payload shape**

In `src/js/services/dashboardCockpitService.js`, replace shape-based WFA detection with:

```js
function normalizeFuzzyAhpResponse(
  fuzzyAhpResponse,
  activeType = "discipline",
) {
  if (fuzzyAhpResponse === null || typeof fuzzyAhpResponse === "undefined") {
    return { value: null, error: null };
  }
  if (typeof fuzzyAhpResponse !== "object" || Array.isArray(fuzzyAhpResponse)) {
    return { value: false, error: null };
  }

  try {
    const viewModel =
      activeType === "wfa"
        ? buildWfaFahpRecapViewModel(fuzzyAhpResponse)
        : buildFahpDashboardRecapViewModel(fuzzyAhpResponse);

    if (viewModel.type !== activeType) {
      throw new Error(
        `FAHP response type mismatch: active=${activeType}, response=${viewModel.type}`,
      );
    }

    return {
      value: { ...viewModel, source: FUZZY_AHP_SOURCE_KEY },
      error: null,
    };
  } catch (error) {
    return { value: null, error };
  }
}
```

Call it as:

```js
const fuzzyAhpNormalization = normalizeFuzzyAhpResponse(
  fuzzyAhpResponse,
  fuzzyAhpActiveType,
);
```

This is the core fix for the observed `WFA tab + Smart AC names/criteria` state.

- [ ] **Step 6: Add `fuzzyAhpLoading` as a focused cockpit input**

Extend `createDashboardCockpitStateFromSources` and `loadDashboardCockpitState` with:

```js
fuzzyAhpLoading = false;
```

Pass it to `buildExplicitFuzzyAhpPanel`. The panel builder must check loading before null-response fallback:

```js
if (fuzzyAhpLoading) {
  return createPanel({
    ...getBottomPanelDefinition("fuzzyAhp"),
    state: DASHBOARD_PANEL_STATES.LOADING,
    message:
      activeType === "wfa"
        ? "Loading WFA management location recap for the active dashboard period."
        : "Loading Fuzzy AHP analysis.",
    data: createFuzzyAhpFallbackData(activeType),
  });
}
```

Do not set the whole Dashboard cockpit to loading when only a FAHP tab is changing.

- [ ] **Step 7: Add a WFA-specific branch in `buildExplicitFuzzyAhpPanel`**

After error/null/malformed checks and before the generic `criteriaWeights` requirement, handle:

```js
if (fuzzyAhp.presentationKind === "wfa_management_recap") {
  const state =
    fuzzyAhp.status === "needs_data"
      ? DASHBOARD_PANEL_STATES.NEEDS_DATA
      : fuzzyAhp.status === "empty"
        ? DASHBOARD_PANEL_STATES.EMPTY
        : DASHBOARD_PANEL_STATES.READY;

  return createPanel({
    ...getBottomPanelDefinition("fuzzyAhp"),
    state,
    message:
      state === DASHBOARD_PANEL_STATES.READY
        ? "WFA location ranking uses persisted Approved booking suitability evidence."
        : state === DASHBOARD_PANEL_STATES.EMPTY
          ? "No Approved WFA bookings exist in the active dashboard period."
          : "Approved WFA bookings exist, but no valid persisted suitability scores are available.",
    note: "Management WFA recap does not run a new FAHP matrix or fabricate user rankings.",
    data: {
      ...createFuzzyAhpFallbackData("wfa"),
      ...fuzzyAhp,
      activeType: "wfa",
    },
  });
}
```

Generic Discipline/Smart AC logic remains unchanged after this branch.

- [ ] **Step 8: Build WFA-specific display rows in `fuzzyAhpPanel.js`**

Add:

```js
function createWfaRankingRows(items = []) {
  return items.slice(0, 5).map((item, index) => ({
    key: item.id || `wfa-location-${index}`,
    rank: Number(item.rank) || index + 1,
    label: item.name || item.locationLabel || "WFA location",
    secondaryLabel: item.label || null,
    scoreLabel: formatDecimal(Number(item.score), 3),
    bookingCountLabel: `${Number(item.approvedBookingCount) || 0} approved booking${Number(item.approvedBookingCount) === 1 ? "" : "s"}`,
    scoredBookingCount: Number(item.scoredBookingCount) || 0,
  }));
}

function buildWfaEvidenceNote(evidence) {
  if (!evidence) return "";
  return `Ranking uses ${evidence.scored_booking_count} of ${evidence.approved_booking_count} approved bookings with valid suitability evidence.`;
}
```

In `createFuzzyAhpViewState`, compute:

```js
const isWfaManagementRecap =
  panel?.data?.presentationKind === "wfa_management_recap";
```

Return these additional fields:

```js
isWfaManagementRecap,
wfaRankingRows: isWfaManagementRecap
  ? createWfaRankingRows(panel?.data?.rankingPreview?.items)
  : [],
wfaPeriodLabel:
  isWfaManagementRecap && panel?.data?.period?.from && panel?.data?.period?.to
    ? `${panel.data.period.from} â€“ ${panel.data.period.to}`
    : '',
wfaEvidenceNote:
  isWfaManagementRecap ? buildWfaEvidenceNote(panel?.data?.evidence) : ''
```

When `isWfaManagementRecap` is true, force `activeDecision` to `null`, `criteriaRows` to `[]`, and do not derive consistency from missing values.

- [ ] **Step 9: Run cockpit tests and verify GREEN**

```cmd
node --test tests/dashboard/wfaFahpCockpit.test.js
```

Expected: PASS, including the Smart AC contamination guard.

- [ ] **Step 10: Run existing generic FAHP recap/cockpit tests**

```cmd
node --test tests/dashboard/fahpRecapSlice.test.js tests/dashboard/fahpRecapContractSync.test.js
```

Expected: Discipline/Smart AC contract tests remain PASS.

- [ ] **Step 11: Commit the active-type-safe cockpit boundary**

```cmd
git add src/js/services/dashboardCockpitService.js src/js/components/fuzzyAhpPanel.js tests/dashboard/wfaFahpCockpit.test.js
git commit -m "fix(GH-67): isolate WFA recap from generic FAHP decisions"
```

---

### Task 6: Web FE Dashboard orchestration uses active Dashboard period and removes manual WFA context

**Files:**

- Modify: `src/js/features/dashboard/dashboard.js`
- Delete: `src/js/features/dashboard/wfaFahpContext.js`
- Modify: `tests/dashboard/dashboardPageOrchestration.test.js`
- Delete: `tests/dashboard/wfaFahpContext.test.js`
- Modify if imports require it: `src/js/features/dashboard/dashboard-period.test.js`

**Interfaces:**

- Consumes: `getWfaFahpRecap(params)` and `createWfaFahpRecapSliceState(response, request)`; existing `getDashboardAnalyticsRequestParams()` which already maps Dashboard UI range to Backend canonical periods.
- Produces: `fetchWfaFahpRecap`, `loadWfaFahpRecap(params?)`, active-type `selectFahpType(type)`, and `fuzzyAhpLoading` state.
- Removes: `wfaFahpContext`, `fetchWfaFahpAnalysis`, `runWfaFahpAnalysis`, `invalidateWfaFahpResult`, `buildWfaFahpRequestParams`, `validateWfaFahpContext`, `createDefaultWfaFahpContext`.

- [ ] **Step 1: Replace old explicit-input orchestration tests with failing recap tests**

Remove tests asserting WFA selection performs zero requests or that invalid manual context blocks transport. Add:

```js
test("selecting WFA requests recap immediately with the active Dashboard period", async () => {
  const component = dashboard();
  const seen = [];
  component.fetchWfaFahpRecap = async (params) => {
    seen.push(params);
    return readyWfaRecapResponse;
  };

  await component.selectFahpType("wfa");

  assert.deepEqual(seen, [{ period: "current_month" }]);
  assert.equal(component.fahpFilterState.type, "wfa");
  assert.equal(
    component.rawApiData.wfaFahp.data.presentationKind,
    "wfa_management_recap",
  );
});
```

Use the existing default Dashboard range contract. If `buildDashboardRangeRequestParams` returns additional absent properties in current code, assert the exact canonical result produced by that helper rather than hand-authoring a different range shape.

- [ ] **Step 2: Add failing current-week and custom-period forwarding tests**

```js
test("WFA recap uses the same canonical request mapping as dashboard analytics", async () => {
  const component = dashboard();
  const seen = [];
  component.fetchWfaFahpRecap = async (params) => {
    seen.push(params);
    return readyWfaRecapResponse;
  };

  component.dashboardRange = "current_week";
  component.dashboardRangeState = {
    period: "current_week",
    from: null,
    to: null,
  };
  await component.selectFahpType("wfa");
  assert.deepEqual(seen.pop(), { period: "weekly" });

  component.dashboardRange = "custom";
  component.dashboardRangeState = {
    period: "custom",
    from: "2026-08-03",
    to: "2026-08-09",
  };
  await component.loadWfaFahpRecap();
  assert.deepEqual(seen.pop(), {
    period: "custom",
    from: "2026-08-03",
    to: "2026-08-09",
  });
});
```

- [ ] **Step 3: Add a failing stale-Smart-AC invalidation test using a deferred recap response**

```js
test("switching from Smart AC to WFA clears Smart AC content before WFA transport resolves", async () => {
  const component = dashboard();
  let resolveRecap;
  component.fahpFilterState = { type: "smart_ac" };
  component.fuzzyAhpResponse = smartAcResponse;
  component.fetchWfaFahpRecap = () =>
    new Promise((resolve) => {
      resolveRecap = resolve;
    });

  const pending = component.selectFahpType("wfa");
  await Promise.resolve();

  assert.equal(component.fahpFilterState.type, "wfa");
  assert.equal(component.fuzzyAhpResponse, null);
  assert.equal(component.fuzzyAhpError, null);
  assert.equal(component.fuzzyAhpLoading, true);

  resolveRecap(readyWfaRecapResponse);
  await pending;
  assert.equal(component.fuzzyAhpLoading, false);
  assert.equal(component.fuzzyAhpResponse.data.type, "wfa");
});
```

- [ ] **Step 4: Add a failing Dashboard-refresh test proving WFA is re-requested when the period changes**

The old design deliberately preserved the previous WFA result during unrelated refreshes. That behavior is now superseded because WFA recap is period-scoped.

```js
test("dashboard refresh refetches active WFA recap for the new dashboard range", async () => {
  const component = dashboard();
  component.fahpFilterState = { type: "wfa" };
  component.dashboardRange = "current_week";
  component.dashboardRangeState = {
    period: "current_week",
    from: null,
    to: null,
  };
  const seen = [];
  component.fetchWfaFahpRecap = async (params) => {
    seen.push(params);
    return readyWfaRecapResponse;
  };

  const result = await component.fetchFahpForDashboardRefresh();
  assert.deepEqual(seen, [{ period: "weekly" }]);
  assert.equal(result.error, null);
});
```

- [ ] **Step 5: Add a failing structural test proving the manual context API is gone**

```js
test("dashboard no longer exposes manual WFA context actions", () => {
  const component = dashboard();
  assert.equal("wfaFahpContext" in component, false);
  assert.equal("runWfaFahpAnalysis" in component, false);
  assert.equal("invalidateWfaFahpResult" in component, false);
  assert.equal("fetchWfaFahpAnalysis" in component, false);
  assert.equal(typeof component.fetchWfaFahpRecap, "function");
});
```

- [ ] **Step 6: Run the revised orchestration tests and verify RED**

```cmd
node --test tests/dashboard/dashboardPageOrchestration.test.js
```

Expected: FAIL against current explicit-context implementation.

- [ ] **Step 7: Replace Dashboard imports/state with recap ownership**

At the top of `dashboard.js`:

```js
import {
  getDashboardFahpAnalysis,
  getWfaFahpRecap,
} from "../../services/fuzzyAhpService.js";
import { createWfaFahpRecapSliceState } from "../../services/dashboard/wfaFahpRecapSlice.js";
```

Remove all imports from `./wfaFahpContext.js` and the old WFA slice.

In the returned Alpine state:

```js
fahpFilterState: { ...defaultFahpFilterState },
fuzzyAhpLoading: false,
fetchDashboardFahpAnalysis: getDashboardFahpAnalysis,
fetchFuzzyAhpAnalysis: getDashboardFahpAnalysis,
fetchWfaFahpRecap: getWfaFahpRecap,
```

Remove `wfaFahpContext` and `fetchWfaFahpAnalysis`.

- [ ] **Step 8: Thread `fuzzyAhpLoading` through `applyCockpitSurfaceState`**

Where `loadDashboardCockpitState`/`createDashboardCockpitStateFromSources` is called, pass:

```js
fuzzyAhpLoading: this.fuzzyAhpLoading,
fuzzyAhpActiveType: this.fahpFilterState.type
```

When a FAHP request starts set `fuzzyAhpLoading = true`; in both success and catch/finally paths set it back to `false` before the final cockpit rebuild.

- [ ] **Step 9: Implement `loadWfaFahpRecap` using the existing Dashboard range request builder**

```js
async loadWfaFahpRecap(params = this.getDashboardAnalyticsRequestParams()) {
  this.fahpFilterState = { type: 'wfa' };
  this.fuzzyAhpResponse = null;
  this.fuzzyAhpError = null;
  this.fuzzyAhpLoading = true;
  this.rawApiData = {
    ...(this.rawApiData || {}),
    wfaFahp: null
  };
  await this.applyCockpitSurfaceState({
    fuzzyAhpResponse: null,
    fuzzyAhpError: null
  });

  try {
    const response = await this.fetchWfaFahpRecap(params);
    this.fuzzyAhpResponse = response;
    this.rawApiData = {
      ...(this.rawApiData || {}),
      wfaFahp: createWfaFahpRecapSliceState(response, params)
    };
    return true;
  } catch (error) {
    this.fuzzyAhpResponse = null;
    this.fuzzyAhpError = error;
    return false;
  } finally {
    this.fuzzyAhpLoading = false;
    await this.applyCockpitSurfaceState({
      fuzzyAhpResponse: this.fuzzyAhpResponse,
      fuzzyAhpError: this.fuzzyAhpError
    });
  }
}
```

Do not call `navigator.geolocation`, Live Map state, attendance coordinates, or WFA recommendation APIs here.

- [ ] **Step 10: Make tab selection immediately invalidate the previous type and route WFA to recap**

```js
async selectFahpType(type) {
  const next = buildFahpRequestParams({ type });
  this.fahpFilterState = next;
  this.fuzzyAhpResponse = null;
  this.fuzzyAhpError = null;

  if (next.type === 'wfa') {
    return this.loadWfaFahpRecap(this.getDashboardAnalyticsRequestParams());
  }
  return this.loadFuzzyAhpDetail(next);
}
```

Ensure `loadFuzzyAhpDetail` also uses `fuzzyAhpLoading` so WFAâ†’Smart AC/Discipline transitions cannot show stale WFA rows while generic analysis is loading.

- [ ] **Step 11: Change `fetchFahpForDashboardRefresh` so active WFA is period-refetched**

```js
async fetchFahpForDashboardRefresh() {
  const { type } = buildFahpRequestParams(this.fahpFilterState);
  try {
    if (type === 'wfa') {
      const params = this.getDashboardAnalyticsRequestParams();
      return {
        response: await this.fetchWfaFahpRecap(params),
        error: null,
        request: params
      };
    }

    const transport =
      this.fetchDashboardFahpAnalysis !== getDashboardFahpAnalysis
        ? this.fetchDashboardFahpAnalysis
        : this.fetchFuzzyAhpAnalysis;
    return {
      response: await transport({ type }),
      error: null,
      request: { type }
    };
  } catch (error) {
    return { response: null, error, request: null };
  }
}
```

When `loadSummaryData()` persists the resulting raw slice, use `createWfaFahpRecapSliceState` only when active type is WFA and keep `rawApiData.fahpRecap` separate from `rawApiData.wfaFahp`.

- [ ] **Step 12: Delete superseded manual-context production/test files and methods**

Delete:

```text
src/js/features/dashboard/wfaFahpContext.js
tests/dashboard/wfaFahpContext.test.js
```

Remove `runWfaFahpAnalysis()` and `invalidateWfaFahpResult()` from `dashboard.js`.

- [ ] **Step 13: Run orchestration/period tests and verify GREEN**

```cmd
node --test tests/dashboard/dashboardPageOrchestration.test.js src/js/features/dashboard/dashboard-period.test.js
```

Expected: PASS.

- [ ] **Step 14: Prove manual WFA context symbols are absent from runtime/test code**

```cmd
git grep -n -E "wfaFahpContext|runWfaFahpAnalysis|invalidateWfaFahpResult|fetchWfaFahpAnalysis|buildWfaFahpRequestParams|validateWfaFahpContext" -- src tests
```

Expected: no matches. Historical spec/plan documents are excluded intentionally.

- [ ] **Step 15: Commit orchestration revision**

```cmd
git add src/js/features/dashboard/dashboard.js tests/dashboard/dashboardPageOrchestration.test.js src/js/features/dashboard/dashboard-period.test.js
git add -u src/js/features/dashboard/wfaFahpContext.js tests/dashboard/wfaFahpContext.test.js
git commit -m "fix(GH-67): drive WFA recap from dashboard period"
```

If `dashboard-period.test.js` needs no edit, omit it from `git add`.

### Task 7: Web FE WFA location recap template and final #66 navigation regression

**Files:**

- Modify: `src/partials/dashboard/fuzzy-ahp-panel.html`
- Modify: `tests/dashboard/wfaFahpTemplate.test.js`
- Test: `tests/dashboard-cockpit-template.test.js` â€” run unchanged as a delegation/#66 regression unless Task 7 intentionally updates its assertions.

**Interfaces:**

- Consumes: Task 5 view-state fields `isWfaManagementRecap`, `wfaRankingRows`, `wfaPeriodLabel`, `wfaEvidenceNote`; existing `panel.state`, `panel.stateLabel`, and `fahpFilterState.type`.
- Produces: one stable three-option FAHP nav, separate status, WFA location ranking presentation, and generic Discipline/Smart AC consistency/criteria presentation.
- Removes: all WFA manual location/date/radius form controls and `Run WFA Analysis` action.

- [ ] **Step 1: Replace the old explicit-WFA-context template test with failing removal assertions**

In `tests/dashboard/wfaFahpTemplate.test.js`, keep the #66 navigation assertions and replace the manual context test with:

```js
test("FAHP partial has no manual WFA coordinates/date/radius controls", () => {
  assert.doesNotMatch(partial, /wfaFahpContext/);
  assert.doesNotMatch(partial, /runWfaFahpAnalysis/);
  assert.doesNotMatch(partial, /invalidateWfaFahpResult/);
  assert.doesNotMatch(partial, />Latitude</);
  assert.doesNotMatch(partial, />Longitude</);
  assert.doesNotMatch(partial, />Schedule date</);
  assert.doesNotMatch(partial, /Radius meters/);
  assert.doesNotMatch(partial, /Run WFA Analysis/);
});
```

- [ ] **Step 2: Add failing WFA recap presentation assertions**

```js
test("FAHP partial renders a dedicated WFA management recap branch", () => {
  assert.match(partial, /viewState\.isWfaManagementRecap/);
  assert.match(partial, /viewState\.wfaPeriodLabel/);
  assert.match(partial, /viewState\.wfaRankingRows/);
  assert.match(partial, /viewState\.wfaEvidenceNote/);
  assert.match(partial, /row\.bookingCountLabel/);
});

test("generic consistency and criteria cards are excluded from the WFA recap branch", () => {
  assert.match(partial, /!viewState\.isWfaManagementRecap/);
  assert.match(partial, /Consistency Check/);
  assert.match(partial, /Criteria Weights/);
});
```

Keep/strengthen the existing assertion that exactly one navigation element is owned by this partial and active styling is driven by `fahpFilterState.type`.

- [ ] **Step 3: Run template tests and verify RED**

```cmd
node --test tests/dashboard/wfaFahpTemplate.test.js tests/dashboard-cockpit-template.test.js
```

Expected: FAIL because the current partial still contains manual WFA inputs and a run button.

- [ ] **Step 4: Remove the entire explicit WFA context `<form>` from `fuzzy-ahp-panel.html`**

Delete the block guarded by:

```html
<template x-if="fahpFilterState.type === 'wfa'"></template>
```

that contains:

```text
Latitude
Longitude
Schedule date
Radius meters (optional)
Run WFA Analysis
```

Do not replace it with hidden inputs or browser geolocation. WFA selection itself drives the recap request.

- [ ] **Step 5: Add the WFA management recap ready branch**

Before the generic ready-analysis block, add:

```html
<template x-if="panel.state === 'ready' && viewState.isWfaManagementRecap">
  <div class="mt-4 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="text-sm font-semibold text-gray-900 dark:text-white">
          WFA Location Ranking
        </p>
        <p
          class="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
          x-text="viewState.wfaPeriodLabel"
        ></p>
      </div>
    </div>

    <ul
      class="flex flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <template x-for="row in viewState.wfaRankingRows" :key="row.key">
        <li
          class="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-gray-800"
        >
          <span
            class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            x-text="row.rank"
          ></span>
          <div class="min-w-0 flex-1">
            <p
              class="truncate text-sm font-semibold text-gray-900 dark:text-white"
              x-text="row.label"
            ></p>
            <div
              class="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500 dark:text-gray-400"
            >
              <span
                x-show="row.secondaryLabel"
                x-text="row.secondaryLabel"
              ></span>
              <span x-text="row.bookingCountLabel"></span>
            </div>
          </div>
          <span
            class="text-sm font-semibold text-gray-900 tabular-nums dark:text-white"
            x-text="row.scoreLabel"
          ></span>
        </li>
      </template>
    </ul>

    <p
      x-show="viewState.wfaEvidenceNote"
      class="text-xs text-gray-500 dark:text-gray-400"
      x-text="viewState.wfaEvidenceNote"
    ></p>
  </div>
</template>
```

Use the existing neighboring Dashboard utility-class conventions; do not change the field semantics shown above.

- [ ] **Step 6: Gate the generic FAHP cards away from WFA recap**

Change the generic ready template condition from:

```html
<template x-if="panel.state === 'ready' && viewState.activeDecision"></template>
```

to:

```html
<template
  x-if="panel.state === 'ready' && !viewState.isWfaManagementRecap && viewState.activeDecision"
></template>
```

This keeps `Consistency Check`, `Criteria Weights`, and generic ranking only for Discipline/Smart AC.

- [ ] **Step 7: Keep non-ready feedback generic but type-truthful**

For `empty`, `needsData`, `error`, and `loading`, continue rendering `panel.message`/`panel.note`. Do not inject old generic copy saying WFA waits for `analysis.fuzzy-ahp dashboard backend feed` when active type is WFA; Task 5 cockpit messages are authoritative.

Ensure `panel.stateLabel` remains outside `<nav>` and is never clickable.

- [ ] **Step 8: Run template tests and verify GREEN**

```cmd
node --test tests/dashboard/wfaFahpTemplate.test.js tests/dashboard-cockpit-template.test.js
```

Expected: PASS.

- [ ] **Step 9: Run focused FAHP UI/cockpit/orchestration regression together**

```cmd
node --test tests/dashboard/wfaFahpRecapSlice.test.js tests/dashboard/wfaFahpCockpit.test.js tests/dashboard/dashboardPageOrchestration.test.js tests/dashboard/wfaFahpTemplate.test.js tests/dashboard-cockpit-template.test.js
```

Expected: PASS.

- [ ] **Step 10: Commit the WFA recap UI revision**

```cmd
git add src/partials/dashboard/fuzzy-ahp-panel.html tests/dashboard/wfaFahpTemplate.test.js tests/dashboard-cockpit-template.test.js
git commit -m "fix(GH-66,GH-67): render WFA location recap in decision center"
```

If `tests/dashboard-cockpit-template.test.js` required no edit, omit it from `git add`.

---

### Task 8: Cross-repo regression, build, runtime evidence, and delivery gate

**Files:**

- No planned production file changes. Any change discovered here must return to the owning task and repeat its RED/GREEN cycle.
- Evidence may be recorded in the eventual Backend issue/PR and Web FE #66/#67 PR descriptions when the user requests delivery.

**Interfaces:**

- Consumes: completed Tasks 1-7.
- Produces: fresh Backend contract evidence, fresh FE tests/build evidence, runtime behavior evidence, and clean reviewable Git states in both worktrees.

- [ ] **Step 1: Format only touched files in each repository**

Backend, use the repository's existing Prettier style on touched JS/YAML files only. Example:

```cmd
npx prettier --write src/services/wfaManagementRecap.service.js src/controllers/analysis.controller.js src/routes/analysis.routes.js src/middlewares/validator.js tests/wfaManagementRecapService.test.js tests/analysisFuzzyAhpWfaRecapRoute.test.js docs/openapi.yaml
```

Web FE:

```cmd
npx prettier --write src/js/services/fuzzyAhpService.js src/js/services/dashboard/wfaFahpRecapSlice.js src/js/features/dashboard/dashboard.js src/js/services/dashboardCockpitService.js src/js/components/fuzzyAhpPanel.js src/partials/dashboard/fuzzy-ahp-panel.html tests/fuzzy-ahp-service.test.js tests/dashboard/wfaFahpRecapSlice.test.js tests/dashboard/wfaFahpCockpit.test.js tests/dashboard/dashboardPageOrchestration.test.js tests/dashboard/wfaFahpTemplate.test.js
```

If formatting changes code after its task commit, rerun the owning focused tests and commit the formatting together with that owning change before final verification; do not create a broad unrelated formatting commit.

- [ ] **Step 2: Run the complete focused Backend contract suite**

```cmd
npm test -- --runInBand --runTestsByPath tests/wfaManagementRecapService.test.js tests/analysisFuzzyAhpWfaRecapRoute.test.js tests/analysisFuzzyAhpWfaRoute.test.js tests/analysisFuzzyAhpWfaContract.test.js tests/historicalDateWindow.test.js tests/clientCriticalOpenApiContract.test.js tests/openApiRuntimeDriftContract.test.js
```

Expected:

- new recap service tests PASS;
- new recap route/auth/validation tests PASS;
- old live WFA route tests remain PASS;
- `dashboard?type=wfa` migration tests remain PASS;
- date-window tests remain PASS;
- OpenAPI contract tests PASS.

- [ ] **Step 3: Run focused Backend lint again after formatting**

```cmd
npx eslint src/services/wfaManagementRecap.service.js src/controllers/analysis.controller.js src/routes/analysis.routes.js src/middlewares/validator.js tests/wfaManagementRecapService.test.js tests/analysisFuzzyAhpWfaRecapRoute.test.js
```

Expected: exit 0.

- [ ] **Step 4: Run the complete focused Web FE FAHP/dashboard suite**

```cmd
node --test tests/fuzzy-ahp-service.test.js tests/dashboard/fahpRecapContractSync.test.js tests/dashboard/fahpRecapSlice.test.js tests/dashboard/wfaFahpRecapSlice.test.js tests/dashboard/wfaFahpCockpit.test.js tests/dashboard/dashboardPageOrchestration.test.js tests/dashboard/wfaFahpTemplate.test.js tests/dashboard-cockpit-template.test.js src/js/features/dashboard/dashboard-period.test.js
```

Expected: PASS. There must be no remaining focused test whose name or assertion requires manual WFA latitude/longitude/date/radius context.

- [ ] **Step 5: Prove the superseded FE runtime symbols are gone**

```cmd
git grep -n -E "wfaFahpContext|runWfaFahpAnalysis|invalidateWfaFahpResult|fetchWfaFahpAnalysis|getWfaFahpAnalysis|buildWfaFahpRequestParams|validateWfaFahpContext" -- src tests
```

Expected: no matches.

Also verify the new recap endpoint is the only Dashboard WFA transport:

```cmd
git grep -n "/analysis/fuzzy-ahp/wfa" -- src/js tests
```

Expected: Dashboard runtime/test references use `/analysis/fuzzy-ahp/wfa/recap`; no Dashboard code sends `lat`, `lon`, `schedule_date`, or `radius_meters`.

- [ ] **Step 6: Verify type isolation statically and behaviorally**

Run:

```cmd
git grep -n -E "history|checkin_pattern|context|transition" -- src/partials/dashboard/fuzzy-ahp-panel.html src/js/services/dashboard/wfaFahpRecapSlice.js
```

Expected: no Smart AC criteria hardcoded into WFA recap presentation/normalizer.

Then rerun the specific contamination test by name/file:

```cmd
node --test tests/dashboard/wfaFahpCockpit.test.js
```

Expected: the Smart AC-as-WFA guard PASS.

- [ ] **Step 7: Build Web FE**

```cmd
npm run build
```

Expected: exit 0.

- [ ] **Step 8: Run the full Web FE Node test suite and compare any unrelated baseline failures exactly**

```cmd
node --test
```

Current historical baseline before this revision was not fully green due unrelated tests such as `tests/wfa-page-shell.test.js`. If the full suite still fails, record exact failing test names/count and compare them with the pre-existing baseline. Do not call the branch green if new failures appear, and do not modify unrelated tests merely to obtain a green count.

- [ ] **Step 9: Run the Backend full test command and classify any unrelated baseline failures**

```cmd
npm test -- --runInBand
```

Expected target: no failures caused by the new recap. If unrelated existing failures occur, record exact names/count and distinguish them from focused recap/live-WFA evidence. Do not weaken tests or modify unrelated Backend behavior.

- [ ] **Step 10: Run `git diff --check` and status in both worktrees**

Backend:

```cmd
git diff --check
git status --short --branch
git log --oneline -5
```

Web FE:

```cmd
git diff --check
git status --short --branch
git log --oneline -10
```

Expected:

- `git diff --check` exits 0 in both repos;
- no generated secrets/build outputs are staged;
- FE `webpack-dev-server.log` and `webpack-dev-server.err.log` remain untracked and untouched if still present;
- implementation commits are bounded by task.

- [ ] **Step 11: Perform manual Management Dashboard runtime verification against the Backend recap**

Use a Management/Admin session with data covering at least one Approved WFA booking with a persisted score. Verify:

```text
1. Open Dashboard â†’ Fuzzy AHP Decision Center.
2. Click Smart AC and observe its user ranking if data exists.
3. Click WFA.
4. Smart AC names/criteria disappear immediately before the WFA response resolves.
5. No Latitude/Longitude/Schedule date/Radius form exists.
6. Network request is GET /api/analysis/fuzzy-ahp/wfa/recap with the active Dashboard period only.
7. WFA ready rows display location_label, aggregate_label, average score, and approved booking count.
8. WFA does not display generic Consistency Check or Criteria Weights cards.
9. Change Dashboard range to Current Week; WFA recap refetches with period=weekly.
10. Change to a custom range; WFA recap sends period=custom&from=...&to=....
11. Empty/needs-data/error states keep WFA active and never show Discipline/Smart AC rows.
12. Switch back to Discipline and Smart AC; their generic FAHP analysis behavior remains intact.
```

Capture screenshot/recording and Network evidence for the eventual Web FE PR because the project PR rules require UI evidence.

- [ ] **Step 12: Verify Backend response semantics with representative data**

For a test/staging dataset or controlled fixture, confirm:

```text
- Pending and Rejected bookings do not contribute.
- Two Approved rows at the same normalized description within <=25m form one location group.
- Same description farther than 25m stays separate.
- Blank description can join by <=25m proximity.
- An unscored Approved row increases approved_booking_count but not the average denominator.
- Average score maps to Backend canonical aggregate_label.
- Top 5 tie-break is average DESC â†’ approved count DESC â†’ location label ASC.
```

Do not use production-sensitive data in logs or screenshots.

- [ ] **Step 13: Stop before push/PR unless explicitly authorized**

At this checkpoint report separately:

```text
Backend implementation state
Backend focused/full test evidence
Web FE implementation state
Web FE focused/full test evidence
Web FE build evidence
Manual runtime evidence
Known unrelated baseline failures
Git status of both worktrees
```

Do not push either branch and do not create a PR until the user explicitly requests delivery.

## Expected Commit Sequence

Backend worktree:

```text
feat: add deterministic WFA management recap ranking
feat: scope WFA management recap to approved bookings
feat: expose WFA management recap endpoint
```

Web FE worktree, after the existing old-design commits:

```text
refactor(GH-67): consume WFA management recap contract
fix(GH-67): isolate WFA recap from generic FAHP decisions
fix(GH-67): drive WFA recap from dashboard period
fix(GH-66,GH-67): render WFA location recap in decision center
```

Do not rewrite the pre-existing commits `d0ee988`, `a6d2304`, `26d2174`, or `3eb8c99`; the revision commits above make the design change auditable.

## Completion Definition

This revision is implementation-complete only when all of the following are evidenced:

- Backend recap endpoint exists, is documented, and is restricted to Admin/Management.
- Backend recap uses Approved bookings only and the active Dashboard period.
- Physical-location grouping follows deterministic normalized-description + 25m anchor semantics.
- Ranking averages only finite persisted scores and exposes truthful Approved/scored counts.
- Live WFA recommendation endpoint remains unchanged and green.
- Generic dashboard `type=wfa` remains retired with 410.
- Web FE WFA sends no manual spatial/date/radius inputs.
- Web FE WFA consumes only the recap contract and rejects Smart AC/Discipline payloads.
- WFA tab cannot display user names/Smart AC criteria as WFA truth.
- WFA ready UI shows location rankings and evidence counts, without generic consistency/criteria cards.
- Exactly three FAHP navigation options remain stable across loading/ready/empty/needs-data/error states.
- Discipline and Smart AC regressions remain green.
- Web FE build passes.
- Focused tests in both repos pass, and full-suite failures are either absent or proven unchanged from unrelated baseline.
- `git diff --check` is clean in both worktrees.
- No push/PR has occurred without explicit user instruction.
