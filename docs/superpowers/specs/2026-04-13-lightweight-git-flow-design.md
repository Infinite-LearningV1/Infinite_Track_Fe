# Lightweight Git Flow Design

## Purpose
Establish a lightweight Git Flow for this repository where `develop` is the integration branch and `master` is the stable release-ready branch. The goal is to keep day-to-day work off `master`, require review-first integration, and preserve a clear release history.

## Current repository context
- `origin` points to the organization repository.
- `personal-origin` remains available as a fallback/reference remote.
- `develop` already exists on `origin`.
- `master` already exists on `origin`.
- `origin/HEAD` currently points to `develop`.
- At the time of writing this spec, `develop` and `master` are aligned on the same commit.

## Goals
- Make `develop` the integration branch for normal work.
- Keep `master` stable and release-ready.
- Route normal feature and bugfix work away from `master`.
- Require pull requests and review for branch integration.
- Keep `develop` history linear and readable.
- Preserve explicit release events on `master`.
- Support urgent production fixes within the same documented promotion flow so `develop` remains the integration branch and `master` remains a controlled release destination.

## Non-goals
- Adopt full classic Git Flow with mandatory `release/*` branches.
- Introduce heavy process overhead for a small team.
- Change application architecture or runtime behavior.

## Final branch model
- `feature/*` -> pull request -> `develop`
- `fix/*` (or another explicitly named fix branch for urgent work) -> pull request -> `develop`
- `develop` -> release pull request -> `master`
- All change branches, including urgent fixes, should follow the documented promotion flow: `feature/*` (or an explicitly named fix branch) -> `develop` via PR review -> `master` via controlled promotion when the release state is ready.

## Branch roles
### `develop`
Role:
- Daily integration branch.
- Default target for normal implementation work.
- Accumulates reviewed changes that are candidates for the next release.

Allowed incoming work:
- `feature/*`
- `fix/*` and explicitly named urgent-fix branches

### `master`
Role:
- Stable / release-ready branch.
- Represents the branch intended for production-ready or release-ready state.

Allowed incoming work:
- Release pull requests from `develop`
- No direct change-branch promotion; urgent fixes still arrive through `develop` and are promoted to `master` when ready

### `feature/*`
Role:
- New feature or non-trivial scoped work.

Branching rule:
- Branch from `develop`
- Merge back to `develop` through pull request

### `fix/*`
Role:
- Normal bugfix work intended for the next integration cycle.

Branching rule:
- Branch from `develop`
- Merge back to `develop` through pull request

### Urgent fix branches
Role:
- Time-sensitive fix work that still follows the documented review-first promotion model.

Branching rule:
- Branch from `develop` using `fix/*` or another explicitly named fix branch when needed for clarity
- Merge back to `develop` through pull request
- Promote to `master` only through the controlled release pull request flow when the release state is ready

## Protection and merge policy
### `develop`
Protection intent:
- Treat as the operational integration branch.
- No direct push.

Rules:
- Pull request required
- Minimum 1 approval
- CI build/checks required
- Linear history

Merge policy:
- Allow squash and/or rebase merges
- Do not allow merge commits into `develop`

Rationale:
- Keeps day-to-day integration history clean, linear, and easy to inspect.

### `master`
Protection intent:
- Treat as the stable branch.
- No direct push.
- More conservative than `develop`.

Rules:
- Pull request required
- Minimum 1 approval (can be made stricter than `develop`)
- CI build/checks required

Merge policy:
- Allow merge commits into `master`

Rationale:
- Preserve explicit release merge events in history.
- Make release transitions from `develop` to `master` clearly visible.

## Operational flow
### Normal feature flow
1. Create `feature/*` or `fix/*` from `develop`.
2. Open pull request to `develop`.
3. Require review and CI.
4. Merge into `develop` using a linear-history strategy.

### Release flow
1. When `develop` is ready to release, open a pull request from `develop` to `master`.
2. Review the release pull request.
3. Require CI to pass.
4. Merge into `master` using a merge commit.
5. Treat the resulting `master` state as the stable release-ready snapshot.

### Urgent fix flow
1. Create `fix/*` or another explicitly named fix branch from `develop`.
2. Open pull request to `develop`.
3. Require review and CI.
4. Merge into `develop` using a linear-history strategy.
5. Promote the reviewed change to `master` only through the controlled release pull request flow when the release state is ready.

Promotion rule:
- All change branches, including urgent fixes, must enter `master` only through `develop`.
- Do not document direct urgent-fix promotion to `master` as the normal workflow.

## Guardrails
- No direct push to `develop`.
- No direct push to `master`.
- All integration happens through pull requests.
- Pull request targets must match branch type:
  - `feature/*`, `fix/*`, and explicitly named urgent-fix branches target `develop`
  - `master` only accepts controlled promotion pull requests from `develop`
- `master` is not the normal target for everyday implementation work.

## Desired operating model summary
| Branch | Role | Entry path | Merge style |
|---|---|---|---|
| `develop` | Integration | PR from `feature/*`, `fix/*`, and explicitly named urgent-fix branches | squash/rebase, linear history |
| `master` | Stable / release-ready | Controlled promotion PR from `develop` | merge commits allowed |

## Verification checklist for implementation
- `develop` remains the default working/integration branch.
- `master` remains reserved for controlled release-ready promotion from `develop`.
- Protection rules differ appropriately between `develop` and `master`.
- Required CI checks are attached to both protected branches.
- Merge strategy supports linear `develop` history and merge-commit-based release visibility on `master`.
- Urgent fixes still follow the same reviewed path: change/fix branch -> `develop` -> controlled promotion to `master`.

## Risks and failure modes
- If direct push remains possible, the workflow can be bypassed.
- If merge strategy is too permissive on `develop`, history quality will degrade.
- If urgent fixes bypass `develop` and go straight to `master`, the branch model and review path will drift from the documented process.
- If the team uses `master` for daily work, the branch model loses meaning.

## Recommended implementation scope
Implementation should focus on repository workflow and policy only:
- branch protection configuration
- merge strategy configuration
- local branch habit alignment where needed
- lightweight contributor workflow documentation if desired

This design intentionally avoids broader process overhead and does not require full classic Git Flow.