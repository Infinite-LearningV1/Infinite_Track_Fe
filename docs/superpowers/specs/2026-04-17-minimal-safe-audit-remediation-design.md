# Minimal Safe Audit Remediation Design

## Summary

Turunkan risiko dependency vulnerability pada Web FE Infinite Track dengan pendekatan **minimal aman**: hanya memperbaiki direct dependency yang benar-benar dipakai di source app dan punya jalur update yang masuk akal tanpa membuka breaking change besar.

## Goal

1. Mengurangi temuan audit pada dependency aplikasi yang benar-benar dipakai saat runtime/build aplikasi.
2. Membatasi perubahan hanya pada package yang bisa diperbarui secara aman dan terarah.
3. Memastikan repo tetap installable dan buildable setelah remediation.
4. Mencatat risiko sisa yang belum bisa diperbaiki secara aman di fase ini.

## Non-Goals

- Menyelesaikan seluruh output `npm audit` sekaligus.
- Menangani transitive/build-chain vulnerability di luar direct dependency aplikasi utama.
- Menjalankan `npm audit fix --force`.
- Mengganti library besar atau melakukan refactor fitur export/report secara luas.
- Menyentuh dependency yang belum terbukti dipakai di source app pada fase ini.

## Context

Audit yang diberikan user menunjukkan campuran vulnerability pada direct dependency, transitive dependency, build tooling, dan package tanpa fix upstream. Scope yang dipilih user adalah **minimal aman**, sehingga remediation harus fokus pada dependency yang memenuhi semua kriteria berikut:

- direct dependency repo,
- benar-benar dipakai di source app,
- memiliki jalur update yang tidak mengharuskan breaking change besar.

Hasil eksplorasi source usage saat ini:

- `axios` dipakai langsung di service layer:
  - `src/js/services/authService.js`
  - `src/js/services/userService.js`
  - `src/js/services/bookingService.js`
  - `src/js/services/attendanceService.js`
  - `src/js/services/reportService.js`
- `jspdf` dan `jspdf-autotable` dipakai langsung di `src/js/utils/reportGenerator.js`.
- `xlsx` dipakai langsung di `src/js/utils/reportGenerator.js`, tetapi audit menyatakan **no fix available**.
- `swiper` ada sebagai direct dependency, tetapi belum terbukti dipakai di source yang diaudit saat eksplorasi ini.

## Evidence Snapshot

### FAKTA

- `package.json` memuat direct dependency berikut yang relevan ke audit dan remediation minimal aman:
  - `axios`
  - `jspdf`
  - `jspdf-autotable`
  - `xlsx`
  - `swiper`
- **Pre-change snapshot** dari `npm ls` saat eksplorasi awal menunjukkan versi terpasang yang relevan:
  - `axios@1.10.0`
  - `jspdf@3.0.1`
  - `jspdf-autotable@5.0.2`
  - `xlsx@0.18.5`
  - `swiper@11.2.10`
  - `webpack@5.99.9`
  - `glob@11.0.3`
  - `dompurify@3.2.6` (via `jspdf`)
- Runtime smoke validation sebelumnya sudah sukses pada Node `v24.12.0` untuk `npm install` dan `npm run build`.

### ASUMSI

- Update patch/minor pada `axios` masih kompatibel dengan pola pemakaian service layer saat ini.
- Update `jspdf`/`jspdf-autotable` masih bisa dipertahankan tanpa mengubah arsitektur fitur export report, asalkan import/API yang dipakai sekarang masih kompatibel.
- Fase ini tidak perlu menyelesaikan seluruh chain vulnerability dari tooling seperti webpack/transitive parser packages.

### NEEDS-VERIFICATION

- Versi aman target untuk `axios`, `jspdf`, dan `jspdf-autotable` yang tetap kompatibel dengan source saat ini.
- Apakah update `jspdf`/`jspdf-autotable` memerlukan penyesuaian kecil pada `reportGenerator.js`.
- Apakah `npm audit` setelah remediation benar-benar menurunkan temuan untuk package target.

## Design Decision

Pakai pendekatan **manual targeted remediation** pada direct dependency yang dipakai nyata di source app.

Artinya:

- Update dependency dilakukan satu per satu atau dalam kelompok kecil yang saling terkait.
- Dependency yang tidak punya fix upstream atau belum jelas usage-nya tidak disentuh pada fase ini.
- Setiap perubahan harus dibuktikan lewat install/build dan source compatibility check.

## Planned Changes

### 1. Patch `axios` manually

`axios` dipakai luas di service layer dan menjadi kandidat remediation paling jelas.

**Affected files:**

- `package.json`
- local install metadata / lockfile state (non-committed repo artifact)
- source verification target:
  - `src/js/services/authService.js`
  - `src/js/services/userService.js`
  - `src/js/services/bookingService.js`
  - `src/js/services/attendanceService.js`
  - `src/js/services/reportService.js`

**Rule:**

- Naikkan `axios` ke versi aman terbaru yang masih masuk akal untuk pemakaian saat ini.
- Jangan refactor service layer kecuali update package benar-benar memaksa perubahan kecil yang jelas.

### 2. Patch `jspdf` and `jspdf-autotable` together

