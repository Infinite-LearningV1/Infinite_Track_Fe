# INF-263 Server-Driven User Directory Design

## Context

INF-263 is Phase B of the INF-250 migration. Backend PR #129 (merge commit
`df5a491`) added opt-in server pagination, server-side search and filters, and
validated sorting to `GET /api/users`. The current Web FE still calls the
endpoint without `page` or `limit`, stores the complete directory in Alpine
state, and then searches, filters, and paginates that array in the browser.

This work is stacked on `feat/inf-249-management-pengguna-table-redesign`
because the INF-263 controls and table contract are introduced by INF-249.
Implementation will live in the isolated branch
`feature/inf-263-server-driven-users`.

## Goals

- Make the backend the only source of truth for user-directory search, filters,
  sorting, and pagination.
- Keep query state shareable and restorable through the page URL.
- Preserve the INF-249 table, filter popover, user actions, and detail drawer.
- Render WFH location integrity failures explicitly rather than presenting them
  as a normal unconfigured state.
- Protect the UI from stale, out-of-order list responses.

## Non-goals

- Changing the backend or making backend pagination the default.
- Adding program or position controls to the current INF-249 filter popover.
- Redesigning the Management Pengguna page.
- Changing the detail endpoint; the drawer continues to use
  `GET /api/users/:id`.
- Generalizing the solution into a shared table framework for other pages.

## Backend Contract

Every directory request sends both `page` and `limit`, thereby opting in to the
paginated response envelope.

Supported query parameters:

| Parameter | FE value | Default |
| --- | --- | --- |
| `page` | Integer greater than or equal to 1 | `1` |
| `limit` | One of the page-size values offered by the UI, within 1-100 | `10` |
| `search` | Trimmed search text | omitted |
| `role` | Stable role ID | omitted |
| `division` | Stable division ID | omitted |
| `location_status` | `configured` or `integrity_error` | omitted |
| `sortBy` | Backend-whitelisted key | `created_at` |
| `sortOrder` | `ASC` or `DESC` | `DESC` |

