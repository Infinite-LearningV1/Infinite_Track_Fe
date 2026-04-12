# 🚀 PANDUAN DEPLOYMENT - INFINITE TRACK FRONTEND

## 📋 Daftar Isi

1. [Persiapan Sebelum Deploy](#persiapan-sebelum-deploy)
2. [Konfigurasi Environment](#konfigurasi-environment)
3. [Build Production](#build-production)
4. [Opsi Deployment](#opsi-deployment)
5. [Checklist Quality Assurance](#checklist-quality-assurance)
6. [Troubleshooting](#troubleshooting)

---

## Governance Note

Perubahan env, build, deploy, atau runtime assumption harus tetap selaras dengan root `CLAUDE.md` dan `docs/adr/ADR-006-env-build-and-deploy-runtime-truth.md`. Jika ada perubahan yang menggeser source of truth atau verification expectation, lakukan review docs/ADR agar tidak terjadi drift.

---

## 🔧 Persiapan Sebelum Deploy

### 1. Persyaratan Sistem

- Node.js >= 18.x
- npm >= 8.x atau yarn >= 1.22.x
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

---

## ⚙️ Konfigurasi Environment

### 1. Setup Environment Variables

**PENTING:** Sebelum build production, Anda HARUS mengonfigurasi file `.env.production`

```bash
# File .env.production sudah dibuat, edit dan sesuaikan:
nano .env.production
```

**Konfigurasi WAJIB yang harus diubah:**

```env
# ⚠️ GANTI dengan URL backend Anda yang sebenarnya!
API_BASE_URL=https://api.yourdomain.com

# Atau jika backend di subdomain yang sama:
# API_BASE_URL=https://yourdomain.com/api

# Atau jika menggunakan IP dan port:
# API_BASE_URL=http://192.168.1.100:3005
```

### 2. Verifikasi Konfigurasi

Pastikan konfigurasi berikut sesuai dengan kebutuhan:

| Variable          | Development   | Production                   | Keterangan                    |
| ----------------- | ------------- | ---------------------------- | ----------------------------- |
| `API_BASE_URL`    | `/api`        | `https://api.yourdomain.com` | **WAJIB diubah!**             |
| `APP_ENVIRONMENT` | `development` | `production`                 | Menentukan mode aplikasi      |
| `DEBUG_MODE`      | `true`        | `false`                      | Matikan di production         |
| `LOG_LEVEL`       | `info`        | `error`                      | Hanya log error di production |

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

### Opsi 1: Static Hosting (Paling Mudah)

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

### Opsi 3: Docker Container

1. **Buat Dockerfile:**

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. **Buat nginx.conf:**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. **Build dan Run:**

```bash
# Build image
docker build -t infinitetrack-frontend .

# Run container
docker run -d -p 80:80 --name infinitetrack infinitetrack-frontend
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

- Update `API_BASE_URL` ke full URL backend
- Jangan gunakan `/api` di production (kecuali ada nginx proxy)
- Contoh: `API_BASE_URL=https://api.yourdomain.com`

### Problem 6: Environment Variables Not Applied

**Gejala:** Masih menggunakan default values

**Solusi:**

1. Pastikan build dengan `NODE_ENV=production`
2. Rebuild setelah ubah `.env.production`
3. Clear cache: `rm -rf build && npm run build`

---

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

**Last Updated:** October 28, 2025  
**Version:** 1.0.0  
**Maintainer:** Development Team
