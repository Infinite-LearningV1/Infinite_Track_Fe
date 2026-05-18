# Worktree Review Stream Map Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved worktree review-stream map into four canonical review branches/PR candidates plus one parked support bucket, without mixing governance, deploy/runtime, dashboard/reporting, and backend-operational-settings scope.

**Architecture:** Execute the review map in waves. Each wave first locks stream boundaries against `develop`, then compares or folds supporting worktrees into a single canonical branch, then prepares the review packet (scope, risks, verification evidence, docs/ADR notes). Treat the stream as the review unit and each worktree as an input source; do not assume one worktree must become one PR.

**Tech Stack:** Git worktrees/branches, Webpack multi-page Web FE repo, docs/ADR set, dashboard/reporting surface, deploy/runtime config, auth/RBAC-sensitive feature modules.

---

## Execution constraints

- Use `develop` as the comparison base for final review readiness.
- Do not invent repo verification commands. If the runtime or repo verification path is not already locked, write `REQUIRES REPO VERIFICATION` in the PR packet and stop short of claiming verification success.
- Do not decide merge/rebase/cherry-pick mechanics in this plan. This plan only determines canonical targets, compare/fold sources, and scope-cleanup order.
- Any stream touching `src/js/services/**`, `src/js/utils/authGuard.js`, `src/js/utils/roleBasedAccess.js`, `src/js/config/env.js`, `webpack.config.js`, `DEPLOYMENT.md`, or `DEPLOYMENT-CHECKLIST.md` must include an explicit impact note before code review.
- `DOCS/ADR UPDATE REQUIRED` applies to Stream C, Stream B, and Stream D by default. Stream A may remain docs-only if its final diff stays inside governance/review artifacts.

## Wave model

- **Wave 1 (parallel):** Stream A Governance + Stream C Deploy/runtime/Docker
- **Wave 2 (sequential after boundary cleanup):** Stream B Dashboard/reporting, then Stream D Backend operational settings
- **Wave 3 (parked):** Stream E Support bucket

---

### Task 1: Lock branch identities and stream boundaries

**Files:**
- Reference: `docs/superpowers/specs/2026-04-26-worktree-review-stream-map-design.md`
- Review: `CLAUDE.md`
- Review: `.claude/rules/10-high-risk-areas.md`
- Review: `.claude/rules/20-required-task-output.md`
- Review: `.claude/rules/30-verification-and-evidence.md`
- Review: `.claude/rules/40-docs-adr-and-release-notes.md`
- Inspect worktrees: `.worktrees/code-review-governance-artifacts`
- Inspect worktrees: `.worktrees/codex-governance`
- Inspect worktrees: `.worktrees/admin-table-standardization-dashboard-first`
- Inspect worktrees: `.worktrees/runtime-audit-branch-governance`
- Inspect worktrees: `.worktrees/inf-138-deploy-branch-cicd-baseline`
- Inspect worktrees: `.worktrees/runtime-config-contract`
- Inspect worktrees: `.worktrees/webfe-standards-sync`
- Inspect worktrees: `.worktrees/inf-142-backend-operational-settings`
- Inspect worktrees: `.claude/worktrees/feature+docker-compose-nginx-gateway`
- Inspect worktrees: `.worktrees/linear-fe-wave-grouping`
- Inspect worktrees: `.worktrees/do-app-platform-static-site-production`
- Inspect worktrees: `.worktrees/webfe-agent-step2`

- [ ] **Step 1: Resolve the current branch name for every worktree that feeds a stream**

```bash
git branch --show-current
git -C ".worktrees/code-review-governance-artifacts" branch --show-current
git -C ".worktrees/codex-governance" branch --show-current
git -C ".worktrees/admin-table-standardization-dashboard-first" branch --show-current
git -C ".worktrees/runtime-audit-branch-governance" branch --show-current
git -C ".worktrees/inf-138-deploy-branch-cicd-baseline" branch --show-current
git -C ".worktrees/runtime-config-contract" branch --show-current
git -C ".worktrees/webfe-standards-sync" branch --show-current
git -C ".worktrees/inf-142-backend-operational-settings" branch --show-current
git -C ".claude/worktrees/feature+docker-compose-nginx-gateway" branch --show-current
```

