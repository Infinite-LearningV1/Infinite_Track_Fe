/**
 * Signin Form Handler
 * Menangani logika form login dan integrasi dengan Alpine.js store
 */

import {
  login,
  hasSessionHint,
  resolveBootstrapSession,
} from "../services/authService.js";
import {
  clearAuthRedirectNotice,
  readAuthRedirectNotice,
} from "../services/authSessionRuntime.js";

function showAuthRedirectNotice() {
  const redirectNotice = readAuthRedirectNotice(window.sessionStorage);

  if (
    !redirectNotice?.message ||
    typeof window.showInlineAlert !== "function"
  ) {
    return;
  }

  const requestedTimeout = Number(redirectNotice.timeoutMs) || 4000;
  let timeoutMs = requestedTimeout;

  if (redirectNotice.reason === "inactivity_expired") {
    timeoutMs = Math.max(requestedTimeout, 6000);
  }

  clearAuthRedirectNotice(window.sessionStorage);
  window.showInlineAlert({
    type: redirectNotice.type || "warning",
    title: redirectNotice.title || "Perlu Login",
    message: redirectNotice.message,
    timeoutMs,
  });
}

/**
 * Initialize signin form handler
 * Menginisialisasi event listeners dan validasi form
 */
function initSigninHandler() {
  showAuthRedirectNotice();

  // Tunggu hingga DOM fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupSigninForm);
  } else {
    setupSigninForm();
  }
}

/**
 * Setup signin form dengan event listeners
 */
function setupSigninForm() {
  showAuthRedirectNotice();

  const form = document.querySelector("form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.querySelector(
    'input[type="password"], input[x-bind\\:type]',
  );
  const submitButton = document.querySelector(
    'button[type="submit"], form button:last-of-type',
  );
  const rememberMeCheckbox = document.getElementById("checkboxLabelOne");

  // Pastikan elemen form ditemukan
  if (!form || !emailInput || !passwordInput || !submitButton) {
    console.error(
      "Form elements not found. Make sure the signin form has the correct structure.",
    );
    return;
  }

  // Cek apakah form menggunakan Alpine.js (x-data attribute)
  // Jika ya, jangan setup DOM handler untuk mencegah duplicate
  if (form.hasAttribute("x-data")) {
    console.log(
      "Alpine.js form detected, skipping DOM form handler setup to prevent duplicates",
    );

    // Hanya setup real-time validation dan auto-fill, tapi tidak form submission
    setupFormUtilities(emailInput, passwordInput, rememberMeCheckbox);
    return;
  }
  // Tambahkan name dan id untuk password input jika belum ada
  if (!passwordInput.name) {
    passwordInput.name = "password";
  }
  if (!passwordInput.id) {
    passwordInput.id = "password";
  }

  // Set type submit untuk button jika belum ada
  if (!submitButton.type) {
    submitButton.type = "submit";
  }

  // Tambahkan container untuk error messages jika belum ada
  let errorContainer = form.querySelector(".signin-error-container");
  if (!errorContainer) {
    errorContainer = document.createElement("div");
    errorContainer.className = "signin-error-container mb-4";
    form.insertBefore(errorContainer, form.firstChild);
  }

  // Event listener untuk form submission (hanya untuk non-Alpine.js forms)
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

    // Validasi input terlebih dahulu - jika gagal, jangan lanjut ke API
    if (!validateForm(email, password)) {
      return; // Stop eksekusi jika validasi gagal
    }

    // Disable submit button dan tampilkan loading hanya setelah validasi berhasil
    setLoadingState(true);

    try {
      // Panggil fungsi login dari authService
      const userData = await login(email, password);

      // Login berhasil
      console.log("Login successful:", userData);

      // Update Alpine.js store jika tersedia
      updateAlpineStore(userData);

      // Simpan preferensi remember me
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedEmail");
      }

      // Redirect ke dashboard atau halaman yang sesuai
      redirectAfterLogin({ loginJustSucceeded: true, loginUser: userData });
    } catch (error) {
      // Login gagal setelah validasi berhasil - tampilkan error dari server
      console.error("Login failed:", error.message);
      showError(error.message);
    } finally {
      // Restore submit button
      setLoadingState(false);
    }
  });

  // Setup utilities (real-time validation, auto-fill)
  setupFormUtilities(emailInput, passwordInput, rememberMeCheckbox);
}

/**
 * Setup form utilities (validation, auto-fill) tanpa form submission handler
 * Digunakan untuk Alpine.js forms dan regular forms
 * @param {HTMLElement} emailInput - Email input element
 * @param {HTMLElement} passwordInput - Password input element
 * @param {HTMLElement} rememberMeCheckbox - Remember me checkbox element
 */
