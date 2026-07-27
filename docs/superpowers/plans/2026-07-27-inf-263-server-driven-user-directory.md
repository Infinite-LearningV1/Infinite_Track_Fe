# INF-263 Server-Driven User Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Management Pengguna from fetch-all plus browser filtering/pagination to the canonical server-driven `GET /api/users` contract delivered by backend PR #129.

**Architecture:** A pure query-state module owns URL parsing, sanitization, serialization, and API parameter construction. `userService.getUsers()` owns HTTP query construction and response-envelope normalization. The Alpine component owns request orchestration and renders the returned page directly, with injected dependencies for deterministic tests and a monotonically increasing request ID to reject stale results.

**Tech Stack:** HTML, Alpine.js, JavaScript ES modules, Axios through `authRequest`, Node.js built-in test runner, Webpack, Tailwind CSS.

## Global Constraints

- Work only in `C:\Users\Febriyadi\.claude\worktrees\Infinite_Track_Fe-feature-inf-263-server-driven-users` on `feature/inf-263-server-driven-users`.
- This branch is intentionally stacked on `feat/inf-249-management-pengguna-table-redesign`; do not rebase it onto `develop` during implementation.
- Every directory request sends both `page` and `limit`.
- Do not apply `Array.prototype.filter()` or `Array.prototype.slice()` to the returned directory page.
- Query filters use stable role and division IDs, never display labels.
- `location_status=integrity_error` renders as `Perlu diperbaiki`, never `Belum diatur`.
- The detail drawer continues to fetch `GET /api/users/:id`.
- Do not edit the backend repository or change Linear status.
- Preserve unrelated worktree and repository changes.
- Follow RED-GREEN-REFACTOR for every production behavior.
- Report build/test evidence separately from authenticated browser/runtime evidence.

---

## File Map

- Create `src/js/features/userManagement/userDirectoryQuery.js`: pure canonical query state, URL parsing/serialization, and API request parameter conversion.
- Modify `src/js/services/userService.js`: construct the complete list URL, normalize the paginated envelope, and keep availability helpers compatible.
- Modify `src/js/features/userManagement/userListSimple.js`: server-authored list state, request orchestration, URL history, sorting, debounced search, stale-response protection, and delete recovery.
- Modify `src/partials/table/table-user.html`: direct row rendering, server pagination bindings, accessible sortable headers, truthful empty/loading behavior.
- Modify `src/partials/table/user-table-filter.html`: stable-ID role/division controls and canonical WFH status values.
- Create `tests/user-directory-query.test.js`: query-state unit tests.
- Create `tests/user-service-directory-contract.test.js`: user service URL/envelope tests.
- Create `tests/user-directory-server-state.test.js`: Alpine fetch, pagination, stale response, error, mutation, and history tests.
- Modify `tests/user-list-filter-state.test.js`: replace superseded client-filter assertions with reference-data and server-filter state assertions.
- Modify `tests/user-table-filter-popover.test.js`: assert stable option values and truthful labels.
- Modify `tests/user-table-structure.test.js`: assert direct rows and sortable headers.
- Modify `tests/user-table-wfh-status-column.test.js`: assert explicit integrity-error rendering.

---

### Task 1: Canonical Query-State Module

**Files:**

- Create: `src/js/features/userManagement/userDirectoryQuery.js`
- Create: `tests/user-directory-query.test.js`

**Interfaces:**

- Produces:
  - `DEFAULT_USER_DIRECTORY_QUERY`
  - `USER_DIRECTORY_PAGE_SIZES`
  - `USER_DIRECTORY_SORT_KEYS`
  - `parseUserDirectoryQuery(searchParams)`
  - `serializeUserDirectoryQuery(state, existingSearchParams)`
  - `toUserDirectoryRequestParams(state)`
- Consumes: standard `URLSearchParams`; no browser globals.

- [ ] **Step 1: Write failing tests for URL parsing and sanitization**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_USER_DIRECTORY_QUERY,
  parseUserDirectoryQuery,
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test .\tests\user-directory-query.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `userDirectoryQuery.js`.

- [ ] **Step 3: Add failing tests for canonical serialization**

