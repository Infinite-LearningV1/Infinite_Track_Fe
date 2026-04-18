# Code Review Governance Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a balanced full-standardization layer for code review governance across policy points D–M using local skills, repository documentation, and lightweight operational verification.

**Architecture:** The implementation adds three governance-layer skills and one repository-level governance document without depending on repository-tracked governance assets that are not actually present in-tree. Local-only Claude tooling that exists outside the tracked branch baseline may be consulted as reference, but this implementation must not depend on untracked hooks, agents, or settings being present.

**Tech Stack:** Claude Code local skills (`.claude/skills`), Markdown documentation, Claude Code plugin commands, GitHub CLI (`gh`), Codex plugin for Claude Code

---

## File structure and responsibility map

- Create: `.claude/skills/codex-trigger-matrix/SKILL.md`
  - Decides which Codex command path is required for a given task and whether background mode is recommended.
- Create: `.claude/skills/codex-review-summary/SKILL.md`
  - Converts raw Codex output into the repository's mandatory structured review summary.
- Create: `.claude/skills/codex-pr-readiness/SKILL.md`
  - Evaluates author readiness, review readiness, verification readiness, and PR readiness.
- Create: `docs/code-review-governance.md`
  - Repository-facing source of truth for the D–M governance policy.
- Modify: `docs/superpowers/specs/2026-04-13-code-review-governance-standardization-design.md`
  - Only if a wording fix is needed during implementation review.
- Modify: `.claude/settings.json`
  - Only if a clearly beneficial soft reminder hook is added after skill implementation proves the need.

## Existing baseline assumptions

This implementation should not assume repository-tracked governance assets such as `CLAUDE.md`, `.claude/rules`, or `docs/adr` already exist in-tree unless they are actually present on the target branch.

Local-only `.claude` hooks, agents, settings, and untracked review helpers may be consulted as reference but are not part of the tracked branch baseline for this implementation.

---

### Task 1: Verify current Codex and review-governance baseline

**Files:**
- Modify: none
- Test: operational verification only

- [ ] **Step 1: Confirm the Codex plugin commands are available in the current session**

Run in Claude Code:
```text
/reload-plugins
```

Expected:
```text
Reloaded: ... plugins ... skills ... agents ...
```

Then run:
```text
/codex:setup
```

Expected:
```text
ready: true
codex available: true
auth loggedIn: true
```

- [ ] **Step 2: Record the governance baseline actually present in the repo**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && git ls-files .claude docs CLAUDE.md | sed -n '1,120p'
```

Expected:
- the command reflects the tracked governance files that actually exist on the branch
- local-only `.claude` hooks, settings, or agents are not treated as required baseline assets
- no `codex-trigger-matrix`, `codex-review-summary`, or `codex-pr-readiness` skill exists yet in the tracked branch baseline unless it has already been added deliberately

- [ ] **Step 3: Record the current governance gap checklist in the execution notes**

Write this exact checklist into the task notes or execution log:
```text
- Decision routing not yet standardized
- Post-Codex summary format not yet standardized
- PR readiness gate not yet standardized
- Any tracked governance foundation that actually exists on the branch must be preserved
- Local-only Claude tooling is not a required branch baseline dependency
- GitHub CLI-first remains the governance path
```

- [ ] **Step 4: Commit**

Do not create a commit in this task. This is a baseline verification task only.

---

### Task 2: Create the `codex-trigger-matrix` governance skill

**Files:**
- Create: `.claude/skills/codex-trigger-matrix/SKILL.md`
- Test: reload skill registry and inspect behavior manually

- [ ] **Step 1: Create the skill directory**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && mkdir -p .claude/skills/codex-trigger-matrix
```

Expected:
- directory `.claude/skills/codex-trigger-matrix` exists

- [ ] **Step 2: Write the initial skill file**

