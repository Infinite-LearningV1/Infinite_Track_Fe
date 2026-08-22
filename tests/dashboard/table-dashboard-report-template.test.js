import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const partialPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
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
    /x-text="log\.time_out \|\| '-'"[\s\S]*?<td[\s\S]*?<span x-text="([^"]+)"/,
  );

  assert.ok(
    attendanceDateBodyColumn,
    "Expected to find the attendance date body column after the Time Out column",
  );
  assert.equal(attendanceDateBodyColumn[1], "log.attendance_date || '-'");
  assert.doesNotMatch(attendanceDateBodyColumn[0], /log\.work_hour/);
});

test("dashboard report empty pagination summary does not render a 1 to 0 range", () => {
  const partial = readPartial();

  assert.doesNotMatch(
    partial,
    /x-text="\(\(pagination\.current_page - 1\) \* pagination\.per_page\) \+ 1"/,
    "Expected empty-state-safe pagination summary instead of always rendering a first-row index",
  );
  assert.match(
    partial,
    /pagination\.total_records === 0 \? 0 : \(\(pagination\.current_page - 1\) \* pagination\.per_page\) \+ 1/,
  );
});

test("dashboard report table keeps missing identity, status, info, and discipline fields explicitly unavailable", () => {
  const partial = readPartial();

  assert.match(
    partial,
    /x-text="hasAvailableValue\(log\.full_name\) \? log\.full_name : 'Unavailable'"/,
  );
  assert.match(
    partial,
    /x-text="hasAvailableValue\(log\.nim \|\| log\.nip_nim\) \? \(log\.nim \|\| log\.nip_nim\) : 'Unavailable'"/,
  );
  assert.match(
    partial,
    /x-text="hasAvailableValue\(log\.status\) \? getStatusBadgeText\(log\.status\) : 'Unavailable'"/,
  );
  assert.match(
    partial,
    /x-text="hasAvailableValue\(log\.location_details\?\.category \|\| log\.information \|\| log\.work_type\) \? getInfoBadgeText\(log\.location_details\?\.category \|\| log\.information \|\| log\.work_type\) : 'Unavailable'"/,
  );
  assert.match(
    partial,
    /x-text="hasAvailableValue\(log\.discipline_label\) \? log\.discipline_label : 'Unavailable'"/,
  );
  assert.match(
    partial,
    /x-text="hasAvailableValue\(log\.discipline_score\) \? `\$\{log\.discipline_score\}\/100` : 'Unavailable'"/,
  );
  assert.match(
    partial,
    /<template x-if="hasAvailableValue\(log\.id_attendance\)">[\s\S]*?@click="confirmDelete\(log\.id_attendance\)"/,
  );
  assert.doesNotMatch(partial, /log\.discipline_label \|\| 'Unknown'/);
  assert.doesNotMatch(partial, /log\.discipline_score \|\| 0/);
});
