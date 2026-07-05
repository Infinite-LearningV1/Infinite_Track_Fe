/**
 * User Storage Utility
 * Mengelola penyimpanan dan pengambilan data pengguna dari localStorage
 */

import { AUTH_CONFIG, envLog } from "../config/env.js";

const LEGACY_USER_KEYS = ["user", "currentUserData"];
const LEGACY_TOKEN_KEYS = ["auth_token"];
const SESSION_STORAGE_KEYS = ["redirectAfterLogin", "sessionVerificationState", "authRedirectNotice"];
const USER_IDENTITY_KEYS = [
  "id",
  "email",
  "role_name",
  "full_name",
  "fullName",
  "username",
  "name",
];

function isObjectRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeUserRecord(value) {
  return (
    isObjectRecord(value) &&
    USER_IDENTITY_KEYS.some((key) => {
      const candidate = value[key];
      return typeof candidate === "string" || typeof candidate === "number";
    })
  );
}

function parseStoredJson(value, key = "auth storage") {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    envLog("warn", `Invalid JSON in ${key}:`, error.message);
    return null;
  }
}

function getAuthPayloadData(payload) {
  return payload?.data && typeof payload.data === "object" ? payload.data : payload;
}

function extractAuthUser(payload) {
  const data = getAuthPayloadData(payload);

  if (!data || typeof data !== "object") {
    return null;
  }

  if (looksLikeUserRecord(data.user)) {
    return data.user;
  }

  if (looksLikeUserRecord(data)) {
    return data;
  }

  if (looksLikeUserRecord(payload?.user)) {
    return payload.user;
  }

  return null;
}

function extractAuthToken(payload) {
  const data = getAuthPayloadData(payload);
  const user = extractAuthUser(payload);

  return (
    data?.accessToken ||
    data?.access_token ||
    data?.token ||
    payload?.accessToken ||
    payload?.access_token ||
    payload?.token ||
    user?.accessToken ||
    user?.access_token ||
    user?.token ||
    null
  );
}

/**
 * Menyimpan data pengguna ke localStorage
 * @param {Object} userData - Objek data pengguna yang akan disimpan
 * @returns {boolean} - true jika berhasil, false jika gagal
 */
function saveUserToStorage(userData) {
  try {
    if (!looksLikeUserRecord(userData)) {
      envLog("error", "saveUserToStorage: userData harus berupa user record yang valid");
      return false;
    }

    const userDataString = JSON.stringify(userData);
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA, userDataString);
    envLog("debug", "User data saved to storage");
    return true;
  } catch (error) {
    envLog("error", "Error saving user data to localStorage:", error);
    return false;
  }
}

/**
 * Mengambil data pengguna dari localStorage
 * @returns {Object|null} - Objek data pengguna atau null jika tidak ada/error
 */
function getUserFromStorage() {
  try {
    const userData = parseStoredJson(
      localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA),
      AUTH_CONFIG.STORAGE_KEYS.USER_DATA,
    );

    if (looksLikeUserRecord(userData)) {
      envLog("debug", "User data retrieved from storage");
      return userData;
    }

    for (const key of LEGACY_USER_KEYS) {
      const legacyUser = parseStoredJson(localStorage.getItem(key), key);
      if (looksLikeUserRecord(legacyUser)) {
        envLog("debug", "Legacy user data retrieved from storage");
        return legacyUser;
      }
    }

    return null;
  } catch (error) {
    envLog("error", "Error parsing user data from localStorage:", error);
    return null;
  }
}

/**
 * Menghapus data pengguna dari localStorage
 * @returns {boolean} - true jika berhasil, false jika gagal
 */
function removeUserFromStorage() {
  return clearAuthStorage({ includeSessionStorage: false });
}

function saveAuthPayload(payload) {
  const user = extractAuthUser(payload);
  const token = extractAuthToken(payload);
  let savedUser = false;
  let savedToken = false;

  if (user) {
    savedUser = saveUserToStorage(user);
  }

  if (token) {
    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
    savedToken = true;
  }

  return { user, token, savedUser, savedToken };
}

