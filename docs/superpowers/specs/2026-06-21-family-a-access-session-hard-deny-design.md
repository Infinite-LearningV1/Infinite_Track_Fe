# Family A Access Session Hard Deny Design

## Summary
Perbaikan Family A ini menutup dua mismatch auth Web FE yang masih bertentangan dengan truthful access boundary. Pertama, login `Admin` dan `Management` tidak boleh lagi dibajak oleh stale `redirectAfterLogin=/profile.html`; landing default setelah login harus kembali ke dashboard utama kecuali ada stored redirect target yang memang masih valid dan memang menjadi target kerja yang sah. Kedua, `Employee` dan `Internship` yang mencoba mengakses `/index.html` harus terkena hard deny sebelum dashboard sempat usable, tanpa silent redirect ke `/profile.html`, dan dengan modal/toast yang memakai komponen existing.

## Goal
1. Menjamin `Admin` dan `Management` landing ke dashboard utama setelah login success yang bersih.
2. Menutup stale `redirectAfterLogin` hijack yang mengarahkan dashboard-class role ke `/profile.html`.
3. Mengubah akses `/index.html` untuk `Employee`/`Internship` menjadi truthful hard deny dengan komponen existing, bukan redirect diam-diam ke `/profile.html`.
4. Menjaga backend auth/session tetap sebagai source of truth dan tidak mengubah semantic backend contract.
5. Menghasilkan fresh browser/runtime evidence untuk seluruh skenario auth Family A yang masih gap.

## Non-Goals
- Mengubah backend auth/session contract.
- Mendesain ulang penuh auth architecture Web FE di luar scope Family A ini.
- Mengubah Android flow.
- Menghapus seluruh support `redirectAfterLogin` yang masih sah untuk use-case return-to-page.
- Mendesain komponen modal/toast baru.

## Context
Issue chain dan governance yang relevan sudah menempatkan auth/session Web FE sebagai consumer dari backend-authored truth. `API_CONTRACT.md` menetapkan `POST /api/auth/refresh`, `X-Client-Type: web`, dan machine-readable auth codes sebagai kontrak kanonik. ADR `ADR-002`, `ADR-003`, dan `ADR-007` juga sudah mengunci prinsip bahwa cached browser state hanyalah session hint, route guard/RBAC adalah operator guidance, dan denial harus truthful.

Repo reality saat ini belum sepenuhnya konsisten terhadap boundary tersebut. `src/js/features/signinHandler.js` masih memprioritaskan stored redirect target sebelum fallback role default. `src/js/utils/roleBasedAccess.js` masih menganggap `Employee`/`Internship` normal diarahkan ke `/profile.html`. Denial modal untuk dashboard hanya branch sempit di `/index.html`, sementara behavior login success dan protected bootstrap masih memungkinkan hasil akhir yang terlihat seperti redirect biasa, bukan hard deny yang eksplisit.

## Current-State Findings

### 1. Login success masih bisa dibajak stale redirect target
- `src/js/features/signinHandler.js` mengambil `sessionStorage.redirectAfterLogin` lalu `localStorage.redirectAfterLogin` sebelum fallback redirect berdasarkan role.
- Existing tests masih menganggap `/profile.html` sebagai current-tab stored redirect yang valid bahkan untuk role dashboard seperti `Admin`.

Implikasi: meskipun role default `Admin` dan `Management` sudah diarahkan ke dashboard, stale redirect target masih bisa mengalahkan intended landing.

### 2. RBAC dashboard deny belum menjadi hard deny entry flow
- `src/js/utils/roleBasedAccess.js` hanya memanggil `showAccessDenied()` pada akses `/index.html` untuk `Internship`/`Employee`.
- Branch lain tetap jatuh ke `redirectBasedOnRole(userRole)` yang mengarah ke `/profile.html`.

Implikasi: deny UX masih bercampur antara explicit deny dan redirect fallback, sehingga boundary terasa tidak truthful.

### 3. Protected bootstrap dan RBAC masih dibaca terpisah
- `src/js/index.js` menjalankan `validateUserSession()` pada halaman protected setelah session hint ada.
- `src/js/utils/roleBasedAccess.js` baru menegakkan page-level access setelah verified user tersedia.

Implikasi: titik deny yang benar harus terjadi sangat awal setelah verified role tersedia, sebelum dashboard sempat usable, tetapi tetap sesudah backend-truth resolution selesai.