```js
import {
  serializeUserDirectoryQuery,
  toUserDirectoryRequestParams,
} from "../src/js/features/userManagement/userDirectoryQuery.js";

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
```

- [ ] **Step 4: Implement the minimal pure module**

```js
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
```

Complete the module with:

```js
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
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```powershell
node --test .\tests\user-directory-query.test.js
```

Expected: all query-state tests PASS.

- [ ] **Step 6: Commit the query-state unit**

```powershell
git add -- src/js/features/userManagement/userDirectoryQuery.js tests/user-directory-query.test.js
git commit -m "feat(webfe): add canonical user directory query state (INF-263)"
```

---

### Task 2: Paginated User-Service Contract

**Files:**

- Modify: `src/js/services/userService.js`
- Create: `tests/user-service-directory-contract.test.js`

**Interfaces:**

- Produces:
  - `buildUserListUrl(baseUrl, origin, params): URL`
  - `normalizeUserListResponse(payload): { data, pagination, message }`
  - `getUsers(params): Promise<{ data, pagination, message }>`
- Consumes: canonical request params from
  `toUserDirectoryRequestParams(state)`.

- [ ] **Step 1: Write failing URL-construction tests**

```js
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test .\tests\user-service-directory-contract.test.js
```

Expected: FAIL because `buildUserListUrl` and
`normalizeUserListResponse` are not exported.

- [ ] **Step 3: Add failing envelope-normalization tests**

```js
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
```

- [ ] **Step 4: Implement URL and envelope helpers, then use them in `getUsers`**

Add the following behavior to `userService.js`:

```js
export function buildUserListUrl(baseUrl, origin, params = {}) {
  const url = new URL(`${baseUrl}/users`, origin);
  const orderedKeys = [
    "page",
    "limit",
    "search",
    "role",
    "program",
    "division",
    "position",
    "location_status",
    "sortBy",
    "sortOrder",
  ];

  for (const key of orderedKeys) {
    const rawValue = params[key];
    const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  }
  return url;
}

