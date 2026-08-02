function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBookingReason(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const label = value.trim();
    return label ? { id: null, label } : null;
  }

  const label = String(value.label ?? value.reason_label ?? "").trim();
  if (!label) return null;

  return {
    id: toNullableNumber(value.id ?? value.reason_id),
    label,
  };
}

function resolveBookingRadius(booking = {}) {
  return toNullableNumber(
    firstPresent(
      booking.radius_snapshot,
      booking.radiusSnapshot,
      booking.location?.radius,
      booking.radius,
    ),
  );
}

function extractBookingCollection(response = {}) {
  const bookings = response.data?.bookings ?? response.bookings ?? [];
  const pagination = response.data?.pagination ?? response.pagination ?? {};

  if (!Array.isArray(bookings)) {
    throw new Error("Booking response must contain a bookings array.");
  }

  return { bookings, pagination };
}

function normalizeBooking(booking = {}) {
  const radiusSnapshot = resolveBookingRadius(booking);
  const requestReason = normalizeBookingReason(
    booking.request_reason ?? booking.requestReason,
  );
  const rejectionReason = normalizeBookingReason(
    booking.rejection_reason_detail ??
      booking.rejection_reason_data ??
      booking.rejectionReason ??
      (typeof booking.rejection_reason === "object"
        ? booking.rejection_reason
        : null),
  );

  return {
    id: booking.booking_id ?? booking.id ?? null,
    employee_name: booking.user_full_name ?? booking.employee_name ?? "",
    employee_id: booking.user_nip_nim ?? booking.employee_id ?? "",
    employee_email: booking.user_email ?? booking.employee_email ?? "",
    employee_position:
      booking.user_position_name ?? booking.employee_position ?? "",
    employee_role: booking.user_role_name ?? booking.employee_role ?? "",
    start_date: booking.schedule_date ?? booking.start_date ?? null,
    end_date: booking.schedule_date ?? booking.end_date ?? null,
    schedule_date: booking.schedule_date ?? null,
    status: booking.status ?? "",
    location_name: booking.location?.description ?? booking.location_name ?? "",
    location_latitude: toNullableNumber(
      booking.location?.latitude ?? booking.latitude,
    ),
    location_longitude: toNullableNumber(
      booking.location?.longitude ?? booking.longitude,
    ),
    location_radius: radiusSnapshot,
    notes: booking.notes ?? booking.note ?? "",
    created_at: booking.created_at ?? null,
    processed_at: booking.processed_at ?? null,
    approved_by: booking.approved_by ?? null,
    suitability_score: toNullableNumber(booking.suitability_score),
    suitability_label: booking.suitability_label ?? "",
    requestReason,
    requestOtherReason: String(
      booking.request_other_reason ?? booking.requestOtherReason ?? "",
    ).trim(),
    rejectionReason,
    rejectionNote: String(
      booking.rejection_note ?? booking.rejectionNote ?? "",
    ).trim(),
    radiusSnapshot,
    original: booking,
  };
}

function createBookingLocationDetail(booking = {}) {
  return {
    title: `Lokasi Booking - ${booking.employee_name || "Employee"}`,
    description: booking.location_name || booking.notes || "Lokasi booking WFA",
    latitude: booking.location_latitude,
    longitude: booking.location_longitude,
    radius: booking.radiusSnapshot ?? null,
    id: booking.id ?? null,
    employee_name: booking.employee_name ?? "",
    employee_id: booking.employee_id ?? "",
    status: booking.status ?? "",
    start_date: booking.start_date ?? null,
    end_date: booking.end_date ?? null,
    schedule_date: booking.schedule_date ?? null,
    location_name: booking.location_name ?? "",
    notes: booking.notes || "",
    requestReasonLabel: booking.requestReason?.label || "",
    requestOtherReason: booking.requestOtherReason || "",
    rejectionReasonLabel: booking.rejectionReason?.label || "",
    rejectionNote: booking.rejectionNote || "",
    radiusSnapshot: booking.radiusSnapshot ?? null,
    processedAt: booking.processed_at || null,
  };
}

export {
  createBookingLocationDetail,
  extractBookingCollection,
  normalizeBooking,
  normalizeBookingReason,
  resolveBookingRadius,
};
