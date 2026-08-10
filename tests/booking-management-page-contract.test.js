import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("management booking page locks composition and responsive accessibility contracts", () => {
  const page = fs.readFileSync("src/management-booking.html", "utf8");
  const table = fs.readFileSync("src/partials/table/table-booking.html", "utf8");
  const filter = fs.readFileSync("src/partials/table/booking-table-filter.html", "utf8");
  const drawer = fs.readFileSync("src/partials/modal/booking-detail-drawer.html", "utf8");
  assert.equal((page.match(/Cari nama atau NIP\/NIM\.\.\./g) || []).length, 1);
  assert.equal((page.match(/booking-table-filter\.html/g) || []).length, 1);
  assert.equal((page.match(/table-booking\.html/g) || []).length, 1);
  assert.equal((page.match(/booking-detail-drawer\.html/g) || []).length, 1);
  assert.equal((page.match(/wfa-booking-rejection-modal\.html/g) || []).length, 1);
  assert.doesNotMatch(page, /booking-map-modal\.html|KPI|FAHP|export|live-map/i);
  assert.match(table, /overflow-x-auto/);
  assert.match(table, /dark:bg-white\/\[0\.03\]/);
  assert.match(filter, /max-sm:fixed|max-sm:inset-x-4/);
  assert.match(filter, /aria-expanded="isFilterOpen"/);
  assert.match(filter, /@keydown\.escape\.window="closeFilter\(\)"/);
  assert.match(drawer, /w-full max-w-xl/);
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /@keydown="handleBookingDrawerTab\(\$event\)"/);
  assert.match(drawer, /aria-label="Tutup detail"/);
  assert.match(table, /Tidak tersedia/);
  assert.match(drawer, /Koordinat lokasi tidak tersedia\./);
  assert.match(drawer, /Pelaku pemrosesan tidak tersedia/);
});
