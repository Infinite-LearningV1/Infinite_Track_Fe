import test from "node:test";
import assert from "node:assert/strict";

import {
  BOOKING_MANAGEMENT_PAGE_SIZES,
  BOOKING_MANAGEMENT_STATUSES,
  DEFAULT_BOOKING_MANAGEMENT_QUERY,
  toBookingManagementRequestParams,
  validateBookingManagementDateRange,
} from "../src/js/features/wfaBooking/bookingManagementDirectoryQuery.js";

test("exports the frozen canonical booking management defaults", () => {
  assert.deepEqual(BOOKING_MANAGEMENT_PAGE_SIZES, [10, 25, 50, 100]);
  assert.deepEqual(BOOKING_MANAGEMENT_STATUSES, [
    "pending",
    "approved",
    "rejected",
  ]);
  assert.deepEqual(DEFAULT_BOOKING_MANAGEMENT_QUERY, {
    page: 1,
    limit: 10,
    search: "",
    appliedFilters: { status: "", dateFrom: "", dateTo: "" },
  });
  assert.equal(Object.isFrozen(DEFAULT_BOOKING_MANAGEMENT_QUERY), true);
  assert.equal(
    Object.isFrozen(DEFAULT_BOOKING_MANAGEMENT_QUERY.appliedFilters),
    true,
  );
});

test("a booking management state can use a fresh nested appliedFilters object", () => {
  const state = {
    ...DEFAULT_BOOKING_MANAGEMENT_QUERY,
    appliedFilters: { ...DEFAULT_BOOKING_MANAGEMENT_QUERY.appliedFilters },
  };

  state.appliedFilters.status = "pending";

  assert.equal(DEFAULT_BOOKING_MANAGEMENT_QUERY.appliedFilters.status, "");
  assert.notEqual(
    state.appliedFilters,
    DEFAULT_BOOKING_MANAGEMENT_QUERY.appliedFilters,
  );
});

test("maps the canonical booking request without sort keys", () => {
  const params = toBookingManagementRequestParams({
    page: 2,
    limit: 25,
    search: " Andi ",
    appliedFilters: {
      status: "pending",
      dateFrom: "2026-08-11",
      dateTo: "2026-08-20",
    },
  });

  assert.deepEqual(params, {
    page: 2,
    limit: 25,
    search: "Andi",
    status: "pending",
    date_from: "2026-08-11",
    date_to: "2026-08-20",
  });
  assert.equal("sortBy" in params, false);
  assert.equal("sortOrder" in params, false);
});

test("maps every valid booking status", () => {
  for (const status of BOOKING_MANAGEMENT_STATUSES) {
    assert.deepEqual(
      toBookingManagementRequestParams({
        page: 1,
        limit: 10,
        search: "",
        appliedFilters: { status, dateFrom: "", dateTo: "" },
      }),
      { page: 1, limit: 10, status },
    );
  }
});

test("omits empty and unsupported booking filters", () => {
  assert.deepEqual(
    toBookingManagementRequestParams({
      ...DEFAULT_BOOKING_MANAGEMENT_QUERY,
      appliedFilters: { status: "other", dateFrom: "", dateTo: "" },
    }),
    { page: 1, limit: 10 },
  );
});

test("accepts empty and one-sided valid booking date ranges", () => {
  assert.deepEqual(validateBookingManagementDateRange(), {
    valid: true,
    message: "",
  });
  assert.deepEqual(
    validateBookingManagementDateRange({ dateFrom: "2026-08-11", dateTo: "" }),
    { valid: true, message: "" },
  );
  assert.deepEqual(
    validateBookingManagementDateRange({ dateFrom: "", dateTo: "2026-08-20" }),
    { valid: true, message: "" },
  );
});

test("rejects reversed and invalid date-only booking ranges", () => {
  assert.deepEqual(
    validateBookingManagementDateRange({
      dateFrom: "2026-08-20",
      dateTo: "2026-08-11",
    }),
    {
      valid: false,
      message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
    },
  );
  assert.deepEqual(
    validateBookingManagementDateRange({
      dateFrom: "2026-02-29",
      dateTo: "2026-03-01",
    }),
    { valid: false, message: "Format tanggal tidak valid." },
  );
  assert.deepEqual(
    validateBookingManagementDateRange({
      dateFrom: "2024-02-29",
      dateTo: "2026-03-01",
    }),
    { valid: true, message: "" },
  );
});

test("does not emit invalid date filters in booking requests", () => {
  assert.deepEqual(
    toBookingManagementRequestParams({
      page: 3,
      limit: 50,
      search: "  ",
      appliedFilters: {
        status: "approved",
        dateFrom: "2026-02-30",
        dateTo: "2026-03-01",
      },
    }),
    { page: 3, limit: 50, status: "approved" },
  );
});
