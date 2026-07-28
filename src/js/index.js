import "flatpickr/dist/flatpickr.min.css";
import "dropzone/dist/dropzone.css";
import "leaflet/dist/leaflet.css";
import "../css/style.css";

import Alpine from "alpinejs";
import persist from "@alpinejs/persist";
import flatpickr from "flatpickr";
import Dropzone from "dropzone";
import L from "leaflet";

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

import map01 from "./components/map-01";
import "./components/calendar-init.js";
import "./components/image-resize";
import "./components/modal/modalAlert.js";
import "./components/modal/deleteModal.js";
import "./components/modal/mapDetailModal.js";
import "./components/modal/bookingMapModal.js";
import "./components/logoutComponent.js";
import "./utils/storageManager.js";
import "./services/authService.js";
import "./services/userService.js";
import "./services/bookingService.js";
import "./features/signinHandler.js";

// Import authentication utilities
import {
  hasSessionHint,
  resolveBootstrapSession,
  forceReauthenticate,
} from "./services/authService.js";
import {
  buildForcedReauthRedirectNotice,
  classifyAuthFailure,
  clearAuthRedirectNotice,
  createAuthSessionSyncController,
  persistAuthRedirectNotice,
  readAuthRedirectNotice,
} from "./services/authSessionRuntime.js";
import { getUserFromStorage } from "./utils/storageManager.js";
import { initAuthStore } from "./stores/authStore.js";
import {
  initAuthGuard,
  isProtectedPage as isAuthProtectedPage,
} from "./utils/authGuard.js";
import { initRoleBasedAccess } from "./utils/roleBasedAccess.js";
import { formatDate } from "./utils/dateTimeFormatter.js";
import { userListAlpineData } from "./features/userManagement/userListSimple.js";
import { userFormAlpineData } from "./features/userManagement/userForm.js";
import { attendanceLogAlpineData } from "./features/attendance/attendanceLog.js";
import { bookingListAlpineData } from "./features/wfaBooking/bookingList.js";
import { bookingRejectionAlpineData } from "./features/wfaBooking/bookingRejection.js";
import { getUserPhotoUrl } from "./utils/photoValidation.js";
import { dashboard } from "../../src/js/features/dashboard/dashboard.js";
import { backendOperationalSettingsAlpineData } from "./features/backendOperationalSettings/backendOperationalSettings.js";
import { wfaReasonCatalogAlpineData } from "./features/wfaSettings/wfaReasonCatalog.js";
import { showInlineAlert } from "./utils/inlineAlert.js";

Alpine.plugin(persist);
window.Alpine = Alpine;
initAuthStore();

// Expose inline alert helper
window.showInlineAlert = showInlineAlert;

// Register Dashboard component
document.addEventListener("alpine:init", () => {
  Alpine.data("dashboard", dashboard);
});

// Expose Alpine.js components to window for use in HTML
window.userListAlpineData = userListAlpineData;
window.userFormAlpineData = userFormAlpineData;
window.attendanceLogAlpineData = attendanceLogAlpineData;
window.bookingListAlpineData = bookingListAlpineData;
window.bookingRejectionAlpineData = bookingRejectionAlpineData;
window.backendOperationalSettingsAlpineData =
  backendOperationalSettingsAlpineData;
window.wfaReasonCatalogAlpineData = wfaReasonCatalogAlpineData;

// Expose utility functions to window for use in HTML
window.getUserPhotoUrl = getUserPhotoUrl;

function showAuthRedirectNoticeOnSignin() {
  const pageName = window.location.pathname.split("/").pop() || "index.html";

  if (pageName !== "signin.html") {
    return;
  }

  const redirectNotice = readAuthRedirectNotice(window.sessionStorage);

  if (
    !redirectNotice?.message ||
    typeof window.showInlineAlert !== "function"
  ) {
    return;
  }

  const requestedTimeout = Number(redirectNotice.timeoutMs) || 4000;
  const timeoutMs =
    redirectNotice.reason === "inactivity_expired"
      ? Math.max(requestedTimeout, 6000)
      : requestedTimeout;

  clearAuthRedirectNotice(window.sessionStorage);
  window.showInlineAlert({
    type: redirectNotice.type || "warning",
    title: redirectNotice.title || "Perlu Login",
    message: redirectNotice.message,
    timeoutMs,
  });
}

