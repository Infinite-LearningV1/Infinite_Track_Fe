import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const root = join(process.cwd(), "src", "partials", "dashboard");
const partial = readFileSync(join(root, "fuzzy-ahp-panel.html"), "utf8");
const grid = readFileSync(join(root, "dashboard-cockpit-grid.html"), "utf8");

test("FAHP partial owns stable three-option navigation and separate status", () => {
  assert.equal((partial.match(/<nav\b/g) || []).length, 1);
  assert.match(partial, /x-for="option in panel\.data\.typeOptions \|\| \[\]"/);
  assert.match(partial, /@click="selectFahpType\(option\.key\)"/);
  assert.match(partial, /fahpFilterState\.type === option\.key/);
  assert.match(partial, /data-fahp-status/);
  assert.doesNotMatch(partial, /activeFahpTab/);
});

test("FAHP partial exposes explicit WFA context", () => {
  assert.match(partial, /@submit\.prevent="runWfaFahpAnalysis\(\)"/);
  for (const field of [
    "latitude",
    "longitude",
    "scheduleDate",
    "radiusMeters",
  ]) {
    assert.match(partial, new RegExp(`x-model="wfaFahpContext\\.${field}"`));
    assert.equal(
      (partial.match(/@input="invalidateWfaFahpResult\(\)"/g) || []).length,
      4,
    );
  }
  assert.match(partial, /x-text="wfaFahpContext\.validationError"/);
  assert.doesNotMatch(partial, /dashboardMap|cockpit\.hero|todayLocations/);
  assert.match(grid, /get isFuzzyAhpPanel\(\)/);
  assert.match(grid, /x-if="isFuzzyAhpPanel"/);
  assert.doesNotMatch(grid, /loadFuzzyAhpDetail\(\{ type: option\.key \}\)/);
});
