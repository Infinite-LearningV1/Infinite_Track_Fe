/**
 * User List Alpine.js Component (Simplified)
 * Hanya fokus mengambil data dari API /users tanpa search/filter kompleks
 */

import {
  getUsers,
  deleteUser,
  getRoles,
  getDivisions,
} from "../../services/userService.js";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils.js";
import { roleBadgeClass as roleBadgeClassUtil } from "../../utils/roleBadge.js";
import { firstFiniteMapNumber } from "../../utils/mapLocationTruth.js";
import {
  parseUserDirectoryQuery,
  serializeUserDirectoryQuery,
  toUserDirectoryRequestParams,
  USER_DIRECTORY_SORT_KEYS,
} from "./userDirectoryQuery.js";
function mapDirectoryUser(user) {
  const fullName = user.full_name || user.fullName || "";
  return {
    ...user,
    fullName,
    role: user.role_name || user.role || null,
    position: user.position_name || user.position || null,
    nipNim: user.nip_nim || user.nipNim || null,
    phoneNumber: user.phone || user.phoneNumber,
    division: user.division_name || user.division || null,
    photo: user.photo || null,
    latitude: firstFiniteMapNumber(user.location?.latitude),
    longitude: firstFiniteMapNumber(user.location?.longitude),
    radius: firstFiniteMapNumber(user.location?.radius),
    description: user.location?.description || null,
    categoryName: user.location?.category_name || null,
    locationId: user.location?.location_id || null,
    locationStatus: user.location_status || null,
    initials: getInitials(fullName),
    avatarColor: getAvatarColor(fullName),
  };
}

/**
 * Data dan metode Alpine.js untuk komponen daftar pengguna
 * @returns {Object} - Objek yang berisi state dan metode Alpine.js
 */
