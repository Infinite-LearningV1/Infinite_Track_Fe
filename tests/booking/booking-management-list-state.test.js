import test from "node:test";
import assert from "node:assert/strict";

import { bookingListAlpineData } from "../../src/js/features/wfaBooking/bookingList.js";

function fakeBrowser(search = "") {
  const calls = [];
  const listeners = new Map();
  const location = {
    pathname: "/management-booking.html",
    search,
    hash: "#queue",
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

const page = (id, pagination = {}) => ({
  data: {
    bookings: [{ booking_id: id }],
    pagination: {
      current_page: 1,
      total_pages: 1,
      total_records: 1,
      records_per_page: 10,
      has_next_page: false,
      has_prev_page: false,
      ...pagination,
    },
  },
});

test("initial state is server-authored and has no sort API", () => {
  const state = bookingListAlpineData({ getBookings: async () => page(1) });

  assert.deepEqual(state.appliedQuery, {
    page: 1,
    limit: 10,
    search: "",
    appliedFilters: { status: "", dateFrom: "", dateTo: "" },
  });
  assert.deepEqual(state.draftFilters, {
    status: "",
    dateFrom: "",
    dateTo: "",
  });
  assert.equal("sortBy" in state, false);
  assert.equal("sortOrder" in state, false);
  assert.equal("sortFieldMap" in state, false);
  assert.equal("changeSort" in state, false);
  assert.equal("getSortIcon" in state, false);
});

test("newest response wins and failed refresh preserves successful rows", async () => {
  const pending = [];
  const state = bookingListAlpineData({
    getBookings: () =>
      new Promise((resolve, reject) => pending.push({ resolve, reject })),
  });

  const first = state.fetchBookings();
  state.appliedQuery.search = "baru";
  const second = state.fetchBookings();
  pending[1].resolve(page(2));
  await second;
  pending[0].resolve(page(1));
  await first;
  assert.equal(state.bookings[0].id, 2);

  state.fetchBookings();
  pending[2].reject(Object.assign(new Error("offline"), { code: "NETWORK" }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.bookings[0].id, 2);
  assert.equal(state.tableState.error, "offline");
});

test("search, page, and limit methods preserve canonical filters", async () => {
  const calls = [];
  const state = bookingListAlpineData({
    getBookings: async (params) => {
      calls.push(params);
      return page(3, {
        current_page: params.page,
        total_pages: 3,
        records_per_page: params.limit,
      });
    },
  });
  state.appliedQuery.appliedFilters = {
    status: "pending",
    dateFrom: "",
    dateTo: "",
  };
  state.appliedQuery.page = 3;
  state.searchTerm = "andi";
  state.handleSearchInput();
  await new Promise((resolve) => setTimeout(resolve, 550));
  state.changePage(2);
  await state.changeLimit(25);

  assert.equal(calls.length, 3);
  assert.equal(calls[1].page, 2);
  assert.equal(calls[1].status, "pending");
  assert.equal(calls[2].page, 1);
  assert.equal(calls[2].limit, 25);
  assert.equal(state.pagination.per_page, 25);
});

test("live INF-274 pagination aliases preserve the selected page size", async () => {
  for (const selectedLimit of [25, 50, 100]) {
    const state = bookingListAlpineData({
      getBookings: async () => ({
        data: {
          bookings: [{ booking_id: 51 }],
          pagination: {
            current_page: 2,
            total_pages: 5,
            total_items: 237,
            items_per_page: selectedLimit,
            has_next_page: true,
            has_prev_page: true,
          },
        },
      }),
    });
    state.appliedQuery.limit = selectedLimit;

    await state.fetchBookings();

    assert.equal(state.pagination.total_items, 237);
    assert.equal(state.pagination.total_records, 237);
    assert.equal(state.pagination.items_per_page, selectedLimit);
    assert.equal(state.pagination.per_page, selectedLimit);
    assert.equal(state.appliedQuery.limit, selectedLimit);
    assert.equal(state.filters.limit, selectedLimit);
  }
});

test("booking pagination writes canonical page state to browser history", async () => {
  const browser = fakeBrowser("?debug=1");
  const requests = [];
  const state = bookingListAlpineData({
    browser,
    getBookings: async (params) => {
      requests.push(params);
      return page(params.page, { current_page: params.page, total_pages: 3 });
    },
  });
  state.pagination.total_pages = 3;

  await state.changePage(2);

  assert.deepEqual(browser.calls, [
    ["push", "/management-booking.html?debug=1&page=2#queue"],
  ]);
  assert.deepEqual(requests, [{ page: 2, limit: 10 }]);
});

test("booking init hydrates URL and popstate restores query without writing history", async () => {
  const browser = fakeBrowser(
    "?debug=1&page=2&limit=25&search=ayu&status=pending&date_from=2026-07-01&date_to=2026-07-31",
  );
  const requests = [];
  const state = bookingListAlpineData({
    browser,
    getBookings: async (params) => {
      requests.push(params);
      return page(params.page, {
        current_page: params.page,
        records_per_page: params.limit,
      });
    },
  });

  await state.init();
  assert.deepEqual(requests[0], {
    page: 2,
    limit: 25,
    search: "ayu",
    status: "pending",
    date_from: "2026-07-01",
    date_to: "2026-07-31",
  });
  assert.ok(browser.listeners.has("popstate"));

  browser.location.search = "?debug=1&page=1&limit=10";
  const historyCount = browser.calls.length;
  await browser.listeners.get("popstate")();

  assert.equal(browser.calls.length, historyCount);
  assert.deepEqual(requests[1], { page: 1, limit: 10 });
  assert.deepEqual(state.appliedQuery.appliedFilters, {
    status: "",
    dateFrom: "",
    dateTo: "",
  });
});
