import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "parse5";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const descendants = (node) => {
  const children = [
    ...(node.childNodes || []),
    ...(node.content?.childNodes || []),
  ];
  return [...children, ...children.flatMap(descendants)];
};

const findDescendant = (node, predicate) =>
  descendants(node).find(predicate) || null;

const attribute = (node, name) =>
  node?.attrs?.find((item) => item.name === name)?.value ?? null;

const visibleText = (node) =>
  descendants(node)
    .filter((item) => item.nodeName === "#text")
    .map((item) => item.value)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const findHeaderByVisibleText = (table, label) =>
  findDescendant(
    table,
    (node) => node.tagName === "th" && visibleText(node) === label,
  );

const evaluateBinding = (expression, context) => {
  const names = Object.keys(context);
  const values = Object.values(context);
  return Function(...names, `"use strict"; return (${expression});`)(...values);
};

let builtDocument;

const getBuiltDocument = () => {
  if (!builtDocument) {
    execSync("npm run build", {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: "pipe",
    });
    builtDocument = parse(
      readFileSync(
        resolve(projectRoot, "build/management-attendance.html"),
        "utf8",
      ),
    );
  }

  return builtDocument;
};

test("the production attendance page exposes only authoritative sort controls", () => {
  const document = getBuiltDocument();
  const auditShell = findDescendant(
    document,
    (node) => attribute(node, "data-attendance-audit-shell") !== null,
  );
  const auditTable = findDescendant(
    auditShell,
    (node) => node.tagName === "table",
  );

  assert.ok(auditShell, "built page should contain the attendance audit shell");
  assert.ok(auditTable, "audit shell should contain the rendered table");

  const expectedSortHeaders = new Map([
    ["Pegawai", "full_name"],
    ["Tanggal", "attendance_date"],
    ["Kehadiran", "time_in"],
    ["Status", "status"],
  ]);

  for (const [label, key] of expectedSortHeaders) {
    const header = findHeaderByVisibleText(auditTable, label);
    assert.ok(header, `built table should contain the ${label} header`);
    const button = findDescendant(header, (node) => node.tagName === "button");
    assert.ok(button, `${label} should be an operable sort control`);
    assert.equal(attribute(button, "type"), "button");
    assert.equal(attribute(button, "@click"), `toggleAttendanceSort('${key}')`);
    assert.equal(attribute(button, ":disabled"), "tableState.loading");
    assert.equal(
      attribute(header, ":aria-sort"),
      `attendanceSortDirection('${key}')`,
    );
    const icon = findDescendant(header, (node) => node.tagName === "svg");
    assert.ok(icon, `${label} should expose an applied-sort icon`);
    assert.equal(
      attribute(icon, "x-show"),
      `attendanceSortDirection('${key}') !== 'none'`,
    );
    assert.equal(
      attribute(icon, ":class"),
      `attendanceSortDirection('${key}') === 'descending' ? 'rotate-180' : ''`,
    );
  }

  for (const label of ["Mode", "Lokasi", "Aksi"]) {
    const header = findHeaderByVisibleText(auditTable, label);
    assert.ok(header, `built table should contain the ${label} header`);
    assert.equal(
      findDescendant(header, (node) => node.tagName === "button"),
      null,
      `${label} must remain static`,
    );
    assert.equal(
      findDescendant(header, (node) => node.tagName === "svg"),
      null,
      `${label} must not imply a sort direction`,
    );
    assert.equal(
      descendants(header).some((node) =>
        (node.attrs || []).some((item) =>
          item.value.includes("attendanceSortDirection"),
        ),
      ),
      false,
      `${label} must not carry hidden sort-state bindings`,
    );
  }

  const modeBadge = findDescendant(
    auditTable,
    (node) => attribute(node, ":class") === "getInfoBadgeClass(log.mode)",
  );
  const statusBadge = findDescendant(
    auditTable,
    (node) => attribute(node, ":class") === "getStatusBadgeClass(log.status)",
  );
  assert.equal(
    attribute(modeBadge, "x-text"),
    "log.modeLabel || getInfoBadgeText(log.mode)",
  );
  assert.equal(
    attribute(statusBadge, "x-text"),
    "log.statusLabel || getStatusBadgeText(log.status)",
  );
  assert.equal(
    evaluateBinding(attribute(modeBadge, "x-text"), {
      log: { mode: "wfo", modeLabel: "Kerja dari Kantor" },
      getInfoBadgeText: () => "fallback mode",
    }),
    "Kerja dari Kantor",
  );
  assert.equal(
    evaluateBinding(attribute(statusBadge, "x-text"), {
      log: { status: "late", statusLabel: "Terlambat" },
      getStatusBadgeText: () => "fallback status",
    }),
    "Terlambat",
  );

  const locationText = findDescendant(
    auditTable,
    (node) =>
      attribute(node, "x-text")?.includes("log.location.description") ?? false,
  );
  const locationBinding = attribute(locationText, "x-text");
  assert.equal(
    evaluateBinding(locationBinding, {
      log: { location: { available: true, description: "Kantor" } },
    }),
    "Kantor",
  );
  assert.equal(
    evaluateBinding(locationBinding, {
      log: { location: { available: true, description: "" } },
    }),
    "Lokasi tersedia",
  );
  assert.equal(
    evaluateBinding(locationBinding, {
      log: { location: { available: false, description: "Kantor" } },
    }),
    "Lokasi tidak tersedia",
  );

  const checkoutText = findDescendant(
    auditTable,
    (node) => attribute(node, "x-text") === "getAttendanceCheckoutText(log)",
  );
  assert.ok(
    checkoutText,
    "built attendance rows must delegate checkout copy to canonical presentation state",
  );
  const openCheckoutBadge = findDescendant(
    auditTable,
    (node) =>
      attribute(node, "x-show") === "log.checkoutState === 'open'" &&
      visibleText(node).includes("Checkout terbuka"),
  );
  assert.ok(
    openCheckoutBadge,
    "the open badge must require explicit open evidence",
  );
});

