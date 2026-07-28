import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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

test("changePage returns the request promise and completes one request", async () => {
  const pending = deferred();
  const calls = [];
  const component = attendanceLogAlpineData({
    getAttendanceLog: (params) => {
      calls.push(params);
      return pending.promise;
    },
  });
  component.pagination.total_pages = 5;

  const request = component.changePage(2);
  pending.resolve(attendancePage([], { current_page: 2 }));
  await Promise.resolve();

  assert.equal(typeof request?.then, "function");
  await request;

  assert.equal(component.pagination.current_page, 2);
  assert.deepEqual(calls, [{ search: "", page: 2, limit: 10 }]);
});

test("changeLimit returns the request promise and completes one request", async () => {
  const pending = deferred();
  const calls = [];
  const component = attendanceLogAlpineData({
    getAttendanceLog: (params) => {
      calls.push(params);
      return pending.promise;
    },
  });

  const request = component.changeLimit(25);
  pending.resolve(
    attendancePage([], { current_page: 1, records_per_page: 25 }),
  );
  await Promise.resolve();

  assert.equal(typeof request?.then, "function");
  await request;

  assert.equal(component.pagination.records_per_page, 25);
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

test("rapid debounced searches cancel the stale timer and request only the latest query", async () => {
  const calls = [];
  const timers = [];
  const component = attendanceLogAlpineData({
    setTimeout: (callback, delay) => {
      const timer = { callback, delay, cancelled: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout: (timer) => {
      timer.cancelled = true;
    },
    getAttendanceLog: async (params) => {
      calls.push(params);
      return attendancePage([], { current_page: params.page });
    },
  });
  component.filters.page = 4;
  component.filters.search = "first";
  component.debouncedSearch();
  component.filters.search = "latest";
  component.debouncedSearch();

  assert.equal(timers.length, 2);
  assert.equal(timers[0].cancelled, true);
  assert.equal(timers[1].cancelled, false);

  if (!timers[0].cancelled) await timers[0].callback();
  await timers[1].callback();

  assert.deepEqual(calls, [{ search: "latest", page: 1, limit: 10 }]);
});

test("executeDelete ignores requests without a delete target", async () => {
  const events = [];
  const component = attendanceLogAlpineData({
    deleteAttendance: async (id) => events.push(["delete", id]),
    getAttendanceLog: async () => {
      events.push(["fetch"]);
      return attendancePage();
    },
  });

  await component.executeDelete();

  assert.deepEqual(events, []);
  assert.equal(component.isDeleting, false);
});

test("executeDelete suppresses a second submit while deletion is pending", async () => {
  const pendingDelete = deferred();
  const deletedIds = [];
  const originalWindow = globalThis.window;
  globalThis.window = { showInlineAlert: () => {} };
  const component = attendanceLogAlpineData({
    deleteAttendance: (id) => {
      deletedIds.push(id);
      return pendingDelete.promise;
    },
    getAttendanceLog: async () => attendancePage(),
  });
  component.deleteTargetId = 42;

  try {
    const firstDelete = component.executeDelete();
    const secondDelete = component.executeDelete();

    assert.equal(component.isDeleting, true);
    assert.deepEqual(deletedIds, [42]);

    pendingDelete.resolve();
    await Promise.all([firstDelete, secondDelete]);

    assert.deepEqual(deletedIds, [42]);
    assert.equal(component.isDeleting, false);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("successful delete refreshes authoritative server state", async () => {
  const deletedIds = [];
  const refreshCalls = [];
  const originalWindow = globalThis.window;
  globalThis.window = { showInlineAlert: () => {} };

  try {
    const component = attendanceLogAlpineData({
      deleteAttendance: async (id) => deletedIds.push(id),
      getAttendanceLog: async (params) => {
        refreshCalls.push(params);
        return attendancePage();
      },
    });
    component.deleteTargetId = 42;

    await component.executeDelete();

    assert.deepEqual(deletedIds, [42]);
    assert.deepEqual(refreshCalls, [{ search: "", page: 1, limit: 10 }]);
    assert.equal(component.deleteTargetId, null);
    assert.equal(component.isDeleting, false);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("failed delete clears submitting state and retains the server list", async () => {
  const initialRows = [{ id_attendance: 42, full_name: "Alpha" }];
  const refreshCalls = [];
  const originalWindow = globalThis.window;
  globalThis.window = { showInlineAlert: () => {} };

  try {
    const component = attendanceLogAlpineData({
      deleteAttendance: async () => {
        throw new Error("delete failed");
      },
      getAttendanceLog: async (params) => {
        refreshCalls.push(params);
        return attendancePage();
      },
    });
    component.attendanceData = initialRows;
    component.deleteTargetId = 42;

    await component.executeDelete();

    assert.equal(component.deleteTargetId, null);
    assert.equal(component.isDeleting, false);
    assert.equal(component.attendanceData, initialRows);
    assert.deepEqual(refreshCalls, []);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("attendance table has no calls to removed local sorting APIs", () => {
  const template = readFileSync(
    new URL("../src/partials/table/table-attendance.html", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(template, /changeSort\(/);
  assert.doesNotMatch(template, /getSortIcon\(/);
  assert.doesNotMatch(template, /isSortFieldSupported\(/);
});
