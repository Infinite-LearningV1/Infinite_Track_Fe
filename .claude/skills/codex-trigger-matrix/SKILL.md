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
  - "**"
---

# codex-trigger-matrix

## Purpose
Use this skill to operationalize the repository's review trigger matrix before invoking any Codex command.

## Output contract compatibility
- This skill defines a governance-specific decision shape.
- It does not replace the repo-wide 10-part Web FE task response contract in `CLAUDE.md`.
- When the surrounding response is a Web FE task report, preserve the 10-part format and embed this decision output in the relevant verification or review sections.

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