Expected: one branch name per worktree so later compare steps refer to actual refs instead of guessed names.

- [ ] **Step 2: Confirm each canonical branch still maps cleanly to the approved stream**

```bash
git diff --name-status develop...feature/branch-governance-only
git -C ".worktrees/inf-138-deploy-branch-cicd-baseline" diff --name-status develop...HEAD
git -C ".worktrees/admin-table-standardization-dashboard-first" diff --name-status develop...HEAD
git -C ".worktrees/inf-142-backend-operational-settings" diff --name-status develop...HEAD
```

Expected:
- Governance diff is limited to governance/review/docs artifacts.
- Deploy diff is limited to deploy/runtime/config/docker/docs files.
- Dashboard diff is centered on dashboard/reporting files.
- Backend ops diff is centered on backend-operational-settings files plus only the minimum auth/RBAC touchpoints.

- [ ] **Step 3: Freeze the wave order before changing any branch contents**

Set the execution ledger to:
- Wave 1 active: Stream A, Stream C
- Wave 2 blocked: Stream B, Stream D
- Wave 3 parked: Stream E

Expected: no engineer starts Stream B/D cleanup before Wave 1 scope is stable.

- [ ] **Step 4: Stop immediately if a canonical branch crosses another stream’s high-risk boundary**

Use this file ownership rule:
- Governance owns `.claude/**`, `CLAUDE.md`, `AGENTS.md`, governance docs
- Deploy owns env/build/deploy/docker/CI/docs truth
- Dashboard owns dashboard/reporting rendering and report service behavior
- Backend ops owns backend operational settings feature shell and only required auth/RBAC touchpoints

Expected: every later task starts from an agreed ownership map instead of arguing branch-by-branch.

- [ ] **Step 5: Commit only the boundary notes or tracker updates if you create any during execution**

```bash
git add <only-boundary-note-files-if-any>
git commit -m "docs: lock review stream execution boundaries"
```

Expected: optional lightweight checkpoint. Skip if no file changed.

#### Task 1 execution findings — 2026-04-26

- Branch identities resolved:
  - canonical governance: `feature/branch-governance-only`
  - governance source: `feature/code-review-governance-artifacts`
  - governance source: `feature/codex-governance`
  - canonical dashboard: `feature/admin-table-standardization-dashboard-first`
  - dashboard overlap source: `feature/runtime-audit-branch-governance`
  - canonical deploy: `deploy`
  - deploy fold source: `runtime-config-contract`
  - deploy fold source: `feature/webfe-standards-sync`
  - docker gateway worktree currently points at `develop`
  - canonical backend ops: `feature/inf-142-backend-operational-settings`
  - parked support source: `.worktrees/linear-fe-wave-grouping` -> `feature/linear-fe-wave-grouping`
  - parked support source: `.worktrees/do-app-platform-static-site-production` -> `feature/do-app-platform-static-site-production`
  - parked support source: `.worktrees/webfe-agent-step2` -> `feature/webfe-agent-step2`
- Wave order frozen for execution:
  - Wave 1 active: Stream A, Stream C
  - Wave 2 blocked pending boundary cleanup: Stream B, Stream D
  - Wave 3 parked: Stream E
- Ownership map frozen for boundary checks:
  - Governance owns `.claude/**`, `CLAUDE.md`, `AGENTS.md`, governance docs
  - Deploy owns env/build/deploy/docker/CI/docs truth
  - Dashboard owns dashboard/reporting rendering and report service behavior
  - Backend ops owns backend operational settings feature shell and only required auth/RBAC touchpoints
