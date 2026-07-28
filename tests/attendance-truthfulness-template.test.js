import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { attendanceLogAlpineData } from "../src/js/features/attendance/attendanceLog.js";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("current attendance UI does not advertise unsupported sorting", () => {
  const table = readSource("../src/partials/table/table-attendance.html");

  assert.doesNotMatch(table, /changeSort\(/);
  assert.doesNotMatch(table, /getSortIcon\(/);
  assert.doesNotMatch(table, /isSortFieldSupported\(/);
});

test("search copy names only current backend search fields", () => {
  const page = readSource("../src/management-attendance.html");

  assert.match(page, /Cari nama atau NIP\/NIM/);
  assert.doesNotMatch(page, /ID, atau status/);
});

test("attendance list state does not expose local sorting APIs", () => {
  const source = readSource("../src/js/features/attendance/attendanceLog.js");

  assert.doesNotMatch(source, /changeSort/);
  assert.doesNotMatch(source, /getSortIcon/);
  assert.doesNotMatch(source, /supportedSortFields/);
});

test("audit table shows the canonical date and Mode fields", () => {
  const table = readSource("../src/partials/table/table-attendance.html");

  assert.match(table, />\s*Tanggal\s*</);
  assert.match(table, /x-text="log\.attendanceDate \|\| '-'"/);
  assert.match(table, />\s*Mode\s*</);
  assert.doesNotMatch(table, />\s*Information\s*</);
  assert.equal(attendanceLogAlpineData().getInfoBadgeText(), "-");
});

test("location availability requires finite coordinates without a coordinate alert", () => {
  const table = readSource("../src/partials/table/table-attendance.html");
  const component = attendanceLogAlpineData();

  assert.match(table, /hasAttendanceCoordinates\(log\)/);
  assert.match(table, /Lokasi tidak tersedia/);
  assert.doesNotMatch(table, /!log\.location\?\.latitude/);
  assert.equal(
    component.hasAttendanceCoordinates({
      location: { latitude: 0, longitude: 0 },
    }),
    true,
  );
  assert.equal(component.hasAttendanceCoordinates({ location: {} }), false);
});
