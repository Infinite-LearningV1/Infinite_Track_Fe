const ALLOWED_OPERATIONAL_SETTING_KEYS = [
  "GEOFENCE_RADIUS_DEFAULT_M",
  "AUTO_CHECKOUT_IDLE_MIN",
  "AUTO_CHECKOUT_TBUFFER_MIN",
  "LATE_CHECKOUT_TOLERANCE_MIN",
  "DEFAULT_SHIFT_END",
];

function assertAllowedOperationalSettingsPayload(payload = {}) {
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_OPERATIONAL_SETTING_KEYS.includes(key)) {
      throw new Error(`Unsupported operational setting key: ${key}`);
    }
  }
}

async function getOperationalSettings() {
  throw new Error(
    "Backend operational settings contract belum tersedia untuk Web FE. Shell-only INF-142 belum melakukan fetch canonical settings.",
  );
}

async function updateOperationalSettings(payload) {
  assertAllowedOperationalSettingsPayload(payload);

  throw new Error(
    "Backend operational settings contract belum tersedia untuk Web FE. Shell-only INF-142 belum melakukan persist canonical settings.",
  );
}

export {
  ALLOWED_OPERATIONAL_SETTING_KEYS,
  assertAllowedOperationalSettingsPayload,
  getOperationalSettings,
  updateOperationalSettings,
};
