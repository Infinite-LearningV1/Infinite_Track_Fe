const escapeHtml = (value) => {
  const normalized = value == null ? "" : String(value);
  return normalized
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const toFiniteNumber = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const toText = (value) => (value == null ? "" : String(value));

export const buildDashboardMapMarkers = (locations = []) => {
  if (!Array.isArray(locations)) {
    return [];
  }

  return locations
    .map((location) => {
      const latitude = toFiniteNumber(location?.latitude);
      const longitude = toFiniteNumber(location?.longitude);

      return {
        fullName: toText(location?.full_name ?? location?.fullName),
        mode: toText(location?.mode ?? location?.work_mode),
        status: toText(location?.status),
        checkInTime: toText(location?.check_in_time ?? location?.checkInTime),
        description: toText(location?.description),
        latitude,
        longitude,
      };
    })
    .filter(
      (marker) =>
        Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude),
    );
};

export const buildDashboardMapPopup = (marker = {}) => {
  const fullName = escapeHtml(marker?.fullName ?? marker?.full_name);
  const mode = escapeHtml(marker?.mode ?? marker?.work_mode);
  const status = escapeHtml(marker?.status);
  const checkInTime = escapeHtml(marker?.checkInTime ?? marker?.check_in_time);
  const description = escapeHtml(marker?.description);

  return [
    `<div class="dashboard-map-popup">`,
    `<strong>${fullName}</strong>`,
    `<div>Mode: ${mode}</div>`,
    `<div>Status: ${status}</div>`,
    `<div>Check-in: ${checkInTime}</div>`,
    `<div>${description}</div>`,
    `</div>`,
  ].join("");
};
