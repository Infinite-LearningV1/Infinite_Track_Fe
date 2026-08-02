const OPERATIONAL_SETTING_DEFINITIONS = [
  {
    key: "geofenceRadiusDefaultM",
    label: "GEOFENCE_RADIUS_DEFAULT_M",
    backendField: "geofenceRadiusDefaultM",
    type: "integer",
  },
  {
    key: "autoCheckoutIdleMin",
    label: "AUTO_CHECKOUT_IDLE_MIN",
    backendField: "autoCheckoutIdleMin",
    type: "integer",
  },
  {
    key: "autoCheckoutTBufferMin",
    label: "AUTO_CHECKOUT_TBUFFER_MIN",
    backendField: "autoCheckoutTBufferMin",
    type: "integer",
  },
  {
    key: "lateCheckoutToleranceMin",
    label: "LATE_CHECKOUT_TOLERANCE_MIN",
    backendField: "lateCheckoutToleranceMin",
    type: "integer",
  },
  {
    key: "defaultShiftEnd",
    label: "DEFAULT_SHIFT_END",
    backendField: "defaultShiftEnd",
    type: "time",
  },
  {
    key: "wfaRequestRadiusM",
    label: "WFA_REQUEST_RADIUS_M",
    backendField: "wfaRequestRadiusM",
    type: "integer",
  },
];

const OPERATIONAL_SETTING_KEYS = OPERATIONAL_SETTING_DEFINITIONS.map(
  (setting) => setting.key,
);

const INTEGER_OPERATIONAL_SETTING_KEYS = OPERATIONAL_SETTING_DEFINITIONS.filter(
  (setting) => setting.type === "integer",
).map((setting) => setting.key);

const OPERATIONAL_SETTING_BACKEND_FIELDS = OPERATIONAL_SETTING_DEFINITIONS.map(
  (setting) => setting.backendField,
);

function createEmptyBackendOperationalSettingsDraft() {
  return Object.fromEntries(OPERATIONAL_SETTING_KEYS.map((key) => [key, ""]));
}

export {
  OPERATIONAL_SETTING_DEFINITIONS,
  OPERATIONAL_SETTING_KEYS,
  OPERATIONAL_SETTING_BACKEND_FIELDS,
  INTEGER_OPERATIONAL_SETTING_KEYS,
  createEmptyBackendOperationalSettingsDraft,
};
