/**
 * Booking List Feature
 * Mengelola state dan logika untuk halaman daftar booking WFA
 */

import {
  getBookings,
  updateBookingStatus,
  deleteBooking,
} from "../../services/bookingService.js";
import { formatDateTime, formatDate } from "../../utils/dateTimeFormatter.js";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils.js";
import {
  getBookingStatusBadgeClass,
  getBookingStatusBadgeText,
  getSuitabilityScoreColor,
} from "../../utils/badgeHelpers.js";

/**
 * Alpine.js data untuk halaman booking list
 * @returns {Object} - Alpine.js data object
 */
export function bookingListAlpineData() {
  return {
    // State data
    bookings: [],
    pagination: {
      current_page: 1,
      total_pages: 1,
      total_items: 0,
      total_records: 0,
      items_per_page: 10,
      per_page: 10,
      has_next_page: false,
      has_prev_page: false,
    },
    filters: {
      status: "",
      search: "",
      sortBy: "custom",
      sortOrder: "DESC",
      page: 1,
      limit: 10,
    },
    isLoading: true,
    errorMessage: "",
    supportedSortFields: [
      "id",
      "employee_name",
      "employee_position",
      "schedule_date",
      "status",
      "suitability_score",
    ],
    sortFieldMap: {
      id: "id",
      employee_name: "employee_name",
      employee_position: "employee_position",
      schedule_date: "schedule_date",
      status: "status",
      suitability_score: "suitability_score",
    },

    // Search input proxy -> single request state (filters.search)
    get searchTerm() {
      return this.filters.search;
    },
    set searchTerm(value) {
      this.filters.search = value;
    },

    statusFilter: "", // Modal states
    isDeleteModalOpen: false,
    deleteConfirmMessage: "",
    deleteTargetId: null,

    // Booking Detail Modal states
    isBookingDetailModalOpen: false,
    bookingDetailData: {
      id: null,
      userId: "",
      fullName: "",
      role: "",
      position: "",
      scheduleDate: "",
      notes: "",
      locationName: "",
      latitude: null,
      longitude: null,
      status: "",
    }, // Map modal states
    isBookingMapModalOpen: false,
    selectedBookingLocation: {
      title: "",
      description: "",
      latitude: null,
      longitude: null,
      radius: null,
      // Complete booking data
      id: null,
      employee_name: "",
      employee_id: "",
      status: "",
      start_date: "",
      end_date: "",
      schedule_date: "",
      location_name: "",
      notes: "",
      phoneNumber: "", // Phone field that will be replaced with notes
    },

    // Legacy map modal (for compatibility)
    isMapDetailModalOpen: false,
    mapDetailPayload: {
      title: "",
      description: "",
      latitude: null,
      longitude: null,
      radius: null,
    },

    // Required for general map modal compatibility
    selectedUserLocation: {
      id: null,
      fullName: "",
      email: "",
      position: "",
      phoneNumber: "",
      latitude: null,
      longitude: null,
      radius: null,
      description: "",
    },

    // Debounce timer untuk search
    searchTimer: null /**
     * Initialize component
     */,
    async init() {
      await this.fetchBookings();
    },

    /**
     * Fetch booking data dari API
     */
    async fetchBookings() {
      try {
        this.isLoading = true;
        this.errorMessage = "";

        const response = await getBookings(this.filters);

        // Handle different API response structures
        const bookingsData = response.data?.bookings || response.bookings || [];
        const paginationData =
          response.data?.pagination || response.pagination || {};

        // Map API response to expected template format
        this.bookings = bookingsData.map((booking) => ({
          // Map API fields to template expected fields
          id: booking.booking_id || booking.id,
          employee_name: booking.user_full_name || booking.employee_name,
          employee_id: booking.user_nip_nim || booking.employee_id,
          employee_email: booking.user_email || booking.employee_email,
          employee_position:
            booking.user_position_name || booking.employee_position,
          employee_role: booking.user_role_name || booking.employee_role,
          start_date: booking.schedule_date || booking.start_date,
          end_date: booking.schedule_date || booking.end_date, // Same as start for single day booking
          schedule_date: booking.schedule_date,
          status: booking.status,
          location_name:
            booking.location?.description || booking.location_name || "N/A",
          location_latitude: booking.location?.latitude || booking.latitude,
          location_longitude: booking.location?.longitude || booking.longitude,
          location_radius: booking.location?.radius || booking.radius || 100,
          notes: booking.notes || booking.note || "",
          created_at: booking.created_at,
          processed_at: booking.processed_at,
          approved_by: booking.approved_by,
          suitability_score: booking.suitability_score,
          suitability_label: booking.suitability_label,
          // Keep original data for reference
          original: booking,
        }));

        // Handle pagination with fallbacks
        this.pagination = {
          current_page: paginationData.current_page || 1,
          total_pages: paginationData.total_pages || 1,
          total_items: paginationData.total_items || paginationData.total || 0,
          total_records:
            paginationData.total_items || paginationData.total || 0, // Alias for table compatibility
          items_per_page:
            paginationData.items_per_page || paginationData.per_page || 10,
          per_page:
            paginationData.items_per_page || paginationData.per_page || 10, // Alias for table compatibility
          has_next_page:
            (paginationData.current_page || 1) <
            (paginationData.total_pages || 1),
          has_prev_page: (paginationData.current_page || 1) > 1,
        };

        if (this.pagination.per_page) {
          this.filters.limit = Number(this.pagination.per_page);
        }

        // Log successful data fetch for debugging
        console.log("Bookings fetched successfully:", {
          count: this.bookings.length,
          pagination: this.pagination,
        });
      } catch (error) {
        this.errorMessage = error.message || "Gagal memuat data booking";
        console.error("Error fetching bookings:", error);

        // Tampilkan modal error
        if (typeof window.showAlertModal === "function") {
          window.showAlertModal({
            type: "danger",
            title: "Gagal Memuat Data Booking",
            message: this.errorMessage,
            buttonText: "OK",
          });
        }
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Handle search input dengan debounce
     */
    debouncedSearch() {
      this.handleSearchInput();
    },

    /**
     * Apply filters (called when status filter changes)
     */
    applyFilters() {
      this.filters.status = this.statusFilter;
      this.filters.page = 1; // Reset ke halaman pertama
      this.fetchBookings();
    },

    /**
     * Handle search input dengan debounce
     */
    handleSearchInput() {
      // Clear timer sebelumnya
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
      }

      // Set timer baru untuk debounce 500ms
      this.searchTimer = setTimeout(() => {
        this.filters.page = 1; // Reset ke halaman pertama
        this.fetchBookings();
      }, 500);
    },

    /**
     * Handle status filter change
     */
    handleStatusFilter() {
      this.filters.status = this.statusFilter;
      this.filters.page = 1; // Reset ke halaman pertama
      this.fetchBookings();
    },

    /**
     * Change page
     * @param {number} newPage - Nomor halaman baru
     */
    changePage(newPage) {
      if (newPage >= 1 && newPage <= this.pagination.total_pages) {
        this.filters.page = newPage;
        this.fetchBookings();
      }
    },

    /**
     * Change entries per page (server-driven)
     * @param {number|string} newLimit - Jumlah data per halaman
     */
    changeLimit(newLimit) {
      const parsedLimit = Number(newLimit);
      this.filters.limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
      this.filters.page = 1;
      this.fetchBookings();
    },

    /**
     * Change sorting
     * @param {string} newSortBy - Field untuk sorting
     */
    changeSort(newSortBy) {
      if (!this.isSortFieldSupported(newSortBy)) {
        return;
      }

      const backendSortField = this.sortFieldMap[newSortBy];
      if (!backendSortField) {
        return;
      }

      // Jika field sama, toggle order
      if (this.filters.sortBy === backendSortField) {
        this.filters.sortOrder =
          this.filters.sortOrder === "ASC" ? "DESC" : "ASC";
      } else {
        this.filters.sortBy = backendSortField;
        this.filters.sortOrder = "DESC"; // Default ke DESC untuk field baru
      }

      this.filters.page = 1; // Reset ke halaman pertama
      this.fetchBookings();
    },

    /**
     * Get sort icon
     * @param {string} fieldName - Field name untuk sorting
     * @returns {string} - Icon class atau empty string
     */
    getSortIcon(fieldName) {
      if (!this.isSortFieldSupported(fieldName)) {
        return "";
      }

      const backendSortField = this.sortFieldMap[fieldName];
      if (this.filters.sortBy !== backendSortField) {
        return ""; // Tidak ada icon jika field tidak sedang di-sort
      }
      return this.filters.sortOrder === "ASC" ? "↑" : "↓";
    },

    isSortFieldSupported(fieldName) {
      return this.supportedSortFields.includes(fieldName);
    },

    /**
     * View location detail
     * @param {Object} booking - Data booking item
     */
    viewLocationDetail(booking) {
      // Check if coordinates are available
      if (!booking.location_latitude || !booking.location_longitude) {
        if (typeof window.showAlertModal === "function") {
          window.showAlertModal({
            type: "warning",
            title: "Lokasi Tidak Tersedia",
            message: "Data koordinat lokasi tidak tersedia untuk booking ini.",
            buttonText: "OK",
          });
        }
        return;
      }

      // Siapkan payload untuk modal peta dengan data booking lengkap
      const locationData = {
        // Original location data
        title: `Lokasi Booking - ${booking.employee_name}`,
        description:
          booking.location_name || booking.notes || "Lokasi booking WFA",
        latitude: booking.location_latitude,
        longitude: booking.location_longitude,
        radius: booking.location_radius || 100, // Default radius 100m

        // Complete booking data for modal
        id: booking.id,
        employee_name: booking.employee_name,
        employee_id: booking.employee_id,
        status: booking.status,
        start_date: booking.start_date,
        end_date: booking.end_date,
        schedule_date: booking.schedule_date,
        location_name: booking.location_name,
        notes: booking.notes || "",
        phoneNumber: booking.phone_number || booking.phoneNumber || "", // Add phone field that will be replaced with notes
      };

      // Set state untuk booking map modal only (tidak menggunakan map-detail-modal)
      this.selectedBookingLocation = locationData;

      // Buka modal booking-map-modal.html saja
      this.isBookingMapModalOpen = true;

      // Initialize map setelah modal terbuka
      this.$nextTick(() => {
        if (typeof window.initializeBookingMap === "function") {
          window.initializeBookingMap(locationData);
        }
      });
    },

    /**
     * Close booking map modal
     */
    closeMapDetailModal() {
      this.isBookingMapModalOpen = false;
      // Clean up booking map
      if (typeof window.cleanupBookingMap === "function") {
        window.cleanupBookingMap();
      }

      // Reset booking location data
      this.selectedBookingLocation = {
        title: "",
        description: "",
        latitude: null,
        longitude: null,
        radius: null,
        id: null,
        employee_name: "",
        employee_id: "",
        status: "",
        start_date: "",
        end_date: "",
        schedule_date: "",
        location_name: "",
        notes: "",
        phoneNumber: "",
      };
    } /**
     * Close booking map modal (alias for compatibility)
     */,
    closeBookingMapModal() {
      this.closeMapDetailModal();
    },

    /**
     * Open map detail modal (for general compatibility)
     */
    openMapDetailModal(location) {
      this.selectedUserLocation = {
        id: location.id || null,
        fullName: location.fullName || location.title || "",
        email: "",
        position: "",
        phoneNumber: "",
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius || 100,
        description: location.description || "",
      };

      this.isMapDetailModalOpen = true;

      this.$nextTick(() => {
        if (
          this.selectedUserLocation.latitude &&
          this.selectedUserLocation.longitude
        ) {
          if (typeof window.bookingMapModal?.initializeMap === "function") {
            window.bookingMapModal.initializeMap(this.selectedUserLocation);
          }
        }
      });
    },

    /**
     * Approve booking
     * @param {string|number} bookingId - ID booking yang akan diapprove
     */
    async approveBooking(bookingId) {
      try {
        const response = await updateBookingStatus(bookingId, "approved");

        // Handle successful response
        if (response.success || response.status === "success") {
          // Tampilkan modal sukses
          if (typeof window.showAlertModal === "function") {
            window.showAlertModal({
              type: "success",
              title: "Booking Disetujui",
              message: response.message || "Booking berhasil disetujui.",
              buttonText: "OK",
            });
          }

          // Refresh data
          await this.fetchBookings();
        } else {
          throw new Error(response.message || "Gagal menyetujui booking");
        }
      } catch (error) {
        console.error("Error approving booking:", error);

        // Tampilkan modal error
        if (typeof window.showAlertModal === "function") {
          window.showAlertModal({
            type: "danger",
            title: "Gagal Menyetujui Booking",
            message:
              error.message || "Terjadi kesalahan saat menyetujui booking.",
            buttonText: "OK",
          });
        }
      }
    },

    /**
     * Reject booking
     * @param {string|number} bookingId - ID booking yang akan direject
     */
    async rejectBooking(bookingId) {
      try {
        const response = await updateBookingStatus(bookingId, "rejected");

        // Handle successful response
        if (response.success || response.status === "success") {
          // Tampilkan modal sukses
          if (typeof window.showAlertModal === "function") {
            window.showAlertModal({
              type: "success",
              title: "Booking Ditolak",
              message: response.message || "Booking berhasil ditolak.",
              buttonText: "OK",
            });
          }

          // Refresh data
          await this.fetchBookings();
        } else {
          throw new Error(response.message || "Gagal menolak booking");
        }
      } catch (error) {
        console.error("Error rejecting booking:", error);

        // Tampilkan modal error
        if (typeof window.showAlertModal === "function") {
          window.showAlertModal({
            type: "danger",
            title: "Gagal Menolak Booking",
            message: error.message || "Terjadi kesalahan saat menolak booking.",
            buttonText: "OK",
          });
        }
      }
    },

    /**
     * Confirm delete dengan modal
     * @param {string|number} bookingId - ID booking yang akan dihapus
     */
    confirmDelete(bookingId) {
      this.deleteTargetId = bookingId;
      if (typeof window.showAlertModal === "function") {
        window.showAlertModal({
          type: "warning",
          title: "Konfirmasi Hapus Data",
          message:
            "Apakah Anda yakin ingin menghapus data booking ini? Tindakan ini tidak dapat dibatalkan.",
          buttonText: "Ya, Hapus",
          secondaryButtonText: "Batal",
          onOk: () => this.executeDelete(),
        });
      }
    },

    /**
     * Execute delete booking (dipanggil dari modal)
     */
    async executeDelete() {
      if (!this.deleteTargetId) return;

      try {
        const response = await deleteBooking(this.deleteTargetId);

        this.deleteTargetId = null;

        // Handle successful response
        if (
          response.success ||
          response.status === "success" ||
          response.message
        ) {
          // Tampilkan alert inline sukses
          if (typeof window.showInlineAlert === "function") {
            window.showInlineAlert({
              type: "success",
              title: "Data Booking Dihapus",
              message:
                response.message ||
                "Data booking berhasil dihapus dari sistem.",
            });
          }
        } else {
          // Tampilkan alert inline sukses default jika tidak ada response message
          if (typeof window.showInlineAlert === "function") {
            window.showInlineAlert({
              type: "success",
              title: "Data Booking Dihapus",
              message: "Data booking berhasil dihapus dari sistem.",
            });
          }
        }

        // Refresh data
        await this.fetchBookings();
      } catch (error) {
        console.error("Error deleting booking:", error);

        this.deleteTargetId = null;

        // Tampilkan alert inline error
        if (typeof window.showInlineAlert === "function") {
          window.showInlineAlert({
            type: "danger",
            title: "Gagal Menghapus Data",
            message:
              error.message || "Terjadi kesalahan saat menghapus data booking.",
          });
        }
      }
    },

    /**
     * Get status badge class (using universal badge helper)
     */
    getStatusBadgeClass(status) {
      return getBookingStatusBadgeClass(status);
    },

    /**
     * Get status badge text (using universal badge helper)
     */
    getStatusBadgeText(status) {
      return getBookingStatusBadgeText(status);
    },

    /**
     * Format datetime menggunakan utility function
     * @param {string} isoString - ISO date string
     * @returns {string} - Formatted datetime
     */
    formatDateTime(isoString) {
      return formatDateTime(isoString);
    },

    /**
     * Format date menggunakan utility function
     * @param {string} isoString - ISO date string
     * @returns {string} - Formatted date
     */
    formatDate(isoString) {
      return formatDate(isoString);
    },

    /**
     * Get user initials menggunakan utility function
     * @param {string} fullName - Full name
     * @returns {string} - User initials
     */
    getInitials(fullName) {
      return getInitials(fullName);
    } /**
     * Get avatar color menggunakan utility function
     * @param {string} fullName - Full name
     * @returns {string} - CSS classes for avatar
     */,
    getAvatarColor(fullName) {
      return getAvatarColor(fullName);
    },
    /**
     * Get suitability score color using utility function
     * @param {number} score - Suitability score
     * @returns {string} - CSS classes for progress bar
     */
    getSuitabilityScoreColor(score) {
      return getSuitabilityScoreColor(score);
    },
    /**
     * View booking detail
     * @param {Object} booking - Booking object
     */
    viewBookingDetail(booking) {
      this.bookingDetailData = {
        id: booking.id,
        userId: booking.employee_id,
        fullName: booking.employee_name,
        role: booking.employee_role || "Employee",
        position: booking.employee_position || "-",
        scheduleDate: booking.schedule_date,
        notes: booking.notes || "Tidak ada catatan",
        locationName: booking.location_name || "Tidak ada lokasi",
        latitude: booking.location_latitude,
        longitude: booking.location_longitude,
        status: booking.status,
      };
      this.isBookingDetailModalOpen = true;

      // Initialize map if coordinates are available
      this.$nextTick(() => {
        if (
          this.bookingDetailData.latitude &&
          this.bookingDetailData.longitude
        ) {
          this.initBookingDetailMap();
        }
      });
    } /**
     * Close booking detail modal
     */,
    closeBookingDetailModal() {
      this.isBookingDetailModalOpen = false;
      this.bookingDetailData = {
        id: null,
        userId: "",
        fullName: "",
        role: "",
        position: "",
        scheduleDate: "",
        notes: "",
        locationName: "",
        latitude: null,
        longitude: null,
        status: "",
      };
    } /**
     * Initialize map for booking detail modal
     */,
    initBookingDetailMap() {
      // Initialize map similar to map-detail-modal
      const mapContainer = document.getElementById(
        "booking-detail-map-container",
      );
      if (
        !mapContainer ||
        !this.bookingDetailData.latitude ||
        !this.bookingDetailData.longitude
      ) {
        console.warn("Map container or coordinates not available");
        return;
      }

      // Check if Leaflet is available
      if (typeof L === "undefined") {
        console.error("Leaflet library not loaded");
        return;
      }

      try {
        // Clear existing map
        mapContainer.innerHTML = "";

        // Create map
        const map = L.map(mapContainer).setView(
          [this.bookingDetailData.latitude, this.bookingDetailData.longitude],
          16,
        );

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        // Add marker
        const marker = L.marker([
          this.bookingDetailData.latitude,
          this.bookingDetailData.longitude,
        ]).addTo(map).bindPopup(`
            <div class="p-2">
              <h6 class="font-semibold">${this.bookingDetailData.fullName}</h6>
              <p class="text-sm">${this.bookingDetailData.locationName}</p>
              <p class="text-xs text-gray-500">
                ${this.bookingDetailData.latitude}, ${this.bookingDetailData.longitude}
              </p>
            </div>
          `);

        // Store map reference for cleanup
        this.bookingDetailMap = map;

        console.log("Booking detail map initialized successfully");
      } catch (error) {
        console.error("Error initializing booking detail map:", error);
        mapContainer.innerHTML = `
          <div class="flex h-full items-center justify-center">
            <div class="text-center text-gray-500">
              <p class="text-sm">Error loading map</p>
              <p class="text-xs">${error.message}</p>
            </div>
          </div>
        `;
      }
    },
  };
}
