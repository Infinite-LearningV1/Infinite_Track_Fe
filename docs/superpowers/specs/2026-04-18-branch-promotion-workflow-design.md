# Branch Promotion Workflow Design

## Summary
Ganti aturan git workflow repo menjadi model branch promotion yang jelas: semua pekerjaan dimulai dari `feature/*` atau `fix/*`, semua change branch masuk ke `develop` hanya lewat PR review wajib, lalu `master` hanya menerima promote terkontrol dari `develop` saat state sudah benar-benar clean dan siap deploy.

## Goal
1. Menjadikan `feature/*` sebagai tempat kerja untuk setiap case/perubahan baru.
2. Menjadikan `develop` sebagai branch integrasi yang menahan perubahan sebelum release.
3. Menjadikan `master` sebagai branch final yang paling stabil dan siap deploy.
4. Menghilangkan ambiguity tentang kapan perubahan boleh masuk `develop` dan kapan `master` boleh di-update.

## Non-Goals
- Mengubah isi code fitur aplikasi.
- Mendesain ulang CI/CD secara detail di fase ini.
- Menentukan strategi hotfix/rollback production secara penuh.
- Menetapkan automation teknis spesifik jika belum ada infrastrukturnya.

## Context
State repo saat ini sudah memiliki branch penting berikut:
- `develop`
- `master`
- beberapa branch `feature/*`
- branch lain seperti `deploy` masih ada di remote topology

Namun user menegaskan bahwa strategi kerja yang diinginkan ke depan adalah:
- setiap case harus dibuat di branch baru,
- hasil kerja tidak langsung dianggap final saat masuk `develop`,
- `master` harus menjadi branch terakhir yang paling bersih, paling stabil, dan siap deploy.

User juga menegaskan bahwa merge ke `develop` harus memakai **PR review wajib**.

## Evidence Snapshot
### FAKTA
- Branch aktif dan remote topology menunjukkan `develop` saat ini menjadi HEAD branch remote origin.
- Repo memiliki `master` dan `develop` secara paralel.
- Sudah ada kebiasaan memakai branch feature lokal, tetapi aturan promotion belum diposisikan sebagai workflow resmi tunggal.

### ASUMSI
- `master` akan diperlakukan sebagai branch deployable/release-ready utama.
- `develop` tetap dipakai sebagai branch integrasi aktif, bukan dihapus.
- Workflow baru harus memprioritaskan kejelasan proses dibanding fleksibilitas ad-hoc.

### NEEDS-VERIFICATION
- Dokumen mana saja di repo yang saat ini menjelaskan workflow lama atau tidak lengkap.
- Apakah branch `deploy` masih dipakai nyata atau hanya sisa topology lama.
- Apakah perlu menambah aturan proteksi branch di dokumentasi meski implementasi teknisnya mungkin dilakukan terpisah.

## Design Decision
Pakai pendekatan **simple promotion flow with explicit release gate**.

Artinya:
- Semua implementasi dimulai dari `feature/*` atau `fix/*`.
- `develop` adalah branch integrasi hasil PR review wajib.
- `master` adalah branch hasil promote sadar dari `develop`, bukan tempat kerja langsung.
- Promote ke `master` harus melewati gate release minimum.

## Branch Roles

### 1. `feature/*` dan `fix/*`
Peran branch feature/fix adalah workspace untuk setiap case/perubahan individual.

**Rules:**
- Setiap pekerjaan baru harus dibuat dari branch baru, biasanya `feature/*` untuk feature work atau `fix/*` untuk bugfix/urgent work.
- Tidak boleh mengerjakan case langsung di `develop`.
- Tidak boleh mengerjakan case langsung di `master`.
- Branch feature/fix adalah tempat implementasi, eksperimen terkontrol, dan penyelesaian per case sebelum diajukan ke review.

### 2. `develop`
Peran `develop` adalah branch integrasi tempat perubahan ditahan sebelum release final.

**Rules:**
- Semua feature branch masuk ke `develop` hanya lewat PR.
- PR ke `develop` wajib melalui review.
- `develop` boleh berisi kumpulan perubahan yang sudah lolos review tetapi belum final untuk deploy.
- `develop` bukan branch release final.

