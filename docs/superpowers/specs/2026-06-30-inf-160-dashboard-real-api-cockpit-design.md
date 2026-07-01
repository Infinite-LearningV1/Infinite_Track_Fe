# INF-160 Dashboard Real API Cockpit Design

## Summary

Design ini mengadopsi real backend API ke dashboard cockpit Web FE dengan prinsip utama:

- **tidak melakukan redesign UI**;
- **tidak mengubah contract backend**;
- **menjaga ownership endpoint per section secara ketat**;
- **menyelesaikan gap field di mapper/view-model FE**;
- **menghapus dummy/preview dari jalur utama runtime**.

Dashboard cockpit yang sudah approved tetap dipertahankan sebagai surface visual. Yang diubah adalah jalur data, mapping field, dan boundary state supaya setiap panel menampilkan backend truth dari endpoint owner yang benar.

Worktree implementasi dan verifikasi untuk task ini dikunci ke:
`C:\Users\Febriyadi\.claude\worktrees\Infinite_Track_Fe-wt-inf-160-dashboard-real-api-cockpit`

## Purpose

Menyelaraskan dashboard cockpit Web FE dengan backend final contract untuk empat surface owner berikut:

1. `GET /api/summary/dashboard-analytics` sebagai owner recap dashboard ringan;
2. `GET /api/attendance/geofence-evidence` sebagai owner geofence evidence panel utama;
3. `GET /api/attendance/today-locations` sebagai owner live map / today snapshot;
4. `GET /api/analysis/fuzzy-ahp/dashboard?type=discipline|wfa|smart_ac` sebagai owner Fuzzy AHP tabs.

## Goals

- Menjadikan setiap section dashboard cockpit memakai endpoint owner yang tepat.
- Menghapus dummy/preview lama dari jalur utama runtime.
- Mempertahankan desain visual existing tanpa redesign.
- Mengizinkan tambah/ubah/hapus field UI kecil jika perlu agar mengikuti backend truth selama pattern UI existing tetap dijaga.
- Menjaga pemisahan concern antara fetching, mapping, orchestration, dan rendering.
- Menyediakan acceptance criteria dan runtime proof yang jelas untuk membuktikan dashboard sudah real-API-backed.

## Non-Goals

- Mengubah contract backend.
- Mendesain ulang layout, hierarchy visual, card structure, tab layout, spacing language, atau interaction model utama dashboard cockpit.
- Menambah scope di luar dashboard cockpit ini.
- Menurunkan geofence evidence dedicated endpoint menjadi turunan analytics recap.
- Menggunakan preview/dummy sebagai fallback sukses utama.
- Mendesain abstraction baru lintas repo yang tidak diperlukan untuk task ini.

## Current Repo Context

Branch/worktree aktif untuk continuation ini adalah `feature/inf-160-dashboard-real-api-cockpit` pada worktree:
`C:\Users\Febriyadi\.claude\worktrees\Infinite_Track_Fe-wt-inf-160-dashboard-real-api-cockpit`

Fondasi owner-based dashboard sudah mulai ada di branch ini:

- `src/js/services/dashboardAnalyticsService.js` sudah memanggil `/summary/dashboard-analytics`
- `src/js/services/geofenceEvidenceService.js` sudah memanggil `/attendance/geofence-evidence`
- `src/js/services/todayLocationsService.js` sudah memanggil `/attendance/today-locations`
- `src/js/features/dashboard/dashboard.js` sudah memuat slice dashboard secara paralel
- `src/js/services/dashboard/*.js` sudah menjadi lapisan slice/view-model per panel

Namun continuation audit menunjukkan beberapa mismatch yang masih harus ditutup:

1. `src/js/services/fuzzyAhpService.js` masih memakai endpoint lama `/analysis/fuzzy-ahp/dashboard-recap` dengan parameter lama.
2. `src/js/services/dashboardCockpitService.js` masih memiliki preview/dummy runtime path untuk geofence, FAHP, dan map.
3. `src/js/services/reportService.js` masih menyimpan jalur mock/legacy yang perlu dipastikan tidak lagi menjadi source utama cockpit.
4. Beberapa panel masih membawa asumsi preview-success alih-alih truthful empty/needs-data/error state.

