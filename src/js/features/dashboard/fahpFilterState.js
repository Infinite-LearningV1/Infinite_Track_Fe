export function createDefaultFahpFilterState() {
  return {
    type: "discipline",
  };
}

export function buildFahpRequestParams(state) {
  return {
    type: state?.type || "discipline",
  };
}
