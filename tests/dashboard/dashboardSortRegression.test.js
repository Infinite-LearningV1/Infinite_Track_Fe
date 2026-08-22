import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { dashboard } from "../../src/js/features/dashboard/dashboard.js";

const dashboardSourcePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/js/features/dashboard/dashboard.js",
);

function readDashboardSource() {
  return readFileSync(dashboardSourcePath, "utf8");
}

test("dashboard defines a single changeSort handler", () => {
  const source = readDashboardSource();
  const handlerDefinitions = source.match(/\n\s*changeSort\(field\) \{/g) || [];

  assert.equal(handlerDefinitions.length, 1);
});

test("dashboard sort handler keeps allowed fields and mirrors filter sort state", () => {
  const component = dashboard();
  let loadCount = 0;
  component.loadSummaryData = () => {
    loadCount += 1;
  };

  component.filters.page = 3;
  component.changeSort("status");

  assert.deepEqual(component.currentSort, {
    field: "status",
    direction: "asc",
  });
  assert.equal(component.filters.sortBy, "status");
  assert.equal(component.filters.sortOrder, "asc");
  assert.equal(component.filters.page, 1);
  assert.equal(loadCount, 1);

  component.changeSort("status");

  assert.deepEqual(component.currentSort, {
    field: "status",
    direction: "desc",
  });
  assert.equal(component.filters.sortOrder, "desc");
  assert.equal(loadCount, 2);

  component.changeSort("unsupported_field");

  assert.deepEqual(component.currentSort, {
    field: "status",
    direction: "desc",
  });
  assert.equal(component.filters.sortBy, "status");
  assert.equal(component.filters.sortOrder, "desc");
  assert.equal(loadCount, 2);
});