Write this exact file to `.claude/skills/codex-trigger-matrix/SKILL.md`:
```md
---
name: codex-trigger-matrix
description: Decide whether a task requires /codex:review, /codex:adversarial-review, /codex:rescue, or no Codex call yet, and whether background mode is recommended.
disable-model-invocation: true
allowed-tools:
  - Read
  - Glob
  - Grep
  - AskUserQuestion
paths:
  - Infinite_Track_Fe/**
---

# codex-trigger-matrix

## Purpose
Use this skill to operationalize the repository's review trigger matrix before invoking any Codex command.

## Required inputs
- change summary
- file or area scope
- risk tier
- early verification state

## Required decision outputs
Return all of the following:
1. whether Codex is required yet
2. which command is required:
   - `/codex:review`
   - `/codex:adversarial-review`
   - `/codex:rescue`
   - no Codex command yet
3. whether `--background` is recommended
4. why that route was chosen

## Routing rules
### Route to `/codex:review`
Use when:
- changes are stable enough for review
- general implementation quality review is needed
- multi-file work has passed initial local verification
- the work is approaching PR readiness
- a large revision needs a second pass

### Route to `/codex:adversarial-review`
Use when:
- risk tier is medium or high
- changes affect auth, permissions, roles, tokens, sessions, credentials, or trust boundaries
- changes affect important business rules
- changes affect persistence, retries, rollback, idempotency, queueing, scheduler behavior, caching, concurrency, or race-risk areas
- the chosen design has meaningful tradeoffs that should be challenged
- failure modes and hidden assumptions need pressure-testing

### Route to `/codex:rescue`
Use when:
- investigation is stuck
- root cause is unclear
- regression source is hard to localize
- flaky or unstable failure requires narrowing
- an alternate line of investigation is needed

## Boundaries
- Do not perform the Codex review directly.
- Do not recommend `/codex:rescue` as a shortcut for ordinary coding work.
- Do not route medium/high-risk work to normal review when the policy clearly requires adversarial review.
- If the task is still too raw for meaningful review, say so explicitly.

## Required output shape
1. Tujuan perubahan
2. Scope
3. Risk tier
4. Codex command required or not
5. Why this command
6. Background recommendation
7. Immediate next step
```

- [ ] **Step 3: Reload plugins so the new skill is discoverable**

Run in Claude Code:
```text
/reload-plugins
```

Expected:
```text
Reloaded: ... skills ...
```

- [ ] **Step 4: Verify the skill content is present and readable**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && sed -n '1,220p' .claude/skills/codex-trigger-matrix/SKILL.md
```

Expected:
- frontmatter is valid
- routing rules are present
- output shape is present

- [ ] **Step 5: Commit**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && git add .claude/skills/codex-trigger-matrix/SKILL.md && git commit -m "feat: add codex trigger matrix skill"
```

Expected:
- one commit containing only the new trigger-matrix skill

---

### Task 3: Create the `codex-review-summary` governance skill

**Files:**
- Create: `.claude/skills/codex-review-summary/SKILL.md`
- Test: reload skill registry and inspect behavior manually

- [ ] **Step 1: Create the skill directory**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && mkdir -p .claude/skills/codex-review-summary
```

Expected:
- directory `.claude/skills/codex-review-summary` exists

- [ ] **Step 2: Write the skill file**

Write this exact file to `.claude/skills/codex-review-summary/SKILL.md`:
```md
---
name: codex-review-summary
description: Convert raw Codex output into the repository's mandatory structured review summary after /codex:review, /codex:adversarial-review, or /codex:rescue.
disable-model-invocation: true
allowed-tools:
  - Read
  - Glob
  - Grep
  - AskUserQuestion
