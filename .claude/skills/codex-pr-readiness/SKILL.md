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
  - "**"
---

# codex-pr-readiness

## Purpose
Use this skill before claiming that a change is ready for PR.

## Output contract compatibility
- This skill defines a governance-specific readiness verdict shape.
- It does not replace the repo-wide 10-part Web FE task response contract in `CLAUDE.md`.
- When the surrounding response is a Web FE task report, preserve the 10-part format and embed this readiness result in the relevant verification or review/PR sections.

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
