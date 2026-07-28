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

test("page composes one canonical page-size control and one audit table shell", () => {
  const page = readFileSync(pagePath, "utf8");
  const table = readFileSync(
    new URL("../src/partials/table/table-attendance.html", import.meta.url),
    "utf8",
  );
  const composed = `${page}\n${table}`;

  assert.equal(composed.match(/\bid="attendancePageSize"/g)?.length ?? 0, 1);
  assert.equal(composed.match(/\bfor="attendancePageSize"/g)?.length ?? 0, 1);
  assert.equal(
    composed.match(/\bdata-attendance-audit-shell\b/g)?.length ?? 0,
    1,
  );
  assert.doesNotMatch(
    page,
    /<!-- Attendance Table -->\s*<div[^>]+>\s*<include src="\.\/partials\/table\/table-attendance\.html"><\/include>\s*<\/div>/s,
  );
});

test("actual page composition keeps canonical Attendance state live", async () => {
  const attendanceModule =
    await import("../src/js/features/attendance/attendanceLog.js");
  const factory = attendanceModule.attendanceManagementPageData;
  assert.equal(typeof factory, "function");

  const pageState = factory({ isMapDetailModalOpen: false }, { browser: null });
  const descriptors = Object.getOwnPropertyDescriptors(pageState);

  for (const accessor of [
    "searchQuery",
    "activeFilterCount",
    "emptyStateMessage",
  ]) {
    assert.equal(typeof descriptors[accessor].get, "function", accessor);
  }
  assert.equal(typeof descriptors.searchQuery.set, "function");

  pageState.searchQuery = "Ayu";
  assert.equal(pageState.appliedQuery.search, "Ayu");

  pageState.appliedQuery.appliedFilters.mode = "WFH";
  pageState.appliedQuery.appliedFilters.checkoutState = "open";
  assert.equal(pageState.activeFilterCount, 2);

  assert.equal("attendanceData" in descriptors, false);
  assert.equal("isLoading" in descriptors, false);
  assert.equal("errorMessage" in descriptors, false);
});
