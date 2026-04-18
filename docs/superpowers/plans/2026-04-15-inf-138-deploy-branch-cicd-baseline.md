# INF-138 Deploy-Branch CI/CD Baseline Implementation Plan

> Historical archive only. This plan records a superseded 2026-04-15 `deploy`-bridge proposal and must not be used as an active execution checklist for the current repository workflow.

## Purpose

Preserve the former `deploy`-bridge rollout plan as historical context while making clear that the active repository workflow now follows:

`feature/*` / `fix/*` -> `develop` -> `master`

Production-facing work is reviewed through `develop`, and only release-ready changes are promoted from `develop` to `master`.

## Status

Superseded. Not an active implementation plan.

The earlier version of this document operationalized a `deploy` branch, `deploy`-targeted CI workflows, and `deploy`-specific governance steps. That material is now archived and should be read only as decision history.

## Historical Summary of the Superseded Plan

The archived plan originally proposed all of the following:

- creating and publishing a `deploy` bridge branch
- adding PR and push workflows around `deploy`
- adding promotion verification for `master`
- keeping `develop` verified during a transition period
- documenting branch precedence and Codex review expectations
- aligning GitHub rulesets to the proposed branch model
- preparing a first promotion path that passed through `deploy`

Those actions are not current instructions for this repository.

## Current Official Workflow

The only active workflow guidance is:

1. implement changes on `feature/*` or `fix/*`
2. open the review PR into `develop`
3. merge into `develop` after review and required verification
4. promote `develop` to `master` when the release is ready
5. keep `master` as the production deployment source

Historical note on hotfixes:

The superseded workflow discussion once referenced a `master`-first hotfix path. That note is preserved only as branch-history context and is not active guidance for this repository.

For current operations, route hotfix work through the official promotion model so `develop` remains the reviewed integration branch before changes are promoted to `master`.

## Archival Note on Legacy `deploy` Material

The earlier task-by-task instructions for `deploy` creation, `deploy`-based PR routing, `deploy` rulesets, and `deploy`-to-`master` promotion were removed from active plan text on purpose.

They are superseded by the current official model and should not be followed when operating this repository today.

## Historical References Kept Intentionally

This archival plan still preserves the following historical context:

- the repo once considered a `deploy` bridge branch between implementation work and `master`
- the proposal discussed minimal GitHub Actions coverage and branch protection alignment
- the proposal distinguished baseline `build` verification from advisory production-contract verification
- the proposal discussed Codex local review and Codex cloud review as part of branch readiness
- the proposal preserved a hotfix synchronization discussion for long-lived branches

These references remain only to explain what the superseded plan was about.

## Explicitly Inactive Legacy Guidance

This document no longer serves as an instruction source for any of the following legacy behaviors:

- creating, pushing, or using `deploy` as the primary bridge branch
- routing feature or fix work through `deploy` before `master`
- opening promotion PRs on a `deploy`-first path
- treating old `deploy` workflow/ruleset steps as current repo tasks

## Reader Guidance

If this historical plan conflicts with current repository workflow guidance elsewhere, follow the active official model:

`feature/*` / `fix/*` -> `develop` -> `master`
