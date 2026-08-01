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
  ...overrides,
});

const liveDetailEnvelope = {
  success: true,
  message: "Detail absensi berhasil diambil",
  data: {
    id_attendance: 42,
    attendance_date: "2026-07-28",
    time_in: "08:00",
    time_out: "17:00",
    work_duration: "09:00",
    mode: { key: "wfh", label: "WFH" },
    status: { key: "ontime", label: "Tepat Waktu" },
    notes: "Backend detail",
    booking_id: 77,
    user: {
      full_name: "Ayu Lestari",
      nip_nim: "2026007",
      email: "ayu@example.test",
      role: "Staff",
    },
    location: {
      latitude: -0.91,
      longitude: 119.87,
      radius: 100,
      description: "Rumah Ayu",
    },
  },
};

const fullAttendanceDetail = (overrides = {}) => ({
  ...liveDetailEnvelope,
  data: {
    ...liveDetailEnvelope.data,
    ...overrides,
    user: { ...liveDetailEnvelope.data.user, ...overrides.user },
    mode: { ...liveDetailEnvelope.data.mode, ...overrides.mode },
    status: { ...liveDetailEnvelope.data.status, ...overrides.status },
  },
});

function fakeBrowser(search = "", hash = "#audit") {
  const calls = [];
  const listeners = new Map();
  const location = {
    pathname: "/management-attendance.html",
    search,
    hash,
  };
  const write = (mode, url) => {
    calls.push([mode, url]);
    const parsed = new URL(url, "https://example.test");
    location.pathname = parsed.pathname;
    location.search = parsed.search;
    location.hash = parsed.hash;
  };
  return {
    location,
    history: {
      pushState(_state, _title, url) {
        write("push", url);
      },
      replaceState(_state, _title, url) {
        write("replace", url);
      },
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    calls,
    listeners,
  };
}

function fakeTimers() {
  const timers = [];
  return {
    timers,
    setTimeout(callback, delay) {
      const timer = { callback, delay, cancelled: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      timer.cancelled = true;
    },
  };
}

test("init hydrates the canonical URL before its first server request", async () => {
  const browser = fakeBrowser(
    "?debug=1&page=3&limit=25&search=ayu&from=2026-07-01&to=2026-07-31&mode=WFH&status=late&checkout_state=open&sortBy=status&sortOrder=ASC",
  );
  const calls = [];
  const state = attendanceLogAlpineData({
    browser,
    getAttendanceLog: async (params) => {
      calls.push(params);
      return attendancePage([], {
        current_page: 3,
        records_per_page: 25,
      });
    },
  });

  await state.init();

  assert.deepEqual(calls, [
    {
      page: 3,
      limit: 25,
      search: "ayu",
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "wfh",
      status: "late",
      checkout_state: "open",
      sortBy: "status",
      sortOrder: "ASC",
    },
  ]);
  assert.deepEqual(state.draftFilters, state.appliedQuery.appliedFilters);
  assert.notEqual(state.draftFilters, state.appliedQuery.appliedFilters);
  assert.equal(state.appliedQuery.sortBy, "status");
  assert.equal(state.appliedQuery.sortOrder, "ASC");
  assert.equal(browser.location.search.includes("sortBy=status"), true);
  assert.equal(browser.location.search.includes("sortOrder=ASC"), true);
  assert.equal(new URLSearchParams(browser.location.search).get("debug"), "1");
  assert.equal(browser.location.hash, "#audit");
  assert.ok(browser.listeners.has("popstate"));
});

test("explicit paging pushes history while debounced search replaces it", async () => {
  const browser = fakeBrowser("");
  const timers = fakeTimers();
  const requests = [];
  const state = attendanceLogAlpineData({
    browser,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage([], {
        current_page: params.page,
        total_pages: 3,
        total_records: 30,
        records_per_page: params.limit,
        has_prev_page: params.page > 1,
        has_next_page: params.page < 3,
      });
    },
  });
  state.pagination.total_pages = 3;

  await state.changePage(2);
  state.searchQuery = "ayu";
  state.onSearchChange();
  await timers.timers[0].callback();

  assert.deepEqual(browser.calls, [
    ["push", "/management-attendance.html?page=2#audit"],
    ["replace", "/management-attendance.html?search=ayu#audit"],
  ]);
  assert.deepEqual(requests, [
    { page: 2, limit: 10 },
    { page: 1, limit: 10, search: "ayu" },
  ]);
  assert.equal(timers.timers[0].delay, 300);
});

test("sort cycles through ASC, DESC, Backend default, and a new key with exact server state", async () => {
  const browser = fakeBrowser("?debug=1");
  const timers = fakeTimers();
  const requests = [];
  const state = attendanceLogAlpineData({
    browser,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage([
        { id_attendance: 2, full_name: "Zulu" },
        { id_attendance: 1, full_name: "Alpha" },
      ]);
    },
  });
  state.appliedQuery.page = 4;
  state.searchQuery = "ayu";
  state.onSearchChange();

  await state.toggleAttendanceSort("full_name");

  assert.equal(state.appliedQuery.page, 1);
  assert.equal(state.appliedQuery.sortBy, "full_name");
  assert.equal(state.appliedQuery.sortOrder, "ASC");
  assert.equal(state.attendanceSortDirection("full_name"), "ascending");
  assert.equal(timers.timers[0].cancelled, true);
  assert.deepEqual(requests, [
    {
      page: 1,
      limit: 10,
      search: "ayu",
      sortBy: "full_name",
      sortOrder: "ASC",
    },
  ]);
  assert.deepEqual(
    state.rows.map((row) => row.idAttendance),
    [2, 1],
  );
  assert.deepEqual(browser.calls, [
    [
      "push",
      "/management-attendance.html?debug=1&search=ayu&sortBy=full_name&sortOrder=ASC#audit",
    ],
  ]);

  await state.toggleAttendanceSort("full_name");
  assert.equal(state.appliedQuery.sortOrder, "DESC");
  assert.equal(state.attendanceSortDirection("full_name"), "descending");
  assert.deepEqual(requests[1], {
    page: 1,
    limit: 10,
    search: "ayu",
    sortBy: "full_name",
    sortOrder: "DESC",
  });
  assert.deepEqual(browser.calls[1], [
    "push",
    "/management-attendance.html?debug=1&search=ayu&sortBy=full_name&sortOrder=DESC#audit",
  ]);

  await state.toggleAttendanceSort("full_name");
  assert.equal(state.appliedQuery.sortBy, "");
  assert.equal(state.appliedQuery.sortOrder, "");
  assert.equal(state.attendanceSortDirection("full_name"), "none");
  assert.deepEqual(requests[2], { page: 1, limit: 10, search: "ayu" });
  assert.deepEqual(browser.calls[2], [
    "push",
    "/management-attendance.html?debug=1&search=ayu#audit",
  ]);
  assert.equal(browser.calls[2][1].includes("sortBy"), false);
  assert.equal(browser.calls[2][1].includes("sortOrder"), false);

  await state.toggleAttendanceSort("attendance_date");
  assert.equal(state.appliedQuery.sortBy, "attendance_date");
  assert.equal(state.appliedQuery.sortOrder, "ASC");
  assert.equal(state.attendanceSortDirection("attendance_date"), "ascending");
  assert.deepEqual(requests[3], {
    page: 1,
    limit: 10,
    search: "ayu",
    sortBy: "attendance_date",
    sortOrder: "ASC",
  });
  assert.deepEqual(browser.calls[3], [
    "push",
    "/management-attendance.html?debug=1&search=ayu&sortBy=attendance_date&sortOrder=ASC#audit",
  ]);
  assert.equal(browser.calls.length, 4);
  assert.equal(requests.length, 4);
  assert.equal(new URLSearchParams(browser.location.search).get("debug"), "1");
});

