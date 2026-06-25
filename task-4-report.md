# Task 4 Implementation Report

## Tujuan task
Isolate the dashboard live map into its own today-locations slice so the map path reads only `/attendance/today-locations` data and no longer relies on analytics snapshot fallback markers.

## Fakta
- Brief-required files were implemented/touched:
  - `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/services/dashboard/liveMapSlice.js`
  - `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/services/dashboardCockpitService.js`
  - `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/features/dashboard/dashboard.js`
  - `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/tests/dashboard/liveMapSlice.test.js`
- Added the required failing test first, then ran it with Node’s test runner.
- The initial red run failed because `src/js/services/dashboard/liveMapSlice.js` did not exist yet (`ERR_MODULE_NOT_FOUND`), matching the brief.
- Implemented `buildLiveMapViewModel(response)` and `createLiveMapSliceState(response, request)` in the new slice module.
- Updated cockpit live-map wiring so the hero/live-map path builds from the live-map slice authority (`attendance.today-locations`) instead of analytics snapshot marker fallback data.
- Updated dashboard raw API state to store a dedicated today-locations slice object instead of the unstructured response blob.
- Preserved accepted today-locations response shapes by supporting:
  - raw array
  - `{ data: [...] }`
  - `{ data: { data: [...] } }`
- Ran targeted verification after implementation across:
  - `tests/dashboard/liveMapSlice.test.js`
  - `src/js/services/dashboardCockpitService.test.js`
  - `src/js/features/dashboard/dashboardCockpitState.test.js`
- Fresh verification result: 63 tests passed, 0 failed.
- Created commit: `5d59949` (`feat: isolate dashboard live map slice`).

## Asumsi
- Existing cockpit hero/live-map behavior is the intended dashboard map render path referenced by the brief.
- Keeping legacy analytics map-context code in place for non-live-map paths is acceptable in this task because the brief only required isolating the dashboard live map path.

## Perlu verifikasi
- Optional browser/runtime verification can still be done in the actual dashboard page to visually confirm the live map renders only today-locations markers and stays empty/truthful when that feed is empty or missing.

## Risiko perubahan
- High-risk area touched: dashboard summary and analytics rendering, map/location visualization, and service/API integration consistency.
- Main regression risk was narrowing accepted today-locations payload shapes; this was addressed by preserving the previously supported normalized shapes inside the new live-map slice path.
- Raw export/debug consumers that inspect `rawApiData.todayLocations` now receive a structured slice object rather than the raw backend response. This is a deliberate owner-boundary cleanup but could affect any hidden consumers if they existed outside tested paths.

## Plan implementasi
1. Read Task 4 brief and inspect current dashboard live-map/cockpit wiring.
2. Add the required failing targeted test for the new live map slice.
3. Run the red test and confirm failure due to missing `liveMapSlice.js`.
4. Implement the minimal live map slice and wire cockpit/dashboard state to use it.
5. Run targeted tests for the slice plus related cockpit/dashboard surfaces.
6. Review the changed files, fix the normalization issue found in review, rerun verification, commit, and write this report.

## File/area terdampak
- `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/services/dashboard/liveMapSlice.js`
- `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/services/dashboardCockpitService.js`
- `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/features/dashboard/dashboard.js`
- `E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/tests/dashboard/liveMapSlice.test.js`

## Verification plan
Executed fresh targeted verification with Node test runner:
- `node --test "E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/tests/dashboard/liveMapSlice.test.js" "E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/services/dashboardCockpitService.test.js" "E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/features/dashboard/dashboardCockpitState.test.js"`
- Result: `63` tests passed, `0` failed.
- Note: Node emitted existing `MODULE_TYPELESS_PACKAGE_JSON` warnings because the repo package is not marked as ESM. Verification still passed.

## Docs / ADR update note
DOCS/ADR UPDATE REQUIRED
- This task changes dashboard/reporting responsibility boundaries by making the live map explicitly owned by the today-locations slice and removing cross-owner fallback behavior from the dashboard live-map path.

## Review / PR / release / build notes
- A focused code review pass found one correctness issue: the first implementation bypassed the existing today-locations normalization contract. That was corrected before final verification by passing normalized data into the hero path and broadening the live-map slice to accept the already-supported response shapes.
- No build was run because the task instructions emphasized the repo’s targeted Node test pattern and keeping scope focused to this task.
- Commit produced for this task only: `5d59949`.

## Fix-wave notes
- Review finding 1 fixed: `src/js/services/dashboardCockpitService.js` now treats the live-map path as a dedicated slice input and reads it through `buildLiveMapViewModel(todayLocations)` instead of rebuilding from a raw today-locations payload contract local to the cockpit service.
- Review finding 2 fixed: `src/js/features/dashboard/dashboard.js` no longer keeps the parallel component field `this.todayLocationsResponse`; the dashboard stores and reuses only the dedicated live-map slice (`this.todayLocations`) for cockpit/map state and `rawApiData.todayLocations`.
- Evidence for duplication cleanup: repo search found no remaining `this.todayLocationsResponse` consumer and no `rawApiData.todayLocations` consumer outside the dashboard slice storage path.
- Added regression coverage in `tests/dashboard/liveMapSlice.test.js` to prove the cockpit hero can consume a prebuilt live-map slice directly.
- Fresh verification command:
  - `node --test "E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/tests/dashboard/liveMapSlice.test.js" "E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/services/dashboardCockpitService.test.js" "E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/features/dashboard/dashboardCockpitState.test.js"`
- Fresh verification summary:
  - `64` tests passed, `0` failed.
  - Node emitted existing `MODULE_TYPELESS_PACKAGE_JSON` warnings and existing test-log noise from mocked dashboard flows, but the command exited successfully.

## Fix-wave 2 notes
- Root cause: `buildLiveMapViewModel(response)` normalized unsupported payloads like `{ data: {} }` to `locations: []`, so malformed backend data became indistinguishable from a valid empty today-locations feed.
- Narrow fix applied in `src/js/services/dashboard/liveMapSlice.js`: preserve supported shapes (raw array, `{ data: [] }`, `{ data: { data: [] } }`) but mark other non-null payload shapes as invalid with `locations: false`.
- Added targeted regression coverage in `tests/dashboard/liveMapSlice.test.js` proving both behaviors:
  - valid empty payloads still produce the normal empty-state path
  - malformed payloads now produce the invalid-payload path instead of collapsing into empty
- Fresh verification command:
  - `node --test "E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/tests/dashboard/liveMapSlice.test.js" "E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/services/dashboardCockpitService.test.js" "E:/skrisi/clonefee/Infinite_Track_Fe/.worktrees/phase3-dashboard-owner-driven/src/js/features/dashboard/dashboardCockpitState.test.js"`
- Fresh verification summary:
  - `66` tests passed, `0` failed.
  - Node emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warnings plus existing mocked-flow console noise and geofence invalid-URL test noise, but the command exited successfully.
