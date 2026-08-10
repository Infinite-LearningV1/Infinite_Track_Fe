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
  assert.match(table, /booking\.status === 'pending' \? 'Review' : 'Detail'/);
  assert.match(table, /booking\.schedule_date/);
  assert.match(table, /booking\.created_at/);
  assert.match(table, /toFixed\(2\)/);
  assert.match(table, /Tidak tersedia/);
  assert.match(table, /colspan="8"/);
});
