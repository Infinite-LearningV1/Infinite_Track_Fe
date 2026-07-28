import test from "node:test";
import assert from "node:assert/strict";

import { normalizeAttendanceListRow } from "../src/js/features/attendance/attendanceListRow.js";

const slimAttendanceRow = (overrides = {}) => ({
  id_attendance: 42,
  id: 7,
  full_name: "Ayu Lestari",
  nip_nim: "2026007",
  role_name: "Staff",
  attendance_date: "2026-07-28",
  time_in: "08:00",
  time_out: "17:00",
  work_hour: "09:00",
  information: "WFH",
  status: "ontime",
  checkout_state: "completed",
  location: { latitude: -0.91, longitude: 119.87 },
  email: "must-not-leak@example.com",
  notes: "detail only",
  radius: 100,
  description: "detail only",
  booking_id: 55,
  ...overrides,
});

test("normalizes exactly the slim INF-267 list contract", () => {
  assert.deepEqual(normalizeAttendanceListRow(slimAttendanceRow()), {
    idAttendance: 42,
    employeeId: 7,
    fullName: "Ayu Lestari",
    nipNim: "2026007",
    roleName: "Staff",
    attendanceDate: "2026-07-28",
    timeIn: "08:00",
    timeOut: "17:00",
    workHour: "09:00",
    mode: "WFH",
    status: "ontime",
    checkoutState: "completed",
    location: { latitude: -0.91, longitude: 119.87 },
  });
});

test("prefers canonical mode and normalizes only finite attendance coordinates", () => {
  assert.deepEqual(
    normalizeAttendanceListRow(
      slimAttendanceRow({
        mode: "WFA",
        information: "WFH",
        location: { latitude: "0", longitude: "not-a-coordinate" },
      }),
    ),
    {
      idAttendance: 42,
      employeeId: 7,
      fullName: "Ayu Lestari",
      nipNim: "2026007",
      roleName: "Staff",
      attendanceDate: "2026-07-28",
      timeIn: "08:00",
      timeOut: "17:00",
      workHour: "09:00",
      mode: "WFA",
      status: "ontime",
      checkoutState: "completed",
      location: { latitude: 0, longitude: null },
    },
  );
});

test("temporary aliases include only fields consumed by the current table", () => {
  const normalized = normalizeAttendanceListRow(slimAttendanceRow());

  assert.equal("nip_nim" in normalized, false);
  assert.equal("checkout_state" in normalized, false);
  assert.equal(normalized.full_name, "Ayu Lestari");
  assert.equal(normalized.information, "WFH");
});
