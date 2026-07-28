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
      mode: "WFH",
      status: "late",
      checkout_state: "open",
    },
  ]);
  assert.deepEqual(state.draftFilters, state.appliedQuery.appliedFilters);
  assert.notEqual(state.draftFilters, state.appliedQuery.appliedFilters);
  assert.equal("sortBy" in state.appliedQuery, false);
  assert.equal("sortOrder" in state.appliedQuery, false);
  assert.equal(browser.location.search.includes("sortBy"), false);
  assert.equal(browser.location.search.includes("sortOrder"), false);
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

test("popstate cancels pending search, restores URL state, and writes no history", async () => {
  const browser = fakeBrowser("?page=2&search=before");
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
  browser.location.search = "?page=3&search=restored";
  await browser.listeners.get("popstate")();
  await timers.timers[0].callback();

  assert.equal(timers.timers[0].cancelled, true);
  assert.equal(state.appliedQuery.page, 3);
  assert.equal(state.searchQuery, "restored");
  assert.deepEqual(requests, [{ page: 3, limit: 10, search: "restored" }]);
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

test("Apply commits valid draft filters, pushes once, fetches once, and closes", async () => {
  const browser = fakeBrowser("?debug=1&page=3");
  const requests = [];
  const state = attendanceLogAlpineData({
    browser,
    getAttendanceLog: async (params) => {
      requests.push(params);
      return attendancePage([], { current_page: params.page });
    },
  });
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
    mode: "WFH",
    status: "late",
    checkout_state: "open",
  });
  assert.equal(browser.calls.length, 1);
  assert.equal(browser.calls[0][0], "push");
  assert.equal(new URLSearchParams(browser.location.search).get("debug"), "1");
  assert.equal(state.isFilterOpen, false);
  assert.equal(state.filterValidationMessage, "");
  assert.equal(state.activeFilterCount, 4);
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
