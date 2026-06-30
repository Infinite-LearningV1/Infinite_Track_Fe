function isValidCriteriaWeight(entry) {
  return (
    entry &&
    typeof entry.key === "string" &&
    typeof entry.label === "string" &&
    typeof entry.display_label === "string" &&
    typeof entry.value === "number" &&
    Number.isFinite(entry.value)
  );
}

export function buildFahpDashboardRecapViewModel(response) {
  const data = response?.data || {};

  return {
    type: data.type || null,
    typeLabel: data.type_label || null,
    generatedAt: data.generated_at || null,
    timezone: data.timezone || null,
    requestedWindow: data.requested_window || null,
    executedWindow: data.executed_window || null,
    status: data.status || "empty",
    needsData: Boolean(data.needs_data),
    consistency: {
      CR: data.consistency?.CR ?? null,
      threshold: data.consistency?.threshold ?? null,
      isConsistent: Boolean(data.consistency?.is_consistent),
      summaryLabel: data.consistency?.summary_label || null,
    },
    criteriaWeights: Array.isArray(data.criteria_weights)
      ? data.criteria_weights.filter(isValidCriteriaWeight)
      : [],
    rankingPreview: data.ranking_preview || null,
    distribution: data.distribution || null,
  };
}

export function createFahpRecapSliceState(response, request) {
  const data = buildFahpDashboardRecapViewModel(response);

  return {
    status: data.status,
    data,
    error: null,
    request,
    meta: {},
  };
}
