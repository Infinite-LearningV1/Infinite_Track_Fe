# Attendance Table Server-Driven Cleanup Design

## Summary

Phase ini menstandarkan attendance table dengan pola yang sejalan dengan dashboard cleanup dalam hal **satu contract aktif**, tetapi tetap mempertahankan strategi data yang memang sudah cocok untuk attendance: **server-driven**. Fokus utamanya bukan mengganti arsitektur data, melainkan memastikan semua kontrol UI attendance benar-benar menulis ke request state yang sama, semua rows/pagination berasal dari response backend, dan residue helper/wiring yang misleading dibersihkan.

## Goal

1. Menjadikan attendance table punya satu jalur request state aktif yang jelas dan efisien.
2. Memastikan search, entries-per-page, page navigation, dan sort yang sudah ada benar-benar truthful terhadap request backend.
3. Menyelaraskan partial attendance table dengan state/handler aktif yang benar.
4. Membersihkan residue helper atau wiring attendance-related yang stale/misleading tanpa redesign arsitektur yang lebih besar.

## Non-goals

- Mengubah attendance table menjadi client-driven.
- Mendesain ulang seluruh modal system attendance lintas aplikasi.
- Menambah field sort baru di luar field yang memang sudah aktif saat ini.
- Membuat generic shared-table abstraction lintas semua tabel admin.
- Menstandarkan semua table admin sekaligus dalam phase ini.

## Current context

Attendance table saat ini sudah berada di jalur yang lebih sehat dibanding dashboard sebelum dibersihkan:

- request utama dikendalikan dari `filters`
- backend menerima query search/sort/pagination
- rows dirender dari `attendanceData`
- pagination dibaca dari `pagination`

Namun masih ada risiko drift pada tiga area:

1. **Entries-per-page truthfulness** antara kontrol page-level dan request `filters.limit`.
2. **Search/filter state split** jika state input page-level dan request filter tidak selalu sinkron.
3. **Residue global/helper** yang bisa membuat flow attendance tampak aktif dari jalur yang tidak lagi canonical.

## Standardization decision

Attendance table tetap **server-driven**, dan harus punya satu contract request/response aktif yang jelas.

### Canonical request state

- `filters.search`
- `filters.page`
- `filters.limit`
- `filters.sortBy`
- `filters.sortOrder`
- filter attendance lain yang memang sudah menjadi bagian request aktif sekarang

### Canonical response state

- `attendanceData`
- `pagination`

### Canonical UI support state

- `isLoading`
- `errorMessage`
- filter input view state yang memang diperlukan, selama sinkron ke `filters`

## Sort scope for this phase

Sorting hanya berlaku untuk field yang **memang sudah aktif sekarang** di attendance flow.

### Rule

- Jika header saat ini sudah clickable dan request backend memang sudah mendukung field tersebut, biarkan tetap aktif.
- Jika ada affordance sort yang tidak benar-benar terhubung ke request contract backend, demote/nonaktifkan di phase ini.
- Jangan tambah field sort baru hanya demi keseragaman dengan dashboard.

## Data flow after the change

1. User mengubah search, page, entries-per-page, atau sort.
2. UI memperbarui `filters`.
3. Feature logic memanggil service attendance dengan request state aktif.
4. Response backend meng-update:
   - `attendanceData`
   - `pagination`
5. Partial attendance table hanya merender dari `attendanceData` dan `pagination`.

## Search behavior

Search harus tetap server-driven.

### Required behavior

- search input page/UI harus sinkron ke `filters.search`
- search reset `filters.page = 1`
- fetch ulang selalu memakai request state terbaru
- rows aktif tetap berasal dari response backend, bukan local filtered array

### Forbidden behavior

- local filtering menjadi jalur aktif kedua
- hidden fallback yang membuat UI search tampak aktif tanpa mengubah request backend

## Entries-per-page behavior