test("invalid and loading sort guards leave pending search, state, history, and requests untouched", async () => {
  const browser = fakeBrowser("?debug=1");
  const timers = fakeTimers();
  const requests = [];
  const state = attendanceLogAlpineData({
    browser,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage();
    },
  });
  state.appliedQuery.page = 4;
  state.appliedQuery.sortBy = "status";
  state.appliedQuery.sortOrder = "DESC";
  state.searchQuery = "audit-needle";
  state.rows = [
    slimAttendanceRow({ id_attendance: 701, full_name: "Zulu" }),
    slimAttendanceRow({ id_attendance: 702, full_name: "Alpha" }),
  ];
  state.pagination = {
    current_page: 4,
    total_pages: 9,
    total_records: 87,
    records_per_page: 25,
    has_prev_page: true,
    has_next_page: true,
  };
  state.tableState = {
    loading: false,
    error: "Previous server failure",
    hasSuccessfulPage: true,
  };
  state.latestListRequestId = 31;
  state.detailState = {
    selectedId: 88,
    requestId: 17,
    loading: false,
    error: "Existing detail error",
    unavailable: false,
    detail: fullAttendanceDetail(),
  };
  state.onSearchChange();
  const pendingTimer = timers.timers[0];
  const snapshot = () => ({
    query: structuredClone(state.appliedQuery),
    rows: structuredClone(state.rows),
    pagination: structuredClone(state.pagination),
    tableState: structuredClone(state.tableState),
    latestListRequestId: state.latestListRequestId,
    detailState: structuredClone(state.detailState),
    searchTimer: state.searchTimer,
    timerCancelled: pendingTimer.cancelled,
    history: browser.calls.slice(),
    location: { ...browser.location },
    requests: requests.slice(),
  });

  const invalidBefore = snapshot();
  const invalidResult = await state.toggleAttendanceSort("mode");

  assert.equal(invalidResult, false);
  assert.equal(state.attendanceSortDirection("status"), "descending");
  assert.deepEqual(snapshot(), invalidBefore);

  state.tableState.loading = true;
  const loadingBefore = snapshot();
  const loadingResult = await state.toggleAttendanceSort("full_name");

  assert.equal(loadingResult, false);
  assert.deepEqual(snapshot(), loadingBefore);
});

