function formatDecimal(value, digits = 3) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(digits);
}

function formatWeight(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(3);
}

function normalizeConsistencyStatusLabel(value, isConsistent) {
  if (typeof value === "string" && value.trim() !== "") {
    if (value.trim().toLowerCase() === "konsistensi dapat diterima") {
      return "Konsisten";
    }

    return value;
  }

  if (isConsistent === true) return "Konsisten";
  if (isConsistent === false) return "Perlu Review";
  return "Tidak tersedia";
}

function createCriteriaRows(criteriaWeights = []) {
  return criteriaWeights.map((criterion, index) => {
    const weight = Number(criterion.weight);

    return {
      key: `${criterion.label || "criterion"}-${index}`,
      label: criterion.label || `Criterion ${index + 1}`,
      weight: Number.isFinite(weight) ? weight : 0,
      weightLabel: formatWeight(weight),
      barStyle: `width: ${Math.max(0, Math.min(weight * 100, 100))}%`,
    };
  });
}

function createRankingRows(rankings = []) {
  return rankings.slice(0, 5).map((ranking, index) => {
    const score = Number(ranking.score);
    const fallbackRank = index + 1;
    const rank = Number.isFinite(Number(ranking.rank))
      ? Number(ranking.rank)
      : fallbackRank;
    const primaryLabel = ranking.name || `Alternative ${fallbackRank}`;

    return {
      key: `${ranking.id || primaryLabel || "ranking"}-${index}`,
      rank,
      label: primaryLabel,
      secondaryLabel: ranking.label || null,
      score: Number.isFinite(score) ? score : 0,
      scoreLabel: formatDecimal(score, 3),
    };
  });
}

function resolveActiveDecision(decisions, activeDecisionKey) {
  return (
    decisions.find((decision) => decision.key === activeDecisionKey) ||
    decisions[0] ||
    null
  );
}

export function createFuzzyAhpViewState(panel, activeDecisionKey = null) {
  const decisions = Array.isArray(panel?.data?.decisions)
    ? panel.data.decisions
    : [];
  const fallbackKey = panel?.data?.activeDecisionKey || decisions[0]?.key || "";
  const selectedKey = activeDecisionKey || fallbackKey;
  const activeDecision = resolveActiveDecision(decisions, selectedKey);
  const threshold =
    typeof activeDecision?.consistencyThreshold === "number"
      ? activeDecision.consistencyThreshold
      : Number.NaN;
  const consistencyRatio =
    typeof activeDecision?.consistencyRatio === "number"
      ? activeDecision.consistencyRatio
      : Number.NaN;
  const explicitConsistency =
    typeof activeDecision?.isConsistent === "boolean"
      ? activeDecision.isConsistent
      : null;
  const derivedConsistency =
    explicitConsistency === null &&
    Number.isFinite(consistencyRatio) &&
    Number.isFinite(threshold)
      ? consistencyRatio <= threshold
      : null;
  const isConsistent = explicitConsistency ?? derivedConsistency;

  return {
    title: panel?.title || "Fuzzy AHP Decision Center",
    detail: panel?.detail || "",
    note: panel?.note || "",
    source: panel?.data?.source || "",
    isPreview: Boolean(panel?.data?.isPreview),
    decisions,
    activeDecision,
    activeDecisionKey: activeDecision?.key || selectedKey,
    consistencyRatioLabel: formatDecimal(consistencyRatio, 3),
    thresholdLabel: formatDecimal(threshold, 2),
    consistencyStatusLabel: normalizeConsistencyStatusLabel(
      activeDecision?.consistencyStatus,
      isConsistent,
    ),
    isConsistent,
    criteriaRows: createCriteriaRows(activeDecision?.criteriaWeights),
    rankingRows: createRankingRows(activeDecision?.rankings),
    updatedAtLabel:
      activeDecision?.updatedAtLabel || "Menunggu pembaruan backend Fuzzy AHP",
  };
}
