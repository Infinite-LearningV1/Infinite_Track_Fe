# Lightweight Git Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a lightweight Git Flow where `develop` is the integration branch and `master` is the stable release-ready branch, with protected PR-based workflows and explicit hotfix recovery.

**Architecture:** The implementation is split into three layers: local repository alignment, GitHub repository workflow settings, and lightweight repo documentation. Local git state should only be changed where it improves default daily use. GitHub-side enforcement carries the real workflow guarantees, while documentation makes the branch model legible to future contributors.

**Tech Stack:** Git, GitHub repository settings, pull request workflow, Webpack build (`npm run build`), Markdown documentation

---

## File structure and responsibility map

- Modify: `.git/config` (local branch upstream/default usage only if needed during execution)
- Modify: `README.md` (only if adding a short contributor workflow note)
- Create: `docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md` (already written; implementation must follow it)
- Create: `docs/superpowers/plans/2026-04-13-lightweight-git-flow-implementation.md` (this plan)
- Optional Create: `docs/git-workflow.md` (only if a dedicated workflow doc is preferred over README edits)
- External system: GitHub repository settings for default branch, branch protection, PR merge strategy, and required checks

## Preconditions

- The repository already has both `develop` and `master` on `origin`.
- `origin` already points to the organization repository.
- `personal-origin` remains available as fallback/reference.
- Current local working tree may contain uncommitted changes, so the implementation must avoid destructive git operations.
- The build command available in this repo is:

```bash
npm run build
```

Expected output:
- A successful production webpack build with exit code `0`.

---

### Task 1: Verify the repository state before workflow changes

**Files:**
- Modify: none
- Test: none

- [ ] **Step 1: Confirm local branches, worktrees, and remotes are in the expected state**

Run:
```bash
git status --short --branch
git branch -vv
git worktree list --porcelain
git remote -v
```

Expected:
- `develop` and `master` both exist locally
- `origin` points to `https://github.com/Infinite-LearningV1/Infinite_Track_Fe.git`
- `personal-origin` still exists
- no destructive cleanup is required

- [ ] **Step 2: Confirm `develop` and `master` still point to the expected remote branches**

Run:
```bash
git rev-parse develop origin/develop master origin/master
```

Expected:
- all commands return commit hashes
- if `develop` and `master` are still aligned, hashes may be identical
- no missing refs

- [ ] **Step 3: Record that the repo is ready for workflow enforcement**

Write down this exact checklist in the execution log or handoff notes:
```text
- origin is org remote
- personal-origin preserved
- develop exists
- master exists
- local work preserved
- no reset/rebase/force-push required
```

- [ ] **Step 4: Commit**

Do not create a commit in this task. This is a verification-only task.

---

### Task 2: Align local daily-use branch defaults safely

**Files:**
- Modify: `.git/config` (through git commands only)
- Test: none

- [ ] **Step 1: Verify the current checked-out branch and upstreams**

Run:
```bash
git branch -vv
```

Expected:
- output clearly shows which branch is checked out and which upstream each branch tracks

- [ ] **Step 2: If the main working checkout is not already on `develop`, switch only if the working tree is compatible**

Run:
```bash
git status --short
```

Expected:
- if there are local modifications that would block branch switching, do **not** force a checkout
- if branch switching is blocked, leave the current branch in place and continue with GitHub-side workflow enforcement first

If clean enough to switch safely, run:
```bash
git checkout develop
```

Expected:
- branch changes to `develop`
- no local changes lost

- [ ] **Step 3: Ensure local `develop` tracks `origin/develop`**

Run:
```bash
git branch --set-upstream-to=origin/develop develop
```

Expected:
- Git reports that `develop` now tracks `origin/develop`

- [ ] **Step 4: Verify upstream alignment again**

Run:
```bash
git branch -vv
```

Expected:
- `develop` shows `[origin/develop]`
- `master` shows `[origin/master]`

- [ ] **Step 5: Commit**

Do not create a commit in this task. This task changes local branch tracking/default usage only.

---

### Task 3: Enforce GitHub default branch and branch protection policy

**Files:**
- Modify: external GitHub repository settings only
- Test: none

- [ ] **Step 1: Verify the GitHub default branch is `develop`**

Check in GitHub repository settings:
```text
Settings -> Default branch
```

Expected:
- default branch is `develop`

If not already set, change it to:
```text
develop
```

- [ ] **Step 2: Configure `develop` protection rules**

Apply these exact rules in GitHub branch protection for `develop`:
```text
- Require a pull request before merging
- Require at least 1 approval
- Require status checks to pass before merging
- Restrict direct pushes
- Enforce linear history
```

Expected:
- merge commits are effectively disallowed on `develop`
- day-to-day work must arrive by PR

- [ ] **Step 3: Configure `master` protection rules**

Apply these exact rules in GitHub branch protection for `master`:
```text
- Require a pull request before merging
- Require at least 1 approval (or stricter if preferred)
- Require status checks to pass before merging
- Restrict direct pushes
- Do not require linear history
```

Expected:
- `master` supports explicit merge commits for release PRs and hotfix PRs

- [ ] **Step 4: Configure repository merge strategy settings**

Check GitHub repository merge settings and ensure they support the desired model:
```text
- Allow squash merge: enabled
- Allow rebase merge: enabled (optional but acceptable for develop)
- Allow merge commit: enabled
```

Expected:
- `develop` can stay linear via protection/rules and team practice
- `master` can preserve release merge commits

- [ ] **Step 5: Record the required status check names used by GitHub**

