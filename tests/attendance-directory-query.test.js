import test from "node:test";
import assert from "node:assert/strict";

import {
  ATTENDANCE_CHECKOUT_STATES,
  ATTENDANCE_MODES,
  ATTENDANCE_PAGE_SIZES,
  DEFAULT_ATTENDANCE_QUERY,
  parseAttendanceDirectoryQuery,
  serializeAttendanceDirectoryQuery,
  toAttendanceRequestParams,
  validateAttendanceDateRange,
} from "../src/js/features/attendance/attendanceDirectoryQuery.js";

test("empty query returns canonical defaults with independent filter state", () => {
  const first = parseAttendanceDirectoryQuery(new URLSearchParams());
  const second = parseAttendanceDirectoryQuery(new URLSearchParams());

  assert.deepEqual(DEFAULT_ATTENDANCE_QUERY, {
    page: 1,
    limit: 10,
    search: "",
    appliedFilters: {
      from: "",
      to: "",
      mode: "",
      status: "",
      checkoutState: "",
    },
  });
  assert.deepEqual(first, DEFAULT_ATTENDANCE_QUERY);
  assert.notEqual(first, DEFAULT_ATTENDANCE_QUERY);
  assert.notEqual(
    first.appliedFilters,
    DEFAULT_ATTENDANCE_QUERY.appliedFilters,
  );
  assert.notEqual(first.appliedFilters, second.appliedFilters);
  assert.deepEqual(ATTENDANCE_PAGE_SIZES, [10, 25, 50, 100]);
  assert.deepEqual(ATTENDANCE_MODES, ["WFO", "WFH", "WFA"]);
  assert.deepEqual(ATTENDANCE_CHECKOUT_STATES, ["completed", "open"]);
});

test("parses the complete canonical query", () => {
  const parsed = parseAttendanceDirectoryQuery(
    new URLSearchParams(
      "page=3&limit=25&search=%20ayu%20&from=2026-07-01&to=2026-07-31&mode=WFH&status=late&checkout_state=open",
    ),
  );

  assert.deepEqual(parsed, {
    page: 3,
    limit: 25,
    search: "ayu",
    appliedFilters: {
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "WFH",
      status: "late",
      checkoutState: "open",
    },
  });
});

test("invalid URL values fall back without creating an invalid applied range", () => {
  const parsed = parseAttendanceDirectoryQuery(
    new URLSearchParams(
      "page=0&limit=20&from=2026-02-30&to=2026-03-01&mode=REMOTE&checkout_state=pending",
    ),
  );

  assert.deepEqual(parsed, DEFAULT_ATTENDANCE_QUERY);
});

test("serialization omits defaults, trims search, and preserves unrelated keys", () => {
  const serialized = serializeAttendanceDirectoryQuery(
    {
      page: 2,
      limit: 50,
      search: "  Ayu  ",
      appliedFilters: {
        from: "2026-07-01",
        to: "2026-07-31",
        mode: "WFA",
        status: "ontime",
        checkoutState: "completed",
      },
    },
    new URLSearchParams("debug=1&page=9&limit=100&search=old"),
  );

  assert.equal(
    serialized.toString(),
    "debug=1&page=2&limit=50&search=Ayu&from=2026-07-01&to=2026-07-31&mode=WFA&status=ontime&checkout_state=completed",
  );
  assert.equal(
    serializeAttendanceDirectoryQuery(
      parseAttendanceDirectoryQuery(new URLSearchParams()),
      new URLSearchParams("debug=1"),
    ).toString(),
    "debug=1",
  );
});

test("request mapping uses Backend snake case and omits empty filters", () => {
  assert.deepEqual(
    toAttendanceRequestParams({
      page: 4,
      limit: 25,
      search: "  Ayu  ",
      appliedFilters: {
        from: "2026-07-01",
        to: "2026-07-31",
        mode: "WFH",
        status: "late",
        checkoutState: "open",
      },
    }),
    {
      page: 4,
      limit: 25,
      search: "Ayu",
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "WFH",
      status: "late",
      checkout_state: "open",
    },
  );

  assert.deepEqual(toAttendanceRequestParams(DEFAULT_ATTENDANCE_QUERY), {
    page: 1,
    limit: 10,
  });
});

test("provisional sort URL parameters never enter state, URLs, or requests", () => {
  const parsed = parseAttendanceDirectoryQuery(
    new URLSearchParams("sortBy=attendance_date&sortOrder=ASC"),
  );
  const serialized = serializeAttendanceDirectoryQuery(
    parsed,
    new URLSearchParams("sortBy=attendance_date&sortOrder=ASC&debug=1"),
  );
  const request = toAttendanceRequestParams(parsed);

  assert.equal("sortBy" in parsed, false);
  assert.equal("sortOrder" in parsed, false);
  assert.equal("sortBy" in DEFAULT_ATTENDANCE_QUERY, false);
  assert.equal("sortOrder" in DEFAULT_ATTENDANCE_QUERY, false);
  assert.equal(serialized.has("sortBy"), false);
  assert.equal(serialized.has("sortOrder"), false);
  assert.equal(serialized.get("debug"), "1");
  assert.equal("sortBy" in request, false);
  assert.equal("sortOrder" in request, false);
  assert.equal("checkoutState" in request, false);
});

test("date validation accepts an empty or complete real chronological range", () => {
  assert.deepEqual(validateAttendanceDateRange({ from: "", to: "" }), {
    valid: true,
    message: "",
  });
  assert.deepEqual(
    validateAttendanceDateRange({
      from: "2024-02-29",
      to: "2024-02-29",
    }),
    { valid: true, message: "" },
  );
});

test("date validation rejects incomplete ranges", () => {
  assert.deepEqual(
    validateAttendanceDateRange({ from: "2026-07-02", to: "" }),
    {
      valid: false,
      message: "Tanggal mulai dan selesai harus diisi bersama.",
    },
  );
  assert.deepEqual(
    validateAttendanceDateRange({ from: "", to: "2026-07-02" }),
    {
      valid: false,
      message: "Tanggal mulai dan selesai harus diisi bersama.",
    },
  );
});

test("date validation rejects impossible and reversed ranges", () => {
  assert.deepEqual(
    validateAttendanceDateRange({
      from: "2026-02-30",
      to: "2026-03-01",
    }),
    { valid: false, message: "Format tanggal tidak valid." },
  );
  assert.deepEqual(
    validateAttendanceDateRange({
      from: "2026-07-31",
      to: "2026-07-01",
    }),
    {
      valid: false,
      message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
    },
  );
});
