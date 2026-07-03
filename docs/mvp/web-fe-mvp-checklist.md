# Web FE MVP Checklist

**Last Reviewed:** 2026-07-03  
**Primary Audience:** Cowork 3P, Web FE maintainers, product/stakeholder reviewers, release owners  
**Scope:** This checklist defines the minimum repo/runtime/documentation conditions required before the Web FE can be declared **MVP-ready**.

> This checklist is intentionally strict. A feature is not MVP-ready just because it exists in the UI. It must be aligned to backend truth, deployable with confidence, and supported by enough operational evidence to survive release review.

---

## 1. Contract readiness

### Auth / session contract

- [ ] Sign-in, sign-out, protected-route redirect, and session recovery follow the current backend-authored truth.
- [ ] Web FE auth/session behavior is consistent with `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md`.
- [ ] Route guard / denial behavior is consistent with `docs/adr/ADR-003-route-guard-and-rbac-boundary.md`.
- [ ] No active UI flow depends on stale cached browser state as final authority.

### Dashboard / reporting contract

- [ ] Dashboard summary cards use the correct backend owner surface.
- [ ] Geofence evidence panel uses the dedicated backend owner surface.
- [ ] Today Locations / Live Map uses the dedicated backend owner surface.
- [ ] Fuzzy AHP tabs load from the dedicated backend owner endpoint by `type`.
- [ ] Report/export flow uses the canonical `/api/summary/reports` contract.
- [ ] No active dashboard/reporting flow depends on retired preview/dummy contracts as runtime truth.

### Contract drift guard

- [ ] Active ADR and deploy docs do not point to retired cockpit contracts.
- [ ] Shared-context references needed by the repo are synced to current backend truth.
- [ ] Any unresolved backend/FE contract mismatch is explicitly documented as a blocker or follow-up issue.

---

## 2. Feature completeness

### Critical auth flow

- [ ] Allowed user can reach signin and authenticate successfully.
- [ ] Invalid credentials are denied truthfully.
- [ ] Authorized user lands on the expected protected surface.
- [ ] Logout removes access to protected routes.

### Dashboard MVP surface

- [ ] Dashboard shell loads without a blank screen or blocking spinner.
- [ ] KPI summary panels render real backend-driven values or explicit truthful empty/error states.
- [ ] Historical Attendance Trend renders correctly for the supported preset and custom windows.
- [ ] Attendance Mode renders correct totals/percentages.
- [ ] Today Locations / Live Map reads the current backend envelope and shows marker data when backend locations exist.
- [ ] Geofence panel renders correct evidence state.
- [ ] Fuzzy AHP tabs remain visible across states and render backend ranking/criteria/consistency data correctly when available.

### Reporting / export MVP surface

- [ ] Export modal opens from the current dashboard shell.
- [ ] PDF export completes on the supported report contract.
- [ ] Excel export completes on the supported report contract.
- [ ] Empty-data export paths fail safely and explicitly.

### Admin / operations surface

- [ ] Any operator-facing settings/admin page that is in MVP scope still loads and navigates correctly.
- [ ] No in-scope page is blocked by known unresolved FE runtime regressions.

### Truthful fallback behavior

- [ ] Empty/loading/error states remain truthful and do not fabricate success.
- [ ] Missing backend data is surfaced as missing data, not synthetic placeholder success.
- [ ] Feature interactions do not hide backend constraints from the user.

---

## 3. Non-functional requirements

### Runtime quality

- [ ] Browser console has no blocking runtime errors on signin, dashboard, export, and key navigation paths.
- [ ] Network failures are visible and diagnosable, not silently swallowed.
- [ ] Main flows remain usable after refresh.
- [ ] UI state remains responsive enough for normal operator use.

### Browser / viewport quality

- [ ] Chrome latest passes the main smoke path.
- [ ] Edge latest passes the main smoke path.
- [ ] Firefox latest passes the main smoke path.
- [ ] Mobile/responsive viewport remains usable for signin and dashboard overview.

### Security / transport expectations

- [ ] HTTPS and API host assumptions are documented and consistent with deployed configuration.
- [ ] CORS expectations are documented and validated operationally.
- [ ] There is no known auth/session regression that would block production use.

---

## 4. Documentation completeness

### Deploy / release docs

- [ ] `DEPLOYMENT.md` is current enough to describe the actual deploy/runtime truth.
- [ ] `DEPLOYMENT-CHECKLIST.md` reflects the current blocker model and internal/external verification split.
- [ ] `docs/smoke-tests/post-deploy-checklist.md` exists and is usable by release owners.
- [ ] Rollback procedure is documented in `DEPLOYMENT.md`.

### Governance docs

- [ ] Relevant ADRs are current for auth/session, routing/RBAC, reporting responsibility, service/API integration, and deploy truth.
- [ ] Shared-context sync artifacts exist for active cross-contract guidance.
- [ ] The Web FE issue template exists and can be used for future infra/runtime follow-ups.

### Handoff / audit docs

- [ ] The repo has enough handoff artifacts that a new reviewer can understand what is complete, blocked, and deferred.
- [ ] Any deferred work still needed for MVP is explicitly named.

---

## 5. Deployment / release readiness

### Blocker gate

MVP readiness is blocked if any of the following remain unresolved in a way that invalidates safe release confidence.

- [ ] Blocker #1: production env / secret provisioning gap resolved or operationally owned with explicit release procedure.
- [ ] Blocker #2: baseline freeze / release discipline gap resolved or accepted with explicit operator control.
- [ ] Blocker #3: CI/release gate gap resolved or accepted with explicit review policy.
- [ ] Blocker #4: branch protection evidence resolved.
- [ ] Blocker #5: production hosting source/config evidence resolved.

### Merge vs deploy distinction

- [ ] Team agrees that “merged to `develop`” is **not automatically** equivalent to MVP-ready.
- [ ] Team agrees that “deployable” is **not automatically** equivalent to MVP-ready.
- [ ] MVP-ready requires both feature truth and release confidence.

### Smoke evidence gate

- [ ] Authenticated post-deploy smoke can be run with valid credentials and evidence capture.
- [ ] A rollback decision path exists if critical smoke fails.

---

## 6. Assumptions requiring stakeholder confirmation

These assumptions should be reviewed by Cowork 3P / product / release owners before treating the checklist as final authority.

- [ ] Current dashboard/reporting/admin surfaces listed here are the correct MVP scope.
- [ ] No additional product feature outside the current documented Web FE scope must be added before MVP-ready can be declared.
- [ ] The remaining blocker model is acceptable as the release-governance frame.
- [ ] Stakeholders agree that INF-199 is a decision artifact, not merely a task checklist.

---

## 7. Sign-off block

**MVP Assessment Date:** ********\_\_\_\_********  
**Reviewed By:** ********\_\_\_\_********  
**Product / Stakeholder Lead:** ********\_\_\_\_********  
**Release Owner:** ********\_\_\_\_********

### Outcome

- [ ] MVP-ready
- [ ] MVP-ready with explicit accepted exceptions
- [ ] Not MVP-ready

### Accepted exceptions (if any)

- ***
- ***
- ***

### Blocking reasons (if not ready)

- ***
- ***
- ***