export function normalizeUserListResponse(payload) {
  if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
    throw new Error(payload?.message || "Respons daftar pengguna tidak valid.");
  }
  if (payload.pagination !== undefined) {
    const pagination = payload.pagination;
    const valid =
      Number.isInteger(pagination?.page) &&
      Number.isInteger(pagination?.limit) &&
      Number.isInteger(pagination?.total) &&
      Number.isInteger(pagination?.totalPages);
    if (!valid) throw new Error("Pagination pengguna tidak valid.");
  }
  return {
    data: payload.data,
    pagination: payload.pagination || null,
    message: payload.message || "",
  };
}
```

Replace the manual `search`/`sortBy`/`sortOrder` URL logic in `getUsers`
with `buildUserListUrl`. Return `normalizeUserListResponse(response.data)`.
Update `checkEmailAvailability` and `checkNipNimAvailability` to use:

```js
const { data: users } = await getUsers();
```

- [ ] **Step 5: Run service and existing user tests**

Run:

```powershell
node --test .\tests\user-service-directory-contract.test.js .\tests\user-list-filter-state.test.js
```

Expected: service tests PASS; existing user-list tests remain PASS before the
component migration.

- [ ] **Step 6: Commit the service contract**

```powershell
git add -- src/js/services/userService.js tests/user-service-directory-contract.test.js
git commit -m "feat(webfe): consume paginated users service envelope (INF-263)"
```

---

### Task 3: Server-Authored Alpine Directory State

**Files:**

- Modify: `src/js/features/userManagement/userListSimple.js`
- Create: `tests/user-directory-server-state.test.js`
- Modify: `tests/user-list-filter-state.test.js`

**Interfaces:**

- Consumes:
  - `getUsers(params)` normalized result from Task 2.
  - query helpers from Task 1.
- Produces:
  - `userListAlpineData(overrides = {})`
  - `fetchUsers({ historyMode = "none" } = {})`
  - server-authored `users` and `pagination`.

- [ ] **Step 1: Replace client-filter tests with a failing direct-page test**

Remove tests that assert `filteredUsers`, `paginatedUsers`, inferred
`availableRoles`, and display-label filters. Add:

```js
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
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test .\tests\user-directory-server-state.test.js .\tests\user-list-filter-state.test.js
```

Expected: FAIL because the component expects an array and calculates client
pagination.

- [ ] **Step 3: Add failing stale-response and successful-empty tests**

```js
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
```

- [ ] **Step 4: Implement injected services and server pagination**

Change the factory signature and state:

```js
function userListAlpineData(overrides = {}) {
  const services = {
    getUsers: overrides.getUsers || getUsers,
    getRoles: overrides.getRoles || getRoles,
    getDivisions: overrides.getDivisions || getDivisions,
    deleteUser: overrides.deleteUser || deleteUser,
  };

  return {
    users: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    entriesPerPage: 10,
    currentPage: 1,
    searchQuery: "",
    appliedFilters: { role: "", division: "", locationStatus: "" },
    sortBy: "created_at",
    sortOrder: "DESC",
    latestRequestId: 0,
    // existing modal and drawer state follows
  };
}
```

Import `getRoles`, the Task 1 helpers, and add this mapper beside the factory:

```js
function mapDirectoryUser(user) {
  const fullName = user.full_name || user.fullName || "";
  return {
    ...user,
    fullName,
    role: user.role_name || user.role || null,
    position: user.position_name || user.position || null,
    nipNim: user.nip_nim || user.nipNim || null,
    division: user.division_name || user.division || null,
    photo: user.photo || null,
    locationStatus: user.location_status || null,
    initials: getInitials(fullName),
    avatarColor: getAvatarColor(fullName),
  };
}
```

Remove `filteredUsers`,
`paginatedUsers`, inferred `availableRoles`, and all client-side
filter/slice calculations.

`fetchUsers` must:

```js
const requestId = ++this.latestRequestId;
this.isLoading = true;
this.errorMessage = "";
try {
  const result = await services.getUsers(toUserDirectoryRequestParams(this));
  if (requestId !== this.latestRequestId) return;
  this.users = result.data.map(mapDirectoryUser);
  this.pagination = result.pagination;
  this.currentPage = result.pagination.page;
  this.entriesPerPage = result.pagination.limit;
} catch (error) {
  if (requestId !== this.latestRequestId) return;
  this.errorMessage = error.message;
  this.showErrorModal(error.message);
} finally {
  if (requestId === this.latestRequestId) this.isLoading = false;
}
```

Derive `totalPages` from `pagination.totalPages`. Derive the showing range from
`pagination.page`, `pagination.limit`, `pagination.total`, and
`users.length`.

- [ ] **Step 5: Add and satisfy reference-data tests**

```js
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
```

Load both reference endpoints without making either a prerequisite for
`fetchUsers`:

```js
async loadReferenceData() {
  const [rolesResult, divisionsResult] = await Promise.allSettled([
    services.getRoles(),
    services.getDivisions(),
  ]);
  this.availableRoles =
    rolesResult.status === "fulfilled" ? rolesResult.value || [] : [];
  this.availableDivisions =
    divisionsResult.status === "fulfilled" ? divisionsResult.value || [] : [];
  this.roleOptionsError = rolesResult.status === "rejected";
  this.divisionOptionsError = divisionsResult.status === "rejected";
},
```

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run:

```powershell
node --test .\tests\user-directory-server-state.test.js .\tests\user-list-filter-state.test.js
```

Expected: all server-state and updated filter-state tests PASS.

- [ ] **Step 7: Commit server-authored component state**

```powershell
git add -- src/js/features/userManagement/userListSimple.js tests/user-directory-server-state.test.js tests/user-list-filter-state.test.js
git commit -m "feat(webfe): render server-authored user pages (INF-263)"
```

---

### Task 4: URL History, Search, Filters, Pagination, and Sort Interactions

**Files:**

- Modify: `src/js/features/userManagement/userListSimple.js`
- Modify: `tests/user-directory-server-state.test.js`

**Interfaces:**

- Produces:
  - `syncUrl(mode)`
  - `applyUrlState({ fetch = true } = {})`
  - `onSearchChange()`
  - `onEntriesPerPageChange()`
  - `applyFilters()`
  - `resetFilters()`
  - `goToPage(page)`
  - `toggleSort(sortBy)`
  - `destroy()`
- Consumes Task 1 parse/serialize helpers.

- [ ] **Step 1: Add failing filter, page, and sort interaction tests**

```js
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
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test .\tests\user-directory-server-state.test.js
```

Expected: FAIL because interactions do not fetch server results.

- [ ] **Step 3: Add failing URL initialization and history tests**

Use this deterministic browser fake:

```js
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
```

Add:

```js
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
```

- [ ] **Step 4: Add a failing deterministic debounce test**

Inject scheduler functions through overrides:

```js
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
```

- [ ] **Step 5: Implement browser and scheduler injection**

Resolve dependencies once in the factory:

```js
const browser =
  overrides.browser !== undefined
    ? overrides.browser
    : typeof window !== "undefined"
      ? window
      : null;
