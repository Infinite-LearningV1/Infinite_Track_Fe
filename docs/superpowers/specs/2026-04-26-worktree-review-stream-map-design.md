# Worktree Review Stream Map Design

## Summary
Tetapkan peta review berbasis stream untuk seluruh worktree feature/manual agar semua pekerjaan dapat diarahkan ke target branch/PR siap review yang koheren. Model ini tidak memaksa satu worktree menjadi satu PR, tetapi memetakan worktree ke stream review final, lalu mengurutkannya berdasarkan kejelasan scope, beban verifikasi, dan risiko perubahan.

## Goal
1. Memetakan seluruh worktree feature/manual ke target branch/PR review final yang realistis.
2. Menetapkan canonical branch untuk setiap stream review.
3. Menentukan worktree mana yang hanya berperan sebagai fold source atau support artifact.
4. Mengurutkan stream secara actionable: mana yang dikerjakan sekarang, mana yang menunggu dependency, dan mana yang diparkir.

## Non-Goals
- Mengubah isi implementasi code di tiap stream.
- Menentukan langkah git operasional detail untuk merge/rebase/cherry-pick.
- Menetapkan command verifikasi repo yang belum locked.
- Memaksa semua worktree menjadi PR final sendiri.

## Context
Repo saat ini memakai banyak worktree yang mewakili beberapa jenis keadaan berbeda:
- branch review nyata dengan diff bersih terhadap `develop`
- branch integrasi atau hasil konsolidasi
- worktree local-only yang masih berupa edit belum committed
- worktree support/planning yang belum layak menjadi PR final

User ingin seluruh worktree dipetakan menjadi target branch/PR siap review dengan pendekatan hybrid:
- scope bersih lebih dulu
- lalu urutan ditentukan berdasarkan beban verifikasi dan risiko
- worktree yang belum matang boleh difold ke stream terdekat, tidak wajib menjadi PR sendiri

## Evidence Snapshot
### Fakta
Snapshot penting yang dipakai untuk pemetaan ini:
- `feature/branch-governance-only` adalah branch aktif dan sudah punya diff governance yang relatif bersih terhadap `develop`.
- `.worktrees/code-review-governance-artifacts` memiliki `dirty=0`, `ahead=2`, `files=5`.
- `.worktrees/codex-governance` memiliki `dirty=0`, `ahead=6`, `files=21`.
- `.worktrees/admin-table-standardization-dashboard-first` memiliki `dirty=4`, `ahead=2`, `files=8`.
- `.worktrees/runtime-audit-branch-governance` memiliki `dirty=0`, `ahead=5`, `files=8`.
- `.worktrees/inf-138-deploy-branch-cicd-baseline` (`deploy`) memiliki `dirty=0`, `ahead=5`, `files=12`.
- `.worktrees/inf-142-backend-operational-settings` memiliki `dirty=0`, `ahead=3`, `files=23`.
- `.worktrees/runtime-config-contract`, `.worktrees/webfe-standards-sync`, dan `.worktrees/webfe-agent-step2` memiliki `ahead=0` dan hanya local edits.
- `.claude/worktrees/feature+docker-compose-nginx-gateway` saat snapshot menempel ke `develop`, tetapi secara historis menyimpan implementasi Docker gateway yang relevan untuk stream deploy/runtime.

### Asumsi
- Worktree dengan `ahead=0` dan local edits tidak dianggap target PR final sendiri.
- Worktree dengan overlap substansial boleh diperlakukan sebagai source/fold branch untuk stream yang lebih matang.
- Stream review final adalah unit utama untuk readiness, bukan nama worktree itu sendiri.

### Perlu Verifikasi
- `REQUIRES REPO VERIFICATION`
- Perlu memastikan apakah beberapa worktree integrasi masih aktif dipromosikan atau sebenarnya sudah obsolete.
- Perlu memastikan canonical branch yang diinginkan user untuk masing-masing stream sebelum eksekusi git nyata.

## Design Decision
Pakai pendekatan **stream-based review map**.

Artinya:
- Setiap worktree dipetakan ke stream review final.
- Setiap stream punya satu canonical branch target untuk PR final.
- Worktree lain boleh menjadi subset, compare branch, fold source, atau support artifact.
- Readiness stream dinilai lebih dulu dari kejelasan scope, lalu dari beban verifikasi dan risiko.

## Review Streams

### Stream A — Governance / Review Workflow
Fokus pada governance workflow, codex review skills, aturan repo, dan dokumen pendukung review process.

**Canonical target:**
- `feature/branch-governance-only`

**Primary worktrees:**
- `.worktrees/code-review-governance-artifacts`
- `.worktrees/codex-governance`
- branch aktif `feature/branch-governance-only`

**Readiness rule:**
- Harus tetap bebas dari runtime truth, dashboard implementation, dan deploy implementation.
- Review readiness terutama ditentukan oleh boundary docs/rules yang bersih.

