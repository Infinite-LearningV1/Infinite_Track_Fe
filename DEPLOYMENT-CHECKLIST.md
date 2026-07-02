# ⚡ CHECKLIST CEPAT DEPLOYMENT - INFINITE TRACK

## 🚨 KRUSIAL - WAJIB DILAKUKAN!

### 1️⃣ Buat File Environment Variables

**File: `.env.production`** (Buat manual, tidak di-commit ke git)

```env
# Production Infinite Track memakai prefix /api di backend public.
API_BASE_URL=https://api.infinite-track.tech/api

API_AUTH_ENDPOINT=/auth
API_VERSION=v1
APP_NAME=Infinite Track
APP_VERSION=2.0.1
APP_ENVIRONMENT=production
SESSION_TIMEOUT=3600000
REMEMBER_ME_DAYS=7
DEFAULT_LANGUAGE=id
TIMEZONE=Asia/Jakarta
DEBUG_MODE=false
LOG_LEVEL=error
```

### 2️⃣ Perbaiki Git Status

```bash
# Add file logo baru
git add src/images/logo/auth_logo.svg
git add src/images/logo/logo_dark.svg

# Remove file logo lama
git rm src/images/logo/auth-logo.svg
git rm src/images/logo/logo-dark.svg
git rm src/images/logo/logo-icon.svg

# Commit
git commit -m "Fix: Update logo files and prepare for deployment"
```

### 3️⃣ Install Dependencies Baru

```bash
npm ci
```

### 4️⃣ Build Production

```bash
npm run build
```

### 5️⃣ Test Build Locally

```bash
npm install -g serve
serve -s build -p 3000
# Buka: http://localhost:3000
```

---

## 📋 Checklist Lengkap

## Governance Reminder

- [ ] Verifikasi evidence untuk perubahan deploy/runtime sudah jelas, atau tandai `REQUIRES REPO VERIFICATION` bila jalur verifikasinya belum terkunci.
- [ ] Tinjau kebutuhan update `CLAUDE.md` / ADR bila perubahan menggeser env, build, deploy, atau runtime assumptions.
- [ ] `Needs Verification`: branch protection / GitHub ruleset benar-benar mewajibkan status check workflow build pada PR ke `develop` dan PR promotion ke `master`.
- [ ] `Needs Verification`: source branch static hosting production memang menunjuk ke `master` sebagai branch final.

#### GitHub Ruleset Verification (2026-07-02)

> External snapshot via GitHub API/rulesets on 2026-07-02. Re-verify in GitHub UI before release / promotion approval.

- [x] ✅ Active branch ruleset for `develop`: `develop — integration gate` on `refs/heads/develop`
- [x] ✅ Active branch ruleset for `master`: `master — release-ready gate` on `refs/heads/master`
- [x] ✅ Both rulesets block deletion dan non-fast-forward pushes
- [x] ✅ Both rulesets require pull request review dengan minimum 1 approval, stale review dismissal, dan resolved review threads
- [x] ✅ `develop` ruleset juga mewajibkan linear history
- [ ] 🔍 **GAP:** Active rulesets yang terdeteksi tidak menampilkan required status check untuk workflow build
- [ ] 🔍 **GAP:** Repo workflow `.github/workflows/build.yml` saat ini hanya trigger PR/push ke `develop`, belum ke promotion PR target `master`

### Layer 1 — Pre-Build Readiness

> Tujuan layer ini: memastikan input build sudah siap sebelum ada klaim smoke / deploy success.

- [ ] File `.env.production` atau build-time env production setara sudah disiapkan (`REQUIRES REPO VERIFICATION`)
- [ ] `API_BASE_URL` sudah mengarah ke backend public URL yang benar dan mencakup prefix API final
- [ ] Git status branch kerja bersih dari perubahan tak terkait
- [ ] Dependencies ter-install (`npm ci` untuk baseline reproducible, atau `npm install` bila konteksnya local iteration biasa)

