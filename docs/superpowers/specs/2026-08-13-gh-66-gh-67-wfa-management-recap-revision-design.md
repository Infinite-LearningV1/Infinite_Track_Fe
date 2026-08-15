> **Superseded 2026-08-15:** See `docs/superpowers/specs/2026-08-15-gh-66-gh-67-wfa-date-range-dashboard-analysis-design.md`.

# GH-66 + GH-67 WFA Management Recap Revision Design

## Status

**Approved design revision â€” 2026-08-13.**

This document supersedes the WFA explicit-input design in:

- `docs/superpowers/specs/2026-08-12-gh-66-gh-67-dashboard-wfa-fahp-contract-sync-design.md`
- `docs/superpowers/plans/2026-08-12-gh-66-gh-67-dashboard-wfa-fahp-contract-sync.md`

The #66 decision remains valid: the Fuzzy AHP Decision Center has exactly three navigation options (`Discipline | WFA | Smart AC`), and runtime status is not a fourth tab.

The previous #67 design that required Management Web FE to enter latitude, longitude, schedule date, and radius is retired. The existing implementation commits based on that design are provisional and must be revised before delivery.

## Problem Statement

The current local Web FE implementation conflates two different WFA use cases:

1. **Live WFA recommendation** â€” candidate discovery/scoring around an explicit coordinate and schedule date.
2. **Management Dashboard recap** â€” historical decision-support summary over WFA locations already persisted through booking flows.

The live recommendation contract correctly requires spatial/date context. The Management Dashboard should not ask an operator to manually provide that context merely to view a recap.

A second defect was observed when the WFA tab displayed Smart AC data such as `history`, `checkin_pattern`, `context`, `transition` and user names. Those fields belong to Smart AC user ranking, not WFA location ranking. A WFA-active state must never render another FAHP type's decision payload.

## Locked Product Semantics

### Live WFA recommendation remains unchanged

The existing dedicated endpoint retains its current responsibility:

```text
GET /api/analysis/fuzzy-ahp/wfa
  ?lat=<number>
  &lon=<number>
  &schedule_date=YYYY-MM-DD
  [&radius_meters=<number>]
```

It remains appropriate for employee/request flows that need new candidate locations. It is not the Management Dashboard recap endpoint.

### Management WFA recap is historical persisted evidence

The Dashboard WFA tab answers:

> Which physical WFA locations, among approved bookings in the active dashboard period, have the strongest historical persisted suitability evidence?

The recap:

- uses persisted `Booking` + `Location` data;
- includes **Approved bookings only**;
- includes only finite persisted `suitability_score` values in score aggregation;
- groups records into unique physical locations;
- ranks unique locations by average persisted suitability score;
- follows the active Dashboard period/filter;
- is computed by Backend, not Web FE.

## Architecture Decision

Use a dedicated Backend-owned Management recap contract.

```text
Dashboard active range
        â†“
Web FE Fuzzy AHP feature
        â†“
GET /api/analysis/fuzzy-ahp/wfa/recap
        â†“
Backend WFA Management Recap service
        â†“
Booking + Location persisted evidence
        â†“
Approved-only filtering
        â†“
physical-location grouping
        â†“
aggregate suitability score + Backend label
        â†“
Top 5 ranked locations
        â†“
strict Web FE WFA recap normalizer
        â†“
Dashboard cockpit presentation model
        â†“
Fuzzy AHP partial
```

This is intentionally separate from the live `/analysis/fuzzy-ahp/wfa` recommendation endpoint.

## Backend Source of Truth

### Eligible records

A booking contributes to the Management WFA recap when all of the following are true:

- booking status is `Approved` (`status = 1` in the current booking status contract);
- `schedule_date` falls inside the active Dashboard period;
- the booking has an associated WFA `Location`;
- `suitability_score` is finite for score aggregation.

Pending and Rejected bookings do not contribute to ranking or averages.

Approved bookings with missing/invalid `suitability_score` are counted as evidence gaps but are not coerced to zero.

### Physical-location identity

`location_id` is not a physical-location identity. Current booking creation may create separate `Location` rows per user/booking, so the same real place can have multiple IDs.

A physical location is grouped using this locked rule:

```text
normalized description matches
AND geodesic distance <= 25 meters
```

Description normalization is Backend-owned and at minimum:

- trim leading/trailing whitespace;
- lowercase for comparison;
- collapse repeated internal whitespace.