### Stream B — Dashboard / Reporting Standardization
Fokus pada dashboard state, reporting table behavior, report service, stats card group, dan surface API error behavior.

**Canonical target (recommended):**
- `feature/admin-table-standardization-dashboard-first`

**Compare / fold source:**
- `.worktrees/runtime-audit-branch-governance`

**Readiness rule:**
- Hanya boleh membawa perubahan yang benar-benar bagian dari dashboard/reporting.
- Transitional behavior harus jelas, termasuk bila masih ada fallback atau pergeseran ke server-driven flow.

### Stream C — Deploy / Runtime / Docker Truth
Fokus pada deploy docs, runtime config truth, webpack/env behavior, CI build verification, Docker/nginx gateway, dan konsistensi narasi deploy.

**Canonical target:**
- `deploy` di `.worktrees/inf-138-deploy-branch-cicd-baseline`

**Fold sources:**
- `.worktrees/runtime-config-contract`
- `.worktrees/webfe-standards-sync`
- `.claude/worktrees/feature+docker-compose-nginx-gateway`

**Readiness rule:**
- Docs, CI, config, dan Docker story harus konsisten satu sama lain.
- Karena menyentuh high-risk files, readiness tidak cukup hanya dari kebersihan diff; verification burden harus diasumsikan tinggi.

### Stream D — Backend Operational Settings
Fokus pada feature shell, service, page wiring, validation, dan truthfulness untuk backend operational settings, termasuk touchpoint auth/RBAC yang diperlukan.

**Canonical target:**
- `feature/inf-142-backend-operational-settings`

**Readiness rule:**
- Feature harus tetap fokus dan tidak berubah menjadi PR dashboard/reporting umum.
- Karena menyentuh `authGuard` dan `roleBasedAccess`, stream ini dianggap high-risk dan perlu boundary yang tegas terhadap stream dashboard.

### Stream E — Support / Planning / Parking
Fokus pada design-only artifacts, helper worktrees, atau branch yang belum cukup material untuk menjadi PR feature final.

**Default contents:**
- `.worktrees/linear-fe-wave-grouping`
- `.worktrees/do-app-platform-static-site-production`
- `.worktrees/webfe-agent-step2`

**Readiness rule:**
- Bukan target PR utama secara default.
- Hanya dipromosikan jika ada implementation scope nyata atau dibutuhkan sebagai supporting doc untuk stream lain.

## Readiness Model
Setiap worktree/stream dinilai dengan empat status:

- **R1 — Review-ready now**
  Scope jelas, diff koheren, blocker rendah.
- **R2 — Review-ready after fold**
  Target stream sudah jelas, tetapi masih butuh menyerap atau membandingkan source lain.
- **R3 — Needs cleanup before review**
  Scope masih mixed atau verification gap terlalu besar.
- **R4 — Support/parking only**
  Bukan kandidat PR final saat ini.

## Concrete Worktree Mapping

| Worktree / Branch | Stream | Status | Reasoning | Final Target |
| --- | --- | --- | --- | --- |
| `feature/branch-governance-only` | A Governance | R1 | Sudah menjadi hasil konsolidasi governance yang paling dekat ke PR final | Governance final PR |
| `.worktrees/code-review-governance-artifacts` | A Governance | R1 | Bersih, kecil, fokus, cocok sebagai subset/source branch | Fold/compare into Governance final PR |
| `.worktrees/codex-governance` | A Governance | R2 | Matang, tetapi lebih lebar dan berpotensi overlap dengan governance final | Compare/fold into Governance final PR |
| `.worktrees/admin-table-standardization-dashboard-first` | B Dashboard/reporting | R2 | Branch diff dashboard cukup jelas, tetapi masih dirty | Dashboard/reporting final PR |
| `.worktrees/runtime-audit-branch-governance` | B Dashboard/reporting | R2 | Clean dan reviewable, tetapi overlap substansi dengan dashboard standardization | Compare/fold into Dashboard/reporting final PR |
| `.worktrees/inf-138-deploy-branch-cicd-baseline` (`deploy`) | C Deploy/runtime/Docker | R1 | Clean, ahead, dan boundary deploy/runtime cukup nyata | Deploy/runtime final PR |
| `.worktrees/runtime-config-contract` | C Deploy/runtime/Docker | R2 | Local-only edits, tetapi file sentuhnya tepat untuk stream deploy/runtime | Fold into Deploy/runtime final PR |
| `.worktrees/webfe-standards-sync` | C Deploy/runtime/Docker / E Support | R2/R4 | Jika isinya sinkronisasi deploy docs, fold ke deploy; jika tidak, parkir | Prefer fold into Deploy/runtime final PR |
| `.claude/worktrees/feature+docker-compose-nginx-gateway` | C Deploy/runtime/Docker | R2 | Relevan sebagai source historis implementasi Docker gateway | Source for Deploy/runtime final PR |
| `.worktrees/inf-142-backend-operational-settings` | D Backend operational settings | R2 | Feature coherent, tetapi overlap dengan dashboard/service/auth area | Backend operational settings final PR |
| `.worktrees/linear-fe-wave-grouping` | E Support | R4 | Hanya design/support artifact | No PR by default |
| `.worktrees/do-app-platform-static-site-production` | E Support | R4 | Belum cukup material sebagai PR final sendiri | No PR by default |
| `.worktrees/webfe-agent-step2` | E Support | R4 | Helper/local artifact, bukan branch review final | No PR by default |

