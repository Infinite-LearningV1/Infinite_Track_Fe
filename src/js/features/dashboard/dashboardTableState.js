export function buildDashboardRequestParams(filters) {
  return {
    period: filters.period,
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
  };
}

import { buildDashboardRangeRequestParams } from "../../components/dashboardRange/dashboardRange.js";

export function buildDashboardAnalyticsRequestParams(dashboardRange) {
  const canonicalPeriod =
    dashboardRange === "current_month" || dashboardRange === "monthly"
      ? "current_month"
      : dashboardRange === "30d"
        ? "30d"
        : "30d";

  return buildDashboardRangeRequestParams({
    period: canonicalPeriod,
    from: null,
    to: null,
  });
}

export function applyDashboardSearch(filters, search) {
  return {
    ...filters,
    page: 1,
    search: String(search ?? "").trim(),
  };
}

export function applyDashboardPageSize(filters, limit) {
  return {
    ...filters,
    page: 1,
    limit: Number(limit) || filters.limit,
  };
}

export function applyDashboardPeriod(filters, period) {
  return {
    ...filters,
    page: 1,
    period,
  };
}

export function normalizeDashboardPagination(pagination, fallbackLimit) {
  const currentPage = pagination.current_page || 1;
  const totalPages = pagination.total_pages || 1;

  let totalRecords = 0;
  if (typeof pagination.total_records !== "undefined") {
    totalRecords = pagination.total_records;
  } else if (typeof pagination.total_items !== "undefined") {
    totalRecords = pagination.total_items;
  }

  let perPage = fallbackLimit;
  if (typeof pagination.per_page !== "undefined") {
    perPage = pagination.per_page;
  } else if (typeof pagination.items_per_page !== "undefined") {
    perPage = pagination.items_per_page;
  }

  return {
    current_page: currentPage,
    total_pages: totalPages,
    total_records: totalRecords,
    has_prev_page:
      typeof pagination.has_prev_page === "boolean"
        ? pagination.has_prev_page
        : currentPage > 1,
    has_next_page:
      typeof pagination.has_next_page === "boolean"
        ? pagination.has_next_page
        : currentPage < totalPages,
    per_page: perPage,
  };
}

export function createEmptyDashboardPagination(perPage = 5) {
  return {
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    has_prev_page: false,
    has_next_page: false,
    per_page: perPage,
  };
}

export function sortDashboardRows(rows, sort) {
  if (!sort?.field) {
    return rows;
  }

  const direction = sort.direction === "desc" ? -1 : 1;

  return [...rows].sort((leftRow, rightRow) => {
    const leftValue = normalizeDashboardSortValue(leftRow?.[sort.field]);
    const rightValue = normalizeDashboardSortValue(rightRow?.[sort.field]);

    if (leftValue < rightValue) {
      return -1 * direction;
    }

    if (leftValue > rightValue) {
      return 1 * direction;
    }

    return 0;
  });
}

function normalizeDashboardSortValue(value) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  return String(value).toLowerCase();
}
