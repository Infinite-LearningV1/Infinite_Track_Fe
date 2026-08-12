# GH-66 + GH-67 Dashboard WFA FAHP Contract Sync Design

## Summary

Design ini menggabungkan dua GitHub issue Web FE yang tetap memiliki ownership terpisah tetapi dikerjakan dalam satu bounded worktree/branch:

- **#66** — memperbaiki hierarchy UI FAHP agar runtime status `Error` tidak terlihat seperti tab keempat;
- **#67** — menyinkronkan contract Dashboard WFA FAHP ke endpoint dedicated dengan explicit spatial/date context.

Keduanya berada pada surface yang sama: **Dashboard → Fuzzy AHP Decision Center**. Perubahan tidak boleh berkembang menjadi redesign dashboard atau rewrite orchestration.

## Isolated Delivery Context

- Repository: `Infinite-LearningV1/Infinite_Track_Fe`
- Base: `origin/develop@d0bf4d159f48b13b472d2cbdf7b9ba2ec4d56795`
- Branch: `fix/dashboard-wfa-fahp-contract-sync`
- Worktree: `E:\skrisi\clonefee\Infinite_Track_Fe\.worktrees\dashboard-wfa-fahp-contract-sync`
- GitHub issues: `#66` dan `#67`

Worktree dibuat dari `origin/develop`, menggunakan branch baru, dan `.worktrees/` sudah di-ignore oleh repository.

## Goals

- Menjaga hanya tiga navigation option: `Discipline | WFA | Smart AC` pada semua runtime state.
- Memisahkan runtime status (`loading`, `ready`, `empty`, `needsData`, `backendRequired`, `error`) dari navigation styling.
- Menjadikan `fahpFilterState.type` sebagai satu owner tab selection di dashboard Alpine feature.
- Memindahkan WFA dari generic dashboard recap request ke `GET /api/analysis/fuzzy-ahp/wfa`.
- Membutuhkan explicit `lat`, `lon`, dan `schedule_date` sebelum WFA request dikirim.
- Mempertahankan Backend sebagai source of truth untuk criteria weights, facility evidence, ranking, score, label, dan consistency ratio.
- Menormalkan response WFA ke presentation-facing panel model sebelum template merendernya.
- Menyelaraskan focused tests dengan runtime contract yang benar.

## Non-Goals

- Mengubah Backend API atau FAHP scoring methodology.
- Menggunakan `GET /api/wfa/recommendations` sebagai pengganti analysis endpoint.
- Mengambil authoritative WFA coordinates secara diam-diam dari Live Map, attendance row, atau global state lain.
- Menghitung ulang FAHP/facility score di browser.
- Mengubah business eligibility WFA di Web FE.
- Mendesain ulang dashboard secara luas.
- Menambah global Alpine store untuk WFA.
- Mengganti Alpine.js, service layer, atau static partial architecture.

## Current Repo Evidence

### Current Web FE transport

`src/js/services/fuzzyAhpService.js` saat ini menerima `type` dan mengirim semua type ke:

```text
GET /api/analysis/fuzzy-ahp/dashboard?type=discipline|wfa|smart_ac
```

`src/js/features/dashboard/fahpFilterState.js` hanya memiliki `{ type }`, sehingga belum ada explicit WFA context.

### Current Backend contract

Backend `develop` sekarang memindahkan WFA analysis keluar dari dashboard recap. Request `type=wfa` pada recap dapat menghasilkan:

```text
410 WFA_ANALYSIS_MOVED
Use /api/analysis/fuzzy-ahp/wfa with lat, lon, and schedule_date.
```

Dedicated WFA analysis contract:

```text
GET /api/analysis/fuzzy-ahp/wfa
  ?lat=<number>
  &lon=<number>
  &schedule_date=YYYY-MM-DD
  [&radius_meters=<number>]
```

Backend WFA response `data` berasal dari canonical recommendation pipeline dan memiliki bentuk utama:

```text
{
  candidates: [...],
  searchCriteria: {...},
  methodology: {...}
}
```

