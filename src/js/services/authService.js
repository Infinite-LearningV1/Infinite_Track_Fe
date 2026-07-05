/**
 * Authentication API Service
 * Mengenkapsulasi logika panggilan API untuk autentikasi
 */

import axios from "axios";
import {
  clearAuthStorage,
  getUserFromStorage,
  hasSessionHint as hasStoredSessionHint,
  saveAuthPayload,
} from "../utils/storageManager.js";
import { API_CONFIG, AUTH_CONFIG, envLog } from "../config/env.js";
import {
  broadcastAuthSessionClear,
  classifyAuthFailure,
  createBootstrapSessionResolver,
  persistAuthRedirectNotice,
} from "./authSessionRuntime.js";

// Konfigurasi axios default
axios.defaults.withCredentials = true; // Mengizinkan pengiriman cookie
axios.defaults.headers.common[AUTH_CONFIG.CLIENT_TYPE_HEADER] = AUTH_CONFIG.CLIENT_TYPE;

/**
 * Login pengguna
 * @param {string} email - Email pengguna
 * @param {string} password - Password pengguna
 * @returns {Promise<Object>} - Promise yang resolve dengan data pengguna atau reject dengan error
 */
async function login(email, password) {
  try {
    // Validasi input
    if (!email || !password) {
      throw new Error("Email dan password harus diisi");
    }

    envLog("debug", "Attempting login with URL:", API_CONFIG.LOGIN_URL);

    // Kirim request POST ke endpoint login
    const response = await axios.post(
      API_CONFIG.LOGIN_URL,
      {
        email,
        password,
      },
      {
        withCredentials: true,
        headers: AUTH_CONFIG.CLIENT_HEADERS,
      },
    );

    // Periksa response dari backend
    if (response.data && response.data.success === true) {
      const { user } = saveAuthPayload(response.data);

      return user || response.data.data;
    } else {
      // Jika backend mengembalikan success: false
      const errorMessage = response.data.message || "Login gagal";
      throw new Error(errorMessage);
    }
  } catch (error) {
    // Handle berbagai jenis error
    if (error.response) {
      // Error response dari server (4xx, 5xx)
      const errorMessage = error.response.data?.message || "Login gagal";
      const statusCode = error.response.status;

      console.error(`Login error (${statusCode}):`, errorMessage);
      throw new Error(errorMessage);
    } else if (error.request) {
      // Request dibuat tapi tidak ada response (network error)
      console.error("Network error during login:", error.request);
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      // Error lainnya
      console.error("Login error:", error.message);
      throw new Error(error.message);
    }
  }
}

/**
 * Mengambil data pengguna yang sedang login (/auth/me)
 * @returns {Promise<Object>} - Promise yang resolve dengan data pengguna atau reject dengan error
 */
async function fetchCurrentUser() {
  try {
    const url = `${API_CONFIG.AUTH_URL}/me`;
    envLog("info", "GET current user:", url);

    const response = await axios.get(url, {
      withCredentials: true,
      headers: {
        ...AUTH_CONFIG.CLIENT_HEADERS,
        ...buildAuthRequestHeaders(),
      },
    });

    if (response.data?.success !== true) {
      throw createSemanticAuthError(response, "Gagal mengambil data pengguna");
    }

    const { user } = saveAuthPayload(response.data);

    return user || response.data.data || response.data;
  } catch (error) {
    if (error.response) {
      const statusCode = error.response.status;
      const errorMessage =
        error.response.data?.message || "Gagal mengambil data pengguna";
      console.error(`Fetch user error (${statusCode}):`, errorMessage);
      throw error;
    } else if (error.request) {
      console.error("Network error during fetch user:", error.request);
      throw error;
    } else {
      console.error("Fetch user error:", error.message);
      throw error;
    }
  }
}

function createSemanticAuthError(response, fallbackMessage) {
  const error = new Error(response.data?.message || fallbackMessage);
  error.response = {
    status: response.status,
    data: response.data,
  };
  return error;
}

let refreshPromise;

async function executeRefreshSession() {
  const response = await axios.post(
    API_CONFIG.REFRESH_URL,
    {},
    {
      withCredentials: true,
      headers: {
        ...AUTH_CONFIG.CLIENT_HEADERS,
        ...buildAuthRequestHeaders(),
      },
    },
  );

  if (response.data?.success !== true) {
    throw createSemanticAuthError(response, "Refresh session tidak valid");
  }

  saveAuthPayload(response.data);

  return response.data;
}

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = executeRefreshSession().finally(() => {
      refreshPromise = undefined;
    });
  }

  return refreshPromise;
}

function buildAuthRequestHeaders() {
  return {};
}

