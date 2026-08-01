const MANAGED_QUERY_KEYS = [
  "page",
  "limit",
  "search",
  "from",
  "to",
  "mode",
  "status",
  "checkout_state",
  "sortBy",
  "sortOrder",
];

const ATTENDANCE_STATUSES = Object.freeze(["ontime", "late", "early", "alpha"]);

export const ATTENDANCE_PAGE_SIZES = Object.freeze([10, 25, 50, 100]);
export const ATTENDANCE_MODES = Object.freeze(["wfo", "wfh", "wfa"]);
export const ATTENDANCE_CHECKOUT_STATES = Object.freeze(["completed", "open"]);
export const ATTENDANCE_SORT_KEYS = Object.freeze([
  "attendance_date",
  "time_in",
  "time_out",
  "full_name",
  "status",
  "created_at",
]);
export const ATTENDANCE_SORT_ORDERS = Object.freeze(["ASC", "DESC"]);

export const DEFAULT_ATTENDANCE_QUERY = Object.freeze({
  page: 1,
  limit: 10,
  search: "",
  sortBy: "",
  sortOrder: "",
  appliedFilters: Object.freeze({
    from: "",
    to: "",
    mode: "",
    status: "",
    checkoutState: "",
  }),
});

function positiveInteger(value) {
  if (!/^\d+$/.test(value || "")) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function isDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeAttendanceSort(sortBy, sortOrder) {
  if (!ATTENDANCE_SORT_KEYS.includes(sortBy)) {
    return { sortBy: "", sortOrder: "" };
  }

  return {
    sortBy,
    sortOrder: ATTENDANCE_SORT_ORDERS.includes(sortOrder) ? sortOrder : "DESC",
  };
}

export function validateAttendanceDateRange(filters = {}) {
  const from = filters.from || "";
  const to = filters.to || "";

  if (!from && !to) return { valid: true, message: "" };
  if (!from || !to) {
    return {
      valid: false,
      message: "Tanggal mulai dan selesai harus diisi bersama.",
    };
  }
  if (!isDateOnly(from) || !isDateOnly(to)) {
    return { valid: false, message: "Format tanggal tidak valid." };
  }
  if (from > to) {
    return {
      valid: false,
      message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
    };
  }
  return { valid: true, message: "" };
}

export function parseAttendanceDirectoryQuery(searchParams) {
  const page = positiveInteger(searchParams.get("page"));
  const limit = positiveInteger(searchParams.get("limit"));
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const mode = (searchParams.get("mode") || "").toLowerCase();
  const status = searchParams.get("status");
  const checkoutState = searchParams.get("checkout_state");
  const sort = normalizeAttendanceSort(
    searchParams.get("sortBy") || "",
    searchParams.get("sortOrder") || "",
  );
  const dateRange = validateAttendanceDateRange({ from, to });

  return {
    page: page || DEFAULT_ATTENDANCE_QUERY.page,
    limit: ATTENDANCE_PAGE_SIZES.includes(limit)
      ? limit
      : DEFAULT_ATTENDANCE_QUERY.limit,
    search: (searchParams.get("search") || "").trim(),
    ...sort,
    appliedFilters: {
      from: dateRange.valid ? from : "",
      to: dateRange.valid ? to : "",
      mode: ATTENDANCE_MODES.includes(mode) ? mode : "",
      status: ATTENDANCE_STATUSES.includes(status) ? status : "",
      checkoutState: ATTENDANCE_CHECKOUT_STATES.includes(checkoutState)
        ? checkoutState
        : "",
    },
  };
}

export function serializeAttendanceDirectoryQuery(
  state,
  existingSearchParams = new URLSearchParams(),
) {
  const result = new URLSearchParams(existingSearchParams);
  for (const key of MANAGED_QUERY_KEYS) result.delete(key);

  const filters = state.appliedFilters || {};
  const sort = normalizeAttendanceSort(
    state.sortBy || "",
    state.sortOrder || "",
  );
  const values = [
    ["page", state.page !== DEFAULT_ATTENDANCE_QUERY.page ? state.page : null],
    [
      "limit",
      state.limit !== DEFAULT_ATTENDANCE_QUERY.limit ? state.limit : null,
    ],
    ["search", (state.search || "").trim() || null],
    ["from", filters.from || null],
    ["to", filters.to || null],
    ["mode", filters.mode || null],
    ["status", filters.status || null],
    ["checkout_state", filters.checkoutState || null],
    ["sortBy", sort.sortBy || null],
    ["sortOrder", sort.sortOrder || null],
  ];

  for (const [key, value] of values) {
    if (value !== null) result.append(key, String(value));
  }
  return result;
}

export function toAttendanceRequestParams(state) {
  const filters = state.appliedFilters || {};
  const sort = normalizeAttendanceSort(
    state.sortBy || "",
    state.sortOrder || "",
  );
  const params = {
    page: state.page,
    limit: state.limit,
  };
  const search = (state.search || "").trim();

  if (search) params.search = search;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.mode) params.mode = filters.mode;
  if (filters.status) params.status = filters.status;
  if (filters.checkoutState) params.checkout_state = filters.checkoutState;
  if (sort.sortBy) {
    params.sortBy = sort.sortBy;
    params.sortOrder = sort.sortOrder;
  }

  return params;
}