The service consumes the canonical successful response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  },
  "message": "Users fetched successfully"
}
```

`getUsers(params)` returns a normalized object containing `data`,
`pagination`, and `message`, rather than returning only the `data` array.
Existing availability helpers that deliberately use the legacy unpaginated
mode will be updated to read the normalized `data` field. This prevents the
service from exposing two return types.

Known invalid parameter values result in backend `400 E_VALIDATION`. The FE
does not retry such requests and displays the backend-safe message through the
existing error path.

## Query-State Model

A focused `userDirectoryQuery` module owns:

- allowed page sizes;
- allowed sort keys and directions;
- parsing `URLSearchParams` into a sanitized query state;
- serializing query state into canonical URL parameters;
- converting component state into backend request parameters.

The component owns this canonical state:

```js
{
  currentPage: 1,
  entriesPerPage: 10,
  searchQuery: "",
  appliedFilters: {
    role: "",
    division: "",
    locationStatus: ""
  },
  sortBy: "created_at",
  sortOrder: "DESC"
}
```

Role and division values are stable IDs represented as strings in form state
and serialized as positive integer query values. Display labels come from
`getRoles()` and `getDivisions()` reference-data endpoints. The role options
must not be inferred from the currently loaded page.

Invalid or unsupported URL values fall back to defaults and are removed the
next time the URL is synchronized. Unknown URL parameters unrelated to this
page are preserved.

## Data Flow

1. On initialization, parse the URL before the first directory request.
2. Load role and division reference data independently. Failure to load either
   set disables only the affected filter control and does not block the table.
3. Request `getUsers()` with the complete canonical query.
4. Normalize only field names and display helpers for the returned page.
5. Assign the returned rows directly to `users` and the returned metadata to
   `pagination`.
6. Render `users` directly. There is no `filter()`, `slice()`, or second
   client-side page calculation.

The total-page count, showing range, next/previous availability, and numbered
page controls derive only from the server pagination metadata.

Changing page, page size, applied filters, or sort triggers exactly one new
server request. Page size, filters, and search reset the requested page to 1.

Search uses a 300 ms debounce. Empty or whitespace-only search removes the
parameter. Each list request receives a monotonically increasing request ID;
only the newest request may update rows, pagination, loading state, or errors.
This prevents a slower earlier search response from replacing newer results.

## URL and Browser Navigation

The URL uses the same canonical names as the API:

`page`, `limit`, `search`, `role`, `division`, `location_status`, `sortBy`, and
`sortOrder`.

Default values are omitted to keep links concise. Explicit interactions such
as pagination, page-size changes, filter application, reset, and sorting use
`history.pushState`. Debounced search uses `history.replaceState` so typing
does not create one browser-history entry per query. A `popstate` listener
re-parses the URL and fetches the corresponding server page without writing a
new history entry.

## Table and Filter Behavior

- The table loops over `users`, not a client-paginated getter.
- The existing `Pengguna` header sorts by `full_name`.
- The existing `NIP/NIM` header sorts by `nip_nim`.
- Selecting an inactive sortable header applies ascending order; selecting the
  active header toggles `ASC` and `DESC`.
- Sort controls expose an accessible label and `aria-sort` truthfully. Columns
  that the backend cannot sort remain non-interactive.
- The filter label `Divisi / Program` becomes `Divisi`, because the control
  sends only the `division` contract.
- Role and division option values are IDs; visible option text remains the
  reference-data label.
- WFH filter values are `configured` and `integrity_error`.

`location_status: "configured"` renders as `Tersedia`.
`location_status: "integrity_error"` renders as `Perlu diperbaiki` with a
visually distinct error treatment. It must never be collapsed into
`Belum diatur`. An unknown status renders a neutral `Status tidak diketahui`
rather than asserting readiness.

The empty state distinguishes:

- no directory data for the active query; and
- a normal out-of-range/empty server page.

Both are successful empty states, not errors.

## Mutation and Drawer Behavior

The detail drawer continues to fetch `GET /api/users/:id`; list projection data
must not be treated as full detail.

After a successful deletion, the component refetches the active server page.
If deletion makes the current page exceed the returned `totalPages`, it moves
to the last valid page and refetches once. An entirely empty directory remains
on page 1 with zero rows.

Create and edit navigation remain unchanged.

## Error Handling

- `400 E_VALIDATION`: show the server-safe validation message and retain the
  previous successful rows until a valid query is issued.
- `401` and `403`: preserve existing auth-aware service messages.
- Network and `5xx` failures: preserve the existing retryable error messaging.
- Empty `data`: render the empty table state without opening an error modal.
- Reference-data failure: warn and disable only that filter; table fetching
  continues.
- Stale request success or failure: ignore it completely.

Loading reflects only the newest in-flight request. Pagination and sort
controls are disabled while that request is active to avoid accidental request
storms.

## Testing Strategy

Implementation follows test-driven development.

1. Service contract tests verify query serialization, omission of empty
   optional values, normalized paginated output, and `E_VALIDATION` handling.
2. Query-state tests verify URL parsing, sanitization, canonical serialization,
   preservation of unrelated parameters, and default omission.
3. Alpine component tests verify:
   - the first request restores URL state;
   - search is server-driven and debounced;
   - filters send stable IDs and WFH status keys;
   - pagination renders server metadata without client slicing;
   - sorting sends only supported keys;
   - stale responses cannot overwrite current state;
   - empty pages are successful;
   - deletion recovers from a now-out-of-range page.
4. Template contract tests verify direct `users` iteration, truthful sortable
   headers, reference-data filter values, the Divisi label, and explicit
   integrity-error copy.
5. Run the complete repository test command and `npm run build`.
6. Runtime verification uses the healthy local backend on port 3005 with an
   authenticated admin session and a dataset spanning at least two pages.
   Build/test evidence and authenticated browser evidence are reported
   separately.

## Acceptance Criteria

- Every list request sends `page` and `limit`.
- Search covers the backend-defined name, email, and NIP/NIM semantics.
- Role, division, and WFH readiness are server-side filters.
- Pagination totals and ranges come exclusively from the response envelope.
- No client filtering or slicing is applied to the returned page.
- Supported table sorting is server-driven and visibly truthful.
- URL state survives refresh, back, forward, and link sharing.
- `integrity_error` is rendered as an actionable error state.
- Empty pages are not treated as failures.
- The drawer continues to use the detail endpoint.
- Targeted tests, the full test suite, and the production build pass before
  delivery claims are made.
