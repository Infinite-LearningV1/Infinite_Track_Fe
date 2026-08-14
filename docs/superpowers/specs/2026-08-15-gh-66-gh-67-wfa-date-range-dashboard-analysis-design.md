# GH-66 + GH-67 WFA Date-Range Dashboard FAHP Revision Design

## Status

**Approved product/architecture direction, written revision for review â€” 2026-08-15.**

This document supersedes the WFA-specific semantics in:

- `docs/superpowers/specs/2026-08-13-gh-66-gh-67-wfa-management-recap-revision-design.md`
- `docs/superpowers/plans/2026-08-13-gh-66-gh-67-wfa-management-recap-revision.md`
- the WFA explicit-input design/plan dated 2026-08-12.

The GH-66 navigation decision remains unchanged: the Fuzzy AHP Decision Center has exactly three navigation options: `Discipline | WFA | Smart AC`. Runtime status is not a fourth tab.

Backend tracking authority for this revision is GitHub issue `Infinite-LearningV1/Infinit_Track_BE#142`.

## Why This Revision Exists

The previous design treated Management WFA as a separate historical recap endpoint. Brainstorming changed that decision for two reasons:

1. `/api/analysis/fuzzy-ahp/dashboard` already represents the Management FAHP surface and should be maximized rather than adding a redundant `/wfa/recap` route.
2. The academic requirement is not merely to show a ranking. The WFA panel should expose the FAHP methodology â€” criteria weights and consistency â€” while returning a ranking scoped to an explicit, reproducible date range.

The final semantic split is:

```text
GET /api/analysis/fuzzy-ahp/wfa
  -> live WFA recommendation
  -> explicit lat/lon/schedule_date[/radius]
  -> Geoapify + current facility evidence

GET /api/analysis/fuzzy-ahp/dashboard?type=wfa&from=...&to=...
  -> Management date-range WFA analysis
  -> persisted historical WFA evidence
  -> criteria weights + consistency + location ranking
```

The two endpoints must not be overloaded into one ambiguous contract.

## Locked Architecture

Reuse the existing Management Dashboard endpoint:

```http
GET /api/analysis/fuzzy-ahp/dashboard
  ?type=wfa
  &from=YYYY-MM-DD
  &to=YYYY-MM-DD
```

Do **not** add:

```http
GET /api/analysis/fuzzy-ahp/wfa/recap
```

Internal responsibility remains separated even though the HTTP endpoint is shared:

```text
analysis.routes.js
        â†“
query validation + Admin/Management role guard
        â†“
analysis.controller.js
        â†“
buildFuzzyAhpDashboardRecapPayload({ type, from, to })
        â†“
type dispatcher
        â”œâ”€â”€ Discipline analysis
        â”œâ”€â”€ WFA dashboard analysis
        â””â”€â”€ Smart AC analysis
                 â†“
          wfaDashboardAnalysis.service.js
                 â†“
          Booking + Location + scoring snapshot
                 â†“
          fuzzyAhpEngine.js
```

The controller remains a thin HTTP adapter. WFA date filtering, evidence validation, physical-location grouping, criterion aggregation, and ranking are service/domain responsibilities.

## Date Range Contract

### Canonical Backend request

WFA Management Dashboard uses one explicit date-window contract:

```text
from = YYYY-MM-DD
to   = YYYY-MM-DD
```

Both boundaries are required when `type=wfa`.

Example:

```http
GET /api/analysis/fuzzy-ahp/dashboard
  ?type=wfa
  &from=2026-08-01
  &to=2026-08-15
```

Rules:

- `from` and `to` are inclusive.
- Business date semantics use Asia/Jakarta.
- Scope WFA records by `booking.schedule_date`, not `created_at`.
- `from <= to`.
- Maximum inclusive window is 31 days.
- Reuse the repository historical-date validation primitives where practical; do not create a second incompatible date policy.
- Discipline and Smart AC retain their existing dashboard behavior unless separately changed by another issue.

### UI presets are presentation convenience only

Web FE may show:

```text
Today | 7 Days | Current Month | Custom
```

Those presets must resolve to concrete `from/to` before the WFA request is sent. Backend does not need a second WFA `period` enum.

This makes academic test cases reproducible: the same explicit range selects the same historical rows, independent of when the request is replayed.

## FAHP Semantics

### Period changes alternatives/evidence, not pairwise judgments

