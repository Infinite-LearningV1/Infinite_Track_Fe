# User Table Client-Driven Cleanup Design

## Summary

Phase ini menstandarkan user table dengan arah yang sejalan dengan dashboard table cleanup: satu contract state yang jelas, helper yang tidak duplikatif, dan wiring action yang truthful. Bedanya, user table **tetap client-driven**, karena problem utamanya bukan di strategi fetch dari backend, melainkan di duplicate helper, stale implementation, dan stale wiring yang membuat code kurang efisien.

## Goal

1. Menjadikan user table punya satu jalur state aktif yang jelas dan efisien.
2. Menghapus helper method yang duplikatif dan action wiring yang stale/misleading.
3. Menyelaraskan partial user table dengan source aktif yang benar.
4. Menjaga behavior user table tetap client-driven dan tetap sesuai kebutuhan yang sudah ada.

## Non-goals

- Mengubah user table menjadi server-driven.
- Membuat shared abstraction generic untuk semua tabel.
- Mendesain ulang modal system lintas seluruh aplikasi.
- Menyatukan semua fitur admin table ke satu framework baru.

## Current context

User table saat ini secara konsep sudah lebih konsisten dibanding dashboard sebelum distandarkan:
- fetch user list sekali
- filter lokal
- pagination lokal
- render dari data in-memory

Namun ada tiga masalah utama:
1. `src/js/features/userManagement/userListSimple.js` masih memiliki helper duplikat (`getInitials`, `getAvatarColor`) dalam source aktif.
2. `src/js/components/userList.js` masih menyimpan implementasi user list lama / stale yang tidak lagi menjadi sumber aktif.
3. `src/js/index.js` masih memiliki block wiring global yang terlihat seperti “user table modal handling” tetapi isinya residue/booking-like dan tidak lagi truthful terhadap partial user table aktif.

## Standardization decision

User table tetap **client-driven**, tetapi harus memiliki satu contract aktif dan satu source implementasi aktif yang jelas.

### Canonical active state
- `users`
- `searchQuery`
- `entriesPerPage`
- `currentPage`

### Canonical derived state
- `filteredUsers`
- `paginatedUsers`
- `totalPages`
- `showingInfo`

### Canonical action flow
- `editUser(...)`
- `showDeleteModal(...)`
- `openMapDetailModal(...)`

Action yang dipakai partial harus benar-benar hidup di source aktif.

## Cleanup scope

### Active source to keep and clean
- `src/js/features/userManagement/userListSimple.js`
- `src/partials/table/table-user.html`

### Stale / residue to evaluate and remove
- `src/js/components/userList.js`
- residue user-table-related block di `src/js/index.js` yang tidak lagi sesuai partial aktif

## Rule set for this phase

1. Tidak boleh ada helper duplikat di source aktif.
2. Tidak boleh ada stale user list implementation yang membingungkan source-of-truth jika memang tidak dipakai lagi.
3. Tidak boleh ada wiring global yang memakai selector / message / behavior yang tidak truthful terhadap user table aktif.
4. Partial `table-user.html` hanya boleh memanggil handler yang memang disediakan source aktif.
5. Client-driven strategy tetap dipertahankan karena itu masih sesuai kebutuhan user table saat ini.

## Why client-driven remains correct here

Berbeda dari dashboard report table, user table saat ini belum menunjukkan kebutuhan kuat untuk dipaksa ke server-driven.

### Why not migrate now
- fokus phase ini adalah efisiensi dan standardisasi code, bukan perubahan strategi data
- user table sudah bekerja dengan pola local filter + local pagination
- memaksa migrasi strategi sekarang akan memperbesar blast radius tanpa bukti kebutuhan langsung

### What “standardized” means for this phase
- source aktif tunggal
- naming lebih konsisten
- helper tidak duplikatif
- action flow tidak misleading
- residue implementation dibersihkan

## Expected file changes

### Primary active file
- `src/js/features/userManagement/userListSimple.js`

### UI partial
- `src/partials/table/table-user.html`

### Stale implementation candidate
- `src/js/components/userList.js`

### Stale global wiring candidate
- `src/js/index.js`

## Reuse guidance

Gunakan arah standardisasi dashboard sebagai prinsip, tetapi bukan menyalin strategi datanya secara mentah.

### Principles to reuse from dashboard work
- satu source aktif
- satu contract state aktif
- partial truthful terhadap state/handler aktif
- hilangkan duplicate/stale path

### Behavior model to keep for user table
- data utama tetap berasal dari list lokal hasil fetch aktif
- filter dan pagination tetap lokal
- tidak perlu memaksa backend request contract baru dalam phase ini

## Risks

1. **Removing stale code that is still implicitly referenced**
   Jika `src/js/components/userList.js` atau residue `index.js` ternyata masih dipakai secara tidak langsung oleh bootstrap tertentu, cleanup bisa memutus flow.

2. **Action mismatch between partial and source**
   Jika partial aktif memanggil handler yang ternyata berasal dari residue path, cleanup bisa memunculkan runtime error.

3. **Scope creep into modal redesign**
   Jika user table cleanup berubah menjadi redesign modal system, phase ini akan melebar terlalu jauh.

4. **Over-standardization**
   Jika kita memaksa user table mengikuti dashboard secara literal, kita bisa kehilangan model client-driven yang sebenarnya masih cocok dan lebih efisien untuk use case ini.

## Verification plan

### 1. Initial load
- User list load normal
- rows tetap muncul dari source aktif

### 2. Search
- `searchQuery` tetap memfilter `filteredUsers`
- pagination reset sesuai behavior yang sudah ada / diharapkan

### 3. Entries per page
- `entriesPerPage` tetap mengontrol `paginatedUsers`
- total info tetap truthful

### 4. Page navigation
- next / prev / page selection tetap konsisten dengan `currentPage` dan `totalPages`

### 5. Action flow
- edit action tetap jalan
- delete modal path tetap jalan
- map detail modal tetap jalan bila memang masih menjadi affordance aktif di partial

### 6. Residue cleanup
- tidak ada helper duplikat tersisa di source aktif
- stale implementation yang tidak dipakai benar-benar hilang atau jelas didekomisikan
- residue user-table wiring di `index.js` yang misleading sudah dibuang bila memang tidak lagi aktif

### 7. Build safety
- `npm run build` tetap lulus

## Out of scope follow-up

- migrasi user table ke server-driven contract
- abstraction generic lintas semua tabel admin
- redesign modal lintas aplikasi
- standardisasi booking/attendance/user sekaligus dalam satu refactor besar

## Summary rule

**User table harus tetap client-driven, tetapi hanya boleh punya satu source aktif, satu contract state aktif, dan tidak boleh menyisakan helper atau wiring stale yang membuat code tidak efisien atau misleading.**