test("the page-facing debouncedSearch uses the canonical timer without duplicate work", async () => {
  const timers = fakeTimers();
  const requests = [];
  const state = attendanceLogAlpineData({
    browser: null,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage();
    },
  });

  state.searchQuery = "first";
  state.debouncedSearch();
  state.searchQuery = "latest";
  state.debouncedSearch();

  assert.equal(timers.timers.length, 2);
  assert.equal(timers.timers[0].cancelled, true);
  assert.equal(timers.timers[1].delay, 300);
  await timers.timers[0].callback();
  await timers.timers[1].callback();
  assert.deepEqual(requests, [{ page: 1, limit: 10, search: "latest" }]);
});

test("popstate cancels pending search, restores active sort URL state, and writes no history", async () => {
  const browser = fakeBrowser(
    "?page=2&search=before&sortBy=status&sortOrder=DESC",
  );
  const timers = fakeTimers();
  const requests = [];
  const state = attendanceLogAlpineData({
    browser,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage([], {
        current_page: params.page,
        total_pages: 4,
        total_records: 40,
      });
    },
  });
  await state.init();
  requests.length = 0;
  browser.calls.length = 0;

  state.searchQuery = "pending";
  state.onSearchChange();
  browser.location.search =
    "?page=3&search=restored&sortBy=full_name&sortOrder=ASC";
  await browser.listeners.get("popstate")();
  await timers.timers[0].callback();

  assert.equal(timers.timers[0].cancelled, true);
  assert.equal(state.appliedQuery.page, 3);
  assert.equal(state.searchQuery, "restored");
  assert.equal(state.appliedQuery.sortBy, "full_name");
  assert.equal(state.appliedQuery.sortOrder, "ASC");
  assert.equal(state.attendanceSortDirection("full_name"), "ascending");
  assert.deepEqual(requests, [
    {
      page: 3,
      limit: 10,
      search: "restored",
      sortBy: "full_name",
      sortOrder: "ASC",
    },
  ]);
  assert.equal(
    browser.location.search,
    "?page=3&search=restored&sortBy=full_name&sortOrder=ASC",
  );
  assert.deepEqual(browser.calls, []);
});

