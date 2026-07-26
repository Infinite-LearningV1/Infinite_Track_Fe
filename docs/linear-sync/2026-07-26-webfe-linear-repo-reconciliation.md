# Web FE — Linear ↔ Repo Reconciliation

**Date:** 2026-07-26
**Scope:** Web FE issues in the `Infinite Track palu` Linear team (`INF`), reconciled against `Infinite_Track_Fe` repo evidence
**Repo state at audit:** `develop` @ `ff954f8`; `develop` vs `master` = ahead 46, behind 2 (diverged)

## Why this was needed

GitHub Issues is enabled on `Infinite_Track_Fe` but holds **0 issues**. The only link between Linear and the repo is the branch name / PR title convention (`docs-audit/INF-199-...`). That link is one-way: merging a PR never moves a Linear issue, so drift accumulates silently.

At audit time, 9 Web FE issues had merged PRs and delivered artifacts while still sitting in `Backlog`.

## Findings

### 1. Merged work still marked Backlog

| Issue | Evidence in repo | PR |
| --- | --- | --- |
| INF-191 | `docs/evidence/do-app-platform-source-2026-07-04.json` / `.md` | #40 |
| INF-192 | env matrix table (dev/staging/prod) in `DEPLOYMENT.md` | #43 |
| INF-193 | CORS section in `DEPLOYMENT.md`, `DEPLOYMENT-CHECKLIST.md` | #47, #48 |
| INF-194 | `docs/evidence/github-ruleset-{develop,master}-2026-07-04.json` | #41 |
| INF-195 | `docs/smoke-tests/post-deploy-checklist.md` | #46, #49 |
| INF-196 | rollback procedure in `DEPLOYMENT.md` | #45, #48 |
| INF-197 | `docs/handoff/INF-197-shared-context-sync-2026-07-03.md` | #50 |
| INF-198 | `docs/linear-templates/web-fe-issue-template.md` | #44 |
| INF-199 | `docs/mvp/web-fe-mvp-checklist.md` | #51 |

### 2. Wrong issue referenced in a branch

PR #52 (`ci(webfe): add master build gate baseline`) used branch `docs-audit/INF-200-master-gate-hardening`.

`INF-200` is a **backend** issue (`Backend: sync FAHP dashboard recap OpenAPI contract`, project Backend Foundation). The Web FE master build gate work therefore had no Linear issue of its own, and its PR trace attached to another repo's backlog.

### 3. Project layer did not reflect reality

All five Linear projects were `Backlog` with no lead and no dates, last touched 2026-04-02 — while 14 issues were `In Progress` and 29 were `Done`.

### 4. Web FE issues scattered across four locations

`Web FE Foundation` (55), `Deployment & Governance` (INF-138, 191–196), `Cross-Repo Reliability` (INF-197), and no-project (INF-231, 155, 180, 184–188). Combined with 37 of 55 `Web FE Foundation` issues missing a `repo:*` label, no single view could answer "what is the Web FE workload".

## Actions taken

### Hygiene
- Added `repo:web` to 37 issues; `Web FE Foundation` now has 0 issues without a `repo:*` label and 0 without any label.
- Replaced `[INF-XXX]` template placeholders with real identifiers on INF-191…199.
- INF-231 (titled "Web FE: …" but labelled `repo:backend`, no project) → labels `cross-repo`, `repo:web`, `repo:backend`, `type:bug`; project `Cross-Repo Reliability`.
- Cancelled Linear onboarding template issues INF-1…4.

### Status reconciliation
- `Done`: INF-191, 192, 194, 195, 196, 197, 198 — deliverable is a documentation/evidence artifact that exists in the repo.
- `In Progress` (deliberately **not** `Done`):
  - **INF-193** — acceptance criteria require production login without CORS error; `docs/evidence/post-deploy-smoke-2026-07-05.md` records auth as `CONDITIONAL` and login as not exercised.
  - **INF-199** — the checklist file exists but every checkbox is empty, categories do not match the acceptance criteria, and the sign-off block is blank.
  - **INF-166** — export modal shipped in PR #39, but authoritative export fields still depend on backend `INF-183` (Backlog). Marked `blockedBy INF-183`.

### Project layer
- All five projects → `In Progress`, `startDate` 2026-04-02.
- Target dates deliberately left empty — a date is a stakeholder commitment, not an audit inference.
- Leads left empty — the Linear API surface used here does not expose assignee data.

### Corrections
- Created **INF-243** (`[Web FE] Master build gate baseline`, `Deployment & Governance`, `In Progress`) to own the work previously mis-referenced to INF-200. Not `Done`: required-status-check enforcement on `master` is still unproven, exactly as PR #52 itself noted.
- Moved INF-180, 184, 185, 186, 187, 188 into `Cross-Repo Reliability`.

## Claims corrected during the audit

Three initial conclusions were withdrawn after checking repo evidence:

- **INF-138** was not drift. PR #26 on that branch changed only `.gitattributes`; `In Progress` was accurate.
- **INF-125** was not a stale status. PR #16 touched no modal files; INF-125 is cross-table modal standardisation and remains genuinely open.
- **PR #57 is not a stale duplicate of PR #58.** #58 carried 10 custom-domain files; #57 is the full `develop → master` promotion with 46 commits and is legitimately open.

## Not done

- `docs/mvp/web-fe-mvp-checklist.md` remains unfilled — completing it requires an authenticated production smoke run with credentials that were not available.
- 23 Android issues remain without a project, and INF-202…205 still carry `[INF-XXX]` placeholders. Out of scope for a Web FE reconciliation.
- Project leads and target dates remain unset (see above).

## Concurrent workspace activity

During this session, 13 issue status changes and roughly 21 project assignments occurred on backend/Android issues that were **not** part of this reconciliation (INF-181, 182, 206, 212, 213, 215, 217, 225, 232, 233, 234, 235, 236 and others). They appear to come from another person or agent working in the same Linear workspace at the same time. They are recorded here only so this document is not mistaken for their justification — their correctness has not been verified.

## Follow-up

Four items are blocked on the same missing evidence — an authenticated production smoke run against `https://infinite-track.tech`:

- INF-193 (CORS verification)
- INF-199 (MVP checklist sign-off)
- INF-231 (production login/runtime error)
- INF-243 (master build gate enforcement)

## Governance change

`CLAUDE.md` and `.claude/rules/20-required-task-output.md` gained a **Linear issue sync expectation** section plus a Definition-of-done bullet, so that leaving a merged issue in `Backlog` is an explicit process failure rather than an easy oversight.
