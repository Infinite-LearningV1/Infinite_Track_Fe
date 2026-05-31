/**
 * Alpine.js Authentication Store
 * Store untuk mengelola state autentikasi user
 */

import {
  getUserFromStorage,
  removeUserFromStorage,
} from "../utils/storageManager.js";
import {
  fetchCurrentUser,
  hasSessionHint,
  resolveBootstrapSession,
} from "../services/authService.js";
import { clearAuthArtifacts } from "../services/authSessionRuntime.js";

/**
 * Initialize Authentication Store untuk Alpine.js
 */
function initAuthStore() {
  // Pastikan Alpine.js tersedia
  if (typeof Alpine === "undefined") {
    console.warn("Alpine.js not found. Auth store not initialized.");
    return;
  }

  // Inisialisasi auth store
  Alpine.store("auth", {
    // State
    user: null,
    isAuthenticated: false,
    sessionState: "unauthenticated",
    isLoading: false,
    error: null,

    // Getters
    get userName() {
      return this.user?.name || this.user?.username || "User";
    },

    get userEmail() {
      return this.user?.email || "";
    },
    get userRole() {
      return this.user?.role_name || this.user?.role || "user";
    },

    get userAvatar() {
      return (
        this.user?.avatar ||
        this.user?.profile_picture ||
        "/src/images/user/owner.jpg"
      );
    },

    get hasPermission() {
      return (permission) => {
        if (!this.user || !this.user.permissions) return false;
        return this.user.permissions.includes(permission);
      };
    },

    // Actions
    loadUserFromStorage() {
      try {
        const userData = getUserFromStorage();
        if (userData && hasSessionHint()) {
          this.user = userData;
          this.isAuthenticated = false;
          this.sessionState = "unauthenticated";
          console.log("User data loaded from storage:", userData);
        } else {
          this.clearAuth();
        }
      } catch (error) {
        console.error("Error loading user from storage:", error);
        this.clearAuth();
      }
    },

    setUser(userData) {
      this.user = userData;
      this.isAuthenticated = true;
      this.sessionState = "authenticated";
      this.error = null;
      console.log("User data set in auth store:", userData);
    },

    setVerificationFailed(userData = null) {
      this.user = userData;
      this.isAuthenticated = false;
      this.sessionState = "verification_failed";
      this.error = "Session belum bisa diverifikasi.";
      console.log("Auth store marked verification_failed", userData);
    },

    setLoading(isLoading) {
      this.isLoading = isLoading;
    },

    setError(error) {
      this.error = error;
      this.isLoading = false;
    },

    clearAuth() {
      this.user = null;
      this.isAuthenticated = false;
      this.sessionState = "unauthenticated";
      this.error = null;
      this.isLoading = false;
      clearAuthArtifacts(window.localStorage, window.sessionStorage);
      removeUserFromStorage();
      console.log("Auth store cleared");
    },

    async refreshUser() {
      try {
        this.setLoading(true);
        const resolution = await resolveBootstrapSession();

        if (resolution.state === "authenticated") {
          this.setUser(resolution.user || (await fetchCurrentUser()));
          return;
        }

        if (resolution.state === "verification_failed") {
          this.setVerificationFailed(this.user || getUserFromStorage());
          return;
        }

        this.clearAuth();
      } catch (error) {
        console.error("Error refreshing user:", error);
        this.setError(error.message);
        this.clearAuth();
      } finally {
        this.setLoading(false);
      }
    }, // Helper methods
    canAccess(permission) {
      return this.isAuthenticated && this.hasPermission(permission);
    },

    isAdmin() {
      return this.userRole === "Admin";
    },

    isManager() {
      return this.userRole === "Management";
    },

    isInternship() {
      return this.userRole === "Internship";
    },

    isEmployee() {
      return this.userRole === "Employee";
    },

    // Role-based access control methods
    canAccessDashboard() {
      // Hanya Admin dan Management yang bisa akses dashboard
      return this.isAdmin() || this.isManager();
    },

    canAccessUserManagement() {
      // Hanya Admin yang bisa akses user management
      return this.isAdmin();
    },

    canAccessBookingManagement() {
      // Admin dan Management bisa akses booking management
      return this.isAdmin() || this.isManager();
    },

    canAccessAttendanceManagement() {
      // Admin dan Management bisa akses attendance management
      return this.isAdmin() || this.isManager();
    },
  });

  Alpine.store("auth").loadUserFromStorage();

  console.log("Auth store initialized");
}

// Export untuk penggunaan sebagai module
export { initAuthStore };

// Untuk penggunaan global di browser
if (typeof window !== "undefined") {
  window.initAuthStore = initAuthStore;
}
