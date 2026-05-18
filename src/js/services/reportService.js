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
   * Mendapatkan summary report dari backend
   * @param {Object} params - Request parameters
   * @param {string} params.period - Period filter ('daily', 'weekly', 'monthly', 'all')
   * @param {number} params.page - Page number for pagination
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query
   * @param {string|null} params.sortBy - Backend sort field
   * @param {string} params.sortOrder - Backend sort order ('asc' or 'desc')
   * @returns {Promise<Object>} Response data containing summary, report, and analytics
   */
  async getSummaryReport(params = {}) {
    const {
      period = "all",
      page = 1,
      limit = 10,
      search = "",
      sortBy = null,
      sortOrder = "asc",
    } = params;

    try {
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

      console.log("API Response received:", response.data);

      // Return the complete response data including pagination and analytics
      return response.data;
    } catch (error) {
      console.error("Error fetching from API:", error.message);

      throw new Error(`Failed to fetch summary report: ${error.message}`);
    }
  }

  /**
   * Get mock summary data for development/testing
   * @param {Object} params - Request parameters
   * @returns {Object} Mock summary data with pagination and analytics
   */
  getMockSummaryData(params) {
    const { period = "all", page = 1, limit = 10, search = "" } = params;

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