If description is null/blank, grouping falls back to spatial proximity only (`<= 25 meters`).

The grouping implementation must be deterministic. Use a stable anchor-clustering procedure rather than input-order-dependent merging:

1. normalize every eligible row first;
2. sort rows by normalized description (blank last), latitude, longitude, then booking/location identifier as a final stable key;
3. walk the sorted rows and assign each row to the first existing cluster whose **anchor row** satisfies the description rule and is within `<= 25 m`;
4. if no cluster matches, create a new cluster and keep that first row as its immutable anchor;
5. do not move the anchor or merge clusters based on a later centroid.

This avoids a transitive proximity chain silently merging endpoints that are farther than 25 m and makes grouping independent of database return order.

### Representative location fields

Each group exposes one representative location for presentation. Backend owns the selection rule. Recommended deterministic rule:

1. prefer a non-empty normalized description;
2. choose the earliest eligible booking/location record among equivalent descriptions;
3. expose that record's display description and coordinates as the representative fields.

The response must expose a stable per-response `location_key`; Web FE must not construct physical identity from strings or coordinates.

### Aggregate score

For each grouped physical location:

```text
average_suitability_score = arithmetic mean of finite persisted suitability_score values
```

Round only for response/presentation according to the existing Backend score precision contract. Do not round individual samples before averaging.

### Aggregate label

`aggregate_label` is Backend-authored from `average_suitability_score` using the same canonical score-band function used by WFA scoring today.

Web FE must not derive or reinterpret score bands.

### Ranking and tie-break

Rank unique locations using:

```text
1. average_suitability_score DESC
2. approved_booking_count DESC
3. location_label ASC
```

`approved_booking_count` is the number of Approved bookings represented by the location group, including Approved rows whose suitability score is missing. `scored_booking_count` is the number that actually contributes to the average.

Only groups with at least one finite persisted score can appear in `ranking_preview.items`.

## Dashboard Period Contract

WFA recap follows the same active Dashboard range ownership already used by dashboard analytics:

```text
today
current_week
current_month
custom
```

For `custom`, Web FE sends the existing validated `from` / `to` range.

Proposed request shapes:

```text
GET /api/analysis/fuzzy-ahp/wfa/recap?period=current_month
```

```text
GET /api/analysis/fuzzy-ahp/wfa/recap
  ?period=custom
  &from=2026-08-01
  &to=2026-08-31
```

Backend remains authoritative for resolving exact date boundaries/timezone semantics. The Web FE reuses the existing dashboard range request builder rather than creating a second date-range source of truth.

## Proposed Backend Response Contract

```json
{
  "success": true,
  "data": {
    "type": "wfa",
    "status": "ready",
    "period": {
      "type": "current_month",
      "from": "2026-08-01",
      "to": "2026-08-31"
    },
    "ranking_preview": {
      "top_n": 5,
      "items": [
        {
          "rank": 1,
          "location_key": "backend-authored-key",
          "location_label": "Jl. Juanda No. 12",
          "latitude": -0.895123,
          "longitude": 119.872456,
          "average_suitability_score": 90.25,
          "aggregate_label": "Sangat Tinggi",
          "approved_booking_count": 4,
          "scored_booking_count": 4
        }
      ]
    },
    "evidence": {
      "approved_booking_count": 7,
      "scored_booking_count": 6,
      "excluded_unscored_count": 1,
      "unique_location_count": 3
    }
  }
}
```

No user name is a WFA ranking identity in this contract.

## Backend State Semantics

### `ready`

At least one Approved booking in range has finite persisted suitability evidence, producing at least one ranked physical location.

If some Approved bookings are unscored, the result remains `ready` and `evidence.excluded_unscored_count` communicates the gap.

### `empty`

There are no Approved WFA bookings in the active Dashboard period.

### `needs_data`

Approved WFA bookings exist in the active period, but none has a finite persisted `suitability_score` that can produce ranking evidence.

### Transport/error

Authentication, authorization, database, or unexpected server failures use normal API error semantics. A malformed successful payload is treated as a Web FE contract error and must not become a fake ready state.

## Web FE Request Ownership

The WFA tab no longer owns manual analysis context.

Remove the Management Dashboard controls for:

- Latitude;
- Longitude;
- Schedule date;
- Radius meters;
- `Run WFA Analysis`.

