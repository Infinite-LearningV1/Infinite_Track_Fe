# Web FE Refresh Session Adoption Design

## Summary
Adopsi backend refresh-session contract ke Web FE dengan menambahkan satu jalur keputusan auth yang terpusat untuk bootstrap protected page, request runtime, silent refresh, dan forced re-auth. Tujuannya adalah menjaga session continuity tetap truthful saat access token expired normal, sekaligus memaksa login ulang saat refresh sudah invalid, revoked, atau inactivity window 48 jam telah terlampaui.

## Goal
1. Mengonsumsi backend refresh-session contract di Web FE tanpa redesign auth system yang lebih luas.
2. Menjadikan backend sebagai source of truth untuk session validity, bukan local storage atau FE state.
3. Menambahkan satu refresh orchestration path untuk protected requests dan bootstrap auth flow.
4. Mencegah concurrent refresh storm dan infinite retry loop.
5. Membedakan dengan jelas auth failure non-refreshable dari transport/server/offline failure.
6. Menyatukan forced cleanup dan full re-auth behavior agar konsisten di semua halaman protected.

## Non-Goals
- Mendefinisikan backend refresh contract.
- Membahas Android orchestration.
- Melakukan redesign penuh auth architecture Web FE.
- Mengganti seluruh page system, Alpine store structure, atau RBAC model di luar kebutuhan refresh-session adoption.
- Menyelesaikan masalah transport resilience umum di luar auth/session scope.

## Context
Linear `INF-145` menetapkan backend-authored refresh-token contract dengan inactivity expiry 48 jam lintas client. Linear `INF-146` meminta Web FE mengadopsi contract tersebut dengan satu refresh path, no infinite retry loop, truthful continuity, dan pembedaan yang jelas antara invalid refresh token dan gangguan transport/server.

Repo saat ini sudah memiliki `REFRESH_URL` di `src/js/config/env.js`, tetapi belum memiliki orchestration layer yang benar-benar mengonsumsi refresh contract. Auth/session logic saat ini masih tersebar di bootstrap startup, route guard, Alpine auth store, logout component, dan beberapa service API yang menangani token/header/401 secara manual.

## Current-State Findings

### 1. Bootstrap auth masih local-storage centric
- `src/js/index.js:341-379` memeriksa protected page dengan `isAuthenticated()`.
- `src/js/index.js:391-458` memiliki `validateUserSession()`, tetapi helper yang dipakai untuk “server validation” adalah `getCurrentUser()`.
- `src/js/services/authService.js:203-205` menunjukkan `getCurrentUser()` hanya membaca local storage melalui `getUserFromStorage()`.

Implikasi: startup flow belum backend-truth aware, walaupun komentar kode mengisyaratkan validasi server.

### 2. Auth transport posture sekarang hybrid dan tidak konsisten
- `src/js/services/authService.js:15` mengaktifkan `axios.defaults.withCredentials = true`.
- `src/js/services/bookingService.js:16-19` membaca token dari `localStorage["auth_token"]`.
- `src/js/services/attendanceService.js:16-19` membaca token dari `localStorage["auth_token"]`.
- `src/js/services/userService.js:21-33` membaca token dari `localStorage["user"]?.token`.
- `src/js/utils/storageManager.js:34-46` menggunakan canonical key `userData`.
- `src/js/config/env.js:56-62` mendefinisikan canonical storage keys sebagai `userData`, `authToken`, dan related keys.

Implikasi: FE belum punya satu canonical auth accessor yang dipercaya semua service.

### 3. 401 handling belum punya refresh recovery path
- `src/js/services/authService.js:104-107` pada `401` langsung menghapus storage dan melempar error sesi berakhir.
- Banyak service lain melempar auth-expired message langsung pada `401`.
- Tidak terlihat interceptor/queue/single-flight refresh executor yang terpusat.

Implikasi: expired access token saat runtime berisiko langsung berubah menjadi misleading logout atau error UI yang fragmented.

### 4. Logout / forced cleanup tersebar di banyak titik
- `src/js/services/authService.js:130-187`
- `src/js/components/logoutComponent.js:212-238`
- `src/js/components/logoutComponent.js:333-353`
- `src/js/utils/roleBasedAccess.js:247-317`

Implikasi: belum ada satu forced cleanup path untuk non-refreshable auth failure.

## Design Decision
Pakai pendekatan **centralized auth-session runtime** yang menjadi satu-satunya jalur keputusan auth truth di Web FE. Runtime ini akan dipakai oleh bootstrap protected page, protected request handling, silent refresh, dan forced re-auth cleanup.

