import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("booking drawer template and page composition are canonical", () => {
  const drawer = fs.readFileSync(
    "src/partials/modal/booking-detail-drawer.html",
    "utf8",
  );
  const page = fs.readFileSync("src/management-booking.html", "utf8");
  for (const token of [
    'role="dialog"',
    'aria-modal="true"',
    "bookingDetailDrawerTitle",
    "bookingDetailDrawerDescription",
    '@keydown.escape.window="closeBookingDetail()"',
    '@keydown="handleBookingDrawerTab($event)"',
    "Pemohon",
    "Pengajuan WFA",
    "Lokasi",
    "Kelayakan",
    "Keputusan",
    "bookingDetailMapContainer",
    "data-location-map",
    "Koordinat lokasi tidak tersedia.",
    "Pelaku pemrosesan tidak tersedia",
  ])
    assert.match(
      drawer,
      new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  assert.match(page, /booking-detail-drawer\.html/);
  assert.doesNotMatch(page, /booking-map-modal\.html/);
  assert.equal(
    (drawer.match(/id="bookingDetailMapContainer"/g) || []).length,
    1,
  );
});
