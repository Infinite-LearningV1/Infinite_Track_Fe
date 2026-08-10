import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("booking table exposes the locked eight-column approval queue", () => {
  const table = fs.readFileSync(
    "src/partials/table/table-booking.html",
    "utf8",
  );
  for (const label of [
    "Pemohon",
    "Jadwal WFA",
    "Diajukan",
    "Alasan",
    "Lokasi",
    "Kelayakan",
    "Status",
    "Aksi",
  ])
    assert.match(table, new RegExp(`>\\s*${label}\\s*<`));
  for (const label of ["ID", "Position", "Notes", "Koordinat"])
    assert.doesNotMatch(table, new RegExp(`>\\s*${label}\\s*<`));
  for (const token of [
    "changeSort",
    "getSortIcon",
    "aria-sort",
    "View Location",
    "viewLocationDetail",
    'style=\\"width',
  ])
    assert.doesNotMatch(table, new RegExp(token));
  assert.match(table, /line-clamp-2/);
  assert.match(table, /openBookingDetail\(booking\)/);
  assert.match(table, /confirmDelete\(booking\)/);
  assert.match(
    table,
    /:aria-label="`Hapus booking \$\{booking\.employee_name \|\| booking\.id\}`"/,
  );
  assert.doesNotMatch(table, />\s*\u22ef\s*</);
  assert.match(
    table,
    /booking\.status === 'pending' \? 'Review booking' : 'Lihat detail booking'/,
  );
  assert.match(table, /booking\.schedule_date/);
  assert.match(table, /booking\.created_at/);
  assert.match(table, /toFixed\(2\)/);
  assert.match(table, /Tidak tersedia/);
  assert.match(table, /colspan="8"/);
});

test("booking queue reuses the Management User table shell and icon actions", () => {
  const table = fs.readFileSync(
    "src/partials/table/table-booking.html",
    "utf8",
  );
  assert.match(table, /rounded-2xl border border-gray-200 bg-white pt-4/);
  assert.match(table, /dark:border-gray-800 dark:bg-white\/\[0\.03\]/);
  assert.match(table, /custom-scrollbar max-w-full overflow-x-auto/);
  assert.match(table, /<table class="min-w-full">/);
  assert.match(table, /placeholder="Cari nama atau NIP\/NIM\.\.\."/);
  assert.match(table, /booking-table-filter\.html/);
  assert.match(
    table,
    /inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100/,
  );
  assert.match(
    table,
    /inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-100/,
  );
  assert.match(
    table,
    /:title="booking.status === 'pending' \? 'Review Booking' : 'Detail Booking'"/,
  );
  assert.match(table, /title="Hapus Booking"/);
  assert.doesNotMatch(table, />\s*Review\s*</);
  assert.doesNotMatch(table, />\s*Detail\s*</);
  assert.doesNotMatch(table, />\s*Hapus\s*</);
});

test("booking queue exposes complete dark-mode table and pagination tokens", () => {
  const table = fs.readFileSync(
    "src/partials/table/table-booking.html",
    "utf8",
  );
  assert.match(table, /dark:text-white\/90/);
  assert.match(table, /dark:text-gray-400/);
  assert.match(table, /dark:border-gray-800/);
  assert.match(table, /dark:bg-gray-900/);
  assert.match(table, /dark:bg-blue-900\/50/);
  assert.match(table, /dark:bg-red-900\/50/);
});
