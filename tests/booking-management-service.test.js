import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBookingsListUrl,
  createBookingServiceError,
} from "../src/js/services/bookingService.js";

test("serializes INF-274 management query and omits legacy sort", () => {
  const url = buildBookingsListUrl("/api", {
    page: 2,
    limit: 25,
    search: "Andi",
    status: "pending",
    date_from: "2026-08-11",
    date_to: "2026-08-20",
    sortBy: "schedule_date",
    sortOrder: "ASC",
  });

  assert.equal(
    url,
    "/api/bookings?page=2&limit=25&search=Andi&status=pending&date_from=2026-08-11&date_to=2026-08-20",
  );
});

test("omits empty, null, and undefined list query values", () => {
  assert.equal(
    buildBookingsListUrl("/api", {
      page: 1,
      limit: 10,
      search: "",
      status: null,
      date_from: undefined,
      date_to: "",
    }),
    "/api/bookings?page=1&limit=10",
  );
});

test("preserves Backend error metadata", () => {
  const error = createBookingServiceError(
    {
      response: {
        status: 422,
        data: {
          message: "Validation failed",
          code: "BOOKING_INVALID",
          details: { field: "status" },
          field_errors: { status: ["Unsupported"] },
        },
      },
    },
    "fallback",
  );

  assert.equal(error.message, "Validation failed");
  assert.equal(error.code, "BOOKING_INVALID");
  assert.equal(error.status, 422);
  assert.deepEqual(error.details, { field: "status" });
  assert.deepEqual(error.fieldErrors, { status: ["Unsupported"] });
});
