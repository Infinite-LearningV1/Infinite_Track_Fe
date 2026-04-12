# Docs, ADRs, and release notes

Derived from `CLAUDE.md`. If this file and `CLAUDE.md` differ, `CLAUDE.md` is canonical.

Write `DOCS/ADR UPDATE REQUIRED` when work touches:
- auth/session contract
- route guard or RBAC expectation
- dashboard/reporting responsibility
- source-of-truth behavior across clients
- env/deploy/build truth
- observability baseline
- major code organization changes affecting maintainability

## Related references
- ADR index: `docs/adr/index.md`
- `docs/adr/ADR-001-webfe-source-of-truth-and-responsibility-boundary.md`
- `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md`
- `docs/adr/ADR-003-route-guard-and-rbac-boundary.md`
- `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md`
- `docs/adr/ADR-005-service-and-api-integration-consistency-boundary.md`
- `docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md`
- `DEPLOYMENT.md`
- `DEPLOYMENT-CHECKLIST.md`
- ADRs remain the architecture reference set for this repo; this file is the operational governance standard.
- Include review / PR / release / build notes when relevant.
