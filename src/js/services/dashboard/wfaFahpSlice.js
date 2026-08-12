const WFA_CRITERIA = [
  {
    key: "location_type",
    label: "Location Type",
    displayLabel: "Location Type",
  },
  {
    key: "distance_factor",
    label: "Distance Factor",
    displayLabel: "Distance Factor",
  },
  {
    key: "facility_score",
    label: "Facility Score",
    displayLabel: "Facility Score",
  },
];

function validNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function contractData(response) {
  const data = response?.data;
  if (!data || !Array.isArray(data.candidates) || !data.methodology) {
    throw new Error("Invalid WFA FAHP analysis contract");
  }
  const weights = data.methodology.criteria_weights;
  if (
    !weights ||
    !WFA_CRITERIA.every(({ key }) => validNumber(Number(weights[key])))
  ) {
    throw new Error("Invalid WFA FAHP analysis contract");
  }
  return data;
}

export function buildWfaFahpViewModel(response) {
  const data = contractData(response);
  const ranked = data.candidates.filter(
    (candidate) =>
      candidate.status === "ranked" &&
      Number(candidate.rank) > 0 &&
      validNumber(Number(candidate.final_score)),
  );
  const hasNeedsData = data.candidates.some((candidate) =>
    ["insufficient_facility_data", "facility_enrichment_failed"].includes(
      candidate.status,
    ),
  );
  const status = ranked.length
    ? "ready"
    : hasNeedsData
      ? "needs_data"
      : "empty";
  const weights = data.methodology.criteria_weights;
  return {
    type: "wfa",
    typeLabel: "WFA",
    status,
    needsData: status === "needs_data",
    consistency: {
      CR: validNumber(Number(weights.consistency_ratio))
        ? Number(weights.consistency_ratio)
        : null,
      threshold: null,
      isConsistent: null,
      summaryLabel: null,
    },
    criteriaWeights: WFA_CRITERIA.map(({ key, label, displayLabel }) => ({
      key,
      label,
      display_label: displayLabel,
      value: Number(weights[key]),
    })),
    rankingPreview: {
      items: ranked.map((candidate) => ({
        id: candidate.place_id,
        name: candidate.name,
        label: candidate.final_label,
        score: Number(candidate.final_score),
        rank: Number(candidate.rank),
      })),
    },
    distribution: null,
    evidence: {
      searchCriteria: data.searchCriteria || null,
      methodology: data.methodology,
    },
  };
}

export function createWfaFahpSliceState(response, request) {
  const data = buildWfaFahpViewModel(response);
  return { status: data.status, data, error: null, request, meta: {} };
}
