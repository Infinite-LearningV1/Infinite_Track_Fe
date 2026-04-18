# Branch Promotion Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the repo’s implicit git workflow rules with an explicit branch-promotion policy where all work starts on `feature/*`, merges to `develop` require PR review, and `master` is updated only by controlled promotion from `develop` when release-ready.

**Architecture:** Treat repository documentation as the source of truth for the workflow change, updating the minimal set of policy-facing files that currently shape how contributors work. The implementation should define branch roles, merge paths, and release gates clearly without changing application code or trying to automate branch protection in this phase.

**Tech Stack:** Git workflow policy, Markdown documentation, repository conventions

---

## File Structure Map

- `E:/skrisi/clonefee/Infinite_Track_Fe/README.md` — public onboarding doc; if it currently mentions repo workflow expectations, it should reflect the new branch model or link to the policy source.
- `E:/skrisi/clonefee/Infinite_Track_Fe/AGENTS.md` — repo-level operating guidance already exists and is the most likely place to record branch workflow rules used during engineering/review work.
- `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-18-branch-promotion-workflow-design.md` — approved design/spec for the new workflow.
- `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/plans/2026-04-18-branch-promotion-workflow.md` — this implementation plan.

### Task 1: Add the official branch-promotion policy to repo guidance

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/AGENTS.md`
- Test: policy text inspection in `E:/skrisi/clonefee/Infinite_Track_Fe/AGENTS.md`

- [ ] **Step 1: Inspect the current repo guidance to find the best insertion point**

Run:
```bash
python - <<'PY'
from pathlib import Path
path = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/AGENTS.md")
text = path.read_text().splitlines()
for i, line in enumerate(text, start=1):
    if any(keyword in line.lower() for keyword in ["review", "runtime", "env", "linear", "severity"]):
        print(f"{i}: {line}")
PY
```
Expected:
- Output shows the structure of `AGENTS.md` so you can place the workflow policy in a coherent location rather than appending it randomly.

- [ ] **Step 2: Add a new section that defines branch roles and allowed merge paths**

Insert this exact section into `E:/skrisi/clonefee/Infinite_Track_Fe/AGENTS.md` at a location where repo workflow rules fit naturally (for example after the introductory review guidance and before detailed risk areas):

```md
## Branch promotion workflow

This repo uses a branch-promotion model:

- All new work starts from a dedicated `feature/*` branch.
- Feature work must not be done directly on `develop`.
- Feature work must not be done directly on `master`.
- `develop` is the integration branch. Feature branches merge into `develop` only through PR review.
- `master` is the final deployable branch. It must not receive feature work directly.
- `master` is updated only by promoting a release-ready state from `develop`.

### Required merge path
- `feature/*` -> PR review -> `develop`
- `develop` -> controlled promotion -> `master`

### Release gate for `develop` -> `master`
Promote to `master` only when:
- the relevant changes in `develop` have already been reviewed
- minimum verification for the release is passing
- the `develop` snapshot is considered clean and release-ready

### Not allowed as the normal workflow
- direct feature work on `develop`
- direct feature work on `master`
- direct feature branch merges to `master`
- using `master` as an integration branch
```

- [ ] **Step 3: Verify the new policy text is present and internally consistent**

Run:
```bash
python - <<'PY'
from pathlib import Path
path = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/AGENTS.md")
text = path.read_text()
required = [
    "## Branch promotion workflow",
    "All new work starts from a dedicated `feature/*` branch.",
    "Feature branches merge into `develop` only through PR review.",
    "`master` is updated only by promoting a release-ready state from `develop`.",
    "feature/*` -> PR review -> `develop`",
    "develop` -> controlled promotion -> `master`",
]
for item in required:
    if item not in text:
        raise SystemExit(f"missing policy text: {item}")
print("branch policy text verified")
PY
```
Expected:
- Script prints `branch policy text verified`.

- [ ] **Step 4: Review the final diff for AGENTS-only workflow scope**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- AGENTS.md
```
Expected:
- Diff shows only the new branch-promotion guidance in `AGENTS.md` for this task.

- [ ] **Step 5: Commit the repo guidance update**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add AGENTS.md
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: define branch promotion workflow"
```
Expected:
- One commit containing only the authoritative workflow guidance update.

### Task 2: Add contributor-facing workflow documentation in the README

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/README.md`
- Test: policy text inspection in `E:/skrisi/clonefee/Infinite_Track_Fe/README.md`

- [ ] **Step 1: Find the most appropriate README section for contribution workflow guidance**

