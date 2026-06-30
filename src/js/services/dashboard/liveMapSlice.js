export function buildLiveMapViewModel(response) {
  const locations = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.data?.data)
      ? response.data.data
      : Array.isArray(response)
        ? response
        : [];

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
