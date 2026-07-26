import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const table = readFileSync(
  join(root, "src", "partials", "table", "table-user.html"),
  "utf8",
);

function theadBlock(html) {
  const match = html.match(/<thead[\s\S]*?<\/thead>/);
  return match ? match[0] : "";
}

const thead = theadBlock(table);

test("all 8 approved column headers are present", () => {
  const expectedHeaders = [
    "User ID",
    "Pengguna",
    "NIP/NIM",
    "Akses",
    "Organisasi",
    "Lokasi WFH",
    "Dibuat",
    "Aksi",
  ];
  for (const label of expectedHeaders) {
    assert.match(thead, new RegExp(label), `missing header: ${label}`);
  }
});

test("standalone Position, Email, and Phone Number headers are removed", () => {
  assert.doesNotMatch(thead, />Position</);
  assert.doesNotMatch(thead, />Email</);
  assert.doesNotMatch(thead, />Phone Number</);
});

test("email renders inside the Pengguna cell, alongside full name", () => {
  assert.match(
    table,
    /x-text="user\.fullName"[\s\S]{0,300}x-text="user\.email"/,
  );
});

test("Dibuat column binds formattedCreatedAt(user)", () => {
  assert.match(table, /x-text="formattedCreatedAt\(user\)"/);
});

test("Organisasi shows position primary and division secondary, both with '-' fallbacks", () => {
  assert.match(table, /x-text="user\.position \|\| '-'"/);
  assert.match(table, /x-text="user\.division \|\| '-'"/);
});

test("empty state colspan stays 8", () => {
  assert.match(table, /colspan="8"/);
});

test("Detail, Edit, and Delete controls remain with accessible labels", () => {
  assert.match(table, /openUserDetailDrawer\(user\)/);
  assert.match(
    table,
    /:aria-label="`Lihat detail pengguna \$\{user\.fullName\}`"/,
  );
  assert.match(table, /form-user\.html\?id=\$\{user\.id\}/);
  assert.match(table, /showDeleteModal\(user\)/);
});

test("no raw coordinate bindings appear anywhere in the table", () => {
  assert.doesNotMatch(table, /user\.latitude/);
  assert.doesNotMatch(table, /user\.longitude/);
});

test("checkbox and User ID share a single first cell", () => {
  assert.match(table, /x-data="\{\s*checked:\s*false\s*\}"/);
  assert.match(table, /x-text="user\.id"/);
});

test("Filter button is wired via the Task 3 partial include, not inlined", () => {
  assert.match(
    table,
    /<include\s+src=["']\.\/user-table-filter\.html["']\s*>\s*<\/include>/,
  );
});

test("search input keeps its existing searchQuery binding", () => {
  assert.match(table, /x-model="searchQuery"/);
  assert.match(table, /@input="onSearchChange\(\)"/);
});

test("entries selector and Tambah User link stay functional", () => {
  assert.match(table, /x-model="entriesPerPage"/);
  assert.match(table, /@change="onEntriesPerPageChange\(\)"/);
  assert.match(table, /Tambah User/);
});
