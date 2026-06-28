import {
  createEmptyBackendOperationalSettingsDraft,
  INTEGER_OPERATIONAL_SETTING_KEYS,
  OPERATIONAL_SETTING_KEYS,
} from "./backendOperationalSettings.constants.js";
import {
  getOperationalSettings,
  updateOperationalSettings,
} from "../../services/backendOperationalSettingsService.js";

function createDefaultBackendOperationalSettingsForm() {
  return createEmptyBackendOperationalSettingsDraft();
}

function normalizeTimeForInput(value) {
  const normalizedValue = String(value ?? "").trim();
  const match = normalizedValue.match(
    /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/,
  );

  if (!match) {
    return normalizedValue;
  }

  return `${match[1]}:${match[2]}`;
}

function createBackendOperationalSettingsFormFromResponse(settings = {}) {
  return {
    geofenceRadiusDefaultM: String(
      settings.geofenceRadiusDefaultM ?? "",
    ).trim(),
    autoCheckoutIdleMin: String(settings.autoCheckoutIdleMin ?? "").trim(),
    autoCheckoutTBufferMin: String(
      settings.autoCheckoutTBufferMin ?? "",
    ).trim(),
    lateCheckoutToleranceMin: String(
      settings.lateCheckoutToleranceMin ?? "",
    ).trim(),
    defaultShiftEnd: normalizeTimeForInput(settings.defaultShiftEnd),
  };
}

function normalizeBackendOperationalSettingsForm(form = {}) {
  return {
    geofenceRadiusDefaultM: String(form.geofenceRadiusDefaultM ?? "").trim(),
    autoCheckoutIdleMin: String(form.autoCheckoutIdleMin ?? "").trim(),
    autoCheckoutTBufferMin: String(form.autoCheckoutTBufferMin ?? "").trim(),
    lateCheckoutToleranceMin: String(
      form.lateCheckoutToleranceMin ?? "",
    ).trim(),
    defaultShiftEnd: String(form.defaultShiftEnd ?? "").trim(),
  };
}

function isPositiveIntegerString(value) {
  return /^[1-9]\d*$/.test(String(value ?? "").trim());
}

function isTimeString(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value ?? "").trim());
}

function getFieldLabel(key) {
  const labels = {
    geofenceRadiusDefaultM: "Radius area absensi",
    autoCheckoutIdleMin: "Batas idle sebelum checkout otomatis",
    autoCheckoutTBufferMin: "Waktu penyangga checkout otomatis",
    lateCheckoutToleranceMin: "Toleransi checkout terlambat",
    defaultShiftEnd: "Jam selesai shift default",
  };

  return labels[key] || key;
}

function validateBackendOperationalSettingsForm(form = {}) {
  const normalizedForm = normalizeBackendOperationalSettingsForm(form);
  const errors = {};

  for (const key of INTEGER_OPERATIONAL_SETTING_KEYS) {
    if (!isPositiveIntegerString(normalizedForm[key])) {
      errors[key] =
        `${getFieldLabel(key)} wajib diisi dengan bilangan bulat positif.`;
    }
  }

  if (!isTimeString(normalizedForm.defaultShiftEnd)) {
    errors.defaultShiftEnd = `${getFieldLabel("defaultShiftEnd")} wajib diisi dalam format HH:mm.`;
  }

  return errors;
}

function hasBackendOperationalSettingsChanges(form, baseline) {
  const normalizedForm = normalizeBackendOperationalSettingsForm(form);
  const normalizedBaseline = normalizeBackendOperationalSettingsForm(baseline);

  return OPERATIONAL_SETTING_KEYS.some(
    (key) => normalizedForm[key] !== normalizedBaseline[key],
  );
}