test("paging, filter apply, and page-size changes cancel pending search", async (t) => {
  const cases = [
    {
      name: "paging",
      expectedPage: 2,
      prepare(state) {
        state.pagination.total_pages = 3;
      },
      act(state) {
        return state.changePage(2);
      },
    },
    {
      name: "filters",
      expectedPage: 1,
      prepare(state) {
        state.draftFilters.mode = "WFA";
      },
      act(state) {
        return state.applyFilters();
      },
    },
    {
      name: "filter reset",
      expectedPage: 1,
      prepare(state) {
        state.draftFilters.mode = "WFA";
        state.appliedQuery.appliedFilters.mode = "WFA";
      },
      act(state) {
        return state.resetFilters();
      },
    },
    {
      name: "page size",
      expectedPage: 1,
      prepare() {},
      act(state) {
        return state.changeLimit(25);
      },
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const timers = fakeTimers();
      const requests = [];
      const state = attendanceLogAlpineData({
        browser: fakeBrowser(""),
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout,
        getAttendanceLog: async (params) => {
          requests.push(params);
          return attendancePage([], {
            current_page: params.page,
            total_pages: 3,
            records_per_page: params.limit,
          });
        },
      });
      scenario.prepare(state);
      state.searchQuery = "pending";
      state.onSearchChange();

      await scenario.act(state);
      await timers.timers[0].callback();

      assert.equal(timers.timers[0].cancelled, true);
      assert.equal(requests.length, 1);
      assert.equal(state.appliedQuery.page, scenario.expectedPage);
      assert.equal(state.searchTimer, null);
    });
  }
});

test("only the newest list success may update rows", async () => {
  const resolvers = [];
  const state = attendanceLogAlpineData({
    getAttendanceLog: () =>
      new Promise((resolve, reject) => resolvers.push({ resolve, reject })),
    browser: fakeBrowser("?search=first"),
  });
  state.applyUrlState({ fetch: false });

  const first = state.fetchAttendance();
  state.searchQuery = "second";
  const second = state.fetchAttendance();
  resolvers[1].resolve(
    attendancePage([slimAttendanceRow({ id_attendance: 2 })]),
  );
  await second;
  resolvers[0].resolve(
    attendancePage([slimAttendanceRow({ id_attendance: 1 })]),
  );
  await first;

  assert.equal(state.rows[0].idAttendance, 2);
  assert.equal(state.tableState.loading, false);
});

test("a stale list failure cannot replace the newest successful state", async (t) => {
  t.mock.method(console, "error", () => {});
  const resolvers = [];
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceLog: () =>
      new Promise((resolve, reject) => resolvers.push({ resolve, reject })),
  });

  const first = state.fetchAttendance();
  const second = state.fetchAttendance();
  resolvers[1].resolve(
    attendancePage([slimAttendanceRow({ id_attendance: 2 })]),
  );
  await second;
  resolvers[0].reject(new Error("stale failure"));
  await first;

  assert.equal(state.rows[0].idAttendance, 2);
  assert.equal(state.tableState.error, "");
  assert.equal(state.tableState.hasSuccessfulPage, true);
});

test("a current list error keeps the last successful rows visible", async (t) => {
  t.mock.method(console, "error", () => {});
  let fail = false;
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceLog: async () => {
      if (fail) throw new Error("server unavailable");
      return attendancePage([slimAttendanceRow()]);
    },
  });

  await state.fetchAttendance();
  const successfulRows = state.rows;
  fail = true;
  const result = await state.fetchAttendance();

  assert.equal(result, false);
  assert.equal(state.rows, successfulRows);
  assert.equal(state.rows[0].idAttendance, 42);
  assert.equal(state.tableState.error, "server unavailable");
  assert.equal(state.tableState.hasSuccessfulPage, true);
  assert.equal(state.tableState.loading, false);
});

