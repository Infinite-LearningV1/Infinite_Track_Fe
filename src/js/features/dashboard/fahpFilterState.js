export function createDefaultFahpFilterState() {
  return {
    type: "discipline",
  };
}

export function buildFahpRequestParams(state) {
  const type = state?.type || "discipline";
  if (!["discipline", "wfa", "smart_ac"].includes(type)) {
    throw new Error(`Invalid FAHP type: ${type}`);
  }
  return { type };
}