function toBackendOperationalSettingsPayload(form = {}) {
  const normalizedForm = normalizeBackendOperationalSettingsForm(form);

  return {
    geofenceRadiusDefaultM: Number(normalizedForm.geofenceRadiusDefaultM),
    autoCheckoutIdleMin: Number(normalizedForm.autoCheckoutIdleMin),
    autoCheckoutTBufferMin: Number(normalizedForm.autoCheckoutTBufferMin),
    lateCheckoutToleranceMin: Number(normalizedForm.lateCheckoutToleranceMin),
    defaultShiftEnd: normalizedForm.defaultShiftEnd,
  };
}

function formatOperationalSettingsTimestamp() {
  return new Date().toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getOperationalSettingsErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

function reportInlineAlert(payload) {
  globalThis.window?.showInlineAlert?.(payload);
}

function backendOperationalSettingsAlpineData(
  service = {
    getOperationalSettings,
    updateOperationalSettings,
  },
) {
  return {
    settingsService: service,
    isLoading: false,
    isSaving: false,
    hasLoadedCanonicalSettings: false,
    loadError: "",
    saveError: "",
    fieldErrors: {},
    form: createDefaultBackendOperationalSettingsForm(),
    originalForm: createDefaultBackendOperationalSettingsForm(),
    lastLoadedAt: "",
    lastSavedAt: "",

    get hasChanges() {
      return hasBackendOperationalSettingsChanges(this.form, this.originalForm);
    },

    get canSave() {
      return (
        this.hasLoadedCanonicalSettings &&
        !this.isLoading &&
        !this.isSaving &&
        this.hasChanges
      );
    },

    async init() {
      await this.loadSettings();
    },

    applyCanonicalSettings(settings) {
      const formState =
        createBackendOperationalSettingsFormFromResponse(settings);

      this.form = { ...formState };
      this.originalForm = { ...formState };
      this.fieldErrors = {};
      this.loadError = "";
      this.saveError = "";
      this.hasLoadedCanonicalSettings = true;
    },

    async loadSettings() {
      this.isLoading = true;
      this.loadError = "";
      this.saveError = "";

      try {
        const settings = await this.settingsService.getOperationalSettings();
        this.applyCanonicalSettings(settings);
        this.lastLoadedAt = formatOperationalSettingsTimestamp();
      } catch (error) {
        this.hasLoadedCanonicalSettings = false;
        this.loadError = getOperationalSettingsErrorMessage(
          error,
          "Gagal memuat pengaturan operasional dari backend.",
        );
      } finally {
        this.isLoading = false;
      }
    },

    validateForm() {
      this.fieldErrors = validateBackendOperationalSettingsForm(this.form);
      return Object.keys(this.fieldErrors).length === 0;
    },

    getFieldError(key) {
      return this.fieldErrors[key] || "";
    },

    async saveSettings() {
      this.saveError = "";

      if (!this.validateForm()) {
        this.saveError =
          "Periksa kembali field yang wajib diisi sebelum menyimpan pengaturan operasional.";
        return;
      }

      this.isSaving = true;

      try {
        const payload = toBackendOperationalSettingsPayload(this.form);
        const settings =
          await this.settingsService.updateOperationalSettings(payload);

        this.applyCanonicalSettings(settings);
        this.lastSavedAt = formatOperationalSettingsTimestamp();

        reportInlineAlert({
          type: "success",
          title: "Perubahan tersimpan",
          message: "Perubahan siap dipakai untuk alur operasional admin.",
        });
      } catch (error) {
        this.saveError = getOperationalSettingsErrorMessage(
          error,
          "Gagal menyimpan pengaturan operasional ke backend.",
        );
      } finally {
        this.isSaving = false;
      }
    },

    resetForm() {
      this.form = { ...this.originalForm };
      this.fieldErrors = {};
      this.saveError = "";
    },
  };
}

export {
  OPERATIONAL_SETTING_KEYS,
  createDefaultBackendOperationalSettingsForm,
  createBackendOperationalSettingsFormFromResponse,
  normalizeBackendOperationalSettingsForm,
  validateBackendOperationalSettingsForm,
  hasBackendOperationalSettingsChanges,
  toBackendOperationalSettingsPayload,
  backendOperationalSettingsAlpineData,
};