test("failed fetch and retry retain the active server sort after a successful page", async (t) => {
  t.mock.method(console, "error", () => {});
  const requests = [];
  let fail = false;
  const browser = fakeBrowser(
    "?debug=1&search=ayu&mode=wfh&sortBy=full_name&sortOrder=DESC",
  );
  const state = attendanceLogAlpineData({
    browser,
    getAttendanceLog: async (params) => {
      requests.push(params);
      if (fail) throw new Error("server unavailable");
      return attendancePage([slimAttendanceRow()]);
    },
  });
  await state.applyUrlState({ fetch: false });

  await state.fetchAttendance();
  fail = true;
  await state.fetchAttendance();
  const retainedRows = state.rows;
  assert.equal(state.attendanceSortDirection("full_name"), "descending");
  await state.retryAttendanceList();

  assert.equal(state.rows, retainedRows);
  assert.equal(state.appliedQuery.sortBy, "full_name");
  assert.equal(state.appliedQuery.sortOrder, "DESC");
  assert.equal(state.attendanceSortDirection("full_name"), "descending");
  assert.equal(
    browser.location.search,
    "?debug=1&search=ayu&mode=wfh&sortBy=full_name&sortOrder=DESC",
  );
  assert.deepEqual(browser.calls, []);
  assert.deepEqual(requests, [
    {
      page: 1,
      limit: 10,
      search: "ayu",
      mode: "wfh",
      sortBy: "full_name",
      sortOrder: "DESC",
    },
    {
      page: 1,
      limit: 10,
      search: "ayu",
      mode: "wfh",
      sortBy: "full_name",
      sortOrder: "DESC",
    },
    {
      page: 1,
      limit: 10,
      search: "ayu",
      mode: "wfh",
      sortBy: "full_name",
      sortOrder: "DESC",
    },
  ]);
  assert.equal(state.tableState.error, "server unavailable");
});

test("empty state copy distinguishes directory, no-match, and out-of-range pages", () => {
  const state = attendanceLogAlpineData({ browser: null });

  assert.equal(state.emptyStateMessage, "Belum ada data absensi.");

  state.appliedQuery.search = "ayu";
  assert.equal(
    state.emptyStateMessage,
    "Tidak ada data absensi yang cocok dengan pencarian atau filter.",
  );

  state.appliedQuery.search = "";
  state.appliedQuery.page = 3;
  state.pagination.total_records = 15;
  assert.equal(
    state.emptyStateMessage,
    "Halaman ini tidak lagi memiliki data. Kembali ke halaman sebelumnya.",
  );
});

test("destroy cancels search and removes the popstate listener", async () => {
  const browser = fakeBrowser("");
  const timers = fakeTimers();
  const state = attendanceLogAlpineData({
    browser,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    getAttendanceLog: async () => attendancePage(),
  });
  await state.init();
  state.onSearchChange();

  state.destroy();

  assert.equal(timers.timers[0].cancelled, true);
  assert.equal(browser.listeners.has("popstate"), false);
});

test("editing filter drafts and dismissing the popover never fetches", () => {
  let requests = 0;
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceLog: async () => {
      requests += 1;
      return attendancePage();
    },
  });

  state.openFilter();
  state.draftFilters.mode = "WFH";
  state.draftFilters.checkoutState = "open";
  state.closeFilter();

  assert.equal(requests, 0);
  assert.equal(state.isFilterOpen, false);
  assert.equal(state.appliedQuery.appliedFilters.mode, "");
});

test("closing the filter restores focus to its trigger", () => {
  const browser = fakeBrowser("");
  let focusCalls = 0;
  browser.document = {
    getElementById(id) {
      assert.equal(id, "attendanceTableFilterTrigger");
      return { focus: () => (focusCalls += 1) };
    },
  };
  const state = attendanceLogAlpineData({ browser });

  state.openFilter();
  state.closeFilter();

  assert.equal(focusCalls, 1);
  assert.equal(state.isFilterOpen, false);
});

