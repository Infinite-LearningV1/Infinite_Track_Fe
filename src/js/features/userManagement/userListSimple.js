/**
 * User List Alpine.js Component (Simplified)
 * Hanya fokus mengambil data dari API /users tanpa search/filter kompleks
 */

import {
  getUsers,
  updateUser,
  deleteUser,
  getDivisions,
} from "../../services/userService.js";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils.js";
import { roleBadgeClass as roleBadgeClassUtil } from "../../utils/roleBadge.js";
import { firstFiniteMapNumber } from "../../utils/mapLocationTruth.js";
import {
  normalizeWfhLocation,
  resolveWfhStatus,
} from "./userDetailDrawerLifecycle.js";

/**
 * Data dan metode Alpine.js untuk komponen daftar pengguna
 * @returns {Object} - Objek yang berisi state dan metode Alpine.js
 */
function userListAlpineData() {
  return {
    // State management
    users: [],
    isLoading: false,
    errorMessage: "",
    entriesPerPage: 10,
    currentPage: 1,
    searchQuery: "", // Modal states
    isDeleteModalOpen: false,
    userToDelete: null,
    isDeleting: false,
    deleteConfirmText: "",

    // Filter popover state (draft fields, edited before Apply)
    isFilterOpen: false,
    filterRole: "",
    filterDivision: "",
    filterWfhStatus: "",
    // Applied filters actually used by filteredUsers; "" means no filter.
    appliedFilters: {
      role: "",
      division: "",
      wfhStatus: "",
    },
    // Divisions loaded via getDivisions() during init(); stays [] on failure.
    availableDivisions: [],

    /**
     * Inisialisasi komponen
     */
    async init() {
      console.log("Initializing user list component...");
      await this.fetchUsers();

      try {
        this.availableDivisions = (await getDivisions()) || [];
      } catch (error) {
        console.warn("Failed to load divisions for filter:", error);
        this.availableDivisions = [];
      }
    } /**
     * Computed: Filtered users berdasarkan search query
     */,
    get filteredUsers() {
      let result = this.users;

      if (this.searchQuery && this.searchQuery.trim() !== "") {
        const query = this.searchQuery.toLowerCase().trim();
        result = result.filter((user) => {
          // Search dalam fullName dan nipNim
          const fullName = (user.fullName || "").toLowerCase();
          const nipNim = (user.nipNim || "").toLowerCase();

          return fullName.includes(query) || nipNim.includes(query);
        });
      }

      if (this.appliedFilters.role) {
        result = result.filter(
          (user) => user.role === this.appliedFilters.role,
        );
      }

      if (this.appliedFilters.division) {
        result = result.filter(
          (user) => user.division === this.appliedFilters.division,
        );
      }

      if (this.appliedFilters.wfhStatus) {
        result = result.filter(
          (user) => this.wfhStatusFor(user) === this.appliedFilters.wfhStatus,
        );
      }

      return result;
    } /**
     * Computed: Unique, sorted, non-empty roles from loaded users
     */,
    get availableRoles() {
      const roles = new Set(
        this.users.map((user) => user.role).filter((role) => !!role),
      );
      return Array.from(roles).sort();
    } /**
     * Computed: Paginated users untuk ditampilkan
     */,
    get paginatedUsers() {
      const start = (this.currentPage - 1) * this.entriesPerPage;
      const end = start + this.entriesPerPage;
      return this.filteredUsers.slice(start, end);
    },

    /**
     * Computed: Total halaman berdasarkan data yang ada
     */
    get totalPages() {
      const totalData = this.filteredUsers.length;
      if (totalData === 0) return 0;
      return Math.ceil(totalData / this.entriesPerPage);
    },
    /**
     * Computed: Info showing entries dengan logika fleksibel
     */
    get showingInfo() {
      const totalData = this.filteredUsers.length;

      if (totalData === 0) {
        return "Showing 0 to 0 of 0 entries";
      }

      const start = (this.currentPage - 1) * this.entriesPerPage + 1;
      const end = Math.min(this.currentPage * this.entriesPerPage, totalData);

      return `Showing ${start} to ${end} of ${totalData} entries`;
    },

    /**
     * Mengambil data pengguna dari API
     */
    async fetchUsers() {
      try {
        this.isLoading = true;
        this.errorMessage = "";

        console.log("Fetching users from API...");

        // Panggil API tanpa parameter
        const users = await getUsers();
        this.users = users || [];

        console.log("Successfully fetched users:", this.users);
        console.log("Raw API response:", users);
        console.log("Sample user data:", users[0] || "No users found"); // Transform data untuk menambahkan computed properties dan normalisasi field names
        this.users = this.users.map((user) => ({
          ...user,
          // Normalisasi field names untuk kompatibilitas dengan template
          fullName: user.full_name || user.fullName,
          role: user.role_name || user.role,
          position: user.position_name || user.position,
          nipNim: user.nip_nim || user.nipNim,
          phoneNumber: user.phone || user.phoneNumber,
          division: user.division_name || user.division || null,
          photo: user.photo || null,
          // Location data mapping from nested location object
          // Finite-number coercion, not truthiness: a coordinate of exactly 0
          // is configured data and must not collapse to null.
          latitude: firstFiniteMapNumber(user.location?.latitude),
          longitude: firstFiniteMapNumber(user.location?.longitude),
          radius: firstFiniteMapNumber(user.location?.radius),
          description: user.location?.description || null,
          categoryName: user.location?.category_name || null,
          locationId: user.location?.location_id || null,
          // Computed properties
          initials: getInitials(user.full_name || user.fullName),
          avatarColor: getAvatarColor(user.full_name || user.fullName),
        }));

        console.log(
          "Transformed user data:",
          this.users[0] || "No users after transform",
        );

        // Reset current page jika melebihi total pages
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
          this.currentPage = 1;
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        this.errorMessage = error.message;
        this.users = [];

        // Tampilkan modal error
        this.showErrorModal(error.message);
      } finally {
        this.isLoading = false;
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
      console.log(`Filtered results: ${this.filteredUsers.length} items`);

      // Reset ke halaman pertama ketika search berubah
      this.currentPage = 1;
    } /**
     * Handler untuk perubahan entries per page
     */,
    onEntriesPerPageChange() {
      console.log(`Entries per page changed to: ${this.entriesPerPage}`);
      console.log(`Total data: ${this.filteredUsers.length}`);
      console.log(
        `New total pages will be: ${Math.ceil(this.filteredUsers.length / this.entriesPerPage)}`,
      );

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
        wfhStatus: this.filterWfhStatus,
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
        wfhStatus: "",
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
        `Pagination Info: Total Data=${this.filteredUsers.length}, Entries/Page=${this.entriesPerPage}, Total Pages=${totalPages}, Current Page=${this.currentPage}, Showing Pages=[${pages.join(",")}]`,
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
        await deleteUser(this.userToDelete.id);

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
