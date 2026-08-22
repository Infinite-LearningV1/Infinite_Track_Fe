import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateBuildArtifact } from "../../scripts/release/validate-build-artifact.mjs";
import {
  deriveReleaseIdentity,
  parseStableTag,
} from "../../scripts/release/validate-release.mjs";

function withFixture(files, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "inf-281-release-"));
  const buildDir = path.join(root, "build");
  fs.mkdirSync(buildDir, { recursive: true });

  try {
    for (const [relativePath, contents] of Object.entries(files)) {
      const filePath = path.join(buildDir, relativePath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, contents);
    }
    return callback(buildDir);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("parses a stable release tag", () => {
  assert.equal(parseStableTag("v2.1.0"), "2.1.0");
});

test("rejects non-stable release tags", () => {
  for (const tag of ["2.1.0", "v2.1", "v2.1.0-rc.1"]) {
    assert.throws(() => parseStableTag(tag), /stable SemVer/);
  }
});

test("derives the canonical release identity", () => {
  assert.deepEqual(deriveReleaseIdentity("v2.1.0", "2.1.0"), {
    version: "2.1.0",
    releaseTitle: "Infinite Track Web v2.1.0",
    artifactName: "infinite-track-web-v2.1.0.zip",
  });
});

test("rejects a tag and package version mismatch", () => {
  assert.throws(
    () => deriveReleaseIdentity("v2.1.0", "2.0.1"),
    /does not match/,
  );
});

test("accepts the required production files and emitted runtime images", () => {
  withFixture(
    {
      "index.html": "index",
      "signin.html": "signin",
      "bundle.js": "bundle",
      "style.css": "style",
      "src/images/logo.svg": "svg",
      "node_modules/leaflet/dist/images/marker-icon.png": "png",
    },
    (buildDir) => {
      assert.deepEqual(validateBuildArtifact(buildDir), {
        fileCount: 6,
        files: [
          "bundle.js",
          "index.html",
          "node_modules/leaflet/dist/images/marker-icon.png",
          "signin.html",
          "src/images/logo.svg",
          "style.css",
        ],
      });
    },
  );
});

test("rejects missing and empty build directories", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "inf-281-release-"));
  try {
    assert.throws(
      () => validateBuildArtifact(path.join(root, "missing")),
      /does not exist/,
    );
    const emptyBuild = path.join(root, "empty");
    fs.mkdirSync(emptyBuild);
    assert.throws(() => validateBuildArtifact(emptyBuild), /empty/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects forbidden repository and source content", () => {
  const forbiddenFiles = [
    ".env",
    ".env.production",
    "package.json",
    "webpack.config.js",
    "tests/example.test.js",
    "src/js/index.js",
    "node_modules/leaflet/package.json",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    withFixture(
      {
        "index.html": "index",
        "signin.html": "signin",
        "bundle.js": "bundle",
        "style.css": "style",
        [forbiddenFile]: "forbidden",
      },
      (buildDir) => {
        assert.throws(
          () => validateBuildArtifact(buildDir),
          /forbidden|not allowed|reject/i,
          forbiddenFile,
        );
      },
    );
  }
});