Run:
```bash
python - <<'PY'
from pathlib import Path
path = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/README.md")
for i, line in enumerate(path.read_text().splitlines(), start=1):
    if any(keyword in line.lower() for keyword in ["installation", "components", "update logs", "support"]):
        print(f"{i}: {line}")
PY
```
Expected:
- Output gives you enough context to insert a concise workflow section in a logical place.

- [ ] **Step 2: Add a concise contributor workflow section to the README**

Insert this exact section into `E:/skrisi/clonefee/Infinite_Track_Fe/README.md` in a contributor-facing location (for example after Installation and before Components):

```md
## Branch Workflow

This repository uses a branch-promotion workflow:

- Start every new case or change from a dedicated `feature/*` branch.
- Merge feature work into `develop` only through PR review.
- Treat `develop` as the integration branch where reviewed changes are held before release.
- Treat `master` as the final clean branch that is updated only when `develop` is ready to deploy.

In short:
- `feature/*` -> `develop` via PR review
- `develop` -> `master` via controlled release promotion
```

- [ ] **Step 3: Verify the README now reflects the same branch model as AGENTS.md**

Run:
```bash
python - <<'PY'
from pathlib import Path
path = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/README.md")
text = path.read_text()
required = [
    "## Branch Workflow",
    "Start every new case or change from a dedicated `feature/*` branch.",
    "Merge feature work into `develop` only through PR review.",
    "Treat `master` as the final clean branch that is updated only when `develop` is ready to deploy.",
]
for item in required:
    if item not in text:
        raise SystemExit(f"missing README workflow text: {item}")
print("readme workflow text verified")
PY
```
Expected:
- Script prints `readme workflow text verified`.

- [ ] **Step 4: Review the final diff for README-only workflow scope**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- README.md
```
Expected:
- Diff shows only the new README branch-workflow section for this task.

- [ ] **Step 5: Commit the contributor-facing workflow docs**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add README.md
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: document branch promotion flow"
```
Expected:
- One commit containing only the README workflow update.

### Task 3: Cross-check the policy, document the current branch reality, and leave no ambiguity

**Files:**
- Modify if needed: `E:/skrisi/clonefee/Infinite_Track_Fe/AGENTS.md`
- Modify if needed: `E:/skrisi/clonefee/Infinite_Track_Fe/README.md`
- Test: combined policy verification

- [ ] **Step 1: Inspect the current branch topology so the docs match repo reality**

Run:
```bash
cd "E:/skrisi/clonefee/Infinite_Track_Fe" && git branch -a && echo SEP && git remote show origin
```
Expected:
- Output confirms the repo still has `develop`, `master`, and possibly `deploy` or other historical branches.
- Use this only to make sure the docs do not claim branches were deleted if they still exist.

- [ ] **Step 2: If needed, add one short clarification that historical branches may still exist but are not the primary workflow**

If the docs would otherwise imply that only `feature/*`, `develop`, and `master` exist, add this exact sentence to the branch workflow guidance in `AGENTS.md` or `README.md` (where it fits best):

```md
Other historical or auxiliary branches may still exist in the repository, but the primary workflow is `feature/*` -> `develop` -> `master`.
```

If the existing wording is already clear enough without this sentence, leave the files unchanged in this step.

- [ ] **Step 3: Verify the final documented workflow is explicit and non-contradictory**

Run:
```bash
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/AGENTS.md"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/README.md"),
]
combined = "\n".join(path.read_text() for path in files)
required = [
    "feature/*",
    "develop",
    "master",
    "PR review",
]
for item in required:
    if item not in combined:
        raise SystemExit(f"missing workflow keyword: {item}")
for forbidden in [
    "work directly on develop",
    "feature branch merges directly to master",
]:
    if forbidden in combined:
        raise SystemExit(f"unexpected contradictory text present: {forbidden}")
print("workflow documentation cross-check passed")
PY
```
Expected:
- Script prints `workflow documentation cross-check passed`.

- [ ] **Step 4: Review the combined diff to ensure only workflow documentation changed**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- AGENTS.md README.md
```
Expected:
- Diff is limited to the branch workflow rule changes.

- [ ] **Step 5: Commit the final workflow clarification if this task changed files**

If Task 3 changed `AGENTS.md` and/or `README.md`, run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add AGENTS.md README.md
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: clarify release promotion rules"
```

If Task 3 made no file changes, do not create an empty commit.

## Self-Review Checklist

- Spec coverage: this plan implements the approved workflow by documenting branch roles, required merge paths, and release gates in the repo’s policy-facing documentation.
- Placeholder scan: there are no `TODO`/`TBD` markers; every documentation change includes exact text and exact verification commands.
- Type consistency: the same workflow terms are used consistently throughout the plan — `feature/*`, `develop`, `master`, PR review, and controlled promotion.
