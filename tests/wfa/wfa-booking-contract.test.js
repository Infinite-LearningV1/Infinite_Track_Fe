import test from "node:test";
import assert from "node:assert/strict";

import {
  createBookingLocationDetail,
  extractBookingCollection,
  normalizeBooking,
  resolveBookingRadius,
} from "../../src/js/features/wfaBooking/bookingList.contract.js";

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
    isOther: false,
  });
  assert.deepEqual(booking.rejectionReason, {
    id: 8,
    label: "Policy mismatch",
    isOther: false,
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

test("booking detail includes request and rejection context", () => {
  const detail = createBookingLocationDetail({
    id: 42,
    employee_name: "Ayu",
    employee_id: "EMP-42",
    status: "rejected",
    schedule_date: "2026-08-10",
    location_name: "Client office",
    location_latitude: -0.9,
    location_longitude: 119.87,
    notes: "Project meeting",
    requestReason: { id: 1, label: "Client meeting" },
    requestOtherReason: "",
    rejectionReason: { id: 2, label: "Policy mismatch" },
    rejectionNote: "Outside policy",
    radiusSnapshot: 150,
    processed_at: "2026-08-01T10:00:00Z",
  });

  assert.equal(detail.requestReasonLabel, "Client meeting");
  assert.equal(detail.rejectionReasonLabel, "Policy mismatch");
  assert.equal(detail.radiusSnapshot, 150);
  assert.equal(detail.rejectionNote, "Outside policy");
  assert.equal(detail.processedAt, "2026-08-01T10:00:00Z");
});

test("legacy booking detail renders unavailable fields without invented values", () => {
  const detail = createBookingLocationDetail({
    id: 9,
    employee_name: "Legacy User",
    radiusSnapshot: null,
  });

  assert.equal(detail.requestReasonLabel, "");
  assert.equal(detail.rejectionReasonLabel, "");
  assert.equal(detail.radiusSnapshot, null);
  assert.equal(detail.radius, null);
});
