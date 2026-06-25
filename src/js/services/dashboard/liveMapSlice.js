export function buildLiveMapViewModel(response) {
  const data = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

  return {
    locations: data,
    authority: "attendance.today-locations",
  };
}

export function createLiveMapSliceState(response, request = null) {
  return {
    request,
    response,
    viewModel: buildLiveMapViewModel(response),
  };
}
