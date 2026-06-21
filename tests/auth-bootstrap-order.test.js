import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const INDEX_JS_PATH = path.resolve(process.cwd(), "src/js/index.js");

function readIndexSource() {
  return fs.readFileSync(INDEX_JS_PATH, "utf8");
}

test("auth store is initialized before application startup during module bootstrap", () => {
  const indexSource = readIndexSource();
  const bootstrapMarker = "window.Alpine = Alpine;";
  const applicationStartSnippet = "startApplication();";

  const bootstrapMarkerIndex = indexSource.indexOf(bootstrapMarker);
  const applicationStartIndex = indexSource.indexOf(applicationStartSnippet);

  assert.notEqual(
    bootstrapMarkerIndex,
    -1,
    "Expected Alpine bootstrap marker in src/js/index.js",
  );
  assert.notEqual(
    applicationStartIndex,
    -1,
    "Expected startApplication() in src/js/index.js",
  );

  const topLevelBootstrapSection = indexSource.slice(
    bootstrapMarkerIndex,
    applicationStartIndex,
  );

  assert.match(
    topLevelBootstrapSection,
    /initAuthStore\(\);/,
    "Expected top-level bootstrap to register Alpine auth store before application startup so shared Alpine templates can read Alpine.store('auth') safely on first render",
  );
});

test("auth store is not re-initialized inside bootAuthentication", () => {
  const indexSource = readIndexSource();
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

test("application startup boundary prevents Alpine.start when dashboard access is denied", async () => {
  const indexSource = readIndexSource();
  const startFunctionMatch = indexSource.match(
    /async function startApplication\(\) \{([\s\S]*?)\n\}/,
  );

  assert.ok(
    startFunctionMatch,
    "Expected startApplication function in src/js/index.js",
  );

  let alpineStartCount = 0;
  const context = {
    document: { body: { dataset: {} } },
    window: { location: { pathname: "/index.html" } },
    Alpine: {
      start() {
        alpineStartCount += 1;
      },
    },
    async bootAuthentication() {
      context.document.body.dataset.accessBoundary = "denied";
      return "authenticated";
    },
  };

  vm.createContext(context);
  vm.runInContext(
    `async function startApplication() {${startFunctionMatch[1]}\n}`,
    context,
  );

  await context.startApplication();

  assert.equal(
    alpineStartCount,
    0,
    "Expected denied dashboard startup boundary to stop before Alpine.start()",
  );
});

test("signin startup initializes Alpine before auth bootstrap finishes", async () => {
  const indexSource = readIndexSource();
  const startFunctionMatch = indexSource.match(
    /async function startApplication\(\) \{([\s\S]*?)\n\}/,
  );

  assert.ok(
    startFunctionMatch,
    "Expected startApplication function in src/js/index.js",
  );

  const callOrder = [];
  const context = {
    document: { body: { dataset: {} } },
    window: { location: { pathname: "/signin.html" } },
    Alpine: {
      start() {
        callOrder.push("alpine-start");
      },
    },
    async bootAuthentication() {
      callOrder.push("boot-auth");
      return "unauthenticated";
    },
  };

  vm.createContext(context);
  vm.runInContext(
    `async function startApplication() {${startFunctionMatch[1]}\n}`,
    context,
  );

  await context.startApplication();

  assert.deepEqual(callOrder, ["alpine-start", "boot-auth"]);
});
