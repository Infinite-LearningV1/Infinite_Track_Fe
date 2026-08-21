import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "../..");
const read = (relativePath) =>
  fs.readFileSync(path.resolve(ROOT, relativePath), "utf8");

const REMOVED_RUNTIME_PATHS = [
  ".dockerignore",
  "compose.yaml",
  "Dockerfile",
  "Dockerfile.dev",
  "docker/nginx/dev.conf",
  "docker/nginx/staging.conf",
  "docker/nginx/select-config.sh",
];

test("Webpack Dev Server owns the local frontend runtime", () => {
  const webpackConfig = read("webpack.config.js");

  assert.match(webpackConfig, /allowedHosts:\s*"auto"/);
  assert.match(webpackConfig, /port:\s*3000/);
  assert.match(webpackConfig, /context:\s*\["\/api"\]/);
  assert.match(
    webpackConfig,
    /process\.env\.WEBPACK_API_PROXY_TARGET\s*\|\|\s*"http:\/\/localhost:3005"/,
  );
});

test("development and production API bases remain explicit", () => {
  assert.match(read(".env.example"), /^API_BASE_URL=\/api$/m);
  assert.match(read("README.md"), /https:\/\/api\.infinite-track\.tech\/api/);
  assert.equal(
    fs.existsSync(path.resolve(ROOT, ".env.production.example")),
    false,
  );
});

test("Web FE no longer owns Docker or Nginx runtime files", () => {
  for (const relativePath of REMOVED_RUNTIME_PATHS) {
    assert.equal(fs.existsSync(path.resolve(ROOT, relativePath)), false);
  }
});
