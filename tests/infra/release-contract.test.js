import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("release workflow is a tag-driven, draft-first production release gate", () => {
  const workflow = fs.readFileSync(
    path.join(ROOT, ".github/workflows/release.yml"),
    "utf8",
  );

  assert.match(workflow, /push:\s*\n\s*tags:\s*\n\s*- ["']v\*\.\*\.\*["']/);
  assert.doesNotMatch(workflow, /branches:/);
  assert.match(workflow, /actions\/checkout@v7/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /actions\/setup-node@v7/);
  assert.match(workflow, /node-version:\s*["']24\.x["']/);

  const identityPosition = workflow.indexOf(
    "node scripts/release/validate-release.mjs",
  );
  const installPosition = workflow.indexOf("run: npm ci");
  assert.ok(identityPosition >= 0);
  assert.ok(installPosition > identityPosition);

  assert.match(workflow, /git fetch origin master --no-tags/);
  assert.match(workflow, /git merge-base --is-ancestor ["']?\$GITHUB_SHA/);

  const orderedCommands = [
    "run: npm ci",
    "run: npm run lint",
    "run: npm test",
    "run: npm run build",
  ];
  let previousPosition = -1;
  for (const command of orderedCommands) {
    const position = workflow.indexOf(command);
    assert.ok(position > previousPosition, `${command} must be ordered`);
    previousPosition = position;
  }

  assert.match(
    workflow,
    /API_BASE_URL:\s*https:\/\/api\.infinite-track\.tech\/api/,
  );
  assert.match(workflow, /APP_ENVIRONMENT:\s*production/);
  assert.match(workflow, /DEBUG_MODE:\s*["']false["']/);
  assert.match(workflow, /LOG_LEVEL:\s*error/);

  const jobSetup = workflow.slice(
    workflow.indexOf("jobs:"),
    workflow.indexOf("    steps:"),
  );
  assert.doesNotMatch(
    jobSetup,
    /API_BASE_URL|APP_ENVIRONMENT|DEBUG_MODE|LOG_LEVEL/,
  );

  const buildStep = workflow.slice(
    workflow.indexOf("      - name: Build production frontend"),
    workflow.indexOf("      - name: Validate generated artifact"),
  );
  assert.match(buildStep, /env:\s*[\s\S]*API_BASE_URL:/);
  assert.match(buildStep, /APP_ENVIRONMENT:\s*production/);
  assert.match(buildStep, /DEBUG_MODE:\s*["']false["']/);
  assert.match(buildStep, /LOG_LEVEL:\s*error/);
  assert.match(workflow, /node scripts\/release\/validate-build-artifact\.mjs/);
  assert.match(workflow, /\(cd build && zip -r ["']?\.\.\/\$ARTIFACT_NAME/);
  assert.match(workflow, /unzip -Z1 ["']?\$ARTIFACT_NAME/);

  for (const permission of [
    "contents: write",
    "id-token: write",
    "attestations: write",
    "artifact-metadata: write",
  ]) {
    assert.match(workflow, new RegExp(permission));
  }
  assert.match(workflow, /uses: actions\/attest@v4/);
  assert.match(workflow, /gh release create[\s\S]*--verify-tag[\s\S]*--draft/);
  assert.doesNotMatch(workflow, /--clobber/);
  assert.doesNotMatch(workflow, /--draft=false|--latest/);
});

test("release governance is documented in the README and ADR index", () => {
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const adrIndex = fs.readFileSync(
    path.join(ROOT, "docs/adr/index.md"),
    "utf8",
  );
  const adr = fs.readFileSync(
    path.join(
      ROOT,
      "docs/adr/ADR-010-release-artifact-and-version-governance.md",
    ),
    "utf8",
  );
  const documentation = `${readme}\n${adr}`;

  assert.match(documentation, /v2\.1\.0/);
  assert.match(documentation, /vX\.Y\.Z/);
  assert.match(documentation, /\.github\/workflows\/release\.yml/);
  assert.match(documentation, /infinite-track-web-vX\.Y\.Z\.zip/);
  assert.match(documentation, /master/);
  assert.match(documentation, /stable release\s+source/i);
  assert.match(
    documentation,
    /GitHub Release ZIP\s*=\s*(?:the )?official packaged distribution\s*\/\s*handoff\s*\/\s*recovery\s+artifact/i,
  );
  assert.match(documentation, /DigitalOcean[^\n]*source-built/i);
  assert.match(documentation, /gh attestation verify/);
  assert.match(
    documentation,
    /historical[\s\S]*release rollback[\s\S]*without\s+rewriting/i,
  );
  assert.match(
    adrIndex,
    /ADR-010\s*\|\s*Release artifact and version governance\s*\|\s*Proposed\s*\|\s*Versioning, tag, ZIP, provenance, publication, immutability/,
  );
});
