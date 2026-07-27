import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_USER_DIRECTORY_QUERY,
  parseUserDirectoryQuery,
  serializeUserDirectoryQuery,
  toUserDirectoryRequestParams,
} from "../src/js/features/userManagement/userDirectoryQuery.js";

test("parseUserDirectoryQuery restores canonical server query state", () => {
  const result = parseUserDirectoryQuery(
    new URLSearchParams(
      "page=3&limit=20&search=%20alice%20&role=2&division=7" +
        "&location_status=integrity_error&sortBy=nip_nim&sortOrder=ASC",
    ),
  );

  assert.deepEqual(result, {
    currentPage: 3,
    entriesPerPage: 20,
    searchQuery: "alice",
    appliedFilters: {
      role: "2",
      division: "7",
      locationStatus: "integrity_error",
    },
    sortBy: "nip_nim",
    sortOrder: "ASC",
  });
});

test("parseUserDirectoryQuery rejects invalid known values", () => {
  const result = parseUserDirectoryQuery(
    new URLSearchParams(
      "page=0&limit=500&role=admin&division=-1" +
        "&location_status=missing&sortBy=password&sortOrder=SIDEWAYS",
    ),
  );

  assert.deepEqual(result, DEFAULT_USER_DIRECTORY_QUERY);
});

test("serializeUserDirectoryQuery omits defaults and preserves unrelated params", () => {
  const existing = new URLSearchParams("debug=1&page=9&sortBy=email");
  const result = serializeUserDirectoryQuery(
    {
      ...DEFAULT_USER_DIRECTORY_QUERY,
      searchQuery: " Alice ",
      appliedFilters: {
        role: "2",
        division: "",
        locationStatus: "configured",
      },
    },
    existing,
  );

  assert.equal(
    result.toString(),
    "debug=1&search=Alice&role=2&location_status=configured",
  );
});

test("toUserDirectoryRequestParams always opts into pagination", () => {
  assert.deepEqual(
    toUserDirectoryRequestParams({
      currentPage: 2,
      entriesPerPage: 10,
      searchQuery: "  febri ",
      appliedFilters: {
        role: "3",
        division: "4",
        locationStatus: "integrity_error",
      },
      sortBy: "full_name",
      sortOrder: "ASC",
    }),
    {
      page: 2,
      limit: 10,
      search: "febri",
      role: 3,
      division: 4,
      location_status: "integrity_error",
      sortBy: "full_name",
      sortOrder: "ASC",
    },
  );
});