Entries-per-page harus truthful terhadap request backend.

### Required behavior

- kontrol “Show entries” atau yang setara harus mengubah `filters.limit`
- perubahan limit reset page ke `1`
- fetch ulang terjadi setelah perubahan limit
- info text pagination tetap membaca response `pagination`, bukan asumsi lokal yang berbeda dari request

### Forbidden behavior

- binding UI ke `pagination.per_page` sementara request tetap memakai limit lain
- dua source of truth untuk jumlah rows per halaman

## Page navigation behavior

Pagination tetap server-driven.

### Required behavior

- previous / next / page-number path mengubah `filters.page`
- validasi page boundary tetap mengikuti `pagination` terbaru dari backend
- info text dan button state tetap truthful terhadap `pagination.has_prev_page`, `pagination.has_next_page`, `pagination.current_page`, dan `pagination.total_records`

## Cleanup scope

### Active source to keep and clean

- `src/js/features/attendance/attendanceLog.js`
- `src/partials/table/table-attendance.html`
- `src/management-attendance.html`

### Residue candidate to evaluate and remove

- attendance-related residue di `src/js/index.js` hanya jika memang tidak lagi truthful terhadap flow attendance aktif

## Reuse guidance

### Reuse from booking (strongest reference)

Gunakan booking table sebagai reference utama untuk pattern server-driven yang sehat:

- `filters` sebagai request state tunggal
- fetch ulang pada search / page / limit / sort change
- response-driven `pagination`
- rows dirender dari response aktif

### Reuse from dashboard only as principle

Dari dashboard, reuse prinsip ini saja:

- satu contract aktif
- tidak ada hybrid residue
- partial harus truthful terhadap source aktif

### Do not reuse from user table

Jangan menyalin local-filter/local-pagination model user table ke attendance.

## Expected file changes

### Primary active files

- `src/js/features/attendance/attendanceLog.js`
- `src/partials/table/table-attendance.html`
- `src/management-attendance.html`

### Possible residue cleanup file

- `src/js/index.js`

## Risks

1. **Entries-per-page drift**
   UI terlihat mengganti page size, tetapi request backend tidak ikut berubah.

2. **Search state split**
   Input search tampak aktif, tetapi request yang dikirim belum tentu memakai `filters.search` yang sama.

3. **False sort affordance**
   Header tampak sortable, tetapi sebenarnya tidak lagi atau belum benar-benar terhubung ke backend request.

4. **Residue cleanup affecting other pages**
   Jika attendance-related residue di `index.js` ternyata masih dipakai lintas page, cleanup bisa memengaruhi flow lain.

## Verification plan

### 1. Initial load

- attendance page load normal
- rows berasal dari `attendanceData`
- loading/error state tetap bekerja

### 2. Search

- mengubah search memicu request ulang
- `filters.search` sinkron dengan UI input
- page reset ke `1`
- rows tetap dari response backend

### 3. Entries per page

- mengubah page size mengubah `filters.limit`
- page reset ke `1`
- request limit backend ikut berubah
- info text tetap truthful

### 4. Page navigation

- previous / next / page number tetap konsisten dengan `pagination`
- tidak ada local pagination path kedua

### 5. Sort

- hanya field yang memang sudah aktif sekarang yang tetap sortable
- sort mengubah request backend, bukan state dekoratif lokal saja

### 6. Build safety

- `npm run build` tetap lulus

## Out of scope follow-up

- migrasi attendance ke client-driven
- redesign modal attendance lintas aplikasi
- menambah field sort baru di luar scope aktif
- standardisasi booking/attendance/dashboard/user sekaligus dalam satu refactor besar

## Summary rule

**Attendance table harus tetap server-driven, dan semua kontrol UI yang terlihat aktif harus benar-benar menulis ke satu request contract (`filters`) sementara semua rows/pagination hanya boleh dibaca dari response backend (`attendanceData` + `pagination`).**