- Canonical branch boundary result:
  - Stream A currently maps cleanly to governance/review artifacts
  - Stream C currently maps cleanly to deploy/runtime/docker truth
  - Stream B does not yet satisfy canonical clean mapping and is blocked for Wave 2: it is dashboard/reporting scoped, but still carries one governance design doc that must be removed before review prep
  - Stream D does not yet satisfy canonical clean mapping and is blocked for Wave 2: it currently includes dashboard/reporting files (`src/js/features/dashboard/**`, `src/js/services/reportService.js`, `src/partials/cards/stats-card-group.html`, `src/partials/table/table-dashboard-report.html`) in addition to backend-operational-settings and auth/RBAC touchpoints
- Stop condition from Task 1 remains active:
  - do not start Stream B review prep, promotion, or fold decisions until the governance-file contamination is removed and canonical clean mapping is restored
  - do not start Stream D review prep, promotion, or fold decisions until the dashboard/backend ownership split is made explicit and canonical clean mapping is restored
- Step 5 outcome: execution findings were recorded in this plan file only; no separate checkpoint commit was created, so the optional lightweight checkpoint was skipped.

---

### Task 2: Finalize Stream A governance as the first review-ready PR

**Files:**
- Canonical target: `CLAUDE.md`
- Canonical target: `AGENTS.md`
- Canonical target: `.claude/rules/**`
- Canonical target: `.claude/skills/**`
- Canonical target: `README.md`
- Canonical target: `docs/code-review-governance.md`
- Canonical target: `docs/adr/index.md`
- Compare source: `.worktrees/code-review-governance-artifacts`
- Compare source: `.worktrees/codex-governance`

- [ ] **Step 1: Compare canonical governance branch against each governance source worktree**

```bash
gov_small=$(git -C ".worktrees/code-review-governance-artifacts" branch --show-current)
gov_wide=$(git -C ".worktrees/codex-governance" branch --show-current)
git diff --name-status feature/branch-governance-only..."$gov_small"
git diff --name-status feature/branch-governance-only..."$gov_wide"
```

Expected:
- The small governance worktree behaves like a subset or focused compare source.
- The wider governance worktree exposes extra files that need explicit keep/drop decisions.

- [ ] **Step 2: Remove any file from the canonical governance branch that belongs to deploy/runtime, dashboard/reporting, or backend ops**

Keep only:
- governance rules and workflows
- review skill docs
- repo governance docs
- optional ADR index/doc updates directly tied to governance

Expected: the final governance PR does not include runtime truth, dashboard behavior, or deploy implementation drift.

- [ ] **Step 3: Fold only the governance-specific deltas from the source branches into the canonical branch**

Use the compare output from Step 1 to classify every file as:
- keep in Stream A
- hand off to another stream
- ignore as obsolete

Expected: `feature/branch-governance-only` stays canonical and the other governance branches become compare/fold sources only.

- [ ] **Step 4: Prepare the governance review packet**

Use this PR body skeleton:

```md
## Summary
- Finalize governance/review workflow on top of `feature/branch-governance-only`
- Fold focused governance artifacts from compare branches without expanding into runtime or product behavior

## Risks
- Duplicate governance rules across source branches can create review noise
- Scope drift into non-governance files would make this PR harder to approve quickly

## Verification
- File ownership and diff reviewed against `develop`
- Runtime verification: not applicable unless non-doc runtime files remain
- If runtime-sensitive files remain, write `REQUIRES REPO VERIFICATION`

## Docs / ADR
- Governance docs updated as needed
- ADR update optional unless final diff changes architecture-significant repo operating rules
```

Expected: a review-ready PR description that matches repo governance output rules.

- [ ] **Step 5: Commit the finalized governance stream**

```bash
git add CLAUDE.md AGENTS.md .claude docs README.md
git commit -m "docs: finalize governance review stream"
```

Expected: one commit (or one small stack) that is clearly governance-only.

---

### Task 3: Finalize Stream C deploy/runtime/Docker as the second Wave 1 PR

