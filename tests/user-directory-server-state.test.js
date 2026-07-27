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

test("a current request failure retains the previous successful rows", async (t) => {
  t.mock.method(console, "error", () => {});
  const data = userListAlpineData({
    browser: null,
    getUsers: async () => {
      throw new Error("page harus bilangan bulat >= 1");
    },
  });
  data.users = [{ id: 8, fullName: "Existing" }];
  data.showErrorModal = () => {};

  await data.fetchUsers();

  assert.deepEqual(
    data.users.map((user) => user.id),
    [8],
  );
  assert.equal(data.errorMessage, "page harus bilangan bulat >= 1");
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

test("entries, apply filters, reset filters, and sort each push URL state", async () => {
  const browser = createBrowser("");
  const requests = [];
  const data = userListAlpineData({
    browser,
    getUsers: async (params) => {
      requests.push(params);
      return paginatedResult({
        pagination: {
          page: params.page,
          limit: params.limit,
          total: 40,
          totalPages: 4,
        },
      });
    },
    getRoles: async () => [],
    getDivisions: async () => [],
  });
  await data.init();
  browser.calls.length = 0;
  requests.length = 0;

  data.entriesPerPage = "20";
  await data.onEntriesPerPageChange();

  data.filterRole = "2";
  data.filterDivision = "7";
  data.filterWfhStatus = "integrity_error";
  await data.applyFilters();

  await data.resetFilters();
  await data.toggleSort("email");

  assert.deepEqual(
    browser.calls,
    [
      ["push", "/management-user.html?limit=20"],
      [
        "push",
        "/management-user.html?limit=20&role=2&division=7&location_status=integrity_error",
      ],
      ["push", "/management-user.html?limit=20"],
      [
        "push",
        "/management-user.html?limit=20&sortBy=email&sortOrder=ASC",
      ],
    ],
  );
  assert.deepEqual(requests, [
    {
      page: 1,
      limit: 20,
      sortBy: "created_at",
      sortOrder: "DESC",
    },
    {
      page: 1,
      limit: 20,
      role: 2,
      division: 7,
      location_status: "integrity_error",
      sortBy: "created_at",
      sortOrder: "DESC",
    },
    {
      page: 1,
      limit: 20,
      sortBy: "created_at",
      sortOrder: "DESC",
    },
    {
      page: 1,
      limit: 20,
      sortBy: "email",
      sortOrder: "ASC",
    },
  ]);
});

test("unsupported sort keys write no history and make no request", async () => {
  const browser = createBrowser("");
  const requests = [];
  const data = userListAlpineData({
    browser,
    getUsers: async (params) => {
      requests.push(params);
      return paginatedResult();
    },
  });

  await data.toggleSort("password");

  assert.deepEqual(browser.calls, []);
  assert.deepEqual(requests, []);
  assert.equal(data.sortBy, "created_at");
  assert.equal(data.sortOrder, "DESC");
});

test("deleting the last row on a trailing page refetches the last valid page", async () => {
  const requestedPages = [];
  let call = 0;
  const data = userListAlpineData({
    browser: null,
    deleteUser: async () => {},
    getUsers: async (params) => {
      requestedPages.push(params.page);
      call += 1;
      if (call === 1) {
        return paginatedResult({
          data: [],
          pagination: { page: 3, limit: 10, total: 20, totalPages: 2 },
        });
      }
      return paginatedResult({
        data: [{ id: 20 }],
        pagination: { page: 2, limit: 10, total: 20, totalPages: 2 },
      });
    },
  });
  data.currentPage = 3;
  data.userToDelete = { id: 21, fullName: "Trailing User" };
  data.showSuccessModal = () => {};

  await data.confirmDeleteUser();

  assert.deepEqual(requestedPages, [3, 2]);
  assert.equal(data.currentPage, 2);
  assert.deepEqual(
    data.users.map((user) => user.id),
    [20],
  );
});

test("deleting the final directory row stays on page one", async () => {
  const data = userListAlpineData({
    browser: null,
    deleteUser: async () => {},
    getUsers: async () =>
      paginatedResult({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
  });
  data.userToDelete = { id: 1, fullName: "Only User" };
  data.showSuccessModal = () => {};

  await data.confirmDeleteUser();

  assert.equal(data.currentPage, 1);
  assert.deepEqual(data.users, []);
});

test("confirmDeleteUser leaves rows server-authored across a failed delayed refresh", async (t) => {
  t.mock.method(console, "error", () => {});
  let rejectRefresh;
  let signalRefreshStarted;
  const refreshStarted = new Promise((resolve) => {
    signalRefreshStarted = resolve;
  });
  const deletedIds = [];
  const errors = [];
  const successes = [];
  const data = userListAlpineData({
    browser: null,
    deleteUser: async (id) => {
      deletedIds.push(id);
    },
    getUsers: () => {
      signalRefreshStarted();
      return new Promise((_resolve, reject) => {
        rejectRefresh = reject;
      });
    },
  });
  data.users = [
    { id: 11, fullName: "Alice" },
    { id: 12, fullName: "Bob" },
  ];
  data.pagination = { page: 3, limit: 10, total: 21, totalPages: 2 };
  data.currentPage = 3;
  data.userToDelete = data.users[0];
  data.isDeleteModalOpen = true;
  data.showErrorModal = (message) => errors.push(message);
  data.showSuccessModal = (message) => successes.push(message);

  const confirmation = data.confirmDeleteUser();
  await refreshStarted;

  assert.deepEqual(deletedIds, [11]);
  assert.deepEqual(
    data.users.map((user) => user.id),
    [11, 12],
  );
  assert.equal(data.currentPage, 3);
  assert.deepEqual(data.pagination, {
    page: 3,
    limit: 10,
    total: 21,
    totalPages: 2,
  });

  rejectRefresh(new Error("refresh unavailable"));
  await confirmation;

  assert.deepEqual(
    data.users.map((user) => user.id),
    [11, 12],
  );
  assert.equal(data.currentPage, 3);
  assert.deepEqual(data.pagination, {
    page: 3,
    limit: 10,
    total: 21,
    totalPages: 2,
  });
  assert.deepEqual(errors, ["refresh unavailable"]);
  assert.deepEqual(successes, []);
});

test("destroy cancels pending search and removes the popstate listener", async () => {
  const browser = createBrowser("");
  const scheduled = [];
  const data = userListAlpineData({
    browser,
    setTimeout: (fn, delay) => {
      scheduled.push({ fn, delay, cancelled: false });
      return scheduled.length - 1;
    },
    clearTimeout: (id) => {
      scheduled[id].cancelled = true;
    },
    getUsers: async () => paginatedResult(),
    getRoles: async () => [],
    getDivisions: async () => [],
  });
  await data.init();

  data.searchQuery = "alice";
  data.onSearchChange();
  data.destroy();

  assert.equal(scheduled[0].cancelled, true);
  assert.equal(browser.listeners.has("popstate"), false);
});
