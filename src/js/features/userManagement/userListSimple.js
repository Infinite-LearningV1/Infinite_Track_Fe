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
import { toUserDirectoryRequestParams } from "./userDirectoryQuery.js";
import {
  normalizeWfhLocation,
  resolveWfhStatus,
} from "./userDetailDrawerLifecycle.js";

function mapDirectoryUser(user) {
  const fullName = user.full_name || user.fullName || "";
  return {
    ...user,
    fullName,
    role: user.role_name || user.role || null,
    position: user.position_name || user.position || null,
    nipNim: user.nip_nim || user.nipNim || null,
    division: user.division_name || user.division || null,
    photo: user.photo || null,
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
      await Promise.all([this.fetchUsers(), this.loadReferenceData()]);
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
        if (requestId !== this.latestRequestId) return;

        this.users = result.data.map(mapDirectoryUser);
        this.pagination = result.pagination;
        this.currentPage = result.pagination.page;
        this.entriesPerPage = result.pagination.limit;

        console.log("Successfully fetched users:", this.users);
      } catch (error) {
        if (requestId !== this.latestRequestId) return;
        console.error("Error fetching users:", error);
        this.errorMessage = error.message;

        // Tampilkan modal error
        this.showErrorModal(error.message);
      } finally {
        if (requestId === this.latestRequestId) this.isLoading = false;
      }
    },

    /**
     * Navigasi ke halaman tertentu
     */
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
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
      console.log("Search query changed:", this.searchQuery);

      // Reset ke halaman pertama ketika search berubah
      this.currentPage = 1;
    } /**
     * Handler untuk perubahan entries per page
     */,
    onEntriesPerPageChange() {
      console.log(`Entries per page changed to: ${this.entriesPerPage}`);

      // Reset ke halaman pertama ketika entries per page berubah
      this.currentPage = 1;
    } /**
     * Menerapkan filter draft (Role/Divisi/Status Lokasi WFH) ke appliedFilters,
     * menutup popover, dan mereset halaman ke 1.
     */,
    applyFilters() {
      this.appliedFilters = {
        role: this.filterRole,
        division: this.filterDivision,
        locationStatus: this.filterWfhStatus,
      };
      this.isFilterOpen = false;
      this.currentPage = 1;
    } /**
     * Mengosongkan filter draft dan appliedFilters, mereset halaman ke 1.
     * State popover (terbuka/tertutup) tidak diubah.
     */,
    resetFilters() {
      this.filterRole = "";
      this.filterDivision = "";
      this.filterWfhStatus = "";
      this.appliedFilters = {
        role: "",
        division: "",
        locationStatus: "",
      };
      this.currentPage = 1;
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
      return resolveWfhStatus(normalizeWfhLocation(user));
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

        // Hapus user dari array lokal
        this.users = this.users.filter(
          (user) => user.id !== this.userToDelete.id,
        );

        // Adjust current page jika diperlukan
        const totalPages = this.totalPages;
        if (this.currentPage > totalPages && totalPages > 0) {
          this.currentPage = totalPages;
        }

        // Tutup modal
        this.closeDeleteModal();

        // Refresh user list
        await this.fetchUsers();

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
