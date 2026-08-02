import test from "node:test";
import assert from "node:assert/strict";

import { attendanceLogAlpineData } from "../src/js/features/attendance/attendanceLog.js";

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

const attendanceRecord = (overrides = {}) => ({
  idAttendance: 42,
  fullName: "Ayu Lestari",
  attendanceDate: "2026-07-28",
  timeIn: "08:00",
  timeOut: "17:00",
  ...overrides,
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fakeBrowser(search = "", events = []) {
  const location = {
    pathname: "/management-attendance.html",
    search,
    hash: "#audit",
  };
  return {
    location,
    history: {
      pushState(_state, _title, url) {
        events.push(["history", "push", url]);
        const parsed = new URL(url, "https://example.test");
        location.pathname = parsed.pathname;
        location.search = parsed.search;
        location.hash = parsed.hash;
      },
      replaceState(_state, _title, url) {
        events.push(["history", "replace", url]);
      },
    },
    addEventListener() {},
    removeEventListener() {},
  };
}

test("row delete confirmation retains canonical employee, date, and time context", () => {
  const originalWindow = globalThis.window;
  let confirmation;
  globalThis.window = {
    showAlertModal(payload) {
      confirmation = payload;
    },
  };

  try {
    const state = attendanceLogAlpineData({ browser: null });
    const record = attendanceRecord();

    state.confirmDelete(record);

    assert.deepEqual(state.deleteState.record, record);
    assert.match(confirmation.message, /Ayu Lestari/);
    assert.match(confirmation.message, /2026-07-28/);
    assert.match(confirmation.message, /08:00/);
    assert.match(confirmation.message, /17:00/);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("detail delete confirmation maps nested employee evidence without inventing fields", () => {
  const originalWindow = globalThis.window;
  let confirmation;
  globalThis.window = {
    showAlertModal(payload) {
      confirmation = payload;
    },
  };

  try {
    const state = attendanceLogAlpineData({ browser: null });
    const detail = {
      idAttendance: 77,
      employee: { fullName: "Budi Santoso" },
      attendanceDate: "2026-07-29",
      timeIn: "09:15",
      timeOut: null,
    };

    state.confirmDelete(detail);

    assert.equal(state.deleteState.record.idAttendance, 77);
    assert.equal(state.deleteState.record.fullName, "Budi Santoso");
    assert.equal(state.deleteState.record.attendanceDate, "2026-07-29");
    assert.equal(state.deleteState.record.timeIn, "09:15");
    assert.equal(state.deleteState.record.timeOut, null);
    assert.match(confirmation.message, /Budi Santoso/);
    assert.match(confirmation.message, /2026-07-29/);
    assert.match(confirmation.message, /09:15/);
    assert.match(confirmation.message, /belum checkout/i);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("delete blocks duplicate submissions while the authoritative request is pending", async () => {
  const pendingDelete = deferred();
  const deletedIds = [];
  const state = attendanceLogAlpineData({
    browser: null,
    notify() {},
    deleteAttendance: (id) => {
      deletedIds.push(id);
      return pendingDelete.promise;
    },
    getAttendanceLog: async () => attendancePage(),
  });
  state.deleteState.record = attendanceRecord();

  const first = state.executeDelete();
  const duplicate = state.executeDelete();

  assert.equal(state.deleteState.submitting, true);
  assert.deepEqual(deletedIds, [42]);

  pendingDelete.resolve();
  await Promise.all([first, duplicate]);

  assert.deepEqual(deletedIds, [42]);
  assert.equal(state.deleteState.submitting, false);
});

test("successful delete refetches the complete unchanged applied query", async () => {
  const requests = [];
  const notices = [];
  const state = attendanceLogAlpineData({
    browser: null,
    notify: (payload) => notices.push(payload),
    deleteAttendance: async () => ({}),
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage([], {
        current_page: 2,
        total_pages: 4,
        total_records: 38,
        records_per_page: 10,
      });
    },
  });
  state.appliedQuery = {
    page: 2,
    limit: 10,
    search: "ayu",
    sortBy: "attendance_date",
    sortOrder: "DESC",
    appliedFilters: {
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "wfh",
      status: "late",
      checkoutState: "completed",
    },
  };
  state.pagination.total_records = 39;
  state.deleteState.record = attendanceRecord();

  await state.executeDelete();

  assert.deepEqual(requests, [
    {
      page: 2,
      limit: 10,
      search: "ayu",
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "wfh",
      status: "late",
      checkout_state: "completed",
      sortBy: "attendance_date",
      sortOrder: "DESC",
    },
  ]);
  assert.equal(state.deleteState.record, null);
  assert.equal(state.deleteState.error, "");
  assert.equal(notices[0].type, "success");
});

test("deleting the sole trailing-page row syncs the last valid page before refetch", async () => {
  const events = [];
  const browser = fakeBrowser(
    "?debug=1&page=3&limit=10&search=ayu&mode=wfh&sortBy=status&sortOrder=ASC",
    events,
  );
  const state = attendanceLogAlpineData({
    browser,
    notify() {},
    deleteAttendance: async () => ({}),
    getAttendanceLog: async (params) => {
      events.push(["fetch", params]);
      return attendancePage([], {
        current_page: 2,
        total_pages: 2,
        total_records: 20,
        records_per_page: 10,
      });
    },
  });
  state.applyUrlState({ fetch: false });
  state.pagination.total_records = 21;
  state.rows = [attendanceRecord()];
  state.deleteState.record = attendanceRecord();

  await state.executeDelete();

  assert.equal(state.appliedQuery.page, 2);
  assert.equal(events[0][0], "history");
  assert.equal(
    events[0][2],
    "/management-attendance.html?debug=1&page=2&search=ayu&mode=wfh&sortBy=status&sortOrder=ASC#audit",
  );
  assert.deepEqual(events[1], [
    "fetch",
    {
      page: 2,
      limit: 10,
      search: "ayu",
      mode: "wfh",
      sortBy: "status",
      sortOrder: "ASC",
    },
  ]);
});

test("404 delete warns and refreshes the unchanged applied query", async () => {
  const notices = [];
  const requests = [];
  const state = attendanceLogAlpineData({
    browser: null,
    notify: (payload) => notices.push(payload),
    deleteAttendance: async () => {
      const error = new Error("not found");
      error.status = 404;
      throw error;
    },
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage();
    },
  });
  state.appliedQuery.search = "stale";
  state.appliedQuery.appliedFilters.status = "alpha";
  state.deleteState.record = attendanceRecord();

  await state.executeDelete();

  assert.deepEqual(requests, [
    { page: 1, limit: 10, search: "stale", status: "alpha" },
  ]);
  assert.deepEqual(notices, [
    {
      type: "warning",
      title: "Data Absensi Tidak Tersedia",
      message:
        "Data absensi ini sudah tidak tersedia. Daftar akan dimuat ulang.",
    },
  ]);
  assert.equal(state.deleteState.record, null);
  assert.equal(state.deleteState.submitting, false);
});

test("non-404 delete failure retains rows and canonical context for retry", async () => {
  const notices = [];
  const rows = [attendanceRecord()];
  const record = attendanceRecord();
  const state = attendanceLogAlpineData({
    browser: null,
    notify: (payload) => notices.push(payload),
    deleteAttendance: async () => {
      throw new Error("Backend menolak penghapusan");
    },
    getAttendanceLog: async () => {
      throw new Error("must not refresh");
    },
  });
  state.rows = rows;
  state.deleteState.record = record;

  await state.executeDelete();

  assert.equal(state.rows, rows);
  assert.equal(state.deleteState.record, record);
  assert.equal(state.deleteState.error, "Backend menolak penghapusan");
  assert.equal(state.deleteState.submitting, false);
  assert.deepEqual(notices, [
    {
      type: "danger",
      title: "Gagal Menghapus Data",
      message: "Backend menolak penghapusan",
    },
  ]);
});
