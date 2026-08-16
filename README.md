# Infinite Track — Web Frontend

Web frontend resmi **Infinite Track** untuk kebutuhan operasional Infinite Learning, termasuk authentication/session, dashboard management, pengguna, attendance, booking/WFA, reporting/export, profile, dan operational settings.

Repository ini adalah aplikasi produk. Artefak task/agent, evidence historis, dan planning sementara tidak menjadi source of truth repository.

## Repository Contract

- Repository: `Infinite-LearningV1/Infinite_Track_Fe`
- Integration branch: `develop`
- Production/release branch: `master`
- Runtime: static multi-page frontend hasil build Webpack
- Backend/business authority tetap berada di backend API

Planning dan status pekerjaan dikelola di Linear. GitHub PR digunakan sebagai implementation/review evidence. PR merged tidak otomatis berarti acceptance/runtime verification sudah selesai.

## Product Scope

Web FE bertanggung jawab untuk:

- sign-in, session consumer, logout, dan protected-route UX;
- management dashboard dan backend-driven analytics presentation;
- management pengguna;
- management attendance;
- management booking / WFA;
- reporting dan PDF/Excel export;
- profile dan operational settings;
- loading, empty, error, denied, dan recovery presentation.

Frontend **tidak** menjadi source of truth untuk authentication validity, authorization decision, attendance result, WFA/FAHP calculation, server-side filtering/pagination, atau data bisnis lain yang dimiliki backend.

## Tech Stack

- HTML multi-page application
- JavaScript
- Alpine.js
- Tailwind CSS
- Webpack 5
- Axios
- Leaflet
- Chart.js / ApexCharts
- jsPDF / XLSX

Minimum runtime untuk development/build: **Node.js 20+**.

## Quick Start

```bash
git clone https://github.com/Infinite-LearningV1/Infinite_Track_Fe.git
cd Infinite_Track_Fe
git checkout develop
npm ci
```

Untuk local development, buat `.env` dari template:

```bash
cp .env.example .env
```

Default local contract:

```env
API_BASE_URL=/api
API_AUTH_ENDPOINT=/auth
API_VERSION=v1
APP_NAME=Infinite Track
APP_ENVIRONMENT=development
DEFAULT_LANGUAGE=id
TIMEZONE=Asia/Jakarta
DEBUG_MODE=true
LOG_LEVEL=info
```

Start development server:

```bash
npm run start
```

Local Webpack dev server mem-proxy request `/api` ke backend lokal `http://localhost:3005` berdasarkan current `webpack.config.js`.

## Environment Contract

Template environment yang tracked:

- `.env.example` — local development contract;
- `.env.production.example` — production build-time contract.

Semua nilai frontend environment harus dianggap **public**, karena nilainya dibake ke browser bundle. Jangan menaruh password, private token, API secret, atau credential sensitif di frontend env.
Production contract saat ini:

```env
API_BASE_URL=https://api.infinite-track.tech/api
API_AUTH_ENDPOINT=/auth
API_VERSION=v1
APP_NAME=Infinite Track
APP_ENVIRONMENT=production
DEFAULT_LANGUAGE=id
TIMEZONE=Asia/Jakarta
DEBUG_MODE=false
LOG_LEVEL=error
```

`npm run build` hanya menetapkan `NODE_ENV=production`. File `.env.production.example` adalah **template contract** dan tidak otomatis dimuat sebagai runtime configuration. Nilai production harus tersedia pada build environment yang benar sebelum Webpack membentuk bundle.

## Commands

```bash
npm run start
npm run build
npm run build:dev
npm run test:auth-runtime
npm run lint
npm run sort
```

- `npm run start` — Webpack development server.
- `npm run build` — production build ke `build/`.
- `npm run build:dev` — development build tanpa dev server.
- `npm run test:auth-runtime` — focused auth/session runtime regression suite.
- `npm run lint` — Prettier check untuk `src`, `tests`, dan `docs`; ini bukan full static-analysis linter.
- `npm run sort` — menulis ulang format Prettier pada `src`.

