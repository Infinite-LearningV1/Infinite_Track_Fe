import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "parse5";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const descendants = (node) => [
  ...(node.childNodes || []),
  ...(node.childNodes || []).flatMap(descendants),
];

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

test("the production attendance page exposes only authoritative sort controls", () => {
  execSync("npm run build", {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
  });

  const document = parse(
    readFileSync(
      resolve(projectRoot, "build/management-attendance.html"),
      "utf8",
    ),
  );
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
  }

  for (const label of ["Mode", "Lokasi", "Aksi"]) {
    const header = findHeaderByVisibleText(auditTable, label);
    assert.ok(header, `built table should contain the ${label} header`);
    assert.equal(
      findDescendant(header, (node) => node.tagName === "button"),
      null,
      `${label} must remain static`,
    );
  }
});
