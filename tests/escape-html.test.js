import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { escapeHtml } from "../src/js/utils/escapeHtml.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modalSource = readFileSync(
  join(root, "src", "js", "components", "modal", "mapDetailModal.js"),
  "utf8",
);

test("escapeHtml neutralizes HTML control characters", () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
  );
  assert.equal(escapeHtml("Tom & Jerry"), "Tom &amp; Jerry");
  assert.equal(escapeHtml("it's"), "it&#39;s");
});

test("escapeHtml renders absent values as empty string, not literal null", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(""), "");
});

test("escapeHtml preserves zero and other falsy non-empty values", () => {
  assert.equal(escapeHtml(0), "0");
  assert.equal(escapeHtml(false), "false");
});

test("escapeHtml escapes an already-encoded entity exactly once", () => {
  assert.equal(escapeHtml("&lt;"), "&amp;lt;");
});

test("map popup escapes untrusted backend text instead of interpolating it raw", () => {
  assert.match(modalSource, /escapeHtml\(locationData\.fullName\)/);
  assert.match(modalSource, /escapeHtml\(locationData\.description\)/);
  assert.doesNotMatch(modalSource, /\$\{locationData\.fullName\}/);
  assert.doesNotMatch(modalSource, /\$\{locationData\.description\}/);
});