**Files:**
- Canonical target: `DEPLOYMENT.md`
- Canonical target: `DEPLOYMENT-CHECKLIST.md`
- Canonical target: `.env.example`
- Canonical target: `.env.production.example`
- Canonical target: `env.example.txt`
- Canonical target: `src/js/config/env.js`
- Canonical target: `webpack.config.js`
- Canonical target: `.github/workflows/**`
- Canonical target: `compose.yaml`
- Canonical target: `docker/nginx/**`
- Compare source: `.worktrees/runtime-config-contract`
- Compare source: `.worktrees/webfe-standards-sync`
- Compare source: `.claude/worktrees/feature+docker-compose-nginx-gateway`

- [ ] **Step 1: Resolve the deploy/runtime fold-source branch names**

```bash
runtime_contract=$(git -C ".worktrees/runtime-config-contract" branch --show-current)
standards_sync=$(git -C ".worktrees/webfe-standards-sync" branch --show-current)
docker_gateway=$(git -C ".claude/worktrees/feature+docker-compose-nginx-gateway" branch --show-current)
```

Expected: all deploy/runtime compare refs are resolved before touching the canonical deploy branch.

- [ ] **Step 2: Compare every fold source against the canonical deploy branch**

```bash
git -C ".worktrees/inf-138-deploy-branch-cicd-baseline" diff --name-status HEAD..."$runtime_contract"
git -C ".worktrees/inf-138-deploy-branch-cicd-baseline" diff --name-status HEAD..."$standards_sync"
git -C ".worktrees/inf-138-deploy-branch-cicd-baseline" diff --name-status HEAD..."$docker_gateway"
```

Expected:
- Runtime-config-contract contributes env/build truth only.
- Web FE standards sync contributes deploy docs only; otherwise it stays parked.
- Docker gateway contributes compose/nginx/docker implementation only.

- [ ] **Step 3: Keep the canonical deploy branch limited to deploy/runtime truth**

Allowed file families:
- env examples and runtime config
- webpack/build config
- deploy docs and checklist
- CI workflow files related to build/deploy
- Docker/nginx/gateway files

Not allowed:
- dashboard/reporting rendering logic
- backend-operational-settings feature files
- governance-only docs or rule files

Expected: one coherent deploy/runtime story instead of mixed infrastructure + product behavior.

- [ ] **Step 4: Fold missing deploy/runtime changes from the sources into the canonical deploy branch**

When deciding whether to fold a file, use this rule:
- if it changes env/build/deploy truth, keep it in Stream C
- if it only restates governance or planning context, drop it or leave it parked

Expected: docs, config, Docker, and CI tell the same story in one branch.

- [ ] **Step 5: Prepare the deploy/runtime review packet with explicit high-risk notes**

Use this PR body skeleton:

```md
## Summary
- Finalize deploy/runtime/Docker truth on the canonical `deploy` branch
- Consolidate env/build/docs/docker changes from the mapped fold sources

## High-risk impact
- Touches env/build/deploy truth
- May affect `src/js/config/env.js`, `webpack.config.js`, and deploy documentation consistency

## Verification
- Diff reviewed against `develop`
- Fold sources compared against canonical deploy branch
- Runtime/build verification: `REQUIRES REPO VERIFICATION`

## Docs / ADR
- DOCS/ADR UPDATE REQUIRED
- Check `docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md`
- Include release/build notes for reviewers
```

Expected: reviewers see the risk surface and do not confuse this branch with dashboard/product logic.

- [ ] **Step 6: Commit the finalized deploy/runtime stream**

```bash
git -C ".worktrees/inf-138-deploy-branch-cicd-baseline" add DEPLOYMENT.md DEPLOYMENT-CHECKLIST.md .env.example .env.production.example env.example.txt src/js/config/env.js webpack.config.js .github compose.yaml docker
git -C ".worktrees/inf-138-deploy-branch-cicd-baseline" commit -m "chore: finalize deploy runtime review stream"
```