### 4. Existing component path sudah cukup
- Repo sudah memiliki `showAccessDenied()` modal path di `src/js/utils/roleBasedAccess.js`.
- Repo juga memiliki alert/modal helpers lain, tetapi kebutuhan saat ini bisa dipenuhi tanpa menambah komponen baru.

Implikasi: desain terbaik adalah memperbaiki orchestration dan timing pemanggilan component existing, bukan membangun komponen deny baru.

## Design Decision
Gunakan pendekatan **verified-role-first dashboard deny** dengan dua aturan utama:

1. **Dashboard-class roles (`Admin`, `Management`)**
   - default landing setelah login success tetap dashboard utama;
   - stored redirect target tetap didukung, tetapi tidak boleh membajak landing ke target stale seperti `/profile.html` yang bertentangan dengan intended dashboard entry flow untuk Family A.

2. **Non-dashboard roles (`Employee`, `Internship`)**
   - ketika mencoba `/index.html`, FE harus menyelesaikan backend-truth verification terlebih dahulu;
   - setelah verified role tersedia dan role tidak berhak ke dashboard, FE langsung menampilkan modal/toast deny menggunakan komponen existing;
   - user tidak boleh mengalami silent redirect ke `/profile.html`, dan dashboard tidak boleh sempat usable.

## Recommended Behavior Boundary

### A. Login success for Admin / Management
Setelah login berhasil:
- FE boleh membaca stored redirect target hanya jika target tersebut masih sah untuk role yang baru login dan masih sesuai intended post-login navigation.
- Jika stored redirect target ternyata stale, misleading, atau tidak lolos policy untuk dashboard-class role, FE harus mengabaikannya dan kembali ke dashboard utama.

Untuk task ini, stale `/profile.html` diperlakukan sebagai target yang tidak boleh lagi membajak login success `Admin`/`Management`.

### B. Access `/index.html` for Employee / Internship
Ketika verified user role adalah `Employee` atau `Internship` dan page target adalah `/index.html`:
- FE tidak redirect diam-diam ke `/profile.html`.
- FE memunculkan modal/toast deny yang truthful menggunakan komponen existing.
- Dashboard content tidak boleh sempat menjadi surface yang usable bagi role tersebut.
- CTA modal boleh mengarahkan ke path aman setelah acknowledgment, tetapi flow awalnya tetap deny-first, bukan redirect-first.

### C. Unknown / unclassified role
Untuk role yang tidak dikenal backend mapping FE saat ini:
- jangan gunakan fallback diam-diam ke `/profile.html`;
- perlakukan sebagai access boundary mismatch yang truthful;
- gunakan deny path yang aman dan eksplisit.

Ini mencegah FE memberi impresi bahwa role yang tidak dimengerti tetap punya landing yang sah.

## Redirect Policy Adjustment

### Stored redirect target policy
Stored redirect target tetap dipertahankan, tetapi policy-nya diperketat menjadi:
1. same-origin only;
2. role-access-checked against fresh verified/login user;
3. tidak boleh override intended dashboard landing untuk dashboard-class roles bila target yang tersimpan adalah stale profile-oriented artifact yang tidak lagi merepresentasikan task return yang sah;
4. bila check gagal atau helper unavailable, fallback ke role default yang truthful.

### Why not remove redirectAfterLogin entirely
`redirectAfterLogin` masih berguna untuk return-to-page yang sah setelah forced reauth atau signin requirement. Menghapus total fitur ini akan memperlebar blast radius Family A tanpa perlu. Yang perlu ditutup adalah stale hijack-nya, bukan seluruh mekanismenya.

## Component and Orchestration Design

### Existing modal path
Komponen existing `showAccessDenied()` di `src/js/utils/roleBasedAccess.js` menjadi basis deny UI. Yang diubah adalah:
- kapan function itu dipanggil;
- apa yang dilakukan CTA-nya;
- bagaimana branch redirect fallback yang sekarang masih menuju `/profile.html` dinetralkan.

### Timing requirement
Deny modal harus dipicu pada fase awal setelah verified auth store tersedia, sebelum dashboard sempat usable. Secara praktis, ini berarti enforcement tetap terjadi di startup/guard/RBAC bootstrap path, bukan setelah page interaction berjalan.

### UI requirement
Pesan deny harus truthful:
- akses ke dashboard ditolak karena role tidak berhak;
- bukan seolah-olah user “punya halaman utama lain” lalu dipindahkan diam-diam.