test("the production Attendance page keeps the toolbar and table in one audit frame", () => {
  const document = getBuiltDocument();
  const shells = descendants(document).filter(
    (node) => attribute(node, "data-attendance-audit-shell") !== null,
  );

  assert.equal(shells.length, 1);

  const shell = shells[0];
  assert.ok(
    findDescendant(
      shell,
      (node) => attribute(node, "id") === "attendanceSearch",
    ),
  );
  assert.ok(
    findDescendant(
      shell,
      (node) => attribute(node, "id") === "attendanceTableFilterTrigger",
    ),
  );
  assert.ok(
    findDescendant(
      shell,
      (node) => attribute(node, "data-attendance-table-region") !== null,
    ),
  );
  assert.ok(
    findDescendant(
      shell,
      (node) => attribute(node, "data-attendance-pagination") !== null,
    ),
  );
});

test("the built action cell exposes two accessible row action buttons", () => {
  const document = getBuiltDocument();
  const auditShell = findDescendant(
    document,
    (node) => attribute(node, "data-attendance-audit-shell") !== null,
  );
  const auditTable = findDescendant(
    auditShell,
    (node) => node.tagName === "table",
  );
  const rowTemplate = findDescendant(
    auditTable,
    (node) => attribute(node, "x-for") === "log in rows",
  );
  const actionCell = findDescendant(
    rowTemplate,
    (node) =>
      node.tagName === "td" &&
      attribute(node, "class")?.includes("text-center") &&
      attribute(node, "class")?.includes("whitespace-nowrap"),
  );
  const actionButtons = descendants(actionCell).filter(
    (node) => node.tagName === "button",
  );

  assert.equal(actionButtons.length, 2);
  assert.deepEqual(
    actionButtons.map((button) => ({
      type: attribute(button, "type"),
      click: attribute(button, "@click.stop"),
      label: attribute(button, ":aria-label"),
    })),
    [
      {
        type: "button",
        click: "openAttendanceDetail(log.idAttendance)",
        label: "`Lihat detail absensi ${log.fullName || ''}`",
      },
      {
        type: "button",
        click: "confirmDelete(log)",
        label: "`Hapus data absensi ${log.fullName || ''}`",
      },
    ],
  );
});
