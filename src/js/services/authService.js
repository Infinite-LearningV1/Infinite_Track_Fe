/**
 * Authentication API Service
 * Mengenkapsulasi logika panggilan API untuk autentikasi
 */

import axios from "axios";
import {
  saveUserToStorage,
  removeUserFromStorage,
} from "../utils/storageManager.js";
import { API_CONFIG, envLog } from "../config/env.js";
import {
  classifyAuthFailure,
  clearAuthArtifacts,
  createBootstrapSessionResolver,
  persistAuthRedirectNotice,
  readStoredSessionSnapshot,
} from "./authSessionRuntime.js";

// Konfigurasi axios default
axios.defaults.withCredentials = true; // Mengizinkan pengiriman cookie

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
    const response = await axios.post(API_CONFIG.LOGIN_URL, {
      email,
      password,
    });

    // Periksa response dari backend
    if (response.data && response.data.success === true) {
      const userData = response.data.data;

      // Simpan data pengguna ke localStorage (opsional, bisa dilakukan di signinHandler juga)
      saveUserToStorage(userData);

      return userData;
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

    const response = await axios.get(url);

    if (
      response.data &&
      (response.data.success === true || response.status === 200)
    ) {
      const userData = response.data.data || response.data;

      // Update data pengguna di localStorage
      saveUserToStorage(userData);

      return userData;
    } else {
      throw new Error(
        response.data?.message || "Gagal mengambil data pengguna",
      );
    }
  } catch (error) {
    if (error.response) {
      const statusCode = error.response.status;

      if (statusCode === 401) {
        console.error("User not authenticated");
        throw error;
      } else {
        const errorMessage =
          error.response.data?.message || "Gagal mengambil data pengguna";
        console.error(`Fetch user error (${statusCode}):`, errorMessage);
        throw new Error(errorMessage);
      }
    } else if (error.request) {
      console.error("Network error during fetch user:", error.request);
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      console.error("Fetch user error:", error.message);
      throw new Error(error.message);
    }
  }
}

function buildAuthRequestHeaders() {
  const snapshot = readStoredSessionSnapshot(window.localStorage);

  if (!snapshot?.token) {
    return {};
  }

  return {
    Authorization: `Bearer ${snapshot.token}`,
  };
}

async function forceReauthenticate(options = {}) {
  const authStore = window.Alpine?.store?.("auth") || null;
  const preserveRedirectAfterLogin = options?.preserveRedirectAfterLogin;
  const redirectToPreserve =
    typeof preserveRedirectAfterLogin === "string" &&
    preserveRedirectAfterLogin.length > 0
      ? preserveRedirectAfterLogin
      : window.sessionStorage?.getItem("redirectAfterLogin") || null;
  const redirectNotice =
    options?.redirectNotice && typeof options.redirectNotice === "object"
      ? options.redirectNotice
      : null;

  clearAuthArtifacts(window.localStorage, window.sessionStorage, {
    preserveRedirectAfterLogin: redirectToPreserve,
  });

  if (redirectNotice) {
    persistAuthRedirectNotice(redirectNotice, window.sessionStorage);
  }

  removeUserFromStorage();

  if (authStore) {
    authStore.user = null;
    authStore.isAuthenticated = false;
    authStore.sessionState = "unauthenticated";
    authStore.error = null;
    authStore.isLoading = false;
  }

  window.location.href = "/signin.html";
}

/**
 * Logout pengguna
 * @returns {Promise<boolean>} - Promise yang resolve dengan true jika berhasil
 */
async function logout() {
  try {
    envLog("debug", "Attempting logout with URL:", API_CONFIG.LOGOUT_URL);
    await axios.post(API_CONFIG.LOGOUT_URL);
    envLog("info", "Logout berhasil di backend");
  } catch (error) {
    envLog(
      "warn",
      "Backend logout failed, proceeding with frontend logout:",
      error.message,
    );
  }

  try {
    clearAuthArtifacts(window.localStorage, window.sessionStorage);
    removeUserFromStorage();

    // Clear cookies manually (fallback)
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie =
        name +
        "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" +
        window.location.hostname;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });

    return true;
  } catch (error) {
    console.error("Logout error:", error.message);

    clearAuthArtifacts(window.localStorage, window.sessionStorage);
    removeUserFromStorage();

    // Return true karena logout lokal tetap berhasil
    return true;
  }
}

function hasSessionHint() {
  return readStoredSessionSnapshot(window.localStorage) !== null;
}

const classifyFailure = classifyAuthFailure;

const resolveBootstrapSession = createBootstrapSessionResolver({
  hasSessionHint,
  fetchCurrentUser,
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
  return readStoredSessionSnapshot(window.localStorage)?.user ?? null;
}

// Export fungsi untuk penggunaan sebagai module
export {
  login,
  fetchCurrentUser,
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
    buildAuthRequestHeaders,
    forceReauthenticate,
    logout,
    hasSessionHint,
    resolveBootstrapSession,
    isAuthenticated,
    getCurrentUser,
  };
}