The WFA pairwise matrix remains Backend-configured. Changing `from/to` does not alter the pairwise judgments simply because time changed.

Conceptually:

```text
fixed canonical WFA pairwise matrix
        â†“
criteria weights + CR
        â†“

from/to
        â†“
selected Approved WFA booking evidence
        â†“
physical location alternatives for that range
        â†“
aggregated criterion values per location
        â†“
FAHP score with canonical weights
        â†“
ranked locations for that range
```

Therefore:

- criteria weights normally stay constant across ranges for the same methodology version;
- consistency ratio normally stays constant across ranges for the same methodology version;
- ranking can change because the selected alternatives and criterion evidence change.

## Academic Methodology Output

The WFA Dashboard must expose:

```text
Criteria Weights
- Tipe Lokasi     -> location_type
- Faktor Jarak    -> distance_factor
- Skor Fasilitas  -> facility_score

Consistency
- CR
- threshold = 0.10
- is_consistent
- weighting_method
- methodology_version
```

Web FE must render Backend-authored values. It must never compute or hard-code FAHP weights or CR.

A `facility_score = 0.000` weight must not be hard-coded from an old UI snapshot. The current canonical engine is authoritative, including its fallback behavior when Chang Extent would collapse a criterion to zero.

## Current Persistence Gap

Repository audit on 2026-08-15 shows that `Booking` currently persists:

```text
suitability_score
suitability_label
radius_snapshot
```

It does **not** persist the exact criterion inputs used to produce the final score:

```text
location_type_score
distance_factor_score
facility_score
```

The live WFA pipeline computes these values during recommendation/scoring, but the booking row currently keeps only the final result.

This creates an important academic boundary:

> A historical final score alone is not sufficient evidence to claim that the Dashboard has freshly recalculated FAHP criteria for that historical booking.

The implementation must not fabricate or reverse-engineer missing historical criterion inputs from labels, descriptions, or final score.

## Reproducible WFA Scoring Snapshot

To support academically defensible date-range analysis, future booking scoring must persist an immutable scoring-evidence snapshot together with the booking.

### Storage decision

Add a nullable JSON field to `bookings`:

```text
wfa_scoring_snapshot
```

A JSON snapshot is chosen because it is immutable audit evidence, is read as a whole for a bounded <=31-day analysis window, and allows methodology metadata to evolve without repeatedly widening the relational booking schema.

It is not a replacement for normalized Booking/Location business fields.

### Snapshot shape

Canonical conceptual shape:

```json
{
  "schema_version": 1,
  "methodology_version": "wfa_fahp_v1",
  "captured_at": "2026-08-15T00:00:00.000Z",
  "criteria": {
    "location_type_score": 80.0,
    "distance_factor_score": 72.5,
    "facility_score": 90.0
  },
  "methodology": {
    "weights": {
      "location_type": 0.0,
      "distance_factor": 0.0,
      "facility_score": 0.0
    },
    "consistency_ratio": 0.0,
    "weighting_method": "backend-authored"
  },
  "evidence": {
    "place_id": "provider-place-id",
    "location_type": "cafe",
    "distance_meters": 650.4,
    "facility_confidence": 80.0
  },
  "result": {
    "score": 84.25,
    "label": "Sangat Tinggi"
  }
}
```

The numeric zeros in this example are structural placeholders only. Runtime values come from the canonical engine.

### Snapshot rules

- Snapshot is created by Backend in the same canonical scoring path used by booking suitability.
- Snapshot is persisted in the same booking transaction as `suitability_score` and `suitability_label`.
- Client input cannot author or override the snapshot.
- Snapshot criterion values must be finite and within the canonical score domain.
- `methodology_version` must identify the WFA scoring configuration used for the snapshot.
- Snapshot result must correspond to the persisted final suitability result.
- Live `/fuzzy-ahp/wfa` response does not need to expose private/internal snapshot storage details; preserving that endpoint's public contract is preferred.

## Methodology Versioning

Add a Backend-owned WFA methodology version constant next to the WFA pairwise configuration.

Example semantic identifier:

```text
wfa_fahp_v1
```

The exact constant name is implementation detail, but one canonical value must be returned by `fuzzyAhpEngine.getWfaAhpWeights()` and stored in every new scoring snapshot.

Dashboard date-range analysis only combines criterion snapshots that are compatible with the methodology being reported.

If a selected range contains mixed or missing methodology evidence:

- compatible snapshots may still produce a `ready` result;
- incompatible/missing snapshots are excluded from the FAHP aggregation;
- evidence counters must reveal the exclusions;
- if no compatible snapshot remains, status is `needs_data`.

Do not silently mix different weight systems into one academic ranking.

## Eligible WFA Records

A row is in the initial Management WFA population when:

- booking status is Approved (`status = 1`);
- `booking.schedule_date` is within inclusive `from/to`;
- booking has an associated WFA location.

Pending and Rejected bookings are excluded at the persistence query boundary.

For FAHP recalculation, an Approved row is analyzable only when its `wfa_scoring_snapshot` is structurally valid and compatible with the current methodology version.

## Physical Location Identity

`location_id` is not guaranteed to identify one globally unique physical place because booking flows may create separate Location rows for different users/bookings.

Use deterministic physical grouping:

```text
normalized non-blank description equal
AND anchor distance <= 25 meters
```

Description normalization:

- trim;
- lowercase for comparison;
- collapse internal whitespace.

Blank description fallback:

```text
either description blank
-> proximity <= 25 meters may group
```

Deterministic anchor algorithm:

1. normalize eligible rows;
2. stable-sort by normalized description (blank last), latitude, longitude, then booking/location id;
3. assign each row to the first existing cluster whose immutable anchor satisfies description compatibility and `<=25m`;
4. otherwise create a new cluster with that row as anchor;
5. never move an anchor or perform transitive centroid merging.

Reuse the existing Backend distance utility.

## Date-Range Criterion Aggregation

For each physical location cluster, use only analyzable snapshots.

Compute arithmetic means of raw snapshot criterion scores before response rounding:

```text
avg_location_type_score
avg_distance_factor_score
avg_facility_score
```

Then run the canonical WFA scoring function once using that averaged criterion vector and the canonical weights for the compatible methodology version.

This is preferable to pretending the final historical `suitability_score` itself is a criterion.

Because the canonical WFA final score is a weighted combination of criteria, this preserves a clear mathematical relationship between historical evidence and the range-level location score while making the criterion contributions inspectable.

## Ranking

For each physical location with at least one analyzable snapshot, return:

```text
rank
location_key
location_label
latitude
longitude
score
label
criteria_summary.location_type_score
criteria_summary.distance_factor_score
criteria_summary.facility_score
approved_booking_count
analyzable_booking_count
```

Sort:

```text
1. score DESC
2. analyzable_booking_count DESC
3. approved_booking_count DESC
4. location_label ASC
```

Return Top 5 in `ranking_preview`.

No user/person is a WFA ranking entity.

## Evidence Counters

Return truthful evidence metadata:

```text
approved_booking_count
analyzable_booking_count
excluded_missing_snapshot_count
excluded_incompatible_snapshot_count
unique_location_count
ranked_location_count
```

`approved_booking_count` counts the full Approved WFA population in range.

`analyzable_booking_count` counts rows whose valid compatible criterion snapshot contributes to FAHP aggregation.

This allows the UI to state, for example:

> Ranking uses 12 of 14 Approved bookings with reproducible FAHP evidence.

## Backend State Semantics

### `ready`

At least one physical location has at least one valid compatible scoring snapshot and can be ranked.

Partial evidence is still `ready`; exclusions are visible in evidence counters.

### `empty`

No Approved WFA booking exists in the requested date range.

### `needs_data`

Approved WFA booking(s) exist, but no physical location has sufficient valid compatible criterion evidence to produce an academically valid ranking.

### `error`

Authentication, authorization, validation, database, or unexpected runtime failures use normal HTTP error semantics. Backend does not serialize an error as `ready`/`empty`.

## Proposed Dashboard Response

```json
{
  "success": true,
  "data": {
    "type": "wfa",
    "type_label": "WFA",
    "status": "ready",
    "timezone": "Asia/Jakarta",
    "requested_window": {
      "from": "2026-08-01",
      "to": "2026-08-15"
    },
    "criteria_weights": [
      {
        "key": "location_type",
        "display_label": "Tipe Lokasi",
        "value": 0.0
      },
      {
        "key": "distance_factor",
        "display_label": "Faktor Jarak",
        "value": 0.0
      },
      {
        "key": "facility_score",
        "display_label": "Skor Fasilitas",
        "value": 0.0
      }
    ],
    "consistency": {
      "CR": 0.0,
      "threshold": 0.1,
      "is_consistent": true,
      "summary_label": "Konsistensi dapat diterima"
    },
    "methodology": {
      "version": "wfa_fahp_v1",
      "weighting_method": "backend-authored"
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
          "score": 90.25,
          "label": "Sangat Tinggi",
          "criteria_summary": {
            "location_type_score": 92.0,
            "distance_factor_score": 80.0,
            "facility_score": 88.0
          },
          "approved_booking_count": 4,
          "analyzable_booking_count": 4
        }
      ]
    },
    "evidence": {
      "approved_booking_count": 14,
      "analyzable_booking_count": 12,
      "excluded_missing_snapshot_count": 2,
      "excluded_incompatible_snapshot_count": 0,
      "unique_location_count": 5,
      "ranked_location_count": 4
    }
  }
}
```