paths:
  - Infinite_Track_Fe/**
---

# codex-review-summary

## Purpose
Use this skill after any Codex invocation to prevent raw Codex output from being presented directly.

## Accepted sources
- `/codex:review`
- `/codex:adversarial-review`
- `/codex:rescue`

## Required inputs
- purpose of the Codex invocation
- raw Codex result
- change context
- risk tier
- current local verification state

## Mandatory output shape
1. Ringkasan tujuan pemanggilan
2. Temuan utama
3. Severity
   - blocker
   - important
   - nice-to-have
4. Dampak ke
   - correctness
   - maintainability
   - test coverage
   - risk
5. Keputusan
   - fix now
   - pindah ke follow-up
   - catat sebagai risk accepted
6. Test yang harus ditambah / dijalankan ulang
7. Apakah perubahan sudah layak ke PR atau belum

## Special handling for `/codex:adversarial-review`
Also separate:
- blocker risk
- non-blocking risk
- test gap
- design concern
- follow-up candidate

## Special handling for `/codex:rescue`
Also include:
- root-cause confidence
- fix confidence
- unresolved uncertainty
- verification debt

## Boundaries
- Do not present raw Codex output without interpretation.
- Do not convert Codex feedback into automatic implementation instructions.
- Do not hide uncertainty when rescue confidence is low.

## Required tone
- concise
- review-ready
- evidence-oriented
- explicit about unresolved risk
```

- [ ] **Step 3: Reload plugins so the new skill is discoverable**

Run in Claude Code:
```text
/reload-plugins
```

Expected:
```text
Reloaded: ... skills ...
```

- [ ] **Step 4: Verify the file content**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && sed -n '1,240p' .claude/skills/codex-review-summary/SKILL.md
```

Expected:
- mandatory output shape is present
- adversarial handling section is present
- rescue handling section is present

- [ ] **Step 5: Commit**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && git add .claude/skills/codex-review-summary/SKILL.md && git commit -m "feat: add codex review summary skill"
```

Expected:
- one commit containing only the new review-summary skill

---

### Task 4: Create the `codex-pr-readiness` governance skill

**Files:**
- Create: `.claude/skills/codex-pr-readiness/SKILL.md`
- Test: reload skill registry and inspect behavior manually

- [ ] **Step 1: Create the skill directory**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && mkdir -p .claude/skills/codex-pr-readiness
```

Expected:
- directory `.claude/skills/codex-pr-readiness` exists

- [ ] **Step 2: Write the skill file**

Write this exact file to `.claude/skills/codex-pr-readiness/SKILL.md`:
```md
---
name: codex-pr-readiness
description: Evaluate author readiness, review readiness, verification readiness, and PR readiness before claiming a change is ready for PR.
disable-model-invocation: true
allowed-tools:
  - Read
  - Glob
  - Grep
  - AskUserQuestion
paths:
  - Infinite_Track_Fe/**
---

# codex-pr-readiness

## Purpose
Use this skill before claiming that a change is ready for PR.

## Required inputs
- change summary
- file scope
- risk tier
- self-review status
- local verification status
- Codex review results where required
- known concerns and unresolved items

## Allowed final verdicts
- not review-ready
- review-ready but not PR-ready
- PR-ready with follow-up notes
- not PR-ready

## Required checks
### Author readiness
- the change is mature enough for serious review
- scope is clear
- correctness and maintainability concerns have been considered
- adjacent impact has been considered

### Verification readiness
- relevant local tests have been run
- results are recorded
- verification gaps are stated explicitly

### Review readiness
- if the trigger matrix requires Codex review, that review has been performed
- Codex findings have been fixed, deferred, or explicitly accepted

### PR artifact readiness
- the change summary is clear
- risk notes are visible
- test notes are visible
- unresolved issues are exposed instead of hidden

## Required output shape
1. Ringkasan tujuan perubahan
2. Scope
3. Risk tier
4. Verification status
5. Codex review status
6. Remaining concerns
7. Final verdict
8. What must happen before PR, if not ready

## Boundaries
- Do not declare PR-ready without verification evidence.
- Do not skip required Codex review when the trigger matrix says it is mandatory.
- Do not hide unresolved concerns to reach a cleaner verdict.
```

- [ ] **Step 3: Reload plugins so the new skill is discoverable**

Run in Claude Code:
```text
/reload-plugins
```

Expected:
```text
Reloaded: ... skills ...
```

- [ ] **Step 4: Verify the file content**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && sed -n '1,240p' .claude/skills/codex-pr-readiness/SKILL.md
```

Expected:
- verdict list is present
- required checks are present
- boundary section is present

- [ ] **Step 5: Commit**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && git add .claude/skills/codex-pr-readiness/SKILL.md && git commit -m "feat: add codex pr readiness skill"
```

Expected:
- one commit containing only the new PR-readiness skill

---

### Task 5: Add repository-facing code review governance documentation

**Files:**
- Create: `docs/code-review-governance.md`
- Test: consistency check against approved spec

- [ ] **Step 1: Write the governance document**

Write this exact file to `docs/code-review-governance.md`:
```md
# Code Review Governance

## Role split
- Claude Code is the primary builder, executor, and final owner.
- Codex is used for parallel review, challenge review, and rescue investigation.
- GitHub CLI (`gh`) is the default governance path for PRs, checks, and rules.

## Trigger matrix
### Use `/codex:review` when:
- changes are stable enough for review
- you want a general quality pass
- multi-file changes already passed initial local verification
- work is approaching PR readiness
- a large revision needs a second pass

### Use `/codex:adversarial-review` when:
- risk tier is medium/high
- auth, permission, role, token, session, credential, or trust-boundary behavior changed
- business rules or failure-mode-sensitive logic changed
- persistence, retries, rollback, caching, concurrency, or reliability tradeoffs need challenge review

### Use `/codex:rescue` when:
- investigation is stuck
- root cause is unclear
- regression or flaky behavior needs narrowing
- an alternate investigation path is needed

## Post-Codex result format
After any Codex command, summarize the result using:
1. Ringkasan tujuan pemanggilan
2. Temuan utama
3. Severity
4. Dampak
5. Keputusan
6. Test yang harus ditambah / dijalankan ulang
7. PR readiness

## PR readiness rule
Do not claim a change is ready for PR unless:
- self-review is done
- relevant local verification is done
- required Codex review has been considered
- unresolved concerns are visible
- PR notes are clear enough for a reviewer

## CLI-first governance
Use `gh` or `gh api` for:
- creating and editing PRs
- reading checks
- inspecting rulesets
- reading repository governance state

## Prohibitions
- Do not treat Codex as the primary builder.
- Do not use rescue as a shortcut for ordinary coding work.
- Do not present raw Codex output without interpretation.
- Do not claim PR readiness without enough verification.
```

- [ ] **Step 2: Verify consistency against the approved spec**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && diff -u docs/code-review-governance.md docs/superpowers/specs/2026-04-13-code-review-governance-standardization-design.md > /tmp/governance-diff.txt || true && sed -n '1,200p' /tmp/governance-diff.txt
```

Expected:
- wording can differ
- core policy must not contradict the approved spec

- [ ] **Step 3: Optionally add a short pointer in README if the governance doc feels too hidden**

If adding a pointer to `README.md`, add this exact line under an appropriate section:
```md
- See `docs/code-review-governance.md` for repository review workflow and Codex usage rules.
```

If the governance document is already easy to find and README would become noisy, skip the README edit.

- [ ] **Step 4: Commit**

Run:
```bash
cd "/e/skrisi/clonefee/Infinite_Track_Fe" && git add docs/code-review-governance.md README.md && git commit -m "docs: add code review governance guide"
```

Expected:
- commit created with the governance document
- README is included only if it was actually changed

---

### Task 6: Verify the new governance workflow end-to-end

**Files:**
- Modify: none
- Test: operational workflow verification

- [ ] **Step 1: Reload plugins and confirm the three new skills are available**

Run in Claude Code:
```text
/reload-plugins
```

Expected:
```text
Reloaded: ... skills ...
```

Then confirm the skill names are now available in the session:
```text
codex-trigger-matrix
codex-review-summary
codex-pr-readiness
```

- [ ] **Step 2: Run a dry-run governance decision using the trigger-matrix skill**

Use a sample prompt equivalent to:
```text
We changed auth session handling across multiple files, local tests passed, and we are approaching PR readiness.
```

Expected result:
- the skill routes to `/codex:adversarial-review`
- background mode is recommended for multi-file review
- justification references risk tier and auth/session impact

- [ ] **Step 3: Run a dry-run summary formatting pass using the review-summary skill**

Use a sample Codex result excerpt like:
```text
Found one blocker: retry loop can re-submit an expired token request. Missing test for concurrent refresh. Consider simplifying fallback path.
```

Expected result:
- output is structured into the repository's mandatory 7-part summary
- severity is separated
- required tests are called out explicitly

- [ ] **Step 4: Run a dry-run PR-readiness check using the readiness skill**

Use a sample state equivalent to:
```text
Self-review done. Local tests passed. Adversarial review found one blocker not yet fixed.
```

Expected result:
- verdict is not PR-ready
- blocker remediation is called out before PR

- [ ] **Step 5: Decide whether a soft reminder hook is still necessary**

Use this decision rule:
```text
If the three skills and the governance doc are sufficient for normal disciplined usage, do not add a new hook yet.
If the workflow still feels easy to bypass in repeated practice, add a separate follow-up spec for a soft reminder hook.
```

Expected:
- no hook is added by default in this implementation pass
- hook work becomes a separate follow-up only if usage proves it necessary

- [ ] **Step 6: Commit**

Do not create a commit in this task. This is a verification and rollout-decision task.

---

## Self-review

### Spec coverage
- Decision Layer: covered by Task 2
- Result Layer: covered by Task 3
- Readiness Layer: covered by Task 4
- Governance Layer docs: covered by Task 5
- Soft enforcement kept lightweight: covered by Task 6 Step 5
- Existing Web FE review assets preserved: covered in file structure and Task 6 verification

### Placeholder scan
- No TODO/TBD placeholders remain
- No undefined skill names remain
- No hard-gated hook implementation is assumed without verification
- No guessed Codex command semantics are introduced beyond the approved spec

### Type and naming consistency
- Skill names are consistently `codex-trigger-matrix`, `codex-review-summary`, and `codex-pr-readiness`
- Governance document path is consistently `docs/code-review-governance.md`
- Existing repo review assets are referenced consistently without renaming them
