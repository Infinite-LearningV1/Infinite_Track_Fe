import test from "node:test";
import assert from "node:assert/strict";

import { createBookingCommandService } from "../src/js/services/bookingService.js";

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
