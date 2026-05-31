/**
 * Map Detail Modal Component
 * Handles the display of user location details with Leaflet map integration
 */

import L from "leaflet";
import { hasFiniteCoordinates } from "../../utils/mapLocationTruth.js";

class MapDetailModal {
  constructor() {
    this.map = null;
    this.marker = null;
    this.circle = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the map with user location data
   * @param {Object} locationData - User location data
   * @param {number} locationData.latitude - Latitude coordinate
   * @param {number} locationData.longitude - Longitude coordinate
   * @param {number} locationData.radius - Geofence radius in meters
   * @param {string} locationData.description - Location description
   * @param {string} locationData.fullName - User's full name
   */
  initializeMap(locationData) {
    if (!hasFiniteCoordinates(locationData)) {
      console.warn("Invalid coordinates provided for map initialization");
      return;
    }

    // Clean up existing map if it exists
    this.destroyMap();

    // Wait for the modal to be visible and container to be available
    setTimeout(() => {
      const container = document.getElementById("mapDetailContainer");
      if (!container) {
        console.error("Map container not found");
        return;
      }

      try {
        // Initialize the map
        this.map = L.map("mapDetailContainer", {
          center: [locationData.latitude, locationData.longitude],
          zoom: 16,
          zoomControl: true,
          attributionControl: true,
        });

        // Add OpenStreetMap tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(this.map);

        // Create custom marker icon
        const customIcon = L.divIcon({
          className: "custom-marker",
          html: `
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 border-2 border-white shadow-lg">
              <svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
              </svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        // Add marker
        this.marker = L.marker(
          [locationData.latitude, locationData.longitude],
          {
            icon: customIcon,
            draggable: false,
          },
        ).addTo(this.map);

        // Add popup to marker
        const popupContent = `
          <div class="p-2">
            <h4 class="font-semibold text-gray-900 mb-1">${locationData.fullName}</h4>
            <p class="text-sm text-gray-600 mb-1">
              <strong>Koordinat:</strong><br>
              ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}
            </p>
            ${
              Number.isFinite(locationData.radius)
                ? `
              <p class="text-sm text-gray-600 mb-1">
                <strong>Radius:</strong> ${locationData.radius} meter
              </p>
            `
                : ""
            }
            ${
              locationData.description
                ? `
              <p class="text-sm text-gray-600">
                <strong>Deskripsi:</strong> ${locationData.description}
              </p>
            `
                : ""
            }
          </div>
        `;

        this.marker.bindPopup(popupContent, {
          maxWidth: 250,
          className: "custom-popup",
        });

        // Add geofence circle if radius is provided
        if (locationData.radius && locationData.radius > 0) {
          this.circle = L.circle(
            [locationData.latitude, locationData.longitude],
            {
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
              radius: locationData.radius,
              weight: 2,
            },
          ).addTo(this.map);

          // Fit map bounds to include the circle
          const group = L.featureGroup([this.marker, this.circle]);
          this.map.fitBounds(group.getBounds(), { padding: [20, 20] });
        } else {
          // If no radius, just center on the marker
          this.map.setView([locationData.latitude, locationData.longitude], 16);
        }

        // Open popup immediately
        this.marker.openPopup();

        this.isInitialized = true;

        // Force map to resize properly
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 100);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    }, 300); // Wait for modal animation to complete
  }

  /**
   * Destroy the map instance and clean up resources
   */
  destroyMap() {
    if (this.map) {
      try {
        if (this.marker) {
          this.map.removeLayer(this.marker);
          this.marker = null;
        }
        if (this.circle) {
          this.map.removeLayer(this.circle);
          this.circle = null;
        }
        this.map.remove();
        this.map = null;
        this.isInitialized = false;
      } catch (error) {
        console.error("Error destroying map:", error);
      }
    }
  }

  /**
   * Refresh the map (useful when modal becomes visible)
   */
  refreshMap() {
    if (this.map && this.isInitialized) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }
}

// Create global instance
window.mapDetailModal = new MapDetailModal();

// Add custom styles for the map
const style = document.createElement("style");
style.textContent = `
  .custom-marker {
    background: transparent !important;
    border: none !important;
  }
  
  .custom-popup .leaflet-popup-content-wrapper {
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  
  .custom-popup .leaflet-popup-tip {
    background: white;
  }
  
  #mapDetailContainer .leaflet-control-zoom {
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  #mapDetailContainer .leaflet-control-zoom a {
    border-radius: 4px;
    border: none;
    background: white;
    color: #374151;
    line-height: 26px;
    width: 28px;
    height: 28px;
  }
  
  #mapDetailContainer .leaflet-control-zoom a:hover {
    background: #f3f4f6;
  }
`;
document.head.appendChild(style);

export { MapDetailModal };
