import test from "node:test";
import assert from "node:assert/strict";

import { userListAlpineData } from "../src/js/features/userManagement/userListSimple.js";

function paginatedResult(overrides = {}) {
  return {
    data: [{ id: 11, full_name: "Alice", location_status: "configured" }],
    pagination: { page: 2, limit: 10, total: 21, totalPages: 3 },
    message: "Users fetched successfully",
    ...overrides,
  };
}

function createBrowser(search = "") {
  const listeners = new Map();
  const calls = [];
  return {
    location: { pathname: "/management-user.html", search, hash: "" },
    history: {
      pushState(_state, _title, url) {
        calls.push(["push", url]);
      },
      replaceState(_state, _title, url) {
        calls.push(["replace", url]);
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

test("fetchUsers renders exactly the server page and trusts server pagination", async () => {
  const calls = [];
  const data = userListAlpineData({
    getUsers: async (params) => {
      calls.push(params);
      return paginatedResult();
    },
  });
  data.currentPage = 2;

  await data.fetchUsers();

  assert.deepEqual(calls, [
    {
      page: 2,
      limit: 10,
      sortBy: "created_at",
      sortOrder: "DESC",
    },
  ]);
  assert.deepEqual(
    data.users.map((user) => user.id),
    [11],
  );
  assert.deepEqual(data.pagination, {
    page: 2,
    limit: 10,
    total: 21,
    totalPages: 3,
  });
  assert.equal(data.totalPages, 3);
  assert.equal(data.showingInfo, "Showing 11 to 20 of 21 entries");
});

test("fetchUsers preserves compatibility fields for drawer and modal consumers", async () => {
  const data = userListAlpineData({
    getUsers: async () =>
      paginatedResult({
        data: [
          {
            id: 12,
            full_name: "Compatibility User",
            phone: "081234567890",
            location: {
              latitude: "0",
              longitude: "119.875",
              radius: "125",
              description: "Home office",
              category_name: "Residence",
              location_id: 44,
            },
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
  });

  await data.fetchUsers();

  assert.deepEqual(
    {
      phoneNumber: data.users[0].phoneNumber,
      latitude: data.users[0].latitude,
      longitude: data.users[0].longitude,
      radius: data.users[0].radius,
      description: data.users[0].description,
      categoryName: data.users[0].categoryName,
      locationId: data.users[0].locationId,
    },
    {
      phoneNumber: "081234567890",
      latitude: 0,
      longitude: 119.875,
      radius: 125,
      description: "Home office",
      categoryName: "Residence",
      locationId: 44,
    },
  );
});

test("only the newest request may update directory state", async () => {
  const resolvers = [];
  const data = userListAlpineData({
    getUsers: () => new Promise((resolve) => resolvers.push(resolve)),
  });

  const first = data.fetchUsers();
  const second = data.fetchUsers();
  resolvers[1](paginatedResult({ data: [{ id: 2 }] }));
  await second;
  resolvers[0](paginatedResult({ data: [{ id: 1 }] }));
  await first;

  assert.deepEqual(
    data.users.map((user) => user.id),
    [2],
  );
  assert.equal(data.errorMessage, "");
  assert.equal(data.isLoading, false);
});

test("an empty server page is success rather than an error", async () => {
  const data = userListAlpineData({
    getUsers: async () =>
      paginatedResult({
        data: [],
        pagination: { page: 99, limit: 10, total: 5, totalPages: 1 },
      }),
  });

  await data.fetchUsers();

  assert.deepEqual(data.users, []);
  assert.equal(data.pagination.total, 5);
  assert.equal(data.errorMessage, "");
});

test("init loads role and division options from reference endpoints", async () => {
  const data = userListAlpineData({
    getUsers: async () => paginatedResult(),
    getRoles: async () => [{ id: 2, name: "Admin" }],
    getDivisions: async () => [{ id: 7, name: "Engineering" }],
    browser: null,
  });

  await data.init();

  assert.deepEqual(data.availableRoles, [{ id: 2, name: "Admin" }]);
  assert.deepEqual(data.availableDivisions, [{ id: 7, name: "Engineering" }]);
});

test("a rejected role request does not block users or division options", async () => {
  const data = userListAlpineData({
    getUsers: async () => paginatedResult(),
    getRoles: async () => {
      throw new Error("roles unavailable");
    },
    getDivisions: async () => [{ id: 7, name: "Engineering" }],
    browser: null,
  });

  await data.init();

  assert.deepEqual(
    data.users.map((user) => user.id),
    [11],
  );
  assert.deepEqual(data.availableRoles, []);
  assert.deepEqual(data.availableDivisions, [{ id: 7, name: "Engineering" }]);
  assert.equal(data.roleOptionsError, true);
  assert.equal(data.divisionOptionsError, false);
});

test("a rejected division request does not block users or role options", async () => {
  const data = userListAlpineData({
    getUsers: async () => paginatedResult(),
    getRoles: async () => [{ id: 2, name: "Admin" }],
    getDivisions: async () => {
      throw new Error("divisions unavailable");
    },
    browser: null,
  });

  await data.init();

  assert.deepEqual(
    data.users.map((user) => user.id),
    [11],
  );
  assert.deepEqual(data.availableRoles, [{ id: 2, name: "Admin" }]);
  assert.deepEqual(data.availableDivisions, []);
  assert.equal(data.roleOptionsError, false);
  assert.equal(data.divisionOptionsError, true);
});

test("filters send stable IDs and canonical WFH status", async () => {
  const calls = [];
  const data = userListAlpineData({
    getUsers: async (params) => {
      calls.push(params);
      return paginatedResult({
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    },
    browser: null,
  });
  data.currentPage = 4;
  data.filterRole = "2";
  data.filterDivision = "7";
  data.filterWfhStatus = "integrity_error";

  await data.applyFilters();

  assert.equal(data.currentPage, 1);
  assert.deepEqual(calls.at(-1), {
    page: 1,
    limit: 10,
    role: 2,
    division: 7,
    location_status: "integrity_error",
    sortBy: "created_at",
    sortOrder: "DESC",
  });
});

test("toggleSort activates ascending then toggles direction", async () => {
  const calls = [];
  const data = userListAlpineData({
    getUsers: async (params) => {
      calls.push(params);
      return paginatedResult();
    },
    browser: null,
  });

  await data.toggleSort("full_name");
  await data.toggleSort("full_name");

  assert.deepEqual(
    calls.map(({ sortBy, sortOrder }) => ({ sortBy, sortOrder })),
    [
      { sortBy: "full_name", sortOrder: "ASC" },
      { sortBy: "full_name", sortOrder: "DESC" },
    ],
  );
});

test("init restores URL query before the first request", async () => {
  const browser = createBrowser(
    "?page=2&limit=20&search=alice&role=3&sortBy=nip_nim&sortOrder=ASC",
  );
  const calls = [];
  const data = userListAlpineData({
    browser,
    getUsers: async (params) => {
      calls.push(params);
      return paginatedResult({
        pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
      });
    },
    getRoles: async () => [],
    getDivisions: async () => [],
  });

  await data.init();

  assert.deepEqual(calls[0], {
    page: 2,
    limit: 20,
    search: "alice",
    role: 3,
    sortBy: "nip_nim",
    sortOrder: "ASC",
  });
  assert.ok(browser.listeners.has("popstate"));
});

test("history mode is push for explicit actions, replace for search, and none for popstate", async () => {
  const browser = createBrowser("");
  const calls = [];
  const scheduled = [];
  const data = userListAlpineData({
    browser,
    setTimeout: (fn, delay) => {
      scheduled.push({ fn, delay });
      return scheduled.length - 1;
    },
    clearTimeout: () => {},
    getUsers: async (params) => {
      calls.push(params);
      return paginatedResult({
        pagination: {
          page: params.page,
          limit: params.limit,
          total: 30,
          totalPages: 3,
        },
      });
    },
    getRoles: async () => [],
    getDivisions: async () => [],
  });
  await data.init();
  browser.calls.length = 0;

  await data.goToPage(2);
  assert.equal(browser.calls.at(-1)[0], "push");

  data.searchQuery = "alice";
  data.onSearchChange();
  await scheduled.at(-1).fn();
  assert.equal(browser.calls.at(-1)[0], "replace");

  const historyCount = browser.calls.length;
  browser.location.search = "?page=3";
  await browser.listeners.get("popstate")();
  assert.equal(browser.calls.length, historyCount);
  assert.equal(calls.at(-1).page, 3);
});

test("search waits 300 ms and only requests the latest value", async () => {
  const scheduled = [];
  const calls = [];
  const data = userListAlpineData({
    browser: null,
    setTimeout: (fn, delay) => {
      scheduled.push({ fn, delay, cancelled: false });
      return scheduled.length - 1;
    },
    clearTimeout: (id) => {
      scheduled[id].cancelled = true;
    },
    getUsers: async (params) => {
      calls.push(params);
      return paginatedResult();
    },
  });

  data.searchQuery = "a";
  data.onSearchChange();
  data.searchQuery = "alice";
  data.onSearchChange();

  assert.equal(scheduled[0].cancelled, true);
  assert.equal(scheduled[1].delay, 300);
  await scheduled[1].fn();
  assert.equal(calls.at(-1).search, "alice");
});
