# ⚡ CHECKLIST CEPAT DEPLOYMENT - INFINITE TRACK

## 🚨 KRUSIAL - WAJIB DILAKUKAN!

### 1️⃣ Buat File Environment Variables

**File: `.env.production`** (Buat manual, tidak di-commit ke git)

```env
# GANTI URL INI dengan backend Anda!
API_BASE_URL=https://api.yourdomain.com

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

- [ ] File referensi `.env.production.example` sudah disiapkan, dan untuk simulasi build production lokal sudah dicopy ke `.env.production`
- [ ] `API_BASE_URL` sudah diubah ke backend production (tanpa trailing slash)
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

- [ ] `BACKEND_REPO_PATH` diarahkan ke repo backend lokal yang benar sebelum menjalankan `docker compose --profile dev up --build`
- [ ] Tambahkan `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan `CLOUDINARY_API_SECRET` saat smoke test Docker lokal karena backend saat ini membutuhkannya untuk startup sukses
- [ ] Development gateway flow diverifikasi dengan stack Compose aktif dan trafik browser masuk lewat service `nginx` setelah menjalankan `docker compose --profile dev up --build`
- [ ] Jika memakai mode staging-like, jalankan `NGINX_MODE=staging docker compose --profile staging up --build` lalu verifikasi HTTP setelah service `frontend-build` selesai mempopulasi volume `frontend_dist`

### Docker Gateway Verification

- [ ] Verifikasi gateway NGINX merespons pada port host yang dipakai, misalnya `curl -I http://localhost:8080`
- [ ] Jika port gateway dioverride, verifikasi endpoint yang sesuai, misalnya `curl -I http://localhost:8081`
- [ ] Pastikan `/api` diproxy lewat gateway ke backend container, bukan lagi asumsi lama `localhost:3005`
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

**CRITICAL:** Pastikan `API_BASE_URL` di env build-time production benar. Jika memakai `.env.production` untuk simulasi lokal, nilainya harus sama dengan contract production dan tidak memakai trailing slash.

Contoh konfigurasi yang direkomendasikan untuk static production:

- Backend di subdomain: `https://api.yourdomain.com`

Catatan:
- Untuk production static site, gunakan backend public URL eksplisit.
- Jangan mengandalkan local `/api` gateway sebagai production default kecuali memang ada reverse proxy production yang sengaja disiapkan.

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
| API 404 Error       | Update `API_BASE_URL` di env build-time production atau `.env.production` lokal |
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

- ✅ Docker gateway workflow untuk local/staging-like verification sudah terdokumentasi
- ✅ Verifikasi yang terbukti di worktree ini mencakup build FE, boot stack Docker dev, dan respons gateway HTTP 200
- ✅ Baseline CI sekarang mencakup build verification untuk PR ke `develop`, push ke `develop`, dan promotion PR ke `master`
- ✅ `master` adalah branch final yang dimaksudkan menjadi release / deploy source dalam workflow repo ini
- ⚠️ `Needs Verification`: required status check, branch protection GitHub UI, direct-push restriction, dan source-branch restriction ke `master` benar-benar sudah enforced
- ⚠️ `Needs Verification`: source branch, build command, dan output directory pada static hosting production sudah benar
- ⚠️ Cloudinary env masih perlu disuplai saat smoke test backend lokal di Docker
- ⚠️ **TINGGAL:** Configure environment variables
- ⚠️ **TINGGAL:** Deploy ke hosting pilihan Anda
- ⚠️ **TINGGAL:** Jalankan post-deploy smoke checks sebelum menyebut snapshot ini production-ready

**Lanjutkan deployment dengan verifikasi bertahap.**
