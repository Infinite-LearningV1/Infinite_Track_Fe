export function buildGeofenceEvidenceViewModel(response) {
  const data = response?.data || {};
  const operationalContext = data.operational_context || {};
  const window = data.window || response?.executed_window || null;

  return {
    status: data.status || "empty",
    needsData: Boolean(data.needs_data),
    reason: data.reason || null,
    authority: data.authority || null,
    finalAttendanceAuthority: data.final_attendance_authority || null,
    window,
    rawCounts: {
      total_events: data.raw_counts?.total_events || 0,
      enter_events: data.raw_counts?.enter_events || 0,
      exit_events: data.raw_counts?.exit_events || 0,
      unique_users: data.raw_counts?.unique_users || 0,
    },
    operationalContext: {
      activity_label: operationalContext.activity_label || null,
      activity_note: operationalContext.activity_note || null,
      enter_context: operationalContext.enter_context || null,
      exit_context: operationalContext.exit_context || null,
      dashboard_note: operationalContext.dashboard_note || null,
    },
  };
}

export function createGeofenceEvidenceSliceState(response, request = null) {
  return {
    request,
    response,
    viewModel: buildGeofenceEvidenceViewModel(response),
  };
}
