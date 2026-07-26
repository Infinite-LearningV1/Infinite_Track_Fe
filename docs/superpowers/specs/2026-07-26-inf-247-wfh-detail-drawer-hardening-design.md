# INF-247 — Harden Management Pengguna WFH detail drawer

- Linear: [INF-247](https://linear.app/infinite-track-palu/issue/INF-247/web-fe-harden-management-pengguna-wfh-detail-drawer-map-lifecycle-and)
- Branch: `fix/inf-247-wfh-detail-drawer-hardening`
- Base: `develop` @ `f80141e`
- Status at authoring: Linear `Todo`
- Parent: INF-244 · Project: Web FE Foundation
- Follows locked design: [INF-248](https://linear.app/infinite-track-palu/issue/INF-248/web-fedesign-lock-management-pengguna-information-architecture-and) (`Done`)

## Goal

Make the WFH location surface on Management Pengguna truthful, safe, accessible, and free of
stale Leaflet instances across open/close/reopen, per the locked INF-248 drawer design.

## Fakta (repo-verified)

### Close paths bypass the canonical cleanup — confirmed

`closeMapDetailModal()` in `src/js/index.js:182-198` does the right thing: hides the surface,
calls `window.mapDetailModal.destroyMap()`, resets selected location.

All four close paths in `src/partials/modal/user-map-modal.html` bypass it and only flip a
boolean:

| Line | Path                | Handler                        |
| ---- | ------------------- | ------------------------------ |
| 13   | click outside       | `isMapDetailModalOpen = false` |
| 18   | backdrop            | `isMapDetailModalOpen = false` |
| 33   | header close button | `isMapDetailModalOpen = false` |
| 225  | footer button       | `isMapDetailModalOpen = false` |

So the Leaflet instance is never destroyed on any user-driven close. This is the root cause of
the stale-instance/reopen defect: `L.map()` marks its container with `_leaflet_id`, and a
second `L.map()` on the same container throws "Map container is already initialized".

`initializeMap()` calls `this.destroyMap()` defensively at
`src/js/components/modal/mapDetailModal.js:33`, which masks the bug in the common path but
leaves the map, marker, circle, popup, and selected-user state alive for the entire time the
drawer is closed.

### Accessibility — confirmed absent

`user-map-modal.html` contains zero `role=`, zero `aria-*`, and zero `keydown` bindings. There
is no dialog semantics, no accessible name, no Escape close, no initial focus, no focus
containment, no focus return, and the icon-only controls are unlabelled.

### Input safety — confirmed

`src/js/components/modal/mapDetailModal.js` interpolates backend text straight into popup HTML
passed to `bindPopup()`:

- line 86 — `${locationData.fullName}`
- line 104 — `${locationData.description}`

`radius` at line 95 is already guarded by `Number.isFinite`, so it is not an injection vector.

### Truthfulness — confirmed

`src/partials/table/table-user.html` exposes a `Koordinat` column (header line 161, cell
lines 260-290) with a generic `View` button, although the data is a configured WFH
target/geofence, not live employee location.

### Finite-number contract — partly already built, and currently RED

Contrary to the issue description, `src/js/utils/mapLocationTruth.js` already exists and
exports `coerceFiniteMapNumber`, `firstFiniteMapNumber`, and `hasFiniteCoordinates`.
`mapDetailModal.js:27` already uses `hasFiniteCoordinates`.

`tests/map-detail-modal-truthfulness.test.js` already exists and **is failing on `develop`**.
Its third case, _"global map detail modal state uses finite-number helpers instead of truthy
coordinate checks"_, requires `src/js/index.js` to use `firstFiniteMapNumber(` and
`hasFiniteCoordinates(this.selectedUserLocation)`, and to contain none of the truthy `||`
coordinate chains. `index.js:152-159` still uses those chains.

The test for this acceptance criterion was written but the implementation never landed. The
RED state already exists, so this part of the work is completing an existing TDD cycle rather
than starting one.

### Shared-state blast radius — confirmed

`mapDetailModalState` (`src/js/index.js:131`) is shared global Alpine state. The window shim at
`index.js:380` resolves it via `document.querySelector('[x-data*="mapDetailModalState"]')`.
Consumers:

| Consumer       | Location                                                                         |
| -------------- | -------------------------------------------------------------------------------- |
| user list      | `src/js/features/userManagement/userListSimple.js:254,273`                       |
| dashboard      | `src/js/features/dashboard/dashboard.js:2168`                                    |
| attendance log | `src/js/features/attendance/attendanceLog.js:267`                                |
| WFA booking    | `src/js/features/wfaBooking/bookingList.js:105,393,430` (divergent private copy) |

`management-user.html` includes `user-map-modal.html` (line 68) and spreads
`mapDetailModalState()` (line 22); `index.html` and `management-attendance.html` use the
separate `map-detail-modal.html` partial. Both partials declare `id="mapDetailModal"`, but no
single page includes both, so there is no live duplicate-id collision today.

## Decisions taken during design

1. **Table scope is surgical.** Replace only the `Koordinat` column. The remaining seven
   columns of the INF-248 contract (checkbox, `Organisasi`, `Dibuat`, filter popover, ellipsis
   menu) belong to INF-249 and depend on backend fields not yet delivered (INF-251, INF-246).
2. **Fix the shared coordinate contract, add a dedicated drawer.** The finite-number fix lands
   in the shared `mapDetailModalState` — it is small, turns the existing RED test GREEN, and is
   strictly more correct for dashboard and attendance too (latitude `0` stops being silently
   discarded). The drawer lifecycle is new and scoped to Management Pengguna, so dashboard and
   attendance surfaces keep their current structure.
3. **Lifecycle is extracted into an injectable module** so the reopen-×10 guarantee can be
   asserted by `node --test` with a fake map adapter, no jsdom and no new dependency. This
   matches the repository's existing test conventions.
4. **New partial, old one deleted.** The drawer holds identity, access, organisation and WFH
   data, so `user-map-modal.html` is replaced by `user-detail-drawer.html`. Leaving the old
   file in place would be dead code; keeping the old name would misdescribe the surface. The
   file list in `tests/map-detail-modal-truthfulness.test.js` must be updated in the same
   commit.

## Architecture

```text
src/partials/table/table-user.html
  Koordinat column  →  "Lokasi WFH" status text (Tersedia / Belum diatur)
  no raw lat/lng in the table; column count stays 8 so colspan="8" (line 178) is unchanged
  Aksi column gains a Detail icon button with an accessible label
        │
        ▼
src/js/features/userManagement/userDetailDrawerLifecycle.js          [NEW]
  createUserDetailDrawerLifecycle({ mapAdapter })
    → { isOpen, selectedUser, open(user), close() }
  normalizes coordinates via mapLocationTruth helpers
  invariants: open() self-closes first; close() is idempotent;
              map initialized only when hasFiniteCoordinates
  mapAdapter is INJECTED → unit-testable with no DOM
        │
        ├── production adapter wraps window.mapDetailModal
        └── test adapter records initialize/destroy calls
        ▼
src/partials/modal/user-detail-drawer.html                            [NEW]
  replaces user-map-modal.html
  role="dialog", aria-modal, aria-labelledby, aria-describedby
  @keydown.escape → canonical close; all four close paths → canonical close
  identity / access / organisasi (position) / WFH sections
  lat, lng, radius, description and map render only here, only when valid
  "Lokasi WFH belum diatur" when absent, and Leaflet is not initialized
  wording is "Lokasi WFH" / "Area WFH" only — never live/current location

src/js/utils/focusTrap.js                                             [NEW]
  pure getFocusableEdges(elements) + thin createFocusTrap(container)
  stores and restores the previously focused element

src/js/utils/escapeHtml.js                                            [NEW]
  used at mapDetailModal.js:86,104 for fullName and description
```

Two shared-module edits, both strictly-more-correct for all consumers:

1. `src/js/index.js:152-159` — truthy `||` chains → `firstFiniteMapNumber(...)`, and the
   `$nextTick` guard → `hasFiniteCoordinates(...)`. Dictated line-for-line by the existing
   failing test.
2. `src/js/components/modal/mapDetailModal.js:86,104` — wrap `fullName` and `description` in
   `escapeHtml()`.

Neither edit changes layout or lifecycle for the dashboard or attendance surfaces.

Division/program is **not** rendered in the drawer. `userListSimple.js:103-120` maps no
division field and the backend does not yet expose one (INF-251). Rendering a placeholder
would invent data, so the field is omitted until the backend contract lands.

## Test strategy

All tests use `node --test`, matching the repository's existing style.

| Test                                                     | Proves                                                                                                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/map-detail-modal-truthfulness.test.js` (existing) | flips RED → GREEN; also update its partial file list for the rename                                                                                                                                                 |
| `tests/user-detail-drawer-lifecycle.test.js` (new)       | reopen ×10 with a fake adapter: initialize/destroy counts stay balanced, never two initializes without an intervening destroy, `close()` idempotent, no map init when coordinates are absent or non-finite          |
| `tests/user-detail-drawer-template.test.js` (new)        | all four close paths route to the canonical handler; dialog semantics, accessible name, Escape binding and control labels present; table exposes no raw lat/lng; wording contains no live/current-location phrasing |
| `tests/escape-html.test.js` (new)                        | escaping of `<`, `>`, `&`, `"`, `'`; popup source calls `escapeHtml` on both untrusted fields                                                                                                                       |
| `tests/focus-trap.test.js` (new)                         | `getFocusableEdges` first/last resolution, empty and single-element cases                                                                                                                                           |

Reopen ×10 is additionally confirmed in the browser preview against real Leaflet, with console
output captured as evidence. The unit test proves the lifecycle contract; only the browser
proves real Leaflet agrees.

## Verification plan

Baseline on `develop` @ `f80141e` is **183 tests / 162 pass / 21 fail**. The suite is not green
beforehand, so absolute green is not a valid gate. Gate on delta.

1. `node --test "tests/**/*.test.js"` — expect failures to drop **21 → 20**, the map-detail
   truthfulness test to pass in full, all new tests to pass, and zero new failure names.
   (`node --test tests/` fails on Node 24 — the bare directory resolves as a module path. The
   glob form is required.)
2. `npm run lint`.
3. `npm run build`.
4. Browser preview on `management-user.html`:
   - open → close → reopen ×10, console clean, no "already initialized" error;
   - a user with no WFH location shows `Lokasi WFH belum diatur` and initializes no map;
   - keyboard-only pass: Tab reaches the detail control, Escape closes, focus returns to the
     invoking control, focus stays contained while open;
   - narrow viewport: drawer overlays rather than shrinking the table.

The 20 unrelated dashboard/FAHP/export/cockpit failures are pre-existing, out of scope, and to
be reported separately.

## Risks

High-risk areas touched, per `CLAUDE.md`:

- `src/js/index.js` — shared map state consumed by dashboard and attendance log.
- map/location visualization; shared UI logic.

Mitigations and residual risk:

- The shared edits are confined to coordinate normalization and popup escaping. No layout,
  lifecycle, or control change reaches the dashboard or attendance surfaces.
- Behavior change to be aware of: coordinates of exactly `0` were previously discarded by the
  truthy chains and will now render. That is the intended correction, and it affects dashboard
  and attendance as well as the user page.
- Deleting `user-map-modal.html` breaks `tests/map-detail-modal-truthfulness.test.js` until its
  file list is updated in the same commit.
- `wfaBooking/bookingList.js` keeps its own divergent modal state. It is deliberately untouched
  and remains a known duplication, to be addressed with INF-125.

## Docs / ADR

`DOCS/ADR UPDATE REQUIRED`.

The work asserts that the Web FE presents a configured WFH target/geofence and never live
employee location. That is a source-of-truth and reporting-responsibility statement across
clients, which is ADR territory:

- `docs/adr/ADR-001-webfe-source-of-truth-and-responsibility-boundary.md` — WFH configuration
  vs live tracking authority.
- `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md` — which surface owns
  location detail.

## Out of scope

- The other seven INF-248 columns, filter popover, ellipsis menu, checkbox column (INF-249).
- Replacing Leaflet/OpenStreetMap; full-page or multi-user map; live tracking; export.
- Backend WFH contract changes (INF-251, INF-246).
- `wfaBooking` modal-state consolidation (INF-125).
- The 20 pre-existing unrelated test failures.

## Definition of done

- [ ] `Lokasi WFH` column shows status only; no raw coordinates in the table.
- [ ] Detail control opens the right-side drawer; coordinates and map live only there.
- [ ] All four close paths, Escape, and programmatic close use one canonical cleanup handler.
- [ ] Open → close → reopen ×10 with no stale Leaflet instance and no console error, proven by
      unit test and browser evidence.
- [ ] One finite-number normalization contract; existing truthfulness test fully GREEN.
- [ ] Missing coordinates show `Lokasi WFH belum diatur` and initialize no map.
- [ ] Popup text is escaped, not raw-interpolated.
- [ ] Drawer has dialog semantics, accessible name, initial focus, containment, Escape close,
      focus return; icon-only controls labelled.
- [ ] UI never presents configured WFH location as live tracking.
- [ ] Radius rendered only when valid.
- [ ] Failures drop 21 → 20 with zero new failure names.
- [ ] `npm run lint` and `npm run build` pass.
- [ ] ADR-001 / ADR-004 update landed or explicitly deferred with a reason.
- [ ] PR opened into `develop`.
- [ ] Linear INF-247 moved to `Done` only once the runtime accessibility and reopen evidence is
      attached — merge alone is not sufficient.
