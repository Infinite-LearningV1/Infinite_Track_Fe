/**
 * Role-based Access Control Middleware
 * Middleware untuk validasi hak akses berdasarkan role user
 */

function getAuthStore() {
  if (typeof Alpine === "undefined" || !Alpine.store) {
    return null;
  }

  return Alpine.store("auth");
}

function getVerifiedUser() {
  const authStore = getAuthStore();

  if (authStore?.sessionState === "verification_failed") {
    return null;
  }

  return authStore?.isAuthenticated === true ? authStore.user : null;
}

/**
 * Role definitions
 */
const ROLES = {
  ADMIN: "Admin",
  MANAGEMENT: "Management",
  INTERNSHIP: "Internship",
  EMPLOYEE: "Employee",
};

/**
 * Page access permissions berdasarkan role
 */
const PAGE_PERMISSIONS = {
  "/index.html": [ROLES.ADMIN, ROLES.MANAGEMENT],
  "/management-user.html": [ROLES.ADMIN],
  "/management-booking.html": [ROLES.ADMIN, ROLES.MANAGEMENT],
  "/management-attendance.html": [ROLES.ADMIN, ROLES.MANAGEMENT],
  "/management-backend-settings.html": [ROLES.ADMIN, ROLES.MANAGEMENT],
  "/form-user.html": [ROLES.ADMIN],
  "/profile.html": [
    ROLES.ADMIN,
    ROLES.MANAGEMENT,
    ROLES.INTERNSHIP,
    ROLES.EMPLOYEE,
  ],
  "/calendar.html": [
    ROLES.ADMIN,
    ROLES.MANAGEMENT,
    ROLES.INTERNSHIP,
    ROLES.EMPLOYEE,
  ],
  "/alerts.html": [ROLES.ADMIN, ROLES.MANAGEMENT],
  "/badge.html": [ROLES.ADMIN, ROLES.MANAGEMENT],
  "/buttons.html": [ROLES.ADMIN, ROLES.MANAGEMENT],
  "/blank.html": [ROLES.ADMIN, ROLES.MANAGEMENT],
};

const PROTECTED_PAGES = Object.freeze(Object.keys(PAGE_PERMISSIONS));
const DASHBOARD_ALLOWED_ROLES = new Set([ROLES.ADMIN, ROLES.MANAGEMENT]);
const DASHBOARD_DENIED_ROLES = new Set([ROLES.INTERNSHIP, ROLES.EMPLOYEE]);

function normalizePagePath(path) {
  if (path === "/" || path === "") {
    return "/index.html";
  }

  const pathname = path.startsWith("/") ? path : `/${path}`;

  if (pathname.endsWith("/")) {
    return `${pathname}index.html`;
  }

  if (!pathname.includes(".")) {
    return `${pathname}.html`;
  }

  return pathname;
}

function isProtectedPage(page) {
  return PROTECTED_PAGES.includes(normalizePagePath(page));
}

/**
 * Check if user has access to specific page
 * @param {string} page - Page path
 * @returns {boolean} - True if user has access
 */
function hasPageAccessForUser(page, userData) {
  const normalizedPage = normalizePagePath(page);
  if (!userData?.role_name) {
    return false;
  }

  const allowedRoles = PAGE_PERMISSIONS[normalizedPage];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(userData.role_name);
}

function hasPageAccess(page) {
  return hasPageAccessForUser(page, getVerifiedUser());
}

/**
 * Redirect user berdasarkan role mereka
 * @param {string} userRole - Role user
 */
function redirectBasedOnRole(userRole) {
  switch (userRole) {
    case ROLES.ADMIN:
    case ROLES.MANAGEMENT:
      // Admin dan Management diarahkan ke dashboard
      window.location.href = "/index.html";
      break;
    case ROLES.INTERNSHIP:
    case ROLES.EMPLOYEE:
      // Internship dan Employee diarahkan ke profile
      window.location.href = "/profile.html";
      break;
    default:
      // Unknown roles must re-authenticate instead of being silently routed to profile.
      window.location.href = "/signin.html";
      break;
  }
}

/**
 * Show access denied page/message
 * @param {string} userRole - User's role
 * @param {{ keepCurrentLocation?: boolean, primaryAction?: string }} options - Denial behavior options
 */