## File Responsibility Map

### `src/js/features/signinHandler.js`
Tanggung jawab desain:
- menyesuaikan policy `redirectAfterLogin` untuk role `Admin`/`Management`;
- memastikan stale `/profile.html` tidak lagi mengalahkan dashboard landing;
- tetap memakai fresh login/verified user untuk access evaluation.

### `src/js/utils/roleBasedAccess.js`
Tanggung jawab desain:
- memindahkan dashboard deny menjadi deny-first flow yang tegas untuk `Employee`/`Internship`;
- menghapus reliance pada silent redirect ke `/profile.html` sebagai fallback dashboard denial;
- memperjelas behavior role unknown/unclassified.

### `src/js/index.js`
Tanggung jawab desain:
- memastikan startup bootstrap tidak menghasilkan dashboard usable state sebelum verified-role deny decision selesai.

### `src/js/utils/authGuard.js`
Tanggung jawab desain:
- tetap sinkron dengan bootstrap/RBAC boundary supaya signin redirect, verification_failed, dan page deny tidak saling bertentangan.

### Tests
Tanggung jawab desain:
- mengubah expectation lama yang masih menganggap stale `/profile.html` valid untuk `Admin`;
- menambah coverage deny-first dashboard flow untuk role non-admin/non-management;
- menjaga auth runtime regression coverage tetap selaras dengan ADR truthful denial.

## Verification Design
Fresh evidence minimum yang harus dikumpulkan setelah implementasi:
1. `Admin` login dengan storage bersih -> landing ke dashboard, bukan profile.
2. `Management` login dengan storage bersih -> landing ke dashboard, bukan profile.
3. `Employee` atau `Internship` mencoba `/index.html` -> modal/toast deny muncul sebelum dashboard usable, tanpa silent redirect ke `/profile.html`.
4. Stale `redirectAfterLogin=/profile.html` -> tidak lagi membajak landing `Admin`/`Management`.
5. Capture `localStorage`/`sessionStorage` sebelum dan sesudah login/deny flow.
6. Capture console/network evidence untuk urutan `/auth/me`, refresh jika ada, dan final navigation/deny behavior.

## Risk and Trade-offs
- Positive: auth boundary menjadi lebih truthful dan sesuai ADR Family A.
- Positive: operator tidak lagi menerima signal diam-diam bahwa dashboard denial hanyalah redirect biasa.
- Positive: stale post-login redirect artifact tidak lagi mengalahkan intended dashboard landing.
- Negative: existing redirect-after-login tests perlu diperbarui karena expectation lamanya memang mengunci behavior yang sekarang dianggap mismatch.
- Negative: deny timing harus hati-hati agar tidak menolak sebelum backend-truth verification selesai.
- Negative: startup flow auth/RBAC menjadi lebih sensitif terhadap urutan bootstrap.

## Worktree / Execution Decision
Existing Family A worktree `C:\Users\Febriyadi\.claude\worktrees\Infinite_Track_Fe-family-a-webfe-auth-session` tetap berguna sebagai audit/reference lane, tetapi tidak dipakai sebagai jalur tulis karena `detached HEAD` dan dirty. Implementasi dan evidence baru dilakukan di worktree baru dari `develop` agar continuation tetap aman dan auditable.

## Docs / ADR Note
DOCS/ADR UPDATE REQUIRED.

Perubahan ini menyentuh:
- auth/session consumer expectation,
- route guard / RBAC denial semantics,
- truthful access denial behavior pada admin surface.

Minimal update note harus mengarah ke ADR-002, ADR-003, dan ADR-007, atau menjelaskan mengapa perubahan cukup ditutup sebagai implementation-alignment tanpa ADR baru.

## Open Verification Points
- Exact CTA final setelah deny acknowledge tetap harus dibuktikan di runtime agar tidak menghasilkan side effect UX yang tidak diinginkan.
- Jika ada role backend baru di luar empat role yang sekarang dikenali FE, behavior unknown-role perlu smoke evidence agar tidak jatuh ke fallback yang misleading.
- Contract docs external sudah terverifikasi untuk `API_CONTRACT`, `ROUTING_POLICY`, `DECISIONS`, `QUALITY_GATE`, `EXECUTION_WORKTREE_POLICY`, `LOOP_CLOSURE_CONTRACT`, dan taxonomy family. `Needs Verification` tetap berlaku bila runtime evidence segar belum terkumpul pada cycle implementasi ini.
