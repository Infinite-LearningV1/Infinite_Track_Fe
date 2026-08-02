import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const table = readFileSync(
  new URL("../src/partials/table/table-attendance.html", import.meta.url),
  "utf8",
);

test("renders the approved seven audit headers", () => {
  for (const label of [
    "Pegawai",
    "Tanggal",
    "Kehadiran",
    "Mode",
    "Status",
    "Lokasi",
    "Aksi",
  ]) {
    assert.match(table, new RegExp(`>\\s*${label}\\s*<`));
  }

  assert.doesNotMatch(table, />\s*User ID\s*</);
  assert.doesNotMatch(table, />\s*Koordinat\s*</);
  assert.doesNotMatch(table, />\s*Time In\s*</);
  assert.doesNotMatch(table, />\s*Time Out\s*</);
  assert.doesNotMatch(table, />\s*Work Hour\s*</);
});

test("binds only the Backend-supported audit sort keys", () => {
  for (const key of ["full_name", "attendance_date", "time_in", "status"]) {
    assert.match(table, new RegExp(`toggleAttendanceSort\\('${key}'\\)`));
    assert.match(table, new RegExp(`attendanceSortDirection\\('${key}'\\)`));
  }

  assert.doesNotMatch(
    table,
    /toggleAttendanceSort\('(mode|location|actions)'\)/,
  );
});

test("renders canonical slim-row fields and truthful fallbacks", () => {
  for (const field of [
    "log.idAttendance",
    "log.fullName",
    "log.nipNim",
    "log.roleName",
    "log.attendanceDate",
    "log.timeIn",
    "log.workHour",
    "log.mode",
    "log.status",
    "log.checkoutState",
  ]) {
    assert.match(table, new RegExp(field.replace(".", "\\.")));
  }

  assert.match(table, /getAttendanceCheckoutText\(log\)/);

  assert.match(table, /log\.modeLabel \|\| getInfoBadgeText\(log\.mode\)/);
  assert.match(
    table,
    /log\.statusLabel \|\| getStatusBadgeText\(log\.status\)/,
  );
  assert.match(table, /log\.location\.available/);
  assert.match(table, /log\.location\.description/);
  assert.doesNotMatch(
    table,
    /log\.(?:id_attendance|full_name|nip_nim|role_name|attendance_date|time_in|time_out|work_hour|information|checkout_state)/,
  );
  assert.match(table, /Lokasi tidak tersedia/);
  assert.doesNotMatch(
    table,
    /hasAttendanceCoordinates|latitude|longitude|Koordinat/,
  );
});

test("uses explicit Detail and Delete controls instead of a hidden row action", () => {
  assert.doesNotMatch(table, /<tr[^>]+tabindex="0"/);
  assert.doesNotMatch(table, /<tr[^>]+@click="openAttendanceDetail/);
  assert.doesNotMatch(
    table,
    /@keydown\.(?:enter|space)[^=]*="openAttendanceDetail/,
  );
  assert.doesNotMatch(
    table,
    /Buka aksi data absensi|x-data="\{ open: false \}"/,
  );

  assert.match(
    table,
    /@click\.stop="openAttendanceDetail\(log\.idAttendance\)"/,
  );
  assert.match(table, /title="Detail Absensi"/);
  assert.match(table, /@click\.stop="confirmDelete\(log\)"/);
  assert.match(table, /title="Hapus Absensi"/);
});

test("retains loading, error retry, empty, pagination, and narrow overflow contracts", () => {
  assert.match(table, /tableState\.loading/);
  assert.match(table, /tableState\.error/);
  assert.match(table, /role="alert"/);
  assert.match(table, /@click="retryAttendanceList\(\)"/);
  assert.match(table, /x-text="emptyStateMessage"/);
  assert.match(table, /overflow-x-auto/);
  assert.match(table, /changePage/);
  assert.match(table, /changeLimit/);
  assert.match(table, /colspan="7"/);
});