function hideGlobalPreloader() {
  const preloader = document.querySelector("[data-global-preloader]");

  if (!preloader) {
    return;
  }

  preloader.classList.add("hidden", "pointer-events-none");
  preloader.setAttribute("aria-hidden", "true");
}

// Global Alpine.js state for Map Detail Modal
Alpine.data("mapDetailModalState", () => ({
  isMapDetailModalOpen: false,
  selectedUserLocation: {
    id: null,
    fullName: "",
    email: "",
    position: "",
    phoneNumber: "",
    latitude: null,
    longitude: null,
    radius: null,
    description: "",
  },
  openMapDetailModal(user) {
    // Set user location data
    this.selectedUserLocation = {
      id: user.id,
      fullName: user.fullName || user.full_name || "",
      email: user.email || "",
      position: user.position || user.position_name || "",
      phoneNumber: user.phoneNumber || user.phone || user.phone_number || "",
      latitude: user.latitude || user.location?.latitude || user.lat || null,
      longitude:
        user.longitude ||
        user.location?.longitude ||
        user.lng ||
        user.lon ||
        null,
      radius: user.radius || user.location?.radius || null,
      description:
        user.description || user.location?.description || user.address || "",
    };

    // Debug log untuk membantu troubleshooting
    console.log("Opening map detail modal for user:", user);
    console.log("Mapped location data:", this.selectedUserLocation);

    // Open modal regardless of coordinates availability
    this.isMapDetailModalOpen = true;

    // Initialize map only if coordinates are available
    this.$nextTick(() => {
      if (
        this.selectedUserLocation.latitude &&
        this.selectedUserLocation.longitude
      ) {
        window.mapDetailModal.initializeMap(this.selectedUserLocation);
      }
    });
  },

  closeMapDetailModal() {
    this.isMapDetailModalOpen = false;
    // Clean up map
    window.mapDetailModal.destroyMap();
    // Reset data
    this.selectedUserLocation = {
      id: null,
      fullName: "",
      email: "",
      position: "",
      phoneNumber: "",
      latitude: null,
      longitude: null,
      radius: null,
      description: "",
    };
  },
}));

// Global Alpine.js state for Booking Map Modal
Alpine.data("bookingMapModalState", () => ({
  isBookingMapModalOpen: false,
  selectedBookingLocation: {
    title: "",
    description: "",
    latitude: null,
    longitude: null,
    radius: null,
    // Complete booking data
    id: null,
    employee_name: "",
    employee_id: "",
    status: "",
    start_date: "",
    end_date: "",
    schedule_date: "",
    location_name: "",
    notes: "",
  },
  openBookingMapModal(booking) {
    // Set booking location data
    this.selectedBookingLocation = {
      title: booking.location_name || "WFA Location",
      description:
        booking.notes ||
        booking.description ||
        "Work From Anywhere booking location",
      latitude: booking.latitude || booking.lat || null,
      longitude: booking.longitude || booking.lng || null,
      radius: booking.radius || 100,
      // Complete booking data
      id: booking.id,
      employee_name: booking.employee_name || booking.full_name || "",
      employee_id: booking.employee_id || booking.user_id || "",
      status: booking.status || "pending",
      start_date: booking.start_date,
      end_date: booking.end_date,
      schedule_date: booking.schedule_date,
      location_name: booking.location_name || "",
      notes: booking.notes || "",
    };

    // Debug log untuk membantu troubleshooting
    console.log("Opening booking map modal for booking:", booking);
    console.log("Mapped booking location data:", this.selectedBookingLocation);

    // Open modal regardless of coordinates availability
    this.isBookingMapModalOpen = true;

    // Initialize map only if coordinates are available
    this.$nextTick(() => {
      if (
        this.selectedBookingLocation.latitude &&
        this.selectedBookingLocation.longitude
      ) {
        if (typeof window.bookingMapModal === "function") {
          window.bookingMapModal().initializeMap(this.selectedBookingLocation);
        } else {
          console.warn("window.bookingMapModal function not found");
        }
      }
    });
  },

  closeBookingMapModal() {
    this.isBookingMapModalOpen = false;
    // Clean up map if available
    if (typeof window.bookingMapModal === "function") {
      const modalInstance = window.bookingMapModal();
      if (modalInstance.cleanup) {
        modalInstance.cleanup();
      }
    }
    // Reset data
    this.selectedBookingLocation = {
      title: "",
      description: "",
      latitude: null,
      longitude: null,
      radius: null,
      id: null,
      employee_name: "",
      employee_id: "",
      status: "",
      start_date: "",
      end_date: "",
      schedule_date: "",
      location_name: "",
      notes: "",
    };
  },
  // Format date time for display
  formatDateTime(dateString) {
    if (!dateString) return "-";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  },

  // Format date for display (date only, no time)
  formatDate(dateString) {
    return formatDate(dateString);
  },

  // Get status badge class for styling
  getStatusBadgeClass(status) {
    const statusClasses = {
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      approved:
        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      cancelled:
        "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
    };

    return statusClasses[status?.toLowerCase()] || statusClasses.pending;
  },
}));

