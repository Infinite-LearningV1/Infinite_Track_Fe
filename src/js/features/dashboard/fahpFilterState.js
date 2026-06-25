export function createDefaultFahpFilterState() {
  return {
    category: null,
    analysis_type: null,
  };
}

export function buildFahpRequestParams(state) {
  return {
    category: state?.category || null,
    analysis_type: state?.analysis_type || null,
  };
}
