import test from "node:test";
import assert from "node:assert/strict";
import { createBookingDetailDrawerLifecycle } from "../src/js/features/wfaBooking/bookingDetailDrawerLifecycle.js";

test("drawer owns map only when coordinates are finite", () => {
  const calls = [];
  const lifecycle = createBookingDetailDrawerLifecycle({ mapAdapter: { initialize: (location) => calls.push(["init", location]), destroy: () => calls.push(["destroy"]) } });
  lifecycle.open({ employee_name: "Andi", location_latitude: 0, location_longitude: 119.8, radiusSnapshot: null, location_name: "Palu" });
  assert.equal(lifecycle.isOpen, true);
  assert.equal(calls[0][0], "init");
  lifecycle.close();
  assert.deepEqual(calls.at(-1), ["destroy"]);
});

test("missing coordinates and null processedBy remain truthful", () => {
  const calls = [];
  const lifecycle = createBookingDetailDrawerLifecycle({ mapAdapter: { initialize: () => calls.push("init"), destroy: () => calls.push("destroy") } });
  const row = { location_latitude: null, location_longitude: 12, processedBy: null, approved_by: { full_name: "Invented" } };
  lifecycle.open(row);
  assert.deepEqual(calls, []);
  assert.equal(lifecycle.selectedBooking.processedBy, null);
});

test("replacement destroys prior map and close is idempotent", () => {
  const calls = [];
  const lifecycle = createBookingDetailDrawerLifecycle({ mapAdapter: { initialize: (row) => calls.push(["init", row.id]), destroy: () => calls.push(["destroy"]) } });
  lifecycle.open({ id: 1, location_latitude: 1, location_longitude: 2 });
  lifecycle.open({ id: 2, location_latitude: 3, location_longitude: 4 });
  lifecycle.close(); lifecycle.close();
  assert.deepEqual(calls, [["init", 1], ["destroy"], ["init", 2], ["destroy"]]);
});
