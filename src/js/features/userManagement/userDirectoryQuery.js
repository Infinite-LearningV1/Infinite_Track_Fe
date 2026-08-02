const MANAGED_QUERY_KEYS = [
  "page",
  "limit",
  "search",
  "role",
  "division",
  "location_status",
  "sortBy",
  "sortOrder",
];

export const USER_DIRECTORY_PAGE_SIZES = Object.freeze([10, 20, 50, 100]);
export const USER_DIRECTORY_SORT_KEYS = Object.freeze([
  "full_name",
  "email",
  "nip_nim",
  "created_at",
  "updated_at",
]);

export const DEFAULT_USER_DIRECTORY_QUERY = Object.freeze({
  currentPage: 1,
  entriesPerPage: 10,
  searchQuery: "",
  appliedFilters: Object.freeze({
    role: "",
    division: "",
    locationStatus: "",
  }),
  sortBy: "created_at",
  sortOrder: "DESC",
});

function positiveInteger(value) {
  return /^\d+$/.test(value || "") && Number(value) > 0 ? Number(value) : null;
}

export function parseUserDirectoryQuery(searchParams) {
  const page = positiveInteger(searchParams.get("page"));
  const limit = positiveInteger(searchParams.get("limit"));
  const role = positiveInteger(searchParams.get("role"));
  const division = positiveInteger(searchParams.get("division"));
  const locationStatus = searchParams.get("location_status");
  const sortBy = searchParams.get("sortBy");
  const sortOrder = searchParams.get("sortOrder")?.toUpperCase();

  return {
    currentPage: page || 1,
    entriesPerPage: USER_DIRECTORY_PAGE_SIZES.includes(limit) ? limit : 10,
    searchQuery: (searchParams.get("search") || "").trim(),
    appliedFilters: {
      role: role ? String(role) : "",
      division: division ? String(division) : "",
      locationStatus: ["configured", "integrity_error"].includes(locationStatus)
        ? locationStatus
        : "",
    },
    sortBy: USER_DIRECTORY_SORT_KEYS.includes(sortBy) ? sortBy : "created_at",
    sortOrder: ["ASC", "DESC"].includes(sortOrder) ? sortOrder : "DESC",
  };
}

export function serializeUserDirectoryQuery(
  state,
  existingSearchParams = new URLSearchParams(),
) {
  const result = new URLSearchParams(existingSearchParams);
  for (const key of MANAGED_QUERY_KEYS) result.delete(key);

  const values = [
    ["page", state.currentPage !== 1 ? state.currentPage : null],
    ["limit", state.entriesPerPage !== 10 ? state.entriesPerPage : null],
    ["search", state.searchQuery.trim() || null],
    ["role", state.appliedFilters.role || null],
    ["division", state.appliedFilters.division || null],
    ["location_status", state.appliedFilters.locationStatus || null],
    ["sortBy", state.sortBy !== "created_at" ? state.sortBy : null],
    ["sortOrder", state.sortOrder !== "DESC" ? state.sortOrder : null],
  ];

  for (const [key, value] of values) {
    if (value !== null) result.append(key, String(value));
  }
  return result;
}

export function toUserDirectoryRequestParams(state) {
  const params = {
    page: state.currentPage,
    limit: state.entriesPerPage,
  };
  const search = state.searchQuery.trim();
  if (search) params.search = search;
  if (state.appliedFilters.role) {
    params.role = Number(state.appliedFilters.role);
  }
  if (state.appliedFilters.division) {
    params.division = Number(state.appliedFilters.division);
  }
  if (state.appliedFilters.locationStatus) {
    params.location_status = state.appliedFilters.locationStatus;
  }
  params.sortBy = state.sortBy;
  params.sortOrder = state.sortOrder;
  return params;
}
