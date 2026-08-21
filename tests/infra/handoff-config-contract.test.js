import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (file) => fs.readFileSync(path.resolve(ROOT, file), "utf8");

test("repository forces text working trees to LF", () => {
  assert.match(read(".gitattributes"), /^\* text=auto eol=lf$/m);
});

test("formatting is repository-level and editor agnostic", () => {
  const prettier = JSON.parse(read(".prettierrc"));
  assert.equal(prettier.printWidth, 80);
  assert.deepEqual(prettier.plugins, ["prettier-plugin-tailwindcss"]);
  assert.equal(
    fs.existsSync(path.resolve(ROOT, ".vscode/settings.json")),
    false,
  );
});

test("browser and PostCSS configuration each have one owner", () => {
  const pkg = JSON.parse(read("package.json"));
  const webpack = read("webpack.config.js");
  const postcss = read("postcss.config.js");

  assert.deepEqual(pkg.browserslist, ["> 1%", "not dead"]);
  assert.equal(fs.existsSync(path.resolve(ROOT, ".browserslistrc")), false);
  assert.doesNotMatch(
    webpack,
    /overrideBrowserslist|postcssOptions|require\("autoprefixer"\)/,
  );
  assert.match(postcss, /["']@tailwindcss\/postcss["']/);
});

test("editor metadata does not advertise unsupported aliases", () => {
  assert.equal(fs.existsSync(path.resolve(ROOT, "jsconfig.json")), false);
});

test("one public env template owns only deployment-varying inputs", () => {
  const example = read(".env.example");
  const webpack = read("webpack.config.js");
  const exampleKeys = example
    .split(/\r?\n/)
    .flatMap((line) => line.match(/^([A-Z_][A-Z0-9_]*)=/)?.slice(1) || []);
  const definePlugin = webpack.match(
    /new webpack\.DefinePlugin\(\{([\s\S]*?)\n\s*\}\),/,
  );

  assert.deepEqual(exampleKeys, [
    "API_BASE_URL",
    "APP_ENVIRONMENT",
    "DEBUG_MODE",
    "LOG_LEVEL",
    "WEBPACK_DEV_HOST",
    "WEBPACK_OPEN",
    "WEBPACK_API_PROXY_TARGET",
  ]);

  assert.ok(definePlugin);
  const browserDefinitions = [
    ...definePlugin[1].matchAll(/^\s*"process\.env\.([A-Z_][A-Z0-9_]*)":/gm),
  ].map((match) => match[1]);

  assert.deepEqual(browserDefinitions, [
    "API_BASE_URL",
    "APP_ENVIRONMENT",
    "DEBUG_MODE",
    "LOG_LEVEL",
  ]);
  assert.equal(
    fs.existsSync(path.resolve(ROOT, ".env.production.example")),
    false,
  );
});

test("CI is a Node 24 verification gate", () => {
  assert.equal(
    fs.existsSync(path.resolve(ROOT, ".github/workflows/build.yml")),
    false,
  );
  const ci = read(".github/workflows/ci.yml");
  assert.match(ci, /actions\/checkout@v7/);
  assert.match(ci, /actions\/setup-node@v7/);
  assert.match(ci, /node-version:\s*["']24\.x["']/);
  const runCommands = [...ci.matchAll(/^\s*run:\s*(.+)$/gm)].map((match) =>
    match[1].trim(),
  );
  assert.deepEqual(runCommands, [
    "npm ci",
    "npm run lint",
    "npm test",
    "npm run build",
  ]);
  assert.match(ci, /contents:\s*read/);
});

test("package and lockfile require the same Node version", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));

  assert.equal(lock.packages[""].engines.node, pkg.engines.node);
});
