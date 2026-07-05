import { API_CONFIG } from "../config/env.js";
import { authRequest } from "./authRequest.js";

const ALLOWED_TYPES = ["discipline", "wfa", "smart_ac"];

export class FuzzyAhpService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  async getFuzzyAhpAnalysis({ type = "discipline" } = {}) {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new Error(
        `Invalid type: ${type}. Allowed types are ${ALLOWED_TYPES.join(", ")}.`,
      );
    }

    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard`,
      params: { type },
    });

    return response.data;
  }
}

const fuzzyAhpService = new FuzzyAhpService();

export const getFuzzyAhpAnalysis = (params) =>
  fuzzyAhpService.getFuzzyAhpAnalysis(params);
