import test from "node:test";
import assert from "node:assert/strict";
import { getAvatarColor, getInitials } from "../src/js/utils/avatarUtils.js";

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
    photo: "https://cdn.example.com/users/45/profile.jpg",
    photo_updated_at: "2026-08-11T03:00:00.000Z",
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
    photo: "https://cdn.example.com/users/45/profile.jpg",
    photoUpdatedAt: "2026-08-11T03:00:00.000Z",
    avatar: {
      photoUrl: "https://cdn.example.com/users/45/profile.jpg",
      initials: getInitials("Muhammad Rizki Ramdani"),
      avatarColor: getAvatarColor("Muhammad Rizki Ramdani"),
    },
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

test("ignores obsolete flat fields and list coordinates in favor of the nested live contract", () => {
  assert.deepEqual(
    normalizeAttendanceListRow(
      liveListRow({
        id: 999,
        full_name: "Obsolete Employee",
        nip_nim: "OBSOLETE",
        role_name: "Obsolete Role",
        work_hour: "99:99",
        information: "Obsolete Mode",
        status: "obsolete-status",
        checkout_state: "obsolete-checkout",
        location: {
          available: true,
          id: 700,
          description: "Nested live location",
          latitude: -0.91,
          longitude: 119.87,
        },
      }),
    ),
    {
      idAttendance: 12041,
      employeeId: 45,
      fullName: "Muhammad Rizki Ramdani",
      nipNim: "9BYYD3",
      roleName: "Internship",
      photo: "https://cdn.example.com/users/45/profile.jpg",
      photoUpdatedAt: "2026-08-11T03:00:00.000Z",
      avatar: {
        photoUrl: "https://cdn.example.com/users/45/profile.jpg",
        initials: getInitials("Muhammad Rizki Ramdani"),
        avatarColor: getAvatarColor("Muhammad Rizki Ramdani"),
      },
      attendanceDate: "2026-07-23",
      timeIn: "23:55",
      timeOut: "23:55",
      workHour: "00:00",
      mode: "wfo",
      modeLabel: "WFO",
      status: "",
      statusLabel: "",
      checkoutState: "completed",
      location: {
        available: true,
        id: 700,
        description: "Nested live location",
      },
    },
  );
});


test("normalizes a missing attendance photo to truthful initials fallback", () => {
  const normalized = normalizeAttendanceListRow(
    liveListRow({
      user: {
        ...liveListRow().user,
        photo: null,
        photo_updated_at: null,
      },
    }),
  );

  assert.equal(normalized.photo, null);
  assert.equal(normalized.photoUpdatedAt, null);
  assert.equal(normalized.avatar.photoUrl, null);
  assert.equal(normalized.avatar.initials, getInitials("Muhammad Rizki Ramdani"));
});

[
  [null, "open"],
  ["17:00", "completed"],
  ["   ", ""],
  [undefined, ""],
  ["", ""],
  [17, ""],
].forEach(([timeOut, expected]) => {
  test(`derives checkout presentation from time_out ${String(timeOut)}`, () => {
    assert.equal(deriveAttendanceCheckoutState(timeOut), expected);
  });
});
