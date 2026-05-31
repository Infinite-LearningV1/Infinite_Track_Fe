import { API_CONFIG } from "../config/env.js";
import { authRequest } from "./authRequest.js";

const ALLOWED_TYPES = ["discipline", "wfa", "smart_ac"];
const ALLOWED_PERIODS = ["weekly", "monthly"];

export class FuzzyAhpService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  async getFuzzyAhpAnalysis({ type, period = "monthly" } = {}) {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new Error(
        `Invalid type: ${type}. Allowed types are ${ALLOWED_TYPES.join(", ")}.`,
      );
    }

    if (!ALLOWED_PERIODS.includes(period)) {
      throw new Error(
        `Invalid period: ${period}. Allowed periods are ${ALLOWED_PERIODS.join(", ")}.`,
      );
    }

    // TODO(INF-170): remove this service surface once INF-170 analytics flow supersedes it.
    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp`,
      params: {
        type,
        period,
      },
    });

    return response.data;
  }
}

const fuzzyAhpService = new FuzzyAhpService();

export const getFuzzyAhpAnalysis = (params) =>
  fuzzyAhpService.getFuzzyAhpAnalysis(params);
