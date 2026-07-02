import { API_CONFIG } from "../config/env.js";
import { authRequest } from "./authRequest.js";

/**
 * Service untuk menangani API calls terkait laporan summary
 */
export class ReportService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  /**
   * Mendapatkan summary report dari backend canonical reports endpoint.
   * @param {Object} params - Request parameters
   * @param {string} params.period - Period filter; defaults to backend-supported monthly period
   * @param {string} params.from - Custom range start date for period=range
   * @param {string} params.to - Custom range end date for period=range
   * @param {number} params.page - Page number for pagination
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search filter sent as canonical q parameter
   * @returns {Promise<Object>} Response data containing summary and report payload for the report/export flow
   */
  async getSummaryReport({
    period = "monthly",
    from,
    to,
    page = 1,
    limit = 10,
    search = "",
    sortBy = null,
    sortOrder = "asc",
  } = {}) {
    let canonicalPeriod = period;

    if (canonicalPeriod === "all") {
      console.warn(
        "ReportService#getSummaryReport period=all is not supported by /summary/reports; falling back to monthly.",
      );
      canonicalPeriod = "monthly";
    }

    this.validateSummaryReportPeriod(canonicalPeriod);
    this.validateSummaryReportRange(canonicalPeriod, from, to);

    const queryParams = { period: canonicalPeriod, page, limit };
    const normalizedSearch = String(search).trim();

    if (normalizedSearch !== "") {
      queryParams.q = normalizedSearch;
    }

    if (canonicalPeriod === "range") {
      queryParams.from = from;
      queryParams.to = to;
    }

    if (sortBy) {
      queryParams.sortBy = sortBy;
      queryParams.sortOrder = sortOrder;
    }

    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary/reports`,
      params: queryParams,
    });

    return response.data;
  }

  validateSummaryReportPeriod(period) {
    const allowedPeriods = ["daily", "weekly", "monthly", "range"];

    if (!allowedPeriods.includes(period)) {
      throw new Error("period must be one of: daily, weekly, monthly, range");
    }
  }

  validateSummaryReportRange(period, from, to) {
    if (period !== "range") {
      return;
    }

    if (!from || !to) {
      throw new Error("range period requires from and to dates");
    }

    if (
      !this.isValidSummaryReportDate(from) ||
      !this.isValidSummaryReportDate(to)
    ) {
      throw new Error(
        "range period requires from and to dates in YYYY-MM-DD format",
      );
    }

    const fromDate = this.parseSummaryReportDate(from);
    const toDate = this.parseSummaryReportDate(to);
    const rangeDays = (toDate.getTime() - fromDate.getTime()) / 86400000;

    if (rangeDays < 0) {
      throw new Error("range period to date must be on or after from date");
    }

    if (rangeDays + 1 > 31) {
      throw new Error("range period cannot exceed 31 days");
    }
  }

  isValidSummaryReportDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    return (
      this.formatSummaryReportDate(this.parseSummaryReportDate(value)) === value
    );
  }

  parseSummaryReportDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  formatSummaryReportDate(value) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * @deprecated Use getSummaryReport() for the canonical /summary/reports endpoint.
   */
  async getLegacySummaryReport(params = {}) {
    const {
      period = "all",
      page = 1,
      limit = 10,
      search = "",
      sortBy = null,
      sortOrder = "asc",
    } = params;

    const queryParams = { period, page, limit };
    const normalizedSearch = String(search).trim();

    if (normalizedSearch !== "") {
      queryParams.search = normalizedSearch;
      queryParams.q = normalizedSearch;
      queryParams.query = normalizedSearch;
      queryParams.keyword = normalizedSearch;
    }

    if (sortBy) {
      queryParams.sortBy = sortBy;
      queryParams.sortOrder = sortOrder;
    }

    const response = await this.requestExecutor({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/summary`,
      params: queryParams,
    });

    return response.data;
  }

  async getDashboardAnalytics(params = {}) {
    const { period = "all", from = null, to = null } = params;

    try {
      const queryParams = { period };

      if (from) {
        queryParams.from = from;
      }

      if (to) {
        queryParams.to = to;
      }

      const response = await this.requestExecutor({
        method: "get",
        url: `${API_CONFIG.BASE_URL}/summary/dashboard-analytics`,
        params: queryParams,
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error.message);
      throw new Error(`Failed to fetch dashboard analytics: ${error.message}`);
    }
  }

  async getTodayLocations() {
    try {
      const response = await this.requestExecutor({
        method: "get",
        url: `${API_CONFIG.BASE_URL}/attendance/today-locations`,
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching today locations:", error.message);
      throw new Error(`Failed to fetch today locations: ${error.message}`);
    }
  }

  async getFuzzyAhpAnalysis({ type = "discipline" } = {}) {
    try {
      const response = await this.requestExecutor({
        method: "get",
        url: `${API_CONFIG.BASE_URL}/analysis/fuzzy-ahp/dashboard`,
        params: { type },
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching fuzzy ahp analysis:", error.message);
      throw new Error(`Failed to fetch fuzzy ahp analysis: ${error.message}`);
    }
  }

  /**
   * Get mock summary data for development/testing
   * @param {Object} params - Request parameters
   * @returns {Object} Mock summary data with pagination and analytics
   */
  getMockSummaryData(params) {
    const { period = "monthly", page = 1, limit = 10, search = "" } = params;

    // Default summary statistics
    const summary = {
      total_ontime: 21,
      total_late: 19,
      total_alpha: 0,
      total_wfo: 10,
      total_wfh: 11,
      total_wfa: 13,
    };

    // Mock analytics data (new)
    const analytics = {
      discipline_index: 78.5,
      performance_trend: "improving",
      avg_work_hours: 8.2,
    };

    // Complete mock report data with discipline scores
    const allReportData = [
      {
        attendance_id: "att_001",
        nip_nim: "F5512062",
        full_name: "John Doe",
        role: "Developer",
        email: "john.doe@example.com",
        phone_number: "081234567890",
        time_in: "08:00",
        time_out: "17:00",
        work_hour: "9 hours",
        status: "ontime",
        information: "Work From Office",
        attendance_date: "2024-01-15",
        discipline_score: 92,
        discipline_label: "Excellent",
        location_details: {
          coordinates: { latitude: -6.17511, longitude: 106.865036 },
          radius: 100,
          description: "Kantor Pusat",
        },
      },
      {
        attendance_id: "att_002",
        nip_nim: "F5512063",
        full_name: "Jane Smith",
        role: "Designer",
        email: "jane.smith@example.com",
        phone_number: "081234567891",
        time_in: "08:30",
        time_out: "17:15",
        status: "late",
        information: "Work From Home",
        attendance_date: "2024-01-15",
        discipline_score: 74,
        discipline_label: "Good",
        location_details: {
          coordinates: { latitude: null, longitude: null },
          radius: 100,
          description: "Location not specified",
        },
      },
      {
        attendance_id: "att_003",
        nip_nim: "F5512064",
        full_name: "Robert Johnson",
        role: "Project Manager",
        email: "robert.johnson@example.com",
        phone_number: "081234567892",
        time_in: "07:45",
        time_out: "16:30",
        status: "ontime",
        information: "Work From Anywhere",
        attendance_date: "2024-01-15",
        discipline_score: 88,
        discipline_label: "Very Good",
        location_details: {
          coordinates: { latitude: -6.193124, longitude: 106.80195 },
          radius: 100,
          description: "Branch Office",
        },
      },
      {
        attendance_id: "att_004",
        nip_nim: "F5512065",
        full_name: "Sarah Wilson",
        role: "Marketing",
        email: "sarah.wilson@example.com",
        phone_number: "081234567893",
        time_in: "09:15",
        time_out: "18:00",
        status: "late",
        information: "Work From Office",
        attendance_date: "2024-01-15",
        discipline_score: 58,
        discipline_label: "Needs Improvement",
        location_details: {
          coordinates: { latitude: -6.17511, longitude: 106.865036 },
          radius: 100,
          description: "Kantor Pusat",
        },
      },
      {
        attendance_id: "att_005",
        nip_nim: "F5512066",
        full_name: "Michael Brown",
        role: "HR Manager",
        email: "michael.brown@example.com",
        phone_number: "081234567894",
        time_in: "07:55",
        time_out: "17:10",
        status: "ontime",
        information: "Work From Office",
        attendance_date: "2024-01-15",
        discipline_score: 95,
        discipline_label: "Excellent",
        location_details: {
          coordinates: { latitude: -6.17511, longitude: 106.865036 },
          radius: 100,
          description: "Kantor Pusat",
        },
      },
    ];

    // Apply search filter if search query is provided
    let filteredData = allReportData;
    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase().trim();
      filteredData = allReportData.filter((item) => {
        return (
          item.full_name?.toLowerCase().includes(searchLower) ||
          item.nip_nim?.toLowerCase().includes(searchLower) ||
          item.role?.toLowerCase().includes(searchLower) ||
          item.status?.toLowerCase().includes(searchLower) ||
          item.information?.toLowerCase().includes(searchLower) ||
          item.email?.toLowerCase().includes(searchLower) ||
          item.discipline_label?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Simulate pagination on filtered data
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    const pagination = {
      current_page: page,
      total_pages: totalPages,
      total_records: totalItems,
      per_page: limit,
      has_next_page: page < totalPages,
      has_prev_page: page > 1,
    };

    // Return success response with mock data including analytics and pagination
    return {
      success: true,
      message: "Summary and report fetched successfully",
      summary,
      analytics,
      report: {
        data: paginatedData,
        pagination,
      },
    };
  }
}

// Export singleton instance
export const reportService = new ReportService();

// Export the main function for convenience
export const getSummaryReport = (params) =>
  reportService.getSummaryReport(params);

/**
 * @deprecated Use getSummaryReport() for the canonical /summary/reports endpoint.
 */
export const getLegacySummaryReport = (params) =>
  reportService.getLegacySummaryReport(params);

export const getDashboardAnalytics = (params) =>
  reportService.getDashboardAnalytics(params);

export const getTodayLocations = () => reportService.getTodayLocations();

export const getFuzzyAhpAnalysis = () => reportService.getFuzzyAhpAnalysis();
