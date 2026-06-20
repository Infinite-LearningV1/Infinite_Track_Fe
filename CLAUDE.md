# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository identity
- This repo is the Web FE admin and reporting surface for Infinite Track Palu.
- It is a Webpack-built multi-page app using HTML, Alpine.js, Tailwind CSS, and Axios.
- Web FE is not the final source of truth for attendance, auth authority, or reporting authority.
- Prefer changes that keep admin flows clear, backend-truth aligned, and safe for maintainability.

## Source of truth hierarchy
- Product intent: web admin supports operations and reporting; reporting must not create conflicting truth.
- Repo reality: current code/config/runtime behavior is the active as-is truth.
- Gap priorities: auth/session correctness, reporting responsibility, deploy/config correctness, and documentation discipline remain sensitive.
- Accepted ADRs override informal preferences when they exist.
- If these sources conflict, call out the conflict explicitly instead of silently choosing one.

## High-risk areas
Treat these files and areas as high-risk and explain the impact before changing them:
- `src/js/config/env.js`
- `src/js/services/**`
- `src/js/features/signinHandler.js`
- `src/js/utils/authGuard.js`
- `src/js/utils/roleBasedAccess.js`
- `src/js/utils/storageManager.js`
- `webpack.config.js`
- `DEPLOYMENT.md`
- `DEPLOYMENT-CHECKLIST.md`

Also treat these behaviors as high-risk:
- sign-in and redirect flow
- token/session storage and expiry handling
- route guards and role-based access behavior
- dashboard summary and analytics rendering
- export PDF/Excel behavior
- map/location visualization
- service/API integration consistency
- env/build/deploy behavior
- shared UI logic and maintainability hotspots

## Required task response format
For each Web FE task, respond in this order:
1. Tujuan task
2. Fakta
3. Asumsi
4. Perlu verifikasi
5. Risiko perubahan
6. Plan implementasi
7. File/area terdampak
8. Verification plan
9. Docs / ADR update note
10. Review / PR / release / build notes

## Definition of done
Do not call a task done unless:
- scope is clear and bounded
- risks are explicitly stated
- affected files/areas are named
- verification evidence exists, or the response clearly states `REQUIRES REPO VERIFICATION`
- high-risk impact is called out when relevant
- `DOCS/ADR UPDATE REQUIRED` is included for architecture-significant changes
- review / PR / release / build notes are present when relevant

## Docs / ADR trigger rule
Write `DOCS/ADR UPDATE REQUIRED` when work touches:
- auth/session contract
- route guard or RBAC expectation
- dashboard/reporting responsibility
- source-of-truth behavior across clients
- env/deploy/build truth
- observability baseline
- major code organization changes affecting maintainability

## Verification expectation
- Do not invent repo verification commands.
- If the correct repo command or runtime verification path is not locked, state `REQUIRES REPO VERIFICATION`.
- Keep verification expectations concrete and tied to the files or flows changed.

## Related references
- ADRs remain the architecture reference set for this repo; this file is the operational governance standard for working in this repo.
- ADR index: `docs/adr/index.md`
- `docs/adr/ADR-001-webfe-source-of-truth-and-responsibility-boundary.md`
- `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md`
- `docs/adr/ADR-003-route-guard-and-rbac-boundary.md`
- `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md`
- `docs/adr/ADR-005-service-and-api-integration-consistency-boundary.md`
- `docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md`
- `DEPLOYMENT.md`
- `DEPLOYMENT-CHECKLIST.md`

## Shared Context (Cross-Repo)

Before cross-contract work, read the cockpit shared context outside this Web FE repository (`Deploy Infinite Track/Infinite Track/shared-context/`):

- `API_CONTRACT.md`
- `GLOBAL_STATUS.md`
- `ROUTING_POLICY.md`
- `QUALITY_GATE.md`
- `DECISIONS.md`
- `RISK_REGISTER.md`

Official operating model: `Cowork -> Claude Desktop Host -> Claude Code CLI -> GitHub + Linear`.
If repo/runtime/GitHub/Linear/docs differ, live repo/runtime is the highest factual source and GitHub + Linear are the active execution/evidence systems.
Apply this file's Definition of Done together with the global evidence gate: diff/PR + fresh verification + review verdict.

## Execution Model

- Agents always work on an isolated branch inside a worktree.
- The main branch held by the human/operator in the terminal remains `develop`; it is a pull/test/human validation surface, not an agent implementation surface.
- Agent output returns to `develop` through PR/merge; then the human pulls and tests on `develop`.
- `master` only receives fix/no-bug/release-ready results from `develop`.
- Web FE branch model: `develop` is the QA/human validation branch; `master` is the deployment branch, so agents do not edit `develop` directly.