Expected: one deploy/runtime checkpoint commit (or a tight stack) with no dashboard or auth drift.

---

### Task 4: Finalize Stream B dashboard/reporting after Wave 1 boundaries are stable

**Files:**
- Canonical target: `src/js/features/dashboard/dashboard.js`
- Canonical target: `src/js/features/dashboard/dashboardTableState.js`
- Canonical target: `src/js/features/dashboard/dashboardTableState.test.js`
- Canonical target: `src/js/services/reportService.js`
- Canonical target: `src/js/services/reportService.test.js`
- Canonical target: `src/partials/cards/stats-card-group.html`
- Canonical target: `src/partials/table/table-dashboard-report.html`
- Compare source: `.worktrees/runtime-audit-branch-governance`

- [ ] **Step 1: Resolve the compare branch for the runtime-audit dashboard source**

```bash
dashboard_compare=$(git -C ".worktrees/runtime-audit-branch-governance" branch --show-current)
```

Expected: the overlap source is identified explicitly before any cleanup starts.

- [ ] **Step 2: Compare the canonical dashboard branch against both `develop` and the overlap source**

```bash
git -C ".worktrees/admin-table-standardization-dashboard-first" diff --name-status develop...HEAD
git -C ".worktrees/admin-table-standardization-dashboard-first" diff --name-status HEAD..."$dashboard_compare"
```

Expected:
- The `develop` diff shows the real PR surface.
- The overlap diff shows which files are shared with the runtime-audit source and need ownership decisions.

- [ ] **Step 3: Remove every file that belongs to backend ops, deploy/runtime, or governance from the canonical dashboard branch**

Dashboard stream may keep:
- dashboard rendering and state
- reporting table partials
- report service behavior required for dashboard/reporting
- tests covering dashboard/reporting responsibility

Dashboard stream may not keep:
- generic auth/session changes unrelated to dashboard access behavior
- backend-operational-settings page wiring
- env/build/deploy files

Expected: reviewers can evaluate dashboard/reporting responsibility without reading unrelated feature work.

- [ ] **Step 4: Resolve ownership for `src/js/services/**` changes explicitly**

Use this file rule:
- keep a service change in Stream B only if it exists to support dashboard/reporting behavior
- move or drop it if it exists mainly to support backend-operational-settings

Expected: the highest-risk overlap area (`src/js/services/**`) has a single owning stream.

- [ ] **Step 5: Prepare the dashboard/reporting review packet**

Use this PR body skeleton:

