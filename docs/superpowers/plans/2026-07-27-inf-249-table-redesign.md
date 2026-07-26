# INF-249 Management Pengguna Table Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Management Pengguna table to the locked INF-248 column contract, in the owner-approved TailAdmin "Table Four" visual style, with a Filter popover.

**Architecture:** Template-only restructure of `table-user.html` plus view-model additions in `userListSimple.js` (division, createdAt, filter state). Filtering is client-side over the already-loaded user list. The Detail Pengguna drawer, its lifecycle, and the WFH status logic from INF-247 are reused unchanged.

**Tech Stack:** Alpine.js 3, Tailwind CSS 4, existing `getDivisions()` service, Node built-in test runner, Prettier.

**Base:** stacked on `fix/inf-247-wfh-detail-drawer-hardening` @ `71eadde`.

## Global Constraints

- Test command: `node --test "tests/**/*.test.js"` (bare `tests/` fails on Node 24).
- Current state: **249 tests / 229 pass / 20 fail**. Gate: new tests pass, failure count stays exactly **20**, no new failure names. Existing branch tests that assert current table structure MUST be updated in the same commit as the structural change, never deleted.
- `npm run build` must pass. `npm run lint` is repo-wide red (pre-existing); only prettier-format the files you touch.
- Copy is Indonesian. WFH status strings exactly `Tersedia` / `Belum diatur`. Never "live"/"current"/"terkini"/"saat ini" for WFH data.
- Never invent data: division and Dibuat render `-` when the backend omits them. No fabricated defaults.
- Reuse existing design tokens (`brand-500`, `text-theme-xs/sm`, `shadow-theme-xs`, success/warning/gray palettes, dark-mode variants) — no parallel component system.
- Do not touch the drawer partial, the lifecycle module, `focusTrap.js`, `mapDetailModal.js`, or forbidden files (`wfaBooking/bookingList.js`, `map-detail-modal.html`, `dashboard.js`, `attendanceLog.js`).
- Status conveyed by text, not colour alone. Icon-only controls keep accessible labels.
- The known merge-order conflict is recorded, not resolved here: the unmerged INF-112 branch adds `tests/user-table-position-binding.test.js`, which asserts a standalone Position cell that this redesign removes. Whichever branch merges second must retarget that test (per the note already in the INF-112 spec).

## Approved column contract (INF-248, with owner's example applied)

```text
1. [checkbox] + User ID     (combined in one cell, per owner's example)
2. Pengguna                 avatar/initials + full name, email secondary
3. NIP/NIM
4. Akses                    role badge
5. Organisasi               position primary, division secondary ('-' fallback)
6. Lokasi WFH               status badge, text-carried (existing wfhStatusFor)
7. Dibuat                   created date ('-' fallback)
8. Aksi                     Detail (drawer) / Edit / Delete icons, labelled
```

Deviation from INF-248 recorded: the literal contract lists `[checkbox]` alone; the owner's
example combines checkbox with the row ID in one cell, and the owner's example governs.
Checkbox is per-row visual selection state only (no bulk action exists yet) — matching the
owner's example, which keeps `checked` as row-local Alpine state.

Toolbar (card header, per example): title + search (existing binding `searchQuery`) +
`Filter` button. `Tambah User` and the entries selector remain functional and keep their
existing bindings.

## Filter popover contract (INF-248)

Anchored floating popover under the Filter button with:

- Role (`filterRole`) — options derived from loaded users' roles.
- Divisi / Program (`filterDivision`) — options from `getDivisions()`; select disabled with
  a `-` option when the service returns nothing.
- Status Lokasi WFH (`filterWfhStatus`) — `Semua` / `Tersedia` / `Belum diatur`, evaluated
  via the existing `wfhStatusFor(user)`.
- Primary `Apply` button; `Reset` secondary.

Accessibility: button carries `aria-expanded` + `aria-controls`; popover closes on Escape and
outside click; controls are labelled; keyboard reachable.

Filtering composes with the existing `searchQuery` filter and resets `currentPage` to 1 on
apply.

### Task 1: View-model additions (division, createdAt, filter state)

**Files:** Modify `src/js/features/userManagement/userListSimple.js`; Create `tests/user-list-filter-state.test.js`

- Row mapping gains `division: user.division_name || user.division || null` and
  `createdAt: user.created_at || user.createdAt || null` — no invented values.
- `formattedCreatedAt(user)` helper using the existing `formatDate` util; returns `-` for null.
- Filter state (`filterRole`, `filterDivision`, `filterWfhStatus`, `isFilterOpen`,
  `appliedFilters`) + `applyFilters()` / `resetFilters()` + `filteredUsers` extended to apply
  role/division/status predicates after search. `availableRoles` computed from loaded users;
  `availableDivisions` loaded via `getDivisions()` with failure tolerated (empty list).
- TDD: unit-test the predicate logic by calling the Alpine data factory directly (it is a
  plain function) with stubbed users; source-assert no invented defaults.

### Task 2: Table restructure to the approved contract

**Files:** Modify `src/partials/table/table-user.html`; Modify `tests/user-table-wfh-status-column.test.js`; Create `tests/user-table-structure.test.js`

- Rebuild header + row template to the 8-column contract above, TailAdmin Table Four classes
  (`text-theme-xs` headers, `px-6 py-3`, `divide-y`, rounded-2xl card, header row with title,
  search, Filter button slot).
- Keep: `x-for` keying, avatar initials/colors, `wfhStatusFor` badge (text-carried), Detail
  button with `:aria-label` and `openUserDetailDrawer(user)`, Edit link, Delete button,
  pagination block, empty state (`colspan` stays 8).
- Email moves into the Pengguna cell (secondary line); standalone Email, Position, and Phone
  Number columns are removed. Role stays visible as the `Akses` badge.
- Update `tests/user-table-wfh-status-column.test.js` expectations that reference removed
  structure; add `tests/user-table-structure.test.js` asserting the new header set, the
  `-` fallbacks for Organisasi/Dibuat, and the absence of raw coordinates.

### Task 3: Filter button + popover

**Files:** Modify `src/partials/table/table-user.html` (header slot), `src/js/features/userManagement/userListSimple.js` (wiring only if gaps found); Create `tests/user-table-filter-popover.test.js`

- Filter button (owner's example markup, funnel icon) with `aria-expanded`/`aria-controls`;
  popover `x-show` panel anchored right, `@click.outside` + `@keydown.escape.window` close,
  labelled selects for Role / Divisi / Status Lokasi WFH, `Apply` (primary, `brand-500`) and
  `Reset`.
- Template tests: aria wiring, both close paths, labelled controls, Apply calls
  `applyFilters()`.

### Task 4: Verification

- Full suite gate (20 failures, no new names), `npm run build`, prettier on touched files.
- Browser: columns render with real data; users without division/created data show `-`;
  filter narrows rows and composes with search; drawer still opens from Detail; reopen ×10
  console-clean (also closes the INF-247 runtime evidence gap).
