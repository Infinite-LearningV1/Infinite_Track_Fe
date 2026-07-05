# Code Review Governance Standardization Design

## Purpose

Standardize the repository's code review workflow so it becomes disciplined, repeatable, and operationally clear. The target is to make Claude Code the primary builder/executor, Codex the parallel reviewer/challenger/rescue investigator, and GitHub CLI the default governance path.

## Current context

- Codex plugin for Claude Code is installed and operational.
- Core Codex review and rescue commands are available in the active plugin set.
- The repository already has local Web FE review-oriented skills and hooks.
- The current gaps are not plugin installation gaps anymore; they are standardization and enforcement gaps.
- The main gaps identified across policy points D–M are:
  - decision routing for when to use each Codex command
  - standard output formatting after Codex results
  - PR readiness gate
  - soft enforcement of default operating mode and prohibitions

## Goals

- Make the trigger matrix for Codex commands operational and repeatable.
- Ensure every Codex result is translated into a structured review summary.
- Prevent PR-readiness claims from being based on intuition alone.
- Preserve Claude Code as the primary builder and final decision-maker.
- Preserve Codex as a reviewer, challenger, and rescue investigator rather than a default builder.
- Keep GitHub CLI as the default governance path.
- Standardize review discipline without introducing unnecessarily heavy process.

## Non-goals

- Replace Claude Code as the primary coding agent.
- Turn the repository workflow into a hard-gated bureaucratic process.
- Rebuild existing domain review skills that already serve Web FE-specific concerns.
- Expand into QA or DevOps process redesign.

## Recommended approach

Use a balanced full-standardization model that adds operational rails without changing the repository's core lifecycle too aggressively.

The design is divided into four components:

1. Decision Layer
2. Result Layer
3. Readiness Layer
4. Governance Layer

## Component 1 — Decision Layer

### Objective

Operationalize the trigger matrix so command selection is no longer based on memory alone.

### Proposed skill

`codex-trigger-matrix`

### Responsibility

This skill determines whether a task:

- does not require Codex yet
- requires `/codex:review`
- requires `/codex:adversarial-review`
- requires `/codex:rescue`
- should prefer background mode

### Inputs

- change summary
- file/area scope
- risk tier
- early verification state

### Required output

- Codex command decision
- whether background mode is recommended
- concise justification for the route taken

### Decision rules

#### Route to `/codex:review`

Use when:

- changes are stable enough for review
- general implementation quality review is needed
- multi-file work has passed initial local verification
- the work is approaching PR readiness
- a large revision needs a second pass

#### Route to `/codex:adversarial-review`

Use when:

- risk tier is medium or high
- changes affect auth, permissions, roles, tokens, sessions, credentials, or trust boundaries
- changes affect important business rules
- changes affect persistence, retries, rollback, idempotency, queueing, scheduler behavior, caching, concurrency, or race-risk areas
- the chosen design has meaningful tradeoffs that should be challenged
- failure modes and hidden assumptions need pressure-testing

#### Route to `/codex:rescue`

Use when:

- investigation is stuck
- root cause is unclear
- regression source is hard to localize
- flaky or unstable failure requires narrowing
- an alternate line of investigation is needed

### Boundary

This skill decides the route. It does not perform the review itself.

## Component 2 — Result Layer

### Objective

Operationalize the mandatory post-Codex output format so Codex output is never left raw.

### Proposed skill

`codex-review-summary`

### Responsibility

Translate raw Codex output into a review-ready, traceable summary.

### Inputs

- purpose of the Codex invocation
- raw Codex result
- change context
- risk tier
- local verification state

### Mandatory output shape

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

### Special handling for `/codex:adversarial-review`

The result summary must also explicitly separate:

- blocker risk
- non-blocking risk
- test gap
- design concern
- follow-up candidate

### Special handling for `/codex:rescue`

The result summary must also explicitly include:

- root-cause confidence
- fix confidence
- unresolved uncertainty
- verification debt

### Boundary

This skill reframes output. It does not decide implementation changes on its own.