const schedule = overrides.setTimeout || globalThis.setTimeout;
const cancelSchedule = overrides.clearTimeout || globalThis.clearTimeout;
```

Implement browser lifecycle and URL writing as:

```js
applyParsedQuery(parsed) {
  this.currentPage = parsed.currentPage;
  this.entriesPerPage = parsed.entriesPerPage;
  this.searchQuery = parsed.searchQuery;
  this.appliedFilters = { ...parsed.appliedFilters };
  this.filterRole = parsed.appliedFilters.role;
  this.filterDivision = parsed.appliedFilters.division;
  this.filterWfhStatus = parsed.appliedFilters.locationStatus;
  this.sortBy = parsed.sortBy;
  this.sortOrder = parsed.sortOrder;
},
syncUrl(mode) {
  if (!browser || mode === "none") return;
  const query = serializeUserDirectoryQuery(
    this,
    new URLSearchParams(browser.location.search),
  ).toString();
  const url = `${browser.location.pathname}${query ? `?${query}` : ""}${browser.location.hash || ""}`;
  browser.history[`${mode}State`]({}, "", url);
},
async init() {
  if (browser) {
    this.applyParsedQuery(
      parseUserDirectoryQuery(new URLSearchParams(browser.location.search)),
    );
    this.popstateHandler = async () => {
      this.applyParsedQuery(
        parseUserDirectoryQuery(new URLSearchParams(browser.location.search)),
      );
      await this.fetchUsers();
    };
    browser.addEventListener("popstate", this.popstateHandler);
  }
  await Promise.all([this.fetchUsers(), this.loadReferenceData()]);
},
destroy() {
  if (this.searchTimer !== null) cancelSchedule(this.searchTimer);
  if (browser && this.popstateHandler) {
    browser.removeEventListener("popstate", this.popstateHandler);
  }
},
```

Implement interactions with these exact state transitions:

```js
async goToPage(page) {
  if (this.isLoading || page < 1 || page > this.totalPages) return;
  this.currentPage = page;
  this.syncUrl("push");
  await this.fetchUsers();
},
onSearchChange() {
  if (this.searchTimer !== null) cancelSchedule(this.searchTimer);
  this.searchTimer = schedule(async () => {
    this.currentPage = 1;
    this.syncUrl("replace");
    await this.fetchUsers();
  }, 300);
},
async onEntriesPerPageChange() {
  this.entriesPerPage = Number(this.entriesPerPage);
  this.currentPage = 1;
  this.syncUrl("push");
  await this.fetchUsers();
},
async applyFilters() {
  this.appliedFilters = {
    role: this.filterRole,
    division: this.filterDivision,
    locationStatus: this.filterWfhStatus,
  };
  this.isFilterOpen = false;
  this.currentPage = 1;
  this.syncUrl("push");
  await this.fetchUsers();
},
async resetFilters() {
  this.filterRole = "";
  this.filterDivision = "";
  this.filterWfhStatus = "";
  this.appliedFilters = { role: "", division: "", locationStatus: "" };
  this.currentPage = 1;
  this.syncUrl("push");
  await this.fetchUsers();
},
async toggleSort(key) {
  if (this.isLoading || !USER_DIRECTORY_SORT_KEYS.includes(key)) return;
  this.sortOrder =
    this.sortBy === key && this.sortOrder === "ASC" ? "DESC" : "ASC";
  this.sortBy = key;
  this.currentPage = 1;
  this.syncUrl("push");
  await this.fetchUsers();
},
```

- [ ] **Step 6: Run the interaction tests and verify GREEN**

Run:

```powershell
node --test .\tests\user-directory-server-state.test.js .\tests\user-directory-query.test.js
```

Expected: history, debounce, filter, pagination, and sort tests PASS.

- [ ] **Step 7: Commit URL-backed interactions**

```powershell
git add -- src/js/features/userManagement/userListSimple.js tests/user-directory-server-state.test.js
git commit -m "feat(webfe): sync user directory state with URL (INF-263)"
```

---

### Task 5: Truthful Table, Filter, Sort, and Integrity UI

**Files:**

- Modify: `src/partials/table/table-user.html`
- Modify: `src/partials/table/user-table-filter.html`
- Modify: `src/js/features/userManagement/userListSimple.js`
- Modify: `tests/user-table-structure.test.js`
- Modify: `tests/user-table-filter-popover.test.js`
- Modify: `tests/user-table-wfh-status-column.test.js`

**Interfaces:**

- Consumes server-authored `users`, `pagination`, and interaction methods from
  Tasks 3-4.
- Produces truthful accessible controls and explicit WFH integrity status.

- [ ] **Step 1: Write failing direct-row and sort-header tests**

Add to `tests/user-table-structure.test.js`:

```js
test("the table renders the server page directly without client pagination", () => {
  assert.match(table, /x-for="user in users"/);
  assert.doesNotMatch(table, /paginatedUsers/);
  assert.doesNotMatch(table, /filteredUsers/);
});

