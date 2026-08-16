export function buildLiveMapViewModel(response) {
  const sliceViewModel = response?.viewModel;

  if (sliceViewModel && typeof sliceViewModel === "object") {
    return {
      locations: Array.isArray(sliceViewModel.locations)
        ? sliceViewModel.locations
        : false,
      authority:
        sliceViewModel.authority ||
        response?.authority ||
        "attendance.today-locations",
    };
  }

  const payload = response?.data;
  const locations = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.locations)
      ? payload.locations
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(response)
          ? response
          : response === null || typeof response === "undefined"
            ? []
            : false;

  return {
    locations,
    authority:
      payload?.authority || response?.authority || "attendance.today-locations",
    finalAttendanceAuthority:
      payload?.final_attendance_authority ||
      response?.final_attendance_authority ||
      null,
    snapshotType: payload?.snapshot_type || null,
    date: payload?.date || null,
    timezone: payload?.timezone || null,
    totalUsers:
      typeof payload?.total_users === "number" ? payload.total_users : null,
    truncated: payload?.truncated === true,
  };
}

export function createLiveMapSliceState(response, request = null) {
  const viewModel = buildLiveMapViewModel(response);

  return {
    request,
    response,
    viewModel,
    authority: viewModel.authority,
  };
}
