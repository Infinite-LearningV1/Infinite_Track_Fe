import { API_CONFIG } from "../config/env.js";
import { authRequest } from "./authRequest.js";

const DASHBOARD_TYPES = new Set(["discipline", "smart_ac"]);

export class FuzzyAhpService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  async getDashboardFahpAnalysis({ type = "discipline" } = {}) {
    if (!DASHBOARD_TYPES.has(type)) {
      throw new Error(
        `WFA uses the dedicated WFA FAHP endpoint; invalid dashboard type: ${type}.`,
      );
    }

    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard`,
      params: { type },
    });

    return response.data;
  }

  async getWfaFahpAnalysis(params) {
    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/wfa`,
      params,
    });
    return response.data;
  }
}

const fuzzyAhpService = new FuzzyAhpService();

export const getDashboardFahpAnalysis = (params) =>
  fuzzyAhpService.getDashboardFahpAnalysis(params);
export const getWfaFahpAnalysis = (params) =>
  fuzzyAhpService.getWfaFahpAnalysis(params);
