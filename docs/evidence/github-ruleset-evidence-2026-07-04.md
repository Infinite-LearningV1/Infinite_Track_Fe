# GitHub Branch Protection / Ruleset Evidence

**Date:** 2026-07-04
**Capture Method:** Authenticated `gh api` CLI calls (browser settings page was not accessible because the browser session was logged out)
**Repository:** `Infinite-LearningV1/Infinite_Track_Fe`

## Evidence Files

- `docs/evidence/github-ruleset-develop-2026-07-04.json`
- `docs/evidence/github-ruleset-master-2026-07-04.json`

## Summary

### `develop` ruleset

- Ruleset name: `develop — integration gate`
- Enforcement: `active`
- Target ref: `refs/heads/develop`
- Blocks deletion: `yes`
- Blocks non-fast-forward pushes: `yes`
- Pull request review required: `yes`
- Required approving review count: `1`
- Dismiss stale reviews on push: `true`
- Require resolved review threads: `true`
- Allowed merge methods: `squash`, `rebase`
- Required linear history: `true`

### `master` ruleset

- Ruleset name: `master — release-ready gate`
- Enforcement: `active`
- Target ref: `refs/heads/master`
- Blocks deletion: `yes`
- Blocks non-fast-forward pushes: `yes`
- Pull request review required: `yes`
- Required approving review count: `1`
- Dismiss stale reviews on push: `true`
- Require resolved review threads: `true`
- Allowed merge methods: `merge`, `squash`, `rebase`

## Verification Result

- Active rulesets for `develop` and `master` are confirmed.
- Rule application was checked through `gh api repos/Infinite-LearningV1/Infinite_Track_Fe/rules/branches/{branch}`.
- **No `required_status_checks` rule was returned for either `develop` or `master`.**
- Therefore, the checklist item "ruleset benar-benar mewajibkan status check workflow build" is **not closed** by current evidence.
- This is stronger than "UI screenshot missing": the available authenticated API evidence indicates status-check enforcement is currently absent at the repository ruleset level.

## Notes

- The GitHub browser session available to the agent was logged out, so screenshot capture from repository settings could not be completed.
- The authenticated GitHub CLI session for account `pebbDev` was available and used as the external evidence source.
- The captured data confirms repository rulesets are active for both `develop` and `master`, but does **not** confirm build status-check enforcement.
