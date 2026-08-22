import test from "node:test";
import assert from "node:assert/strict";
import { bookingListAlpineData } from "../../src/js/features/wfaBooking/bookingList.js";

test("delete confirmation preserves row context and names the permanent action", () => {
  const previousWindow = globalThis.window;
  let confirmation;
  globalThis.window = {
    showAlertModal: (options) => {
      confirmation = options;
    },
  };

  try {
    const state = bookingListAlpineData();
    const record = {
      id: 17,
      employee_name: "Andi <Admin>",
      schedule_date: "2026-08-15",
    };

    state.confirmDelete(record);

    assert.equal(state.deleteState.record, record);
    assert.equal(state.deleteTargetId, 17);
    assert.match(confirmation.message, /Andi &lt;Admin&gt;/);
    assert.doesNotMatch(confirmation.message, /<Admin>/);
    assert.match(confirmation.message, /15-08-2026/);
    assert.match(confirmation.message, /permanen/i);
    assert.match(confirmation.message, /tidak dapat dibatalkan/i);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("deleting the only row on a trailing page refetches the previous page", async () => {
  const requests = [];
  const state = bookingListAlpineData({
    deleteBooking: async () => ({ success: true }),
    getBookings: async (params) => {
      requests.push(params);
      return {
        data: {
          bookings: [],
          pagination: {
            current_page: 2,
            total_pages: 2,
            total_records: 20,
            records_per_page: 10,
          },
        },
      };
    },
  });
  state.appliedQuery.page = 3;
  state.bookings = [
    { id: 99, employee_name: "Andi", schedule_date: "2026-08-15" },
  ];
  state.pagination.total_records = 21;
  state.deleteState.record = state.bookings[0];
  await state.executeDelete();
  assert.equal(state.appliedQuery.page, 2);
  assert.equal(requests[0].page, 2);
});

test("duplicate delete is blocked and errors preserve rows for retry", async () => {
  let calls = 0;
  const state = bookingListAlpineData({
    deleteBooking: async () => {
      calls += 1;
      throw Object.assign(new Error("failed"), { status: 500 });
    },
    getBookings: async () => ({ data: { bookings: [], pagination: {} } }),
  });
  state.bookings = [{ id: 4 }];
  state.deleteState.record = state.bookings[0];
  const first = state.executeDelete();
  const second = state.executeDelete();
  await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.equal(state.bookings[0].id, 4);
  assert.equal(state.deleteState.error, "failed");
});

test("404 delete warns and refetches unchanged active query", async () => {
  const requests = [];
  let notices = 0;
  const state = bookingListAlpineData({
    deleteBooking: async () => {
      throw Object.assign(new Error("gone"), { status: 404 });
    },
    getBookings: async (params) => {
      requests.push(params);
      return { data: { bookings: [], pagination: {} } };
    },
    notify: () => {
      notices += 1;
    },
  });
  state.appliedQuery.search = "Andi";
  state.deleteState.record = { id: 7 };
  await state.executeDelete();
  assert.equal(notices, 1);
  assert.equal(requests[0].search, "Andi");
});

test("delete failure emits one feedback event through the canonical notifier", async () => {
  const previousWindow = globalThis.window;
  let notices = 0;
  globalThis.window = {
    showInlineAlert: () => {
      notices += 1;
    },
  };

  try {
    const state = bookingListAlpineData({
      deleteBooking: async () => {
        throw Object.assign(new Error("failed"), { status: 500 });
      },
      getBookings: async () => ({ data: { bookings: [], pagination: {} } }),
    });
    state.deleteState.record = { id: 8 };

    await state.executeDelete();

    assert.equal(notices, 1);
  } finally {
    globalThis.window = previousWindow;
  }
});
