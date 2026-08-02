import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUserListUrl,
  normalizeUserListResponse,
} from "../src/js/services/userService.js";

test("buildUserListUrl sends the complete server-driven contract", () => {
  const url = buildUserListUrl("/api", "http://localhost:8080", {
    page: 2,
    limit: 20,
    search: " Alice ",
    role: 3,
    division: 4,
    location_status: "integrity_error",
    sortBy: "nip_nim",
    sortOrder: "ASC",
  });

  assert.equal(url.pathname, "/api/users");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    page: "2",
    limit: "20",
    search: "Alice",
    role: "3",
    division: "4",
    location_status: "integrity_error",
    sortBy: "nip_nim",
    sortOrder: "ASC",
  });
});

test("buildUserListUrl omits blank optional parameters", () => {
  const url = buildUserListUrl("/api", "http://localhost:8080", {
    page: 1,
    limit: 10,
    search: "   ",
    role: "",
    division: "",
    location_status: "",
    sortBy: "created_at",
    sortOrder: "DESC",
  });

  assert.equal(url.search, "?page=1&limit=10&sortBy=created_at&sortOrder=DESC");
});

test("normalizeUserListResponse preserves canonical pagination", () => {
  assert.deepEqual(
    normalizeUserListResponse({
      success: true,
      data: [{ id: 7 }],
      pagination: { page: 2, limit: 10, total: 21, totalPages: 3 },
      message: "Users fetched successfully",
    }),
    {
      data: [{ id: 7 }],
      pagination: { page: 2, limit: 10, total: 21, totalPages: 3 },
      message: "Users fetched successfully",
    },
  );
});

test("normalizeUserListResponse normalizes the legacy full-array mode", () => {
  assert.deepEqual(
    normalizeUserListResponse({
      success: true,
      data: [{ id: 1 }],
      message: "Users fetched successfully",
    }),
    {
      data: [{ id: 1 }],
      pagination: null,
      message: "Users fetched successfully",
    },
  );
});

test("normalizeUserListResponse rejects a malformed paginated envelope", () => {
  assert.throws(
    () =>
      normalizeUserListResponse({
        success: true,
        data: [],
        pagination: { page: 1 },
      }),
    /pagination pengguna tidak valid/i,
  );
});
