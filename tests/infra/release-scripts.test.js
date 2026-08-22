import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveReleaseIdentity,
  parseStableTag,
} from "../../scripts/release/validate-release.mjs";

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