Store, route guard, RBAC, dan UI logout tetap ada, tetapi semuanya menjadi consumer dari hasil auth runtime, bukan sumber keputusan session validity sendiri.

## Architecture Boundary

### Recommended boundary
Tambahkan satu auth-session runtime dengan tanggung jawab berikut:
- menentukan status auth/session yang sedang terjadi,
- menjadi satu-satunya tempat yang boleh memanggil `POST /api/auth/refresh`,
- mengoordinasikan concurrent protected request saat refresh sedang berjalan,
- mengklasifikasikan auth failure vs transport failure,
- menyediakan satu forced cleanup path untuk non-refreshable states.

### Session states yang harus dikenali FE
1. **Authenticated and usable**
   - session sudah confirmed usable untuk request protected.
2. **Expired but refreshable**
   - access token expired normal, tetapi refresh masih bisa dilakukan.
3. **Non-refreshable auth failure**
   - refresh token invalid,
   - refresh token revoked,
   - inactivity window 48 jam telah terlampaui,
   - atau backend secara eksplisit menyatakan full re-auth required.
4. **Transport / verification failure**
   - offline,
   - timeout,
   - backend unreachable,
   - server failure saat refresh/verification.

### Boundary consequences
- Local storage boleh menjadi session hint, tetapi bukan final authority.
- Route guard dan startup flow tidak boleh lagi menganggap keberadaan cached user sebagai session confirmation.
- Service layer tidak boleh lagi membuat keputusan auth recovery sendiri.

## Runtime Refresh Orchestration

### Trigger rules
Refresh hanya boleh dipicu jika semua kondisi berikut terpenuhi:
- request adalah protected/auth-required request,
- response/failure termasuk kategori auth failure yang masih mungkin refreshable,
- request belum pernah direplay setelah refresh.

Refresh tidak boleh dipicu untuk:
- request public,
- request refresh itu sendiri,
- request logout,
- request yang sudah pernah direplay,
- failure non-auth seperti 403/404/validation/general 5xx.

### Single-flight rule
Pada saat request pertama terkena auth-failure-refreshable:
- runtime membuat satu refresh promise aktif,
- request protected lain yang terkena failure serupa harus join ke promise yang sama,
- tidak boleh ada multiple refresh request paralel.

### Waiting-request behavior
Saat refresh in-flight:
- request protected lain yang membutuhkan auth recovery masuk status waiting,
- request tersebut tidak langsung menghasilkan logout/error auth final ke UI,
- setelah refresh selesai:
  - jika sukses, request replay sekali,
  - jika non-refreshable, fail ke forced re-auth path,
  - jika transport/server failure, fail sebagai transport problem, bukan auth-invalid.

### Replay rule
Setiap request protected hanya boleh:
- berjalan sekali secara normal,
- lalu maksimal satu replay setelah refresh sukses.

Tidak boleh ada loop:
- request gagal,
- refresh,
- replay,
- gagal lagi,
- refresh lagi,
- dan seterusnya.

Jika replay pasca-refresh tetap gagal dengan auth-invalid, runtime memperlakukan session sebagai non-recoverable dan menjalankan forced cleanup + full re-auth.

## Bootstrap and Protected Page Behavior

### Protected page startup
Pada halaman protected:
- jika tidak ada session hint sama sekali, FE menyimpan `redirectAfterLogin` lalu redirect ke `/signin.html`,
- jika ada local session hint, FE tidak boleh langsung menganggap authenticated,
- FE masuk ke state session resolving dan menjalankan backend-truth resolution melalui jalur auth runtime yang sama.

### Rendering rule
Selama bootstrap auth masih unresolved:
- halaman protected tidak boleh tampil seolah session sudah valid penuh,
- cached user boleh dipakai sebagai continuity hint internal,
- tetapi akses/session confirmation tetap menunggu hasil auth runtime.

### Signin page behavior
Pada halaman signin:
- keberadaan cached local state tidak boleh langsung memicu redirect ke dashboard,
- FE boleh mencoba backend-truth verification/refresh,
- redirect ke dashboard atau `redirectAfterLogin` hanya boleh terjadi setelah auth confirmed atau refreshed successfully.

## Failure Semantics

### Refreshable auth expiry
Contoh target semantic:
- access token expired normal,
- backend masih mengizinkan refresh.

Expected FE action:
- start atau join refresh flow,
- pertahankan session continuity secara truthful,
- replay request sekali setelah refresh sukses.

### Non-refreshable auth failure
Contoh target semantic:
- refresh token invalid,
- refresh token revoked,
- inactivity > 48 jam,
- backend mengembalikan signal bahwa full re-auth diperlukan.

