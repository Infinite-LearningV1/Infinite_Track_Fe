import test from "node:test";
import assert from "node:assert/strict";

import { attendanceLogAlpineData } from "../../src/js/features/attendance/attendanceLog.js";

test("checkout text distinguishes open, completed, and unknown Backend evidence", () => {
  const state = attendanceLogAlpineData({ browser: null });

  assert.equal(typeof state.getAttendanceCheckoutText, "function");
  assert.equal(
    state.getAttendanceCheckoutText({
      checkoutState: "open",
      timeOut: null,
    }),
    "Belum checkout",
  );
  assert.equal(
    state.getAttendanceCheckoutText({
      checkoutState: "completed",
      timeOut: "17:00",
    }),
    "17:00",
  );
  for (const record of [
    { checkoutState: "", timeOut: "" },
    { checkoutState: "", timeOut: undefined },
    { checkoutState: "", timeOut: 17 },
    {},
  ]) {
    assert.equal(state.getAttendanceCheckoutText(record), "-");
  }
});
