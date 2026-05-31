/**
 * Environment Configuration
 * Mengakses environment variables yang telah diinjeksi oleh webpack
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || "/api",
  AUTH_ENDPOINT: process.env.API_AUTH_ENDPOINT || "/auth",
  VERSION: process.env.API_VERSION || "v1",

  // Computed URLs
  get AUTH_URL() {
    return `${this.BASE_URL}${this.AUTH_ENDPOINT}`;
  },

  get LOGIN_URL() {
    return `${this.AUTH_URL}/login`;
  },

  get LOGOUT_URL() {
    return `${this.AUTH_URL}/logout`;
  },

  get REGISTER_URL() {
    return `${this.AUTH_URL}/register`;
  },

  get PROFILE_URL() {
    return `${this.AUTH_URL}/profile`;
  },
};

// Application Configuration
export const APP_CONFIG = {
  NAME: process.env.APP_NAME || "Infinite Track",
  VERSION: process.env.APP_VERSION || "2.0.1",
  ENVIRONMENT: process.env.APP_ENVIRONMENT || "development",

  // Helper methods
  isDevelopment: () => APP_CONFIG.ENVIRONMENT === "development",
  isProduction: () => APP_CONFIG.ENVIRONMENT === "production",
  isTest: () => APP_CONFIG.ENVIRONMENT === "test",
};

// Authentication Configuration
export const AUTH_CONFIG = {
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT) || 3600000, // 1 hour in ms
  REMEMBER_ME_DAYS: parseInt(process.env.REMEMBER_ME_DAYS) || 7,

  // Storage keys
  STORAGE_KEYS: {
    USER_DATA: "userData",
    AUTH_TOKEN: "authToken",
    REMEMBER_ME: "rememberMe",
    REMEMBERED_EMAIL: "rememberedEmail",
    REDIRECT_AFTER_LOGIN: "redirectAfterLogin",
  },
};

// Localization Configuration
export const LOCALE_CONFIG = {
  DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE || "id",
  TIMEZONE: process.env.TIMEZONE || "Asia/Jakarta",
};

// Debug Configuration
export const DEBUG_CONFIG = {
  MODE: process.env.DEBUG_MODE === "true",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // Helper methods
  shouldLog: (level) => {
    const levels = ["error", "warn", "info", "debug"];
    const currentLevelIndex = levels.indexOf(DEBUG_CONFIG.LOG_LEVEL);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex <= currentLevelIndex;
  },
};

// Utility function untuk logging dengan level check
export const envLog = (level, ...args) => {
  if (DEBUG_CONFIG.shouldLog(level)) {
    console[level](`[${APP_CONFIG.NAME}]`, ...args);
  }
};

// Export semua konfigurasi sebagai satu object
export const ENV = {
  API: API_CONFIG,
  APP: APP_CONFIG,
  AUTH: AUTH_CONFIG,
  LOCALE: LOCALE_CONFIG,
  DEBUG: DEBUG_CONFIG,
  log: envLog,
};

// Default export
export default ENV;

// Log konfigurasi saat development
if (APP_CONFIG.isDevelopment()) {
  envLog("info", "Environment Configuration Loaded:", {
    API_BASE_URL: API_CONFIG.BASE_URL,
    APP_ENVIRONMENT: APP_CONFIG.ENVIRONMENT,
    DEBUG_MODE: DEBUG_CONFIG.MODE,
  });
}
