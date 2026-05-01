import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const INDEX_JS_PATH = path.resolve(
  process.cwd(),
  "src/js/index.js",
);

test("auth store is initialized before Alpine.start during module bootstrap", () => {
  const indexSource = fs.readFileSync(INDEX_JS_PATH, "utf8");
  const bootstrapMarker = "// Initialize Alpine.js with authentication";
  const alpineStartSnippet = "Alpine.start();";

  const bootstrapMarkerIndex = indexSource.indexOf(bootstrapMarker);
  const alpineStartIndex = indexSource.indexOf(alpineStartSnippet);

  assert.notEqual(
    bootstrapMarkerIndex,
    -1,
    "Expected Alpine bootstrap marker in src/js/index.js",
  );
  assert.notEqual(alpineStartIndex, -1, "Expected Alpine.start() in src/js/index.js");

  const topLevelBootstrapSection = indexSource.slice(
    bootstrapMarkerIndex,
    alpineStartIndex,
  );

  assert.match(
    topLevelBootstrapSection,
    /initAuthStore\(\);/,
    "Expected top-level bootstrap to register Alpine auth store before Alpine.start() so shared Alpine templates can read Alpine.store('auth') safely on first render",
  );
});

test("auth store is not re-initialized inside bootAuthentication", () => {
  const indexSource = fs.readFileSync(INDEX_JS_PATH, "utf8");
  const bootFunctionMatch = indexSource.match(
    /async function bootAuthentication\(\) \{([\s\S]*?)\n\}/,
  );

  assert.ok(
    bootFunctionMatch,
    "Expected bootAuthentication function in src/js/index.js",
  );
  assert.doesNotMatch(
    bootFunctionMatch[1],
    /initAuthStore\(\);/,
    "Expected bootAuthentication to avoid re-registering the Alpine auth store after top-level bootstrap",
  );
});
