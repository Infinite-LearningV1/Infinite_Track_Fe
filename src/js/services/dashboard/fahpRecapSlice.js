function isDashboardRecapFilter(filter) {
  return (
    filter &&
    typeof filter === "object" &&
    typeof filter.category === "string" &&
    typeof filter.analysis_type === "string"
  );
}

function isDashboardRecapData(data) {
  return (
    data &&
    typeof data === "object" &&
    typeof data.status === "string" &&
    Array.isArray(data.sections)
  );
}

export function buildFahpDashboardRecapViewModel(response) {
  if (!isDashboardRecapFilter(response?.filter) || !isDashboardRecapData(response?.data)) {
    throw new Error("Invalid FAHP dashboard recap contract");
  }

  return {
    status: response.data.status,
    sections: response.data.sections,
    filter: response.filter,
  };
}
