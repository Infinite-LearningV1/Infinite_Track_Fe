export function buildLiveMapViewModel(response) {
  const sliceViewModel = response?.viewModel;

  if (
    sliceViewModel &&
    typeof sliceViewModel === "object" &&
    Array.isArray(sliceViewModel.locations)
  ) {
    return {
      locations: sliceViewModel.locations,
      authority:
        sliceViewModel.authority ||
        response?.authority ||
        "attendance.today-locations",
    };
  }

  const data = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

  return {
    locations: data,
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