function setupFormUtilities(emailInput, passwordInput, rememberMeCheckbox) {
  // Event listeners untuk validasi real-time (hanya untuk non-Alpine.js)
  // Alpine.js forms memiliki validasi sendiri
  if (!emailInput.hasAttribute("x-model")) {
    emailInput.addEventListener("blur", () => {
      validateEmail(emailInput.value.trim());
    });
  }

  if (!passwordInput.hasAttribute("x-model")) {
    passwordInput.addEventListener("blur", () => {
      validatePassword(passwordInput.value);
    });
  }

  // Auto-fill email jika ada di localStorage (remember me)
  const savedEmail = localStorage.getItem("rememberedEmail");
  if (savedEmail && emailInput.value === "") {
    emailInput.value = savedEmail;

    // Update Alpine.js model jika ada
    if (emailInput.hasAttribute("x-model")) {
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  // Set remember me checkbox jika ada di localStorage
  const rememberMePreference = localStorage.getItem("rememberMe");
  if (rememberMePreference === "true" && rememberMeCheckbox) {
    rememberMeCheckbox.checked = true;

    // Update Alpine.js model jika ada
    if (rememberMeCheckbox.hasAttribute("x-model")) {
      rememberMeCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

/**
 * Validasi form input
 * @param {string} email - Email input
 * @param {string} password - Password input
 * @param {boolean} skipDOMErrorDisplay - Skip DOM error display (untuk Alpine.js)
 * @returns {boolean} - True jika valid
 */
function validateForm(email, password, skipDOMErrorDisplay = false) {
  // Clear previous errors first hanya jika tidak skip DOM
  if (!skipDOMErrorDisplay) {
    clearError();
  }

  console.log("Starting validation for email:", email);

  // Validasi email terlebih dahulu
  if (!validateEmail(email, skipDOMErrorDisplay)) {
    console.log("Email validation failed");
    return false; // Stop validation jika email tidak valid
  }

  console.log("Email validation passed, checking password");

  // Validasi password hanya jika email valid
  if (!validatePassword(password, skipDOMErrorDisplay)) {
    console.log("Password validation failed");
    return false; // Stop validation jika password tidak valid
  }

  console.log("All validation passed, proceeding to API call");
  return true; // Semua validasi berhasil
}

/**
 * Validasi email
 * @param {string} email - Email untuk divalidasi
 * @param {boolean} skipDOMErrorDisplay - Skip DOM error display (untuk Alpine.js)
 * @returns {boolean} - True jika valid
 */
function validateEmail(email, skipDOMErrorDisplay = false) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    if (!skipDOMErrorDisplay) {
      showError("Email harus diisi");
    }
    return false;
  }

  if (!emailRegex.test(email)) {
    if (!skipDOMErrorDisplay) {
      showError("Format email tidak valid");
    }
    return false;
  }

  return true;
}

/**
 * Validasi password
 * @param {string} password - Password untuk divalidasi
 * @param {boolean} skipDOMErrorDisplay - Skip DOM error display (untuk Alpine.js)
 * @returns {boolean} - True jika valid
 */
function validatePassword(password, skipDOMErrorDisplay = false) {
  if (!password) {
    if (!skipDOMErrorDisplay) {
      showError("Password harus diisi");
    }
    return false;
  }

  if (password.length < 6) {
    if (!skipDOMErrorDisplay) {
      showError("Password minimal 6 karakter");
    }
    return false;
  }

  return true;
}

/**
 * Tampilkan pesan error
 * @param {string} message - Pesan error
 */
function showError(message) {
  const errorContainer = document.querySelector(".signin-error-container");
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
          <span class="text-sm font-medium">${message}</span>
        </div>
      </div>
    `;
  }
}

/**
 * Clear pesan error
 */
function clearError() {
  const errorContainer = document.querySelector(".signin-error-container");
  if (errorContainer) {
    errorContainer.innerHTML = "";
  }
}

/**
 * Set loading state untuk form
 * @param {boolean} isLoading - Status loading
 */
function setLoadingState(isLoading) {
  const submitButton = document.querySelector(
    'form button[type="submit"], form button:last-of-type',
  );
  const emailInput = document.getElementById("email");
  const passwordInput = document.querySelector(
    '#password, input[name="password"]',
  );

  if (submitButton) {
    if (isLoading) {
      submitButton.disabled = true;
      submitButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Signing In...
      `;
    } else {
      submitButton.disabled = false;
      submitButton.innerHTML = "Sign In";
    }
  }

  // Disable/enable input fields
  if (emailInput) emailInput.disabled = isLoading;
  if (passwordInput) passwordInput.disabled = isLoading;
}

/**
 * Update Alpine.js store dengan data user
 * @param {Object} userData - Data user dari login
 */
function updateAlpineStore(userData) {
  // Cek apakah Alpine.js tersedia
  if (typeof Alpine !== "undefined" && Alpine.store) {
    // Update auth store dengan method yang tepat
    if (Alpine.store("auth")) {
      Alpine.store("auth").setUser(userData);
      console.log("Alpine.js auth store updated with user data");
    } else {
      console.warn("Auth store not found in Alpine.js");
    }
  } else {
    console.warn("Alpine.js not found. User data not synced to store.");
  }
}

const DASHBOARD_HOME_ROLES = new Set(["Admin", "Management"]);
const HARD_DENY_DASHBOARD_ROLES = new Set(["Employee", "Internship"]);
const SUPPORTED_ROLE_REDIRECTS = new Set([
  ...DASHBOARD_HOME_ROLES,
  ...HARD_DENY_DASHBOARD_ROLES,
]);

function resolveStoredRedirectTarget(redirectValue) {
  if (!redirectValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(redirectValue, window.location.origin);

    if (parsedUrl.origin !== window.location.origin) {
      console.warn("Ignoring cross-origin redirectAfterLogin target");
      return null;
    }

    return {
      targetHref: `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
      pathname: parsedUrl.pathname,
      searchParams: parsedUrl.searchParams,
    };
  } catch (error) {
    console.warn(
      "Invalid redirectAfterLogin value, ignoring redirect target",
      error,
    );
    return null;
  }
}

function isKnownStaleProfileRedirect(
  redirectTarget,
  { currentTabRedirectUrl = null } = {},
) {
  if (redirectTarget?.pathname !== "/profile.html") {
    return false;
  }

  if (redirectTarget.searchParams?.get("from") === "stale-login") {
    return true;
  }

  const currentTabRedirectTarget = resolveStoredRedirectTarget(
    currentTabRedirectUrl,
  );
  const isCurrentTabIntentionalProfileRedirect =
    currentTabRedirectTarget?.pathname === "/profile.html" &&
    currentTabRedirectTarget.targetHref === redirectTarget.targetHref;

  if (isCurrentTabIntentionalProfileRedirect) {
    return false;
  }

  return !currentTabRedirectUrl && !redirectTarget.searchParams?.size;
}

function shouldSkipStoredRedirectForRole(
  redirectTarget,
  userData,
  redirectContext = {},
) {
  if (!redirectTarget || !userData?.role_name) {
    return false;
  }

  return (
    DASHBOARD_HOME_ROLES.has(userData.role_name) &&
    isKnownStaleProfileRedirect(redirectTarget, redirectContext)
  );
}

function isDashboardRedirectPath(pathname) {
  return (
    pathname === "/" || pathname === "/index" || pathname === "/index.html"
  );
}

function shouldHardDenyDashboardTarget(redirectTarget, userData) {
  if (!redirectTarget || !userData?.role_name) {
    return false;
  }

  return (
    HARD_DENY_DASHBOARD_ROLES.has(userData.role_name) &&
    isDashboardRedirectPath(redirectTarget.pathname)
  );
}

/**
 * Redirect user setelah login berhasil
 */
function hasSupportedRoleRedirect(userRole) {
  return SUPPORTED_ROLE_REDIRECTS.has(userRole);
}

async function redirectAfterLogin({
  loginJustSucceeded = false,
  loginUser = null,
} = {}) {
  const { redirectBasedOnRole, showAccessDenied } =
    window.RoleBasedAccess || {};

  let verifiedUser = null;

  if (hasSessionHint()) {
    try {
      const resolution = await resolveBootstrapSession();
      if (resolution.state === "authenticated") {
        verifiedUser = resolution.user || null;
      } else if (!loginJustSucceeded) {
        return;
      }
    } catch (error) {
      console.warn(
        "Bootstrap session resolution failed before redirect",
        error,
      );
      if (!loginJustSucceeded) {
        return;
      }
    }
  }

  const userData = verifiedUser || loginUser || null;
  const currentTabRedirectUrl = sessionStorage.getItem("redirectAfterLogin");
  const sharedRedirectUrl = localStorage.getItem("redirectAfterLogin");
  const redirectUrl = currentTabRedirectUrl || sharedRedirectUrl;
  const redirectTarget = resolveStoredRedirectTarget(redirectUrl);

  if (redirectTarget) {
    localStorage.removeItem("redirectAfterLogin");
    sessionStorage.removeItem("redirectAfterLogin");

    if (shouldHardDenyDashboardTarget(redirectTarget, userData)) {
      if (typeof showAccessDenied === "function") {
        showAccessDenied(userData.role_name, {
          keepCurrentLocation: true,
          primaryAction: "redirect",
        });
        return;
      }

      if (userData?.role_name && redirectBasedOnRole) {
        redirectBasedOnRole(userData.role_name);
        return;
      }

      window.location.href = "/signin.html";
      return;
    }

    const hasPageAccessForUser = window.RoleBasedAccess?.hasPageAccessForUser;
    const shouldSkipStoredRedirect = shouldSkipStoredRedirectForRole(
      redirectTarget,
      userData,
      { currentTabRedirectUrl },
    );

    if (userData?.role_name && typeof hasPageAccessForUser === "function") {
      const hasAccess = hasPageAccessForUser(redirectTarget.pathname, userData);

      if (!shouldSkipStoredRedirect && hasAccess) {
        window.location.href = redirectTarget.targetHref;
        return;
      }

      console.log(
        `User role ${userData.role_name} doesn't have access to ${redirectTarget.pathname}, redirecting based on role`,
      );
    } else {
      console.warn(
        "Skipping stored redirectAfterLogin target because RBAC user access check is unavailable",
      );
    }

    if (
      userData?.role_name &&
      redirectBasedOnRole &&
      hasSupportedRoleRedirect(userData.role_name)
    ) {
      redirectBasedOnRole(userData.role_name);
      return;
    }

    if (userData?.role_name && typeof showAccessDenied === "function") {
      showAccessDenied(userData.role_name, {
        keepCurrentLocation: true,
        primaryAction: "close",
      });
      return;
    }
  }

  if (
    userData?.role_name &&
    redirectBasedOnRole &&
    hasSupportedRoleRedirect(userData.role_name)
  ) {
    console.log(
      `Redirecting user with role ${userData.role_name} to appropriate page`,
    );
    redirectBasedOnRole(userData.role_name);
    return;
  }

  if (userData?.role_name && typeof showAccessDenied === "function") {
    showAccessDenied(userData.role_name, {
      keepCurrentLocation: true,
      primaryAction: "close",
    });
    return;
  }

  window.location.href = "/index.html";
}

