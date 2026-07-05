# INF-197 Shared-Context Sync — 2026-07-03

## Purpose
Sync active Web FE documentation with the external cockpit shared-context references required by `CLAUDE.md` and `AGENTS.md`.

## Shared-context sources audited
Located at:
`C:\Users\Febriyadi\OneDrive\Documents\Claude\Projects\Deploy Infinite Track\Infinite Track\shared-context\`

Files read:
- `API_CONTRACT.md`
- `GLOBAL_STATUS.md`
- `ROUTING_POLICY.md`
- `QUALITY_GATE.md`
- `DECISIONS.md`
- `RISK_REGISTER.md`

## Key sync results

### API contract alignment
The external shared contract currently states:
- Cockpit aggregate authority: `GET /api/summary/dashboard-analytics`
- Report/export authority: `GET /api/summary/reports`
- Live map authority: `GET /api/attendance/today-locations`
- FAHP authority: `GET /api/analysis/fuzzy-ahp/dashboard?type=discipline|wfa|smart_ac`
- Backend canonical period values: `daily|weekly|monthly|range`
- `period=all` is rejected by backend
- `/api/summary/dashboard-map` is not an active route; consumers use `today-locations`

Web FE repo sync action completed:
- Updated `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md`
- Updated `docs/adr/ADR-007-dashboard-cockpit-contract-adoption.md`

Both ADRs now describe FAHP using the final `dashboard?type=...` owner endpoint instead of the retired `dashboard-recap` contract.

### Global status / routing / quality / decisions / risk alignment
The external shared-context currently emphasizes:
- `PHASE0_RECOVERY` global posture snapshot is historical and refreshable
- Web FE remains a `single-session` / `runtime-test` friendly repo under the routing policy
- Global quality gate for Web FE is `npm run build` + `npm run lint` + `npm run test:auth-runtime`, with browser/runtime evidence for UI flows
- `develop` is QA/contract validation branch and `master` is deployment branch
- Backend remains source of truth; Web FE is a consumer
- `today-locations` remains the canonical map authority
- Branch protection and CI-hardening remain live risks until explicitly verified/resolved

Web FE repo action for this wave:
- No additional repo file changes were required for these items because current repo governance already points operators back to the shared-context files through `CLAUDE.md` / `AGENTS.md`, and recent deployment/checklist updates already capture the practical release gates for current Web FE work.

## Remaining gaps / notes
- Historical/handoff docs under `docs/contract-sync/`, `docs/linear-sync/`, and older specs/plans still mention stale FE contract history such as `dashboard-recap` or older cockpit assumptions. These are historical artifacts, not active governance, and were not rewritten in this focused sync.
- `QUALITY_GATE.md` still expects Web FE `npm run lint` + `npm run test:auth-runtime` as the ideal gate, while current CI on `develop` has only partial hardening. This is an acknowledged cross-repo/process gap, not a new contradiction introduced by INF-197.
- `GLOBAL_STATUS.md` includes refreshable repository snapshots that can go stale quickly; treat it as context, not immutable truth.

## Outcome
INF-197 sync delta completed for active Web FE governance docs:
- Active ADR references now point to the same FAHP owner contract used by current backend truth.
- Shared-context obligations remain discoverable from repo-local operator docs.
- No runtime or source-code behavior was changed by this task.

## Verification status
- Docs-only change.
- Repository runtime/build verification not required for the sync itself.
- Human reviewers should still spot-check the updated ADR wording before merge.