// Global Alpine.js state for Delete Modal
Alpine.data("deleteModalState", () => ({
  isDeleteModalOpen: false,
  deleteTargetId: null,
  deleteConfirmMessage: "",

  openDeleteModal(targetId, message) {
    this.deleteTargetId = targetId;
    this.deleteConfirmMessage =
      message || "Are you sure you want to delete this item?";
    this.isDeleteModalOpen = true;
  },

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.deleteTargetId = null;
    this.deleteConfirmMessage = "";
  },

  confirmDelete() {
    if (this.deleteTargetId) {
      // Find the parent component with executeDelete method
      const dashboardComponent = document.querySelector(
        '[x-data*="dashboard"]',
      );
      const attendanceComponent = document.querySelector(
        '[x-data*="attendance"]',
      );

      if (dashboardComponent && dashboardComponent._x_dataStack) {
        const dashboardData = dashboardComponent._x_dataStack[0];
        if (dashboardData && dashboardData.executeDelete) {
          dashboardData.executeDelete(this.deleteTargetId);
        }
      } else if (attendanceComponent && attendanceComponent._x_dataStack) {
        const attendanceData = attendanceComponent._x_dataStack[0];
        if (attendanceData && attendanceData.executeDelete) {
          attendanceData.executeDelete(this.deleteTargetId);
        }
      } else {
        console.warn("No component found to handle delete operation");
      }
    }
    this.closeDeleteModal();
  },
}));

// Make map detail modal functions globally available
window.openMapDetailModal = function (user) {
  // Get the Alpine component instance
  const element = document.querySelector('[x-data*="mapDetailModalState"]');
  if (element && element._x_dataStack) {
    const alpineData = element._x_dataStack[0];
    if (alpineData.openMapDetailModal) {
      alpineData.openMapDetailModal(user);
    }
  } else {
    // Fallback: create a temporary Alpine instance
    Alpine.data("tempMapModal", () => ({
      init() {
        this.openMapDetailModal(user);
      },
      ...Alpine.raw(Alpine._x_data.mapDetailModalState()),
    }));
  }
};

// Initialize authentication session checking
async function initializeAuthSession() {
  console.log("Initializing authentication session...");

  // Check if user is on a protected page
  const currentPath = window.location.pathname;
  const pageName = currentPath.split("/").pop() || "index.html";
  const isProtectedPage = isAuthProtectedPage(currentPath);

  // If on protected page, check authentication
  if (isProtectedPage) {
    console.log("On protected page, checking authentication...");

    if (!hasSessionHint()) {
      sessionStorage.setItem("redirectAfterLogin", window.location.href);
      persistAuthRedirectNotice({
        type: "warning",
        title: "Perlu Login",
        message: "Silakan login untuk melanjutkan",
      });
      window.location.href = "/signin.html";
      return "redirecting";
    }

    return validateUserSession();
  }

  if (pageName === "signin.html" && hasSessionHint()) {
    await validateSigninPageSession();
  }

  return "unauthenticated";
}

