import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const drawerPath = join(
  root,
  "src",
  "partials",
  "modal",
  "user-detail-drawer.html",
);
const drawer = readFileSync(drawerPath, "utf8");
const indexSource = readFileSync(join(root, "src", "js", "index.js"), "utf8");
const managementUser = readFileSync(
  join(root, "src", "management-user.html"),
  "utf8",
);

test("the superseded map modal partial is gone", () => {
  assert.equal(
    existsSync(join(root, "src", "partials", "modal", "user-map-modal.html")),
    false,
  );
  assert.doesNotMatch(managementUser, /user-map-modal\.html/);
  assert.match(managementUser, /user-detail-drawer\.html/);
});

test("every close path routes through the canonical handler", () => {
  const closeCalls = drawer.match(/closeUserDetailDrawer\(\)/g) ?? [];
  assert.ok(
    closeCalls.length >= 4,
    `expected at least 4 canonical close bindings, found ${closeCalls.length}`,
  );
  assert.doesNotMatch(drawer, /isUserDetailDrawerOpen\s*=\s*false/);
  assert.doesNotMatch(drawer, /isMapDetailModalOpen/);
});

test("Escape closes the drawer", () => {
  assert.match(drawer, /@keydown\.escape\.window="closeUserDetailDrawer\(\)"/);
});

test("the drawer exposes dialog semantics and an accessible name", () => {
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /aria-labelledby="userDetailDrawerTitle"/);
  assert.match(drawer, /aria-describedby="userDetailDrawerDescription"/);
  assert.match(drawer, /id="userDetailDrawerTitle"/);
  assert.match(drawer, /id="userDetailDrawerDescription"/);
});

test("focus containment is wired to the panel", () => {
  assert.match(drawer, /@keydown\.tab="handleDrawerTab\(\$event\)"/);
});

test("the icon-only close control has an accessible label", () => {
  assert.match(drawer, /aria-label="Tutup detail pengguna"/);
});

test("the backdrop is hidden from assistive technology", () => {
  assert.match(drawer, /aria-hidden="true"/);
});

test("the drawer anchors to the right edge", () => {
  assert.match(drawer, /inset-y-0 right-0/);
});

test("WFH status is rendered as text, not colour alone", () => {
  assert.match(drawer, /x-text="wfhStatus"/);
});

test("the empty state uses the approved copy and renders no map", () => {
  assert.match(drawer, /Lokasi WFH belum diatur/);
});

test("the drawer never claims live or current employee location", () => {
  assert.doesNotMatch(drawer, /Lokasi Terkini/i);
  assert.doesNotMatch(drawer, /Lokasi Saat Ini/i);
  assert.doesNotMatch(drawer, /live location/i);
  assert.doesNotMatch(drawer, /current location/i);
});

test("index.js registers the drawer state and injects a real map adapter", () => {
  assert.match(indexSource, /Alpine\.data\("userDetailDrawerState"/);
  assert.match(indexSource, /createUserDetailDrawerLifecycle\(/);
  assert.match(indexSource, /createFocusTrap\(/);
});

test("management-user page mounts the drawer state", () => {
  assert.match(managementUser, /\.\.\.userDetailDrawerState\(\)/);
});
