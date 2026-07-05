/**
 * Authentication Guard
 * Middleware untuk mengecek autentikasi dan redirect jika diperlukan
 */

import { hasSessionHint } from "../services/authService.js";
import {
  isProtectedPage as isProtectedRolePage,
  normalizePagePath,
} from "./roleBasedAccess.js";

function getAuthStore() {
  if (typeof Alpine === "undefined" || !Alpine.store) {
    return null;
  }

  return Alpine.store("auth");
}

/**
 * Initialize authentication guard
 */
function initAuthGuard() {
  // Jalankan pengecekan hanya saat dipanggil explicit dari startup boot path
  checkAuthentication();
}

/**
 * Check authentication status dan redirect jika diperlukan
 */
function checkAuthentication() {
  const currentPage = normalizePagePath(window.location.pathname);
  const authStore = getAuthStore();

  console.log("Auth guard checking page:", currentPage);

  if (isProtectedPage(currentPage) && !hasSessionHint()) {
    console.log("Session hint missing, redirecting to signin");
    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    window.location.href = "/signin.html";
    return;
  }

  if (authStore?.sessionState === "verification_failed") {
    console.log("Auth verification failed at startup, keeping protected UI in restricted mode");
  }

  updateAlpineAuthStore();

  console.log("Auth guard check completed");
}

/**
 * Check if current page requires authentication
 * @param {string} page - Page path
 * @returns {boolean} - True if page is protected
 */
function isProtectedPage(page) {
  return isProtectedRolePage(page);
}

/**
 * Update Alpine.js auth store with current user data
 */
function updateAlpineAuthStore() {
  const authStore = getAuthStore();

  if (authStore?.sessionState === "verification_failed") {
    return;
  }

  if (authStore?.isAuthenticated !== true) {
    return;
  }
}

/**
 * Redirect to login page
 * @param {string} returnUrl - URL to return to after login
 */
function redirectToLogin(returnUrl = null) {
  if (returnUrl) {
    sessionStorage.setItem("redirectAfterLogin", returnUrl);
  }
  window.location.href = "/signin.html";
}

/**
 * Redirect to dashboard
 */
function redirectToDashboard() {
  window.location.href = "/index.html";
}

/**
 * Check if user has permission for specific action
 * @param {string} permission - Permission to check
 * @returns {boolean} - True if user has permission
 */
function hasPermission(permission) {
  const authStore = getAuthStore();

  if (authStore?.sessionState === "verification_failed") {
    return false;
  }

  if (!hasSessionHint()) {
    return false;
  }

  if (authStore?.isAuthenticated !== true || !authStore.user?.permissions) {
    return false;
  }

  return authStore.user.permissions.includes(permission);
}

/**
 * Guard untuk fungsi yang memerlukan permission tertentu
 * @param {string} permission - Permission yang diperlukan
 * @param {Function} callback - Fungsi yang akan dijalankan jika ada permission
 * @param {Function} onDenied - Fungsi yang dijalankan jika tidak ada permission
 */
function requirePermission(permission, callback, onDenied = null) {
  const authStore = getAuthStore();

  if (authStore?.sessionState === "verification_failed") {
    if (onDenied) {
      onDenied();
    } else {
      alert("Sesi belum bisa diverifikasi. Coba lagi saat koneksi atau server sudah stabil.");
    }
    return;
  }

  if (!hasSessionHint()) {
    redirectToLogin();
    return;
  }

  if (!hasPermission(permission)) {
    if (onDenied) {
      onDenied();
    } else {
      alert("Anda tidak memiliki permission untuk melakukan aksi ini.");
    }
    return;
  }

  callback();
}

// Export functions
const AuthGuard = {
  init: initAuthGuard,
  checkAuthentication,
  isProtectedPage,
  redirectToLogin,
  redirectToDashboard,
  hasPermission,
  requirePermission,
};

export {
  initAuthGuard,
  checkAuthentication,
  isProtectedPage,
  redirectToLogin,
  redirectToDashboard,
  hasPermission,
  requirePermission,
};

export default AuthGuard;

// Untuk penggunaan global di browser
if (typeof window !== "undefined") {
  window.AuthGuard = AuthGuard;
}

