import test from "node:test";
import assert from "node:assert/strict";

import { createBookingCommandService } from "../../src/js/services/bookingService.js";
import {
  WFA_BOOKING_REJECTION_EVENTS,
  bookingRejectionAlpineData,
} from "../../src/js/features/wfaBooking/bookingRejection.js";

test("approve sends only the approved status", async () => {
  const calls = [];
  const service = createBookingCommandService(async (config) => {
    calls.push(config);
    return {
      data: {
        success: true,
        data: { booking: { booking_id: 1, status: "approved" } },
      },
    };
  });

  await service.approveBooking(1);
  assert.deepEqual(calls[0].data, { status: "approved" });
});

test("reject sends the exact Backend contract", async () => {
  const calls = [];
  const service = createBookingCommandService(async (config) => {
    calls.push(config);
    return {
      data: {
        success: true,
        data: { booking: { booking_id: 1, status: "rejected" } },
      },
    };
  });

  await service.rejectBooking(1, {
    rejectionReasonId: 9,
    rejectionNote: "Additional context",
  });

  assert.deepEqual(calls[0].data, {
    status: "rejected",
    rejection_reason_id: 9,
    rejection_note: "Additional context",
  });
});

test("reject validates the command before network access", async () => {
  let calls = 0;
  const service = createBookingCommandService(async () => {
    calls += 1;
  });

  await assert.rejects(
    () =>
      service.rejectBooking(1, {
        rejectionReasonId: 0,
        rejectionNote: null,
      }),
    /positive integer/,
  );
  assert.equal(calls, 0);
});

test("booking commands preserve Backend error code", async () => {
  const service = createBookingCommandService(async () => {
    const error = new Error("request failed");
    error.response = {
      status: 422,
      data: {
        code: "REJECTION_NOTE_REQUIRED",
        message: "Note is required",
      },
    };
    throw error;
  });

  await assert.rejects(
    () =>
      service.rejectBooking(1, {
        rejectionReasonId: 9,
        rejectionNote: null,
      }),
    (error) => {
      assert.equal(error.code, "REJECTION_NOTE_REQUIRED");
      assert.equal(error.status, 422);
      return true;
    },
  );
});

function createRejectionDependencies() {
  const calls = [];
  const events = [];
  return {
    calls,
    events,
    dependencies: {
      async listWfaReasons() {
        return [
          {
            id: 1,
            label: "Policy mismatch",
            isActive: true,
            isOther: false,
            sortOrder: 1,
          },
          {
            id: 2,
            label: "Other",
            isActive: true,
            isOther: true,
            sortOrder: 2,
          },
          {
            id: 3,
            label: "Inactive",
            isActive: false,
            isOther: false,
            sortOrder: 3,
          },
        ];
      },
      async rejectBooking(bookingId, command) {
        calls.push([bookingId, command]);
        return { success: true };
      },
      dispatchEvent(name, detail) {
        events.push([name, detail]);
      },
    },
  };
}

test("opening rejection loads reasons but does not mutate booking", async () => {
  const { dependencies, calls } = createRejectionDependencies();
  const state = bookingRejectionAlpineData(dependencies);
  await state.open({ id: 10, employee_name: "Ayu" });

  assert.equal(state.isOpen, true);
  assert.equal(state.reasons.length, 2);
  assert.equal(calls.length, 0);
});

test("missing reason and Other without note block submission", async () => {
  const { dependencies, calls } = createRejectionDependencies();
  const state = bookingRejectionAlpineData(dependencies);
  await state.open({ id: 10 });

  await state.submit();
  assert.match(state.fieldErrors.reason, /wajib/);

  state.selectedReasonId = "2";
  state.rejectionNote = "   ";
  await state.submit();
  assert.match(state.fieldErrors.note, /Lainnya/);
  assert.equal(calls.length, 0);
});

test("successful rejection sends one command and emits one success event", async () => {
  const { dependencies, calls, events } = createRejectionDependencies();
  const state = bookingRejectionAlpineData(dependencies);
  await state.open({ id: 10 });
  state.selectedReasonId = "1";

  await Promise.all([state.submit(), state.submit()]);

  assert.deepEqual(calls, [
    [10, { rejectionReasonId: 1, rejectionNote: null }],
  ]);
  assert.equal(events.length, 1);
  assert.equal(events[0][0], WFA_BOOKING_REJECTION_EVENTS.succeeded);
  assert.equal(state.isOpen, false);
});

test("failed rejection preserves the editable transaction", async () => {
  const { dependencies } = createRejectionDependencies();
  dependencies.rejectBooking = async () => {
    const error = new Error("Reason is no longer active");
    error.code = "REJECTION_REASON_NOT_ACTIVE";
    throw error;
  };

  const state = bookingRejectionAlpineData(dependencies);
  await state.open({ id: 10 });
  state.selectedReasonId = "1";
  state.rejectionNote = "Context";
  await state.submit();

  assert.equal(state.isOpen, true);
  assert.equal(state.selectedReasonId, "1");
  assert.equal(state.rejectionNote, "Context");
  assert.match(state.submitError, /tidak lagi aktif/i);
});

test("reason load failure remains retryable and never submits", async () => {
  const { dependencies, calls } = createRejectionDependencies();
  dependencies.listWfaReasons = async () => {
    throw new Error("Network unavailable");
  };
  const state = bookingRejectionAlpineData(dependencies);

  await state.open({ id: 10 });
  await state.submit();

  assert.equal(state.isOpen, true);
  assert.equal(state.hasLoadedReasons, false);
  assert.match(state.reasonsLoadError, /Network unavailable/);
  assert.equal(calls.length, 0);
});
