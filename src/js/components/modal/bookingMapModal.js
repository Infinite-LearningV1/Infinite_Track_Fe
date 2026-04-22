/**
 * Booking Map Modal Component
 * Handles the display and interaction of booking location details in a modal with map
 */

import { formatDate, formatDateTime } from "../../utils/dateTimeFormatter.js";

const bookingMapModal = () => {
  return {
    // Initialize the booking map modal component
    init() {
      // Map will be initialized when modal is opened
      this.map = null;
      this.marker = null;
    },

    // Initialize the map with booking location
    initializeMap(booking) {
      try {
        const lat = parseFloat(booking.latitude);
        const lng = parseFloat(booking.longitude);

        if (!lat || !lng) {
          console.warn("Invalid coordinates for booking map");
          return;
        }

        // Remove existing map if any
        if (this.map) {
          this.map.remove();
        }

        // Initialize Leaflet map
        this.map = L.map("bookingMapContainer").setView([lat, lng], 15);

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(this.map);

        // Create custom icon for booking location
        const bookingIcon = L.divIcon({
          html: `
            <div class="booking-marker">
              <div class="marker-pin bg-blue-500 border-white">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div class="marker-pulse bg-blue-500"></div>
            </div>
          `,
          className: "custom-booking-marker",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        // Add marker
        this.marker = L.marker([lat, lng], { icon: bookingIcon }).addTo(
          this.map,
        ); // Create popup content
        const popupContent = `
          <div class="booking-popup">
            <h3 class="font-semibold text-sm mb-2">${booking.location_name || "WFA Location"}</h3>
            <p class="text-xs text-gray-600 mb-1">
              <strong>Employee:</strong> ${booking.employee_name}
            </p>
            <p class="text-xs text-gray-600 mb-1">
              <strong>Schedule:</strong> ${this.formatDate(booking.schedule_date)}
            </p>
            <p class="text-xs text-gray-600">
              <strong>Status:</strong> <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${this.getStatusBadgeClass(booking.status)}">${booking.status}</span>
            </p>
          </div>
        `;

        this.marker.bindPopup(popupContent);

        // Add circle to show approximate area (if radius available)
        if (booking.radius) {
          L.circle([lat, lng], {
            color: "#3B82F6",
            fillColor: "#3B82F6",
            fillOpacity: 0.1,
            radius: booking.radius,
          }).addTo(this.map);
        }

        // Invalidate size after modal animation
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 300);
      } catch (error) {
        console.error("Error initializing booking map:", error);
      }
    }, // Format date time for display
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
        rejected:
          "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        cancelled:
          "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
      };

      return statusClasses[status?.toLowerCase()] || statusClasses.pending;
    },

    // Clean up map when modal is closed
    cleanup() {
      if (this.map) {
        this.map.remove();
        this.map = null;
        this.marker = null;
      }
    },
  };
};

// Add CSS for custom markers
const bookingMapStyles = `
  <style>
    .custom-booking-marker {
      position: relative;
    }
    
    .booking-marker {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .marker-pin {
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
    }
    
    .marker-pin svg {
      transform: rotate(45deg);
    }
    
    .marker-pulse {
      position: absolute;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      opacity: 0.6;
      animation: booking-pulse 2s infinite;
    }
    
    @keyframes booking-pulse {
      0% {
        transform: scale(0.8);
        opacity: 0.6;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.3;
      }
      100% {
        transform: scale(0.8);
        opacity: 0.6;
      }
    }
    
    .booking-popup {
      min-width: 200px;
    }
    
    .leaflet-popup-content-wrapper {
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .leaflet-popup-tip {
      background: white;
    }
  </style>
`;

// Inject styles if not already present
if (!document.querySelector("#booking-map-styles")) {
  const styleElement = document.createElement("div");
  styleElement.id = "booking-map-styles";
  styleElement.innerHTML = bookingMapStyles;
  document.head.appendChild(styleElement);
}

// Export singleton helpers for use in booking feature
const bookingMapModalInstance = bookingMapModal();
bookingMapModalInstance.init();

window.bookingMapModal = () => bookingMapModalInstance;
window.initializeBookingMap = (booking) =>
  bookingMapModalInstance.initializeMap(booking);
window.cleanupBookingMap = () => bookingMapModalInstance.cleanup();
