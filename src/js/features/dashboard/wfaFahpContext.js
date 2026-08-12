const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function createDefaultWfaFahpContext() {
  return {
    latitude: "",
    longitude: "",
    scheduleDate: "",
    radiusMeters: "",
    validationError: null,
  };
}

function validDate(value) {
  if (!DATE_REGEX.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateWfaFahpContext(context = {}) {
  const latitude = Number(context.latitude);
  const longitude = Number(context.longitude);
  const scheduleDate = context.scheduleDate || "";
  const radiusProvided =
    context.radiusMeters !== "" &&
    context.radiusMeters !== null &&
    context.radiusMeters !== undefined;
  const radius = radiusProvided ? Number(context.radiusMeters) : null;
  if (context.latitude === "" || context.longitude === "" || !scheduleDate) {
    return {
      isValid: false,
      message: "WFA analysis requires latitude, longitude, and schedule date.",
      request: null,
    };
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return {
      isValid: false,
      message: "Latitude must be a number between -90 and 90.",
      request: null,
    };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return {
      isValid: false,
      message: "Longitude must be a number between -180 and 180.",
      request: null,
    };
  }
  if (!validDate(scheduleDate)) {
    return {
      isValid: false,
      message: "Schedule date must be a valid YYYY-MM-DD date.",
      request: null,
    };
  }
  if (radiusProvided && (!Number.isFinite(radius) || radius <= 0)) {
    return {
      isValid: false,
      message: "Radius must be a positive number when provided.",
      request: null,
    };
  }
  const request = {
    lat: latitude,
    lon: longitude,
    schedule_date: scheduleDate,
  };
  if (radiusProvided) request.radius_meters = radius;
  return { isValid: true, message: "", request };
}

export function buildWfaFahpRequestParams(context) {
  const result = validateWfaFahpContext(context);
  if (!result.isValid) {
    const error = new Error(result.message);
    error.code = "WFA_FAHP_CONTEXT_INVALID";
    throw error;
  }
  return result.request;
}
