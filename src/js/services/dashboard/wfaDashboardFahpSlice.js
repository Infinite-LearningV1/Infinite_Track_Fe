const REQUIRED_CRITERIA = [
  { key: "location_type", displayLabel: "Tipe Lokasi" },
  { key: "distance_factor", displayLabel: "Faktor Jarak" },
  { key: "facility_score", displayLabel: "Skor Fasilitas" },
];

const SMART_AC_KEYS = new Set([
  "history",
  "checkin_pattern",
  "context",
  "transition",
]);

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function assertObject(value, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
}

function assertNonNegativeInteger(value, message) {
  if (!Number.isInteger(value) || value < 0) throw new Error(message);
}

function normalizeResponse(response) {
  const data = response?.data;
  assertObject(data, "Invalid WFA dashboard FAHP contract");
  if (data.type !== "wfa") throw new Error("Invalid WFA dashboard FAHP type");
  if (!["ready", "empty", "needs_data"].includes(data.status)) {
    throw new Error("Invalid WFA dashboard FAHP status");
  }
  assertObject(
    data.requested_window,
    "WFA dashboard requested_window is required",
  );
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(data.requested_window.from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.requested_window.to)
  ) {
    throw new Error("Invalid WFA dashboard requested_window");
  }
  if (
    !Array.isArray(data.criteria_weights) ||
    data.criteria_weights.length !== 3
  ) {
    throw new Error("Invalid WFA dashboard criteria_weights");
  }
  const criteriaWeights = REQUIRED_CRITERIA.map((required) => {
    const criterion = data.criteria_weights.find(
      (item) => item?.key === required.key,
    );
    if (!criterion || !isFiniteNumber(criterion.value)) {
      throw new Error("Invalid WFA dashboard criteria_weights");
    }
    return {
      key: required.key,
      label: required.displayLabel,
      displayLabel: required.displayLabel,
      display_label: required.displayLabel,
      value: criterion.value,
    };
  });
  assertObject(data.consistency, "Invalid WFA dashboard consistency");
  if (
    !isFiniteNumber(data.consistency.CR) ||
    !isFiniteNumber(data.consistency.threshold) ||
    typeof data.consistency.is_consistent !== "boolean"
  ) {
    throw new Error("Invalid WFA dashboard consistency");
  }
  assertObject(data.methodology, "Invalid WFA dashboard methodology");
  if (!data.methodology.version || !data.methodology.weighting_method) {
    throw new Error("Invalid WFA dashboard methodology");
  }
  const rankingItems = data.ranking_preview?.items;
  if (!Array.isArray(rankingItems))
    throw new Error("Invalid WFA dashboard ranking_preview");
  const rankingPreview = rankingItems.map((item) => {
    assertObject(item, "Invalid WFA dashboard ranking item");
    if (item.user_id || item.user_name || (item.name && !item.location_label)) {
      throw new Error("WFA ranking must contain physical locations");
    }
    if (
      !Number.isInteger(item.rank) ||
      item.rank < 1 ||
      !item.location_key ||
      !item.location_label ||
      !isFiniteNumber(item.score)
    ) {
      throw new Error("Invalid WFA dashboard ranking item");
    }
    assertObject(
      item.criteria_summary,
      "Invalid WFA dashboard criteria summary",
    );
    for (const key of [
      "location_type_score",
      "distance_factor_score",
      "facility_score",
    ]) {
      if (!isFiniteNumber(item.criteria_summary[key]))
        throw new Error("Invalid WFA dashboard criteria summary");
    }
    return {
      ...item,
      id: item.location_key,
      name: item.location_label,
      locationKey: item.location_key,
      locationLabel: item.location_label,
      label: item.label || null,
    };
  });
  assertObject(data.evidence, "Invalid WFA dashboard evidence");
  const evidence = { ...data.evidence };
  for (const key of [
    "approved_booking_count",
    "analyzable_booking_count",
    "excluded_missing_snapshot_count",
    "excluded_incompatible_snapshot_count",
    "unique_location_count",
    "ranked_location_count",
  ]) {
    assertNonNegativeInteger(
      evidence[key],
      "Invalid WFA dashboard evidence count",
    );
  }
  if (evidence.analyzable_booking_count > evidence.approved_booking_count)
    throw new Error("Invalid WFA dashboard evidence counts");
  for (const key of Object.keys(data).filter((key) => SMART_AC_KEYS.has(key)))
    throw new Error("Smart AC payload cannot render as WFA");
  return {
    data,
    criteriaWeights,
    rankingPreview: { ...data.ranking_preview, items: rankingPreview },
    evidence,
  };
}

export function createWfaDashboardFahpSliceState(response, request = null) {
  const { data, criteriaWeights, rankingPreview, evidence } =
    normalizeResponse(response);
  if (
    request?.type === "wfa" &&
    (request.from !== data.requested_window.from ||
      request.to !== data.requested_window.to)
  ) {
    throw new Error("WFA dashboard requested_window does not match request");
  }
  return {
    kind: "wfa_date_range_analysis",
    type: "wfa",
    typeLabel: data.type_label || "WFA",
    status: data.status,
    needsData: data.status === "needs_data",
    requestedWindow: data.requested_window,
    criteriaWeights,
    consistency: {
      CR: data.consistency.CR,
      threshold: data.consistency.threshold,
      isConsistent: data.consistency.is_consistent,
      summaryLabel: data.consistency.summary_label || null,
    },
    methodology: {
      version: data.methodology.version,
      weightingMethod: data.methodology.weighting_method,
    },
    rankingPreview,
    evidence,
    distribution: null,
    request,
  };
}

export function buildWfaDashboardFahpViewModel(response, request = null) {
  return createWfaDashboardFahpSliceState(response, request);
}
