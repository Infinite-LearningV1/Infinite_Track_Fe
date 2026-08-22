import { API_CONFIG } from "../config/env.js";
import { authRequest } from "./authRequest.js";

const DASHBOARD_TYPES = new Set(["discipline", "wfa", "smart_ac"]);

export class FuzzyAhpService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  async getDashboardFahpAnalysis({ type = "discipline", from, to } = {}) {
    if (!DASHBOARD_TYPES.has(type)) {
      throw new Error(`Invalid dashboard FAHP type: ${type}.`);
    }

    if (type === "wfa" && (!from || !to)) {
      throw new Error("WFA dashboard analysis requires from and to dates.");
    }

    const params = { type };
    if (type === "wfa") {
      params.from = from;
      params.to = to;
    }

    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard`,
      params,
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
