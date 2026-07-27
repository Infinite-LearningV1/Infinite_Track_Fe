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
