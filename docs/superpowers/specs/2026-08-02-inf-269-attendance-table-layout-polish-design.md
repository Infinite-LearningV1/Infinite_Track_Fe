# INF-269 Attendance Table Layout Polish Design

Date: 2026-08-02

Status: Approved in conversation; pending written-spec review

## Goal

Polish the Management Attendance audit table without changing its Backend contract or server-driven state model. The page must present its toolbar, table states, rows, and pagination as one coherent frame; expose explicit row actions; and make date, work-duration, and location evidence easier to read.

## Scope

This change is Web FE-only and remains inside the existing isolated `feature/inf-269-attendance-audit-explorer` branch.

In scope:

- unify Attendance search, filter, table states, table, empty state, and pagination in one visual container;
- replace the action overflow menu and row-click shortcut with explicit Detail and Delete icon buttons;
- format `attendance_date` with its Indonesian weekday;
- show time-in/time-out and total work duration in the Attendance column;
- render location as clamped plain text with access to the complete value;
- add focused behavior and built-artifact tests.

Out of scope:

- Backend changes;
- API request, filter, sort, search, pagination, detail, or delete semantics;
- shared refactoring of the Management User table;
- changes to Mode or Status categorization;
- authenticated destructive runtime deletion.

## Chosen Approach

Extend the existing Attendance component instead of introducing a cross-feature shared table abstraction. `table-attendance.html` becomes the owner of the complete Attendance frame, while feature-owned pure presentation helpers format dates and durations.

This preserves the current server-driven state machine and avoids coupling Attendance behavior to Management User internals. Management User remains a visual reference only for its explicit action buttons.

## Layout and Container Contract

Management Attendance will expose one primary card/frame containing, in order:

1. search and filter toolbar;
2. initial-loading, refresh-loading, and error feedback;
3. the seven-column Attendance table and empty state;
4. pagination and page-size controls.

The separate search/filter card in `management-attendance.html` will be removed. The toolbar markup and `attendance-table-filter.html` include will move into the Attendance table component.

The frame uses the established Attendance table styling: one `rounded-2xl` border, one background, and no stacked card shadow. Initial loading and initial error states remain inside this same frame so the page does not jump between unrelated containers.

The table keeps horizontal scrolling for narrow screens. This design does not introduce frozen columns or a new responsive table layout.

## Action Contract

The Aksi column will contain two always-visible icon buttons, following the visual language of Management User:

- a blue eye button for **Lihat Detail**;
- a red trash button for **Hapus**.

Both controls use `type="button"`, an accessible `aria-label`, a browser tooltip through `title`, focus-ring styling, dark-mode variants, and appropriate disabled/loading behavior.

The row-level click, Enter, and Space handlers that currently open detail will be removed. Detail opens only through the eye button. This makes row behavior explicit and prevents accidental detail navigation when users select text or operate another control.

Delete continues to call the existing canonical `confirmDelete(log)` flow. No local row removal or alternate delete contract will be introduced.

## Attendance Data Presentation

### Date

The Backend date-only value `YYYY-MM-DD` will be rendered in Indonesian as one line:

```text
Kamis, 23 Juli 2026
```

A feature-owned pure helper will parse the date-only components without allowing the host timezone to shift the calendar date. Invalid or unavailable values render `-`.

### Attendance Time and Duration

The Kehadiran cell uses two lines:

```text
08:00 - 18:15
10j 15m
```

Rules:

- the first line uses the existing truthful checkout presentation: open checkout may show `Belum checkout`, completed checkout shows the returned time, and unknown evidence remains neutral;
- Backend `work_duration` in `HH:mm` form is formatted as compact Indonesian duration text;
- `10:15` becomes `10j 15m`;
- `10:00` becomes `10j`;
- `00:15` becomes `15m`;
- `00:00` becomes `0m`;
- missing, malformed, or unsupported values become `Durasi tidak tersedia`;
- the open-checkout annotation remains driven only by exact `checkoutState === "open"` evidence.

The current Alpha-only branch in the Kehadiran cell will be removed. Status is already represented authoritatively in the Status column; the Attendance column will consistently show the Backend time and duration evidence for every row.

### Location

Location will render as plain text, without a badge container, status dot, pill background, or availability color.

The visible value remains derived from the canonical list contract:

- available with description: render the description;
- available without description: render `Lokasi tersedia`;
- unavailable: render `Lokasi tidak tersedia`.

The text is constrained to a practical table-column width and `line-clamp-2`. The same complete display value is bound to `title`, allowing pointer users to inspect the untruncated text. The cell must not depend on latitude or longitude and must not initialize a map.

### Mode and Status

Mode and Status retain their existing categorical badges, Backend-first labels, and key-driven badge classes. They are not part of the location badge removal.

## Component Boundaries

- `src/management-attendance.html` continues to compose the page shell and Attendance detail drawer, but no longer owns the separate toolbar card.
- `src/partials/table/table-attendance.html` owns the single frame, toolbar, table states, rows, and pagination.
- `src/partials/table/attendance-table-filter.html` remains the feature-owned filter popover and moves with its include into the table frame.
- A small feature-owned presentation module or the existing Attendance row presentation module owns pure date and duration formatting. Alpine exposes these helpers to the template without changing server state.
- Existing query, service, drawer, map, and permanent-delete modules remain authoritative for their current behavior.

## Loading and Error Behavior

The existing truthfulness rules remain intact:

- initial loading displays within the unified frame;
- an initial request failure displays its retry action within the same frame;
- refresh loading keeps the last successful rows visible;
- refresh failure keeps the last successful rows visible and exposes retry;
- empty state remains table-owned;
- action buttons do not bypass current detail/delete loading guards.

No error state will be hidden merely to achieve the one-frame layout.

## Test Strategy

Test-driven implementation will add or update coverage for:

1. exactly one primary Attendance frame containing the toolbar, table states, table, and pagination;
2. search and filter bindings surviving the move into the table component;
3. Detail and Delete buttons invoking their canonical actions with propagation stopped;
4. absence of row-level detail click and keyboard shortcuts;
5. Indonesian weekday/date formatting, including invalid date-only input;
6. work-duration formatting for hours-plus-minutes, hours-only, minutes-only, zero, missing, and malformed values;
7. truthful open, completed, and unknown checkout presentation remaining intact;
8. Alpha rows using the same time-and-duration layout rather than a presentation-only exception;
9. location rendered without badge styling, constrained to two lines, and exposing its full display value through `title`;
10. the built `management-attendance.html` artifact matching the action, formatting, location, and one-frame contracts.

The verification gate is:

- all `attendance-*.test.js` tests;
- production build;
- `git diff --check`;
- focused independent code review;
- runtime verification from the isolated worktree where authentication permits.

The repository's known non-Attendance full-suite failures remain a separately reported baseline and must not be presented as new INF-269 regressions.

## Acceptance Criteria

- Management Attendance visibly uses one frame for toolbar, table states, table, and pagination.
- Aksi exposes separate eye and trash buttons and no overflow menu.
- Rows no longer act as hidden detail buttons.
- Dates render like `Kamis, 23 Juli 2026` on one line.
- Kehadiran shows time range on the first line and compact total duration on the second.
- Location is plain two-line-clamped text with the full display value available through `title`.
- Mode and Status badges remain unchanged in purpose.
- Existing server-driven query, Backend ordering, detail, map ownership, and delete recovery contracts remain unchanged.
- Attendance tests and production build pass with no new full-suite failure beyond the established baseline.
