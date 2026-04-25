/**
 * Authentication Guard
 * Middleware untuk mengecek autentikasi dan redirect jika diperlukan
 */

import { getCurrentUser, hasSessionHint } from "../services/authService.js";

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
  const currentPath = window.location.pathname;
  const currentPage = getCurrentPageFromPath(currentPath);
  const authStore = getAuthStore();

  console.log("Auth guard checking page:", currentPage);

  if (authStore?.sessionState === "verification_failed") {
    console.log("Auth verification failed at startup, skipping auth guard enforcement");
    return;
  }

  // Jika di halaman protected dan tidak ada indikasi sesi, redirect ke signin
  if (isProtectedPage(currentPage) && !hasSessionHint()) {
    console.log("Session hint missing, redirecting to signin");

    // Simpan current URL untuk redirect setelah login
    sessionStorage.setItem("redirectAfterLogin", window.location.href);

    window.location.href = "/signin.html";
    return;
  }

  // Sync Alpine store jika user tersedia
  if (getCurrentUser()) {
    updateAlpineAuthStore();
  }

  console.log("Auth guard check completed");
}

/**
 * Get current page from URL path
 * @param {string} path - URL path
 * @returns {string} - Normalized page path
 */
function getCurrentPageFromPath(path) {
  // Handle root path
  if (path === "/" || path === "") {
    return "/index.html";
  }

  // Handle paths without .html extension
  if (!path.includes(".") && !path.endsWith("/")) {
    return path + ".html";
  }

  // Handle paths ending with /
  if (path.endsWith("/")) {
    return path + "index.html";
  }

  return path;
}

/**
 * Check if current page requires authentication
 * @param {string} page - Page path
 * @returns {boolean} - True if page is protected
 */
function isProtectedPage(page) {
  const protectedPages = [
    "/index.html",
    "/profile.html",
    "/management-user.html",
    "/management-booking.html",
    "/management-attendance.html",
    "/calendar.html",
    "/form-user.html",
    "/alerts.html",
    "/badge.html",
    "/buttons.html",
    "/blank.html",
  ];

  return protectedPages.includes(page);
}

/**
 * Update Alpine.js auth store with current user data
 */
function updateAlpineAuthStore() {
  const authStore = getAuthStore();

  if (authStore?.sessionState === "verification_failed") {
    return;
  }

  const userData = getCurrentUser();
  if (authStore && userData) {
    authStore.setUser(userData);
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

  const userData = authStore?.user ?? getCurrentUser();
  if (!userData || !userData.permissions) {
    return false;
  }

  return userData.permissions.includes(permission);
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

