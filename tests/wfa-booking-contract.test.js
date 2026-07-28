import test from "node:test";
import assert from "node:assert/strict";

import {
  extractBookingCollection,
  normalizeBooking,
  resolveBookingRadius,
} from "../src/js/features/wfaBooking/bookingList.contract.js";

test("extracts canonical booking collection and pagination", () => {
  assert.deepEqual(
    extractBookingCollection({
      data: {
        bookings: [{ booking_id: 1 }],
        pagination: { current_page: 2 },
      },
    }),
    {
      bookings: [{ booking_id: 1 }],
      pagination: { current_page: 2 },
    },
  );
});

test("normalizes request, rejection, and radius snapshot metadata", () => {
  const booking = normalizeBooking({
    booking_id: 42,
    user_full_name: "Ayu",
    user_nip_nim: "EMP-42",
    schedule_date: "2026-08-10",
    status: "rejected",
    request_reason: { id: 5, label: "Client meeting" },
    request_other_reason: "",
    rejection_reason: { id: 8, label: "Policy mismatch" },
    rejection_note: "Location is not eligible",
    radius_snapshot: 150,
    location: {
      description: "Client office",
      latitude: -0.9,
      longitude: 119.87,
      radius: 100,
    },
  });

  assert.deepEqual(booking.requestReason, {
    id: 5,
    label: "Client meeting",
  });
  assert.deepEqual(booking.rejectionReason, {
    id: 8,
    label: "Policy mismatch",
  });
  assert.equal(booking.rejectionNote, "Location is not eligible");
  assert.equal(booking.radiusSnapshot, 150);
  assert.equal(booking.location_radius, 150);
});

test("radius precedence is snapshot, legacy location, legacy root, then null", () => {
  assert.equal(
    resolveBookingRadius({
      radius_snapshot: 125,
      location: { radius: 100 },
    }),
    125,
  );
  assert.equal(resolveBookingRadius({ location: { radius: 90 } }), 90);
  assert.equal(resolveBookingRadius({ radius: 80 }), 80);
  assert.equal(resolveBookingRadius({}), null);
});

test("missing reason metadata remains null-safe", () => {
  const booking = normalizeBooking({ booking_id: 1, status: "pending" });
  assert.equal(booking.requestReason, null);
  assert.equal(booking.rejectionReason, null);
  assert.equal(booking.radiusSnapshot, null);
});

test("zero coordinates and radius stay valid Backend values", () => {
  const booking = normalizeBooking({
    booking_id: 3,
    latitude: 0,
    longitude: 0,
    radius_snapshot: 0,
  });

  assert.equal(booking.location_latitude, 0);
  assert.equal(booking.location_longitude, 0);
  assert.equal(booking.radiusSnapshot, 0);
});
