export function buildGeofenceEvidenceViewModel(response) {
  const data = response?.data || {};

  return {
    status: data.status || "empty",
    rawCounts:
      data.raw_counts || {
        total_events: 0,
        enter_events: 0,
        exit_events: 0,
        unique_users: 0,
      },
    authority: data.authority || null,
    finalAttendanceAuthority: data.final_attendance_authority || null,
    reason: data.reason || null,
    needsData: Boolean(data.needs_data),
    window: response?.executed_window || null,
  };
}

export function createGeofenceEvidenceSliceState(response, request = null) {
  return {
    request,
    response,
    viewModel: buildGeofenceEvidenceViewModel(response),
  };
}