## Design Principles

### 1. No redesign

Semua perubahan harus menjaga desain existing. Yang boleh berubah:

- isi field;
- label kecil;
- helper text / note;
- block information kecil di dalam panel;
- keberadaan field tertentu jika backend owner memang tidak menyediakannya.

Yang tidak boleh berubah:

- struktur visual utama dashboard cockpit;
- pattern card / section / tab utama;
- bahasa visual approved yang sudah ada.

### 2. Strict endpoint ownership

Setiap panel utama memiliki satu owner endpoint. Orchestration FE tidak boleh mencampur source utama lintas owner.

### 3. FE mapper solves the gap

Jika desain existing dan backend tidak match 1:1, penyelesaiannya dilakukan di layer mapper/view-model FE. FE tidak meminta perubahan contract backend untuk task ini.

### 4. No preview-success path

Dummy/preview lama harus dihapus dari jalur utama runtime. Jika backend belum menyediakan data yang cukup, panel harus jujur turun ke `empty`, `needsData`, atau `error` dengan UI boundary ringan yang mengikuti pattern existing.

### 5. Clear concern separation

- **service** = fetch owner endpoint
- **slice/view-model** = normalize payload backend untuk kebutuhan UI existing
- **dashboard orchestration** = compose section/panel state tanpa menciptakan data pengganti
- **template** = render state dengan binding yang sesuai

## Final Endpoint Ownership

### A. Dashboard analytics owner
- **Endpoint:** `GET /api/summary/dashboard-analytics`
- **Scope:** executive KPI / stats cards / historical trend / mode mix / lightweight insights
- **Boundary:** `data.geofence_evidence_context` hanya context embed, bukan owner geofence panel utama

### B. Geofence evidence owner
- **Endpoint:** `GET /api/attendance/geofence-evidence`
- **Scope:** panel geofence evidence utama
- **Boundary:** tidak boleh turun dari recap analytics

### C. Today locations owner
- **Endpoint:** `GET /api/attendance/today-locations`
- **Scope:** live map hero, marker feed, today snapshot
- **Boundary:** bukan analytics map snapshot owner

### D. Fuzzy AHP owner
- **Endpoints:**
  - `GET /api/analysis/fuzzy-ahp/dashboard?type=discipline`
  - `GET /api/analysis/fuzzy-ahp/dashboard?type=wfa`
  - `GET /api/analysis/fuzzy-ahp/dashboard?type=smart_ac`
- **Scope:** Fuzzy AHP tabs
- **Boundary:** endpoint lama `dashboard-recap` tidak lagi menjadi owner surface ini

## Panel-by-Panel Mapping

### Historical Overview / Executive KPI / Trend / Mode Mix

**Owner endpoint:** `GET /api/summary/dashboard-analytics`

**Primary FE files:**
- `src/js/services/dashboardAnalyticsService.js`
- `src/js/services/dashboard/historicalAnalyticsSlice.js`
- `src/js/features/dashboard/dashboard.js`
- `src/js/services/dashboardCockpitService.js`
- `src/partials/dashboard/dashboard-cockpit-grid.html`

**Mapping target:**
- `data.executive_kpis` → KPI cards / KPI chips
- `data.historical_trend` → historical trend panel
- `data.mode_mix` → mode mix panel
- `data.insights` → contextual dashboard insights
- `requested_window` + `executed_window` → lightweight metadata / note

**Explicit boundary:**
- analytics endpoint tidak menjadi owner geofence panel utama;
- analytics endpoint tidak menjadi owner marker feed utama.

### Geofence Evidence panel utama

**Owner endpoint:** `GET /api/attendance/geofence-evidence`

**Primary FE files:**
- `src/js/services/geofenceEvidenceService.js`
- `src/js/services/dashboard/geofenceEvidenceSlice.js`
- `src/js/features/dashboard/dashboard.js`
- `src/js/services/dashboardCockpitService.js`
- `src/partials/dashboard/dashboard-cockpit-grid.html`

