# Lightweight Runtime Config Design

## Summary

Rapikan runtime/public config frontend Infinite Track Web FE dengan pendekatan local-first, sambil mengunci contract target deploy/public secara eksplisit tanpa mengubah default aktif ke domain live/public.

## Goal

1. Mempertahankan local development flow yang saat ini bekerja.
2. Mengunci contract target deploy/public untuk frontend static bundle.
3. Membersihkan drift antara runtime nyata, template env, dan deployment docs.
4. Memastikan tidak ada private secret yang ikut ke bundle frontend.

## Non-Goals

- Mengaktifkan default production/public sekarang.
- Mengganti build system atau runtime model frontend.
- Memindahkan backend secret ke env frontend.
- Melakukan refactor besar pada service layer.

## Context

Frontend ini adalah static multi-page frontend berbasis webpack, bukan SSR. Runtime/public config saat ini diinjeksi melalui `dotenv` + `webpack.DefinePlugin`, sehingga semua nilai yang masuk ke bundle harus dianggap public compile-time values. Backend dipakai oleh Web FE dan Android, tetapi local development frontend saat ini masih aktif dan tidak boleh rusak.

Contract target deploy/public yang harus dikunci:

- Frontend public site: `https://infinite-track.tech`
- Backend API public: `https://api.infinite-track.tech`

## Evidence Snapshot

### FAKTA

- `API_BASE_URL` default saat ini adalah `/api` di `webpack.config.js:117` dan `src/js/config/env.js:8`.
- Dev server mem-proxy `/api` ke backend local `http://localhost:3005` di `webpack.config.js:168`.
- `.env.example:8` saat ini memberi contoh `API_BASE_URL=https://your-api-domain.com/api`, yang drift dari runtime local-first aktif.
- `.env.example:29`-`41` memuat beberapa key yang tidak tampak dipakai runtime frontend saat ini, seperti `CSRF_TOKEN_NAME`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `DEV_SERVER_PORT`, dan `DEV_SERVER_HOST`.
- Belum ada `.env.production.example` di repo.
- Deployment docs saat ini mendorong `API_BASE_URL` ke public URL, tetapi belum membedakan secara tegas antara active default saat ini vs target deploy contract.

### ASUMSI

- Tidak ada runtime layer lain di luar webpack static bundle yang membaca env frontend saat request time.
- `API_BASE_URL` dan metadata app/debug yang diinject ke bundle adalah public-safe.
- Repo-specific deployment docs boleh diperbarui dari placeholder generik ke contract Infinite Track tanpa memaksa aktivasi production saat ini.

### NEEDS-VERIFICATION

- Apakah ada pipeline/deploy script di luar file yang diaudit yang secara khusus bergantung pada `.env.example` lama yang bernuansa production.
- Apakah semua docs drift sekunder di repo aman diselaraskan ke contract runtime baru.
- Apakah `repomix-output.md` diperlakukan sebagai generated artifact yang cukup diselaraskan secara minimum, bukan sumber kebenaran utama.

## Design Decision

Pakai pendekatan **local-first active + explicit production contract placeholder**.

Artinya:

- Local development tetap memakai default aktif `/api`.
- Production/public target dikunci melalui template/contract eksplisit, bukan dijadikan default runtime saat ini.
- Env examples dan docs harus merepresentasikan dua hal yang berbeda:
  - **active now**: local-first behavior
  - **target deploy**: public production contract

## Planned Changes

### 1. Keep local-first runtime active

Pertahankan fallback `API_BASE_URL=/api` di runtime/frontend config agar `npm start` dan local proxy flow tetap berjalan seperti sekarang.

**Affected files:**

- `webpack.config.js`
- `src/js/config/env.js`

**Rule:**

- Tidak mengubah default aktif ke `https://api.infinite-track.tech`.
- Tidak mengubah dev proxy `/api -> http://localhost:3005`.

### 2. Make public config contract explicit

Tambahkan production contract placeholder yang jelas untuk deploy/public.

**Affected files:**

- `.env.production.example` (baru)
- kemungkinan komentar penjelas di `webpack.config.js` dan/atau `src/js/config/env.js`

**Expected contract values:**

- `API_BASE_URL=https://api.infinite-track.tech`
- `APP_ENVIRONMENT=production`
- `DEBUG_MODE=false`
- `LOG_LEVEL=error` atau nilai production-safe setara

**Rule:**

- File ini berfungsi sebagai **contract target**, bukan env default aktif.

### 3. Realign `.env.example` with actual local flow

Ubah `.env.example` agar menjadi template local/dev yang sesuai dengan runtime nyata saat ini.

**Expected local/dev values:**

- `API_BASE_URL=/api`
- `APP_ENVIRONMENT=development`
- debug values yang cocok untuk local dev

**Rule:**

- `.env.example` harus cocok dengan perilaku runtime aktif sekarang, bukan target deploy nanti.

### 4. Remove or mark drift/dead public config

Bersihkan key env yang tidak benar-benar dipakai runtime frontend bundle saat ini.

**Candidates identified from audit:**

- `CSRF_TOKEN_NAME`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `DEV_SERVER_PORT`
- `DEV_SERVER_HOST`
- commented external-service placeholders bila tidak relevan ke runtime current bundle

**Rule:**