Write down the exact required check names that appear in GitHub branch protection, for example:
```text
- build
- ci / build
- webpack-build
```

Expected:
- exact check names are recorded from GitHub UI, not guessed

- [ ] **Step 6: Commit**

Do not create a git commit in this task. GitHub settings are external configuration.

---

### Task 4: Verify CI/build expectation for protected branches

**Files:**
- Modify: none unless a workflow file already exists and needs targeted edits
- Test: repo build command

- [ ] **Step 1: Check whether CI workflow files already exist**

Run:
```bash
ls -la .github/workflows
```

Expected:
- either existing workflow files are visible
- or the directory is missing/empty, which means required checks may not yet be enforceable

- [ ] **Step 2: Run the existing build locally to validate the current check candidate**

Run:
```bash
npm run build
```

Expected:
- webpack production build succeeds with exit code `0`

- [ ] **Step 3: Decide the enforcement path based on actual CI state**

If GitHub Actions or another CI system already exposes a stable build check:
```text
Use that exact check name in branch protection.
```

If no CI check exists yet:
```text
Do not guess a required check name.
Pause branch protection finalization until a real CI build check exists.
```

- [ ] **Step 4: If workflow files already exist, verify they run on both `develop` and `master` PRs**

Check the workflow trigger content for branch coverage like:
```yaml
on:
  pull_request:
    branches:
      - develop
      - master
```

Expected:
- both integration and release PRs are covered

- [ ] **Step 5: Commit**

Do not create a commit unless a real workflow file required a targeted fix and was intentionally edited.

---

### Task 5: Document the branch workflow for future contributors

**Files:**
- Modify: `README.md`
- Optional Create: `docs/git-workflow.md`
- Test: none

- [ ] **Step 1: Decide where the workflow note should live**

Use this rule:
```text
If a short workflow section fits cleanly in README.md, update README.md.
If the workflow needs more detail, create docs/git-workflow.md and link it from README.md.
```

Expected:
- one source of truth, not duplicated prose in multiple places

- [ ] **Step 2: Add the minimal contributor workflow text**

If editing `README.md`, add content equivalent to:
```md
## Git Workflow

- Create `feature/*` and `fix/*` branches from `develop`
- Open pull requests into `develop` for normal work
- Promote release-ready changes from `develop` to `master` via pull request
- Create urgent `hotfix/*` branches from `master`
- After hotfixes merge into `master`, sync them back into `develop`
- Do not push directly to `develop` or `master`
```

If creating `docs/git-workflow.md`, use this content:
```md
# Git Workflow

## Branch roles
- `develop`: integration branch
- `master`: stable / release-ready branch

## Branch rules
- `feature/*` and `fix/*` branch from `develop` and return to `develop` by pull request
- `hotfix/*` branches from `master` and returns to `master` by pull request
- Every hotfix merged into `master` must be synchronized back into `develop`

## Guardrails
- No direct push to `develop`
- No direct push to `master`
- Use pull requests for all integration
```

- [ ] **Step 3: Verify the documentation is consistent with the approved spec**

Check against:
```text
docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md
```

Expected:
- branch roles and target PR rules match exactly

- [ ] **Step 4: Commit**

If documentation changed, commit with:
```bash
git add README.md docs/git-workflow.md
git commit -m "docs: add lightweight git flow workflow"
```

Expected:
- commit created only if docs were actually changed

---

### Task 6: Verify the final operating model end-to-end

**Files:**
- Modify: none
- Test: workflow verification

- [ ] **Step 1: Re-check branch tracking and local defaults**

Run:
```bash
git branch -vv
git remote show origin
```

Expected:
- `develop` tracks `origin/develop`
- `master` tracks `origin/master`
- remote default branch information is consistent with the intended model

- [ ] **Step 2: Verify protected-branch behavior in GitHub**

Confirm manually in GitHub UI:
```text
- develop requires PR and approval
- master requires PR and approval
- develop enforces linear history
- master permits merge commits
```

Expected:
- rules match the approved spec

- [ ] **Step 3: Verify release path is understandable**

Use this checklist:
```text
Normal work: feature/fix -> develop
Release: develop -> master
Hotfix: hotfix -> master -> back-sync to develop
```

Expected:
- no ambiguous branch target remains

- [ ] **Step 4: Capture rollout cautions for the team**

Write down these exact cautions in the handoff notes:
```text
- Do not open normal feature PRs to master
- Do not forget hotfix sync back to develop
- Do not mark CI checks as required until the exact real check names are confirmed
- Do not use force-push to make the workflow fit
```

- [ ] **Step 5: Commit**

Do not create a commit in this task unless final documentation or workflow files changed and were intentionally staged.

---

## Self-review

### Spec coverage
- Branch roles: covered in Tasks 2, 3, 5, and 6
- Develop as integration branch: covered in Tasks 2, 3, 5, and 6
- Master as stable/release-ready branch: covered in Tasks 3, 5, and 6
- PR + approval + CI rules: covered in Task 3
- Linear develop history: covered in Task 3
- Merge commits allowed on master: covered in Task 3
- Release flow `develop -> master`: covered in Tasks 3, 5, and 6
- Hotfix flow `master -> develop` recovery: covered in Tasks 3, 5, and 6

### Placeholder scan
- No TODO/TBD placeholders remain
- No guessed CI check names are used as implementation facts
- External GitHub actions are described explicitly rather than implied

### Type and naming consistency
- Branch names are consistently `develop`, `master`, `feature/*`, `fix/*`, and `hotfix/*`
- Release direction is consistently `develop -> master`
- Hotfix recovery direction is consistently `master -> develop`
