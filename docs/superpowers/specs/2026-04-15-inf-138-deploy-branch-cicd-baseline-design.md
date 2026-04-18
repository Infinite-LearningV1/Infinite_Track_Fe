# INF-138 Deploy-Branch CI/CD Baseline Design

## Purpose

Preserve the historical record of the 2026-04-15 `deploy`-bridge CI/CD proposal for `Infinite_Track_Fe` while making its superseded status explicit.

## Status

This document is historical only.

The `deploy`-bridge proposal described here is superseded by the repository's current official branch model:

- `feature/*` and `fix/*` branch from the appropriate working base
- production-facing changes are reviewed through PRs into `develop`
- release-ready changes are promoted from `develop` to `master`
- `master` remains the production deployment branch

Nothing in this document should be interpreted as active branch-flow instruction for the current repository workflow.

## Historical Context

On 2026-04-15, a lightweight CI/CD baseline was proposed around a dedicated `deploy` bridge branch between implementation branches and `master`.

The proposal was motivated by then-current repository conditions:

- `develop` and `master` existed on `origin`
- `origin/HEAD` pointed to `develop`
- no remote `deploy` branch existed yet
- no repo-owned workflows existed under `.github/workflows/*`
- the production frontend deployed from `master`
- local baseline verification existed through `npm run build`
- Codex local and cloud review were both part of the broader review discussion

That proposal is retained here only so later readers can understand the decision history and why the repo no longer uses that bridge-branch concept.

## What the Superseded Proposal Said

The archived proposal centered on these ideas:

- introduce `deploy` as an intermediate review/release bridge branch
- add minimal GitHub Actions coverage around that branch and `master`
- keep `master` as the final production branch
- preserve `develop` during a transition period
- define where local Codex review and Codex cloud review would occur
- preserve a hotfix sync-back discussion

Those points remain useful as historical rationale, but they are not current implementation requirements.

## Current Official Model

This historical document no longer defines the primary branch workflow; follow the official branch-promotion rule: `feature/*` -> `develop` via PR review -> `master` via controlled promotion.

## Supersession Rule

If any statement in the archived 2026-04-15 proposal appears to conflict with the current workflow, follow the current official model and treat the older `deploy` material as superseded background only.

## Historical Notes Retained Intentionally

The following historical references are intentionally preserved in this spec because they explain the prior proposal:

- a `deploy` bridge branch was proposed before `master`
- repo-owned CI coverage was discussed for that branch
- `build` and `build-production-contract` were part of the proposal vocabulary
- hotfix synchronization back into long-lived branches was discussed
- Codex local review and Codex cloud review were part of the proposal narrative

These are descriptive historical notes, not active instructions.

## Non-Active Legacy Details

The detailed operational content from the original proposal is intentionally not carried forward here as actionable guidance. In particular, this document no longer instructs contributors to:

- create or publish `deploy`
- use `deploy` as the primary review bridge
- treat `deploy` as the active route to `master`
- align current repository operations around a `deploy`-first promotion flow

## Expected Reader Interpretation

Read this document as an archived design snapshot that explains a superseded branch-model idea.

Read the current repository workflow as:

`feature/*` / `fix/*` -> `develop` -> `master`