test("only truthful backend-supported visible columns are sortable", () => {
  assert.match(table, /@click="toggleSort\('full_name'\)"/);
  assert.match(table, /@click="toggleSort\('nip_nim'\)"/);
  assert.match(table, /:aria-sort="sortAriaValue\('full_name'\)"/);
  assert.match(table, /:aria-sort="sortAriaValue\('nip_nim'\)"/);
  assert.doesNotMatch(table, /toggleSort\('role'\)/);
  assert.doesNotMatch(table, /toggleSort\('division'\)/);
  assert.doesNotMatch(table, /toggleSort\('location_status'\)/);
});
```

- [ ] **Step 2: Write failing stable-filter and integrity tests**

Add to `tests/user-table-filter-popover.test.js`:

```js
test("role and division filters submit stable IDs", () => {
  assert.match(
    filterPartial,
    /x-for="role in availableRoles"[\s\S]*:value="String\(role\.id\)"/,
  );
  assert.match(
    filterPartial,
    /x-for="division in availableDivisions"[\s\S]*:value="String\(division\.id\)"/,
  );
});

test("the organization filter truthfully says Divisi", () => {
  assert.match(filterPartial, />Divisi</);
  assert.doesNotMatch(filterPartial, /Divisi\s*\/\s*Program/);
});