**Mapping target:**
- `data.status` → status semantic panel
- `data.needs_data` → needs-data state
- `data.reason` → explanatory helper text
- `data.authority` → owner/source label kecil
- `data.final_attendance_authority` → footer/source truth note
- `data.window.from` + `data.window.to` → evidence window text
- `data.raw_counts.total_events` → total events stat
- `data.raw_counts.enter_events` → enter stat
- `data.raw_counts.exit_events` → exit stat
- `data.raw_counts.unique_users` → unique users stat
- `data.operational_context.activity_label` → local title/summary field
- `data.operational_context.activity_note` → descriptive note
- `data.operational_context.enter_context` → enter explanation block
- `data.operational_context.exit_context` → exit explanation block
- `data.operational_context.dashboard_note` → footer note

**Explicit boundary:**
Jika endpoint dedicated kosong/gagal, panel turun ke truthful state. Tidak ada lagi preview-ready path.

### Live Map Hero / Today snapshot

**Owner endpoint:** `GET /api/attendance/today-locations`

**Primary FE files:**
- `src/js/services/todayLocationsService.js`
- `src/js/services/dashboard/liveMapSlice.js`
- `src/js/features/dashboard/dashboard.js`
- `src/js/services/dashboardCockpitService.js`
- `src/partials/dashboard/dashboard-cockpit-grid.html`

**Mapping target:**
- collection rows dari endpoint → marker list utama
- authority/source response → owner note / source note
- row attendance/location fields → marker popup / snapshot item / count summary

**Explicit boundary:**
- map hero tidak lagi memakai `dashboard-analytics.map_context` sebagai jalur utama;
- tidak ada synthetic marker dari preview lama.

### Fuzzy AHP tabs

**Owner endpoints:**
- `GET /api/analysis/fuzzy-ahp/dashboard?type=discipline`
- `GET /api/analysis/fuzzy-ahp/dashboard?type=wfa`
- `GET /api/analysis/fuzzy-ahp/dashboard?type=smart_ac`

**Primary FE files:**
- `src/js/services/fuzzyAhpService.js`
- `src/js/services/dashboard/fahpRecapSlice.js`
- `src/js/features/dashboard/fahpFilterState.js`
- `src/js/features/dashboard/dashboard.js`
- `src/js/services/dashboardCockpitService.js`
- `src/partials/dashboard/dashboard-cockpit-grid.html`

**Mapping target:**
- `data.type` + `data.type_label` → tab identity / heading
- `data.generated_at` + `data.timezone` → updated-at metadata
- `data.requested_window` + `data.executed_window` → window/scope note
- `data.status` + `data.needs_data` → panel state
- `data.consistency.CR` → consistency ratio value
- `data.consistency.threshold` → threshold
- `data.consistency.is_consistent` → badge state
- `data.consistency.summary_label` → summary text
- `data.criteria_weights[]` → criteria weight list/chips/table
- `data.ranking_preview` → ranking block
- `data.distribution` → distribution block / stats / small chart binding

**Explicit boundary:**
- endpoint lama `/analysis/fuzzy-ahp/dashboard-recap` tidak lagi dipakai sebagai source utama;
- preview decision set di cockpit service dihapus dari runtime path.

## Recommended Implementation Strategy by Layer

### 1. Service layer

**Files:**
- `src/js/services/dashboardAnalyticsService.js`
- `src/js/services/geofenceEvidenceService.js`
- `src/js/services/todayLocationsService.js`
- `src/js/services/fuzzyAhpService.js`

**Design decision:**
- Pertahankan tiga service owner yang sudah benar.
- Ubah `fuzzyAhpService` ke endpoint final `/analysis/fuzzy-ahp/dashboard` dengan query `type`.
- Validasi input service hanya menerima tiga type final.
- Jangan menaruh UI logic atau preview fallback di service.

### 2. Slice / view-model layer

