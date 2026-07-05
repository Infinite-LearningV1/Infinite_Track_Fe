# PROJECT_STATUS — Web FE (Infinite_Track_Fe)

> File DINAMIS. Baca di awal task, update di akhir. Bukan tempat aturan permanen (CLAUDE.md) atau kontrak API (shared context).

## Snapshot
- Branch aktif: develop
- Baseline: NEEDS_BASELINE_FREEZE (dirty ~259 unstaged — BUKAN clean)
- CI: build-only. lint + test:auth-runtime BELUM di CI (harden dulu). Branch protection: NEEDS VERIFICATION.

## Sedang berjalan
- INF-160 dashboard cockpit (In Progress) — pakai kontrak baru: /api/summary/reports, param q, period daily/weekly/monthly/range, JANGAN period=all.

## PR terakhir
- (isi)

## Risiko / blocker aktif
- Baseline belum di-freeze.
- Mock/dev fallback di reportService jangan menutup kegagalan integrasi.
- Area sensitif: authService/authGuard/storageManager, env/webpack — manual-first / read-only dulu.

## Next safe action
- Harden CI (wire lint + test:auth-runtime), lalu freeze baseline.

## Catatan
- Konsumen kontrak backend. Jangan hitung truth sendiri.