## Project Structure

```text
Infinite_Track_Fe/
├── .github/              # GitHub Actions / repository automation
├── docs/
│   └── adr/              # durable architecture decisions
├── src/
│   ├── js/
│   │   ├── components/
│   │   ├── config/
│   │   ├── features/
│   │   ├── services/
│   │   ├── stores/
│   │   └── utils/
│   ├── partials/
│   ├── images/
│   └── *.html
├── tests/                # Node-based regression tests
├── .env.example
├── .env.production.example
├── Dockerfile
├── Dockerfile.dev
├── compose.yaml
├── webpack.config.js
└── package.json
```

Generated/local directories seperti `build/`, `node_modules/`, `.claude/`, `.superpowers/`, IDE metadata, dan local dev-server logs tidak menjadi bagian repository source.

## Frontend Architecture

General flow:

```text
HTML / Alpine page
        ↓
feature/component state
        ↓
service layer
        ↓
backend API
```

Repository rules yang perlu dipertahankan:

- page/component merender state dan mengirim action;
- API access dilakukan melalui service layer, bukan tersebar langsung di template;
- backend error tidak boleh diam-diam diganti dummy/mock success;
- loading, empty, denied, error, dan unavailable state harus berbeda secara eksplisit;
- cached browser state hanya hint; session/auth authority tetap diverifikasi terhadap backend;
- dashboard/WFA/FAHP score, weight, consistency ratio, ranking, dan server-driven data tidak dihitung atau difabrikasi di frontend.

Architecture decisions yang masih relevan disimpan di [`docs/adr/`](docs/adr/).

## Branch Workflow

```text
feature/* ─┐
fix/*     ─┼─> develop ──> master
chore/*   ─┘
```

- Buat bounded branch dari `develop`.
- Feature/fix/chore masuk ke `develop` melalui PR review.
- `develop` adalah integration branch.
- `master` adalah production/release source branch.
- Branch merged/historical harus dibersihkan setelah tidak lagi diperlukan.

## CI and Verification

GitHub Actions menjalankan build gate pada PR/push ke `develop` dan `master` dengan Node.js 20:

```text
npm ci
npm run test:auth-runtime
npm run build
```

Sebelum PR merge, minimum verification mengikuti scope perubahan. Untuk perubahan umum jalankan production build; untuk auth/session jalankan focused auth runtime suite.

```bash
npm run test:auth-runtime
npm run build
```

Untuk UI behavior, sertakan runtime/browser verification bila acceptance criteria membutuhkannya. Jangan menyatakan repository globally green jika ada baseline failure pada suite lain yang belum diperbaiki.

## Production Deployment

Frontend production diperlakukan sebagai **static site**. Build output berada di `build/` dan production/release source branch adalah `master`.

Current production contract yang harus diverifikasi kembali sebelum deploy:

- Frontend origin: `https://infinite-track.tech`
- Backend API base: `https://api.infinite-track.tech/api`
- Build command: `npm ci && npm run build`
- Output directory: `build/`

Recommended deployment flow:

1. pastikan perubahan sudah terintegrasi dan diverifikasi di `develop`;
2. promote snapshot yang disetujui ke `master`;
3. inject production env pada build environment;
4. jalankan clean install dan production build;
5. deploy/publish isi `build/` sebagai static site;
6. jalankan post-deploy smoke sebelum release dianggap sehat.

### CORS / Auth Transport

Web FE menggunakan credentialed browser requests untuk auth/session. Backend production harus mengizinkan frontend origin final secara eksplisit.

Minimum production expectations:

```text
Access-Control-Allow-Origin: https://infinite-track.tech
Access-Control-Allow-Credentials: true
Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Allowed headers: Content-Type, X-Client-Type
```

