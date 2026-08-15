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

test("FAHP partial exposes date-range WFA academic analysis", () => {
  assert.match(partial, /WFA Analysis/);
  assert.match(partial, /Criteria Weights/);
  assert.match(partial, /Evidence/);
  assert.match(partial, /approvedBookingCount/);
  assert.match(partial, /analyzableBookingCount/);
  assert.doesNotMatch(
    partial,
    /runWfaFahpAnalysis|wfaFahpContext|Latitude|Longitude|Schedule date|Radius meters|Run WFA Analysis/,
  );
  assert.match(partial, /wfa_date_range_analysis/);
  assert.doesNotMatch(partial, /dashboardMap|cockpit\.hero|todayLocations/);
  assert.match(grid, /get isFuzzyAhpPanel\(\)/);
  assert.match(grid, /x-if="isFuzzyAhpPanel"/);
  assert.doesNotMatch(grid, /loadFuzzyAhpDetail\(\{ type: option\.key \}\)/);
});