## Component 3 — Readiness Layer

### Objective

Operationalize author readiness and PR readiness so readiness claims are evidence-based.

### Proposed skill

`codex-pr-readiness`

### Responsibility

Determine whether a change is:

- not review-ready
- review-ready but not PR-ready
- PR-ready with follow-up notes
- not PR-ready

### Inputs

- change summary
- file scope
- risk tier
- self-review status
- local verification status
- Codex review results where required
- known concerns and unresolved items

### Checks performed

#### Author readiness

- Is the change mature enough for serious review?
- Is the scope clear?
- Have correctness and maintainability concerns been considered?
- Has adjacent impact been considered?

#### Verification readiness

- Have relevant local tests been run?
- Are results recorded?
- Are verification gaps stated explicitly?

#### Review readiness

- If the trigger matrix requires Codex review, has it been performed?
- Have Codex findings been fixed, deferred, or explicitly accepted?

#### PR artifact readiness

- Is the change summary clear?
- Are risk notes visible?
- Are test notes visible?
- Are unresolved issues exposed instead of hidden?

### Boundary

This skill evaluates readiness. It does not replace review or testing.

## Component 4 — Governance Layer

### Objective

Make the full policy set D–M durable and repeatable without over-bureaucratizing normal work.

### Governance artifacts

#### A. `docs/code-review-governance.md`

A repository-level source of truth covering:

- Claude vs Codex role split
- trigger matrix
- result summary rules
- PR readiness rules
- GitHub CLI-first governance
- prohibitions
- default operating mode

#### B. Soft reminder hooks (optional)

Use lightweight reminders rather than hard stops at key moments:

- when risk tier is medium/high
- when a PR-readiness claim is about to be made
- when Codex review appears required but has not yet been invoked

These reminders should nudge rather than block by default.

#### C. Integration with existing repo review assets

Do not replace existing Web FE-specific review assets.
Instead:

- keep `webfe-review` for Web FE review-ready framing
- keep `webfe-contract-reviewer` for correctness-sensitive contract review
- keep existing verification/docs hooks where they help
- place the new standardization skills above them as governance/meta-layer tools

#### D. GitHub CLI-first governance

Use `gh` and `gh api` as the standard path for:

- PR creation and editing
- checks inspection
- ruleset inspection
- governance verification
- issue/PR linkage

#### E. Background-first review habit

For large or multi-file reviews:

- prefer `--background`
- use `/codex:status`
- read output via `/codex:result`
- cancel stale work via `/codex:cancel`

## Proposed implementation units

- `.claude/skills/codex-trigger-matrix/SKILL.md`
- `.claude/skills/codex-review-summary/SKILL.md`
- `.claude/skills/codex-pr-readiness/SKILL.md`
- `docs/code-review-governance.md`
- optional adjustments to `.claude/settings.json` for soft reminders only if clearly beneficial

## Expected outcomes

If implemented correctly, the repository will gain:

- repeatable command selection for Codex use
- consistent structured summaries after every Codex call
- clearer review and PR-readiness gates
- stronger separation between builder and reviewer roles
- stronger operational traceability without excessive workflow friction

## Risks and failure modes

- Too many overlapping skills can confuse usage if boundaries are not explicit.
- If hooks become too aggressive, they may damage the workflow they are meant to support.
- If the trigger matrix is too vague, users will still make inconsistent Codex routing decisions.
- If readiness checks are too weak, the policy will remain aspirational instead of operational.

## Design principles

- Claude Code remains the primary builder and final owner.
- Codex remains reviewer/challenger/rescue, not default builder.
- GitHub CLI remains the default governance path.
- Enforcement should be strongest at decision points and weakest at routine authoring moments.
- Existing domain-specific review skills should be preserved and composed, not replaced.

## Success criteria

The standardization is successful when:

- a user can consistently determine which Codex command to use
- raw Codex output is no longer presented directly
- PR readiness claims always reference verification and review state
- medium/high-risk changes are much less likely to skip challenge review
- the workflow feels more disciplined without becoming burdensome
