export function buildHistoricalAnalyticsViewModel(response) {
  const payload =
    response?.data && typeof response.data === "object" && !Array.isArray(response.data)
      ? response.data
      : response;
  const data = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};

  const trend = data.historical_trend || data.historicalTrend || null;
  const modeMix = data.mode_mix || data.modeMix || null;

  return {
    kpis: data.executive_kpis || data.executiveKpis || {},
    trend,
    modeMix,
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