test("Apply preserves active sort while committing filters, pushing once, and fetching once", async () => {
  const browser = fakeBrowser("?debug=1&page=3&sortBy=status&sortOrder=DESC");
  const requests = [];
  const state = attendanceLogAlpineData({
    browser,
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage([], { current_page: params.page });
    },
  });
  await state.applyUrlState({ fetch: false });
  state.openFilter();
  state.draftFilters = {
    from: "2026-07-01",
    to: "2026-07-31",
    mode: "WFH",
    status: "late",
    checkoutState: "open",
  };

  const result = await state.applyFilters();

  assert.equal(result, true);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], {
    page: 1,
    limit: 10,
    from: "2026-07-01",
    to: "2026-07-31",
    mode: "wfh",
    status: "late",
    checkout_state: "open",
    sortBy: "status",
    sortOrder: "DESC",
  });
  assert.equal(state.appliedQuery.sortBy, "status");
  assert.equal(state.appliedQuery.sortOrder, "DESC");
  assert.equal(state.attendanceSortDirection("status"), "descending");
  assert.deepEqual(browser.calls, [
    [
      "push",
      "/management-attendance.html?debug=1&from=2026-07-01&to=2026-07-31&mode=wfh&status=late&checkout_state=open&sortBy=status&sortOrder=DESC#audit",
    ],
  ]);
  assert.equal(state.isFilterOpen, false);
  assert.equal(state.filterValidationMessage, "");
  assert.equal(state.activeFilterCount, 4);
});

test("page-size changes preserve active sort in the pushed URL and server request", async () => {
  const browser = fakeBrowser(
    "?debug=1&page=4&sortBy=attendance_date&sortOrder=DESC",
  );
  const requests = [];
  const state = attendanceLogAlpineData({
    browser,
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage([], {
        current_page: params.page,
        records_per_page: params.limit,
      });
    },
  });
  await state.applyUrlState({ fetch: false });

  await state.changeLimit(25);

  assert.equal(state.appliedQuery.page, 1);
  assert.equal(state.appliedQuery.sortBy, "attendance_date");
  assert.equal(state.appliedQuery.sortOrder, "DESC");
  assert.equal(state.attendanceSortDirection("attendance_date"), "descending");
  assert.deepEqual(requests, [
    {
      page: 1,
      limit: 25,
      sortBy: "attendance_date",
      sortOrder: "DESC",
    },
  ]);
  assert.deepEqual(browser.calls, [
    [
      "push",
      "/management-attendance.html?debug=1&limit=25&sortBy=attendance_date&sortOrder=DESC#audit",
    ],
  ]);
});

test("invalid date range retains the open draft and performs no side effects", async () => {
  const browser = fakeBrowser("?page=2&debug=1");
  let requests = 0;
  const state = attendanceLogAlpineData({
    browser,
    getAttendanceLog: async () => {
      requests += 1;
      return attendancePage();
    },
  });
  state.applyUrlState({ fetch: false });
  state.openFilter();
  state.draftFilters.from = "2026-07-31";
  state.draftFilters.to = "2026-07-01";

  const result = await state.applyFilters();

  assert.equal(result, false);
  assert.equal(requests, 0);
  assert.deepEqual(browser.calls, []);
  assert.equal(state.isFilterOpen, true);
  assert.deepEqual(state.draftFilters, {
    from: "2026-07-31",
    to: "2026-07-01",
    mode: "",
    status: "",
    checkoutState: "",
  });
  assert.equal(
    state.filterValidationMessage,
    "Tanggal selesai tidak boleh sebelum tanggal mulai.",
  );
  assert.equal(state.appliedQuery.page, 2);
});

test("Clear resets only applied filter criteria and preserves search, limit, and unrelated URL state", async () => {
  const browser = fakeBrowser("?search=ayu&limit=25&mode=WFA&debug=1");
  const requests = [];
  const state = attendanceLogAlpineData({
    browser,
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage([], { records_per_page: params.limit });
    },
  });
  state.applyUrlState({ fetch: false });
  state.openFilter();

  await state.clearFilters();

  assert.deepEqual(state.appliedQuery.appliedFilters, {
    from: "",
    to: "",
    mode: "",
    status: "",
    checkoutState: "",
  });
  assert.equal(state.appliedQuery.search, "ayu");
  assert.equal(state.appliedQuery.limit, 25);
  assert.deepEqual(requests, [{ page: 1, limit: 25, search: "ayu" }]);
  assert.equal(new URLSearchParams(browser.location.search).get("debug"), "1");
  assert.equal(state.activeFilterCount, 0);
  assert.equal(state.isFilterOpen, false);
});

