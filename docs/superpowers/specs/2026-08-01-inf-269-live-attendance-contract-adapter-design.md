# INF-269 Live Attendance Contract Adapter Design

Date: 2026-08-01

## Context

The live `infinit-track-app` container now exposes the INF-267 Management Attendance list, filters, detail endpoint, and authoritative sorting allowlist. The Web FE implementation was built against an earlier flat fixture and must be aligned to the live nested response without changing the Backend.

The Backend intentionally does not return a list-row `checkout_state`. It remains authoritative for filtering `checkout_state=open|completed`, while the Web FE derives the presentation state from the returned `time_out` value.

This amendment is Web FE only. It preserves the isolated `feature/inf-269-attendance-audit-explorer` worktree and the existing uncommitted Task 7 detail-request work.

## Considered approaches

### 1. Strict live-contract adapter — selected

Normalize only the current nested list/detail contract. Missing or malformed evidence becomes an unknown/empty UI value instead of falling back to the obsolete flat response.

This makes contract drift visible, keeps one source of truth, and matches the live container.

### 2. Dual old/new response compatibility

Accept both the obsolete flat fixture and the live nested response. This eases transitional deployments but can hide a rollback or partial Backend deployment and doubles the mapping surface.

Rejected because the user confirmed that the new Backend contract is loaded in the local container.

### 3. Infer display fields directly in templates

Bind Alpine templates to nested Backend properties and derive checkout/location state inline. This avoids an adapter but spreads contract knowledge through templates and makes testing and future migration harder.

Rejected because the existing canonical camel-case row/detail state is the correct normalization boundary.

## List response mapping

`normalizeAttendanceListRow()` maps one live Backend row into canonical FE state:

| Backend                | Web FE                 |
| ---------------------- | ---------------------- |
| `id_attendance`        | `idAttendance`         |
| `user.id`              | `employeeId`           |
| `user.full_name`       | `fullName`             |
| `user.nip_nim`         | `nipNim`               |
| `user.role`            | `roleName`             |
| `attendance_date`      | `attendanceDate`       |
| `time_in`              | `timeIn`               |
| `time_out`             | `timeOut`              |
| `work_duration`        | `workHour`             |
| `mode.key`             | `mode`                 |
| `mode.label`           | `modeLabel`            |
| `status.key`           | `status`               |
| `status.label`         | `statusLabel`          |
| `location.available`   | `location.available`   |
| `location.id`          | `location.id`          |
| `location.description` | `location.description` |

The list adapter must not invent coordinates. List location truth comes from `location.available` and `location.description`; coordinates remain detail-only evidence.

### Checkout derivation

- `time_out === null` maps to `checkoutState: "open"`.
- A non-empty time string maps to `checkoutState: "completed"`.
- Missing, `undefined`, empty, or non-string `time_out` maps to `checkoutState: ""`.

This is presentation derivation only. Filter requests continue to send the Backend-owned `checkout_state` query parameter.

## Detail response mapping

`GET /api/attendance/:id` returns an envelope whose authoritative detail is in `response.data`. The detail adapter consumes the nested live contract:

- employee data from `data.user`, including `role` and `email`;
- `work_duration`, `mode.key/label`, and `status.key/label`;
- notes and booking ID directly from detail data;
- coordinates, radius, and description only from `data.location`.

The service/error boundary continues preserving Backend message, status, and code. A missing detail returns the existing truthful unavailable state and refreshes the active list once. Stale detail success or failure cannot replace the current selection.

## Table behavior

- Employee, mode, and status presentation uses canonical keys for behavior and Backend labels for display when present.
- The location badge uses `location.available`; it displays the Backend description when available and never exposes or fabricates coordinates from the slim list.
- Alpha rows retain their explicit Alpha presentation even when automated records contain equal check-in/check-out times.
- Open checkout text appears only when the derived state is exactly `open`; unknown does not masquerade as open.

## Sorting

The live Backend allowlist is now authoritative:

`attendance_date`, `time_in`, `time_out`, `full_name`, `status`, `created_at`.

The current table exposes only unambiguous header mappings:

- `Pegawai` → `full_name`
- `Tanggal` → `attendance_date`
- `Kehadiran` → `time_in`
- `Status` → `status`

`Mode`, `Lokasi`, and `Aksi` remain static. `time_out` and `created_at` stay valid request keys but receive no misleading table affordance because there is no dedicated header for them.

Sort state is server-driven and URL-backed. A header cycles default → ascending → descending → default. Changing sort resets page to 1, writes one history entry, and fetches once. The browser never reorders rows. `aria-sort` and the visible icon reflect the applied server query.

## Error and validation behavior

- Unknown response shapes normalize to empty/unknown values rather than old-contract fallbacks.
- Backend `400 E_VALIDATION` remains visible through the existing list/detail error state.
- Existing retained-row behavior remains: a refresh error does not erase the last successful page.
- Unsupported sort keys from a pasted URL are discarded before a request.

## Testing

TDD coverage must prove:

1. Exact normalization of the supplied live list response.
2. Checkout derivation for `null`, valid time, missing, empty, and malformed values.
3. Location availability/description without list coordinates.
4. Exact nested detail-envelope normalization and no fabricated evidence.
5. Query parse/serialize/request behavior for the Backend allowlist and invalid sort values.
6. Sort history, page reset, one-fetch behavior, stale-request protection, and Backend order preservation.
7. Table bindings, accessible sort state, static unsupported headers, and truthful badges.
8. Existing Attendance regression suite, production build, and authenticated runtime against the live container.

## Scope boundaries

- No Backend changes.
- No client-side filtering, sorting, pagination, or total calculation.
- No compatibility adapter for the obsolete flat response.
- No inferred list coordinates or fabricated detail data.
- No deletion-contract change.