/**
 * Handle login submit yang bisa dipanggil dari Alpine.js atau HTML
 * @param {Object} formData - Data form {email, password, rememberMe}
 * @param {boolean} skipDOMErrorDisplay - Skip DOM error display (untuk Alpine.js)
 */
async function handleLoginSubmit(formData, skipDOMErrorDisplay = false) {
  const { email, password, rememberMe } = formData;

  // Validasi input terlebih dahulu - jika gagal, return error yang spesifik
  let validationError = null;

  // Validasi email
  if (!email) {
    validationError = "Email harus diisi";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    validationError = "Format email tidak valid";
  }

  // Validasi password jika email valid
  if (!validationError) {
    if (!password) {
      validationError = "Password harus diisi";
    } else if (password.length < 6) {
      validationError = "Password minimal 6 karakter";
    }
  }

  // Jika ada error validasi
  if (validationError) {
    // Tampilkan error di DOM jika bukan dari Alpine.js
    if (!skipDOMErrorDisplay) {
      showError(validationError);
    }
    return { success: false, error: validationError };
  }

  // Set loading state hanya setelah validasi berhasil
  if (!skipDOMErrorDisplay) {
    setLoadingState(true);
  }

  try {
    // Panggil fungsi login dari authService
    const userData = await login(email, password);

    // Login berhasil
    console.log("Login successful:", userData);

    // Update Alpine.js store jika tersedia
    updateAlpineStore(userData);

    // Simpan preferensi remember me
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("rememberedEmail");
    }

    return { success: true, data: userData };
  } catch (error) {
    // Login gagal setelah validasi berhasil
    console.error("Login failed:", error.message);

    // Hanya tampilkan DOM error jika tidak dipanggil dari Alpine.js
    if (!skipDOMErrorDisplay) {
      showError(error.message);
    }

    return { success: false, error: error.message };
  } finally {
    // Restore submit button hanya jika bukan dari Alpine.js
    if (!skipDOMErrorDisplay) {
      setLoadingState(false);
    }
  }
}

/**
 * Fungsi untuk digunakan dari outside module
 */
const SigninHandler = {
  init: initSigninHandler,
  showError,
  clearError,
  setLoadingState,
  handleLoginSubmit,
  redirectAfterLogin,
  shouldSkipStoredRedirectForRole,
};

// Export untuk penggunaan sebagai module
export {
  initSigninHandler,
  showError,
  clearError,
  setLoadingState,
  handleLoginSubmit,
  shouldSkipStoredRedirectForRole,
};
export default SigninHandler;

// Untuk penggunaan global di browser
if (typeof window !== "undefined") {
  window.SigninHandler = SigninHandler;
  window.handleLoginSubmit = handleLoginSubmit;
}

// Auto-initialize jika script dimuat langsung
if (typeof window !== "undefined" && document.readyState !== "loading") {
  // Delay sedikit untuk memastikan Alpine.js sudah loaded
  setTimeout(initSigninHandler, 100);
} else if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initSigninHandler, 100);
  });
}