Expected FE action:
- jalankan forced cleanup tunggal,
- clear auth/session state yang relevan,
- arahkan user ke signin/full login.

### Transport/server/offline failure
Contoh target semantic:
- offline,
- timeout,
- server unreachable,
- refresh call gagal karena backend error.

Expected FE action:
- jangan memaksa logout seolah refresh token invalid,
- jangan mislabel sebagai auth-invalid,
- tampilkan bahwa session belum bisa diverifikasi atau backend sedang bermasalah,
- biarkan user-facing state tetap truthful terhadap uncertainty ini.

## Forced Cleanup and Logout Semantics

### Forced cleanup path
Untuk seluruh non-refreshable auth failure, FE harus memakai satu cleanup path yang konsisten untuk:
- clear Alpine auth store,
- clear seluruh auth storage keys yang canonical maupun legacy yang masih dipakai,
- clear redirect/session transient state yang terkait auth,
- mengakhiri session FE secara final sebelum navigasi ke signin.

### Manual logout path
Manual logout tetap berbeda dari forced re-auth:
- FE mencoba memanggil backend logout,
- jika backend logout gagal, local cleanup tetap dijalankan,
- karena logout adalah keputusan eksplisit user, bukan failure classification.

### Truthful difference
- Manual logout boleh final walau backend logout error.
- Transport failure during refresh tidak boleh otomatis menjadi forced logout.

## File Responsibility Map

### `src/js/services/authService.js`
Harus menjadi pusat auth runtime untuk:
- login,
- logout,
- refresh executor,
- auth failure classifier,
- current-session resolver,
- forced cleanup function tunggal.

### `src/js/index.js`
Hanya menjadi consumer untuk startup orchestration.
Tidak boleh menyimpan local-only auth truth logic yang berbeda dari auth runtime.

### `src/js/stores/authStore.js`
Menjadi UI state consumer.
Store mengikuti hasil auth runtime dan tidak memutuskan sendiri session truth.

### `src/js/utils/authGuard.js`
Tetap menjaga route/page boundary.
Decision authenticated vs unauthenticated harus mengikuti hasil auth runtime/bootstrap result.

### `src/js/utils/roleBasedAccess.js`
Tetap menangani role-based access setelah auth confirmed.
Bukan tempat menentukan expiry/refresh validity.

### `src/js/components/logoutComponent.js`
Tetap menangani interaksi UI logout.
Semua cleanup final harus delegasi ke satu cleanup/auth runtime path.

### Protected API service files
Contoh:
- `src/js/services/userService.js`
- `src/js/services/bookingService.js`
- `src/js/services/attendanceService.js`
- service protected lain yang mengikuti pola serupa

Mereka tidak boleh membuat keputusan auth recovery sendiri. Mereka harus menggunakan jalur auth-aware yang sama atau mematuhi hasil error classification dari centralized layer.

## Backend Contract Consumption Expectations
FE harus mengonsumsi backend contract dengan aturan berikut:

### Refresh endpoint
- `POST /api/auth/refresh`

### Client identity
- FE mengirim `X-Client-Type` sesuai contract backend pada jalur yang memang diwajibkan contract.

### Session semantics
- FE membedakan secara eksplisit:
  - access token expired but refreshable,
  - refresh token invalid/revoked,
  - inactivity > 48 jam,
  - transport/server/offline failure.

### Limited-session semantics
- FE tidak menganggap local state sebagai bukti final session tetap hidup.
- Session continuity hanya boleh dipertahankan jika backend masih mengizinkan refresh atau verification succeed.

### Cookie + JSON compatibility
- FE harus siap terhadap backend yang memakai cookie, JSON payload, atau hybrid response contract.
- Apa pun bentuk response-nya, FE harus tetap punya satu canonical post-response auth update path.

## Open Questions
Pertanyaan ini harus tetap eksplisit sampai diverifikasi, bukan ditebak saat implementasi:
1. Exact signal backend untuk membedakan invalid/revoked refresh token vs inactivity-expired.
2. Apakah refresh success mengembalikan user/session payload langsung, atau FE harus follow-up ke `/auth/me`.
3. Apakah `X-Client-Type` wajib pada semua protected request atau hanya auth endpoints tertentu.
4. Canonical auth transport yang harus dianggap final oleh FE setelah cutover:
   - cookie-only,
   - bearer-only,
   - atau hybrid with canonical accessor.
5. Exact UI/state treatment yang paling aman saat startup verification gagal karena transport outage.

