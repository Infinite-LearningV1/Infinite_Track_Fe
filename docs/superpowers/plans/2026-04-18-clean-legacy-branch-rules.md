# Clean Legacy Branch Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove explicitly conflicting legacy branch workflow guidance from historical docs so the repo no longer declares branch models that contradict the new official `feature/* -> develop -> master` promotion flow.

**Architecture:** Treat this as a documentation-consistency cleanup: update only the historical spec/plan files that still declare alternate branch paths such as `feature -> deploy -> master` or `hotfix -> master`. Do not rewrite unrelated content; only replace or neutralize the conflicting guidance so the docs converge on one branch model.

**Tech Stack:** Git workflow documentation, Markdown docs, repository policy cleanup

---

## File Structure Map

- `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-15-inf-138-deploy-branch-cicd-baseline-design.md` — historical design doc that explicitly declares `feature/fix -> deploy -> master`; must be normalized.
- `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/plans/2026-04-15-inf-138-deploy-branch-cicd-baseline.md` — historical implementation plan that operationalizes `deploy` as the PR base; must be normalized.
- `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md` — historical design doc that allows `hotfix/* -> master`; must be aligned to the newer rule if that path is no longer allowed.
- `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-18-branch-promotion-workflow-design.md` — current approved source of truth for the new workflow; use this to keep wording aligned.

### Task 1: Normalize deploy-bridge docs to the new promotion flow

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-15-inf-138-deploy-branch-cicd-baseline-design.md`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/plans/2026-04-15-inf-138-deploy-branch-cicd-baseline.md`
- Test: search for removed `deploy`-bridge branch guidance

- [ ] **Step 1: Locate all explicit `deploy`-bridge branch rules in the two historical docs**

Run:
```bash
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-15-inf-138-deploy-branch-cicd-baseline-design.md"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/plans/2026-04-15-inf-138-deploy-branch-cicd-baseline.md"),
]
needles = ["deploy -> master", "--base deploy", "feature/", "fix/*", "deploy branch"]
for path in files:
    print(f"\n== {path.name} ==")
    for i, line in enumerate(path.read_text().splitlines(), start=1):
        if any(needle in line for needle in needles):
            print(f"{i}: {line}")
PY
```
Expected:
- Output identifies the exact lines that still operationalize `deploy` as the bridge to `master`.

- [ ] **Step 2: Replace the old deploy-bridge policy statements with the new primary flow**

In both historical docs, replace any explicit workflow statements of the form:
- `feature/* / fix/* -> deploy -> master`
- references that `deploy` is the required PR base for release flow
- command examples using `--base deploy` for the official release path

with wording aligned to the new official branch model:

```md
Primary workflow: `feature/*` -> `develop` via PR review -> `master` via controlled promotion when release-ready.
```

When adjusting prose, preserve the surrounding historical context, but remove any sentence that frames `deploy` as the required bridge branch for normal delivery.

- [ ] **Step 3: Verify the old deploy-bridge declarations are gone**

Run:
```bash
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-15-inf-138-deploy-branch-cicd-baseline-design.md"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/plans/2026-04-15-inf-138-deploy-branch-cicd-baseline.md"),
]
forbidden = [
    "feature/* / fix/* -> deploy -> master",
    "feature/fix -> deploy -> master",
    "--base deploy",
]
for path in files:
    text = path.read_text()
    for item in forbidden:
        if item in text:
            raise SystemExit(f"legacy deploy rule still present in {path.name}: {item}")
print("deploy-bridge rules removed")
PY
```
Expected:
- Script prints `deploy-bridge rules removed`.

- [ ] **Step 4: Review the scoped diff for the two normalized docs**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- docs/superpowers/specs/2026-04-15-inf-138-deploy-branch-cicd-baseline-design.md docs/superpowers/plans/2026-04-15-inf-138-deploy-branch-cicd-baseline.md
```
Expected:
- Diff shows only branch-rule normalization, not unrelated content churn.

- [ ] **Step 5: Commit the deploy-bridge cleanup**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add docs/superpowers/specs/2026-04-15-inf-138-deploy-branch-cicd-baseline-design.md docs/superpowers/plans/2026-04-15-inf-138-deploy-branch-cicd-baseline.md
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: remove deploy bridge branch guidance"
```
Expected:
- One commit containing only the deploy-bridge workflow cleanup.

### Task 2: Remove the legacy hotfix-direct-to-master rule from the lightweight git flow doc

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md`
- Test: search for `hotfix/* -> master` and equivalent phrasing

- [ ] **Step 1: Locate the exact hotfix-to-master declarations in the lightweight git flow spec**

Run:
```bash
python - <<'PY'
from pathlib import Path
path = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md")
needles = ["hotfix", "master", "direct", "feature/*", "develop"]
for i, line in enumerate(path.read_text().splitlines(), start=1):
    if any(needle in line for needle in needles):
        print(f"{i}: {line}")
PY
```
Expected:
- Output identifies the lines where direct `hotfix/* -> master` is declared or implied.

- [ ] **Step 2: Rewrite the conflicting hotfix path so it no longer bypasses `develop` as the normal documented rule**

Replace any explicit rule that says or implies `hotfix/*` goes directly to `master` with wording aligned to the new official workflow, for example:

```md
All change branches, including urgent fixes, should follow the documented promotion flow: `feature/*` (or an explicitly named fix branch) -> `develop` via PR review -> `master` via controlled promotion when the release state is ready.
```

Preserve the historical document’s purpose, but remove the bypass path as an active recommendation.

- [ ] **Step 3: Verify the old hotfix bypass rule is gone**

Run:
```bash
python - <<'PY'
from pathlib import Path
path = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md")
text = path.read_text()
forbidden = [
    "hotfix/* -> master",
    "hotfix/* → master",
    "directly to master",
]
for item in forbidden:
    if item in text:
        raise SystemExit(f"legacy hotfix rule still present: {item}")
print("hotfix bypass rule removed")
PY
```
Expected:
- Script prints `hotfix bypass rule removed`.

- [ ] **Step 4: Review the scoped diff for the lightweight git flow doc**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md
```
Expected:
- Diff shows only the hotfix-rule normalization.

- [ ] **Step 5: Commit the hotfix-rule cleanup**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: remove direct hotfix path to master"
```
Expected:
- One commit containing only the historical hotfix-rule cleanup.

### Task 3: Cross-check that no historical docs still declare an alternate primary branch model

**Files:**
- Modify if needed: any of the three historical docs above only if the cross-check reveals missed contradictory text
- Test: combined search across the targeted docs plus the new source-of-truth spec

- [ ] **Step 1: Search the targeted historical docs for old branch models after cleanup**

Run:
```bash
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-15-inf-138-deploy-branch-cicd-baseline-design.md"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/plans/2026-04-15-inf-138-deploy-branch-cicd-baseline.md"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-18-branch-promotion-workflow-design.md"),
]
for path in files:
    print(f"\n== {path.name} ==")
    for i, line in enumerate(path.read_text().splitlines(), start=1):
        if any(term in line for term in ["deploy -> master", "--base deploy", "hotfix", "feature/*", "develop", "master"]):
            print(f"{i}: {line}")
PY
```
Expected:
- Historical docs should no longer declare `deploy` as the normal bridge branch or `hotfix/* -> master` as the recommended path.
- The 2026-04-18 workflow spec remains the clear source of truth.

- [ ] **Step 2: If any contradictory sentence remains, replace it with a cross-reference to the official workflow**

If any targeted historical doc still reads like an active alternate workflow, replace the conflicting sentence with this exact note:

```md
This historical document no longer defines the primary branch workflow; follow the official branch-promotion rule: `feature/*` -> `develop` via PR review -> `master` via controlled promotion.
```

If no contradictions remain, do not change files in this step.

- [ ] **Step 3: Verify the final workflow language converges on one primary model**

Run:
```bash
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-15-inf-138-deploy-branch-cicd-baseline-design.md"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/plans/2026-04-15-inf-138-deploy-branch-cicd-baseline.md"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md"),
]
forbidden = ["--base deploy", "deploy -> master", "hotfix/* -> master"]
for path in files:
    text = path.read_text()
    for item in forbidden:
        if item in text:
            raise SystemExit(f"conflicting branch rule still present in {path.name}: {item}")
print("legacy branch workflow conflicts removed")
PY
```
Expected:
- Script prints `legacy branch workflow conflicts removed`.

- [ ] **Step 4: Review the final combined diff for historical-doc scope only**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- docs/superpowers/specs/2026-04-15-inf-138-deploy-branch-cicd-baseline-design.md docs/superpowers/plans/2026-04-15-inf-138-deploy-branch-cicd-baseline.md docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md
```
Expected:
- Diff is limited to branch-rule cleanup in the targeted historical docs.

- [ ] **Step 5: Commit the final historical-doc cross-check only if Step 2 changed files**

If Step 2 changed any targeted file, run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add docs/superpowers/specs/2026-04-15-inf-138-deploy-branch-cicd-baseline-design.md docs/superpowers/plans/2026-04-15-inf-138-deploy-branch-cicd-baseline.md docs/superpowers/specs/2026-04-13-lightweight-git-flow-design.md
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: align historical branch workflow guidance"
```

If Step 2 made no file changes, do not create an empty commit.

## Self-Review Checklist

- Spec coverage: this plan removes the explicit legacy deploy-bridge rule, removes the direct-hotfix-to-master rule, and cross-checks that historical docs now converge on the new official branch model.
- Placeholder scan: there are no `TODO`/`TBD` markers; every documentation change includes exact files, exact replacement rules, and exact verification commands.
- Type consistency: the same official branch model is used everywhere in the plan — `feature/*` -> `develop` via PR review -> `master` via controlled promotion.
