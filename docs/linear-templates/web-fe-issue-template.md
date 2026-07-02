# Web FE Linear Issue Template

Gunakan template ini untuk issue Web FE yang membutuhkan eksekusi implementasi, dokumentasi, verifikasi, atau release-readiness follow-up.

> Template ini mengikuti kontrak wajib di `CLAUDE.md`. Jika issue menyentuh area high-risk atau butuh evidence eksternal, jangan sederhanakan section-nya.

---

## Metadata

- **Linear ID:** `INF-XXX`
- **Title:** `<short-task-title>`
- **Branch name:** `docs-audit/INF-XXX-short-slug` / `feature/INF-XXX-short-slug` / `fix/INF-XXX-short-slug`
- **Worktree path:** `<absolute-worktree-path>`
- **Owner:** `<name>`
- **Target branch:** `develop`
- **Related PR / issue / doc:** `<links or refs>`

---

## 1. Tujuan task

- Jelaskan outcome yang ingin dicapai.
- Fokus pada perubahan yang benar-benar diharapkan, bukan hanya aktivitas yang dilakukan.

## 2. Fakta

- Cantumkan fakta repo/runtime/dashboard/API yang sudah diketahui.
- Sertakan file, branch, endpoint, workflow, dashboard, atau artifact yang menjadi sumber fakta.
- Jika ada conflict antar dokumen, tulis eksplisit.

## 3. Asumsi

- Tuliskan asumsi kerja yang belum terbukti penuh tetapi dipakai untuk mengeksekusi task.
- Jika asumsi berisiko tinggi, tandai alasannya.

## 4. Perlu verifikasi

- Pisahkan apa yang bisa diverifikasi dari repo vs apa yang butuh external evidence.
- Gunakan label berikut bila relevan:
  - `REQUIRES REPO VERIFICATION`
  - `EXTERNAL VERIFICATION REQUIRED`

## 5. Risiko perubahan

- Jelaskan risiko terhadap auth/session, RBAC, dashboard/reporting, env/build/deploy, service integration, atau maintainability bila relevan.
- Jika menyentuh area high-risk, sebutkan impact-nya.

## 6. Plan implementasi

- Tuliskan langkah implementasi yang konkret dan berurutan.
- Sebutkan reuse dari file/function/utility yang sudah ada bila ada.
- Jika task membutuhkan worktree, branch promotion, atau dashboard evidence, masukkan ke plan.

## 7. File/area terdampak

- Daftar file utama yang akan diubah atau diverifikasi.
- Untuk area luas, sebutkan pattern + representative files.

## 8. Verification plan

- Daftar command/manual checks yang akan dipakai.
- Untuk setiap check, jelaskan expected result singkat.
- Jika verification path belum terkunci, tulis `REQUIRES REPO VERIFICATION`.

## 9. Docs / ADR update note

- Tulis salah satu secara eksplisit:
  - `DOCS/ADR UPDATE REQUIRED`
  - `No ADR update expected`
- Gunakan `DOCS/ADR UPDATE REQUIRED` bila task menyentuh:
  - auth/session contract
  - route guard / RBAC expectation
  - dashboard/reporting responsibility
  - source-of-truth behavior across clients
  - env/deploy/build truth
  - observability baseline
  - major code organization changes

## 10. Review / PR / release / build notes

- Catat branch/worktree isolation.
- Catat PR target branch.
- Catat review expectations.
- Catat build/release implications.
- Jika ada blocker/gap, tulis jelas agar tidak tertelan di review.

---

# Quick checklist before marking issue done

- [ ] Scope jelas dan bounded
- [ ] Risiko perubahan dinyatakan eksplisit
- [ ] File/area terdampak disebut jelas
- [ ] Verification evidence ada atau sudah ditandai `REQUIRES REPO VERIFICATION`
- [ ] High-risk impact disebut bila relevan
- [ ] `DOCS/ADR UPDATE REQUIRED` ditulis bila applicable
- [ ] Review / PR / release / build notes terisi

---

# Example — docs / deploy issue

## Metadata

- **Linear ID:** `INF-191`
- **Title:** `Verify DO App Platform config`
- **Branch name:** `docs-audit/INF-191-do-app-platform`
- **Worktree path:** `C:\\Users\\...\\Infinite_Track_Fe-docs-audit-INF-191-do-app-platform`
- **Owner:** `<name>`
- **Target branch:** `develop`
- **Related PR / issue / doc:** `DEPLOYMENT.md`, `DEPLOYMENT-CHECKLIST.md`

## 1. Tujuan task

- Memverifikasi bahwa konfigurasi DigitalOcean App Platform production selaras dengan kontrak deployment repo.

## 2. Fakta

- `DEPLOYMENT.md` mendokumentasikan static production dengan `API_BASE_URL=https://api.infinite-track.tech/api`.
- App Platform adalah external state, bukan repo-only truth.

## 3. Asumsi

- App production yang aktif adalah app yang saat ini melayani domain Web FE.

## 4. Perlu verifikasi

- `EXTERNAL VERIFICATION REQUIRED` untuk screenshot/dashboard proof.

## 5. Risiko perubahan

- Wording docs yang salah dapat membuat deploy production memakai env/build contract yang keliru.

## 6. Plan implementasi

- Cek App Platform settings.
- Bandingkan source branch, build command, output dir, dan env vars terhadap docs repo.
- Update checklist evidence dan catat gap bila ada.

## 7. File/area terdampak

- `DEPLOYMENT-CHECKLIST.md`

## 8. Verification plan

- Cek App Platform via dashboard/API.
- Pastikan branch = `master`, build command = `npm run build`, output = `build`.

## 9. Docs / ADR update note

- `DOCS/ADR UPDATE REQUIRED`

## 10. Review / PR / release / build notes

- Kerja dilakukan di isolated worktree.
- PR target `develop`.
- Release tidak boleh disebut ready tanpa evidence eksternal yang cukup.
