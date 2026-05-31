# Node 20 Runtime Upgrade Design

## Summary

Upgrade Web FE Infinite Track ke contract runtime **Node.js 20+** yang eksplisit dan konsisten di seluruh repo, dengan pendekatan **selective dependency cleanup**: runtime surfaces diselaraskan ke baseline Node 20+, sementara dependency hanya diubah jika memang diperlukan agar install/build berjalan stabil di runtime aktif yang memenuhi batas minimum tersebut.

## Goal

1. Menjadikan target runtime repo eksplisit: `>=20`.
2. Menyelaraskan surface runtime utama: local tooling, package metadata, Docker example, dan dokumentasi deploy/runtime.
3. Memastikan install dan build berhasil pada runtime aktif `>=20`.
4. Membatasi perubahan dependency hanya pada package yang benar-benar perlu untuk kompatibilitas Node 20+.

## Non-Goals

- Melakukan full dependency refresh.
- Mengubah behavior aplikasi, page flow, atau contract UI/backend.
- Mengganti build system dari webpack ke tool lain.
- Menambahkan refactor di luar kebutuhan runtime/build compatibility.

## Context

Repo ini adalah Web FE dashboard berbasis webpack, Alpine.js, Tailwind, dan static multi-page build. Saat ini runtime requirement di dokumentasi masih longgar dan sebagian masih menunjuk Node 18:

- `README.md:42` menyatakan `Node.js 18.x or later`.
- `DEPLOYMENT.md:18-19` menyatakan `Node.js >= 18.x` dan `npm >= 8.x`.
- `DEPLOYMENT.md:314` memakai contoh Docker builder `node:18-alpine`.
- `package.json` belum memiliki field `engines`.
- Repo belum memiliki `.nvmrc` atau `.node-version` di root proyek.

Dependency stack utama (`webpack@5`, `webpack-dev-server@5`, `tailwindcss@4`, `postcss@8`, `babel-loader@9`) secara umum sudah modern dan seharusnya cocok dengan Node 20, tetapi compatibility tetap harus dibuktikan lewat install/build nyata.

## Evidence Snapshot

### FAKTA

- `package.json` kini mendeklarasikan runtime minimum `>=20`.
- `README.md`, `DEPLOYMENT.md`, dan contoh Docker utama sudah diarahkan ke baseline Node 20+.
- Baseline verifikasi yang relevan adalah `npm install` dan `npm run build`, dengan `npm run start` bila perubahan menyentuh runtime-sensitive path.
- Repo meng-ignore `package-lock.json`, jadi lockfile bukan artifact kontrak repo yang committed walaupun hasil install lokal tetap dapat memengaruhi file itu sementara.

### ASUMSI

- Node 20+ adalah target final yang diinginkan untuk semua runtime surface di repo.
- User memilih contract minimum-version lock `>=20`, bukan exact patch pin.
- User memilih strategi dependency **minimal aman**, bukan batch refresh.

### NEEDS-VERIFICATION

- Apakah install tree saat ini bersih pada runtime aktif `>=20` tanpa perlu update dependency tambahan.
- Apakah ada workflow/config deploy lain di repo yang juga menyebut versi Node dan perlu diselaraskan.
- Apakah `npm run start` tetap berjalan normal setelah metadata/runtime docs diperbarui.

## Design Decision

Pakai pendekatan **explicit Node 20+ runtime contract + selective dependency cleanup**.

Artinya:

- Target runtime minimum Node 20 dinyatakan eksplisit di source-of-truth repo.
- Semua referensi runtime utama di repo diselaraskan ke target tersebut.
- Dependency tidak di-upgrade massal.
- Hanya package yang terbukti menyebabkan install/build problem pada runtime aktif `>=20` yang akan disentuh.

## Planned Changes

### 1. Make Node 20+ the explicit repo runtime contract

Tetapkan Node 20+ sebagai runtime contract utama repo.

**Affected files:**

- `package.json`
- `.nvmrc` (opsional; hanya bila ingin memberi hint local tooling tanpa mempersempit contract repo)
- `.node-version` (opsional; tambahkan bila ingin memperluas dukungan tool lokal)

**Planned rules:**

- Tambah `engines.node: ">=20"` di `package.json`.
- Tambah `.nvmrc` dengan target major Node 20 sebagai default local tooling bila diperlukan, tanpa mempersempit contract kompatibilitas repo yang tetap Node 20+.
- Tambah `.node-version` bila dianggap membantu tool lintas environment tanpa menambah ambiguitas.
- Jangan menetapkan patch exact karena keputusan user adalah minimum-version contract `>=20`, bukan exact lock.

### 2. Verify install behavior under Node 20

Validasi bahwa dependency dapat di-install dengan stabil pada runtime baru tanpa menjadikan lockfile sebagai baseline repo.

**Affected files:**

- Tidak ada file wajib; verifikasi dilakukan lewat install aktual di environment Node 20

**Planned rules:**

- Lakukan verifikasi install di Node 20 menggunakan `npm install`, bukan `npm ci`, karena repo tidak mengandalkan `package-lock.json` sebagai baseline committed.
- Perlakukan perubahan `package-lock.json` yang muncul dari hasil install sebagai metadata lokal/non-committed saja, sesuai kebijakan repo.
- Jangan mengubah dependency version range di `package.json` kecuali memang dibutuhkan karena incompatibility.

### 3. Align Docker/runtime examples to Node 20

