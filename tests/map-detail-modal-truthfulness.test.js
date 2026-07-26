import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  coerceFiniteMapNumber,
  firstFiniteMapNumber,
  hasFiniteCoordinates,
} from "../src/js/utils/mapLocationTruth.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexSource = readFileSync(join(root, "src", "js", "index.js"), "utf8");
const modalSource = readFileSync(
  join(root, "src", "js", "components", "modal", "mapDetailModal.js"),
  "utf8",
);
const dashboardMapModal = readFileSync(
  join(root, "src", "partials", "modal", "map-detail-modal.html"),
  "utf8",
);
const userDetailDrawer = readFileSync(
  join(root, "src", "partials", "modal", "user-detail-drawer.html"),
  "utf8",
);

test("map location helpers preserve zero coordinates and reject empty values", () => {
  assert.equal(coerceFiniteMapNumber(0), 0);
  assert.equal(coerceFiniteMapNumber("0"), 0);
  assert.equal(coerceFiniteMapNumber(" 119.8 "), 119.8);
  assert.equal(coerceFiniteMapNumber(""), null);
  assert.equal(coerceFiniteMapNumber("   "), null);
  assert.equal(coerceFiniteMapNumber(undefined), null);
  assert.equal(coerceFiniteMapNumber(null), null);
  assert.equal(coerceFiniteMapNumber("invalid"), null);

  assert.equal(firstFiniteMapNumber(undefined, null, 0), 0);
  assert.equal(firstFiniteMapNumber("", "0", 12), 0);
  assert.equal(firstFiniteMapNumber(undefined, "119.8"), 119.8);
  assert.equal(firstFiniteMapNumber(undefined, null, "invalid"), null);
});

test("map coordinate helper treats zero pairs as valid coordinates", () => {
  assert.equal(hasFiniteCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(
    hasFiniteCoordinates({ latitude: -0.9, longitude: 119.8 }),
    true,
  );
  assert.equal(
    hasFiniteCoordinates({ latitude: null, longitude: 119.8 }),
    false,
  );
  assert.equal(hasFiniteCoordinates({ latitude: 0, longitude: null }), false);
});

test("global map detail modal state uses finite-number helpers instead of truthy coordinate checks", () => {
  assert.match(indexSource, /firstFiniteMapNumber\(/);
  assert.match(
    indexSource,
    /hasFiniteCoordinates\(this\.selectedUserLocation\)/,
  );
  assert.doesNotMatch(indexSource, /latitude:\s*user\.latitude\s*\|\|/);
  assert.doesNotMatch(indexSource, /longitude:\s*user\.longitude\s*\|\|/);
  assert.doesNotMatch(indexSource, /radius:\s*user\.radius\s*\|\|/);
  assert.doesNotMatch(
    indexSource,
    /this\.selectedUserLocation\.latitude\s*&&\s*this\.selectedUserLocation\.longitude/,
  );
});

test("map detail modal source and templates keep zero coordinates visible", () => {
  assert.match(modalSource, /hasFiniteCoordinates\(locationData\)/);
  assert.match(modalSource, /Number\.isFinite\(locationData\.radius\)/);
  assert.doesNotMatch(
    modalSource,
    /if \(!locationData\.latitude \|\| !locationData\.longitude\)/,
  );

  for (const templateSource of [dashboardMapModal, userDetailDrawer]) {
    assert.match(
      templateSource,
      /Number\.isFinite\(selectedUserLocation\.latitude\) \? selectedUserLocation\.latitude : '-'/,
    );
    assert.match(
      templateSource,
      /Number\.isFinite\(selectedUserLocation\.longitude\) \? selectedUserLocation\.longitude : '-'/,
    );
    assert.match(
      templateSource,
      /Number\.isFinite\(selectedUserLocation\.radius\) \? selectedUserLocation\.radius \+ ' m' : '-'/,
    );
    assert.match(
      templateSource,
      /Number\.isFinite\(selectedUserLocation\.latitude\) && Number\.isFinite\(selectedUserLocation\.longitude\)/,
    );
    assert.match(
      templateSource,
      /!Number\.isFinite\(selectedUserLocation\.latitude\) \|\| !Number\.isFinite\(selectedUserLocation\.longitude\)/,
    );
  }
});
