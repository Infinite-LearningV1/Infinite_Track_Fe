export function buildHistoricalAnalyticsViewModel(response) {
  const data =
    response?.data &&
    typeof response.data === "object" &&
    !Array.isArray(response.data)
      ? response.data
      : {};

  return {
    kpis: data.executive_kpis || {},
    trend: data.historical_trend || { points: [] },
    modeMix: data.mode_mix || { totals: {}, percentages: {} },
    insights: data.insights || { items: [] },
    windowMeta: {
      requestedWindow: response?.requested_window || null,
      executedWindow: response?.executed_window || null,
    },
  };
}

export function createHistoricalAnalyticsSliceState(response, request = null) {
  return {
    request,
    response,
    viewModel: buildHistoricalAnalyticsViewModel(response),
  };
}