function userListAlpineData(overrides = {}) {
  const services = {
    getUsers: overrides.getUsers || getUsers,
    getRoles: overrides.getRoles || getRoles,
    getDivisions: overrides.getDivisions || getDivisions,
    deleteUser: overrides.deleteUser || deleteUser,
  };
  const browser =
    overrides.browser !== undefined
      ? overrides.browser
      : typeof window !== "undefined"
        ? window
        : null;
  const schedule = overrides.setTimeout || globalThis.setTimeout;
  const cancelSchedule = overrides.clearTimeout || globalThis.clearTimeout;

  return {
    // State management
    users: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    isLoading: false,
    errorMessage: "",
    entriesPerPage: 10,
    currentPage: 1,
    searchQuery: "",
    sortBy: "created_at",
    sortOrder: "DESC",
    latestRequestId: 0,
    searchTimer: null,
    popstateHandler: null,

    // Modal states
    isDeleteModalOpen: false,
    userToDelete: null,
    isDeleting: false,
    deleteConfirmText: "",

    // Filter popover state (draft fields, edited before Apply)
    isFilterOpen: false,
    filterRole: "",
    filterDivision: "",
    filterWfhStatus: "",
    // Applied filters use stable backend values; "" means no filter.
    appliedFilters: {
      role: "",
      division: "",
      locationStatus: "",
    },
    availableRoles: [],
    availableDivisions: [],
    roleOptionsError: false,
    divisionOptionsError: false,

    /**
     * Inisialisasi komponen
     */
    async init() {
      console.log("Initializing user list component...");
      if (browser) {
        this.applyUrlState({ fetch: false });
        this.popstateHandler = async () => {
          await this.applyUrlState();
        };
        browser.addEventListener("popstate", this.popstateHandler);
      }
      await Promise.all([this.fetchUsers(), this.loadReferenceData()]);
    },

    applyParsedQuery(parsed) {
      this.currentPage = parsed.currentPage;
      this.entriesPerPage = parsed.entriesPerPage;
      this.searchQuery = parsed.searchQuery;
      this.appliedFilters = { ...parsed.appliedFilters };
      this.filterRole = parsed.appliedFilters.role;
      this.filterDivision = parsed.appliedFilters.division;
      this.filterWfhStatus = parsed.appliedFilters.locationStatus;
      this.sortBy = parsed.sortBy;
      this.sortOrder = parsed.sortOrder;
    },

    async applyUrlState({ fetch = true } = {}) {
      if (!browser) return;
      this.applyParsedQuery(
        parseUserDirectoryQuery(new URLSearchParams(browser.location.search)),
      );
      if (fetch) await this.fetchUsers();
    },

    syncUrl(mode) {
      if (!browser || mode === "none") return;
      const query = serializeUserDirectoryQuery(
        this,
        new URLSearchParams(browser.location.search),
      ).toString();
      const url = `${browser.location.pathname}${query ? `?${query}` : ""}${browser.location.hash || ""}`;
      browser.history[`${mode}State`]({}, "", url);
    },

    destroy() {
      if (this.searchTimer !== null) cancelSchedule(this.searchTimer);
      if (browser && this.popstateHandler) {
        browser.removeEventListener("popstate", this.popstateHandler);
      }
    },

    async loadReferenceData() {
      const [rolesResult, divisionsResult] = await Promise.allSettled([
        services.getRoles(),
        services.getDivisions(),
      ]);
      this.availableRoles =
        rolesResult.status === "fulfilled" ? rolesResult.value || [] : [];
      this.availableDivisions =
        divisionsResult.status === "fulfilled"
          ? divisionsResult.value || []
          : [];
      this.roleOptionsError = rolesResult.status === "rejected";
      this.divisionOptionsError = divisionsResult.status === "rejected";
    },

    /**
     * Computed: Total halaman berdasarkan pagination server
     */
    get totalPages() {
      return this.pagination.totalPages;
    },
    /**
     * Computed: Info showing entries berdasarkan pagination server
     */
    get showingInfo() {
      const { page, limit, total } = this.pagination;

      if (this.users.length === 0) {
        return `Showing 0 to 0 of ${total} entries`;
      }

      const start = (page - 1) * limit + 1;
      const end = Math.min(page * limit, total);

      return `Showing ${start} to ${end} of ${total} entries`;
    },

    /**
     * Mengambil data pengguna dari API
     */
    async fetchUsers({ historyMode = "none" } = {}) {
      const requestId = ++this.latestRequestId;
      this.isLoading = true;
      this.errorMessage = "";

      try {
        console.log("Fetching users from API...");

        const result = await services.getUsers(
          toUserDirectoryRequestParams(this),
        );
        if (requestId !== this.latestRequestId) return false;

        this.users = result.data.map(mapDirectoryUser);
        this.pagination = result.pagination;
        this.currentPage = result.pagination.page;
        this.entriesPerPage = result.pagination.limit;

        console.log("Successfully fetched users:", this.users);
        return true;
      } catch (error) {
        if (requestId !== this.latestRequestId) return false;
        console.error("Error fetching users:", error);
        this.errorMessage = error.message;

        // Tampilkan modal error
        this.showErrorModal(error.message);
        return false;
      } finally {
        if (requestId === this.latestRequestId) this.isLoading = false;
      }
    },

    /**
     * Navigasi ke halaman tertentu
     */
    async goToPage(page) {
      if (this.isLoading || page < 1 || page > this.totalPages) return;
      this.currentPage = page;
      this.syncUrl("push");
      await this.fetchUsers();
    },

    /**
     * Navigasi ke halaman sebelumnya
     */
    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
      }
    },
    /**
     * Navigasi ke halaman selanjutnya
     */
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
      }
    } /**
     * Handler untuk perubahan search query
     */,
    onSearchChange() {
      if (this.searchTimer !== null) cancelSchedule(this.searchTimer);
      this.searchTimer = schedule(async () => {
        this.currentPage = 1;
        this.syncUrl("replace");
        await this.fetchUsers();
      }, 300);
    } /**
     * Handler untuk perubahan entries per page
     */,
    async onEntriesPerPageChange() {
      this.entriesPerPage = Number(this.entriesPerPage);
      this.currentPage = 1;
      this.syncUrl("push");
      await this.fetchUsers();
    } /**
     * Menerapkan filter draft (Role/Divisi/Status Lokasi WFH) ke appliedFilters,
     * menutup popover, dan mereset halaman ke 1.
     */,
    async applyFilters() {
      this.appliedFilters = {
        role: this.filterRole,
        division: this.filterDivision,
        locationStatus: this.filterWfhStatus,
      };
      this.isFilterOpen = false;
      this.currentPage = 1;
      this.syncUrl("push");
      await this.fetchUsers();
    } /**
     * Mengosongkan filter draft dan appliedFilters, mereset halaman ke 1.
     * State popover (terbuka/tertutup) tidak diubah.
     */,
    async resetFilters() {
      this.filterRole = "";
      this.filterDivision = "";
      this.filterWfhStatus = "";
      this.appliedFilters = {
        role: "",
        division: "",
        locationStatus: "",
      };
      this.currentPage = 1;
      this.syncUrl("push");
      await this.fetchUsers();
    },

    async toggleSort(key) {
      if (this.isLoading || !USER_DIRECTORY_SORT_KEYS.includes(key)) return;
      this.sortOrder =
        this.sortBy === key && this.sortOrder === "ASC" ? "DESC" : "ASC";
      this.sortBy = key;
      this.currentPage = 1;
      this.syncUrl("push");
      await this.fetchUsers();
    },

    sortAriaValue(key) {
      if (this.sortBy !== key) return "none";
      return this.sortOrder === "ASC" ? "ascending" : "descending";
    },

    sortIndicator(key) {
      if (this.sortBy !== key) return "↕";
      return this.sortOrder === "ASC" ? "↑" : "↓";
    } /**
     * Mendapatkan array nomor halaman untuk pagination
     * Logic super fleksibel berdasarkan total data dan entries per page
     */,
    getPageNumbers() {
      const totalPages = this.totalPages;
      const pages = [];

      // Jika tidak ada data atau hanya 1 halaman
      if (totalPages <= 1) {
        return totalPages === 1 ? [1] : [];
      }

      // Logic pagination yang sangat fleksibel
      if (totalPages <= 7) {
        // Jika total halaman 7 atau kurang, tampilkan semua
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Jika lebih dari 7 halaman, gunakan smart pagination
        const current = this.currentPage;

        if (current <= 4) {
          // Di awal: tampilkan 1,2,3,4,5
          for (let i = 1; i <= 5; i++) {
            pages.push(i);
          }
        } else if (current >= totalPages - 3) {
          // Di akhir: tampilkan 5 halaman terakhir
          for (let i = totalPages - 4; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          // Di tengah: tampilkan current-2, current-1, current, current+1, current+2
          for (let i = current - 2; i <= current + 2; i++) {
            pages.push(i);
          }
        }
      }

      console.log(
        `Pagination Info: Total Data=${this.pagination.total}, Entries/Page=${this.entriesPerPage}, Total Pages=${totalPages}, Current Page=${this.currentPage}, Showing Pages=[${pages.join(",")}]`,
      );
      return pages;
    } /**
     * Menangani aksi view pengguna
     */,
    viewUser(userId) {
      console.log("View user:", userId);
      // TODO: Implementasi modal view atau navigasi ke detail
    },

    /**
     * Wrapper methods for template usage
     */
    getInitials(fullName) {
      return getInitials(fullName);
    },
    getAvatarColor(fullName) {
      return getAvatarColor(fullName);
    },

    /**
     * Role badge color mapping for the Akses column.
     *
     * Delegates to the shared src/js/utils/roleBadge.js util so the table
     * and the Detail Pengguna drawer render the same palette from one
     * source. Colour is supplementary only — the badge always keeps
     * `user.role` as its visible text (see the Akses cell binding), so this
     * never becomes the sole carrier of status.
     *
     * @param {string|null|undefined} role
     * @returns {string} full Tailwind class string (bg + text + dark variants)
     */
    roleBadgeClass(role) {
      return roleBadgeClassUtil(role);
    },

    /**
     * WFH readiness label for the table's Lokasi WFH column.
     *
     * Coordinates stay out of the table; the drawer owns location detail.
     */
    wfhStatusFor(user) {
      if (user.locationStatus === "configured") return "Tersedia";
      if (user.locationStatus === "integrity_error") return "Perlu diperbaiki";
      return "Status tidak diketahui";
    },

    wfhStatusClassFor(user) {
      if (user.locationStatus === "configured") {
        return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
      }
      if (user.locationStatus === "integrity_error") {
        return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
      }
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    } /**
     * Menangani aksi edit pengguna
     */,
    editUser(userId) {
      console.log("Edit user:", userId);
      // Navigate to form page with user ID for editing
      window.location.href = `form-user.html?id=${userId}`;
    },

    /**
     * Menangani aksi hapus pengguna - membuka modal konfirmasi
     */
    showDeleteModal(user) {
      if (user && user.id) {
        this.userToDelete = user;
        this.isDeleteModalOpen = true;
        this.deleteConfirmText = "";
      } else {
        console.error("Invalid user object passed to showDeleteModal:", user);
      }
    },

    /**
     * Menangani aksi hapus pengguna - membuka modal konfirmasi (backward compatibility)
     */
    deleteUser(userId) {
      const user = this.users.find((u) => u.id === userId);
      if (user && user.id) {
        this.userToDelete = user;
        this.isDeleteModalOpen = true;
        this.deleteConfirmText = "";
      } else {
        console.error("User not found with ID:", userId);
      }
    },

    /**
     * Menutup modal konfirmasi delete
     */
    closeDeleteModal() {
      this.isDeleteModalOpen = false;
      this.userToDelete = null;
      this.deleteConfirmText = "";
    },

    /**
     * Konfirmasi dan eksekusi delete user
     */
    async confirmDeleteUser() {
      if (!this.userToDelete) {
        return;
      }

      this.isDeleting = true;

      // Store user info before deletion for success message
      const userFullName =
        this.userToDelete.fullName || this.userToDelete.full_name || "Pengguna";

      try {
        await services.deleteUser(this.userToDelete.id);

        // Tutup modal
        this.closeDeleteModal();

        // Refresh user list
        const refreshed = await this.fetchUsers();
        if (!refreshed) return;

        if (
          this.currentPage > 1 &&
          this.pagination.totalPages > 0 &&
          this.currentPage > this.pagination.totalPages
        ) {
          const retainedPage = this.pagination.page;
          this.currentPage = this.pagination.totalPages;
          this.syncUrl("replace");
          const recoveryRequestId = this.latestRequestId + 1;
          const recovered = await this.fetchUsers();
          if (!recovered) {
            if (this.latestRequestId === recoveryRequestId) {
              this.currentPage = retainedPage;
              this.syncUrl("replace");
            }
            return;
          }
        } else if (this.pagination.totalPages === 0) {
          this.currentPage = 1;
          this.syncUrl("replace");
        }

        // Tampilkan pesan sukses
        this.showSuccessModal(`Pengguna "${userFullName}" berhasil dihapus.`);
      } catch (error) {
        console.error("Error deleting user:", error);
        this.showErrorModal(error.message);
      } finally {
        this.isDeleting = false;
      }
    },

    /**
     * Menampilkan modal sukses
     * @param {string} message - Pesan sukses yang akan ditampilkan
     */
    showSuccessModal(message) {
      if (typeof window.showAlertModal === "function") {
        window.showAlertModal({
          type: "success",
          title: "Berhasil",
          message: message,
          buttonText: "OK",
          showClose: true,
          onOk: () => {
            console.log("Success modal closed");
          },
        });
      } else {
        // Fallback jika modal tidak tersedia
        alert(message);
      }
    },

    /**
     * Menampilkan modal error
     * @param {string} message - Pesan error yang akan ditampilkan
     */
    showErrorModal(message) {
      if (typeof window.showAlertModal === "function") {
        window.showAlertModal({
          type: "danger",
          title: "Terjadi Kesalahan",
          message: message,
          buttonText: "OK",
          showClose: true,
          onOk: () => {
            console.log("Error modal closed");
          },
        });
      } else {
        // Fallback jika modal tidak tersedia
        alert(message);
      }
    },
  };
}

// Export function
export { userListAlpineData };