test("WFH filter uses canonical backend keys", () => {
  assert.match(filterPartial, /value="configured">Tersedia/);
  assert.match(filterPartial, /value="integrity_error">Perlu diperbaiki/);
  assert.doesNotMatch(filterPartial, /value="Belum diatur"/);
});
```

Add behavior assertions to `tests/user-table-wfh-status-column.test.js`:

```js
test("integrity_error is explicit and never rendered as Belum diatur", () => {
  const data = userListAlpineData();
  assert.equal(
    data.wfhStatusFor({ locationStatus: "integrity_error" }),
    "Perlu diperbaiki",
  );
  assert.equal(data.wfhStatusFor({ locationStatus: "configured" }), "Tersedia");
  assert.equal(
    data.wfhStatusFor({ locationStatus: "other" }),
    "Status tidak diketahui",
  );
});
```

- [ ] **Step 3: Run template tests and verify RED**

Run:

```powershell
node --test .\tests\user-table-structure.test.js .\tests\user-table-filter-popover.test.js .\tests\user-table-wfh-status-column.test.js
```

Expected: FAIL on client-row binding, label-valued filters, missing sortable
headers, and missing integrity-error copy.

- [ ] **Step 4: Implement direct rows and server pagination bindings**

In `table-user.html`:

- replace every `paginatedUsers` reference with `users`;
- keep loading and empty rows mutually exclusive;
- bind showing information to the server-derived `showingInfo`;
- render numbered pages from `getPageNumbers()` rather than recomputing a
  second page window in HTML;
- disable page, sort, and page-size controls while `isLoading`;
- use `await`-compatible Alpine handlers without local row mutation.

Do not change the seven-column structure or the detail/edit/delete controls.

- [ ] **Step 5: Implement accessible sort headers**

Wrap `Pengguna` and `NIP/NIM` header labels in buttons:

```html
<th class="whitespace-nowrap px-6 py-3" :aria-sort="sortAriaValue('full_name')">
  <button
    type="button"
    @click="toggleSort('full_name')"
    :disabled="isLoading"
    aria-label="Urutkan berdasarkan nama pengguna"
  >
    <span>Pengguna</span>
    <span aria-hidden="true" x-text="sortIndicator('full_name')"></span>
  </button>
</th>
```

Apply the same contract to `nip_nim`. Add component methods:

```js
sortAriaValue(key) {
  if (this.sortBy !== key) return "none";
  return this.sortOrder === "ASC" ? "ascending" : "descending";
},
sortIndicator(key) {
  if (this.sortBy !== key) return "↕";
  return this.sortOrder === "ASC" ? "↑" : "↓";
},
```

- [ ] **Step 6: Implement stable-ID filters and integrity status**

Import and load `getRoles`. Change option values to `String(role.id)` and
`String(division.id)`. Change the organization label to `Divisi`.

Use:

```js
wfhStatusFor(user) {
  if (user.locationStatus === "configured") return "Tersedia";
  if (user.locationStatus === "integrity_error") return "Perlu diperbaiki";
  return "Status tidak diketahui";
},
```

Add a status-class method that gives `integrity_error` an error palette,
`configured` a success palette, and unknown a neutral palette. Keep visible
text as the primary carrier of status.

- [ ] **Step 7: Run template and component tests and verify GREEN**

Run:

```powershell
node --test .\tests\user-table-structure.test.js .\tests\user-table-filter-popover.test.js .\tests\user-table-wfh-status-column.test.js .\tests\user-directory-server-state.test.js
```

Expected: all targeted UI contract tests PASS.

- [ ] **Step 8: Commit truthful UI bindings**

```powershell
git add -- src/partials/table/table-user.html src/partials/table/user-table-filter.html src/js/features/userManagement/userListSimple.js tests/user-table-structure.test.js tests/user-table-filter-popover.test.js tests/user-table-wfh-status-column.test.js
git commit -m "feat(webfe): bind user table controls to server query (INF-263)"
```

---

### Task 6: Error Retention and Delete Page Recovery

**Files:**

- Modify: `src/js/features/userManagement/userListSimple.js`
- Modify: `tests/user-directory-server-state.test.js`

**Interfaces:**

- Consumes canonical pagination from Task 3.
- Produces deterministic current-page recovery after deletion and non-destructive
  fetch failures.

- [ ] **Step 1: Write failing error-retention test**

```js
test("a current request failure retains the previous successful rows", async () => {
  const data = userListAlpineData({
    browser: null,
    getUsers: async () => {
      throw new Error("page harus bilangan bulat >= 1");
    },
  });
  data.users = [{ id: 8, fullName: "Existing" }];

  await data.fetchUsers();

  assert.deepEqual(
    data.users.map((user) => user.id),
    [8],
  );
  assert.equal(data.errorMessage, "page harus bilangan bulat >= 1");
  assert.equal(data.isLoading, false);
});
```

- [ ] **Step 2: Write failing delete recovery tests**

```js
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

  await data.confirmDeleteUser();

  assert.equal(data.currentPage, 1);
  assert.deepEqual(data.users, []);
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
node --test .\tests\user-directory-server-state.test.js
```

Expected: FAIL because delete still mutates the local array and client-derived
page count.

- [ ] **Step 4: Implement non-destructive errors and server page recovery**

Inject `deleteUser` as `services.deleteUser`. Remove local
`this.users.filter(...)` from `confirmDeleteUser`.

After deletion:

```js
await this.fetchUsers();
if (
  this.currentPage > 1 &&
  this.pagination.totalPages > 0 &&
  this.currentPage > this.pagination.totalPages
) {
  this.currentPage = this.pagination.totalPages;
  this.syncUrl("replace");
  await this.fetchUsers();
} else if (this.pagination.totalPages === 0) {
  this.currentPage = 1;
  this.syncUrl("replace");
}
```

Do not clear `users` in the `fetchUsers` catch path. Keep the newest request's
error message and ignore stale failures using the request ID guard.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node --test .\tests\user-directory-server-state.test.js
```

