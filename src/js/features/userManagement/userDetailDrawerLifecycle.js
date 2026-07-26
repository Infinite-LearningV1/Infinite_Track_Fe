import {
  firstFiniteMapNumber,
  hasFiniteCoordinates,
} from "../../utils/mapLocationTruth.js";

export const WFH_STATUS_AVAILABLE = "Tersedia";
export const WFH_STATUS_UNSET = "Belum diatur";

/**
 * Build the drawer view model for a user row.
 *
 * Absent values stay absent. No default radius and no placeholder description
 * are invented, because the drawer presents a configured WFH geofence and must
 * not imply configuration that does not exist.
 *
 * @param {object} [user]
 */
export function normalizeWfhLocation(user = {}) {
  return {
    id: user.id ?? null,
    fullName: user.fullName || user.full_name || "",
    email: user.email || "",
    position: user.position || user.position_name || "",
    nipNim: user.nipNim || user.nip_nim || "",
    role: user.role || user.role_name || "",
    latitude: firstFiniteMapNumber(user.latitude, user.location?.latitude),
    longitude: firstFiniteMapNumber(user.longitude, user.location?.longitude),
    radius: firstFiniteMapNumber(user.radius, user.location?.radius),
    description: user.description ?? user.location?.description ?? "",
  };
}

export function createEmptyWfhLocation() {
  return normalizeWfhLocation({});
}

/**
 * @param {{ latitude: unknown, longitude: unknown }} location
 * @returns {string} WFH_STATUS_AVAILABLE or WFH_STATUS_UNSET
 */
export function resolveWfhStatus(location) {
  return hasFiniteCoordinates(location)
    ? WFH_STATUS_AVAILABLE
    : WFH_STATUS_UNSET;
}

/**
 * Own the Detail Pengguna drawer open/close lifecycle.
 *
 * The map adapter is injected so the reopen contract can be asserted without a
 * DOM or a real Leaflet instance.
 *
 * Invariants:
 *  - open() closes any previous surface first, so the adapter never receives a
 *    second initialize() without an intervening destroy().
 *  - close() is idempotent: repeated calls destroy at most once per open.
 *  - the map is initialized only when both coordinates are finite.
 *
 * @param {{ mapAdapter: { initialize(location): void, destroy(): void } }} deps
 */
export function createUserDetailDrawerLifecycle({ mapAdapter } = {}) {
  if (!mapAdapter) {
    throw new Error(
      "createUserDetailDrawerLifecycle requires a mapAdapter with initialize() and destroy()",
    );
  }

  let isOpen = false;
  let selectedUserLocation = createEmptyWfhLocation();

  function close() {
    if (!isOpen) {
      return;
    }

    isOpen = false;
    mapAdapter.destroy();
    selectedUserLocation = createEmptyWfhLocation();
  }

  function open(user) {
    close();

    selectedUserLocation = normalizeWfhLocation(user);
    isOpen = true;

    if (hasFiniteCoordinates(selectedUserLocation)) {
      mapAdapter.initialize(selectedUserLocation);
    }
  }

  return {
    open,
    close,
    get isOpen() {
      return isOpen;
    },
    get selectedUserLocation() {
      return selectedUserLocation;
    },
    get wfhStatus() {
      return resolveWfhStatus(selectedUserLocation);
    },
  };
}
