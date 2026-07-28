import { listWfaReasons } from "../../services/wfaSettingsService.js";
import { rejectBooking } from "../../services/bookingService.js";

const WFA_BOOKING_REJECTION_EVENTS = Object.freeze({
  open: "wfa-booking-rejection:open",
  succeeded: "wfa-booking-rejection:succeeded",
});

function getRejectionErrorMessage(error) {
  const byCode = {
    REJECTION_REASON_REQUIRED: "Pilih alasan penolakan.",
    REJECTION_REASON_NOT_FOUND:
      "Alasan penolakan tidak ditemukan. Muat ulang daftar alasan.",
    REJECTION_REASON_NOT_ACTIVE:
      "Alasan penolakan tidak lagi aktif. Pilih alasan lain.",
    REJECTION_NOTE_REQUIRED: "Keterangan wajib diisi untuk alasan Lainnya.",
  };

  return byCode[error?.code] || error?.message || "Gagal menolak booking WFA.";
}

function bookingRejectionAlpineData(
  dependencies = {
    listWfaReasons,
    rejectBooking,
    dispatchEvent(name, detail) {
      globalThis.window?.dispatchEvent?.(new CustomEvent(name, { detail }));
    },
  },
) {
  return {
    dependencies,
    isOpen: false,
    booking: null,
    reasons: [],
    hasLoadedReasons: false,
    isLoadingReasons: false,
    reasonsLoadError: "",
    selectedReasonId: "",
    rejectionNote: "",
    fieldErrors: {},
    isSubmitting: false,
    submitError: "",

    get selectedReason() {
      const id = Number(this.selectedReasonId);
      return this.reasons.find((reason) => reason.id === id) || null;
    },

    async loadReasons() {
      if (this.isLoadingReasons) return;
      this.isLoadingReasons = true;
      this.reasonsLoadError = "";

      try {
        const reasons = await this.dependencies.listWfaReasons("rejection");
        this.reasons = reasons.filter((reason) => reason.isActive);
        this.hasLoadedReasons = true;
      } catch (error) {
        this.hasLoadedReasons = false;
        this.reasonsLoadError =
          error.message || "Gagal memuat alasan penolakan.";
      } finally {
        this.isLoadingReasons = false;
      }
    },

    async open(booking) {
      if (!booking?.id) return;
      this.booking = booking;
      this.selectedReasonId = "";
      this.rejectionNote = "";
      this.fieldErrors = {};
      this.submitError = "";
      this.isOpen = true;

      if (!this.hasLoadedReasons) {
        await this.loadReasons();
      }
    },

    close() {
      if (this.isSubmitting) return;
      this.isOpen = false;
      this.booking = null;
      this.selectedReasonId = "";
      this.rejectionNote = "";
      this.fieldErrors = {};
      this.submitError = "";
    },

    validate() {
      const errors = {};
      const reason = this.selectedReason;

      if (!reason) {
        errors.reason = "Alasan penolakan wajib dipilih.";
      }
      if (reason?.isOther && !String(this.rejectionNote).trim()) {
        errors.note = "Keterangan wajib diisi untuk alasan Lainnya.";
      }

      this.fieldErrors = errors;
      return Object.keys(errors).length === 0;
    },

    async submit() {
      if (this.isSubmitting || !this.booking || !this.validate()) return;
      this.isSubmitting = true;
      this.submitError = "";

      try {
        const response = await this.dependencies.rejectBooking(
          this.booking.id,
          {
            rejectionReasonId: this.selectedReason.id,
            rejectionNote: String(this.rejectionNote).trim() || null,
          },
        );
        const completedBooking = this.booking;
        this.isOpen = false;
        this.booking = null;
        this.selectedReasonId = "";
        this.rejectionNote = "";
        this.fieldErrors = {};
        this.dependencies.dispatchEvent(
          WFA_BOOKING_REJECTION_EVENTS.succeeded,
          {
            booking: completedBooking,
            response,
          },
        );
      } catch (error) {
        this.submitError = getRejectionErrorMessage(error);
        if (error?.code === "REJECTION_REASON_NOT_ACTIVE") {
          this.hasLoadedReasons = false;
        }
      } finally {
        this.isSubmitting = false;
      }
    },
  };
}

export {
  WFA_BOOKING_REJECTION_EVENTS,
  getRejectionErrorMessage,
  bookingRejectionAlpineData,
};
