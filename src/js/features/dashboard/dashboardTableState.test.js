import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDashboardSearch,
  applyDashboardPageSize,
  applyDashboardPeriod,
  buildDashboardRequestParams,
  createEmptyDashboardPagination,
  normalizeDashboardPagination,
  sortDashboardRows,
} from "./dashboardTableState.js";

test("buildDashboardRequestParams returns only canonical server-driven request params", () => {
  const params = buildDashboardRequestParams({
    period: "weekly",
    page: 3,
    limit: 25,
    search: "andi",
    sortBy: "status",
  });

  assert.deepEqual(params, {
    period: "weekly",
    page: 3,
    limit: 25,
    search: "andi",
  });
});

test("applyDashboardSearch syncs search into filters and resets page to first page", () => {
  const nextFilters = applyDashboardSearch(
    { period: "all", page: 4, limit: 10, search: "old" },
    "  febri  ",
  );

  assert.deepEqual(nextFilters, {
    period: "all",
    page: 1,
    limit: 10,
    search: "febri",
  });
});

test("applyDashboardPageSize normalizes limit and resets page", () => {
  const nextFilters = applyDashboardPageSize(
    { period: "monthly", page: 5, limit: 5, search: "a" },
    "25",
  );

  assert.deepEqual(nextFilters, {
    period: "monthly",
    page: 1,
    limit: 25,
    search: "a",
  });
});

test("applyDashboardPeriod stores period in filters and resets page", () => {
  const nextFilters = applyDashboardPeriod(
    { period: "all", page: 2, limit: 10, search: "x" },
    "daily",
  );

  assert.deepEqual(nextFilters, {
    period: "daily",
    page: 1,
    limit: 10,
    search: "x",
  });
});

test("normalizeDashboardPagination maps backend pagination aliases to the canonical shape", () => {
  assert.deepEqual(
    normalizeDashboardPagination(
      {
        current_page: 2,
        total_pages: 4,
        total_items: 30,
        items_per_page: 10,
      },
      5,
    ),
    {
      current_page: 2,
      total_pages: 4,
      total_records: 30,
      has_prev_page: true,
      has_next_page: true,
      per_page: 10,
    },
  );
});

test("createEmptyDashboardPagination returns canonical empty pagination state", () => {
  assert.deepEqual(createEmptyDashboardPagination(25), {
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    has_prev_page: false,
    has_next_page: false,
    per_page: 25,
  });
});

test("sortDashboardRows sorts dashboard rows in-memory for UI-only sorting", () => {
  const rows = [
    { full_name: "Budi", status: "Late", time_in: "08:10" },
    { full_name: "Andi", status: "On Time", time_in: "07:55" },
    { full_name: "Cici", status: "Alpha", time_in: null },
  ];

  assert.deepEqual(
    sortDashboardRows(rows, { field: "full_name", direction: "asc" }).map(
      (row) => row.full_name,
    ),
    ["Andi", "Budi", "Cici"],
  );

  assert.deepEqual(
    sortDashboardRows(rows, { field: "status", direction: "desc" }).map(
      (row) => row.status,
    ),
    ["On Time", "Late", "Alpha"],
  );

  assert.deepEqual(
    sortDashboardRows(rows, { field: "time_in", direction: "asc" }).map(
      (row) => row.time_in,
    ),
    [null, "07:55", "08:10"],
  );
});
