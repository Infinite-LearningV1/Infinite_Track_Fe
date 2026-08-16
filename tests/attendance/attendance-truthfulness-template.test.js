import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { attendanceLogAlpineData } from "../../src/js/features/attendance/attendanceLog.js";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("current attendance UI does not expose obsolete sorting APIs", () => {
  const table = readSource("../../src/partials/table/table-attendance.html");

  assert.doesNotMatch(table, /changeSort\(/);
  assert.doesNotMatch(table, /getSortIcon\(/);
  assert.doesNotMatch(table, /isSortFieldSupported\(/);
});

test("search copy names only current backend search fields", () => {
  const table = readSource("../../src/partials/table/table-attendance.html");

  assert.match(table, /Cari nama atau NIP\/NIM/);
  assert.doesNotMatch(table, /ID, atau status/);
});

test("attendance list state does not expose local sorting APIs", () => {
  const source = readSource("../../src/js/features/attendance/attendanceLog.js");

  assert.doesNotMatch(source, /changeSort/);
  assert.doesNotMatch(source, /getSortIcon/);
  assert.doesNotMatch(source, /supportedSortFields/);
});

test("audit table shows the canonical date and Mode fields", () => {
  const table = readSource("../../src/partials/table/table-attendance.html");

  assert.match(table, />\s*Tanggal\s*</);
  assert.match(
    table,
    /x-text="formatAttendanceDateLabel\(log\.attendanceDate\)"/,
  );
  assert.match(table, />\s*Mode\s*</);
  assert.doesNotMatch(table, />\s*Information\s*</);
  assert.equal(attendanceLogAlpineData().getInfoBadgeText(), "-");
});

test("list location uses the canonical plain-text presentation contract", () => {
  const table = readSource("../../src/partials/table/table-attendance.html");

  assert.match(table, /x-text="getAttendanceLocationText\(log\.location\)"/);
  assert.match(table, /:title="getAttendanceLocationText\(log\.location\)"/);
  assert.match(table, /line-clamp-2/);
  assert.doesNotMatch(table, /log\.location\.available \? 'bg-success/);
});