- Jika key tidak masuk DefinePlugin dan tidak dibaca source frontend runtime, key tersebut tidak boleh diposisikan seolah-olah bagian dari active frontend contract.
- Pilihan utamanya adalah menghapus dari env example. Jika tetap dipertahankan, harus ditandai jelas sebagai not used by current frontend bundle.

### 5. Align docs with runtime truth

Perbarui deployment/runtime docs yang drift agar menyatakan dengan jelas:

- local/dev aktif sekarang memakai `/api`
- target deploy/public nanti memakai `https://api.infinite-track.tech`
- tidak ada secret private yang boleh masuk ke frontend bundle

**Primary docs likely affected:**

- `DEPLOYMENT.md`
- `DEPLOYMENT-CHECKLIST.md`

**Secondary docs/artifacts to clean if relevant:**

- `ANALISIS-PROJECT.md`
- `repomix-output.md`

**Rule:**

- Docs utama harus menjadi sumber kebenaran manusia yang konsisten dengan runtime nyata.
- Docs sekunder dibersihkan hanya sejauh terkait contract runtime/public config.

## Security Model

- Semua nilai yang diinject melalui `webpack.DefinePlugin` dianggap public dan boleh terlihat di bundle.
- Hanya config public-safe yang boleh berada di frontend env contract.
- Tidak boleh ada backend secret, private token, credential, atau internal-only secret dipindahkan ke env frontend.

## Final Config Contract (target state)

| Config name         | Purpose                                        | Public-safe? | Required? | Local/dev value                   | Target production value           | Where injected                                                         | Active now?                                 |
| ------------------- | ---------------------------------------------- | ------------ | --------- | --------------------------------- | --------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| `API_BASE_URL`      | Base URL untuk semua request API frontend      | Yes          | Yes       | `/api`                            | `https://api.infinite-track.tech` | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes for local default, No for public target |
| `API_AUTH_ENDPOINT` | Prefix endpoint auth relatif terhadap base URL | Yes          | Yes       | `/auth`                           | `/auth`                           | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |
| `API_VERSION`       | Metadata/segment versi API frontend            | Yes          | Optional  | `v1`                              | `v1`                              | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |
| `APP_NAME`          | Nama aplikasi yang tampil di frontend/log      | Yes          | Optional  | `Infinite Track`                  | `Infinite Track`                  | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |
| `APP_VERSION`       | Versi aplikasi frontend                        | Yes          | Optional  | `2.0.1`                           | `2.0.1`                           | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |
| `APP_ENVIRONMENT`   | Penanda mode aplikasi                          | Yes          | Yes       | `development`                     | `production`                      | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |
| `SESSION_TIMEOUT`   | Timeout sesi frontend-side behavior            | Yes          | Optional  | `3600000`                         | `3600000`                         | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |
| `REMEMBER_ME_DAYS`  | Lama remember me di frontend                   | Yes          | Optional  | `7`                               | `7`                               | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |
| `DEFAULT_LANGUAGE`  | Bahasa default frontend                        | Yes          | Optional  | `id`                              | `id`                              | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |
| `TIMEZONE`          | Timezone display default                       | Yes          | Optional  | `Asia/Jakarta`                    | `Asia/Jakarta`                    | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |
| `DEBUG_MODE`        | Mengontrol debug logging frontend              | Yes          | Optional  | `true` atau nilai dev-appropriate | `false`                           | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |
| `LOG_LEVEL`         | Level logging frontend                         | Yes          | Optional  | `debug` atau `info`               | `error`                           | `webpack.config.js` via DefinePlugin, dibaca di `src/js/config/env.js` | Yes                                         |

## Implementation Boundaries

### In scope

- Perubahan minimal pada `webpack.config.js`
- Perubahan minimal pada `src/js/config/env.js`
- Koreksi `.env.example`
- Penambahan `.env.production.example`
- Pembersihan docs runtime/deploy yang drift
- Penandaan/penghapusan dead config yang tidak dipakai runtime frontend saat ini

### Out of scope

- Refactor besar `API_CONFIG.BASE_URL` consumers di service files
- Mengubah architecture build/runtime menjadi runtime-loaded config
- Menambahkan secret handling baru di frontend
- Mengubah backend API contract
- Mengaktifkan live/public URL sebagai default saat ini

## Verification Criteria

### Must be true after implementation

1. Local dev tetap berjalan dengan flow `/api` + webpack dev proxy.
2. Contract public/deploy terdokumentasi jelas dengan target `https://api.infinite-track.tech`.
3. `.env.example` mencerminkan local-first reality.
4. `.env.production.example` menyediakan public deploy contract placeholder yang eksplisit.
5. Config drift/dead entries yang tidak benar-benar dipakai runtime sudah dihapus atau diberi label yang benar.
6. Tidak ada secret privat yang ikut dimodelkan sebagai frontend env.

## Expected Deliverables

1. Ringkasan masalah runtime config saat ini.
2. Daftar perubahan minimal yang dilakukan.
3. Implementasi perubahan pada source of truth runtime + docs relevan.
4. Tabel final frontend config contract.
5. Daftar config yang dihapus/ditandai drift.
6. Verifikasi akhir bahwa local dev tetap aman, public contract terkunci, dan bundle tetap public-safe.