- [ ] Workflow build lulus pada PR ke `develop`
- [ ] Promotion PR `develop` -> `master` memiliki evidence build yang cukup; repo workflow saat ini belum trigger otomatis ke target `master`
- [ ] `npm run build` berhasil tanpa error
- [ ] Folder `build/` ter-generate dengan lengkap
- [ ] File `bundle.js` dan `style.css` ada

> Tujuan layer ini: membuktikan bundle frontend masih bisa dibentuk dari repo. Ini **bukan** bukti production runtime.

- [ ] Workflow build lulus pada PR ke `develop` (evidence: GitHub check / CI log)
- [ ] Promotion PR `develop` -> `master` punya evidence build yang cukup; jangan asumsi workflow otomatis berjalan untuk target `master`
- [ ] `npm run build` berhasil tanpa error (`REQUIRES REPO VERIFICATION` bila belum dijalankan fresh)
- [ ] Folder `build/` ter-generate fresh setelah build, bukan output lama
- [ ] File utama hasil build ada: `index.html`, `bundle.js`, `style.css`

### Layer 3 — Local Static Smoke

> Tujuan layer ini: memastikan artifact `build/` benar-benar bisa disajikan sebagai static site sebelum upload/deploy.

- [ ] Jalankan static server lokal, misalnya `serve -s build -p 3000` (`REQUIRES REPO VERIFICATION` bila command belum dijalankan)
- [ ] Halaman signin bisa dibuka dari artifact static
- [ ] Logo / file assets tampil
- [ ] Dark mode toggle berfungsi
- [ ] Responsive di mobile view dasar
- [ ] Browser console tidak menunjukkan error blocking saat startup

### Layer 4 — Anonymous API Contract Smoke

> Tujuan layer ini: memverifikasi contract API public + prefix production tanpa memakai credentials nyata.

- [ ] Endpoint protected pada target `API_BASE_URL` production reachable dan memberi auth-required response yang sesuai (misalnya `401`), serta **bukan** `404` / network error
- [ ] Verifikasi bahwa contract Web FE production memang memakai `API_BASE_URL` yang mencakup prefix API final `/api`; route tanpa prefix bukan success evidence untuk frontend contract
- [ ] Tidak ada CORS / network error saat browser mencoba bootstrap anonymous flow

### Layer 5 — Deployment Readiness

> Tujuan layer ini: memastikan artifact dan target release branch siap dipromosikan / diupload.

- [ ] Upload folder `build/` ke hosting static production
- [ ] Setup SSL certificate (HTTPS)
- [ ] Jika memakai DigitalOcean App Platform Static Site, pastikan source branch final adalah `master`, build command benar, dan output directory mengarah ke artifact static yang tepat
- [ ] Promotion PR `develop` -> `master` punya evidence review + build yang cukup sebelum `master` diperlakukan release-ready; jangan asumsi workflow `build.yml` otomatis berjalan untuk target `master`
- [ ] Test akses dari domain production

### Docker Compose Verification

- [ ] `BACKEND_IMAGE` menunjuk ke image backend yang tersedia dan listen pada port container `3005`
- [ ] Development profile diverifikasi dengan `docker compose --profile dev up --build`
- [ ] Staging-like profile diverifikasi dengan `docker compose --profile staging up --build`
- [ ] Staging-like mode memakai artifact container untuk membangun dan menyalin output frontend ke volume `frontend_dist`, bukan build manual host sebelum Compose
- [ ] `nginx-staging` menunggu marker artifact dari `frontend-build` sebelum gateway dianggap siap menyajikan aset

### Docker Gateway Verification

- [ ] Verifikasi gateway NGINX merespons pada port host default, misalnya `curl -I http://localhost:8080`
- [ ] Jika `GATEWAY_PORT` dioverride, verifikasi endpoint yang sesuai, misalnya `curl -I http://localhost:8081`
- [ ] Pastikan `/api` diproxy lewat gateway ke backend container `backend:3005`
- [ ] Gunakan `docker compose down` untuk stop stack, atau `docker compose down -v` bila juga ingin membersihkan volume lokal

### Layer 6 — Post-Deploy Authenticated Smoke

> Tujuan layer ini: membuktikan flow runtime utama bekerja setelah deploy. Layer ini membutuhkan browser/runtime evidence dan biasanya `EXTERNAL VERIFICATION REQUIRED` bila credentials tidak tersedia di sesi ini.

