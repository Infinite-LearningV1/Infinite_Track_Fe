import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("backend settings page includes WFA reason catalogs", async () => {
  const html = await source("src/management-backend-settings.html");
  assert.match(html, /partials\/settings\/wfa-reason-catalogs\.html/);
});

test("WFA catalog partial mounts request and rejection factories", async () => {
  const html = await source("src/partials/settings/wfa-reason-catalogs.html");
  assert.match(html, /wfaReasonCatalogAlpineData\('request'\)/);
  assert.match(html, /wfaReasonCatalogAlpineData\('rejection'\)/);
  assert.doesNotMatch(html, /delete/i);
});

test("index registers the WFA catalog factory", async () => {
  const js = await source("src/js/index.js");
  assert.match(js, /window\.wfaReasonCatalogAlpineData/);
});

test("booking page includes the rejection modal and success event handler", async () => {
  const html = await source("src/management-booking.html");
  assert.match(html, /wfa-booking-rejection-modal\.html/);
  assert.match(html, /wfa-booking-rejection:succeeded/);
});

test("booking queue opens detail while decision surfaces own rejection actions", async () => {
  const table = await source("src/partials/table/table-booking.html");
  const drawer = await source("src/partials/modal/booking-detail-drawer.html");
  const mapModal = await source("src/partials/modal/booking-map-modal.html");

  assert.match(table, /openBookingDetail\(booking\)/);
  assert.doesNotMatch(table, /openRejectBooking\(booking\)/);
  assert.match(drawer, /openRejectBooking\(drawerState\.selectedBooking\)/);
  assert.match(mapModal, /openRejectBooking\(selectedBookingLocation\)/);
  assert.doesNotMatch(mapModal, /rejectBooking\(/);
});

test("index registers the booking rejection factory", async () => {
  const js = await source("src/js/index.js");
  assert.match(js, /window\.bookingRejectionAlpineData/);
});

test("booking feature uses explicit approval and opens rejection as separate commands", async () => {
  const js = await source("src/js/features/wfaBooking/bookingList.js");
  assert.match(js, /approveBookingCommand\(bookingId\)/);
  assert.match(js, /openRejectBooking\(booking\)/);
  assert.doesNotMatch(js, /updateBookingStatus/);
});

test("booking detail renders WFA request and rejection context without a default radius", async () => {
  const modal = await source("src/partials/modal/booking-map-modal.html");
  assert.match(modal, /Alasan pengajuan/);
  assert.match(modal, /Alasan penolakan/);
  assert.match(modal, /Radius booking/);
  assert.match(modal, /Tidak tersedia/);
  assert.doesNotMatch(modal, /\|\|\s*100/);
});

test("rejection modal exposes accessible description, errors, busy state, and Escape close", async () => {
  const modal = await source(
    "src/partials/modal/wfa-booking-rejection-modal.html",
  );

  assert.match(modal, /aria-describedby="wfa-rejection-description"/);
  assert.match(modal, /aria-describedby="wfa-rejection-reason-error"/);
  assert.match(modal, /aria-describedby="wfa-rejection-note-error"/);
  assert.match(modal, /:aria-busy="isSubmitting"/);
  assert.match(modal, /@keydown\.escape\.window="close\(\)"/);
});