function getCurrentRedirectTarget() {
  const { pathname, search, hash } = window.location || {};

  if (!pathname || pathname === "/signin.html") {
    return null;
  }

  return `${pathname}${search || ""}${hash || ""}`;
}

function broadcastAuthSessionClearSafely() {
  try {
    broadcastAuthSessionClear(window);
  } catch (error) {
    envLog("warn", "Auth session broadcast failed:", error.message);
  }
}

function clearBrowserAuthCookies() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  document.cookie.split(";").forEach((cookie) => {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie =
      name +
      "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" +
      window.location.hostname;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  });
}

function clearClientAuthState() {
  const storageCleared = clearAuthStorage();
  if (!storageCleared) {
    envLog("warn", "Auth storage cleanup failed during logout");
  }

  broadcastAuthSessionClearSafely();
  return storageCleared;
}

function persistAuthRedirectNoticeSafely(redirectNotice) {
  try {
    persistAuthRedirectNotice(redirectNotice, window.sessionStorage);
  } catch (error) {
    envLog("warn", "Auth redirect notice persistence failed:", error.message);
  }
}

async function forceReauthenticate(options = {}) {
  const redirectToPreserve =
    typeof options?.preserveRedirectAfterLogin === "string" &&
    options.preserveRedirectAfterLogin.length > 0
      ? options.preserveRedirectAfterLogin
      : window.sessionStorage?.getItem("redirectAfterLogin") ||
        getCurrentRedirectTarget();

  const redirectNotice =
    options?.redirectNotice && typeof options.redirectNotice === "object"
      ? options.redirectNotice
      : null;

  const storageCleared = clearAuthStorage({
    preserveRedirectAfterLogin: redirectToPreserve,
  });

  const cleanupError = storageCleared
    ? null
    : "Data sesi di browser gagal dibersihkan.";

  if (!storageCleared) {
    envLog("warn", "Auth storage cleanup failed during forced reauthentication");
  }

  if (redirectNotice) {
    persistAuthRedirectNoticeSafely(redirectNotice);
  }

  broadcastAuthSessionClearSafely();

  if (window.Alpine?.store) {
    const authStore = window.Alpine.store("auth");
    if (authStore) {
      authStore.user = null;
      authStore.isAuthenticated = false;
      authStore.sessionState = "unauthenticated";
      authStore.error = cleanupError;
      authStore.isLoading = false;
    }
  }

  window.location.href = "/signin.html";
  return storageCleared;
}

/**
 * Logout pengguna
 * @returns {Promise<boolean>} - Promise yang resolve dengan true jika berhasil
 */
async function logout() {
  const storageCleared = clearClientAuthState();

  try {
    envLog("debug", "Attempting logout with URL:", API_CONFIG.LOGOUT_URL);
    await axios.post(
      API_CONFIG.LOGOUT_URL,
      {},
      {
        withCredentials: true,
        headers: {
          ...AUTH_CONFIG.CLIENT_HEADERS,
          ...buildAuthRequestHeaders(),
        },
      },
    );
    envLog("info", "Logout berhasil di backend");
  } catch (error) {
    envLog(
      "warn",
      "Backend logout failed after local cleanup, proceeding with frontend logout:",
      error.message,
    );
  }

  try {
    clearBrowserAuthCookies();
    return storageCleared;
  } catch (error) {
    console.error("Logout error:", error.message);
    return false;
  }
}

function hasSessionHint() {
  return hasStoredSessionHint();
}

const classifyFailure = classifyAuthFailure;

const resolveBootstrapSession = createBootstrapSessionResolver({
  hasSessionHint,
  fetchCurrentUser,
  refreshSession,
  classifyFailure,
});

/**
 * Mengecek apakah pengguna sedang login
 * @returns {boolean} - true jika runtime auth store terautentikasi
 */
function isAuthenticated() {
  if (!window.Alpine?.store) {
    return false;
  }

  const authStore = window.Alpine.store("auth");
  return authStore?.isAuthenticated === true;
}

/**
 * Mendapatkan token atau data pengguna dari localStorage
 * @returns {Object|null} - Data pengguna atau null
 */
function getCurrentUser() {
  return getUserFromStorage();
}

// Export fungsi untuk penggunaan sebagai module
export {
  login,
  fetchCurrentUser,
  refreshSession,
  buildAuthRequestHeaders,
  forceReauthenticate,
  logout,
  hasSessionHint,
  resolveBootstrapSession,
  isAuthenticated,
  getCurrentUser,
};

// Untuk penggunaan global di browser
if (typeof window !== "undefined") {
  window.AuthService = {
    login,
    fetchCurrentUser,
    refreshSession,
    buildAuthRequestHeaders,
    forceReauthenticate,
    logout,
    hasSessionHint,
    resolveBootstrapSession,
    isAuthenticated,
    getCurrentUser,
  };
}
