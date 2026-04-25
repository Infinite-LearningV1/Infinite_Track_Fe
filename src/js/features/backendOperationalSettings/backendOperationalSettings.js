import {
  createEmptyBackendOperationalSettingsDraft,
  INTEGER_OPERATIONAL_SETTING_KEYS,
  OPERATIONAL_SETTING_KEYS,
} from "./backendOperationalSettings.constants.js";

function createDefaultBackendOperationalSettingsForm() {
  return createEmptyBackendOperationalSettingsDraft();
}

function normalizeBackendOperationalSettingsForm(form = {}) {
  return {
    GEOFENCE_RADIUS_DEFAULT_M: String(
      form.GEOFENCE_RADIUS_DEFAULT_M ?? "",
    ).trim(),
    AUTO_CHECKOUT_IDLE_MIN: String(form.AUTO_CHECKOUT_IDLE_MIN ?? "").trim(),
    AUTO_CHECKOUT_TBUFFER_MIN: String(
      form.AUTO_CHECKOUT_TBUFFER_MIN ?? "",
    ).trim(),
    LATE_CHECKOUT_TOLERANCE_MIN: String(
      form.LATE_CHECKOUT_TOLERANCE_MIN ?? "",
    ).trim(),
    DEFAULT_SHIFT_END: String(form.DEFAULT_SHIFT_END ?? "").trim(),
  };
}

function isIntegerString(value) {
  return /^\d+$/.test(String(value ?? "").trim());
}

function isTimeString(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value ?? "").trim());
}

function validateBackendOperationalSettingsForm(form = {}) {
  const normalizedForm = normalizeBackendOperationalSettingsForm(form);
  const errors = {};

  for (const key of INTEGER_OPERATIONAL_SETTING_KEYS) {
    if (!isIntegerString(normalizedForm[key])) {
      errors[key] = `${key} wajib diisi dengan bilangan bulat.`;
    }
  }

  if (!isTimeString(normalizedForm.DEFAULT_SHIFT_END)) {
    errors.DEFAULT_SHIFT_END =
      "DEFAULT_SHIFT_END wajib diisi dalam format HH:mm.";
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

function backendOperationalSettingsAlpineData() {
  return {
    isLoading: false,
    isSaving: false,
    loadError: "",
    saveError: "",
    loadMode: "shell_only",
    infoMessage:
      "Backend canonical untuk load/save setting ini belum tersedia di repo ini. Nilai yang Anda isi di halaman ini hanya temporary draft sementara di memori halaman dan akan hilang saat refresh.",
    fieldErrors: {},
    form: createDefaultBackendOperationalSettingsForm(),
    originalForm: createDefaultBackendOperationalSettingsForm(),
    lastSavedDraftAt: "",

    get hasChanges() {
      return hasBackendOperationalSettingsChanges(this.form, this.originalForm);
    },

    get canSave() {
      return !this.isLoading && !this.isSaving && this.hasChanges;
    },

    init() {
      this.resetToDefaultDraft();
    },

    resetToDefaultDraft() {
      this.form = { ...createEmptyBackendOperationalSettingsDraft() };
      this.originalForm = { ...createEmptyBackendOperationalSettingsDraft() };
      this.fieldErrors = {};
      this.loadError = "";
      this.saveError = "";
    },

    validateForm() {
      this.fieldErrors = validateBackendOperationalSettingsForm(this.form);
      return Object.keys(this.fieldErrors).length === 0;
    },

    getFieldError(key) {
      return this.fieldErrors[key] || "";
    },

    async saveDraft() {
      this.saveError = "";

      if (!this.validateForm()) {
        this.saveError =
          "Periksa kembali field yang wajib diisi sebelum menyimpan draft shell INF-142.";
        return;
      }

      this.isSaving = true;

      try {
        const normalizedForm = normalizeBackendOperationalSettingsForm(this.form);

        this.form = { ...normalizedForm };
        this.originalForm = { ...normalizedForm };
        this.lastSavedDraftAt = "";

        globalThis.window?.showInlineAlert?.({
          type: "warning",
          title: "Draft hanya sementara",
          message:
            "Draft shell INF-142 hanya tersimpan di memori halaman ini, belum dikirim ke backend canonical, dan akan hilang saat refresh.",
        });
      } catch (error) {
        this.saveError = error?.message || "Gagal menyimpan draft shell INF-142.";
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
  normalizeBackendOperationalSettingsForm,
  validateBackendOperationalSettingsForm,
  hasBackendOperationalSettingsChanges,
  backendOperationalSettingsAlpineData,
};
