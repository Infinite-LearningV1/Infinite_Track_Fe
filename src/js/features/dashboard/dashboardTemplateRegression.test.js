import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const historicalTrendTemplatePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../partials/dashboard/historical-trend-panel.html",
);

function readHistoricalTrendTemplate() {
  return readFileSync(historicalTrendTemplatePath, "utf8");
}

test("historical trend chart markup avoids Alpine x-for templates inside svg", () => {
  const markup = readHistoricalTrendTemplate();
  const svgBlocks = markup.match(/<svg[\s\S]*?<\/svg>/g) || [];

  assert.ok(svgBlocks.length > 0);
  assert.ok(svgBlocks.every((block) => !/<template\b[^>]*x-for=/.test(block)));
});
