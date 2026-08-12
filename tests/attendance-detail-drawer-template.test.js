import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const drawer = readFileSync(
  join(root, "src", "partials", "modal", "attendance-detail-drawer.html"),
  "utf8",
);
const page = readFileSync(
  join(root, "src", "management-attendance.html"),
  "utf8",
);

test("attendance detail drawer exposes accessible dialog and keyboard contracts", () => {
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /tabindex="-1"/);
  assert.match(drawer, /aria-labelledby="attendanceDetailDrawerTitle"/);
  assert.match(drawer, /aria-describedby="attendanceDetailDrawerDescription"/);
  assert.match(drawer, /@keydown\.escape\.window="closeAttendanceDrawer\(\)"/);
  assert.match(drawer, /@keydown\.tab="handleAttendanceDrawerTab\(\$event\)"/);
  assert.match(drawer, /aria-label="Tutup detail absensi"/);
});

test("attendance detail drawer exposes permanent delete through canonical detail state", () => {
  assert.match(drawer, /@click="confirmDelete\(selectedAttendanceDetail\)"/);
  assert.match(drawer, />\s*Hapus permanen\s*</);
});

test("loading, error, unavailable, and successful detail remain inside the drawer", () => {
  assert.match(drawer, /x-show="detailState\.loading"/);
  assert.match(drawer, /x-show="detailState\.error"/);
  assert.match(drawer, /@click="retryAttendanceDetail\(\)"/);
  assert.match(drawer, /x-show="detailState\.unavailable"/);
  assert.match(
    drawer,
    /x-show="!detailState\.loading && !detailState\.error && !detailState\.unavailable && detailState\.detail"/,
  );
});

test("successful detail renders only the three approved evidence sections", () => {
  for (const heading of ["Pegawai", "Catatan Kehadiran", "Bukti Lokasi"]) {
    assert.match(drawer, new RegExp(`>\\s*${heading}\\s*<`));
  }
  assert.match(drawer, /selectedAttendanceDetail\.employee\.fullName/);
  assert.match(drawer, /selectedAttendanceDetail\.attendanceDate/);
  assert.match(drawer, /selectedAttendanceDetail\.location\.description/);
  assert.match(drawer, /selectedAttendanceDetail\.notes/);
  assert.match(
    drawer,
    /selectedAttendanceDetail\.modeLabel \|\| selectedAttendanceDetail\.mode \|\| '-'/,
  );
  assert.match(
    drawer,
    /selectedAttendanceDetail\.statusLabel \|\| selectedAttendanceDetail\.status \|\| '-'/,
  );
  assert.doesNotMatch(drawer, /Edit(?:\s|&nbsp;)+(?:Absensi|Kehadiran)/i);
  assert.doesNotMatch(drawer, /form-attendance/);
});

test("location evidence is unavailable unless both detail coordinates are finite", () => {
  assert.match(
    drawer,
    /Number\.isFinite\(selectedAttendanceDetail\.location\.latitude\) && Number\.isFinite\(selectedAttendanceDetail\.location\.longitude\)/,
  );
  assert.match(drawer, /Lokasi absensi tidak tersedia\./);
  assert.match(drawer, /id="attendanceDetailMapContainer"/);
  assert.match(drawer, /data-location-map/);
});

test("attendance page composes one drawer map and removes the old modal path", () => {
  const composed = `${page}\n${drawer}`;
  assert.equal(
    (composed.match(/id="attendanceDetailMapContainer"/g) || []).length,
    1,
  );
  assert.match(page, /attendance-detail-drawer\.html/);
  assert.doesNotMatch(page, /map-detail-modal\.html/);
  assert.doesNotMatch(page, /mapDetailContainer/);
});

test("attendance drawer renders selected employee avatar without mutating raw photo evidence", () => {
  assert.match(
    drawer,
    /x-if="selectedAttendanceDetail\.employee\.avatar\.photoUrl"/,
  );
  assert.match(
    drawer,
    /:src="selectedAttendanceDetail\.employee\.avatar\.photoUrl"/,
  );
  assert.match(
    drawer,
    /@error="selectedAttendanceDetail\.employee\.avatar\.photoUrl = null"/,
  );
  assert.match(
    drawer,
    /x-text="selectedAttendanceDetail\.employee\.avatar\.initials"/,
  );
  assert.match(
    drawer,
    /:class="selectedAttendanceDetail\.employee\.avatar\.avatarColor"/,
  );
  assert.doesNotMatch(
    drawer,
    /@error="[^"]*selectedAttendanceDetail\.employee\.photo\s*=\s*null/,
  );
});
