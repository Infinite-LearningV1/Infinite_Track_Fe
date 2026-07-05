# Dashboard Table Server-Driven Sorting Design

## Summary

Phase ini memperluas dashboard-first table standardization dengan mengunci dashboard report table ke **satu contract server-driven** untuk search, pagination, dan sorting. Scope sorting dibatasi hanya ke tiga field: `full_name`, `status`, dan `attendance_date`.

## Goal

1. Menjadikan dashboard table memiliki satu jalur state aktif untuk rows, search, pagination, dan sorting.
2. Menghilangkan state lokal yang tumpang tindih dan helper yang tidak lagi menjadi sumber kebenaran.
3. Membuat affordance sorting dashboard truthful: hanya field yang benar-benar didukung contract yang tampil sebagai sortable.
4. Menjaga dashboard tetap build-safe dan cukup sempit agar bisa menjadi baseline standardisasi tabel lintas fitur nanti.

## Non-goals

- Menstandarkan semua tabel admin sekaligus.
- Menyelesaikan modal/popup contract lintas tabel.
- Menyelesaikan seluruh truthfulness issue dashboard di luar contract table state.
- Menambahkan abstraction shared-table generik lintas fitur pada phase ini.
- Menambah sorting untuk semua kolom yang sekarang terlihat di header.

## Current context

Dashboard saat ini masih membawa jejak dua model state:

- **server-driven path** melalui `filters`, `pagination`, `reportData`, dan `getSummaryReport()`
- **legacy client-side path** melalui helper seperti `filteredAttendanceData`, `paginatedAttendanceData`, `currentPage`, `entriesPerPage`, dan helper page-number lokal

Partial dashboard table aktif sudah lebih dekat ke contract server-driven karena merender dari `reportData`, `pagination`, dan memanggil `changePage()` / `changeEntriesPerPage()`. Namun sorting masih ambigu dan beberapa affordance header belum selaras dengan scope state yang ingin dijaga.

## Standardization decision

Dashboard report table harus memakai **satu server-driven table contract end-to-end**.

### Canonical request state

- `filters.period`
- `filters.page`
- `filters.limit`
- `filters.search`
- `filters.sortBy`
- `filters.sortOrder`

### Canonical response state

- `pagination`
  - `current_page`
  - `total_pages`
  - `total_records`
  - `has_prev_page`
  - `has_next_page`
  - `per_page`
- `reportData`

### Supporting UI state allowed

- `searchQuery`
- `searchTimeout`
- `isLoading`
- `errorMessage`
- export state
- surrounding summary / analytics state
- current sort icon state, selama tetap merefleksikan contract request yang aktif

## Sorting contract for this phase

Sorting phase ini hanya berlaku untuk tiga field:

- `full_name`
- `status`
- `attendance_date`

### Why only these three

- ketiganya paling masuk akal secara user-facing di dashboard report table
- membatasi scope menghindari spread ke semua header yang saat ini clickable tapi belum tentu punya dukungan backend
- ini cukup untuk mengunci pola reusable tanpa menciptakan sort affordance palsu pada field lain

### Rule

- Header untuk `full_name`, `status`, dan `attendance_date` boleh clickable dan harus mengubah `filters.sortBy` / `filters.sortOrder`, lalu memicu fetch ulang.
- Header lain harus diperlakukan sebagai non-sortable dalam phase ini.
- Jangan tampilkan affordance sort aktif untuk kolom di luar tiga field tersebut.

## Dashboard data flow after the change

1. User mengubah period, search, page, entries-per-page, atau sort.
2. UI memperbarui `filters`.
3. `loadSummaryData()` memanggil `getSummaryReport()` dengan request state aktif.
4. Response backend meng-update:
   - `reportData`
   - `pagination`
   - summary / analytics state dashboard
5. Partial dashboard table hanya merender dari `reportData` dan `pagination`.

## Search behavior

Search harus server-driven.

### Required behavior

- `searchQuery` tetap menjadi UI text state.
- `debouncedSearch()` menyinkronkan `searchQuery` ke request path aktif.
- Search reset `filters.page = 1`.
- `loadSummaryData()` harus mengirim `search` ke `getSummaryReport()`.
- `reportData` tidak boleh lagi diganti ke hasil local filtering sebagai jalur aktif.

