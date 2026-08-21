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

  for (const key of [
    "API_BASE_URL",
    "APP_ENVIRONMENT",
    "DEBUG_MODE",
    "LOG_LEVEL",
    "WEBPACK_DEV_HOST",
    "WEBPACK_OPEN",
    "WEBPACK_API_PROXY_TARGET",
  ]) {
    assert.match(example, new RegExp(`^${key}=`, "m"));
  }

  assert.equal(fs.existsSync(path.resolve(ROOT, ".env.production.example")), false);

  for (const key of [
    "API_AUTH_ENDPOINT", "API_VERSION", "APP_NAME", "APP_VERSION",
    "SESSION_TIMEOUT", "REMEMBER_ME_DAYS", "AUTH_CLIENT_TYPE", "DEFAULT_LANGUAGE", "TIMEZONE",
  ]) {
    assert.doesNotMatch(webpack, new RegExp(`process\\.env\\.${key}`));
  }
});
