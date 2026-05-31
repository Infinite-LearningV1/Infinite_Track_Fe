# Working Tree Stream Separation Design

## Summary

Pisahkan current Web FE working tree yang kotor menjadi beberapa stream review yang jelas sebelum ada branch deploy/promotion. Desain ini memperlakukan branch aktif yang stale sebagai **salvage source**, bukan baseline release, lalu membangun stream baru dari `develop` agar perubahan runtime, env/deploy truth, dan governance tidak lagi bercampur.

## Goal

1. Menyelamatkan perubahan aktif yang sudah terpetakan tanpa kehilangan intent.
2. Menghentikan penggunaan `feature/branch-governance-only` sebagai baseline promotion.
3. Memecah perubahan menjadi stream review yang koheren dan bisa diverifikasi terpisah.
4. Mencegah branch deploy/promotion dibuat sebelum runtime truth, env/deploy truth, dan build/deploy governance cukup jelas.

## Non-Goals

- Menentukan command git operasional final untuk setiap langkah.
- Menganggap build success sebagai bukti release readiness.
- Menyelesaikan verification eksternal yang tidak bisa dibuktikan dari repo.
- Memaksa semua docs/governance artifact ikut jalur deploy.

## Context

Audit repo menunjukkan bahwa branch aktif `feature/branch-governance-only` sudah stale terhadap `develop`, punya dirty working tree lokal, dan scope-nya bercampur antara governance/build docs dengan perubahan runtime dashboard serta env/deploy truth.

Dirty changes aktif yang sudah teridentifikasi:
- `.env.example`
- `env.example.txt`
- `.env.production.example` (untracked)
- `src/js/features/dashboard/dashboard.js`
- `src/js/services/reportService.js`
- `src/partials/table/table-dashboard-report.html`

Committed branch diff terhadap `develop` juga sudah membawa cluster lain:
- `.github/workflows/build.yml`
- `DEPLOYMENT.md`
- `DEPLOYMENT-CHECKLIST.md`
- governance/docs artifacts lain

## Current-State Findings

### 1. Baseline branch tidak trustworthy untuk promotion
- `feature/branch-governance-only` tertinggal dari `develop` dan tidak boleh diperlakukan sebagai source branch promotion.
- Branch ini juga punya dirty tree lokal, sehingga baseline branch dan local state sama-sama tidak bersih.

### 2. Ada stream runtime aktif yang belum konsisten
- `src/js/features/dashboard/dashboard.js` sudah bergerak ke jalur server-driven untuk report search/sort/pagination.
- `src/js/services/reportService.js` belum meneruskan semua query yang dibutuhkan jalur baru, terutama `sortBy` dan `sortOrder`.
- `src/partials/table/table-dashboard-report.html` punya mismatch konkret antara header kolom dan field body yang dirender.

### 3. Env/deploy truth masih ambigu
- `.env.example` sudah bergerak ke local-first template.
- `.env.production.example` mengarah ke public-safe production contract.
- `env.example.txt` masih berpotensi dibaca sebagai source-of-truth yang bertabrakan bila tidak ditegaskan perannya.

### 4. Docs/governance dan deploy/build truth tercampur
- Branch-level diff membawa governance artifacts, build workflow, dan deployment docs secara bersamaan.
- Ini meningkatkan promotion risk karena review evidence menjadi tidak fokus.

## Design Decision

Gunakan model **salvage → re-baseline → split-by-stream**.

Artinya:
- branch lama dipakai hanya untuk menyelamatkan perubahan yang sudah ada,
- baseline baru selalu lahir dari `develop`,
- perubahan dipindahkan ke stream baru berdasarkan boundary review,
- branch deploy/promotion tidak boleh dibuat sebelum stream yang relevan lulus gate masing-masing.

## Topology

### Layer A — Salvage Layer
- **Branch:** `feature/branch-governance-only`
- **Peran:** sumber penyelamatan perubahan lama
- **Aturan:** bukan tempat kerja aktif baru dan bukan candidate promotion

### Layer B — Clean Baseline Layer
- **Source:** `develop`
- **Peran:** baseline tunggal untuk melahirkan stream baru
- **Aturan:** tidak membawa dirty state lama secara langsung

### Layer C — Stream Execution Layer
Dari baseline baru, buat stream execution terpisah:

1. **Dashboard / Reporting Runtime Stream**
   - `src/js/features/dashboard/dashboard.js`
   - `src/js/services/reportService.js`
   - `src/partials/table/table-dashboard-report.html`

2. **Env / Deploy Truth Stream**
   - `.env.example`
   - `.env.production.example`
   - `env.example.txt`

3. **Build / Deploy Governance Stream**
   - `.github/workflows/build.yml`
   - `DEPLOYMENT.md`
   - `DEPLOYMENT-CHECKLIST.md`
   - `.gitignore` bila memang terkait

### Layer D — Parked / Support Layer
- `.claude/skills/**`
- `AGENTS.md`
- `README.md`
- `docs/**` governance/support artifacts

Layer ini tidak ikut jalur deploy/promotion sampai ada alasan eksplisit.

## Salvage Strategy

### Recommended default
Pakai **temporary WIP checkpoint** di branch salvage sebagai pembekuan state teknis tunggal.