### Forbidden behavior

- local filtering menjadi jalur search aktif
- local pagination sementara search aktif
- fake pagination result yang tidak datang dari backend response

## Pagination behavior

Pagination harus tetap server-driven.

### Required behavior

- `changePage()` hanya mengubah `filters.page` lalu fetch ulang.
- `changeEntriesPerPage()` hanya mengubah `filters.limit`, reset page ke `1`, lalu fetch ulang.
- info text dan tombol pagination harus membaca `pagination` response object yang sama dengan rows aktif.

### Forbidden behavior

- `currentPage` sebagai state kedua
- `totalPages` lokal sebagai state kedua
- page-number helper yang hidup di luar `pagination.total_pages`

## Header / partial behavior

### `table-dashboard-report.html`

- `full_name`, `status`, dan `attendance_date` adalah sortable headers.
- Header lain menjadi label biasa.
- `x-for` tetap merender dari `reportData`.
- info text tetap merender dari `pagination.current_page`, `pagination.per_page`, dan `pagination.total_records`.
- button pagination tetap memakai `pagination.has_prev_page` dan `pagination.has_next_page`.

### If backend does not yet support one of the sortable fields

- FE tidak boleh pura-pura support sorting untuk field itu.
- Header field tersebut harus diturunkan menjadi non-clickable sampai contract backend tersedia.

## Expected file changes

### Primary file

- `src/js/features/dashboard/dashboard.js`

### Supporting file

- `src/partials/table/table-dashboard-report.html`

### Possible supporting service file only if needed

- `src/js/services/reportService.js`

## Reuse guidance

Gunakan pola yang sudah lebih sehat pada tabel Attendance / Booking sebagai referensi contract server-driven:

- `filters` sebagai request state
- `pagination` sebagai response state
- data rows dari response backend
- page change / per-page change memicu fetch ulang

## Risks

1. **Backend sort support mismatch**
   Jika backend belum menerima `sortBy` / `sortOrder` sesuai field phase ini, FE bisa tetap terlihat “sortable” tapi tidak truthful.

2. **Partial still exposes unsanctioned sort affordances**
   Jika header lama tetap clickable di luar tiga field ini, user akan melihat signal yang salah.

3. **Search path stays half-local**
   Jika ada sisa referensi ke helper filtering lokal, dashboard akan tetap hybrid walau pagination state terlihat lebih rapi.

4. **Scope creep into cross-table abstraction**
   Jika phase ini berubah menjadi shared component refactor besar, confidence pada dashboard-first cleanup akan turun.

## Verification plan

Phase ini dianggap benar jika semua hal berikut terpenuhi:

### 1. Initial load

- Dashboard load awal tetap merender rows dari `reportData`
- Summary cards dan analytics tetap ter-update
- Loading dan error state tetap benar

### 2. Search

- Search mengirim request ulang ke backend
- Search reset page ke `1`
- `reportData` tetap berasal dari response backend, bukan local filtered array

### 3. Entries per page

- Mengubah page size mengubah `filters.limit`
- page reset ke `1`
- fetch ulang terjadi
- row count dan info text tetap sinkron dengan `pagination`

### 4. Page navigation

- Previous / next / page-number flow tetap berbasis `pagination.current_page`, `has_prev_page`, dan `has_next_page`
- tidak ada helper local page state aktif

### 5. Sorting

- Hanya tiga field yang sortable
- `filters.sortBy` dan `filters.sortOrder` menjadi request state aktif
- jika backend belum mendukung salah satu field, header field itu tidak lagi clickable

### 6. Build safety

- `npm run build` tetap lulus

## Out of scope follow-up

- standardisasi Attendance / Booking / User secara penuh
- modal/popup contract lintas tabel
- dashboard sort truthfulness di luar tiga field yang disetujui
- reusable abstraction lintas semua tabel

## Summary rule

**Dashboard report table harus punya satu request contract (`filters`) dan satu response contract (`pagination` + `reportData`), dengan sorting server-driven hanya untuk `full_name`, `status`, dan `attendance_date`.**
