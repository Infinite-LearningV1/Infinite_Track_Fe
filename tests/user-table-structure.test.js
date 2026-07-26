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

test("all 6 named column headers are present (checkbox column carries no header label)", () => {
  const expectedHeaders = [
    "Pengguna",
    "NIP/NIM",
    "Akses",
    "Organisasi",
    "Lokasi WFH",
    "Aksi",
  ];
  for (const label of expectedHeaders) {
    assert.match(thead, new RegExp(label), `missing header: ${label}`);
  }
});

test("the Dibuat header is removed; the table has 7 columns total", () => {
  assert.doesNotMatch(thead, /Dibuat/);
});

test("the User ID header label is removed; the checkbox column has no visible header text", () => {
  assert.doesNotMatch(thead, />User ID</);
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

test("formattedCreatedAt is no longer bound anywhere in the table", () => {
  assert.doesNotMatch(table, /formattedCreatedAt/);
});

test("Organisasi shows position primary and division secondary, both with '-' fallbacks", () => {
  assert.match(table, /x-text="user\.position \|\| '-'"/);
  assert.match(table, /x-text="user\.division \|\| '-'"/);
});

test("empty state colspan is 7 after removing the Dibuat column", () => {
  assert.match(table, /colspan="7"/);
  assert.doesNotMatch(table, /colspan="8"/);
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

test("first column cell holds only the row checkbox; User ID is removed from the table", () => {
  assert.match(table, /x-data="\{\s*checked:\s*false\s*\}"/);
  assert.doesNotMatch(table, /x-text="user\.id"/);
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

test("the card title 'Manajemen Pengguna' is removed; the search input takes its place", () => {
  assert.doesNotMatch(table, /Manajemen Pengguna/);
  assert.match(table, /x-model="searchQuery"/);
});

test("the Show entries selector moved out of the header band into the pagination footer, below the table", () => {
  const tableCloseIndex = table.indexOf("</table>");
  const entriesModelIndex = table.indexOf('x-model="entriesPerPage"');
  assert.ok(tableCloseIndex !== -1, "table close tag not found");
  assert.ok(entriesModelIndex !== -1, "entries selector not found");
  assert.ok(
    entriesModelIndex > tableCloseIndex,
    "entries selector should now render after the table, in the pagination footer",
  );
});

test("the Akses badge binds roleBadgeClass(user.role) while keeping the role text visible", () => {
  assert.match(table, /:class="roleBadgeClass\(user\.role\)"/);
  assert.match(table, /x-text="user\.role \|\| '-'"/);
});

test("Pengguna cell renders a photo avatar when user.photo is present, gated by x-if", () => {
  assert.match(table, /<template\s+x-if="user\.photo">/);
  assert.match(table, /<img[^>]*:src="getUserPhotoUrl\(user\.photo\)"[^>]*>/);
  assert.match(table, /@error="user\.photo = null"/);
});

test("Pengguna cell falls back to the initials circle when user.photo is absent, gated by x-if", () => {
  assert.match(table, /<template\s+x-if="!user\.photo">/);
  assert.match(table, /:class="user\.avatarColor"/);
  assert.match(table, /x-text="user\.initials"/);
});
