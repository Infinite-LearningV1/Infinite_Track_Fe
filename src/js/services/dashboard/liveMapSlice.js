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

  const locations = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.data)
        ? response.data.data
        : response === null || typeof response === "undefined"
          ? []
          : false;

  return {
    locations,
    authority: response?.authority || "attendance.today-locations",
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