function buildSessionExpiredRedirectNotice(error) {
  const failure = classifyAuthFailure(error);

  return (
    buildForcedReauthRedirectNotice(failure.reason) || {
      type: "warning",
      title: "Sesi Berakhir",
      message: "Sesi telah berakhir. Silakan login kembali.",
      timeoutMs: 6000,
    }
  );
}

// Validate user session and sync with Alpine store
async function validateUserSession() {
  try {
    const storedUser = getUserFromStorage();
    const resolution = await resolveBootstrapSession();
    const authStore =
      typeof Alpine !== "undefined" && Alpine.store
        ? Alpine.store("auth")
        : null;

    if (resolution.state === "authenticated") {
      authStore?.setUser(resolution.user);
      return resolution.state;
    }

    if (resolution.state === "verification_failed") {
      authStore?.setVerificationFailed(storedUser);

      window.showInlineAlert?.({
        type: "warning",
        message:
          "Session belum bisa diverifikasi karena koneksi atau server bermasalah.",
      });
      return resolution.state;
    }

    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    await forceReauthenticate({
      redirectNotice: buildSessionExpiredRedirectNotice(resolution.error),
    });
    return resolution.state;
  } catch (error) {
    console.error("Error validating session:", error);

    const failure = classifyAuthFailure(error);
    const authStore =
      typeof Alpine !== "undefined" && Alpine.store
        ? Alpine.store("auth")
        : null;

    if (failure.kind === "transport" || failure.kind === "server") {
      authStore?.setVerificationFailed(getUserFromStorage());
      window.showInlineAlert?.({
        type: "warning",
        message:
          "Session belum bisa diverifikasi karena koneksi atau server bermasalah.",
      });
      return "verification_failed";
    }

    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    await forceReauthenticate({
      redirectNotice: buildSessionExpiredRedirectNotice(error),
    });
    return "non_refreshable";
  }
}

const SUPPORTED_SIGNIN_REDIRECT_ROLES = new Set([
  "Admin",
  "Management",
  "Employee",
  "Internship",
]);

async function validateSigninPageSession() {
  try {
    const resolution = await resolveBootstrapSession();

    if (resolution.state === "authenticated") {
      if (
        typeof Alpine !== "undefined" &&
        Alpine.store &&
        Alpine.store("auth")
      ) {
        Alpine.store("auth").setUser(resolution.user);
      }

      const roleName = resolution.user?.role_name;
      const roleBasedRedirect = window.RoleBasedAccess?.redirectBasedOnRole;
      const showAccessDenied = window.RoleBasedAccess?.showAccessDenied;

      if (
        roleBasedRedirect &&
        roleName &&
        SUPPORTED_SIGNIN_REDIRECT_ROLES.has(roleName)
      ) {
        roleBasedRedirect(roleName);
      } else if (roleName && typeof showAccessDenied === "function") {
        showAccessDenied(roleName, {
          keepCurrentLocation: true,
          primaryAction: "close",
        });
      } else {
        window.location.href = "/index.html";
      }
    }
  } catch (error) {
    console.warn("Failed to validate signin page session:", error);
  }
}

const authSessionSync = createAuthSessionSyncController({
  isProtectedPage: isAuthProtectedPage,
});

async function bootAuthentication() {
  console.log("Setting up authentication...");

  authSessionSync.start();
  showAuthRedirectNoticeOnSignin();
  const startupState = await initializeAuthSession();

  if (
    startupState !== "verification_failed" &&
    startupState !== "redirecting"
  ) {
    document.body.dataset.authBootstrap = startupState;
    initAuthGuard();
    initRoleBasedAccess();
  }

  return startupState;
}

async function startApplication() {
  const isSigninPage =
    window.location.pathname === "/signin.html" ||
    window.location.pathname.endsWith("/signin.html");

  if (isSigninPage) {
    Alpine.start();
    await bootAuthentication();
    return;
  }

  const startupState = await bootAuthentication();

  if (startupState === "redirecting") {
    return;
  }

  if (document.body.dataset.accessBoundary === "denied") {
    hideGlobalPreloader();
    return;
  }

  Alpine.start();
}