### 3. `master`
Peran `master` adalah branch final yang paling stabil dan siap deploy.

**Rules:**
- `master` tidak menerima kerja feature langsung.
- `master` tidak menjadi tempat eksperimen atau integrasi bertahap.
- `master` hanya di-update dari `develop` ketika state `develop` sudah dianggap release-ready.
- Branch ini adalah source of truth deploy/release.

## Promotion Rules

### Feature/Fix → Develop
**Required path:**
- Kerja di `feature/*` atau `fix/*`
- Buat PR ke `develop`
- Jalani review wajib
- Setelah lolos, baru merge ke `develop`

**Not allowed:**
- Direct push kerja feature/fix ke `develop`
- Direct merge tanpa review sebagai jalur normal
- Kerja case langsung di `develop`

### Develop → Master
**Required path:**
- `develop` hanya dipromote ke `master` saat siap release
- Promote dilakukan sebagai keputusan sadar, bukan efek samping merge feature
- `master` menerima snapshot `develop` yang sudah dipilih sebagai state final

**Not allowed:**
- Feature branch langsung merge ke `master`
- Kerja harian langsung di `master`
- Menjadikan `master` sebagai branch integrasi aktif

## Release Gate for Promote to `master`
Promote dari `develop` ke `master` hanya boleh dilakukan ketika semua syarat minimum berikut terpenuhi:

1. **Review completeness**
   - perubahan penting di `develop` sudah melalui review
   - tidak ada issue penting yang sengaja dibiarkan terbuka untuk release sekarang

2. **Verification minimum passes**
   - install/build minimum lulus
   - verifikasi tambahan untuk perubahan sensitif sudah dilakukan sesuai konteks perubahan

3. **Release readiness judgment**
   - state di `develop` sudah cukup bersih dan stabil untuk dianggap kandidat deploy
   - tidak ada known issue penting yang membuat snapshot itu belum layak dinaikkan ke branch final

4. **Controlled promotion**
   - update ke `master` dilakukan sebagai langkah release yang disengaja
   - bukan hasil merge otomatis dari aktivitas feature sehari-hari

## Operational Rules
- Jika sebuah case belum siap direview, tetap tinggal di branch feature.
- Jika sebuah case sudah lolos review tapi kumpulan perubahan belum siap rilis, tetap tinggal di `develop`.
- Jika snapshot `develop` sudah lolos gate release minimum, barulah promote ke `master`.
- Deploy hanya mengambil branch final (`master`), bukan branch feature atau `develop`.

## Documentation / Policy Changes Expected
Workflow baru ini harus menggantikan rule lama atau rule implisit yang membingungkan. Implementasi dokumentasinya nanti minimal harus:
- menyatakan branch role masing-masing secara eksplisit,
- menjelaskan jalur merge resmi,
- menjelaskan bahwa `master` adalah branch final deployable,
- menjelaskan bahwa PR review ke `develop` bersifat wajib.

## Risks and Mitigations
### Risk 1: Team keeps treating `develop` as a casual working branch
Jika aturan hanya diucapkan tapi tidak ditulis jelas, orang akan kembali kerja langsung di `develop`.

**Mitigation:**
Tuliskan rule eksplisit bahwa semua case harus dimulai dari `feature/*` dan masuk ke `develop` via PR review wajib.

### Risk 2: `master` still gets used for direct fixes
Tanpa batas eksplisit, branch final sering kembali dipakai sebagai tempat patch cepat.

**Mitigation:**
Dokumentasikan bahwa `master` hanya menerima promote dari `develop` sebagai jalur normal release.

### Risk 3: `develop` promoted too early
Kalau gate release tidak jelas, `master` bisa tetap menerima snapshot yang belum bersih.

**Mitigation:**
Tetapkan gate minimum: review selesai, verification minimum lulus, dan release readiness disetujui secara sadar.

## Expected Deliverables
1. Definisi resmi branch role untuk `feature/*`, `fix/*`, `develop`, dan `master`.
2. Jalur merge resmi `feature/*` / `fix/*` → `develop` → `master`.
3. Aturan review wajib untuk merge ke `develop`.
4. Gate minimum untuk promote dari `develop` ke `master`.
5. Dasar dokumentasi/rule update agar workflow baru bisa diadopsi konsisten di repo.