Again, numeric weight/CR values are examples only.

## Existing Endpoint Compatibility

### Live WFA

Preserve:

```http
GET /api/analysis/fuzzy-ahp/wfa
  ?lat=...
  &lon=...
  &schedule_date=...
  [&radius_meters=...]
```

It remains the live recommendation/analysis contract.

### Generic combined analysis

The older generic `/api/analysis/fuzzy-ahp?type=wfa` path may remain retired with `410 WFA_ANALYSIS_MOVED`. This revision only restores WFA semantics on the dedicated **dashboard** route.

### Discipline / Smart AC dashboard

No WFA change may regress their current route behavior or response semantics.

## Web FE Request Ownership

Management WFA removes all manual live-analysis context:

- Latitude input: removed.
- Longitude input: removed.
- Schedule date input: removed.
- Radius input: removed.
- `Run WFA Analysis`: removed.

WFA request ownership becomes:

```text
fahpFilterState.type = "wfa"
+
dashboardRangeState
        â†“
resolve explicit from/to
        â†“
getDashboardFahpAnalysis({ type: "wfa", from, to })
```

No client-side FAHP math, booking aggregation, physical-location grouping, or score reconstruction is allowed.

## Web FE Type Isolation

When the user selects WFA:

1. set active type to WFA;
2. invalidate previous Discipline/Smart AC decision immediately;
3. resolve concrete WFA `from/to` from the active Dashboard range;
4. show loading/non-ready state;
5. request `/analysis/fuzzy-ahp/dashboard?type=wfa&from&to`;
6. normalize through the strict WFA dashboard contract;
7. render only a WFA location analysis model.

A payload with `type=smart_ac`, user-ranking fields, or Smart AC criteria must fail closed as a contract error.

## WFA Presentation

The academic WFA panel **does show** criteria weights and consistency because the selected range now has a defined FAHP analysis contract backed by reproducible criterion snapshots.

Recommended hierarchy:

```text
WFA Analysis
Aug 1 â€“ Aug 15, 2026

Criteria Weights
Tipe Lokasi       0.xxx
Faktor Jarak      0.xxx
Skor Fasilitas    0.xxx

Consistency
CR                0.xxx
Threshold         <= 0.10
Status            Konsisten

Top WFA Locations
1. Cafe A         88.43
   Tipe 90.0 | Jarak 75.0 | Fasilitas 86.0
   4 approved | 4 analyzable

2. Library B      82.15
   ...

Evidence
12 of 14 Approved bookings have reproducible FAHP evidence.
```

The criteria block explains methodology. The ranking block explains the range-specific alternatives/results. The UI must not claim the weights themselves changed because the date range changed.

## Web FE Preset Resolution

The existing Dashboard can retain its user-friendly range presets. Add one pure resolver that converts the active range state to explicit WFA boundaries.

Expected semantics:

```text
today
-> from=today, to=today

current_week
-> rolling 7 calendar dates ending today (today-6 through today)

current_month
-> first day of current month through today

custom
-> existing validated from/to
```

Use the same Dashboard date semantics already shown to the user. Do not create a hidden independent WFA calendar interpretation.

## Error and Legacy Evidence Handling

Legacy Approved bookings without `wfa_scoring_snapshot` are not silently discarded from evidence totals. They count as Approved evidence but as `excluded_missing_snapshot_count`.

If a range consists entirely of legacy rows:

```text
status = needs_data
ranking_preview.items = []
```

The UI should explain that the range contains WFA bookings but lacks reproducible criterion snapshots required for date-range FAHP analysis.

Do not fall back to averaging final `suitability_score` while labeling that output as newly recalculated FAHP.

## Cross-Repository Responsibility

