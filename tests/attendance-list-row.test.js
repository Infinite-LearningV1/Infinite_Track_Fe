import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveAttendanceCheckoutState,
  normalizeAttendanceListRow,
} from "../src/js/features/attendance/attendanceListRow.js";

const liveListRow = (overrides = {}) => ({
  id_attendance: 12041,
  attendance_date: "2026-07-23",
  user: {
    id: 45,
    full_name: "Muhammad Rizki Ramdani",
    nip_nim: "9BYYD3",
    role: "Internship",
  },
  time_in: "23:55",
  time_out: "23:55",
  work_duration: "00:00",
  mode: { key: "wfo", label: "WFO" },
  status: { key: "alpha", label: "Alpha" },
  location: { available: false, id: null, description: null },
  ...overrides,
});

test("normalizes the exact live nested attendance list row", () => {
  assert.deepEqual(normalizeAttendanceListRow(liveListRow()), {
    idAttendance: 12041,
    employeeId: 45,
    fullName: "Muhammad Rizki Ramdani",
    nipNim: "9BYYD3",
    roleName: "Internship",
    attendanceDate: "2026-07-23",
    timeIn: "23:55",
    timeOut: "23:55",
    workHour: "00:00",
    mode: "wfo",
    modeLabel: "WFO",
    status: "alpha",
    statusLabel: "Alpha",
    checkoutState: "completed",
    location: { available: false, id: null, description: "" },
  });
});

[
  [null, "open"],
  ["17:00", "completed"],
  [undefined, ""],
  ["", ""],
  [17, ""],
].forEach(([timeOut, expected]) => {
  test(`derives checkout presentation from time_out ${String(timeOut)}`, () => {
    assert.equal(deriveAttendanceCheckoutState(timeOut), expected);
  });
});