- [ ] Login berhasil dengan account yang diizinkan
- [ ] Dashboard data tampil sesuai role / akses account
- [ ] Navigasi antar halaman utama berjalan tanpa error blocking
- [ ] Export PDF/Excel berfungsi untuk flow yang memang tersedia di production
- [ ] Search / filter utama bekerja pada halaman yang relevan

### Layer 7 — Post-Deploy Browser / Ops Smoke

- [ ] Test di Chrome latest
- [ ] Test di Firefox latest
- [ ] Test di Edge latest
- [ ] Test di mobile browser / responsive viewport yang disepakati
- [ ] Browser console bersih dari error runtime yang blocking
- [ ] Monitor error logs / hosting logs setelah deploy
- [ ] Catat evidence hasil smoke (screenshot, console capture, atau issue/PR note)

---

## 🎯 Yang Perlu Diperhatikan Khusus

### 1. Backend API Integration

**CRITICAL:** Pastikan `API_BASE_URL` di `.env.production` atau env build-time production benar.

Contoh konfigurasi yang direkomendasikan untuk static production Infinite Track:

- Backend public dengan prefix API final: `API_BASE_URL=https://api.infinite-track.tech/api`
- Jika memakai domain lain, pastikan nilai `API_BASE_URL` tetap mencakup prefix API final, misalnya `https://api.yourdomain.com/api`.

Catatan:
- Untuk production static site, gunakan backend public URL eksplisit yang sudah mencakup prefix API final.
- Jangan mengandalkan local `/api` gateway sebagai production default kecuali memang ada reverse proxy production yang sengaja disiapkan.
- Verifikasi cepat: `https://api.infinite-track.tech/api/settings/operational` boleh mengembalikan `401 Unauthorized` saat belum login, tetapi tidak boleh `404`. Route tanpa prefix seperti `https://api.infinite-track.tech/settings/operational` bukan contract production Web FE.

### 2. CORS Configuration

Backend harus mengizinkan origin frontend production secara eksplisit dan mendukung credentialed browser requests untuk auth/session flow.

> Karena Web FE mengirim request auth dengan `withCredentials: true`, CORS production **tidak boleh** memakai wildcard origin. Origin harus spesifik, `credentials` harus diaktifkan bila flow memakai cookie/session, dan preflight harus lolos untuk header yang dipakai frontend.

Contoh backend (Express.js):

```javascript
app.use(
  cors({
    origin: "https://yourdomain.com",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Client-Type"],
  }),
);
```

Jika suatu endpoint benar-benar membutuhkan header `Authorization`, tambahkan hanya untuk endpoint/flow yang memang menggunakannya; jangan asumsikan semua request Web FE mengirim bearer token karena repo auth runtime saat ini justru membersihkan Authorization dari protected request flow.

Checklist validasi CORS:

- origin frontend production tercantum spesifik
- credentialed requests diizinkan bila session/cookie dipakai
- preflight `OPTIONS` lolos untuk `Content-Type` dan `X-Client-Type`
- browser tidak menampilkan CORS/network error saat login atau bootstrap session

### 3. File Assets

Semua file di `build/src/images/` harus bisa diakses:

- `build/src/images/logo/logo.svg`
- `build/src/images/logo/auth_logo.svg`
- `build/src/images/logo/logo_dark.svg`

### 4. Server Configuration

Untuk SPA, server harus redirect semua request ke `index.html`

**Nginx:**

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Apache (.htaccess):**

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

## 🚀 Quick Deploy Commands

