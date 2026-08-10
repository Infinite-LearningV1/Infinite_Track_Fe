/**
 * Booking List Feature
 * Mengelola state dan logika untuk halaman daftar booking WFA
 */

import {
  getBookings,
  approveBooking as approveBookingCommand,
  deleteBooking,
} from "../../services/bookingService.js";
import { WFA_BOOKING_REJECTION_EVENTS } from "./bookingRejection.js";
import {
  createBookingLocationDetail,
  extractBookingCollection,
  normalizeBooking,
} from "./bookingList.contract.js";
import {
  DEFAULT_BOOKING_MANAGEMENT_QUERY,
  toBookingManagementRequestParams,
  validateBookingManagementDateRange,
} from "./bookingManagementDirectoryQuery.js";
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
export function bookingListAlpineData(overrides = {}) {
  const requestBookings = overrides.getBookings || getBookings;
  const approveCommand = overrides.approveBooking || approveBookingCommand;
  const deleteCommand = overrides.deleteBooking || deleteBooking;
  const notify =
    overrides.notify ||
    ((payload) => globalThis.window?.showInlineAlert?.(payload));

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
    appliedQuery: {
      ...DEFAULT_BOOKING_MANAGEMENT_QUERY,
      appliedFilters: { ...DEFAULT_BOOKING_MANAGEMENT_QUERY.appliedFilters },
    },
    draftFilters: { ...DEFAULT_BOOKING_MANAGEMENT_QUERY.appliedFilters },
    tableState: { loading: false, error: "", hasSuccessfulPage: false },
    latestListRequestId: 0,
    isFilterOpen: false,
    filterValidationMessage: "",
    filters: { page: 1, limit: 10, search: "", status: "" },
    isLoading: true,
    errorMessage: "",
    // Search input proxy -> draft query
    get searchTerm() {
      return this.appliedQuery.search;
    },
    set searchTerm(value) {
      this.appliedQuery.search = value;
    },

    statusFilter: "", // Modal states
    get activeFilterCount() {
      const filters = this.appliedQuery.appliedFilters;
      return Number(Boolean(filters.status)) +
        Number(Boolean(filters.dateFrom || filters.dateTo));
    },

    openFilter() {
      this.filterValidationMessage = "";
      this.isFilterOpen = true;
      this.$nextTick?.(() => globalThis.document?.getElementById("bookingTableFilterPopover")?.focus());
    },

    closeFilter() {
      this.isFilterOpen = false;
      globalThis.document?.getElementById("bookingTableFilterTrigger")?.focus?.();
    },
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
      requestReasonLabel: "",
      requestOtherReason: "",
      rejectionReasonLabel: "",
      rejectionNote: "",
      radiusSnapshot: null,
      processedAt: null,
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
      const requestId = ++this.latestListRequestId;
      this.tableState.loading = true;
      this.isLoading = true;
      this.tableState.error = "";
      try {
        this.errorMessage = "";
        const response = await requestBookings(
          toBookingManagementRequestParams(this.appliedQuery),
        );
        if (requestId !== this.latestListRequestId) return;

        const { bookings: bookingsData, pagination: paginationData } =
          extractBookingCollection(response);
        this.bookings = bookingsData.map(normalizeBooking);

        const currentPage = paginationData.current_page ?? 1;
        const totalPages = paginationData.total_pages ?? 1;
        const totalRecords = paginationData.total_records ?? 0;
        const recordsPerPage = paginationData.records_per_page ?? 10;
        this.pagination = {
          current_page: currentPage,
          total_pages: totalPages,
          total_items: totalRecords,
          total_records: totalRecords,
          items_per_page: recordsPerPage,
          per_page: recordsPerPage,
          has_next_page: paginationData.has_next_page ?? currentPage < totalPages,
          has_prev_page: paginationData.has_prev_page ?? currentPage > 1,
        };
        this.appliedQuery.page = currentPage;
        this.appliedQuery.limit = recordsPerPage;
        this.filters.page = currentPage;
        this.filters.limit = recordsPerPage;
        this.tableState.hasSuccessfulPage = true;

        // Log successful data fetch for debugging
        console.log("Bookings fetched successfully:", {
          count: this.bookings.length,
          pagination: this.pagination,
        });
      } catch (error) {
        if (requestId !== this.latestListRequestId) return;
        this.errorMessage = error.message || "Gagal memuat data booking";
        this.tableState.error = this.errorMessage;
        notify({ type: "danger", title: "Gagal Memuat Data Booking", message: this.errorMessage });
      } finally {
        if (requestId === this.latestListRequestId) {
          this.tableState.loading = false;
          this.isLoading = false;
        }
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
    async applyFilters() {
      const validation = validateBookingManagementDateRange(this.draftFilters);
      if (!validation.valid) {
        this.filterValidationMessage = validation.message;
        return false;
      }
      this.filterValidationMessage = "";
      this.appliedQuery.appliedFilters = { ...this.draftFilters };
      this.appliedQuery.page = 1;
      await this.fetchBookings();
      this.closeFilter();
      return true;
    },

    async clearFilters() {
      this.draftFilters = { status: "", dateFrom: "", dateTo: "" };
      this.appliedQuery.appliedFilters = { ...this.draftFilters };
      this.appliedQuery.page = 1;
      this.filterValidationMessage = "";
      await this.fetchBookings();
      this.closeFilter();
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
        this.appliedQuery.page = 1;
        this.fetchBookings();
      }, 500);
    },

    /**
     * Handle status filter change
     */
    handleStatusFilter() {
      this.draftFilters.status = this.statusFilter;
      this.applyFilters();
    },

    /**
     * Change page
     * @param {number} newPage - Nomor halaman baru
     */
    changePage(newPage) {
      if (newPage >= 1 && newPage <= this.pagination.total_pages) {
        this.appliedQuery.page = newPage;
        this.fetchBookings();
      }
    },

    /**
     * Change entries per page (server-driven)
     * @param {number|string} newLimit - Jumlah data per halaman
     */
    changeLimit(newLimit) {
      const parsedLimit = Number(newLimit);
      this.appliedQuery.limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
      this.appliedQuery.page = 1;
      this.fetchBookings();
    },

    /**
     * Change sorting
     * @param {string} newSortBy - Field untuk sorting
     */
    _unusedChangeHandler: undefined,

    /**
     * Get sort icon
     * @param {string} fieldName - Field name untuk sorting
     * @returns {string} - Icon class atau empty string
     */
    _unusedIconHandler(fieldName) {
      if (!this.isSortFieldSupported(fieldName)) {
        return "";
      }

      const backendSortField = this.sortFieldMap[fieldName];
      if (this.filters.sortBy !== backendSortField) {
        return ""; // Tidak ada icon jika field tidak sedang di-sort
      }
      return this.filters.sortOrder === "ASC" ? "↑" : "↓";
    },

    _unusedSortCheck: undefined,

    /**
     * View location detail
     * @param {Object} booking - Data booking item
     */
    viewLocationDetail(booking) {
      // Check if coordinates are available
      if (
        !Number.isFinite(booking.location_latitude) ||
        !Number.isFinite(booking.location_longitude)
      ) {
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

      const locationData = createBookingLocationDetail(booking);

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
        requestReasonLabel: "",
        requestOtherReason: "",
        rejectionReasonLabel: "",
        rejectionNote: "",
        radiusSnapshot: null,
        processedAt: null,
        phoneNumber: "",
      };
    },

    /**
     * Close booking map modal (alias for compatibility)
     */
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
        radius: location.radius ?? null,
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
        const response = await approveCommand(bookingId);

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

    openRejectBooking(booking) {
      if (!booking?.id || booking.status !== "pending") return;
      globalThis.window?.dispatchEvent?.(
        new CustomEvent(WFA_BOOKING_REJECTION_EVENTS.open, {
          detail: { booking },
        }),
      );
    },

    async handleRejectionSucceeded() {
      await this.fetchBookings();
      globalThis.window?.showAlertModal?.({
        type: "success",
        title: "Booking Ditolak",
        message: "Penolakan telah dikonfirmasi Backend.",
        buttonText: "OK",
      });
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
        const response = await deleteCommand(this.deleteTargetId);

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
     * Open the review/detail surface without deciding the booking.
     */
    ,
    openBookingDetail(booking) {
      this.viewBookingDetail(booking);
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