function getAuthTokenFromStorage() {
  try {
    const canonicalToken = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    if (canonicalToken) {
      return canonicalToken;
    }

    for (const key of LEGACY_TOKEN_KEYS) {
      const legacyToken = localStorage.getItem(key);
      if (legacyToken) {
        return legacyToken;
      }
    }

    const userData = getUserFromStorage();
    return userData?.accessToken || userData?.access_token || userData?.token || null;
  } catch (error) {
    envLog("error", "Error reading auth token from localStorage:", error);
    return null;
  }
}

function hasSessionHint() {
  return Boolean(getUserFromStorage() || getAuthTokenFromStorage());
}

function clearAuthStorage(options = {}) {
  try {
    const preserveRedirectAfterLogin =
      typeof options.preserveRedirectAfterLogin === "string" &&
      options.preserveRedirectAfterLogin.length > 0
        ? options.preserveRedirectAfterLogin
        : null;
    const includeSessionStorage = options.includeSessionStorage !== false;
    const sessionStorageRef =
      typeof window !== "undefined"
        ? window.sessionStorage
        : typeof globalThis !== "undefined"
          ? globalThis.sessionStorage
          : undefined;

    [
      ...Object.values(AUTH_CONFIG.STORAGE_KEYS),
      ...LEGACY_USER_KEYS,
      ...LEGACY_TOKEN_KEYS,
    ].forEach((key) => {
      localStorage.removeItem(key);
    });

    if (includeSessionStorage && sessionStorageRef) {
      SESSION_STORAGE_KEYS.forEach((key) => {
        if (key === AUTH_CONFIG.STORAGE_KEYS.REDIRECT_AFTER_LOGIN && preserveRedirectAfterLogin) {
          return;
        }

        sessionStorageRef.removeItem(key);
      });

      if (preserveRedirectAfterLogin) {
        sessionStorageRef.setItem(
          AUTH_CONFIG.STORAGE_KEYS.REDIRECT_AFTER_LOGIN,
          preserveRedirectAfterLogin,
        );
      }
    }

    envLog("debug", "All auth data removed from storage");
    return true;
  } catch (error) {
    envLog("error", "Error removing auth data from storage:", error);
    return false;
  }
}

/**
 * Mengecek apakah ada data pengguna yang tersimpan
 * @returns {boolean} - true jika ada data pengguna, false jika tidak
 */
function hasUserInStorage() {
  try {
    const userData = getUserFromStorage();
    return userData !== null && typeof userData === "object";
  } catch (error) {
    console.error("Error checking user data in localStorage:", error);
    return false;
  }
}

/**
 * Memperbarui sebagian data pengguna di localStorage
 * @param {Object} updatedData - Data yang akan diperbarui
 * @returns {boolean} - true jika berhasil, false jika gagal
 */
function updateUserInStorage(updatedData) {
  try {
    const currentUser = getUserFromStorage();

    if (!currentUser) {
      console.error(
        "updateUserInStorage: Tidak ada data pengguna yang tersimpan",
      );
      return false;
    }

    const mergedData = { ...currentUser, ...updatedData };
    return saveUserToStorage(mergedData);
  } catch (error) {
    console.error("Error updating user data in localStorage:", error);
    return false;
  }
}

// Export fungsi untuk penggunaan sebagai module
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    saveUserToStorage,
    getUserFromStorage,
    removeUserFromStorage,
    saveAuthPayload,
    getAuthTokenFromStorage,
    hasSessionHint,
    clearAuthStorage,
    hasUserInStorage,
    updateUserInStorage,
  };
}

// Untuk penggunaan global di browser
if (typeof window !== "undefined") {
  window.UserStorage = {
    saveUserToStorage,
    getUserFromStorage,
    removeUserFromStorage,
    saveAuthPayload,
    getAuthTokenFromStorage,
    hasSessionHint,
    clearAuthStorage,
    hasUserInStorage,
    updateUserInStorage,
  };
}

export {
  saveUserToStorage,
  getUserFromStorage,
  removeUserFromStorage,
  saveAuthPayload,
  getAuthTokenFromStorage,
  hasSessionHint,
  clearAuthStorage,
  hasUserInStorage,
  updateUserInStorage,
};
