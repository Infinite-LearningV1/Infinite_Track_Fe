import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dashboardTemplatePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../partials/dashboard/dashboard-cockpit-grid.html",
);

function readDashboardTemplate() {
  return readFileSync(dashboardTemplatePath, "utf8");
}

test("dashboard cockpit chart markup avoids Alpine x-for templates inside svg", () => {
  const markup = readDashboardTemplate();
  const svgBlocks = markup.match(/<svg[\s\S]*?<\/svg>/g) || [];

  assert.ok(svgBlocks.length > 0);
  assert.ok(svgBlocks.every((block) => !/<template\b[^>]*x-for=/.test(block)));
});
