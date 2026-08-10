export const BOOKING_MANAGEMENT_PAGE_SIZES = Object.freeze([10, 25, 50, 100]);

export const BOOKING_MANAGEMENT_STATUSES = Object.freeze([
  "pending",
  "approved",
  "rejected",
]);

export const DEFAULT_BOOKING_MANAGEMENT_QUERY = Object.freeze({
  page: 1,
  limit: 10,
  search: "",
  appliedFilters: Object.freeze({ status: "", dateFrom: "", dateTo: "" }),
});

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidDateOnly(value) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return date.toISOString().slice(0, 10) === value;
}

export function validateBookingManagementDateRange(filters = {}) {
  const { dateFrom = "", dateTo = "" } = filters;

  if (
    (dateFrom && !isValidDateOnly(dateFrom)) ||
    (dateTo && !isValidDateOnly(dateTo))
  ) {
    return { valid: false, message: "Format tanggal tidak valid." };
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return {
      valid: false,
      message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
    };
  }

  return { valid: true, message: "" };
}

export function toBookingManagementRequestParams(state) {
  const {
    page = DEFAULT_BOOKING_MANAGEMENT_QUERY.page,
    limit = DEFAULT_BOOKING_MANAGEMENT_QUERY.limit,
    search = DEFAULT_BOOKING_MANAGEMENT_QUERY.search,
    appliedFilters = DEFAULT_BOOKING_MANAGEMENT_QUERY.appliedFilters,
  } = state ?? DEFAULT_BOOKING_MANAGEMENT_QUERY;
  const params = { page, limit };
  const normalizedSearch = search.trim();

  if (normalizedSearch) params.search = normalizedSearch;
  if (BOOKING_MANAGEMENT_STATUSES.includes(appliedFilters.status)) {
    params.status = appliedFilters.status;
  }

  if (validateBookingManagementDateRange(appliedFilters).valid) {
    if (appliedFilters.dateFrom) params.date_from = appliedFilters.dateFrom;
    if (appliedFilters.dateTo) params.date_to = appliedFilters.dateTo;
  }

  return params;
}
