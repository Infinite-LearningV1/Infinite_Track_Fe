import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("backend settings page includes WFA reason catalogs", async () => {
  const html = await source("src/management-backend-settings.html");
  assert.match(html, /partials\/settings\/wfa-reason-catalogs\.html/);
});

test("WFA catalog partial mounts request and rejection factories", async () => {
  const html = await source("src/partials/settings/wfa-reason-catalogs.html");
  assert.match(html, /wfaReasonCatalogAlpineData\('request'\)/);
  assert.match(html, /wfaReasonCatalogAlpineData\('rejection'\)/);
  assert.doesNotMatch(html, /delete/i);
});

test("index registers the WFA catalog factory", async () => {
  const js = await source("src/js/index.js");
  assert.match(js, /window\.wfaReasonCatalogAlpineData/);
});