Perbaiki contoh runtime/deploy yang masih menunjuk Node 18.

**Affected files:**

- `DEPLOYMENT.md`
- file Docker/config lain bila ditemukan saat audit lanjutan

**Planned rules:**

- Ganti contoh builder image `node:18-alpine` menjadi basis Node 20 yang setara.
- Pastikan instruksi deploy/runtime tidak lagi menyiratkan Node 18 sebagai baseline.

### 4. Align developer-facing docs with the new runtime truth

Dokumentasi harus mengatakan hal yang sama dengan runtime contract repo.

**Primary docs likely affected:**

- `README.md`
- `DEPLOYMENT.md`
- `DEPLOYMENT-CHECKLIST.md`
- `ANALISIS-PROJECT.md` bila masih mengandung pernyataan runtime yang drift

**Planned rules:**

- Semua referensi minimum runtime utama diselaraskan ke Node 20.
- Dokumentasi install/build harus tetap sesuai dengan workflow repo yang ada sekarang.
- Jangan menambah instruksi baru yang tidak benar-benar digunakan repo.

### 5. Apply only necessary dependency updates

Dependency cleanup dilakukan secara evidence-driven.

**Possible affected files:**

- `package.json`
- `package-lock.json`

**Trigger rule for dependency changes:**
Dependency hanya boleh diubah jika salah satu kondisi berikut terjadi di Node 20:

1. `npm install` / `npm ci` gagal,
2. `npm run build` gagal,
3. ada incompatibility yang jelas pada build tooling yang membuat adopt Node 20 rapuh atau misleading bila dibiarkan.

**Out-of-bounds examples:**

- Meng-upgrade library UI/aplikasi hanya karena ada versi baru.
- Membersihkan warning yang tidak relevan ke compatibility Node 20.
- Mengubah package hanya demi kosmetik lockfile.

## Dependency Policy

### Allowed

- Update package build/runtime yang benar-benar diperlukan agar Node 20 install/build stabil.
- Update package yang menjadi direct cause dari incompatibility Node 20.

### Not allowed by default

- Upgrade dependency aplikasi yang tidak terkait runtime/build.
- Menyapu semua devDependencies ke versi terbaru.
- Melakukan migration toolchain besar.

## Verification Plan

### Required verification

1. Jalankan install di Node 20 (`npm install` atau `npm ci`, tergantung kondisi lockfile/workflow yang paling tepat).
2. Jalankan `npm run build` di Node 20.
3. Jika perubahan menyentuh runtime-sensitive startup path, jalankan `npm run start` untuk memastikan dev server tetap bootstrap dengan benar.

### Success criteria

- Repo menyatakan target runtime Node 20+ secara eksplisit.
- Semua surface runtime utama yang ada di repo selaras ke Node 20+.
- Install selesai tanpa incompatibility blocker pada runtime aktif `>=20`.
- Build selesai sukses pada runtime aktif `>=20`.
- Dependency changes, jika ada, terbatas pada yang diperlukan untuk compatibility.

### Run log (2026-04-18)

- Lingkungan: Node.js 20.x (local CLI).
- Perintah: `npm install` lalu `npm run build`.
- Hasil: keduanya sukses tanpa error build. Smoke test PDF (`reportGenerator`) belum dijalankan di browser/runtime UI pada sesi ini; lakukan verifikasi UI cepat saat staging untuk memastikan ekspor PDF tetap kompatibel dengan `jspdf`/`jspdf-autotable` terbaru.

## Implementation Boundaries

### In scope

- Penambahan/penyesuaian runtime metadata Node 20.
- Sinkronisasi lockfile/install metadata.
- Update dokumentasi runtime/deploy yang drift.
- Update selective dependency bila dibutuhkan untuk Node 20 compatibility.
- Verifikasi install/build, dan startup bila relevan.

### Out of scope

- Refactor source code aplikasi.
- Perubahan UI behavior.
- Dependency refresh besar-besaran.
- Perubahan infra eksternal di luar file repo yang tersedia.

## Risks and Mitigations

### Risk 1: Hidden deploy/runtime drift

Mungkin ada file workflow/deploy lain yang belum tersentuh tapi masih menyebut Node lama.

**Mitigation:**
Audit grep untuk referensi `node`, `Node`, `npm`, `runtime`, `version`, dan sinkronkan semua referensi repo-level yang nyata.

### Risk 2: Dependency tree changes unexpectedly under Node 20

Install di Node 20 bisa memperbarui sebagian resolved metadata atau menyingkap incompatibility package lama.

**Mitigation:**
Batasi perubahan dependency ke kebutuhan yang benar-benar terbukti, lalu verifikasi build setelah setiap perubahan yang diperlukan.

### Risk 3: Runtime contract terlalu longgar di lokal

Karena target user adalah `>=20 <21`, developer masih bisa memakai beberapa patch berbeda di Node 20.

**Mitigation:**
Gunakan `.nvmrc` untuk mendorong major yang benar; contract repo tetap eksplisit tanpa memaksa exact patch pin.

## Expected Deliverables

1. `package.json` dengan Node 20 runtime contract.
2. `.nvmrc` (dan `.node-version` jika dipilih) untuk local tooling.
3. `package-lock.json` yang selaras dengan install di Node 20.
4. Docs runtime/deploy yang tidak lagi drift ke Node 18.
5. Dependency updates terbatas jika memang diperlukan.
6. Bukti verifikasi bahwa install/build berjalan di Node 20.
