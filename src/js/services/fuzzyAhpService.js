import { API_CONFIG } from "../config/env.js";
import { authRequest } from "./authRequest.js";

const ALLOWED_CATEGORIES = ["discipline", "wfa", "smart_ac"];
const ALLOWED_ANALYSIS_TYPES = ["summary", null, undefined, ""];

export class FuzzyAhpService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  async getFuzzyAhpAnalysis({ category = null, analysis_type = null, type, period } = {}) {
    const normalizedCategory = category ?? type ?? null;
    const normalizedAnalysisType = analysis_type ?? null;

    if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
      throw new Error(
        `Invalid category: ${normalizedCategory}. Allowed categories are ${ALLOWED_CATEGORIES.join(", ")}.`,
      );
    }

    if (!ALLOWED_ANALYSIS_TYPES.includes(normalizedAnalysisType)) {
      throw new Error(
        "Invalid analysis_type. Allowed values are summary or null.",
      );
    }

    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard-recap`,
      params: {
        category: normalizedCategory,
        analysis_type: normalizedAnalysisType || null,
      },
    });

    return response.data;
  }
}

const fuzzyAhpService = new FuzzyAhpService();

export const getFuzzyAhpAnalysis = (params) =>
  fuzzyAhpService.getFuzzyAhpAnalysis(params);