function showAccessDenied(userRole, options = {}) {
  const { keepCurrentLocation = false, primaryAction = "close" } = options;
  const primaryButtonLabel =
    primaryAction === "close" ? "Tutup" : "Buka Halaman Sesuai Role";

  // Create access denied modal with styling matching modalAlert danger theme
  const modalHTML = `
    <div id="access-denied-modal" class="fixed inset-0 z-99999 flex items-center justify-center p-5 overflow-y-auto transition-all duration-300 opacity-0">
      <!-- Backdrop -->
      <div class="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]" id="modal-backdrop"></div>
      
      <!-- Modal Content -->
      <div class="relative w-full max-w-[600px] rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-10 transform scale-95 transition-all duration-300">
        <!-- Close Button -->
        <button
          id="modal-close-btn"
          class="absolute right-3 top-3 z-999 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-6 sm:top-6 sm:h-11 sm:w-11"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <!-- Modal Body -->
        <div class="text-center">
          <!-- Icon Container -->
          <div class="relative flex items-center justify-center z-1 mb-7">
            <svg
              class="fill-error-50 dark:fill-error-500/15"
              width="90"
              height="90"
              viewBox="0 0 90 90"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M34.364 6.85053C38.6205 -2.28351 51.3795 -2.28351 55.636 6.85053C58.0129 11.951 63.5594 14.6722 68.9556 13.3853C78.6192 11.0807 86.5743 21.2433 82.2185 30.3287C79.7862 35.402 81.1561 41.5165 85.5082 45.0122C93.3019 51.2725 90.4628 63.9451 80.7747 66.1403C75.3648 67.3661 71.5265 72.2695 71.5572 77.9156C71.6123 88.0265 60.1169 93.6664 52.3918 87.3184C48.0781 83.7737 41.9219 83.7737 37.6082 87.3184C29.8831 93.6664 18.3877 88.0266 18.4428 77.9156C18.4735 72.2695 14.6352 67.3661 9.22531 66.1403C-0.462787 63.9451 -3.30193 51.2725 4.49185 45.0122C8.84391 41.5165 10.2138 35.402 7.78151 30.3287C3.42572 21.2433 11.3808 11.0807 21.0444 13.3853C26.4406 14.6722 31.9871 11.951 34.364 6.85053Z"
                fill=""
                fill-opacity=""
              />
            </svg>

            <span class="absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
              <svg
                class="fill-error-600 dark:fill-error-500"
                width="38"
                height="38"
                viewBox="0 0 38 38"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M9.62684 11.7496C9.04105 11.1638 9.04105 10.2141 9.62684 9.6283C10.2126 9.04252 11.1624 9.04252 11.7482 9.6283L18.9985 16.8786L26.2485 9.62851C26.8343 9.04273 27.7841 9.04273 28.3699 9.62851C28.9556 10.2143 28.9556 11.164 28.3699 11.7498L21.1198 18.9999L28.3699 26.25C28.9556 26.8358 28.9556 27.7855 28.3699 28.3713C27.7841 28.9571 26.8343 28.9571 26.2485 28.3713L18.9985 21.1212L11.7482 28.3715C11.1624 28.9573 10.2126 28.9573 9.62684 28.3715C9.04105 27.7857 9.04105 26.836 9.62684 26.2502L16.8771 18.9999L9.62684 11.7496Z"
                  fill=""
                />
              </svg>
            </span>
          </div>

          <!-- Title -->
          <h4 class="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-title-sm">
            Akses Ditolak
          </h4>

          <!-- Message -->
          <p class="text-sm leading-6 text-gray-500 dark:text-gray-400 mb-7">
            Maaf, role <strong>"${userRole}"</strong> tidak memiliki akses ke halaman dashboard.
            <br><br>
            Hanya <strong>Admin</strong> dan <strong>Management</strong> yang dapat mengakses dashboard.
          </p>

          <!-- Action Buttons -->
          <div class="flex items-center justify-center w-full gap-3 flex-col sm:flex-row">
            <button 
              id="modal-redirect-btn" 
              class="flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg shadow-theme-xs sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              ${primaryButtonLabel}
            </button>
            <button 
              id="modal-logout-btn" 
              class="flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg shadow-theme-xs sm:w-auto bg-error-500 hover:bg-error-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Insert modal into DOM
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  const modal = document.getElementById("access-denied-modal");

  // Setup event listeners
  setupAccessDeniedEventListeners(modal, userRole, {
    keepCurrentLocation,
    primaryAction,
  });

  // Show modal with animation
  const scheduleAnimation =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (callback) => callback();

  scheduleAnimation(() => {
    modal.classList.remove("opacity-0");
    modal.querySelector(".relative").classList.remove("scale-95");
    modal.querySelector(".relative").classList.add("scale-100");
  });

  // Prevent body scroll
  document.body.style.overflow = "hidden";
}

/**
 * Setup event listeners for access denied modal
 * @param {HTMLElement} modal - Modal element
 * @param {string} userRole - User's role
 * @param {{ keepCurrentLocation?: boolean, primaryAction?: string }} options - Denial behavior options
 */
function setupAccessDeniedEventListeners(modal, userRole, options = {}) {
  const { keepCurrentLocation = false, primaryAction = "close" } = options;
  const preventPassiveDismissal =
    keepCurrentLocation && primaryAction !== "close";
  const shouldRedirectAfterPrimaryAction = primaryAction !== "close";
  const closeBtn = modal.querySelector("#modal-close-btn");
  const redirectBtn = modal.querySelector("#modal-redirect-btn");
  const logoutBtn = modal.querySelector("#modal-logout-btn");
  const backdrop = modal.querySelector("#modal-backdrop");

  if (preventPassiveDismissal) {
    closeBtn?.classList?.add("hidden");
  }

  // Close modal function
  const closeModal = ({ force = false } = {}) => {
    if (preventPassiveDismissal && !force) {
      return;
    }

    modal.classList.add("opacity-0");
    modal.querySelector(".relative").classList.add("scale-95");
    modal.querySelector(".relative").classList.remove("scale-100");

    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = "";
    }, 300);
  };

  // Redirect function
  const redirectToAllowedPage = () => {
    closeModal({ force: true });
    setTimeout(() => {
      if (!shouldRedirectAfterPrimaryAction) {
        return;
      }

      redirectBasedOnRole(userRole);
    }, 300);
  };
  // Logout function
  const logout = async () => {
    try {
      // Import logout function from authService
      const { logout: authLogout } = await import("../services/authService.js");

      await authLogout();

      if (
        typeof Alpine !== "undefined" &&
        Alpine.store &&
        Alpine.store("auth")
      ) {
        Alpine.store("auth").clearAuth();
      }

      console.log("Logout completed successfully");

      closeModal();
      setTimeout(() => {
        window.location.href = "/signin.html";
      }, 300);
    } catch (error) {
      console.error("Logout error:", error);

      const { forceReauthenticate } =
        await import("../services/authService.js");

      closeModal();
      await forceReauthenticate();
    }
  };

  // Event listeners
  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  if (redirectBtn) {
    redirectBtn.addEventListener("click", redirectToAllowedPage);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  if (backdrop) {
    backdrop.addEventListener("click", closeModal);
  }

  // ESC key listener
  const handleEscKey = (e) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", handleEscKey);
    }
  };

  document.addEventListener("keydown", handleEscKey);
}

function presentAccessDenied(userRole, options = {}) {
  const externalShowAccessDenied =
    typeof window !== "undefined"
      ? window.RoleBasedAccess?.showAccessDenied
      : null;

  if (
    typeof externalShowAccessDenied === "function" &&
    externalShowAccessDenied !== showAccessDenied
  ) {
    externalShowAccessDenied(userRole, options);
    return;
  }

  showAccessDenied(userRole, options);
}

function markAccessBoundaryDenied() {
  if (typeof document === "undefined" || !document.body?.dataset) {
    return;
  }

  document.body.dataset.accessBoundary = "denied";
}

/**
 * Initialize role-based access control
 */
function initRoleBasedAccess() {
  const currentPage = normalizePagePath(window.location.pathname);
  const authStore = getAuthStore();

  console.log("Checking role-based access for page:", currentPage);

  if (!isProtectedPage(currentPage)) {
    return;
  }

  if (authStore?.sessionState === "verification_failed") {
    console.log(
      "Auth verification failed at startup, deferring RBAC enforcement",
    );
    return;
  }

  const userData = getVerifiedUser();
  if (!userData?.role_name) {
    console.log("No backend-verified user data or role found");
    return;
  }

  const userRole = userData.role_name;
  console.log("User role:", userRole);

  if (!hasPageAccess(currentPage)) {
    console.log(`Access denied for role ${userRole} to page ${currentPage}`);

    if (currentPage === "/index.html" && DASHBOARD_DENIED_ROLES.has(userRole)) {
      markAccessBoundaryDenied();
      presentAccessDenied(userRole, {
        keepCurrentLocation: true,
        primaryAction: "redirect",
      });
      return;
    }

    if (
      currentPage === "/index.html" &&
      !DASHBOARD_ALLOWED_ROLES.has(userRole)
    ) {
      redirectBasedOnRole(userRole);
      return;
    }

    redirectBasedOnRole(userRole);
    return;
  }

  console.log(`Access granted for role ${userRole} to page ${currentPage}`);
}

/**
 * Check dashboard access specifically
 * @returns {boolean} - True if user can access dashboard
 */
function canAccessDashboard() {
  const userData = getVerifiedUser();
  if (!userData?.role_name) {
    return false;
  }

  const userRole = userData.role_name;
  return userRole === ROLES.ADMIN || userRole === ROLES.MANAGEMENT;
}

// Export functions
export {
  ROLES,
  PAGE_PERMISSIONS,
  PROTECTED_PAGES,
  normalizePagePath,
  isProtectedPage,
  hasPageAccess,
  hasPageAccessForUser,
  redirectBasedOnRole,
  showAccessDenied,
  initRoleBasedAccess,
  canAccessDashboard,
};

// For global usage
if (typeof window !== "undefined") {
  window.RoleBasedAccess = {
    ROLES,
    PROTECTED_PAGES,
    normalizePagePath,
    isProtectedPage,
    hasPageAccess,
    hasPageAccessForUser,
    redirectBasedOnRole,
    showAccessDenied,
    initRoleBasedAccess,
    canAccessDashboard,
  };
}
