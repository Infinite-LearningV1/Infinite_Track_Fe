import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(
  new URL("../src/management-attendance.html", import.meta.url),
);

test("management Attendance uses the descriptor-preserving page factory", () => {
  const page = readFileSync(pagePath, "utf8");

  assert.match(
    page,
    /x-data="attendanceManagementPageData\(mapDetailModalState\(\)\)"/,
  );
  assert.doesNotMatch(page, /\.\.\.attendanceLogAlpineData\(\)/);
});

test("actual page composition keeps Attendance aliases live", async () => {
  const attendanceModule =
    await import("../src/js/features/attendance/attendanceLog.js");
  const factory = attendanceModule.attendanceManagementPageData;
  assert.equal(typeof factory, "function");

  const pageState = factory({ isMapDetailModalOpen: false }, { browser: null });
  const descriptors = Object.getOwnPropertyDescriptors(pageState);

  for (const accessor of [
    "searchQuery",
    "activeFilterCount",
    "attendanceData",
    "isLoading",
    "errorMessage",
  ]) {
    assert.equal(typeof descriptors[accessor].get, "function", accessor);
  }
  assert.equal(typeof descriptors.searchQuery.set, "function");
  assert.equal(typeof descriptors.attendanceData.set, "function");

  pageState.searchQuery = "Ayu";
  assert.equal(pageState.appliedQuery.search, "Ayu");

  pageState.appliedQuery.appliedFilters.mode = "WFH";
  pageState.appliedQuery.appliedFilters.checkoutState = "open";
  assert.equal(pageState.activeFilterCount, 2);

  const laterRows = [{ idAttendance: 42 }];
  pageState.rows = laterRows;
  pageState.tableState.loading = true;
  pageState.tableState.error = "server unavailable";
  assert.equal(pageState.attendanceData, laterRows);
  assert.equal(pageState.isLoading, true);
  assert.equal(pageState.errorMessage, "server unavailable");
});