**Files:**
- `src/js/services/dashboard/historicalAnalyticsSlice.js`
- `src/js/services/dashboard/geofenceEvidenceSlice.js`
- `src/js/services/dashboard/liveMapSlice.js`
- `src/js/services/dashboard/fahpRecapSlice.js`

**Design decision:**
- Slice menjadi tempat utama normalisasi payload ke bentuk yang dipakai UI existing.
- `historicalAnalyticsSlice` tetap fokus pada KPI/trend/mode mix/insights.
- `geofenceEvidenceSlice` diperkaya supaya semua field geofence panel tersedia dari satu view-model.
- `liveMapSlice` memetakan owner response ke marker/snapshot truth tanpa analytics fallback.
- `fahpRecapSlice` dirombak untuk mengikuti contract final FAHP dashboard.
- Slice boleh menghasilkan default empty structure, tetapi tidak boleh menghasilkan preview-ready state.

### 3. Dashboard orchestration

**Files:**
- `src/js/features/dashboard/dashboard.js`
- `src/js/services/dashboardCockpitService.js`

**Design decision:**
- `dashboard.js` tetap menjadi controller Alpine untuk memuat empat slice paralel.
- `fetchFahpRecap` disesuaikan ke request `type` final.
- Build state helpers (`buildHistoricalSliceState`, dll.) hanya mengembalikan truthful state: `loading`, `ready`, `empty`, `needsData`, `error`.
- `dashboardCockpitService.js` menjadi composer, bukan pemilik data cadangan.
- Preview constants dan runtime preview assembly dihapus dari jalur utama.

### 4. Template/UI layer

**File:**
- `src/partials/dashboard/dashboard-cockpit-grid.html`

**Design decision:**
- Pertahankan layout panel/section existing.
- Ubah binding field, label kecil, note, dan micro-info block sesuai payload owner.
- Tambah/ubah/hapus field kecil diperbolehkan bila perlu agar mengikuti backend truth.
- Untuk backend kosong/minimal, gunakan subtle empty/loading/error/needs-data treatment dengan pattern existing.
- Tidak membuat layout baru, tidak membuat synthetic dashboard content.

### 5. Legacy cleanup boundary

**Files:**
- `src/js/services/reportService.js`
- dashboard-related test files

**Design decision:**
- Audit dependency cockpit ke legacy summary/mock path.
- Dashboard cockpit harus bergantung ke owner services baru, bukan ke mock/legacy summary path untuk geofence/map/FAHP.
- Mock fixture masih boleh tinggal untuk test, tetapi tidak boleh lagi mempengaruhi runtime dashboard utama.

## State Handling Policy

Panel dashboard hanya boleh menggunakan state berikut:

- `loading` → request owner endpoint sedang berjalan
- `ready` → owner response valid dan cukup untuk render
- `empty` → owner response valid tetapi kosong/minimal
- `needsData` → backend eksplisit menyatakan data belum cukup
- `error` → request gagal atau contract invalid

State `preview` atau sukses sintetis tidak lagi menjadi bagian dari runtime policy.

## Dummy / Preview Removal Policy

### Must be removed from runtime primary path
- preview constants di `src/js/services/dashboardCockpitService.js`
- preview geofence success path
- preview FAHP success path
- preview map success path
- owner-crossing fallback yang membuat panel tampil ready tanpa source owner real

### May remain only for test support
- fixture test statis
- regression test helpers
- mock data yang tidak pernah dipakai di runtime dashboard utama

## Testing Strategy

### A. Contract-level / unit mapping tests
Uji service + slice agar payload owner endpoint dimapping benar ke view-model:
- analytics → KPI / trend / mode mix / insights
- geofence → status / counts / operational context / source truth
- live map → marker/snapshot rows
- FAHP → consistency / weights / ranking / distribution

### B. Orchestration tests
Uji `dashboard.js` + `dashboardCockpitService.js` untuk memastikan:
- source owner per panel benar;
- state handling konsisten;
- preview/dummy tidak lagi mengangkat panel menjadi ready.