### Rules
1. Checkpoint ini hanya untuk membekukan dirty state sekarang.
2. Checkpoint ini bukan commit review-ready dan bukan calon promotion.
3. Setelah checkpoint dibuat, branch salvage diperlakukan sebagai **read-only source**.
4. Perubahan dipindahkan ke stream baru **per stream**, bukan dengan membawa semua state lama sekaligus.

### Fallback
Kalau ada file yang terlalu bercampur dan tidak aman ditarik langsung ke stream target, gunakan patch/export granular hanya untuk file atau cluster itu. Patch bukan default; patch adalah fallback untuk kasus yang benar-benar kusut.

## Stream Split Order

### Wave 1 — Dashboard / Reporting Runtime
Kerjakan lebih dulu karena ini stream yang paling dekat ke release behavior dan sudah punya mismatch konkret.

**Target hasil:**
- jalur server-driven final jelas,
- sort contract sinkron,
- tabel report konsisten,
- duplikasi handler yang membingungkan tidak tersisa.

### Wave 2 — Env / Deploy Truth
Kerjakan setelah Wave 1 supaya deploy/env truth tidak mendahului runtime behavior yang belum settled.

**Target hasil:**
- satu template local/dev yang jelas,
- satu template production/public-safe yang jelas,
- file support lain tidak lagi ambigu.

### Wave 3 — Build / Deploy Governance
Kerjakan setelah env/deploy truth lebih stabil.

**Target hasil:**
- workflow build direview sebagai process gate,
- deployment docs/checklist konsisten dengan branch model dan deploy truth yang aktual.

### Wave 4 — Governance / Docs Support
Park atau kerjakan paling akhir karena tidak memblokir runtime readiness.

## Verification Gates

### Gate A — Exit gate setelah Wave 1
Wajib benar sebelum lanjut ke Wave 2:
- mismatch runtime yang sudah terbukti harus hilang,
- sort flow tidak boleh hanya hidup di UI state,
- service layer harus sinkron dengan request contract yang dipakai,
- header/body tabel report harus konsisten,
- build repo tetap lolos.

Jika backend contract belum bisa dibuktikan penuh dari repo, hasil wave harus jujur ditandai `REQUIRES REPO VERIFICATION`.

### Gate B — Exit gate setelah Wave 2
Wajib jelas sebelum lanjut ke Wave 3:
- ada keputusan eksplisit mana template local/dev,
- ada keputusan eksplisit mana template production/public-safe,
- file env support lain tidak lagi punya peran ambigu.

Jika production proxy/runtime actual belum bisa dibuktikan dari repo, hasil wave tetap harus ditandai `REQUIRES REPO VERIFICATION`.

### Gate C — Exit gate setelah Wave 3
Wajib cukup jelas sebelum deploy/promotion dipikirkan:
- workflow build konsisten dengan branch model,
- deployment docs/checklist tidak mengklaim lebih dari evidence repo,
- kebutuhan verifikasi eksternal ditulis eksplisit.

Jika branch protection, source branch hosting, atau enforcement GitHub UI belum terkonfirmasi, jangan sebut jalur promotion aman penuh.

### Gate D — Pre-promotion gate
Branch deploy/promotion baru boleh dipertimbangkan jika:
- baseline berasal dari `develop` atau baseline bersih yang disepakati,
- stream runtime aktif tidak lagi punya mismatch yang diketahui,
- stream env/deploy truth sudah canonical,
- stream build/deploy governance sudah direview terpisah,
- support/governance docs tidak ikut mencemari candidate deploy branch.

## Success Criteria

Desain ini dianggap berhasil jika menghasilkan kondisi berikut:
- branch lama hanya berperan sebagai salvage source,
- stream runtime, env/deploy truth, dan build/deploy governance tidak lagi bercampur,
- urutan kerja mengikuti prioritas release behavior lebih dulu,
- branch deploy/promotion tidak dibuat sebelum stream yang relevan lulus gate masing-masing.

## Risks and Guardrails

### Risks
- stash besar atau reset dini bisa mengaburkan boundary stream,
- rebuild manual penuh bisa kehilangan nuance perubahan aktif,
- docs/governance bisa kembali mencemari jalur deploy jika stream support tidak diparkir dengan tegas.

### Guardrails
- jangan cut deploy/promotion branch dari `feature/branch-governance-only`,
- jangan anggap dirty tree ini sekadar noise,
- jangan memakai build success sebagai bukti promotion readiness,
- jangan lanjut ke wave berikutnya jika gate wave sekarang belum cukup jelas.

## Open Verification Items

- `REQUIRES REPO VERIFICATION` untuk kontrak backend `sortBy` / `sortOrder`.
- `REQUIRES REPO VERIFICATION` untuk source-of-truth template env production yang benar-benar dipakai operator.
- `REQUIRES REPO VERIFICATION` untuk apakah production runtime mengandalkan `/api` proxy atau backend public URL eksplisit.
- `REQUIRES REPO VERIFICATION` untuk branch protection / ruleset GitHub / hosting source branch.

## Final Decision Rule

Jangan gunakan bahasa “repo sudah bersih” sebagai sinyal siap promotion.

Bahasa keputusan yang benar adalah:

> **Working tree sudah cukup terpetakan, terpisah, dan diverifikasi untuk mulai menyiapkan jalur deploy/promotion.**
