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


### Pre-Build

- [ ] File `.env.production` sudah dibuat
- [ ] `API_BASE_URL` sudah diubah ke backend production
- [ ] Git status bersih (no conflicts)
- [ ] Dependencies ter-install (`npm ci` untuk clean install yang konsisten dengan baseline CI, atau `npm install` bila konteksnya local iteration biasa)

### Build

- [ ] Workflow build lulus pada PR ke `develop`
- [ ] Workflow build lulus pada promotion PR `develop` -> `master`
- [ ] `npm run build` berhasil tanpa error
- [ ] Folder `build/` ter-generate dengan lengkap
- [ ] File `bundle.js` dan `style.css` ada

### Testing Lokal

- [ ] Test dengan `serve -s build`
- [ ] Halaman signin bisa dibuka
- [ ] Logo tampil semua
- [ ] Dark mode toggle berfungsi
- [ ] Responsive di mobile view
- [ ] No error di browser console

### Deployment

- [ ] Upload folder `build/` ke hosting static production
- [ ] Setup SSL certificate (HTTPS)
- [ ] Jika memakai DigitalOcean App Platform Static Site, pastikan source branch final adalah `master`, build command benar, dan output directory mengarah ke artifact static yang tepat
- [ ] Promotion PR `develop` -> `master` sudah lulus workflow build sebelum `master` diperlakukan release-ready
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

### Post-Deployment

- [ ] Login berhasil
- [ ] Dashboard data tampil
- [ ] Export PDF/Excel berfungsi
- [ ] Test di berbagai browser
- [ ] Monitor error logs

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

Backend harus allow origin dari frontend domain Anda:

```javascript
// Contoh di backend (Express.js)
app.use(
  cors({
    origin: "https://yourdomain.com",
    credentials: true,
  }),
);
```

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

## 📞 Emergency Contacts

Jika ada masalah serius saat deployment:

1. **Rollback:** Deploy versi build sebelumnya
2. **Check Logs:** Browser console + Server logs
3. **Verify Backend:** Pastikan backend accessible
4. **Test Locally:** Reproduce issue di localhost

---

## 📝 Final Notes

- ✅ Baseline CI sekarang mencakup build verification untuk PR ke `develop`, push ke `develop`, dan promotion PR ke `master`
- ✅ `master` adalah branch final yang dimaksudkan menjadi release / deploy source dalam workflow repo ini
- ✅ Docker gateway workflow lokal sekarang memakai `BACKEND_IMAGE`, profile `dev`, profile `staging`, dan NGINX sebagai browser entrypoint
- ⚠️ `Needs Verification`: required status check, branch protection GitHub UI, direct-push restriction, dan source-branch restriction ke `master` benar-benar sudah enforced
- ⚠️ `Needs Verification`: source branch, build command, dan output directory pada static hosting production sudah benar
- ⚠️ `Needs Verification`: image backend lokal yang dipakai untuk Compose benar-benar listen pada port container `3005`
- ⚠️ **TINGGAL:** Configure environment variables
- ⚠️ **TINGGAL:** Deploy ke hosting pilihan Anda
- ⚠️ **TINGGAL:** Jalankan post-deploy smoke checks sebelum menyebut snapshot ini production-ready

**Good luck dengan deployment! 🚀**
