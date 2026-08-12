import test from "node:test";
import assert from "node:assert/strict";

import {
  extractBookingCollection,
  normalizeBooking,
} from "../src/js/features/wfaBooking/bookingList.contract.js";

const backendRow = {
  booking_id: 42,
  user_full_name: "Andi Saputra",
  user_nip_nim: "EMP-007",
  user_email: "andi@example.com",
  user_position_name: "Backend Engineer",
  user_role_name: "Employee",
  user_photo: "https://cdn.example.com/users/42/profile.jpg",
  user_photo_updated_at: "2026-08-11T03:00:00.000Z",
  schedule_date: "2026-08-12",
  created_at: "2026-08-10T02:00:00.000Z",
  status: "pending",
  request_reason: {
    id: 3,
    label: "Meeting klien",
    is_other: false,
    other_text: null,
  },
  rejection_reason: null,
  processed_by: null,
  suitability_score: 0,
  suitability_label: "Tidak Direkomendasikan",
};

test("normalizes canonical INF-274 nested fields and preserves zero", () => {
  const normalized = normalizeBooking(backendRow);

  assert.equal(normalized.requestOtherReason, "");
  assert.deepEqual(normalized.requestReason, {
    id: 3,
    label: "Meeting klien",
    isOther: false,
  });
  assert.equal(normalized.processedBy, null);
  assert.equal(normalized.suitability_score, 0);
  assert.equal(normalized.employee_photo, backendRow.user_photo);
  assert.equal(
    normalized.employee_photo_updated_at,
    backendRow.user_photo_updated_at,
  );
  assert.equal(normalized.employee_avatar.photoUrl, backendRow.user_photo);
});


test("normalizes missing booking applicant photo to initials fallback", () => {
  const normalized = normalizeBooking({
    ...backendRow,
    user_photo: null,
    user_photo_updated_at: null,
  });

  assert.equal(normalized.employee_photo, null);
  assert.equal(normalized.employee_photo_updated_at, null);
  assert.equal(normalized.employee_avatar.photoUrl, null);
  assert.equal(normalized.employee_avatar.initials, "AS");
});


test("normalizes rejection note and processed_by actor with canonical precedence", () => {
  const normalized = normalizeBooking({
    ...backendRow,
    request_reason: {
      id: 1,
      label: "Other",
      is_other: true,
      other_text: "Client visit",
    },
    request_other_reason: "legacy other",
    rejection_reason: {
      id: 8,
      label: "Outside policy",
      is_other: false,
      note: "Backend note",
    },
    rejection_note: "legacy note",
    processed_by: { id: 7, full_name: "Admin One", role: "HR" },
  });

  assert.equal(normalized.requestOtherReason, "Client visit");
  assert.deepEqual(normalized.rejectionReason, {
    id: 8,
    label: "Outside policy",
    isOther: false,
  });
  assert.equal(normalized.rejectionNote, "Backend note");
  assert.deepEqual(normalized.processedBy, {
    id: 7,
    fullName: "Admin One",
    role: "HR",
  });
});

test("keeps legacy reason, note, and radius fallbacks", () => {
  const normalized = normalizeBooking({
    booking_id: 9,
    request_other_reason: "Legacy other",
    rejection_note: "Legacy note",
    location: { radius: 90 },
    radius: 80,
  });

  assert.equal(normalized.requestOtherReason, "Legacy other");
  assert.equal(normalized.rejectionNote, "Legacy note");
  assert.equal(normalized.radiusSnapshot, 90);
});

test("preserves INF-274 records_per_page in extracted pagination", () => {
  const result = extractBookingCollection({
    data: {
      bookings: [backendRow],
      pagination: {
        current_page: 2,
        total_pages: 4,
        total_records: 31,
        records_per_page: 10,
        has_next_page: true,
        has_prev_page: true,
      },
    },
  });

  assert.equal(result.pagination.records_per_page, 10);
  assert.equal(result.pagination.total_records, 31);
});