Candidate public fields meliputi `place_id`, `name`, `address`, `latitude`, `longitude`, `status`, `distance_meters`, `location_type`, `facility_score`, `facility_confidence`, `facilities`, `final_score`, `final_label`, dan `rank`.

`methodology.criteria_weights` memuat `location_type`, `distance_factor`, `facility_score`, `consistency_ratio`, dan `weighting_method`. `methodology.facility_matrix` memuat metadata matrix facility dan consistency ratio-nya.

### Current UI defect (#66)

Pada non-ready state, `dashboard-cockpit-grid.html` merender navigation dan `panel.stateLabel` di action row yang sama. Secara visual hasilnya dapat terbaca sebagai:

```text
[ Discipline | WFA | Smart AC ] [ Error ]
```

Selain itu, non-ready navigation memakai violet treatment yang berbeda dari ready-state navigation pada `fuzzy-ahp-panel.html`. Ini menciptakan dua visual implementations untuk satu navigation concept.

### Focused baseline

Sebelum feature code berubah, 12 focused FAHP tests menghasilkan **2 pass / 10 fail**. Failures menunjukkan test fixtures lama masih mengharapkan `dashboard-recap` + `category/analysis_type`, sementara production code sudah memakai `/dashboard` + `type`. Ini adalah baseline contract drift yang termasuk scope #67.

## Locked Architecture Decision

Gunakan **Explicit Dashboard Input** untuk WFA. Dashboard tidak boleh menganggap context dari panel lain sebagai input WFA hanya karena data tersebut tersedia.

```text
Dashboard FAHP UI
    ↓ intent
Dashboard Alpine feature
    ├─ fahpFilterState.type
    └─ wfaFahpContext
           ↓
Pure request builder / validator
           ↓
FuzzyAhpService
    ├─ Discipline / Smart AC → dashboard recap endpoint
    └─ WFA → dedicated /analysis/fuzzy-ahp/wfa
           ↓
Contract-specific normalizer / slice
           ↓
Canonical FAHP panel model
           ↓
dashboardCockpitService
           ↓
Stable FAHP partials
```

### State ownership

`dashboard()` tetap primary Alpine feature owner. Tab selection tidak boleh memiliki source of truth kedua di nested panel.

Recommended state split:

```text
fahpFilterState = { type }
wfaFahpContext = { latitude, longitude, scheduleDate, radiusMeters, validationError }
```

WFA-specific input tidak dimasukkan ke global Alpine store.

## Request Contract Design

### Discipline and Smart AC

Tetap menggunakan generic dashboard recap transport dengan `type` sebagai explicit selector. Tidak ada WFA context yang dikirim ke kedua type tersebut.

### WFA

Pure request builder menerima `wfaFahpContext` dan menghasilkan:

```js
{
  lat,
  lon,
  schedule_date,
  ...(radius_meters !== null ? { radius_meters } : {})
}
```

Validation FE hanya menjaga request shape dan obvious input validity:

- latitude dan longitude harus finite numbers;
- `scheduleDate` harus tersedia dalam format tanggal yang dapat dikirim;
- radius hanya dikirim bila user/context owner memang menyediakannya dan nilainya valid.

FE **tidak** menggandakan eligibility decision Backend seperti duplicate booking policy atau final date eligibility. Backend rejection tetap authoritative dan diterjemahkan menjadi truthful error feedback.

Jika required context belum valid:

```text
local validation state
→ tidak ada HTTP request
→ panel tetap non-ready dengan instruction yang jelas
```

Tidak boleh ada default coordinate atau fabricated radius.

## Response Normalization Design

Discipline/Smart AC tetap memakai recap normalizer existing. WFA mendapatkan normalizer khusus karena raw payload-nya berbeda secara struktural.

Recommended boundary:

```text
fahpRecapSlice.js
  → normalize Discipline / Smart AC recap response

wfaFahpSlice.js
  → normalize dedicated WFA analysis response
```

Keduanya harus menghasilkan presentation-facing data yang dapat dikonsumsi `dashboardCockpitService` tanpa template membaca raw Backend fields.

Untuk WFA:

- `methodology.criteria_weights.location_type|distance_factor|facility_score` → criteria rows;
- `methodology.criteria_weights.consistency_ratio` → displayed WFA CR;
- candidates dengan `status === "ranked"` dan valid `rank/final_score` → ranking preview;
- `name`, `address`, `final_label`, `final_score`, `rank` tetap Backend-authored evidence;
- candidate `insufficient_facility_data` tidak dipromosikan menjadi ranked result;
- `facility_enrichment_failed` tidak dipalsukan menjadi success;
- valid response tanpa ranked candidate → `empty` atau `needsData` sesuai evidence yang tersedia;
- malformed 200 response → contract failure, bukan fake `ready`.

Jika Backend tidak memberi consistency threshold / boolean consistency untuk WFA, FE tidak boleh mengarang nilai tersebut. UI harus mampu merender nilai consistency yang unavailable sebagai unavailable, bukan `false` atau `0`.

## UI / Alpine Design (#66)

Navigation identity dan runtime status adalah dua concepts berbeda.

### Stable navigation

Hanya tiga buttons yang menjadi navigation affordance:

```text
Discipline | WFA | Smart AC
```

Ready dan non-ready states harus memakai visual language segmented control yang sama. `fahpFilterState.type` adalah active-tab owner untuk keduanya.

Nested `fuzzy-ahp-panel.html` tidak perlu mempertahankan independent `activeFahpTab` sebagai source of truth. View state dapat mengikuti selection milik dashboard owner.

### Separate status presentation

`panel.stateLabel` tetap boleh tampil, tetapi harus berada di supporting/status presentation yang terpisah secara visual dan semantik dari `<nav>`.

```text
[ Discipline | WFA | Smart AC ]
Status: Error
```

atau layout responsif ekuivalen yang menjaga status tidak clickable dan tidak menyerupai tab keempat.

Runtime semantics tidak berubah: request failure tetap `panel.state = "error"`. Issue #66 hanya memperbaiki hierarchy/style dan single selection ownership.

## Explicit WFA Context UX

Ketika WFA dipilih, dashboard menampilkan bounded context input untuk analysis. Minimum interaction:

- explicit location selection yang menghasilkan latitude/longitude;
- schedule date;
- optional radius hanya bila surface memang mengeksposkannya.

Lokasi dapat menggunakan/reuse picker pattern existing repository, tetapi selection harus dilakukan sebagai **explicit WFA input**. Membaca marker/current-context Live Map secara otomatis tidak diterima sebagai substitute.

Context tidak harus mengubah layout dashboard secara besar. Ia dapat hidup sebagai compact supporting block pada FAHP panel ketika `type === "wfa"`.

Interaction sequence:

```text
select WFA
→ show context requirement
→ user selects explicit location + schedule date
→ validate request shape
→ load dedicated WFA analysis
→ normalize result
→ render panel
```

Mengganti tab ke Discipline/Smart AC tidak menghapus WFA context secara otomatis; context dapat dipertahankan selama lifecycle dashboard page agar kembali ke WFA tidak memaksa input ulang. Context tersebut tetap local page state, bukan persistent/global business truth.

## Error Handling

Error ownership tetap berlapis:

```text
invalid/missing WFA context
→ request builder validation
→ no transport
→ instructional/non-ready panel state

HTTP/auth/provider/backend eligibility failure
→ service error
→ dashboard FAHP error state
→ separate status/error feedback

valid 200 + insufficient facility evidence
→ WFA normalizer
→ needsData/empty semantics
→ no fabricated ranking

valid 200 + malformed contract
→ contract normalization failure
→ error state
→ no fake ready data
```

Auth/session behavior tetap mengikuti `authRequest` dan existing auth runtime classification. Tidak ada special WFA auth path.

Error message boleh membantu operator memahami failure, tetapi UI tidak boleh mengekspos raw stack, API key, provider secret, atau sensitive response internals.

## File Responsibility Map

Existing files expected to change:

- `src/js/services/fuzzyAhpService.js` — split generic recap transport from dedicated WFA transport.
- `src/js/features/dashboard/fahpFilterState.js` — keep tab selector contract explicit; do not hide WFA context inside legacy generic params.
- `src/js/features/dashboard/dashboard.js` — own WFA context, orchestration, loading/error application, and one active tab state.
- `src/js/services/dashboard/fahpRecapSlice.js` — remain recap normalizer for Discipline/Smart AC.
- `src/js/services/dashboardCockpitService.js` — consume normalized FAHP source and preserve truthful panel states.
- `src/js/components/fuzzyAhpPanel.js` — support unavailable consistency metadata without coercing it to false/zero.
- `src/partials/dashboard/dashboard-cockpit-grid.html` — stable non-ready navigation + separate status + WFA context surface.
- `src/partials/dashboard/fuzzy-ahp-panel.html` — ready panel follows dashboard-owned active type and stable navigation language.

Focused new files are preferred where they make ownership clearer:

- `src/js/features/dashboard/wfaFahpContext.js` — pure WFA context factory/validation/request builder.
- `src/js/services/dashboard/wfaFahpSlice.js` — dedicated WFA response normalizer/slice.

No unrelated extraction from the large `dashboard.js` is part of this change. New focused modules should keep added contract logic out of that orchestration file.

## Dependency Direction

```text
partials → dashboard Alpine feature → pure context/request builder → FuzzyAhpService → authRequest
API response → contract-specific slice → cockpit panel model → partials
```

Template tidak boleh memanggil service langsung atau membaca raw snake_case response fields.

## Testing Strategy

Implementation harus TDD pada contract boundaries sebelum wiring UI.

Required focused evidence:

- generic service sends Discipline/Smart AC to `/analysis/fuzzy-ahp/dashboard` with valid `type` only;
- WFA service sends `/analysis/fuzzy-ahp/wfa` with `lat`, `lon`, `schedule_date`, dan optional intentional `radius_meters`;
- incomplete WFA context blocks transport;
- no code path sends legacy dashboard `type=wfa` request;
- WFA normalizer maps canonical criteria weights and ranked candidates;
- insufficient/enrichment-failed candidates do not become ranked success;
- malformed WFA payload cannot create ready state;
- missing consistency threshold is displayed as unavailable rather than false/zero;
- error/non-ready surface renders exactly three tab buttons;
- `Error` appears as status feedback outside navigation;
- active tab styling is stable across ready/non-ready states;
- existing Discipline/Smart AC behavior remains green;
- focused dashboard orchestration/template regression tests pass;
- `npm run build` passes.

Full-repo `node --test` remains a release/regression evidence step. Existing unrelated baseline failures must be compared by count/name rather than silently attributed to this change.

## Acceptance Criteria

### #66 UI

- FAHP navigation memiliki tepat tiga options: Discipline, WFA, Smart AC.
- Ready/non-ready navigation mengikuti segmented-control visual language yang sama.
- `Error` dan state labels lain tidak berada di dalam navigation affordance.
- Runtime state semantics tidak berubah demi styling.
- Active type memiliki satu owner pada dashboard feature state.

### #67 Contract

- WFA tidak lagi dikirim melalui generic dashboard `type=wfa` request.
- WFA membutuhkan explicit location coordinates dan schedule date.
- WFA memakai dedicated `/analysis/fuzzy-ahp/wfa` endpoint.
- Discipline dan Smart AC tetap menggunakan dashboard recap endpoint.
- WFA response dinormalisasi sebelum cockpit/template consumption.
- Backend-authored ranking/score/facility evidence tidak direcompute di FE.
- Missing/invalid context, transport failure, insufficient evidence, dan malformed contract memiliki semantics yang berbeda dan truthful.
- Stale focused tests diselaraskan ke current runtime contract.

## Delivery Boundary

Satu branch/worktree boleh menutup dua issue karena keduanya menyentuh satu FAHP dashboard surface, tetapi commit history harus tetap reviewable. Suggested sequence: contract tests/boundary, WFA normalizer/orchestration, lalu UI hierarchy regression.

Tidak ada push atau PR dalam design phase ini kecuali diminta eksplisit.