### Deploy ke Netlify

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=build
```

### Deploy ke Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Deploy ke Firebase

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Deploy ke VPS (via SCP)

```bash
scp -r build/* user@your-server:/var/www/infinitetrack/
```

---

## ⚠️ Common Issues & Solutions

| Problem             | Solution                                   |
| ------------------- | ------------------------------------------ |
| API 404 Error       | Update `API_BASE_URL` di `.env.production` |
| Blank page          | Check console, verify assets path          |
| 404 on refresh      | Configure server for SPA routing           |
| Images not loading  | Verify `build/src/images/` exists          |
| CORS error          | Configure backend CORS settings            |
| No env vars applied | Rebuild: `rm -rf build && npm run build`   |

---

## 📞 Rollback & Incident Response

Jika ada masalah serius saat deployment, gunakan decision tree berikut sebelum memilih rollback path.

### Decision Tree

1. **Build gagal sebelum release branch / artifact dipromosikan**
   - Jangan deploy paksa.
   - Perbaiki build/config lebih dulu.
   - Release belum valid, jadi rollback production belum relevan.

2. **Artifact static sudah terdeploy, tetapi browser/runtime langsung broken**
   - Cek apakah masalahnya berasal dari env/build contract (`API_BASE_URL`, wrong asset path, wrong output artifact).
   - Jika ya, rollback ke deployment static sebelumnya atau redeploy artifact terakhir yang diketahui sehat.

3. **Frontend baru naik, tetapi API/auth flow gagal**
   - Pisahkan apakah masalahnya CORS / env base URL / backend outage.
   - Jika penyebabnya frontend deploy/config baru, rollback frontend.
   - Jika penyebabnya backend outage tanpa perubahan frontend, rollback frontend biasanya tidak menyelesaikan insiden; eskalasi backend.

4. **Promotion `develop` -> `master` sudah merge tetapi release ternyata tidak sehat**
   - Buat revert path yang jelas pada branch/release flow.
   - Gunakan revert PR / commit rollback yang traceable, lalu pastikan hosting kembali menunjuk ke artifact/deployment yang sehat.

### Minimum Rollback Evidence

- [ ] Catat incident timestamp
- [ ] Catat trigger rollback (contoh: blank page, auth fail, export fail, CORS/network error)
- [ ] Catat rollback target (commit / PR / deployment ID / previous App Platform deployment)
- [ ] Catat siapa yang menyetujui rollback
- [ ] Jalankan post-rollback smoke minimal
- [ ] Lampirkan evidence ke issue / PR / release note

### Minimum Post-Rollback Smoke

- [ ] Frontend domain kembali bisa dibuka
- [ ] Halaman signin tampil
- [ ] Endpoint protected yang dituju oleh `API_BASE_URL` production kembali reachable dan memberi auth-required response yang sesuai (misalnya anonymous `401`), bukan `404` / network error
- [ ] Jika credentials tersedia, login + dashboard smoke diulang
- [ ] Browser console / hosting logs tidak menunjukkan error rollback yang blocking

### Quick Response Actions

1. **Check Logs:** Browser console + hosting/server logs
2. **Verify Backend:** Pastikan backend accessible sebelum menyalahkan frontend artifact
3. **Test Locally:** Reproduce issue dari artifact/build branch bila perlu
4. **Rollback:** gunakan deployment/commit terakhir yang sudah terbukti sehat, bukan snapshot yang belum punya smoke evidence

---

## 📝 Final Notes

- ✅ Baseline CI repo saat ini mencakup build verification untuk PR ke `develop` dan push ke `develop`; promotion PR ke `master` masih butuh evidence build terpisah atau perubahan workflow
- ✅ `master` adalah branch final yang dimaksudkan menjadi release / deploy source dalam workflow repo ini
- ✅ Docker gateway workflow lokal sekarang memakai `BACKEND_IMAGE`, profile `dev`, profile `staging`, dan NGINX sebagai browser entrypoint
- ⚠️ `Needs Verification`: required status check, branch protection GitHub UI, direct-push restriction, dan source-branch restriction ke `master` benar-benar sudah enforced
- ⚠️ `Needs Verification`: source branch, build command, dan output directory pada static hosting production sudah benar
- ⚠️ `Needs Verification`: image backend lokal yang dipakai untuk Compose benar-benar listen pada port container `3005`
- ⚠️ **TINGGAL:** Configure environment variables
- ⚠️ **TINGGAL:** Deploy ke hosting pilihan Anda
- ⚠️ **TINGGAL:** Jalankan post-deploy smoke checks sebelum menyebut snapshot ini production-ready

**Good luck dengan deployment! 🚀**