### C. Runtime UI verification
Jalankan FE dari worktree aktif ini, login dengan kredensial valid saat tersedia, buka dashboard cockpit, lalu buktikan panel memakai source owner real tanpa redesign.

## Runtime Proof Requirements

Evidence minimum yang harus dibuktikan pada runtime verification:

1. Historical overview / recap dashboard melakukan request ke `GET /api/summary/dashboard-analytics` dan panel KPI/trend/mode mix terisi dari source ini.
2. Geofence panel utama melakukan request ke `GET /api/attendance/geofence-evidence` dan tidak lagi turun dari analytics recap context embed.
3. Live map hero melakukan request ke `GET /api/attendance/today-locations` dan marker/snapshot berasal dari endpoint ini.
4. Fuzzy AHP tabs melakukan request terpisah ke tiga endpoint `dashboard?type=...` dan menampilkan data/status per owner tab.
5. Dummy/preview flow lama tidak lagi menjadi source render utama. Jika backend kosong/gagal, panel turun ke truthful empty/needs-data/error state.

## Acceptance Criteria

Task ini dianggap memenuhi desain bila:

1. **No redesign**
   - layout utama cockpit tetap mengikuti desain existing.
2. **Owner endpoint correctness**
   - historical overview ← `dashboard-analytics`
   - geofence panel ← `geofence-evidence`
   - live map ← `today-locations`
   - FAHP tabs ← `fuzzy-ahp/dashboard?type=...`
3. **No backend contract mutation**
   - semua gap diselesaikan di FE mapper/view-model.
4. **No preview as primary source**
   - runtime dashboard tidak lagi menampilkan preview-success path.
5. **UI field truthfulness**
   - field kecil boleh ditambah/ubah/hapus selama pattern visual existing tetap.
6. **State handling discipline**
   - loading / empty / needsData / error tampil rapi dan tidak over-engineered.
7. **Runtime proof available**
   - setelah kredensial tersedia, ada bukti nyata bahwa dashboard memakai real backend source.

## Expected File Impact

Primary implementation files:
- `src/js/services/dashboardAnalyticsService.js`
- `src/js/services/geofenceEvidenceService.js`
- `src/js/services/todayLocationsService.js`
- `src/js/services/fuzzyAhpService.js`
- `src/js/services/dashboard/historicalAnalyticsSlice.js`
- `src/js/services/dashboard/geofenceEvidenceSlice.js`
- `src/js/services/dashboard/liveMapSlice.js`
- `src/js/services/dashboard/fahpRecapSlice.js`
- `src/js/features/dashboard/dashboard.js`
- `src/js/services/dashboardCockpitService.js`
- `src/partials/dashboard/dashboard-cockpit-grid.html`

Possible audit/supporting files:
- `src/js/services/reportService.js`
- dashboard-related `*.test.js`

## Risks and Trade-offs

- Positif: dashboard menjadi truthful terhadap backend dan lebih mudah diaudit per owner endpoint.
- Positif: failure mode menjadi jelas; panel yang belum punya data tidak lagi menyamar sebagai ready.
- Negatif: beberapa panel bisa terlihat lebih “kosong” dibanding preview lama jika backend owner memang minim.
- Negatif: test lama yang mengunci preview contract kemungkinan perlu diubah.
- Negatif: Fuzzy AHP migration berisiko paling tinggi karena contract endpoint owner berubah.

## Verification Status

Runtime proof untuk task ini masih **REQUIRES REPO VERIFICATION** sampai kredensial/login valid diberikan dan jalur verifikasi repo dikunci saat implementasi.

## Docs / ADR Note

**DOCS/ADR UPDATE REQUIRED**

Perubahan ini menyentuh:
- dashboard/reporting responsibility
- source-of-truth behavior across clients
- service/API integration consistency boundary

Update docs/ADR minimal harus menjelaskan bahwa cockpit dashboard sudah dipaksa kembali ke owner-endpoint truth dan preview runtime path tidak lagi menjadi fallback sukses utama.
