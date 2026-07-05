import { API_CONFIG } from "../config/env.js";
import {
  OPERATIONAL_SETTING_BACKEND_FIELDS,
  OPERATIONAL_SETTING_KEYS,
} from "../features/backendOperationalSettings/backendOperationalSettings.constants.js";
import { authRequest } from "./authRequest.js";

const ALLOWED_OPERATIONAL_SETTING_KEYS = OPERATIONAL_SETTING_KEYS;
const OPERATIONAL_SETTINGS_URL = `${API_CONFIG.BASE_URL}/settings/operational`;

function assertAllowedOperationalSettingsPayload(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Operational settings payload must be an object.");
  }

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_OPERATIONAL_SETTING_KEYS.includes(key)) {
      throw new Error(`Unsupported operational setting key: ${key}`);
    }
  }
}

function assertOperationalSettingsResponse(settings = {}) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("Backend operational settings response must be an object.");
  }

  const missingFields = OPERATIONAL_SETTING_BACKEND_FIELDS.filter(
    (field) => !Object.hasOwn(settings, field),
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Backend operational settings response missing fields: ${missingFields.join(", ")}`,
    );
  }

  return settings;
}

class BackendOperationalSettingsService {
  constructor(requestExecutor = authRequest) {
    this.requestExecutor = requestExecutor;
  }

  async getOperationalSettings() {
    const response = await this.requestExecutor({
      method: "get",
      url: OPERATIONAL_SETTINGS_URL,
    });

    return assertOperationalSettingsResponse(response.data);
  }

  async updateOperationalSettings(payload) {
    assertAllowedOperationalSettingsPayload(payload);

    const response = await this.requestExecutor({
      method: "patch",
      url: OPERATIONAL_SETTINGS_URL,
      data: payload,
    });

    return assertOperationalSettingsResponse(response.data);
  }
}

const backendOperationalSettingsService =
  new BackendOperationalSettingsService();

function getOperationalSettings() {
  return backendOperationalSettingsService.getOperationalSettings();
}

function updateOperationalSettings(payload) {
  return backendOperationalSettingsService.updateOperationalSettings(payload);
}

export {
  ALLOWED_OPERATIONAL_SETTING_KEYS,
  OPERATIONAL_SETTINGS_URL,
  BackendOperationalSettingsService,
  assertAllowedOperationalSettingsPayload,
  assertOperationalSettingsResponse,
  getOperationalSettings,
  updateOperationalSettings,
};
