export function buildFahpDashboardRecapViewModel(response) {
  const status = response?.data?.status || "empty";
  const sections = Array.isArray(response?.data?.sections)
    ? response.data.sections
    : [];

  return {
    status,
    sections,
    filter: response?.filter || {
      category: null,
      analysis_type: null,
    },
  };
}
