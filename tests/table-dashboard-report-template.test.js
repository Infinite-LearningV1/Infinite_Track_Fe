import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const partialPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "partials",
  "table",
  "table-dashboard-report.html",
);

function readPartial() {
  return readFileSync(partialPath, "utf8");
}

test("dashboard report table renders attendance date in the Attendance Date body column", () => {
  const partial = readPartial();

  assert.match(partial, /<span>Attendance Date<\/span>/);

  const attendanceDateBodyColumn = partial.match(
    /<!-- Time Out -->[\s\S]*?<\/td>\s*<!--[^>]*-->\s*<td[\s\S]*?<span\s+x-text="([^"]+)"/,
  );

  assert.ok(attendanceDateBodyColumn, "Expected to find the fourth dashboard report table body column");
  assert.equal(attendanceDateBodyColumn[1], "log.attendance_date || '-'");
  assert.doesNotMatch(attendanceDateBodyColumn[0], /log\.work_hour/);
});