Kedua package ini dipakai bersamaan di generator export report, jadi remediation harus diperlakukan sebagai pasangan yang terkoordinasi.

**Affected files:**

- `package.json`
- local install metadata / lockfile state (non-committed repo artifact)
- source verification target:
  - `src/js/utils/reportGenerator.js`

**Rule:**

- Upgrade `jspdf` dan `jspdf-autotable` bersama agar contract kompatibilitas tetap sinkron.
- Jika import atau pemanggilan API yang sekarang dipakai berubah, lakukan penyesuaian minimal hanya di `reportGenerator.js`.
- Jangan memperluas perubahan ke fitur report lain di luar yang dibutuhkan untuk tetap buildable/correct.

### 3. Carry `xlsx` as a documented residual risk

`xlsx` dipakai nyata di source, tetapi audit menyatakan **no fix available**.

**Affected artifacts:**

- Tidak harus ada code change pada fase ini.
- Harus muncul jelas dalam hasil/verifikasi/follow-up note.

**Rule:**

- Jangan memaksa upgrade atau replacement library pada fase minimal aman ini.
- Catat `xlsx` sebagai residual risk yang belum bisa diselesaikan melalui patch version update.
- Sertakan arah mitigasi lanjutan: evaluasi replacement library atau isolasi fitur export Excel di fase terpisah jika risk posture mengharuskan.

### 4. Leave `swiper` and non-app audit findings out of scope

`swiper` belum terbukti dipakai di source yang diaudit saat ini, dan sebagian besar temuan lain berasal dari transitive/build-chain scope.

**Rule:**

- Jangan sentuh `swiper` pada fase ini.
- Jangan patch transitive/build-tool vulnerabilities pada fase minimal aman.
- Bila nanti ingin ditangani, buat fase remediation terpisah dengan scope dan risk review sendiri.

## Verification Plan

### Required verification

1. Jalankan install setelah update dependency target.
2. Jalankan `npm run build`.
3. Cek source compatibility pada:
   - service layer untuk `axios`
   - `src/js/utils/reportGenerator.js` untuk `jspdf` / `jspdf-autotable`
4. Lakukan smoke test cepat pada flow export PDF / `reportGenerator` bila perubahan dependency PDF sudah masuk.
5. Jalankan `npm audit` lagi untuk mengonfirmasi apakah temuan pada package target turun.

### Success criteria

- `axios` berhasil diperbarui ke versi yang aman/lebih aman tanpa memecahkan service layer.
- `jspdf` dan `jspdf-autotable` berhasil diperbarui dengan source compatibility tetap terjaga.
- `npm install` dan `npm run build` tetap sukses.
- Temuan audit pada package target berkurang.
- `xlsx` dicatat eksplisit sebagai residual risk, bukan diam-diam diabaikan.

## Implementation Boundaries

### In scope

- Update dependency range/lockfile untuk `axios`.
- Update dependency range/lockfile untuk `jspdf` dan `jspdf-autotable`.
- Penyesuaian minimal pada `reportGenerator.js` jika update package memerlukannya.
- Verifikasi install/build/audit pada package target.
- Dokumentasi hasil residual risk untuk `xlsx`.

### Out of scope

- Upgrade `xlsx` ke replacement library.
- Investigasi mendalam atau removal `swiper`.
- Remediation transitive/build-chain vulnerabilities.
- Mass package refresh.
- Refactor besar pada feature modules atau export/report architecture.

## Risks and Mitigations

### Risk 1: Update package introduces subtle behavior drift

Patch/minor update bisa mengubah perilaku runtime walaupun build tetap lolos.

**Mitigation:**
Batasi perubahan pada package target, cek source usage utama, dan validasi build setelah tiap langkah remediation yang berarti.

### Risk 2: `jspdf` ecosystem compatibility mismatch

`jspdf` dan `jspdf-autotable` sering punya coupling versi.

**Mitigation:**
Upgrade keduanya bersama dan verifikasi import/API di `reportGenerator.js` secara eksplisit.

### Risk 3: Audit remains red because of `xlsx` and out-of-scope findings

Walau remediation minimal aman berhasil, `npm audit` tidak akan menjadi nol karena ada temuan no-fix dan temuan di luar scope.

**Mitigation:**
Jelaskan sejak awal bahwa tujuan fase ini adalah menurunkan risk pada package app yang paling nyata, bukan membersihkan seluruh audit report.

## Expected Deliverables

1. Dependency update terarah untuk `axios`.
2. Dependency update terarah untuk `jspdf` + `jspdf-autotable`.
3. Penyesuaian source minimal hanya jika diperlukan oleh update package.
4. Bukti `npm install` dan `npm run build` tetap sukses.
5. Audit delta yang menunjukkan mana temuan yang turun.
6. Catatan residual risk untuk `xlsx` dan item lain yang sengaja di luar scope fase ini.

## Residual Risk Note

- `xlsx` remains in use at `src/js/utils/reportGenerator.js` for Excel export.
- Current audit data reports no upstream fix available for the known advisory set affecting `xlsx`.
- This remediation intentionally leaves `xlsx` unchanged in the minimal-safe phase.
- Recommended follow-up: evaluate a replacement/export strategy in a separate scoped remediation if the project’s risk posture requires eliminating this dependency.
