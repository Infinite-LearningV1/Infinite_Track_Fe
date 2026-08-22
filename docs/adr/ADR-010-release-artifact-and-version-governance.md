# ADR-010-release-artifact-and-version-governance

## ADR ID

ADR-010

## Title

Release artifact and version governance

## Status

Proposed

## Context

The Web FE now has a `v2.1.0` tag from the first release attempt, but that run
failed during regression tests before ZIP, attestation, or GitHub Release
creation. The tag is preserved as historical evidence and is never moved or
reused. A repeatable release path still needs one stable identity, one verified
build input, and an auditable artifact without changing the current DigitalOcean
deployment architecture.

The integration branch is `develop`, while `master` is the stable release
source. `v2.1.0` remains a failed tag-only attempt; the first publishable recovery
release is `v2.1.1`. The older `2.0.1` value was package metadata and is not
retroactively asserted release history.

## Decision

We will use a stable Git tag on master as the source identity for a versioned,
CI-built, attested Web FE ZIP attached to a draft GitHub Release.

The ordinary source verification gate remains in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). The dedicated
tag-driven producer is [`.github/workflows/release.yml`](../../.github/workflows/release.yml).
It validates the tag/package identity, proves the tag commit is reachable from
`master`, runs the Node 24 quality gates, validates the generated static tree,
attests the ZIP, and creates a draft Release. It never creates a missing tag or
silently replaces a published asset.

## Release identity

Stable releases use one SemVer identity:

```text
package.json version : X.Y.Z
Git tag              : vX.Y.Z
Release title        : Infinite Track Web vX.Y.Z
Release ZIP          : infinite-track-web-vX.Y.Z.zip
```

The first publishable recovery release is `v2.1.1`, titled `Infinite Track Web
v2.1.1`, with asset `infinite-track-web-v2.1.1.zip`. The existing `v2.1.0` tag
is retained as the failed first attempt and is not rewritten. Only stable
`vX.Y.Z` tags are accepted; prerelease channels are deferred.

## Artifact contents

The release job uses these public production build inputs:

```text
API_BASE_URL=https://api.infinite-track.tech/api
APP_ENVIRONMENT=production
DEBUG_MODE=false
LOG_LEVEL=error
```

The ZIP is created from inside `build/`, so extraction places the generated
static runtime files at the archive root. It includes Webpack-emitted runtime
assets such as `src/images/**` and
`node_modules/leaflet/dist/images/**`, while the validator rejects raw source,
repository metadata, environment files, tests, and dependency metadata.

GitHub automatically supplies source archives. The custom ZIP is the generated
static runtime artifact rather than a duplicate source archive.

## Provenance and verification

The release workflow runs dependency installation, lint, and regression tests
with repository test defaults. Production environment values are scoped only to
the production build step:

```text
npm ci -> npm run lint -> npm test -> production env + npm run build
```

It then validates the build tree, creates the versioned ZIP, and uses
`actions/attest@v4`. An operator can verify a downloaded asset with:

```bash
gh release download v2.1.1 --pattern "infinite-track-web-v2.1.1.zip"
gh attestation verify infinite-track-web-v2.1.1.zip --repo Infinite-LearningV1/Infinite_Track_Fe
```

The release tag, package version, Release title, ZIP name, tag commit, and
attestation must all describe the same release identity.

## Draft-first publication

The workflow creates a draft GitHub Release with generated notes as a starting
point. [`.github/release.yml`](../../.github/release.yml) owns generated-note
categories and bot-author exclusions; final release notes remain human-curated. A human release owner reviews the identity, ZIP, attestation, target
`master` commit, verification evidence, and known issues before curating the
notes and publishing it. Automated tag runs do not publish a stable Release.

The published notes should keep these headings in order:

```text
Summary
What's Changed
  Added
  Changed
  Fixed
  Infrastructure
Deployment
Verification
Known Issues
Full Changelog
```

## Immutable release governance

Immutable releases are repository-level GitHub configuration. The setting was
recorded as disabled during planning. It will be enabled only after the first
workflow-produced draft, ZIP digest, attestation, and notes process are proven;
publication then becomes the final human gate. A published version must never
be rewritten or have its canonical asset replaced.

## Current DigitalOcean boundary

GitHub Release ZIP = official packaged distribution / handoff / recovery
artifact. DigitalOcean production = currently rebuilt from repository source;
do not claim byte-for-byte identity with the ZIP.

The current deployment remains:

```text
master/source -> DigitalOcean build -> live static site
stable tag -> GitHub Actions build -> versioned ZIP -> GitHub Release
```

INF-281 does not add Docker, Nginx, a new hosting platform, or deployment from
the GitHub Release ZIP.

## Rollback/recovery

Rollback or recovery uses a historical immutable release after verification of
its tag, asset, and attestation. Use historical release rollback without
rewriting a published version; a new corrective version is created when a
change is required.

## Trade-offs / Consequences

- Positive: release identity and artifact provenance are explicit and auditable.
- Positive: draft review keeps release notes and operational boundaries human-gated.
- Positive: the ZIP can support distribution, handoff, and recovery without changing production ownership.
- Negative: stable release promotion requires a reviewed `develop` to `master` path.
- Negative: the ZIP is not yet proof of the exact bytes served by DigitalOcean.
- Negative: immutable-release configuration and publication require operational GitHub evidence.

## Evidence / References

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — ordinary Node 24 source verification.
- [`.github/workflows/release.yml`](../../.github/workflows/release.yml) — tag-driven draft Release producer.
- [`scripts/release/validate-release.mjs`](../../scripts/release/validate-release.mjs) — stable identity validation.
- [`scripts/release/validate-build-artifact.mjs`](../../scripts/release/validate-build-artifact.mjs) — generated-tree policy validation.
- [`README.md`](../../README.md) — operator lifecycle and verification entrypoint.
- [`ADR-006`](ADR-006-env-build-and-deploy-runtime-truth.md) — environment, build, and deployment runtime truth.
