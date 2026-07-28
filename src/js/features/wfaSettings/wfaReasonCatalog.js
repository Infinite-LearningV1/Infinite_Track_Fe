import {
  createWfaReason,
  listWfaReasons,
  updateWfaReason,
} from "../../services/wfaSettingsService.js";

const EMPTY_FORM = Object.freeze({
  label: "",
  isOther: false,
  sortOrder: "0",
});

function createEmptyReasonForm() {
  return { ...EMPTY_FORM };
}

function getCatalogCopy(kind) {
  return kind === "request"
    ? {
        title: "Alasan pengajuan WFA",
        description: "Alasan yang dapat dipilih employee saat mengajukan WFA.",
      }
    : {
        title: "Alasan penolakan WFA",
        description:
          "Alasan yang wajib dipilih Management ketika menolak booking.",
      };
}

function getCatalogErrorMessage(error, fallbackMessage) {
  const messagesByCode = {
    WFA_REASON_CATALOG_CONFLICT:
      "Katalog alasan bertentangan dengan aturan Backend. Muat ulang lalu periksa alasan Lainnya.",
  };

  return messagesByCode[error?.code] || error?.message || fallbackMessage;
}

function wfaReasonCatalogAlpineData(
  kind,
  service = { listWfaReasons, createWfaReason, updateWfaReason },
) {
  return {
    kind,
    copy: getCatalogCopy(kind),
    service,
    items: [],
    isLoading: false,
    loadError: "",
    editorMode: null,
    editingId: null,
    form: createEmptyReasonForm(),
    fieldErrors: {},
    isSaving: false,
    mutatingIds: new Set(),
    saveError: "",

    async init() {
      await this.loadCatalog();
    },

    async loadCatalog() {
      if (this.isLoading) return;
      this.isLoading = true;
      this.loadError = "";

      try {
        this.items = await this.service.listWfaReasons(this.kind);
      } catch (error) {
        this.loadError = getCatalogErrorMessage(
          error,
          "Gagal memuat katalog alasan WFA.",
        );
      } finally {
        this.isLoading = false;
      }
    },

    openCreate() {
      this.editorMode = "create";
      this.editingId = null;
      this.form = createEmptyReasonForm();
      this.fieldErrors = {};
      this.saveError = "";
    },

    openEdit(reason) {
      this.editorMode = "edit";
      this.editingId = reason.id;
      this.form = {
        label: reason.label,
        isOther: reason.isOther,
        sortOrder: String(reason.sortOrder),
      };
      this.fieldErrors = {};
      this.saveError = "";
    },

    cancelEditor() {
      if (this.isSaving) return;
      this.editorMode = null;
      this.editingId = null;
      this.form = createEmptyReasonForm();
      this.fieldErrors = {};
      this.saveError = "";
    },

    validateEditor() {
      const errors = {};
      const label = String(this.form.label ?? "").trim();
      const sortOrder = String(this.form.sortOrder ?? "").trim();

      if (!label) {
        errors.label = "Label alasan wajib diisi.";
      }
      if (!/^\d+$/.test(sortOrder)) {
        errors.sortOrder =
          "Urutan wajib berupa bilangan bulat nol atau lebih besar.";
      }

      this.fieldErrors = errors;
      return Object.keys(errors).length === 0;
    },

    toMutationPayload() {
      return {
        label: String(this.form.label).trim(),
        is_other: Boolean(this.form.isOther),
        sort_order: Number(this.form.sortOrder),
      };
    },

    replaceCanonicalItem(reason) {
      const next = this.items.filter((item) => item.id !== reason.id);
      next.push(reason);
      this.items = next.sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.label.localeCompare(right.label, "id-ID"),
      );
    },

    async saveEditor() {
      if (this.isSaving || !this.validateEditor()) return;
      this.isSaving = true;
      this.saveError = "";

      try {
        const payload = this.toMutationPayload();
        const reason =
          this.editorMode === "edit"
            ? await this.service.updateWfaReason(
                this.kind,
                this.editingId,
                payload,
              )
            : await this.service.createWfaReason(this.kind, payload);

        this.replaceCanonicalItem(reason);
        this.editorMode = null;
        this.editingId = null;
        this.form = createEmptyReasonForm();
        this.fieldErrors = {};
        globalThis.window?.showInlineAlert?.({
          type: "success",
          title: "Katalog WFA diperbarui",
          message: "Perubahan telah dikonfirmasi Backend.",
        });
      } catch (error) {
        this.saveError = getCatalogErrorMessage(
          error,
          "Gagal menyimpan alasan WFA.",
        );
      } finally {
        this.isSaving = false;
      }
    },

    isMutating(reasonId) {
      return this.mutatingIds.has(reasonId);
    },

    async setReasonActive(reason, isActive) {
      if (this.isMutating(reason.id)) return;
      this.mutatingIds.add(reason.id);
      this.saveError = "";

      try {
        const updated = await this.service.updateWfaReason(
          this.kind,
          reason.id,
          {
            is_active: Boolean(isActive),
          },
        );
        this.replaceCanonicalItem(updated);
      } catch (error) {
        this.saveError = getCatalogErrorMessage(
          error,
          "Gagal mengubah status alasan WFA.",
        );
      } finally {
        this.mutatingIds.delete(reason.id);
      }
    },
  };
}

export {
  createEmptyReasonForm,
  getCatalogCopy,
  getCatalogErrorMessage,
  wfaReasonCatalogAlpineData,
};