```md
## Summary
- Finalize dashboard/reporting standardization on the canonical dashboard branch
- Fold only reporting-relevant changes from the overlap source

## High-risk impact
- Touches dashboard summary and analytics rendering
- May change report service behavior under `src/js/services/**`
- Export/error handling expectations must remain truthful

## Verification
- Diff reviewed against `develop`
- Overlap source compared against canonical dashboard branch
- Runtime verification: `REQUIRES REPO VERIFICATION`

## Docs / ADR
- DOCS/ADR UPDATE REQUIRED
- Check `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md`
- Include review notes for dashboard rendering, reporting, and export boundaries
```

Expected: the branch is ready for review once the overlap cleanup is complete, even if runtime verification still needs a locked path.

- [ ] **Step 6: Commit the finalized dashboard stream**

```bash
git -C ".worktrees/admin-table-standardization-dashboard-first" add src/js/features/dashboard src/js/services/reportService.js src/js/services/reportService.test.js src/partials/cards/stats-card-group.html src/partials/table/table-dashboard-report.html
git -C ".worktrees/admin-table-standardization-dashboard-first" commit -m "feat: finalize dashboard reporting review stream"
```

Expected: one dashboard-focused commit set with explicit reporting ownership.

---

### Task 5: Finalize Stream D backend operational settings after dashboard ownership is settled

**Files:**
- Canonical target: `src/js/features/backendOperationalSettings/backendOperationalSettings.constants.js`
- Canonical target: `src/js/features/backendOperationalSettings/backendOperationalSettings.js`
- Canonical target: `src/js/services/backendOperationalSettingsService.js`
- Canonical target: `src/js/utils/authGuard.js`
- Canonical target: `src/js/utils/roleBasedAccess.js`
- Canonical target: `src/management-backend-settings.html`
- Review tests: `tests/backend-operational-settings-*`

- [ ] **Step 1: Compare the backend-ops branch against `develop` and against the cleaned dashboard branch**

```bash
git -C ".worktrees/inf-142-backend-operational-settings" diff --name-status develop...HEAD
backend_dashboard=$(git -C ".worktrees/admin-table-standardization-dashboard-first" branch --show-current)
git -C ".worktrees/inf-142-backend-operational-settings" diff --name-status HEAD..."$backend_dashboard"
```

Expected:
- The `develop` diff shows the actual backend-ops PR surface.
- The dashboard comparison reveals any remaining shared service/auth files that still need a single owner.

- [ ] **Step 2: Remove dashboard/reporting-general behavior from the backend-ops branch**

Keep only:
- backend operational settings page shell
- backend operational settings service
- minimal auth/RBAC behavior required by this page
- tests directly tied to backend operational settings

Drop or hand off:
- general dashboard rendering changes
- report-specific behavior not required by backend operational settings

Expected: Stream D stays feature-coherent instead of becoming a second dashboard PR.

- [ ] **Step 3: Treat `authGuard` and `roleBasedAccess` as explicit high-risk boundaries**

Before review, add one short impact note covering:
- what auth/RBAC behavior changed
- why the change is required for backend operational settings
- why the change is not a repo-wide auth rewrite

Expected: reviewers can evaluate auth/RBAC impact without assuming this PR changes the global session contract.

- [ ] **Step 4: Prepare the backend-ops review packet**

Use this PR body skeleton:

```md
## Summary
- Finalize backend operational settings as its own review stream
- Keep auth/RBAC and service changes limited to what the page requires

## High-risk impact
- Touches `src/js/services/**` and auth/RBAC-adjacent files
- Could affect access gating if boundaries are not kept narrow

## Verification
- Diff reviewed against `develop`
- Compared against cleaned dashboard canonical branch to remove overlap
- Runtime verification: `REQUIRES REPO VERIFICATION`

## Docs / ADR
- DOCS/ADR UPDATE REQUIRED
- Check `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md`
- Check `docs/adr/ADR-003-route-guard-and-rbac-boundary.md`
- Include release/build notes if access expectations changed
```

Expected: Stream D is reviewable as a focused backend settings feature with explicit auth/RBAC scope.

- [ ] **Step 5: Commit the finalized backend-ops stream**

```bash
git -C ".worktrees/inf-142-backend-operational-settings" add src/js/features/backendOperationalSettings src/js/services/backendOperationalSettingsService.js src/js/utils/authGuard.js src/js/utils/roleBasedAccess.js src/management-backend-settings.html tests
git -C ".worktrees/inf-142-backend-operational-settings" commit -m "feat: finalize backend operational settings review stream"
```

Expected: one feature-focused commit set ready for a dedicated PR.

---

### Task 6: Park Stream E support worktrees and promote them only by explicit need

**Files:**
- Inspect: `.worktrees/linear-fe-wave-grouping`
- Inspect: `.worktrees/do-app-platform-static-site-production`
- Inspect: `.worktrees/webfe-agent-step2`

- [ ] **Step 1: Resolve the branch names and current file inventories for the parked worktrees**

```bash
git -C ".worktrees/linear-fe-wave-grouping" branch --show-current
git -C ".worktrees/do-app-platform-static-site-production" branch --show-current
git -C ".worktrees/webfe-agent-step2" branch --show-current
git -C ".worktrees/linear-fe-wave-grouping" diff --name-status develop...HEAD
git -C ".worktrees/do-app-platform-static-site-production" diff --name-status develop...HEAD
git -C ".worktrees/webfe-agent-step2" diff --name-status develop...HEAD
```

Expected: each parked worktree is classified as either truly support-only or a future candidate for another stream.

- [ ] **Step 2: Promote a parked worktree only if a canonical stream is missing a required file family**

Promotion rule:
- if the parked worktree fills a missing file family already owned by Stream A-D, fold it there
- if it introduces a new independent product scope, do not promote it inside this execution plan

Expected: the parked bucket does not accidentally become a fifth feature PR.

- [ ] **Step 3: Keep the support bucket out of PR creation by default**

PR rule:
- no standalone PR for Stream E
- mention parked sources in the owning stream’s review notes only if files are actually folded

Expected: review throughput stays concentrated on the four real streams.

---

### Task 7: Prepare the final review queue and parallel execution handoff

**Files:**
- Reference: `docs/superpowers/specs/2026-04-26-worktree-review-stream-map-design.md`
- Review packet targets: `DEPLOYMENT.md`
- Review packet targets: `DEPLOYMENT-CHECKLIST.md`
- Review packet targets: `docs/adr/index.md`
- Review packet targets: `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md`
- Review packet targets: `docs/adr/ADR-003-route-guard-and-rbac-boundary.md`
- Review packet targets: `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md`
- Review packet targets: `docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md`

- [ ] **Step 1: Assemble the review queue in execution order**

Queue:
1. Stream A — Governance / `feature/branch-governance-only`
2. Stream C — Deploy/runtime/Docker / `deploy`
3. Stream B — Dashboard/reporting / canonical dashboard branch
4. Stream D — Backend operational settings / canonical backend-ops branch
5. Stream E — parked only

Expected: Wave 1 can run in parallel and Wave 2 starts only after its dependency notes are clear.

- [ ] **Step 2: Use one PR checklist for every stream**

```md
## Scope
- Canonical branch:
- Fold/compare sources:
- Files/areas owned by this PR:

## Risks
- High-risk files or behaviors:
- Cross-stream overlap removed:

## Verification
- Diff reviewed against `develop`
- Cross-branch comparison completed
- Runtime/build verification: `REQUIRES REPO VERIFICATION` or link to repo-approved evidence

## Docs / ADR
- `DOCS/ADR UPDATE REQUIRED` yes/no
- ADR/doc files checked:

## Release / Build Notes
- Build/release impact:
- Reviewer focus areas:
```

Expected: every PR speaks the same review language and satisfies repo-required output order.

- [ ] **Step 3: Stop claiming completion until evidence exists for each stream**

Completion rule:
- scope is bounded
- risks are explicit
- affected files are named
- verification evidence exists or `REQUIRES REPO VERIFICATION` is present
- docs/ADR note is present when required
- review/release/build notes are present

Expected: no stream is marked “done” only because the branch looks clean.

- [ ] **Step 4: Commit only review-packet files if execution adds or updates them**

```bash
git add <only-review-note-or-doc-files-if-any>
git commit -m "docs: prepare review packets for stream execution"
```

Expected: optional checkpoint. Skip if no review-packet files are persisted.

---

## Final deliverable state

When this plan is complete, the repo should have:
- one governance review branch ready first
- one deploy/runtime/Docker review branch ready in parallel with governance
- one dashboard/reporting branch ready after boundary cleanup
- one backend operational settings branch ready after dashboard ownership is settled
- one support bucket that remains parked unless a canonical stream explicitly needs it

## Execution handoff

Recommended implementation mode:
- **Subagent-Driven:** one fresh agent per stream task with review between tasks
- **Inline Execution:** one stream at a time with checkpoints after each canonical branch is cleaned

Do not open PRs or claim runtime verification success until the review packet for that stream has been filled with either evidence or `REQUIRES REPO VERIFICATION`.
