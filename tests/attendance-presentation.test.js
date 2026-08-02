import test from "node:test";
import assert from "node:assert/strict";

import {
  formatAttendanceDateLabel,
  formatAttendanceWorkDuration,
  getAttendanceLocationText,
} from "../src/js/features/attendance/attendancePresentation.js";

test("formats Backend date-only evidence with Indonesian weekday", () => {
  assert.equal(formatAttendanceDateLabel("2026-07-23"), "Kamis, 23 Juli 2026");
  assert.equal(
    formatAttendanceDateLabel("2024-02-29"),
    "Kamis, 29 Februari 2024",
  );
  assert.equal(formatAttendanceDateLabel("2026-02-30"), "-");
  assert.equal(formatAttendanceDateLabel("2026/07/23"), "-");
  assert.equal(formatAttendanceDateLabel(""), "-");
});

test("formats Backend HH:mm work duration as compact Indonesian copy", () => {
  assert.equal(formatAttendanceWorkDuration("10:15"), "10j 15m");
  assert.equal(formatAttendanceWorkDuration("10:00"), "10j");
  assert.equal(formatAttendanceWorkDuration("00:15"), "15m");
  assert.equal(formatAttendanceWorkDuration("00:00"), "0m");
  assert.equal(formatAttendanceWorkDuration("10:60"), "Durasi tidak tersedia");
  assert.equal(
    formatAttendanceWorkDuration(undefined),
    "Durasi tidak tersedia",
  );
});

test("derives plain Location copy only from list availability and description", () => {
  assert.equal(
    getAttendanceLocationText({ available: true, description: "Kantor Palu" }),
    "Kantor Palu",
  );
  assert.equal(
    getAttendanceLocationText({ available: true, description: "   " }),
    "Lokasi tersedia",
  );
  assert.equal(
    getAttendanceLocationText({
      available: false,
      description: "Koordinat lama",
    }),
    "Lokasi tidak tersedia",
  );
});
