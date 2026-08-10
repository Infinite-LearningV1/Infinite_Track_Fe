import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseFragment } from "parse5";

const descendants = (node) => {
  const children = [
    ...(node.childNodes || []),
    ...(node.content?.childNodes || []),
  ];
  return [...children, ...children.flatMap(descendants)];
};

const attribute = (node, name) =>
  node?.attrs?.find((item) => item.name === name)?.value ?? null;

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
    "Email",
    "Posisi",
    "Peran",
    "ID booking",
    "Diajukan",
    "Alasan pengajuan",
    "Penjelasan lainnya",
    "Catatan",
    "Status",
    "Radius",
    "Alasan penolakan",
    "Catatan penolakan",
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

test("drawer uses Alpine-valid x-if templates and a null-safe pending footer", () => {
  const drawer = fs.readFileSync(
    "src/partials/modal/booking-detail-drawer.html",
    "utf8",
  );
  const nodes = descendants(parseFragment(drawer));
  const xIfNodes = nodes.filter((node) => attribute(node, "x-if") !== null);

  assert.ok(xIfNodes.length > 0);
  assert.equal(
    xIfNodes.every((node) => node.tagName === "template"),
    true,
    "Alpine x-if must only be declared on template elements",
  );
  assert.ok(
    xIfNodes.some(
      (node) => attribute(node, "x-if") === "drawerState.selectedBooking",
    ),
  );
  assert.match(
    drawer,
    /x-show="drawerState\.selectedBooking && drawerState\.selectedBooking\.status === 'pending'"/,
  );
});

test("drawer exposes an inert backdrop and the canonical review projection", () => {
  const drawer = fs.readFileSync(
    "src/partials/modal/booking-detail-drawer.html",
    "utf8",
  );
  const nodes = descendants(parseFragment(drawer));
  const backdrop = nodes.find(
    (node) => attribute(node, "data-booking-detail-backdrop") !== null,
  );
  const dialog = nodes.find((node) => attribute(node, "role") === "dialog");

  assert.equal(attribute(backdrop, "aria-hidden"), "true");
  assert.equal(attribute(dialog, "aria-modal"), "true");

  for (const field of [
    "employee_email",
    "employee_position",
    "employee_role",
    "selectedBooking.id",
    "created_at",
    "requestReason?.label",
    "requestOtherReason",
    "notes",
    "status",
    "location_name",
    "location_latitude",
    "location_longitude",
    "radiusSnapshot",
    "suitability_label",
    "suitability_score",
    "processed_at",
    "processedBy.fullName",
    "processedBy.role",
    "rejectionReason?.label",
    "rejectionNote",
  ]) {
    assert.ok(drawer.includes(field), `drawer should render ${field}`);
  }

  assert.match(
    drawer,
    /x-if="drawerState\.selectedBooking\.status === 'approved' \|\| drawerState\.selectedBooking\.status === 'rejected'"/,
  );
  assert.match(
    drawer,
    /x-if="drawerState\.selectedBooking\.status === 'rejected'"/,
  );
  assert.match(
    drawer,
    /x-show="drawerState\.selectedBooking\.requestReason\?\.isOther && drawerState\.selectedBooking\.requestOtherReason"/,
  );
});

test("booking drawer overlays the shared header like user and attendance drawers", () => {
  const drawer = fs.readFileSync(
    "src/partials/modal/booking-detail-drawer.html",
    "utf8",
  );
  assert.match(drawer, /class="fixed inset-0 z-99999"/);
  assert.doesNotMatch(drawer, /z-99998/);
});