The WFA request is driven by:

```text
fahpFilterState.type = "wfa"
+
dashboardRangeState
```

No Live Map coordinate, current marker, attendance coordinate, or hidden global location becomes an input to the recap.

## Web FE State Ownership

`fahpFilterState.type` remains the single active-type owner.

On any type switch:

1. invalidate the previous type's active decision immediately;
2. set the selected type's panel to loading/non-ready;
3. request the selected type contract;
4. normalize only through that type's normalizer;
5. publish only a type-matching presentation model.

The following state is forbidden:

```text
active type = WFA
presentation decision type = Smart AC
```

There must be no frame where WFA navigation is active while Smart AC ranking remains visible.

## Strict WFA Recap Normalization

The WFA recap normalizer accepts only the Management recap shape. At minimum it validates:

- `data.type === "wfa"`;
- known `status` value;
- `ranking_preview.items` is an array when ranking data is expected;
- each ranked item has a location identity/label, positive rank, finite aggregate score, and finite booking counts;
- evidence counts are non-negative and internally coherent.

A Smart AC payload containing user names or criteria such as `history`, `checkin_pattern`, `context`, `transition` cannot be normalized as WFA.

Do not keep a permissive heuristic that guesses WFA merely because arbitrary fields like `methodology` or `candidates` are present. Contract selection is driven by the requested/active FAHP type.

## Presentation Design

### Navigation (#66)

The navigation remains exactly:

```text
Discipline | WFA | Smart AC
```

Status feedback (`Loading`, `Ready`, `Empty`, `Needs Data`, `Error`) remains visually and semantically outside the navigation control.

### WFA ready panel

WFA Management recap is not presented as a fresh pairwise-matrix execution. Therefore WFA recap does **not** show the generic `Consistency Check` or `Criteria Weights` cards.

Recommended content:

```text
WFA Location Ranking
Aug 1 â€“ Aug 31

1  Jl. Juanda No. 12
   Sangat Tinggi
   90.250
   4 approved bookings

2  Jl. Moh. Hatta
   Tinggi
   77.400
   6 approved bookings

Ranking uses 12 of 14 approved bookings with valid suitability evidence.
```

Discipline and Smart AC retain their current consistency/criteria/ranking presentation because those tabs represent their own FAHP analysis contracts.

### WFA empty / needs-data / error

`empty` message: no Approved WFA booking exists for the active period.

`needs_data` message: Approved WFA bookings exist, but no persisted suitability score is available for ranking.

`error` message: WFA location recap could not be loaded. The UI must not fall back to another FAHP type's data.

## Error Isolation

Changing FAHP type invalidates stale decision content before transport begins.

If WFA transport fails:

```text
active tab remains WFA
panel state = error
WFA-specific error message is shown
no Discipline/Smart AC criteria or user ranking is rendered
```

If WFA payload is malformed:

```text
strict WFA normalization fails
â†’ panel error/contract failure
â†’ no generic ranking fallback
```

Auth/session behavior continues through `authRequest`; there is no WFA-specific session mechanism.

## Cross-Repository Responsibility

### Backend changes required

Backend must add the Management recap endpoint/service. Expected ownership areas include:

- analysis route/controller wiring for `/analysis/fuzzy-ahp/wfa/recap`;
- dedicated recap service or focused analysis service boundary;
- Booking + Location query scoped to Approved status and dashboard range;
- deterministic physical-location grouping;
- aggregate score/label/ranking/evidence projection;
- validation and OpenAPI/contract documentation;
- focused tests.

The exact Backend file split follows current repository patterns and must be confirmed in its implementation plan. Business aggregation must not be placed in controller or DI wiring.

### Web FE changes required

Expected ownership areas include:

- `src/js/services/fuzzyAhpService.js` â€” WFA Management recap transport, separate from live WFA recommendation semantics;
- `src/js/features/dashboard/fahpFilterState.js` and dashboard range builder â€” preserve type/range ownership;
- `src/js/features/dashboard/dashboard.js` â€” type-safe orchestration and stale-result invalidation;
- `src/js/services/dashboard/wfaFahpSlice.js` â€” replace live-candidate normalization with strict Management recap normalization;
- `src/js/services/dashboardCockpitService.js` â€” build type-specific WFA recap panel model without generic consistency cards;
- `src/js/components/fuzzyAhpPanel.js` â€” type-aware view-state shape if needed;
- `src/partials/dashboard/dashboard-cockpit-grid.html` / `fuzzy-ahp-panel.html` â€” remove manual WFA context controls and render location ranking/evidence;
- focused tests and build verification.