test("active filter count reflects applied criteria rather than uncommitted drafts", () => {
  const state = attendanceLogAlpineData({ browser: null });
  state.appliedQuery.appliedFilters.mode = "WFO";
  state.appliedQuery.appliedFilters.status = "ontime";
  state.draftFilters.checkoutState = "open";

  assert.equal(state.activeFilterCount, 2);
});

test("opening detail shows a loading shell and renders only the detail endpoint response", async () => {
  let resolveDetail;
  const calls = [];
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceById: (id) => {
      calls.push(id);
      return new Promise((resolve) => {
        resolveDetail = resolve;
      });
    },
  });
  state.rows = [
    {
      idAttendance: 42,
      notes: "This slim-list value must never become detail",
    },
  ];

  const request = state.openAttendanceDetail(42);

  assert.equal(state.isAttendanceDetailDrawerOpen, true);
  assert.equal(state.detailState.loading, true);
  assert.equal(state.detailState.selectedId, 42);
  assert.equal(state.detailState.detail, null);
  assert.deepEqual(calls, [42]);

  resolveDetail(fullAttendanceDetail({ notes: "Backend detail" }));
  assert.equal(await request, true);
  assert.equal(state.detailState.loading, false);
  assert.equal(state.detailState.detail.notes, "Backend detail");
  assert.equal(state.selectedAttendanceDetail.notes, "Backend detail");
});

test("an older detail success cannot replace the current selection", async () => {
  const requests = [];
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceById: (id) =>
      new Promise((resolve, reject) => requests.push({ id, resolve, reject })),
  });

  const first = state.openAttendanceDetail(1);
  const second = state.openAttendanceDetail(2);
  requests[1].resolve(
    fullAttendanceDetail({
      id_attendance: 2,
      notes: "Current detail",
    }),
  );
  assert.equal(await second, true);
  requests[0].resolve(
    fullAttendanceDetail({
      id_attendance: 1,
      notes: "Stale detail",
    }),
  );
  assert.equal(await first, false);

  assert.equal(state.detailState.selectedId, 2);
  assert.equal(state.detailState.detail.idAttendance, 2);
  assert.equal(state.detailState.detail.notes, "Current detail");
  assert.equal(state.selectedAttendanceDetail.idAttendance, 2);
});

test("an older detail failure cannot replace the current success", async () => {
  const requests = [];
  let listRequests = 0;
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceById: (id) =>
      new Promise((resolve, reject) => requests.push({ id, resolve, reject })),
    getAttendanceLog: async () => {
      listRequests += 1;
      return attendancePage();
    },
  });

  const first = state.openAttendanceDetail(1);
  const second = state.openAttendanceDetail(2);
  requests[1].resolve(fullAttendanceDetail({ id_attendance: 2 }));
  await second;
  const staleMissing = new Error("Stale detail failure");
  staleMissing.status = 404;
  requests[0].reject(staleMissing);
  assert.equal(await first, false);

  assert.equal(state.detailState.selectedId, 2);
  assert.equal(state.detailState.error, "");
  assert.equal(state.detailState.unavailable, false);
  assert.equal(state.detailState.detail.idAttendance, 2);
  assert.equal(listRequests, 0);
});

test("a current detail error stays contained in the open drawer and can retry", async () => {
  let attempts = 0;
  const requestedIds = [];
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceById: async (attendanceId) => {
      attempts += 1;
      requestedIds.push(attendanceId);
      if (attempts === 1) throw new Error("Detail service unavailable");
      return fullAttendanceDetail();
    },
  });

  assert.equal(await state.openAttendanceDetail(42), false);
  assert.equal(state.isAttendanceDetailDrawerOpen, true);
  assert.equal(state.detailState.loading, false);
  assert.equal(state.detailState.error, "Detail service unavailable");
  assert.equal(state.detailState.unavailable, false);
  assert.equal(state.detailState.detail, null);

  assert.equal(await state.retryAttendanceDetail(), true);
  assert.equal(attempts, 2);
  assert.deepEqual(requestedIds, [42, 42]);
  assert.equal(state.detailState.error, "");
  assert.equal(state.detailState.detail.idAttendance, 42);
});

