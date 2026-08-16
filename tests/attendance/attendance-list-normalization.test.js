import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAttendanceListResponse } from "../../src/js/features/attendance/attendanceLog.js";

const attendancePage = (data = [], pagination = {}) => ({
  data,
  pagination: {
    current_page: 1,
    total_pages: 1,
    total_records: data.length,
    records_per_page: 10,
    has_prev_page: false,
    has_next_page: false,
    ...pagination,
  },
});

test("normalizes records_per_page and preserves explicit zero/false metadata", () => {
  assert.deepEqual(
    normalizeAttendanceListResponse({
      data: [],
      pagination: {
        current_page: 2,
        total_pages: 0,
        total_records: 0,
        records_per_page: 25,
        has_prev_page: true,
        has_next_page: false,
      },
    }),
    {
      data: [],
      pagination: {
        current_page: 2,
        total_pages: 0,
        total_records: 0,
        records_per_page: 25,
        has_prev_page: true,
        has_next_page: false,
      },
    },
  );
});

test("uses per_page only as a compatibility fallback", () => {
  const result = normalizeAttendanceListResponse({
    data: [{ id_attendance: 7 }],
    pagination: { per_page: 50 },
  });
  assert.equal(result.pagination.records_per_page, 50);
});

test("attendance page size is driven by canonical normalized state", () => {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const template = fs.readFileSync(
    path.join(dirname, "../../src/partials/table/table-attendance.html"),
    "utf8",
  );

  assert.match(template, /x-model="appliedQuery\.limit"/);
  assert.doesNotMatch(template, /pagination\.per_page/);
});
