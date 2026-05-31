import { API_CONFIG } from "../config/env.js";
import { authRequest } from "./authRequest.js";

export class TodayLocationsService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  async getTodayLocations({ limit = 200 } = {}) {
    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/attendance/today-locations`,
      params: { limit },
    });

    return response.data;
  }
}

const todayLocationsService = new TodayLocationsService();

export const getTodayLocations = (params) =>
  todayLocationsService.getTodayLocations(params);
