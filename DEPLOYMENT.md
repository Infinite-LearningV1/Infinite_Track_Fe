# 🚀 PANDUAN DEPLOYMENT - INFINITE TRACK FRONTEND

## 📋 Daftar Isi

1. [Persiapan Sebelum Deploy](#persiapan-sebelum-deploy)
2. [Konfigurasi Environment](#konfigurasi-environment)
3. [Build Production](#build-production)
4. [Opsi Deployment](#opsi-deployment)
5. [Checklist Quality Assurance](#checklist-quality-assurance)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Procedure](#rollback-procedure)
8. [Support & Resources](#support--resources)

---

## 🔧 Persiapan Sebelum Deploy

### 1. Persyaratan Sistem

- Node.js 20.x atau lebih baru
- npm yang bundled dengan runtime aktif atau yarn >= 1.22.x
- Git

### 2. Perbaiki Git Status

Pastikan tidak ada file yang conflict atau belum di-track:

```bash
# Check status
git status

# Add file baru (logo dengan underscore)
git add src/images/logo/auth_logo.svg
git add src/images/logo/logo_dark.svg

# Remove file lama (jika sudah tidak dipakai)
git rm src/images/logo/auth-logo.svg
git rm src/images/logo/logo-dark.svg
git rm src/images/logo/logo-icon.svg

# Commit perubahan
git commit -m "Fix: Update logo files naming convention"
```

### 3. Install Dependencies

```bash
# Install semua dependencies termasuk cross-env yang baru ditambahkan
npm install

# Atau jika menggunakan yarn
yarn install
```

> Untuk clean install yang reproducible seperti baseline CI repo ini, gunakan `npm ci`.
>
> Catatan CI baseline: workflow GitHub Actions repo ini memakai Node.js 20 dan `npm ci` untuk build verification yang reproducible.

---

## ⚙️ Konfigurasi Environment

### 1. Setup Environment Variables

**PENTING:** Sebelum build production, Anda HARUS menyiapkan **nilai env production** yang akan dibaca oleh proses build.

> Repo ini memanggil `dotenv.config()` default di `webpack.config.js`, jadi script `npm run build` **tidak otomatis memuat** file `.env.production`.
>
> Untuk operator lokal, `.env.production.example` adalah **template contract**, bukan file yang langsung dibaca build. Jika ingin build lokal dengan nilai production, export env ke shell/build environment yang aktif atau sinkronkan nilainya ke `.env` sesuai prosedur operator yang disetujui.

```bash
# Gunakan sebagai template contract build-time env production
cp .env.production.example .env.production

# Lalu export / sinkronkan nilainya ke environment build yang benar
# sebelum menjalankan npm run build.
```

**Konfigurasi WAJIB yang harus diubah:**

```env
# Production Infinite Track saat ini memakai prefix /api di backend public.
API_BASE_URL=https://api.infinite-track.tech/api
API_AUTH_ENDPOINT=/auth

# Jika domain backend berbeda, pakai URL public yang sudah mencakup prefix API final.
# Contoh: API_BASE_URL=https://api.yourdomain.com/api
```

### 2. Verifikasi Konfigurasi

Pastikan konfigurasi berikut sesuai dengan kebutuhan.

> **Build-time truth penting:** frontend ini memakai Webpack `DefinePlugin` untuk membake env ke bundle saat build. `npm run build` hanya mengeset `NODE_ENV=production`; command itu **tidak otomatis memuat** `.env.production.example` maupun `.env.production`. Untuk static production, nilai final harus diinjeksi oleh environment build yang benar (misalnya export env di shell/build runner atau App Platform build-time env).
>
> **Staging note:** repo ini tidak memiliki `.env.staging` committed. Kolom **Staging** di bawah hanya boleh dianggap placeholder governance. Jika environment staging dipakai, nilainya harus dikunci dan diverifikasi terpisah (`REQUIRES REPO VERIFICATION`).

| Variable | Development (`.env.example`) | Staging | Production (`.env.production.example`) | Keterangan / source of truth |
| --- | --- | --- | --- | --- |
| `API_BASE_URL` | `/api` | `REQUIRES REPO VERIFICATION` | `https://api.infinite-track.tech/api` | **WAJIB** mencakup prefix API final untuk static production. Default fallback webpack tetap `/api`. |
| `API_AUTH_ENDPOINT` | `/auth` | `REQUIRES REPO VERIFICATION` | `/auth` | Digabung dengan `API_BASE_URL` di `src/js/config/env.js`. |
| `API_VERSION` | `v1` | `REQUIRES REPO VERIFICATION` | `v1` | Build-time public-safe. |
| `APP_NAME` | `Infinite Track` | `REQUIRES REPO VERIFICATION` | `Infinite Track` | Label aplikasi di browser/runtime. |
| `APP_VERSION` | `2.0.1` | `REQUIRES REPO VERIFICATION` | `2.0.1` | Versi aplikasi yang dibake ke bundle. |
| `APP_ENVIRONMENT` | `development` | `REQUIRES REPO VERIFICATION` | `production` | Jangan samakan dengan `NODE_ENV`; ini adalah nilai aplikasi yang dibake ke bundle. |
| `SESSION_TIMEOUT` | `3600000` | `REQUIRES REPO VERIFICATION` | `3600000` | Konfigurasi auth/session di frontend. |
| `REMEMBER_ME_DAYS` | `7` | `REQUIRES REPO VERIFICATION` | `7` | Konfigurasi auth/session di frontend. |
| `DEFAULT_LANGUAGE` | `id` | `REQUIRES REPO VERIFICATION` | `id` | Lokalisasi default. |
| `TIMEZONE` | `Asia/Jakarta` | `REQUIRES REPO VERIFICATION` | `Asia/Jakarta` | Timezone default frontend. |
| `DEBUG_MODE` | `true` | `REQUIRES REPO VERIFICATION` | `false` | Default fallback webpack adalah `false` bila env tidak diset. |
| `LOG_LEVEL` | `info` | `REQUIRES REPO VERIFICATION` | `error` | Default fallback webpack adalah `info`. |
| `AUTH_CLIENT_TYPE` | *(tidak ada di `.env.example`)* | `REQUIRES REPO VERIFICATION` | *(tidak ada di `.env.production.example`)* | Webpack masih menginjeksi fallback `web`, tetapi `src/js/config/env.js` saat ini hardcode `CLIENT_TYPE = "web"`; ini **belum** menjadi env contract efektif. |

**Last Verified (repo docs alignment):** 2026-07-02.

Verifikasi cepat prefix production: `https://api.infinite-track.tech/api/settings/operational` harus mencapai endpoint backend dan boleh mengembalikan `401 Unauthorized` saat belum login. Jika `https://api.infinite-track.tech/settings/operational` mengembalikan `404`, jangan gunakan base URL tanpa `/api` untuk static production.

---

## 🏗️ Build Production

### 1. Clean Build Directory (Opsional)

```bash
# Hapus build lama
rm -rf build
# Atau di Windows:
# rmdir /s /q build
```

### 2. Build untuk Production

```bash
# Build dengan NODE_ENV=production
npm run build

# Atau jika menggunakan yarn
yarn build
```

### 3. Verifikasi Build Output

Setelah build selesai, cek folder `build/`:

```
build/
├── index.html              ✅ Halaman utama
├── signin.html             ✅ Halaman login
├── management-*.html       ✅ Halaman management
├── bundle.js               ✅ JavaScript bundle (minified)
├── style.css               ✅ CSS bundle
├── vendors-*.bundle.js     ✅ Vendor chunks
├── favicon.ico             ✅ Favicon
└── src/
    └── images/             ✅ Semua assets gambar
```

**Cek ukuran file:**

- `bundle.js` seharusnya ter-minify (ukuran lebih kecil di production)
- Tidak ada `.map` files di production (kecuali Anda butuh untuk debugging)

### 4. Test Build Locally (SANGAT DIREKOMENDASIKAN!)

```bash
# Install serve untuk test static files
npm install -g serve

# Jalankan build di localhost
serve -s build -p 3000

# Buka di browser: http://localhost:3000
```

**Testing Checklist:**

- ✅ Halaman signin bisa dibuka
- ✅ Login berhasil (jika backend sudah ready)
- ✅ Dashboard tampil dengan benar
- ✅ Dark mode toggle berfungsi
- ✅ Semua gambar/logo tampil
- ✅ Responsive di mobile view
- ✅ Console browser tidak ada error

---

## 🌐 Opsi Deployment

### Production Truth

Untuk production, frontend ini diperlakukan sebagai **static site**. Jalur deploy yang direkomendasikan adalah build frontend lalu host hasil `build/` pada static hosting seperti DigitalOcean App Platform Static Site. Pada model ini, frontend production harus memakai `API_BASE_URL` yang mengarah langsung ke backend public URL (disarankan subdomain API terpisah), bukan mengandalkan local `/api` gateway.

Dalam branch model repo ini, `master` adalah branch final yang dimaksudkan menjadi source release / deploy production. Snapshot `develop` harus dipromosikan secara terkontrol ke `master`, dan setiap PR yang menargetkan `master` akan menjalankan build verification sebelum `master` diperlakukan sebagai branch release-ready.

Baseline repo ini hanya menambahkan build gate minimum dan **tidak** menyalakan deploy production otomatis. Build yang lulus menunjukkan evidence minimum bahwa static bundle dapat dibentuk, tetapi bukan klaim bahwa runtime production sudah tervalidasi penuh.

> Needs Verification: branch protection / ruleset GitHub yang mewajibkan required status check untuk `develop` dan `master`, pembatasan direct push ke `master`, pembatasan source branch promotion, dan source branch hosting production aktual tidak bisa dibuktikan dari isi repo saja dan harus dikonfirmasi di GitHub UI / platform hosting.

### CORS / Auth Transport Truth

Frontend Web FE mengandalkan credentialed browser requests untuk auth/session runtime. Itu berarti backend production harus secara eksplisit mengizinkan origin frontend production, preflight `OPTIONS`, dan header yang dipakai auth runtime.

Minimal contract yang harus dicatat di environment/backend docs:

- origin frontend production harus spesifik, bukan wildcard
- current production frontend origin harus dikunci sebagai URL final yang dilayani user, misalnya `https://infinite-track.tech` bila domain itu menjadi host Web FE production; jika platform hosting memakai domain berbeda, gunakan domain final tersebut secara eksplisit
- origin preview/staging tidak otomatis diwariskan ke production allowlist; tambahkan hanya bila environment itu memang dipakai dan sudah punya owner/evidence terpisah
- jika session/cookie dipakai, `Access-Control-Allow-Credentials: true` wajib aktif dan backend tidak boleh memakai `Access-Control-Allow-Origin: *`
- metode umum yang dipakai Web FE harus diizinkan: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- header minimum yang perlu lolos preflight: `Content-Type` dan `X-Client-Type`
- `Authorization` hanya perlu diizinkan bila backend memang memiliki flow yang menggunakannya secara eksplisit; current auth runtime Web FE justru membersihkan bearer header pada protected request flow
- jika browser menampilkan `Failed to fetch` / `Network Error` pada login atau bootstrap, cek CORS sebelum menyalahkan API availability

Contoh backend/platform CORS production yang diharapkan:

```env
CORS_ALLOWED_ORIGINS=https://infinite-track.tech
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOWED_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,X-Client-Type
```

Jika production Web FE memakai domain lain, ganti `https://infinite-track.tech` dengan origin final yang benar. Jangan menambahkan path seperti `/signin.html` atau `/api` ke CORS origin; CORS origin hanya scheme + host + optional port.

Verification method setelah deploy/config change:

1. Buka Web FE production dari browser pada origin final.
2. Jalankan login smoke atau request bootstrap yang memicu protected API.
3. Di DevTools Network, pastikan request `OPTIONS` preflight ke backend mengembalikan status 2xx/204 dan header berikut sesuai:
   - `Access-Control-Allow-Origin` sama persis dengan origin Web FE production
   - `Access-Control-Allow-Credentials: true` bila cookie/session dipakai
   - `Access-Control-Allow-Headers` mencakup `Content-Type` dan `X-Client-Type`
4. Pastikan request API sesudah preflight tidak gagal dengan browser-level CORS error.
5. Jika memakai curl untuk preflight smoke, set header `Origin` ke origin Web FE production dan sertakan `Access-Control-Request-Method` serta `Access-Control-Request-Headers`; hasil curl hanya pendukung, browser DevTools tetap evidence utama untuk credentialed request.

> `Needs Verification`: domain final Web FE production dan nama env CORS backend aktual harus dikonfirmasi di platform/backend repo. Contoh di atas adalah deployment contract yang harus diselaraskan, bukan bukti konfigurasi backend sudah aktif.

### Local Tooling Truth

Workflow **Docker Compose + NGINX Gateway** di dokumen ini dipertahankan untuk local development dan staging-like verification. Workflow ini bukan sumber kebenaran deploy production frontend.

### Opsi 1: Static Hosting (Paling Mudah / Direkomendasikan untuk Production)

#### A. Netlify (Recommended)

1. **Via Netlify Drop:**
   - Buka [app.netlify.com/drop](https://app.netlify.com/drop)
   - Drag & drop folder `build/` ke halaman
   - Done! Auto-deploy dengan SSL gratis

2. **Via Netlify CLI:**

   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod --dir=build
   ```

3. **Environment Variables di Netlify:**
   - Pergi ke Site Settings → Build & Deploy → Environment
   - Add variables dari `.env.production`
   - Rebuild site

#### B. Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

#### C. GitHub Pages

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add script ke package.json:
# "deploy": "gh-pages -d build"

# Deploy
npm run deploy
```

#### D. Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Pilih 'build' sebagai public directory
firebase deploy
```

---

### Opsi 2: Server Sendiri (VPS/Dedicated)

#### A. Menggunakan Nginx

1. **Upload build ke server:**

   ```bash
   # Via SCP
   scp -r build/* user@your-server:/var/www/infinitetrack/

   # Atau via rsync
   rsync -avz build/ user@your-server:/var/www/infinitetrack/
   ```

2. **Konfigurasi Nginx:**

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       root /var/www/infinitetrack;
       index index.html;

       # Gzip compression
       gzip on;
       gzip_types text/css application/javascript image/svg+xml;

       # Cache static assets
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }

       # SPA fallback
       location / {
           try_files $uri $uri/ /index.html;
       }

       # API proxy (jika backend di server yang sama)
       location /api {
           proxy_pass http://localhost:3005;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Setup SSL dengan Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

#### B. Menggunakan Apache

1. **Upload build ke server**

2. **Konfigurasi Apache (.htaccess):**

   ```apache
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
   </IfModule>

   # Enable compression
   <IfModule mod_deflate.c>
       AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
   </IfModule>

   # Browser caching
   <IfModule mod_expires.c>
       ExpiresActive On
       ExpiresByType image/jpg "access plus 1 year"
       ExpiresByType image/jpeg "access plus 1 year"
       ExpiresByType image/gif "access plus 1 year"
       ExpiresByType image/png "access plus 1 year"
       ExpiresByType text/css "access plus 1 month"
       ExpiresByType application/javascript "access plus 1 month"
   </IfModule>
   ```

---

### Opsi 3: Docker Compose + NGINX Gateway

Workflow ini adalah tooling lokal/staging-like untuk memverifikasi frontend lewat satu browser entrypoint NGINX. `compose.yaml` menjalankan backend dari image yang sudah tersedia, frontend dev server untuk profile `dev`, builder artifact untuk profile `staging`, dan gateway NGINX sesuai profile yang dipilih. Browser tetap memakai boundary `/api`, lalu NGINX meneruskan request itu ke backend container pada port `3005`.

#### Docker Compose Workflows

##### A. Development mode dengan NGINX gateway

Gunakan mode ini saat ingin menjalankan frontend dev server di belakang gateway NGINX, dengan request browser tetap masuk lewat satu origin.

```bash
BACKEND_IMAGE=infinite-track-backend:latest \
docker compose --profile dev up --build
```

Catatan runtime truth:

- `BACKEND_IMAGE` harus menunjuk ke image backend yang sudah bisa berjalan dan listen pada port container `3005`.
- `frontend-dev` menerima `WEBPACK_API_PROXY_TARGET=http://backend:3005` dari Compose, sehingga request API dari dev server tetap diarahkan ke backend container saat dibutuhkan.
- Service `nginx-dev` otomatis memakai config NGINX development saat profile `dev` dipilih.
- Gateway NGINX melayani trafik browser dan mem-proxy `/api` ke `backend:3005`.
- Jika perlu menghindari bentrok port host, override port gateway saat menjalankan Compose, misalnya `GATEWAY_PORT=8081 docker compose --profile dev up --build`.

Verifikasi cepat gateway:

```bash
curl -I http://localhost:8080
```

Jika port di-override, sesuaikan URL verifikasi, misalnya `http://localhost:8081`.

##### B. Staging-like mode dengan NGINX serving built assets

Gunakan mode ini untuk menjalankan alur yang lebih mendekati staging: frontend dibuild di container, hasil build disalin ke volume `frontend_dist`, lalu NGINX menyajikan aset tersebut sementara `/api` tetap lewat gateway yang sama.

```bash
BACKEND_IMAGE=infinite-track-backend:latest \
docker compose --profile staging up --build
```

Catatan staging-like mode:

- `frontend-build` memakai target Dockerfile `artifacts`, menjalankan `npm ci` dan `npm run build`, lalu menyalin output `build/` ke volume `frontend_dist`.
- Build staging-like di Docker menerima build args eksplisit `API_BASE_URL=/api`, `APP_ENVIRONMENT=staging`, `DEBUG_MODE=false`, dan `LOG_LEVEL=info`; workflow ini tidak bergantung pada `.env` lokal di build context.
- Service `nginx-staging` menunggu marker artifact dari `frontend-build` sebelum menyajikan aset build frontend.
- Proxy `/api` tetap mengarah ke `backend:3005`, jadi verifikasi gateway tetap dilakukan dari endpoint NGINX yang sama.

##### C. Stop commands

Untuk menghentikan stack:

```bash
docker compose down
```

Untuk menghentikan stack sekaligus menghapus volume lokal Compose:

```bash
docker compose down -v
```

---

## ✅ Checklist Quality Assurance

### Pre-Deployment Checklist

- [ ] **Environment Variables**
  - [ ] `.env.production` sudah dikonfigurasi
  - [ ] `API_BASE_URL` sudah diubah ke backend production
  - [ ] `APP_ENVIRONMENT=production`
  - [ ] `DEBUG_MODE=false`
  - [ ] `LOG_LEVEL=error`

- [ ] **Git & Version Control**
  - [ ] Semua perubahan sudah di-commit
  - [ ] Tidak ada file konflik di git status
  - [ ] File logo sudah konsisten (underscore naming)

- [ ] **Dependencies**
  - [ ] `npm install` berhasil tanpa error
  - [ ] Tidak ada vulnerability kritis (`npm audit`)

- [ ] **Build Process**
  - [ ] `npm run build` berhasil tanpa error
  - [ ] Bundle size reasonable (tidak terlalu besar)
  - [ ] Semua assets ter-copy ke folder build

- [ ] **Local Testing**
  - [ ] Test di localhost dengan `serve -s build`
  - [ ] Semua halaman bisa diakses
  - [ ] Tidak ada error di console browser
  - [ ] Responsive di mobile view
  - [ ] Dark mode toggle berfungsi

### Post-Deployment Checklist

- [ ] **Functionality**
  - [ ] Login berhasil dengan credentials valid
  - [ ] Dashboard data tampil (jika backend ready)
  - [ ] Navigasi antar halaman lancar
  - [ ] Export PDF/Excel berfungsi
  - [ ] Search dan filter bekerja

- [ ] **Performance**
  - [ ] Page load < 3 detik
  - [ ] No blocking resources
  - [ ] Images loaded properly

- [ ] **Security**
  - [ ] HTTPS aktif (SSL certificate)
  - [ ] No mixed content warnings
  - [ ] CORS configured properly dengan backend

- [ ] **Browser Compatibility**
  - [ ] Test di Chrome (latest)
  - [ ] Test di Firefox (latest)
  - [ ] Test di Safari (latest)
  - [ ] Test di Edge (latest)
  - [ ] Test di mobile browsers

- [ ] **SEO & Meta Tags**
  - [ ] Favicon tampil
  - [ ] Title page benar
  - [ ] Meta description ada (opsional)

---

## 🐛 Troubleshooting

### Problem 1: API Connection Failed

**Gejala:** Console error "Failed to fetch" atau "Network Error"

**Solusi:**

1. Cek `API_BASE_URL` di `.env.production`
2. Pastikan backend sudah running
3. Cek CORS settings di backend
4. Verifikasi network firewall tidak block

### Problem 2: Blank Page After Deploy

**Gejala:** Halaman putih, tidak ada error

**Solusi:**

1. Cek console browser (F12)
2. Pastikan path assets benar (relative path)
3. Cek nginx/apache configuration
4. Verifikasi file `index.html` ada di root

### Problem 3: 404 on Page Refresh

**Gejala:** Refresh halaman selain home = 404

**Solusi:**

- Konfigurasi server untuk SPA (Single Page App)
- Nginx: `try_files $uri $uri/ /index.html;`
- Apache: `.htaccess` dengan RewriteRule

### Problem 4: Images Not Loading

**Gejala:** Logo atau gambar tidak tampil

**Solusi:**

1. Cek path di HTML (harus relative)
2. Verifikasi file ada di `build/src/images/`
3. Cek nginx/apache serving static files
4. Clear browser cache

### Problem 5: API Proxy Not Working

**Gejala:** Development OK, production 404 di API

**Solusi:**

- Update `API_BASE_URL` ke full URL backend public yang dipakai production
- Untuk static production Infinite Track saat ini, **tetap gunakan prefix API final** pada base URL
- Contoh current contract: `API_BASE_URL=https://api.infinite-track.tech/api`
- Jika memakai domain backend lain, tetap gunakan URL public yang sudah mencakup prefix API final, misalnya `https://api.yourdomain.com/api`

### Problem 6: Environment Variables Not Applied

**Gejala:** Masih menggunakan default values

**Solusi:**

1. Pastikan build dengan `NODE_ENV=production`
2. Pastikan nilai env production benar-benar masuk ke environment build aktif (jangan asumsi `.env.production` dibaca otomatis)
3. Rebuild setelah export / sinkronisasi env yang benar
4. Clear cache: `rm -rf build && npm run build`

---

## ↩️ Rollback Procedure

### Kapan rollback dilakukan

Pertimbangkan rollback jika salah satu kondisi berikut terjadi setelah deploy/promotion:

- artifact static berhasil publish tetapi frontend blank / broken pada browser
- login, bootstrap session, atau navigasi utama gagal setelah perubahan frontend/env/build
- production memakai `API_BASE_URL` atau env build-time yang salah
- export/reporting smoke gagal karena perubahan frontend deploy terbaru
- PR `develop` -> `master` sudah dipromosikan tetapi smoke production menunjukkan regression yang jelas

Jangan langsung rollback frontend jika akar masalahnya adalah backend outage murni, DNS/SSL eksternal, atau incident yang tidak dipicu oleh perubahan frontend release terbaru.

### Decision tree singkat

1. **Build/CI gagal sebelum release-ready**
   - Stop release. Perbaiki build/config terlebih dahulu.
   - Belum perlu rollback production karena artifact baru belum valid.

2. **Deploy static berhasil tetapi runtime browser langsung broken**
   - Cek asset path, output artifact, dan env build-time.
   - Jika regression berasal dari deploy frontend terbaru, rollback ke deployment/artifact sebelumnya yang sudah punya smoke evidence.

3. **Auth/API flow gagal setelah deploy**
   - Verifikasi apakah penyebabnya CORS, wrong `API_BASE_URL`, atau backend outage.
   - Jika dipicu deploy/config frontend terbaru, rollback frontend.
   - Jika backend outage berdiri sendiri, frontend rollback belum tentu menyelesaikan insiden.

4. **Promotion `develop` -> `master` sudah merge tetapi release tidak sehat**
   - Gunakan revert PR / revert commit yang traceable di release flow.
   - Pastikan hosting kembali menunjuk ke deployment/artifact terakhir yang sehat.

### Bentuk rollback yang didukung secara operasional

- **Rollback hosting/static deployment**
  - redeploy previous static deployment / previous successful artifact pada platform hosting
  - cocok untuk incident yang jelas berasal dari artifact frontend terakhir
- **Rollback release flow (`master`)**
  - revert commit/PR promotion yang membawa regression
  - cocok jika branch release sudah bergerak dan perlu audit trail yang jelas
- **Rollback env/build config**
  - kembalikan `API_BASE_URL` atau build-time env lain ke nilai yang sudah terbukti sehat, lalu rebuild/redeploy
  - cocok untuk incident contract/env drift

### Platform-specific rollback steps

#### Netlify

1. Buka Netlify Dashboard → pilih site Web FE production.
2. Masuk ke **Deploys** dan cari deployment terakhir yang sehat berdasarkan timestamp, commit SHA, atau deploy note.
3. Pilih **Publish deploy** pada deployment sehat tersebut.
4. Jika insiden berasal dari env build-time, perbaiki env di **Site configuration → Environment variables**, lalu trigger deploy baru dari commit/artifact sehat.
5. Jalankan post-rollback verification dan catat deploy ID yang dipublish ulang.

#### Vercel

1. Buka Vercel Dashboard → pilih project Web FE production.
2. Masuk ke **Deployments** dan identifikasi deployment terakhir yang sehat berdasarkan commit SHA / production alias sebelumnya.
3. Gunakan action rollback / promote pada deployment sehat agar production domain kembali menunjuk ke deployment tersebut.
4. Jika env build-time salah, koreksi **Project Settings → Environment Variables** untuk environment production, lalu redeploy commit sehat.
5. Jalankan post-rollback verification dan catat deployment URL/ID.

#### Firebase Hosting

1. Buka Firebase Console → Hosting → pilih site/channel production.
2. Review release history dan pilih release terakhir yang sehat.
3. Gunakan rollback ke release tersebut melalui Console atau CLI sesuai akses operator.
4. Jika perlu CLI, gunakan project/site production yang benar dan verifikasi target sebelum menjalankan rollback.
5. Jalankan post-rollback verification dan catat release ID.

#### VPS / Nginx / Apache

1. Freeze upload/deploy baru ke host production selama rollback.
2. Restore direktori `build/` dari backup artifact terakhir yang sehat atau rsync ulang artifact sehat ke document root production.
3. Jika memakai symlink release directory, pindahkan symlink current ke release sehat lalu reload web server.
4. Jika config web server ikut berubah, restore config sehat dan jalankan config test sebelum reload (`nginx -t` untuk Nginx, `apachectl configtest` untuk Apache bila tersedia di host).
5. Reload service web server, jangan restart penuh kecuali diperlukan.
6. Jalankan post-rollback verification dan catat artifact path / release directory yang aktif.

> `Needs Verification`: nama menu/action tiap platform bisa berubah dan akses dashboard/CLI bergantung role operator. Treat langkah di atas sebagai runbook operasional; bukti final tetap berasal dari dashboard/platform production nyata.

### Communication protocol saat rollback

1. **Declare incident:** PIC release menyatakan status rollback dimulai, gejala, impact user, dan kandidat penyebab di channel operasional yang disepakati.
2. **Assign roles:** tetapkan rollback owner, verifier, dan communicator. Satu orang memegang keputusan publish/redeploy untuk menghindari double action.
3. **Freeze changes:** hentikan deploy/promotion baru sampai rollback selesai dan smoke sehat.
4. **Update cadence:** kirim update singkat tiap 10-15 menit atau setiap milestone penting: decision, rollback action started, rollback action completed, smoke result.
5. **Completion notice:** setelah sehat, umumkan deployment/artifact aktif, hasil smoke, sisa risiko, dan next action RCA/prevention.
6. **Escalation:** jika rollback tidak memulihkan service, eskalasi ke backend/platform owner karena akar masalah mungkin bukan artifact Web FE terbaru.

### Prevention measures setelah rollback

- Tambahkan regression yang memicu rollback ke pre-release smoke checklist bila belum ada.
- Simpan mapping release antara commit SHA, deployment ID, build env, dan hasil smoke agar target rollback berikutnya tidak ambigu.
- Pastikan env build-time production (`API_BASE_URL`, `APP_ENVIRONMENT`, `DEBUG_MODE`, `LOG_LEVEL`) punya owner dan review sebelum promotion ke `master`.
- Verifikasi CORS production setiap kali domain Web FE, domain backend, atau auth transport berubah.
- Gunakan canary/preview deployment untuk smoke sebelum production publish jika platform mendukung.
- Lakukan post-incident review dan buat follow-up issue untuk gap yang tidak bisa diperbaiki langsung di rollback window.

### Rollback metadata

- **Owner:** Web FE release owner bersama platform/backend owner saat insiden menyentuh CORS, auth transport, DNS, SSL, atau backend availability.
- **Last Updated:** 2026-07-03.
- **Review Cadence:** review minimal setiap release mayor, setiap perubahan hosting/env production, atau setelah rollback/incident production.

### Evidence minimum saat rollback

Catat minimal hal berikut:

- incident timestamp
- gejala yang memicu rollback
- target rollback (commit, PR, deployment ID, atau artifact)
- approver / decision owner
- hasil post-rollback smoke

### Post-rollback verification

- frontend domain bisa dibuka
- halaman signin tampil
- endpoint protected yang dituju oleh `API_BASE_URL` production kembali reachable dan memberi auth-required response yang sesuai (misalnya anonymous `401`), bukan `404` / network error
- jika credentials tersedia, login + dashboard smoke diulang
- browser console dan hosting logs tidak menunjukkan error blocking baru

> `Needs Verification`: langkah rollback spesifik hosting production (misalnya previous deployment selection di DigitalOcean App Platform) tetap perlu dibuktikan di dashboard/platform nyata.

## 📞 Support & Resources

### Dokumentasi Teknologi

- [Webpack Documentation](https://webpack.js.org/concepts/)
- [Alpine.js Guide](https://alpinejs.dev/start-here)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Deployment Platforms

- [Netlify Docs](https://docs.netlify.com/)
- [Vercel Docs](https://vercel.com/docs)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

### Monitoring & Analytics (Opsional)

- Google Analytics
- Sentry (Error tracking)
- LogRocket (User session recording)

---

## 📝 Notes

1. **Backup:** Selalu backup sebelum deploy ke production
2. **Testing:** Test di staging environment dulu jika ada
3. **Monitoring:** Setup monitoring untuk track errors
4. **Documentation:** Update dokumentasi setelah deployment
5. **Team:** Informasikan tim tentang URL production

---

**Last Updated:** 2026-07-03
**Version:** 1.0.0
**Maintainer:** Development Team