## Execution Order and Parallelism

### Wave 1 — Safe to run in parallel
#### 1. Governance final
**Canonical target:** `feature/branch-governance-only`

Reasoning:
- Scope paling bersih.
- Risiko runtime paling rendah.
- Verification burden paling ringan.
- Bisa ditutup cepat dan tidak tergantung stream teknis lain.

#### 2. Deploy/runtime/Docker final
**Canonical target:** `deploy`

Reasoning:
- Stream utamanya sudah clean.
- Boundary deploy/runtime cukup jelas.
- Bisa dikerjakan paralel dengan governance karena overlap file rendah.
- Fold sources sudah dapat diidentifikasi.

### Wave 2 — After shared truth boundaries are clearer
#### 3. Dashboard/reporting final
**Canonical target:** `feature/admin-table-standardization-dashboard-first`

Reasoning:
- Penting, tetapi masih butuh boundary cleanup.
- Ada overlap dengan `feature/runtime-audit-branch-governance`.
- Menyentuh service and reporting behavior yang sensitif.

#### 4. Backend operational settings final
**Canonical target:** `feature/inf-142-backend-operational-settings`

Reasoning:
- Feature branch-nya sendiri cukup kuat.
- Namun menyentuh dashboard/service/auth area yang juga sensitif.
- Lebih aman difinalkan setelah stream dashboard lebih jelas boundary-nya.

### Wave 3 — Park unless needed
#### 5. Support bucket
Default action:
- Park.
- Promote hanya bila dibutuhkan sebagai supporting docs/source untuk stream lain.

## Dependency Rules
- Stream A independen.
- Stream C independen terhadap A.
- Stream B perlu keputusan canonical branch dan cleanup overlap internal.
- Stream D bergantung ringan pada hasil boundary cleanup stream B.
- Stream E tidak memblokir stream lain.

## Actionable Ranking
### Kerjakan sekarang
1. **Governance final** — finalkan `feature/branch-governance-only` sebagai canonical governance PR.
2. **Deploy/runtime/Docker final** — finalkan `deploy` sebagai canonical deploy/runtime PR.

### Kerjakan setelah dependency dibersihkan
3. **Dashboard/reporting final** — tetapkan canonical branch dan fold branch overlap.
4. **Backend operational settings final** — finalkan setelah overlap dashboard/service/auth dibersihkan.

### Parkir
5. **Support bucket** — tidak dipromosikan tanpa kebutuhan jelas.

## Risks and Mitigations
### Risk 1: One worktree is mistaken for one PR
Hal ini akan menghasilkan PR artifisial untuk worktree local-only atau support-only.

**Mitigation:**
Gunakan stream final sebagai unit review utama, bukan nama worktree.

### Risk 2: Dashboard and backend operational settings overlap too much
Kedua stream menyentuh dashboard/service/auth area sehingga bisa memicu konflik dan review scope blur.

**Mitigation:**
Tetapkan canonical branch untuk dashboard lebih dulu, lalu cleanup overlap sebelum mendorong stream backend ops menjadi PR final.

### Risk 3: Deploy stream looks complete but truth is inconsistent
Docs, Docker, CI, dan config bisa bergerak tidak sinkron.

**Mitigation:**
Anggap deploy/runtime stream review-ready hanya setelah seluruh fold source dibandingkan terhadap target `deploy`.

### Risk 4: Governance stream duplicates itself across branches
Ada kemungkinan subset/superset antara governance branches menimbulkan PR ganda.

**Mitigation:**
Jadikan `feature/branch-governance-only` canonical target, lalu perlakukan branch governance lain hanya sebagai compare/fold source.

## Verification Expectations
- Do not invent repo verification commands.
- Final execution of this design requires per-stream scope checks and runtime verification paths tied to the affected files.
- For now: `REQUIRES REPO VERIFICATION`.

## Docs / ADR Impact
- Governance final: docs updates expected; ADR may be optional depending on final scope.
- Deploy/runtime/Docker final: `DOCS/ADR UPDATE REQUIRED`.
- Dashboard/reporting final: likely `DOCS/ADR UPDATE REQUIRED`.
- Backend operational settings final: `DOCS/ADR UPDATE REQUIRED`.

## Expected Deliverables
1. One canonical governance PR.
2. One canonical deploy/runtime/Docker PR.
3. One canonical dashboard/reporting PR after cleanup.
4. One canonical backend operational settings PR after boundary cleanup.
5. A support bucket that remains parked unless a later stream explicitly needs promotion.