test("a current detail 404 clears detail loading before a deferred list refresh succeeds", async () => {
  const listRequests = [];
  let resolveList;
  const missing = new Error("Data absensi tidak ditemukan");
  missing.status = 404;
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceById: async () => {
      throw missing;
    },
    getAttendanceLog: async (params) => {
      listRequests.push(params);
      return new Promise((resolve) => {
        resolveList = resolve;
      });
    },
  });
  state.appliedQuery.search = "ayu";
  state.appliedQuery.appliedFilters.mode = "WFH";

  const request = state.openAttendanceDetail(42);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(state.isAttendanceDetailDrawerOpen, true);
  assert.equal(state.detailState.loading, false);
  assert.equal(state.detailState.error, "");
  assert.equal(state.detailState.unavailable, true);
  assert.equal(state.detailState.detail, null);
  assert.deepEqual(listRequests, [
    { page: 1, limit: 10, search: "ayu", mode: "wfh" },
  ]);

  resolveList(
    attendancePage([
      {
        id_attendance: 84,
        attendance_date: "2026-07-23",
        time_in: "23:55",
        time_out: null,
        work_duration: "00:00",
        mode: { key: "wfo", label: "WFO" },
        status: { key: "alpha", label: "Alpha" },
        user: {
          id: 45,
          full_name: "Muhammad Rizki Ramdani",
          nip_nim: "9BYYD3",
          role: "Internship",
        },
        location: {
          available: true,
          id: 901,
          description: "Kantor pusat",
        },
      },
    ]),
  );

  assert.equal(await request, false);
  assert.equal(state.detailState.loading, false);
  assert.equal(state.detailState.unavailable, true);
  assert.equal(state.rows[0].idAttendance, 84);
  assert.equal(state.rows[0].fullName, "Muhammad Rizki Ramdani");
  assert.equal(state.rows[0].mode, "wfo");
  assert.equal(state.rows[0].statusLabel, "Alpha");
  assert.equal(state.rows[0].location.description, "Kantor pusat");
});

test("a current detail 404 remains unavailable and not loading when a deferred list refresh fails", async (t) => {
  t.mock.method(console, "error", () => {});
  let rejectList;
  const missing = new Error("Data absensi tidak ditemukan");
  missing.status = 404;
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceById: async () => {
      throw missing;
    },
    getAttendanceLog: () =>
      new Promise((resolve, reject) => {
        rejectList = reject;
      }),
  });

  const request = state.openAttendanceDetail(42);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(state.detailState.loading, false);
  assert.equal(state.detailState.unavailable, true);
  rejectList(new Error("List refresh unavailable"));

  assert.equal(await request, false);
  assert.equal(state.detailState.loading, false);
  assert.equal(state.detailState.unavailable, true);
  assert.equal(state.tableState.error, "List refresh unavailable");
});

test("the template-used closeAttendanceDrawer invalidates an in-flight detail request", async () => {
  let resolveDetail;
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceById: () =>
      new Promise((resolve) => {
        resolveDetail = resolve;
      }),
  });

  const request = state.openAttendanceDetail(42);
  state.closeAttendanceDrawer();
  resolveDetail(fullAttendanceDetail());

  assert.equal(await request, false);
  assert.equal(state.isAttendanceDetailDrawerOpen, false);
  assert.equal(state.detailState.selectedId, null);
  assert.equal(state.detailState.loading, false);
  assert.equal(state.detailState.error, "");
  assert.equal(state.detailState.unavailable, false);
  assert.equal(state.detailState.detail, null);
});

test("destroy invalidates an in-flight detail request", async () => {
  let resolveDetail;
  const state = attendanceLogAlpineData({
    browser: null,
    getAttendanceById: () =>
      new Promise((resolve) => {
        resolveDetail = resolve;
      }),
  });

  const request = state.openAttendanceDetail(42);
  state.destroy();
  resolveDetail(fullAttendanceDetail());

  assert.equal(await request, false);
  assert.equal(state.isAttendanceDetailDrawerOpen, false);
  assert.equal(state.detailState.selectedId, null);
  assert.equal(state.detailState.loading, false);
  assert.equal(state.detailState.error, "");
  assert.equal(state.detailState.unavailable, false);
  assert.equal(state.detailState.detail, null);
});
