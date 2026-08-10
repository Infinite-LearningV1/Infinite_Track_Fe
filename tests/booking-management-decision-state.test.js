import test from "node:test";
import assert from "node:assert/strict";
import { bookingListAlpineData } from "../src/js/features/wfaBooking/bookingList.js";

test("duplicate approval is blocked and failure keeps review context", async () => {
  let resolveApproval;
  let calls = 0;
  const state = bookingListAlpineData({
    approveBooking: () => { calls += 1; return new Promise((resolve) => { resolveApproval = resolve; }); },
    getBookings: async () => ({ data: { bookings: [], pagination: {} } }),
  });
  state.drawerState = { open: true, selectedBooking: { id: 42, status: "pending" } };
  const first = state.approveSelectedBooking();
  const second = state.approveSelectedBooking();
  assert.equal(calls, 1);
  await second;
  resolveApproval({ success: false, message: "No" });
  await first;
  assert.equal(state.drawerState.open, true);
  assert.equal(state.drawerState.selectedBooking.id, 42);
});

test("approval success closes drawer and refreshes once", async () => {
  let calls = 0;
  const state = bookingListAlpineData({ approveBooking: async (id) => { assert.equal(id, 7); return { success: true }; }, getBookings: async () => { calls += 1; return { data: { bookings: [], pagination: {} } }; } });
  state.drawerState = { open: true, selectedBooking: { id: 7, status: "pending" } };
  await state.approveSelectedBooking();
  assert.equal(calls, 1);
  assert.equal(state.drawerState.open, false);
});

test("review rejection dispatches existing event without mutating", () => {
  const events = [];
  const state = bookingListAlpineData({ notify: () => {} });
  globalThis.window = { dispatchEvent: (event) => events.push(event) };
  const booking = { id: 5, status: "pending" };
  state.openRejectBooking(booking);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "wfa-booking-rejection:open");
  assert.equal(events[0].detail.booking, booking);
  delete globalThis.window;
});
