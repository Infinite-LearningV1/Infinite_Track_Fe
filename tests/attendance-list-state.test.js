import test from "node:test";
import assert from "node:assert/strict";

import { attendanceLogAlpineData } from "../src/js/features/attendance/attendanceLog.js";

const attendancePage = (data = [], pagination = {}) => ({
  data,
  pagination: {
    current_page: 1,
    total_pages: 5,
    total_records: data.length,
    records_per_page: 10,
    has_prev_page: false,
    has_next_page: true,
    ...pagination,
  },
});

test("fetchAttendance sends current server query and keeps server row order", async () => {
  const calls = [];
  const component = attendanceLogAlpineData({
    getAttendanceLog: async (params) => {
      calls.push(params);
      return attendancePage([
        { id_attendance: 2, full_name: "Zulu" },
        { id_attendance: 1, full_name: "Alpha" },
      ]);
    },
  });
  component.filters.search = "12345";
  component.filters.page = 3;
  component.filters.limit = 25;

  await component.fetchAttendance();

  assert.deepEqual(calls, [{ search: "12345", page: 3, limit: 25 }]);
  assert.deepEqual(
    component.attendanceData.map((row) => row.id_attendance),
    [2, 1],
  );
});

test("changePage preserves the selected page and makes one server request", async () => {
  const calls = [];
  const component = attendanceLogAlpineData({
    getAttendanceLog: async (params) => {
      calls.push(params);
      return attendancePage([], { current_page: params.page });
    },
  });
  component.pagination.total_pages = 5;

  await component.changePage(3);

  assert.equal(component.filters.page, 3);
  assert.deepEqual(calls, [{ search: "", page: 3, limit: 10 }]);
});

test("changeLimit resets to the first page and makes one server request", async () => {
  const calls = [];
  const component = attendanceLogAlpineData({
    getAttendanceLog: async (params) => {
      calls.push(params);
      return attendancePage([], {
        current_page: params.page,
        records_per_page: params.limit,
      });
    },
  });
  component.filters.page = 4;

  await component.changeLimit(25);

  assert.equal(component.filters.page, 1);
  assert.deepEqual(calls, [{ search: "", page: 1, limit: 25 }]);
});

test("debounced search resets to the first page and makes one server request", async () => {
  const calls = [];
  const scheduled = [];
  const component = attendanceLogAlpineData({
    setTimeout: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
    clearTimeout: () => {},
    getAttendanceLog: async (params) => {
      calls.push(params);
      return attendancePage([], { current_page: params.page });
    },
  });
  component.filters.search = "employee-42";
  component.filters.page = 4;

  component.debouncedSearch();

  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 500);
  await scheduled[0].callback();

  assert.equal(component.filters.page, 1);
  assert.deepEqual(calls, [{ search: "employee-42", page: 1, limit: 10 }]);
});
