import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  attendanceLogAlpineData,
  buildAttendanceLocation,
} from "../src/js/features/attendance/attendanceLog.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const attendanceSource = readFileSync(
  join(root, "src", "js", "features", "attendance", "attendanceLog.js"),
  "utf8",
);

test("buildAttendanceLocation never invents optional detail", () => {
  assert.deepEqual(
    buildAttendanceLocation({
      full_name: "Ayu",
      location: { latitude: "0", longitude: "119.8" },
    }),
    {
      fullName: "Ayu",
      latitude: 0,
      longitude: 119.8,
      radius: null,
      description: "",
    },
  );
});

test("buildAttendanceLocation uses only attendance location fields", () => {
  assert.deepEqual(
    buildAttendanceLocation({
      full_name: "Ayu",
      email: "ayu@example.com",
      phone_number: "0812",
      role_name: "Admin",
      latitude: "-0.9",
      longitude: "119.8",
      radius: "50",
      location_description: "Kantor",
    }),
    {
      fullName: "Ayu",
      latitude: -0.9,
      longitude: 119.8,
      radius: 50,
      description: "Kantor",
    },
  );
});

test("viewLocation no-ops without valid coordinates or the canonical helper", () => {
  const originalWindow = globalThis.window;
  const calls = [];
  globalThis.window = {
    openMapDetailModal: (payload) => calls.push(payload),
  };

  try {
    const component = attendanceLogAlpineData();
    component.viewLocation({ full_name: "No coordinates" });
    assert.deepEqual(calls, []);

    delete globalThis.window.openMapDetailModal;
    assert.doesNotThrow(() =>
      component.viewLocation({
        full_name: "No helper",
        location: { latitude: 0, longitude: 119.8 },
      }),
    );
    assert.deepEqual(calls, []);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("attendance location source contains no fabricated detail or browser alert fallback", () => {
  assert.doesNotMatch(attendanceSource, /radius\s*\|\|\s*100/);
  assert.doesNotMatch(attendanceSource, /Lokasi absensi karyawan/);
  assert.doesNotMatch(attendanceSource, /email:\s*attendanceItem/);
  assert.doesNotMatch(attendanceSource, /phoneNumber:\s*attendanceItem/);
  assert.doesNotMatch(attendanceSource, /alert\s*\(/);
});
