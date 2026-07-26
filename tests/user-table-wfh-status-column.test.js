import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const table = readFileSync(
  join(root, "src", "partials", "table", "table-user.html"),
  "utf8",
);
const listSource = readFileSync(
  join(root, "src", "js", "features", "userManagement", "userListSimple.js"),
  "utf8",
);

test("the table exposes a Lokasi WFH column instead of Koordinat", () => {
  assert.match(table, /Lokasi WFH/);
  assert.doesNotMatch(table, /Koordinat/);
});

test("the table renders WFH readiness as text", () => {
  assert.match(table, /x-text="wfhStatusFor\(user\)"/);
});

test("the table never renders raw coordinates", () => {
  assert.doesNotMatch(table, /x-text="user\.latitude/);
  assert.doesNotMatch(table, /x-text="user\.longitude/);
  assert.doesNotMatch(table, /user\.latitude\s*\+\s*/);
});

test("the detail control opens the drawer and is labelled for assistive tech", () => {
  assert.match(table, /openUserDetailDrawer\(user\)/);
  assert.match(
    table,
    /:aria-label="`Lihat detail pengguna \$\{user\.fullName\}`"/,
  );
});

test("the superseded map modal entry point is gone from the table", () => {
  assert.doesNotMatch(table, /openMapDetailModal/);
});

test("the feature exposes wfhStatusFor and no longer builds a modal payload", () => {
  assert.match(listSource, /wfhStatusFor\(user\)/);
  assert.match(listSource, /resolveWfhStatus\(/);
  assert.doesNotMatch(listSource, /openMapDetailModal/);
});

test("the feature no longer invents radius or description defaults", () => {
  assert.doesNotMatch(listSource, /radius:\s*user\.radius\s*\|\|\s*100/);
  assert.doesNotMatch(listSource, /Lokasi pengguna/);
});

test("the row mapper coerces coordinates by finiteness, not truthiness", () => {
  // A latitude, longitude or radius of exactly 0 is configured data. Truthy
  // `||` chains would map it to null and surface it as "Belum diatur".
  assert.doesNotMatch(
    listSource,
    /latitude:\s*user\.location\?\.latitude\s*\|\|/,
  );
  assert.doesNotMatch(
    listSource,
    /longitude:\s*user\.location\?\.longitude\s*\|\|/,
  );
  assert.doesNotMatch(listSource, /radius:\s*user\.location\?\.radius\s*\|\|/);

  assert.match(
    listSource,
    /firstFiniteMapNumber\(user\.location\?\.latitude\)/,
  );
  assert.match(
    listSource,
    /firstFiniteMapNumber\(user\.location\?\.longitude\)/,
  );
  assert.match(listSource, /firstFiniteMapNumber\(user\.location\?\.radius\)/);
  assert.match(listSource, /firstFiniteMapNumber.*mapLocationTruth\.js/s);
});