## Verification Matrix
Implementasi dianggap benar jika evidence dapat menunjukkan hasil berikut:

### Case 1 — access token expired but refreshable
- Trigger: bootstrap atau protected request mengalami auth expiry yang refreshable.
- Expected:
  - satu refresh call,
  - continuity terjaga,
  - request replay sukses,
  - tidak terjadi misleading logout.

### Case 2 — refresh token invalid/revoked
- Expected:
  - tidak ada infinite retry,
  - forced cleanup tunggal,
  - full login required.

### Case 3 — inactivity > 48 jam
- Expected:
  - refresh denied as non-refreshable,
  - forced cleanup tunggal,
  - full login required.

### Case 4 — offline/server-down during refresh
- Expected:
  - tidak disamakan dengan invalid refresh token,
  - FE menunjukkan transport/server verification problem,
  - tidak melakukan forced logout yang misleading.

### Case 5 — concurrent protected requests
- Expected:
  - satu refresh in-flight,
  - request lain menunggu hasil yang sama,
  - replay sekali,
  - tidak ada refresh storm.

### Case 6 — signin page with stale local state
- Expected:
  - tidak redirect prematur ke dashboard,
  - redirect hanya setelah backend-truth confirmed.

## In-Scope Changes
- Menambahkan satu auth runtime truth path untuk refresh-session adoption.
- Menyesuaikan bootstrap protected page agar backend-truth aware.
- Menyatukan runtime 401 handling yang relevan ke refresh session.
- Menyatukan forced cleanup/full re-auth path.
- Menormalisasi protected request auth recovery behavior agar tidak fragmented.

## Out-of-Scope Changes
- Redesign auth architecture secara penuh.
- Android refresh/session behavior.
- Redesign RBAC model atau page model di luar yang dibutuhkan untuk truthful session handling.
- Perubahan transport resilience umum yang tidak langsung terkait refresh session.
- Perubahan UI besar di luar state yang dibutuhkan untuk truthful auth/session behavior.

## Risks and Mitigations

### Risk 1 — Refresh succeeds but not all requests benefit
Current repo memiliki beberapa token source berbeda.

**Mitigation:**
Tetapkan satu canonical auth accessor/runtime path dan hentikan keputusan auth recovery per-service.

### Risk 2 — Refresh storm under concurrent 401s
Beberapa request protected bisa gagal bersamaan.

**Mitigation:**
Gunakan single-flight refresh promise dan waiting-request replay policy.

### Risk 3 — Misleading forced logout on transport failure
Refresh bisa gagal karena backend/server/offline, bukan karena session invalid.

**Mitigation:**
Pisahkan classifier auth-invalid vs transport failure dan larang forced cleanup untuk failure transport.

### Risk 4 — Startup remains local-only despite new runtime
Jika bootstrap masih langsung percaya local storage, truthful continuity tidak tercapai.

**Mitigation:**
Bootstrap protected page wajib melewati auth runtime yang sama dengan protected request flow.

### Risk 5 — Cleanup behavior remains fragmented
Banyak titik logout/clear state saat ini.

**Mitigation:**
Satukan cleanup final ke satu path dan jadikan semua jalur lain consumer dari path tersebut.

## Success Criteria
1. Web FE memiliki satu refresh orchestration path untuk auth/session recovery.
2. Bootstrap protected page tidak lagi mengklaim validation dari local-only helper.
3. Protected request runtime tidak langsung logout saat access token expired normal dan refresh masih bisa succeed.
4. Invalid/revoked/inactivity-expired session menghasilkan forced cleanup + full re-auth yang konsisten.
5. Transport/server/offline failure during refresh tidak disamakan dengan invalid refresh token.
6. Multi-request auth failure tidak menghasilkan refresh storm.
7. Scope perubahan tetap terbatas ke Web FE refresh-session adoption.

## Docs / ADR Note
DOCS/ADR UPDATE REQUIRED

Karena implementasi yang mengikuti spec ini akan menyentuh:
- auth/session contract,
- route guard expectation,
- source-of-truth behavior across clients,
- service/API integration consistency boundary.

Referensi yang harus ditinjau kembali saat implementasi:
- `docs/adr/ADR-002-auth-session-and-truthful-access-denial.md`
- `docs/adr/ADR-003-route-guard-and-rbac-boundary.md`
- `docs/adr/ADR-005-service-and-api-integration-consistency-boundary.md`

## Verification Note
REQUIRES REPO VERIFICATION

Spec ini mendefinisikan behavior target dan evidence matrix, tetapi exact verification commands/runtime path tetap harus dipastikan dari repo execution flow yang berlaku saat implementasi.