### Backend â€” GitHub #142

Backend owns:

- WFA methodology version;
- immutable booking scoring snapshot persistence;
- type-aware `/fuzzy-ahp/dashboard` validation;
- explicit `from/to` range validation;
- Approved-only historical query;
- physical-location grouping;
- snapshot compatibility validation;
- criterion aggregation;
- canonical FAHP scoring/weights/CR;
- ranking/evidence/state response;
- OpenAPI and Backend tests.

### Web FE â€” GH-66 / GH-67

Web FE owns:

- exactly three FAHP navigation tabs;
- Dashboard preset UX;
- resolving presets to concrete `from/to` for WFA;
- reusing `getDashboardFahpAnalysis` for WFA;
- strict WFA response normalization;
- stale-data invalidation on type/range changes;
- academic presentation of weights/CR/ranking/evidence;
- truthful empty/needs-data/error presentation.

## Testing Strategy

### Backend

TDD must prove:

- scoring snapshot is Server-authored and persisted atomically with a booking;
- snapshot captures all three criterion scores, methodology version, weights/CR metadata, and final result;
- live WFA public contract remains compatible;
- WFA dashboard requires explicit valid `from/to` and max 31 days;
- only Approved bookings in `schedule_date` range are loaded;
- physical grouping is deterministic and <=25m anchor-based;
- legacy missing snapshots are counted but not fabricated;
- incompatible methodology snapshots are excluded;
- criterion averages use finite compatible samples only;
- range-level score is computed by canonical WFA engine from averaged criteria;
- criteria weights and CR come from canonical Backend engine;
- ranking is location-only and Top 5;
- `ready`, `empty`, and `needs_data` are distinct;
- `/fuzzy-ahp/dashboard?type=wfa` no longer returns `WFA_ANALYSIS_MOVED` when valid from/to are provided;
- `/fuzzy-ahp?type=wfa` and live `/fuzzy-ahp/wfa` retain their intended semantics;
- Discipline and Smart AC regressions stay green;
- OpenAPI/runtime drift checks pass.

### Web FE

TDD must prove:

- WFA is accepted by the existing dashboard FAHP transport;
- WFA dashboard transport sends `type`, `from`, `to` only;
- preset ranges resolve to deterministic concrete boundaries;
- no manual lat/lon/date/radius/run-analysis controls remain;
- WFA renders Backend criteria weights and consistency;
- WFA renders location ranking, criterion summary, and evidence coverage;
- Smart AC user ranking cannot render under active WFA;
- type/range change clears stale decision before request settles;
- `empty`, `needs_data`, and `error` never reuse stale ranking;
- navigation remains exactly three options;
- Discipline/Smart AC focused regressions and Webpack build pass.

## Acceptance Criteria

### GH-66

- Exactly `Discipline | WFA | Smart AC` are navigation options.
- Runtime status is outside navigation.
- Active type is the only presentation contract selector.
- No stale cross-type decision is visible during loading/error.

### GH-67 + Backend #142

- No new `/wfa/recap` endpoint exists.
- WFA Management analysis reuses `/api/analysis/fuzzy-ahp/dashboard`.
- WFA request uses explicit inclusive `from/to`, maximum 31 days.
- Date range scopes `booking.schedule_date`.
- Live `/api/analysis/fuzzy-ahp/wfa` remains live recommendation only.
- WFA pairwise weights/CR are Backend-owned and visible for academic explainability.
- Ranking entities are physical locations, never users.
- A date range can change alternatives/ranking without implicitly changing pairwise weights.
- Historical criterion evidence is never fabricated from final score.
- New booking scoring persists reproducible criterion/methodology snapshot evidence.
- Legacy rows without compatible snapshots produce evidence gaps and may lead to `needs_data`.
- Backend owns grouping, criterion aggregation, FAHP scoring, ranking, and semantic states.
- Web FE only resolves dates, requests, validates response type, and renders.

## Delivery Notes

The current Web FE branch contains provisional explicit-input WFA implementation from the retired 2026-08-12 design. Replace those semantics with bounded follow-up commits; do not rewrite history.

The 2026-08-13 recap-only design is also superseded because it did not expose academic FAHP methodology and proposed a redundant `/wfa/recap` route.

Implementation order is Backend evidence/contract first, then Web FE adoption. No integrated runtime success claim is valid until both repositories implement the same contract.

No push or PR is part of this planning update unless explicitly requested.
