import { API_CONFIG } from "../config/env.js";
import { authRequest } from "./authRequest.js";

const ALLOWED_PERIODS = ["30d", "current_month", "custom"];

export class GeofenceEvidenceService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  async getGeofenceEvidence({ period = "30d", from = null, to = null } = {}) {
    if (!ALLOWED_PERIODS.includes(period)) {
      throw new Error(
        `Invalid period: ${period}. Allowed periods are ${ALLOWED_PERIODS.join(", ")}.`,
      );
    }

    if (period === "custom" && (!from || !to)) {
      throw new Error("Custom period requires both from and to values.");
    }

    const params = { period };

    if (period === "custom") {
      params.from = from;
      params.to = to;
    }

    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/attendance/geofence-evidence`,
      params,
    });

    return response.data;
  }
}

const geofenceEvidenceService = new GeofenceEvidenceService();

export const getGeofenceEvidence = (params) =>
  geofenceEvidenceService.getGeofenceEvidence(params);
