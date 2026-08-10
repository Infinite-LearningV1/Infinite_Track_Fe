import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { bookingListAlpineData } from "../src/js/features/wfaBooking/bookingList.js";

test("editing filter draft does not fetch until Apply", async () => {
  let calls = 0;
  const state = bookingListAlpineData({
    getBookings: async () => {
      calls += 1;
      return { data: { bookings: [], pagination: {} } };
    },
  });

  state.draftFilters.status = "pending";
  state.draftFilters.dateFrom = "2026-08-11";
  state.draftFilters.dateTo = "2026-08-20";
  assert.equal(calls, 0);
  await state.applyFilters();
  assert.equal(calls, 1);
  assert.equal(state.appliedQuery.page, 1);
  assert.equal(state.appliedQuery.appliedFilters.status, "pending");
});

test("invalid range blocks Apply and active count groups dates", async () => {
  let calls = 0;
  const state = bookingListAlpineData({
    getBookings: async () => {
      calls += 1;
      return { data: { bookings: [], pagination: {} } };
    },
  });
  state.draftFilters.dateFrom = "2026-08-20";
  state.draftFilters.dateTo = "2026-08-11";
  assert.equal(await state.applyFilters(), false);
  assert.equal(calls, 0);
  assert.match(state.filterValidationMessage, /Tanggal/);
  state.appliedQuery.appliedFilters = {
    status: "pending",
    dateFrom: "2026-08-11",
    dateTo: "",
  };
  assert.equal(state.activeFilterCount, 2);
});

test("clearFilters resets only booking filters and fetches once", async () => {
  let calls = 0;
  const state = bookingListAlpineData({
    getBookings: async () => {
      calls += 1;
      return { data: { bookings: [], pagination: {} } };
    },
  });
  state.appliedQuery.search = "Andi";
  state.appliedQuery.page = 4;
  state.draftFilters.status = "rejected";
  await state.clearFilters();
  assert.equal(calls, 1);
  assert.equal(state.appliedQuery.search, "Andi");
  assert.equal(state.appliedQuery.page, 1);
  assert.deepEqual(state.appliedQuery.appliedFilters, {
    status: "",
    dateFrom: "",
    dateTo: "",
  });
});

test("booking filter partial and page expose the combined toolbar contract", () => {
  const partial = fs.readFileSync(
    "src/partials/table/booking-table-filter.html",
    "utf8",
  );
  const page = fs.readFileSync("src/management-booking.html", "utf8");
  for (const token of [
    ':aria-expanded="isFilterOpen"',
    'aria-controls="bookingTableFilterPopover"',
    '@click.outside="closeFilter()"',
    '@keydown.escape.window="closeFilter()"',
    'x-model="draftFilters.status"',
    'x-model="draftFilters.dateFrom"',
    'x-model="draftFilters.dateTo"',
    '@click="applyFilters()"',
    '@click="clearFilters()"',
    "activeFilterCount",
  ])
    assert.match(
      partial,
      new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  assert.match(page, /Cari nama atau NIP\/NIM\.\.\./);
  assert.doesNotMatch(page, /x-model=\"statusFilter\"/);
});
