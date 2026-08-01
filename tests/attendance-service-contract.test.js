import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAttendanceListUrl,
  deleteAttendance,
  getAttendanceById,
  getAttendanceLog,
  normalizeAttendanceServiceError,
} from "../src/js/services/attendanceService.js";

test("buildAttendanceListUrl serializes every enabled public parameter", () => {
  assert.equal(
    buildAttendanceListUrl("http://api.test/api", {
      page: 2,
      limit: 25,
      search: "Ayu",
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "WFH",
      status: "late",
      checkout_state: "open",
    }),
    "http://api.test/api/attendance?page=2&limit=25&search=Ayu&from=2026-07-01&to=2026-07-31&mode=WFH&status=late&checkout_state=open",
  );
});

test("buildAttendanceListUrl omits empty, unsupported, and provisional sort parameters", () => {
  assert.equal(
    buildAttendanceListUrl("/api/", {
      page: 0,
      limit: 10,
      search: "",
      from: null,
      to: undefined,
      mode: "WFO",
      status: false,
      checkout_state: "completed",
      sortBy: "attendance_date",
      sortOrder: "ASC",
      debug: "1",
    }),
    "/api/attendance?page=0&limit=10&mode=WFO&status=false&checkout_state=completed",
  );
});

test("getAttendanceLog uses the canonical list URL and preserves its response contract", async () => {
  let requestConfig;
  const responseData = {
    data: [],
    pagination: {
      current_page: 1,
      total_pages: 1,
      total_records: 0,
      records_per_page: 10,
      has_next_page: false,
      has_prev_page: false,
    },
  };

  const result = await getAttendanceLog(
    {
      page: 1,
      limit: 10,
      search: "Ayu",
      from: "2026-07-01",
      to: "2026-07-31",
      mode: "WFH",
      status: "late",
      checkout_state: "open",
      sortBy: "attendance_date",
      sortOrder: "ASC",
    },
    async (config) => {
      requestConfig = config;
      return { data: responseData };
    },
  );

  assert.equal(
    requestConfig.url,
    "/api/attendance?page=1&limit=10&search=Ayu&from=2026-07-01&to=2026-07-31&mode=WFH&status=late&checkout_state=open",
  );
  assert.equal(requestConfig.method, "get");
  assert.strictEqual(result, responseData);
});

test("getAttendanceById accepts attendance ID 0", async () => {
  let requestConfig;
  const responseData = {
    success: true,
    message: "Detail absensi berhasil diambil",
    data: { id_attendance: 0, user: { full_name: "Ayu Lestari" } },
  };

  const result = await getAttendanceById(0, async (config) => {
    requestConfig = config;
    return { data: responseData };
  });

  assert.equal(requestConfig.url, "/api/attendance/0");
  assert.equal(requestConfig.method, "get");
  assert.strictEqual(result, responseData);
});

test('getAttendanceById accepts attendance ID string "0"', async () => {
  let requestConfig;
  const responseData = {
    success: true,
    message: "Detail absensi berhasil diambil",
    data: { id_attendance: "0", user: { full_name: "Ayu Lestari" } },
  };

  const result = await getAttendanceById("0", async (config) => {
    requestConfig = config;
    return { data: responseData };
  });

  assert.equal(requestConfig.url, "/api/attendance/0");
  assert.equal(requestConfig.method, "get");
  assert.strictEqual(result, responseData);
});

for (const missingId of [undefined, null, "", "   "]) {
  test(`getAttendanceById rejects missing ID ${String(missingId)} before requesting`, async () => {
    let requestCount = 0;

    await assert.rejects(
      getAttendanceById(missingId, async () => {
        requestCount += 1;
        return { data: {} };
      }),
      { message: "ID absensi tidak valid" },
    );

    assert.equal(requestCount, 0);
  });
}

test("normalizeAttendanceServiceError preserves Backend status, code, and message", () => {
  const normalized = normalizeAttendanceServiceError(
    {
      response: {
        status: 404,
        data: {
          code: "E_NOT_FOUND",
          message: "Data absensi tidak ditemukan",
        },
      },
    },
    "Gagal mengambil detail absensi",
  );

  assert.equal(normalized.message, "Data absensi tidak ditemukan");
  assert.equal(normalized.status, 404);
  assert.equal(normalized.code, "E_NOT_FOUND");
});

test("getAttendanceById exposes a Backend 404 for detail recovery", async (t) => {
  t.mock.method(console, "error", () => {});

  await assert.rejects(
    getAttendanceById(42, async () => {
      throw {
        response: {
          status: 404,
          data: {
            code: "E_NOT_FOUND",
            message: "Data absensi tidak ditemukan",
          },
        },
      };
    }),
    (error) => {
      assert.equal(error.message, "Data absensi tidak ditemukan");
      assert.equal(error.status, 404);
      assert.equal(error.code, "E_NOT_FOUND");
      return true;
    },
  );
});

test("list and delete calls retain Backend validation metadata", async (t) => {
  t.mock.method(console, "error", () => {});
  const backendFailure = {
    response: {
      status: 400,
      data: { code: "E_VALIDATION", message: "Rentang tanggal tidak valid" },
    },
  };
  const rejectRequest = async () => {
    throw backendFailure;
  };

  await assert.rejects(getAttendanceLog({}, rejectRequest), (error) => {
    assert.equal(error.message, "Rentang tanggal tidak valid");
    assert.equal(error.status, 400);
    assert.equal(error.code, "E_VALIDATION");
    return true;
  });

  await assert.rejects(deleteAttendance(42, rejectRequest), (error) => {
    assert.equal(error.message, "Rentang tanggal tidak valid");
    assert.equal(error.status, 400);
    assert.equal(error.code, "E_VALIDATION");
    return true;
  });
});

test("deleteAttendance preserves the successful request and response contract", async () => {
  let requestConfig;
  const responseData = {
    success: true,
    message: "Data absensi berhasil dihapus",
  };

  const result = await deleteAttendance(42, async (config) => {
    requestConfig = config;
    return { data: responseData };
  });

  assert.equal(requestConfig.url, "/api/attendance/42");
  assert.equal(requestConfig.method, "delete");
  assert.strictEqual(result, responseData);
});
