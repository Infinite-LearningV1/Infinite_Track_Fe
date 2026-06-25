function isDashboardRecapFilter(filter) {
  return (
    filter &&
    typeof filter === "object" &&
    typeof filter.category === "string" &&
    typeof filter.analysis_type === "string"
  );
}

function isDashboardRecapDistribution(distribution) {
  return (
    distribution &&
    typeof distribution === "object" &&
    !Array.isArray(distribution) &&
    Object.values(distribution).every((value) => typeof value === "number" && Number.isFinite(value))
  );
}

function isDashboardRecapSection(section) {
  return (
    section &&
    typeof section === "object" &&
    typeof section.key === "string" &&
    typeof section.title === "string" &&
    typeof section.summary === "string" &&
    typeof section.topRank === "string" &&
    isDashboardRecapDistribution(section.distribution) &&
    typeof section.consistency === "number" &&
    Number.isFinite(section.consistency) &&
    typeof section.generatedAt === "string"
  );
}

function isDashboardRecapData(data) {
  return (
    data &&
    typeof data === "object" &&
    typeof data.status === "string" &&
    Array.isArray(data.sections) &&
    data.sections.every(isDashboardRecapSection)
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