Jangan menggunakan wildcard origin (`*`) bersama credentialed session. Jika login/bootstrap gagal dengan browser-level `Failed to fetch`, preflight error, atau CORS error, periksa origin, API prefix, credentials, methods, dan allowed headers sebelum menganggap endpoint backend tidak tersedia.

### Post-Deploy Smoke

Minimum smoke setelah release:

- production domain membuka artifact yang benar;
- sign-in page render tanpa blocking console error;
- valid account dapat login dan invalid login ditolak dengan benar;
- protected route tetap protected setelah logout/session invalid;
- dashboard memuat backend-driven data atau explicit empty/error state;
- request API memakai host dan `/api` prefix yang benar;
- primary management navigation dapat dibuka;
- PDF/Excel export yang in-scope dapat diproduksi;
- browser Network tidak menunjukkan unexpected CORS/preflight failure;
- Chrome/Edge dan minimal satu responsive/mobile viewport tidak memiliki blocking layout/runtime issue.

Simpan runtime evidence di release/PR/issue/platform log, bukan sebagai snapshot evidence permanen di repository source.

### Rollback

Rollback dipertimbangkan bila release frontend terbaru menyebabkan kondisi P1 seperti domain/artifact salah, signin rusak, protected-route regression, dashboard utama tidak dapat digunakan, export critical rusak, API base/CORS salah, atau blocking browser runtime error.

Operational rollback:

1. freeze deploy/promotion baru;
2. identifikasi last-known-good commit/deployment;
3. rollback/re-publish deployment static sebelumnya atau promote release commit yang sehat;
4. kembalikan build-time env bila regression berasal dari config;
5. jalankan minimum post-rollback smoke: domain, signin, protected API target, dashboard, console/network;
6. catat incident timestamp, release/deployment ID, rollback target, verifier, dan hasil smoke pada operational system/issue.

Jika akar masalah adalah backend outage, DNS/SSL eksternal, atau incident lain yang tidak dipicu frontend release, rollback frontend belum tentu menyelesaikan masalah.

## Security

- Jangan commit `.env` atau credential production.
- Jangan menyimpan secret pada frontend build-time variables.
- Jangan log token/session credential atau sensitive user payload.
- Client-side RBAC hanya presentation/access UX; backend tetap authority untuk authorization.
- Jangan mengubah API contract atau business result berdasarkan asumsi frontend.

## Documentation Policy

Repository hanya menyimpan dokumentasi yang durable dan berguna untuk maintainer produk.

- `README.md` — canonical onboarding, env, verification, deployment, dan handoff entrypoint.
- `docs/adr/` — architecture decisions dan responsibility boundaries.

Task reports, AI/agent instructions, temporary implementation plans, runtime evidence snapshots, issue reconciliation exports, dan personal tooling files harus disimpan di tool/issue/PR/workspace yang sesuai, bukan sebagai product repository source.

## Maintainer Handoff Checklist

Sebelum repository diserahkan atau release dipromosikan:

- clone/install berhasil dengan Node.js 20+ dan `npm ci`;
- `.env.example` dan `.env.production.example` sesuai runtime contract;
- `npm run test:auth-runtime` berhasil;
- `npm run build` berhasil;
- source branch release dan build environment teridentifikasi;
- critical auth/dashboard/navigation/export smoke telah diverifikasi bila dibutuhkan;
- active issue dan known verification gap tetap tercatat di Linear/PR, bukan disembunyikan di docs lokal;
- branch/worktree historis sudah dibersihkan;
- tidak ada secret, local logs, IDE metadata, atau AI tooling artifact yang ikut ter-track.

Jika dokumentasi dan behavior berbeda, prioritaskan current code/runtime evidence, backend contract, dan ADR aktif; kemudian perbarui README/ADR agar kembali sinkron.

## License

Repository menggunakan MIT License. Lihat [`LICENSE`](LICENSE).
