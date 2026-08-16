# Web FE ADR Index

## Purpose

This folder records lightweight Architecture Decision Records (ADRs) for the Infinite Track Palu Web FE so maintainers can see what the frontend is expected to do, what it must not claim as authority, and which decisions still need verification.

## Repository ADR Rules

- ADRs are stored in version control.
- One ADR captures one architecturally significant decision.
- Decisions are written explicitly using "We will ...".
- Status must stay honest. Default to `Proposed` unless repo evidence is strong and major verification gaps are closed.
- If a decision is replaced later, the old ADR stays in place and its status becomes `Superseded`.
- Repo runtime reality remains the strongest source for active behavior; ADRs do not overrule observable runtime facts.

## Documentation Relationship

- `README.md` is the canonical onboarding, environment, verification, deployment, and handoff entrypoint.
- ADRs capture durable architecture decisions and responsibility boundaries.
- Current code/runtime evidence remains stronger than stale documentation; update README/ADR when implementation truth changes.

## ADR Inventory

| ADR ID  | Title                                              | Status   | Scope                                                              | Linked artifact                                                         | Last updated |
| ------- | -------------------------------------------------- | -------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------ |
| ADR-001 | Web FE source of truth and responsibility boundary | Proposed | Product/admin surface boundary                                     | [ADR-001](ADR-001-webfe-source-of-truth-and-responsibility-boundary.md) | 2026-07-26   |
| ADR-002 | Auth, session, and truthful access denial          | Proposed | Sign-in, session continuity, expiry, denial UX                     | [ADR-002](ADR-002-auth-session-and-truthful-access-denial.md)           | 2026-05-18   |
| ADR-003 | Route guard and RBAC boundary                      | Proposed | Route access, UI visibility, RBAC boundary                         | [ADR-003](ADR-003-route-guard-and-rbac-boundary.md)                     | 2026-05-18   |
| ADR-004 | Dashboard, reporting, and export responsibility    | Proposed | Reporting, summary rendering, PDF/Excel exports                    | [ADR-004](ADR-004-dashboard-reporting-and-export-responsibility.md)     | 2026-07-26   |
| ADR-005 | Service and API integration consistency boundary   | Proposed | Service layer expectations and page/service boundary               | [ADR-005](ADR-005-service-and-api-integration-consistency-boundary.md)  | 2026-05-18   |
| ADR-006 | Env, build, and deploy runtime truth               | Proposed | Runtime assumptions, env truth, deployment evidence                | [ADR-006](ADR-006-env-build-and-deploy-runtime-truth.md)                | 2026-04-08   |
| ADR-007 | Web FE auth consumer model                         | Proposed | Auth consumer contract, refresh-session behavior, redirect notices | [ADR-007](ADR-007-web-fe-auth-consumer-model.md)                        | 2026-05-30   |
| ADR-008 | Summary search and period contract adoption        | Proposed | Summary report endpoint, search key, and period contract           | [ADR-008](ADR-008-summary-search-period-contract-adoption.md)           | 2026-05-30   |
| ADR-009 | Dashboard cockpit contract adoption                | Proposed | Owner-driven dashboard endpoint and authority boundaries           | [ADR-009](ADR-009-dashboard-cockpit-contract-adoption.md)               | 2026-08-16   |
