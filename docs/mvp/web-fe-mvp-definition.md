# Web FE MVP Definition

**Last Reviewed:** 2026-07-03

## Definition

The Web FE is **MVP-ready** when its in-scope operator flows can be run against current backend truth with no blocking auth/session, dashboard, reporting/export, or deploy-confidence regressions, and when the team has enough documentation, smoke-test guidance, rollback guidance, and blocker visibility to promote and support the frontend responsibly.

## Scope boundaries

### In scope for MVP-ready judgment

- signin / session / protected-route access
- dashboard summary, historical trend, attendance mode, geofence, today-locations map, and Fuzzy AHP surfaces
- report/export flow based on `/api/summary/reports`
- current operator-facing deploy/release documentation
- current blocker visibility for production-readiness decisions

### Out of scope for this definition

- backend feature implementation itself
- Android/mobile native app behavior
- future backlog items not yet accepted into the Web FE MVP scope
- unresolved stakeholder requests that are not part of the current documented Web FE surface

## Important distinctions

### “Merged to develop” is not the same as MVP-ready

A change can be merged to `develop` and still fail the MVP definition if the integrated result does not meet contract truth, smoke expectations, or release confidence requirements.

### “Deployable” is not the same as MVP-ready

The frontend may be technically deployable and still fail MVP readiness if blocker conditions remain open or if the critical runtime surfaces are not trustworthy enough for operator use.

### Backend remains source of truth

Web FE MVP readiness does not mean the frontend invents its own authority. Backend data contracts, auth decisions, and owner endpoints remain canonical; the frontend must reflect that truth faithfully.

## Blocker relationship

The remaining deployment/release blockers are part of MVP judgment. If unresolved blockers materially reduce confidence in production promotion or runtime safety, MVP-ready status should be withheld or explicitly marked as conditional with accepted exceptions.

## Practical use

Use `docs/mvp/web-fe-mvp-checklist.md` as the working checklist and use this document as the short policy statement that explains how to interpret it.