// Initialize Alpine.js after authentication and RBAC bootstrap.
startApplication();

// Function to show coordinates placeholder
function showCoordinatesPlaceholder(latitude, longitude, mapElementId) {
  const mapElement = document.getElementById(mapElementId);
  if (!mapElement) {
    console.error("Map container not found:", mapElementId);
    return;
  }

  // Clear previous content
  mapElement.innerHTML = "";

  if (latitude && longitude) {
    // Show coordinates info with location icon
    mapElement.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full p-4 text-center bg-blue-50 dark:bg-blue-900/20 rounded">
        <svg class="w-12 h-12 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <p class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Lokasi Booking</p>
        <p class="text-xs text-blue-600 dark:text-blue-400">Latitude: ${latitude}</p>
        <p class="text-xs text-blue-600 dark:text-blue-400">Longitude: ${longitude}</p>
      </div>
    `;
  } else {
    // Show no coordinates message
    mapElement.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full p-4 text-center">
        <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-sm text-gray-500 dark:text-gray-400">Data koordinat tidak tersedia</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Tidak dapat menampilkan lokasi</p>
      </div>
    `;
  }
}

// Make function globally available
window.showCoordinatesPlaceholder = showCoordinatesPlaceholder;

// Initialize delete confirmation functionality
document.addEventListener("DOMContentLoaded", function () {
  // Select all delete buttons
  const deleteButtons = document.querySelectorAll(".js-delete-item-btn");

  deleteButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();

      // Get data attributes
      const itemId = this.getAttribute("data-item-id");
      const itemName = this.getAttribute("data-item-name");

      // Show danger modal alert for deletion confirmation
      window.showInlineAlert({
        type: "danger",
        message: `Apakah Anda yakin ingin menghapus data karyawan "${itemName}" (${itemId})? Tindakan ini tidak dapat dibatalkan.`,
      });
    });
  });
});

// Init flatpickr
flatpickr(".datepicker", {
  mode: "range",
  static: true,
  monthSelectorType: "static",
  dateFormat: "M j, Y",
  defaultDate: [new Date().setDate(new Date().getDate() - 6), new Date()],
  prevArrow:
    '<svg class="stroke-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.25 6L9 12.25L15.25 18.5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  nextArrow:
    '<svg class="stroke-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.75 19L15 12.75L8.75 6.5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  onReady: (selectedDates, dateStr, instance) => {
    // eslint-disable-next-line no-param-reassign
    instance.element.value = dateStr.replace("to", "-");
    const customClass = instance.element.getAttribute("data-class");
    instance.calendarContainer.classList.add(customClass);
  },
  onChange: (selectedDates, dateStr, instance) => {
    // eslint-disable-next-line no-param-reassign
    instance.element.value = dateStr.replace("to", "-");
  },
});

// Init Dropzone
const dropzoneArea = document.querySelectorAll("#demo-upload");

if (dropzoneArea.length) {
  let myDropzone = new Dropzone("#demo-upload", { url: "/file/post" });
}

// Document Loaded
document.addEventListener("DOMContentLoaded", () => {
  map01();
});

// Get the current year
const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

// For Copy//
document.addEventListener("DOMContentLoaded", () => {
  const copyInput = document.getElementById("copy-input");
  const copyButton = document.getElementById("copy-button");
  const copyText = document.getElementById("copy-text");
  const websiteInput = document.getElementById("website-input");

  if (!copyInput || !copyButton || !copyText || !websiteInput) {
    return;
  }

  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(websiteInput.value).then(() => {
      copyText.textContent = "Copied";

      setTimeout(() => {
        copyText.textContent = "Copy";
      }, 2000);
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");

  if (!searchInput || !searchButton) {
    return;
  }

  function focusSearchInput() {
    searchInput.focus();
  }

  searchButton.addEventListener("click", focusSearchInput);

  document.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      focusSearchInput();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && document.activeElement !== searchInput) {
      event.preventDefault();
      focusSearchInput();
    }
  });
});
