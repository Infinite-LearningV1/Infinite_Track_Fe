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

const ATTENDANCE_STATUSES = Object.freeze([
  "ontime",
  "late",
  "early",
  "alpha",
  "absent",
]);

export const ATTENDANCE_PAGE_SIZES = Object.freeze([10, 25, 50, 100]);
export const ATTENDANCE_MODES = Object.freeze(["WFO", "WFH", "WFA"]);
export const ATTENDANCE_CHECKOUT_STATES = Object.freeze(["completed", "open"]);

export const DEFAULT_ATTENDANCE_QUERY = Object.freeze({
  page: 1,
  limit: 10,
  search: "",
  appliedFilters: Object.freeze({
    from: "",
    to: "",
    mode: "",
    status: "",
    checkoutState: "",
  }),
});

function positiveInteger(value) {
  return /^\d+$/.test(value || "") && Number(value) > 0 ? Number(value) : null;
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
  const mode = searchParams.get("mode");
  const status = searchParams.get("status");
  const checkoutState = searchParams.get("checkout_state");
  const dateRange = validateAttendanceDateRange({ from, to });

  return {
    page: page || DEFAULT_ATTENDANCE_QUERY.page,
    limit: ATTENDANCE_PAGE_SIZES.includes(limit)
      ? limit
      : DEFAULT_ATTENDANCE_QUERY.limit,
    search: (searchParams.get("search") || "").trim(),
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
  ];

  for (const [key, value] of values) {
    if (value !== null) result.append(key, String(value));
  }
  return result;
}

export function toAttendanceRequestParams(state) {
  const filters = state.appliedFilters || {};
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

  return params;
}
