/**
 * Logout Component
 * Komponen untuk menangani logout user
 */

import { logout, forceReauthenticate } from "../services/authService.js";
import "./modal/modalAlert.js"; // Import modal alert component

/**
 * Initialize logout handlers
 */
function initLogoutHandlers() {
  // Tunggu hingga DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLogoutHandlers);
  } else {
    setupLogoutHandlers();
  }
}

/**
 * Setup logout event handlers
 */
function setupLogoutHandlers() {
  // Cari semua elemen logout (button, link, dll)
  const logoutElements = document.querySelectorAll(
    '[data-logout], .logout-btn, .logout-link, button[onclick*="logout"], a[onclick*="logout"]',
  );

  logoutElements.forEach((element) => {
    element.addEventListener("click", handleLogoutClick);
  });

  // Setup keyboard shortcut untuk logout (Ctrl+Shift+L)
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === "L") {
      event.preventDefault();
      handleLogoutClick();
    }
  });

  console.log(`Logout handlers setup for ${logoutElements.length} elements`);
}

/**
 * Handle logout click event
 * @param {Event} event - Click event
 */
async function handleLogoutClick(event) {
  if (event) {
    event.preventDefault();
  }

  // Konfirmasi logout
  const confirmLogout = await showLogoutConfirmation();
  if (!confirmLogout) {
    return;
  }

  await performLogout();
}

/**
 * Show logout confirmation dialog
 * @returns {Promise<boolean>} - True if user confirms logout
 */