The provisional `wfaFahpContext.js` / explicit-input implementation introduced under the superseded design should be removed if no longer referenced after the recap migration.

## Dependency Direction

```text
Web FE partial
â†’ Dashboard Alpine feature
â†’ FuzzyAhpService recap transport
â†’ authRequest
â†’ Backend recap endpoint
â†’ Backend recap service
â†’ Booking/Location repositories/models
```

Response direction:

```text
Backend recap contract
â†’ strict WFA recap slice
â†’ cockpit presentation model
â†’ partial
```

Web FE never aggregates booking rows, computes physical-location identity, averages scores, or derives aggregate labels.

## Testing Strategy

Implementation must use TDD at each contract boundary.

### Backend focused tests

Required evidence includes:

- only Approved bookings contribute to ranking;
- Pending and Rejected bookings are excluded;
- active period boundaries are honored;
- custom `from/to` range is validated and honored;
- null/invalid suitability scores are excluded from the average rather than coerced to zero;
- Approved unscored rows are reflected in evidence counts;
- normalized equal descriptions within 25 m group together;
- null/blank descriptions can group by <=25 m proximity;
- same description farther than 25 m remains separate;
- different non-empty descriptions are not merged merely because coordinates are close;
- location grouping result is deterministic independent of row order;
- average uses raw finite persisted scores before response rounding;
- aggregate label comes from canonical Backend score-band logic;
- sort tie-break is average score, booking count, then label;
- only top 5 groups are returned;
- `empty`, `needs_data`, and `ready` are distinct;
- authorization remains Admin/Management as appropriate for analysis dashboard endpoints;
- existing live `/analysis/fuzzy-ahp/wfa` contract remains unchanged.

### Web FE focused tests

Required evidence includes:

- WFA tab sends active Dashboard period/range to the recap endpoint;
- no WFA Management request requires latitude, longitude, schedule date, or radius;
- manual WFA context form and run button are absent;
- type switch clears stale decision content before loading the next type;
- a Smart AC payload cannot normalize/render as WFA;
- WFA ranking renders `location_label`, aggregate label, average score, and approved booking count;
- evidence note reports scored vs Approved booking counts truthfully;
- WFA recap does not render generic consistency/criteria cards;
- WFA empty/needs-data/error states never fall back to Discipline/Smart AC output;
- navigation remains exactly three options and status remains outside navigation;
- Discipline and Smart AC regressions stay green;
- `npm run build` passes.

## Acceptance Criteria

### GH-66

- Exactly three FAHP navigation options exist.
- Runtime state/status is not a navigation option.
- Active type has one owner.
- Loading/error/type switches do not expose stale data from a different FAHP type.

### GH-67 revised

- Management WFA Dashboard no longer asks for manual lat/lon/date/radius.
- Dashboard WFA uses a Backend-owned persisted-evidence recap contract.
- Ranking identity is physical WFA location, never user.
- Only Approved bookings in the active Dashboard period are eligible.
- Ranking score is the average finite persisted `suitability_score` per unique physical location.
- Physical identity uses normalized description + <=25 m proximity, with proximity-only fallback for blank description.
- Backend authors aggregate score labels and ranking order.
- Web FE performs no booking aggregation, score averaging, physical deduplication, or score-band calculation.
- WFA recap cannot display Smart AC criteria/user rankings by contract.
- Existing live WFA recommendation endpoint retains its current semantics.

## Delivery and Migration Notes

The existing local Web FE branch contains provisional implementation commits based on the now-retired explicit-input design. Do not layer the recap feature on top of those semantics without removing/replacing obsolete context/request paths.

A revised implementation plan must supersede the 2026-08-12 plan before further production-code work.

Because the new contract requires Backend support, implementation should be sequenced Backend contract first, then Web FE adoption. Runtime verification cannot be claimed until both sides are integrated against the same contract.

The Backend change must be tracked as its own Backend planning/implementation item before code work begins; it must not be hidden inside Web FE issue #67. GitHub #67 remains the Web FE adoption/UI correction boundary and depends on the Backend recap contract.

No push or PR is part of this design revision unless explicitly requested.
