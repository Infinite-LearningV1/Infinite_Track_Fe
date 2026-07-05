# Web FE Deploy Branch Flow Design

**Date:** 2026-07-05  
**Scope:** Explanation of the current production deployment flow for Web FE

## Context

There was confusion about why Web FE production is already live if the policy says deployment must go through `master` first.

The repo and hosting platform are actually aligned:
- repository governance treats `master` as the production/release source
- DigitalOcean App Platform is configured to deploy from `master`
- deploy-on-push is enabled for that branch

## Recommended Explanation

### 1. Branch policy
For Web FE production, the allowed release path is:

`feature/fix -> develop -> promotion PR -> master`

`develop` is the validation/integration branch, not the production deployment source.

### 2. Why production is already live now
Production is already live **because the promotion PR was merged into `master`**.

Once `master` changed, DigitalOcean App Platform detected the new commit on `master` and automatically built/deployed the app because `deploy_on_push` is enabled on the production app.

So the deployment did **not** come directly from `develop`.
It came from `master` after promotion succeeded.

### 3. Rule of thumb
Use this mental model:
- if a change is only in `develop`, it is **not yet production**
- once the change is promoted and merged into `master`, it becomes eligible for production deploy
- because App Platform watches `master`, merge to `master` can trigger production deploy automatically

## Accepted Interpretation

The correct concise answer is:

> Web FE production still has to go through `master` first.  
> It is live now because the promoted change was already merged into `master`, and the hosting platform auto-deploys from `master`.

## Verification Sources

- `DEPLOYMENT.md` production-truth section states that `master` is the production/release source.
- DigitalOcean App Platform live configuration shows the production app uses branch `master` with `deploy_on_push = true`.