function showLogoutConfirmation() {
  return new Promise((resolve) => {
    // Gunakan modalAlert component yang sudah ada
    if (typeof window.showWarningAlert === "function") {
      // Custom modal untuk konfirmasi logout dengan 2 button
      const modalHTML = `
        <div id="logout-confirmation-modal" class="fixed inset-0 z-99999 flex items-center justify-center p-5 overflow-y-auto transition-all duration-300 opacity-0">
          <!-- Backdrop -->
          <div class="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]" id="modal-backdrop"></div>
          
          <!-- Modal Content -->
          <div class="relative w-full max-w-[600px] rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-10 transform scale-95 transition-all duration-300">
            <!-- Modal Body -->
            <div class="text-center">
              <!-- Icon Container -->
              <div class="relative flex items-center justify-center z-1 mb-7">
                <svg
                  class="fill-warning-50 dark:fill-warning-500/15"
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
                    class="fill-warning-600 dark:fill-orange-400"
                    width="38"
                    height="38"
                    viewBox="0 0 38 38"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M32.1445 19.0002C32.1445 26.2604 26.2589 32.146 18.9987 32.146C11.7385 32.146 5.85287 26.2604 5.85287 19.0002C5.85287 11.7399 11.7385 5.85433 18.9987 5.85433C26.2589 5.85433 32.1445 11.7399 32.1445 19.0002ZM18.9987 35.146C27.9158 35.146 35.1445 27.9173 35.1445 19.0002C35.1445 10.0831 27.9158 2.85433 18.9987 2.85433C10.0816 2.85433 2.85287 10.0831 2.85287 19.0002C2.85287 27.9173 10.0816 35.146 18.9987 35.146ZM21.0001 26.0855C21.0001 24.9809 20.1047 24.0855 19.0001 24.0855L18.9985 24.0855C17.894 24.0855 16.9985 24.9809 16.9985 26.0855C16.9985 27.19 17.894 28.0855 18.9985 28.0855L19.0001 28.0855C20.1047 28.0855 21.0001 27.19 21.0001 26.0855ZM18.9986 10.1829C19.827 10.1829 20.4986 10.8545 20.4986 11.6829L20.4986 20.6707C20.4986 21.4992 19.827 22.1707 18.9986 22.1707C18.1701 22.1707 17.4986 21.4992 17.4986 20.6707L17.4986 11.6829C17.4986 10.8545 18.1701 10.1829 18.9986 10.1829Z"
                      fill=""
                    />
                  </svg>
                </span>
              </div>

              <!-- Title -->
              <h4 class="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-title-sm">
                Konfirmasi Logout
              </h4>

              <!-- Message -->
              <p class="text-sm leading-6 text-gray-500 dark:text-gray-400 mb-7">
                Apakah Anda yakin ingin keluar dari aplikasi? Anda akan diarahkan kembali ke halaman login.
              </p>

              <!-- Action Buttons -->
              <div class="flex items-center justify-center w-full gap-3">
                <button 
                  id="logout-cancel-btn" 
                  class="flex justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg shadow-theme-xs hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Batal
                </button>
                <button 
                  id="logout-confirm-btn" 
                  class="flex justify-center px-6 py-3 text-sm font-medium text-white bg-error-500 rounded-lg shadow-theme-xs hover:bg-error-600 transition-colors"
                >
                  Ya, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Insert modal into DOM
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      const modal = document.getElementById("logout-confirmation-modal");
      const modalContent = modal?.querySelector(".relative");
      const confirmBtn = modal?.querySelector("#logout-confirm-btn");
      const cancelBtn = modal?.querySelector("#logout-cancel-btn");
      const backdrop = modal?.querySelector("#modal-backdrop");

      if (!modal || !modalContent || !confirmBtn || !cancelBtn || !backdrop) {
        resolve(confirm("Apakah Anda yakin ingin keluar?"));
        modal?.remove();
        return;
      }

      // Setup event handlers
      const cleanup = () => {
        if (modal.parentNode) {
          modal.style.opacity = "0";
          modalContent.style.transform = "scale(0.95)";
          setTimeout(() => {
            modal.remove();
            document.body.style.overflow = "";
          }, 300);
        }
      };

      confirmBtn.addEventListener("click", () => {
        cleanup();
        resolve(true);
      });

      cancelBtn.addEventListener("click", () => {
        cleanup();
        resolve(false);
      });

      backdrop.addEventListener("click", () => {
        cleanup();
        resolve(false);
      });

      // Escape key
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve(false);
          document.removeEventListener("keydown", handleEscape);
        }
      };
      document.addEventListener("keydown", handleEscape);

      // Show modal with animation
      requestAnimationFrame(() => {
        modal.style.opacity = "1";
        modalContent.style.transform = "scale(1)";
      });

      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }
    // Fallback ke confirm dialog browser jika modal alert tidak tersedia
    else {
      const confirmed = confirm("Apakah Anda yakin ingin keluar?");
      resolve(confirmed);
    }
  });
}

/**
 * Perform logout process
 */
async function performLogout() {
  try {
    // Show loading state
    showLogoutLoading();

    // Call logout service
    const storageCleared = await logout();
    if (!storageCleared) {
      const cleanupError = new Error("Data sesi di browser gagal dibersihkan.");
      cleanupError.code = "AUTH_STORAGE_CLEANUP_FAILED";
      throw cleanupError;
    }

    // Update Alpine.js store
    updateAlpineStoreOnLogout();

    // Close loading modal
    const loadingModal = document.getElementById("logout-loading-modal");
    if (loadingModal) {
      loadingModal.remove();
      document.body.style.overflow = "";
    }

    // Redirect to signin page immediately
    window.location.href = "/signin.html";
  } catch (error) {
    console.error("Logout error:", error);

    // Show error message
    showLogoutErrorSafely(error.message);

    if (error.code === "AUTH_STORAGE_CLEANUP_FAILED") {
      updateAlpineStoreOnLogout(error.message);
      forceLogout({
        redirectNotice: {
          type: "warning",
          title: "Logout perlu perhatian",
          message: error.message,
          timeoutMs: 6000,
          reason: "storage_cleanup_failed",
        },
      });
      return;
    }

    // Force logout anyway (clear local data)
    forceLogout();
  }
}

/**
 * Show loading state during logout
 */
function showLogoutLoading() {
  // Gunakan modalAlert component untuk loading state
  if (typeof window.showInfoAlert === "function") {
    const modalHTML = `
      <div id="logout-loading-modal" class="fixed inset-0 z-99999 flex items-center justify-center p-5 overflow-y-auto transition-all duration-300 opacity-0">
        <!-- Backdrop -->
        <div class="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"></div>
        
        <!-- Modal Content -->
        <div class="relative w-full max-w-[600px] rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-10 transform scale-95 transition-all duration-300">
          <!-- Modal Body -->
          <div class="text-center">
            <!-- Loading Spinner -->
            <div class="relative flex items-center justify-center z-1 mb-7">
              <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-light-500"></div>
            </div>

            <!-- Title -->
            <h4 class="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-title-sm">
              Logging out...
            </h4>

            <!-- Message -->
            <p class="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Mohon tunggu sebentar, kami sedang memproses logout Anda.
            </p>
          </div>
        </div>
      </div>
    `;

    // Insert modal into DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    const modal = document.getElementById("logout-loading-modal");
    const modalContent = modal?.querySelector(".relative");

    if (!modal || !modalContent) {
      return;
    }

    // Show modal with animation
    requestAnimationFrame(() => {
      modal.style.opacity = "1";
      modalContent.style.transform = "scale(1)";
    });

    // Prevent body scroll
    document.body.style.overflow = "hidden";
  }
}

/**
 * Show logout error message
 * @param {string} errorMessage - Error message to display
 */
function showLogoutErrorSafely(errorMessage) {
  try {
    showLogoutError(errorMessage);
  } catch (error) {
    console.error("Logout error alert failed:", error);
  }
}

function showLogoutError(errorMessage) {
  // Close loading modal terlebih dahulu
  const loadingModal = document.getElementById("logout-loading-modal");
  if (loadingModal) {
    loadingModal.remove();
    document.body.style.overflow = "";
  }

  // Gunakan modalAlert component untuk error message
  if (typeof window.showDangerAlert === "function") {
    window.showDangerAlert(
      errorMessage ||
        "Terjadi kesalahan saat logout. Namun data lokal telah dibersihkan.",
      {
        title: "Logout Error",
        buttonText: "OK",
        onOk: () => {
          // Modal akan otomatis tertutup
        },
      },
    );
  } else {
    alert(`Logout Error: ${errorMessage || "Terjadi kesalahan saat logout"}`);
  }
}

/**
 * Update Alpine.js store on logout
 */
function updateAlpineStoreOnLogout(errorMessage = null) {
  if (typeof Alpine === "undefined" || !Alpine.store) {
    return;
  }

  const authStore = Alpine.store("auth");
  if (!authStore) {
    return;
  }

  authStore.user = null;
  authStore.isAuthenticated = false;
  authStore.sessionState = "unauthenticated";
  authStore.error = errorMessage;
  authStore.isLoading = false;
  console.log("Alpine.js auth store cleared on logout");
}

/**
 * Force logout (clear local data without API call)
 */
function forceLogout(options = {}) {
  forceReauthenticate(options).catch((error) => {
    console.error("Force logout error:", error);
    window.location.href = "/signin.html";
  });
}

/**
 * Programmatic logout function (can be called from other modules)
 * @param {boolean} skipConfirmation - Skip confirmation dialog
 */
async function logoutUser(skipConfirmation = false) {
  if (skipConfirmation) {
    await performLogout();
  } else {
    await handleLogoutClick();
  }
}

// Export functions
const LogoutComponent = {
  init: initLogoutHandlers,
  logout: logoutUser,
  forceLogout,
};

export { initLogoutHandlers, logoutUser, forceLogout };
export default LogoutComponent;

// Untuk penggunaan global di browser
if (typeof window !== "undefined") {
  window.LogoutComponent = LogoutComponent;
  window.logoutUser = logoutUser;
}

// Auto-initialize
initLogoutHandlers();