Expected: error retention, trailing-page recovery, empty-directory, and stale
request tests PASS.

- [ ] **Step 6: Commit mutation and error hardening**

```powershell
git add -- src/js/features/userManagement/userListSimple.js tests/user-directory-server-state.test.js
git commit -m "fix(webfe): recover user directory after server mutations (INF-263)"
```

---

### Task 7: Full Verification and Runtime Evidence

**Files:**

- No planned production-file changes.
- If verification reveals a defect, return to the relevant task and add a
  failing regression test before changing production code.

**Interfaces:**

- Verifies all acceptance criteria from the approved design spec.

- [ ] **Step 1: Verify the complete automated test suite**

Run:

```powershell
node --test
```

Expected: exit code 0 and zero failing tests.

- [ ] **Step 2: Verify formatting**

Run:

```powershell
npm run lint
```

Expected: Prettier check exits 0. If it fails, run Prettier only on the files
changed by INF-263, review the formatting diff, and rerun `npm run lint`.

- [ ] **Step 3: Verify the production build**

Run:

```powershell
npm run build
```

Expected: Webpack production build exits 0.

- [ ] **Step 4: Inspect the final diff and contract residue**

Run:

```powershell
git diff --check feat/inf-249-management-pengguna-table-redesign...HEAD
rg -n "paginatedUsers|filteredUsers|\\.slice\\(|\\.filter\\(" src/js/features/userManagement/userListSimple.js src/partials/table/table-user.html
git diff --stat feat/inf-249-management-pengguna-table-redesign...HEAD
git status --short --branch
```

Expected:

- `git diff --check` has no output;
- the residue scan finds no hidden client directory pagination/filtering;
- only INF-263 files and its design/plan are present;
- the worktree is clean after committed implementation.

- [ ] **Step 5: Verify the local backend prerequisite**

Run:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:3005/health" -UseBasicParsing
```

Expected: HTTP 200 with database and scheduler `ready`.

- [ ] **Step 6: Run authenticated browser verification**

Start the FE:

```powershell
npm run start
```

In an authenticated Admin/Management session, verify:

1. Initial load requests `/api/users?page=1&limit=10` and renders the envelope.
2. Dataset has at least two pages; Next and numbered pagination request the
   expected server page.
3. Search by full name, email, and NIP/NIM changes the API `search` parameter.
4. Role and division options send numeric IDs.
5. WFH filters send `configured` and `integrity_error`.
6. An integrity-error row displays `Perlu diperbaiki`.
7. Pengguna and NIP/NIM sort controls send whitelisted `sortBy` values and
   toggle `ASC`/`DESC`.
8. Refresh preserves URL state.
9. Back and Forward restore the matching server result.
10. An empty page renders a normal empty state without an error modal.
11. Opening a row still requests `GET /api/users/:id`.

Capture runtime evidence separately from automated build/test output. If an
authenticated session or a two-page dataset is unavailable, report those
checks as `Needs Verification`; do not present build success as runtime proof.

- [ ] **Step 7: Final acceptance review**

Re-read:

```powershell
Get-Content .\docs\superpowers\specs\2026-07-27-inf-263-server-driven-user-directory-design.md
```

Check every acceptance criterion against fresh test, build, diff, and runtime
evidence. Do not commit, push, open a PR, or update Linear unless separately
authorized by the user.
