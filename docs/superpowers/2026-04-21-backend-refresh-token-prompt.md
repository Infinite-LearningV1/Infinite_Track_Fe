# Backend Prompt — Refresh Token Session Contract

Gunakan prompt ini di **repo backend** untuk mengerjakan fitur refresh token **khusus dalam scope backend**.

## Context

Sebelum melakukan apa pun, baca issue Linear ini terlebih dahulu:

1. `INF-145` — **Auth: Refresh token session contract with 48-hour inactivity expiry across Web FE and Android clients**
2. `INF-28` — **Audit auth token handling contract across middleware and routes**

Issue client yang relevan sebagai consumer contract, tetapi **bukan scope backend**:

- `INF-146` — Web FE silent token refresh orchestration
- `INF-147` — Android silent token refresh orchestration

## Prompt

```text
Baca issue Linear ini TERLEBIH DAHULU sebelum melakukan apa pun:
1. INF-145 — Auth: Refresh token session contract with 48-hour inactivity expiry across Web FE and Android clients
2. INF-28 — Audit auth token handling contract across middleware and routes

Setelah membaca issue, kerjakan HANYA dalam scope backend.

Konteks:
- Tujuan fitur: client (Web FE dan Android) tidak perlu logout selama refresh token masih valid dan refresh masih berhasil.
- Session harus mewajibkan full login lagi jika tidak ada successful refresh atau fresh login selama 48 jam.
- Backend adalah source of truth untuk auth/session lifecycle.
- Jangan mengubah kode Web FE atau Android.
- Tapi Anda HARUS mendefinisikan response/failure semantics yang jelas agar Web FE dan Android bisa mengonsumsi contract yang sama.
- Utamakan UPDATE auth flow/configuration yang SUDAH ADA di backend terlebih dahulu; tambahkan komponen baru hanya jika memang dibutuhkan oleh contract yang benar.

Aturan kerja:
- Jangan langsung implementasi sebelum memetakan current auth contract di backend.
- Mulai dari audit current login/logout/token flow di repo backend.
- Jika ada ambiguity, tulis jelas keputusan yang perlu diambil, bukan menebak.
- Bedakan dengan tegas:
  - access token expired but still refreshable
  - refresh token invalid/revoked
  - inactivity window 48 jam terlampaui
  - transport/server error (bukan auth invalid)
- Setelah audit dan desain singkat, cek apakah sudah ada implementation plan yang relevan di repo backend untuk issue ini atau auth/session work yang sama arahnya.
- Jika plan yang relevan SUDAH ADA dan masih valid, gunakan plan itu lalu EKSEKUSI langsung dalam session yang sama.
- Jika plan yang relevan BELUM ADA atau jelas tidak cukup, buat implementation plan yang ringkas lalu EKSEKUSI implementasinya dalam session yang sama.
- Jangan berhenti di desain saja kecuali menemukan blocker nyata.

Yang saya ingin Anda lakukan:

1. Baca INF-145 dan INF-28 dulu, lalu rangkum:
   - goal backend
   - batasan scope backend
   - acceptance criteria yang relevan untuk backend
   - open questions yang perlu dijawab dari current repo

2. Audit current backend auth/token implementation:
   - bagaimana login saat ini issue token
   - bagaimana middleware validasi token berjalan
   - apakah sudah ada refresh endpoint / revoke logic / logout semantics
   - apakah token disimpan stateless penuh atau ada persistence/session store
   - env/config auth yang sudah ada
   - gap antara current implementation vs kebutuhan INF-145

3. Rancang solusi backend-only sebelum coding:
   - access token lifetime
   - refresh token issuance
   - refresh token rotation / reuse handling
   - inactivity expiry 48 jam (berbasis successful refresh atau fresh login)
   - revoke / logout semantics
   - concurrent session behavior jika relevan
   - response contract untuk:
     - refresh success
     - full re-auth required
     - invalid/revoked refresh token
     - inactivity expiry exceeded
   - config/env yang perlu ditambah

4. Cek existing implementation plan yang relevan di repo backend:
   - cari plan auth/session/refresh token yang sudah ada
   - nilai apakah plan itu masih valid terhadap INF-145 dan kondisi repo sekarang
   - jika valid, pakai plan tersebut sebagai dasar execution
   - jika tidak ada atau tidak cukup, lanjut ke langkah 5 untuk membuat plan baru yang ringkas

5. Jika perlu, buat implementation plan singkat berbasis hasil audit:
   - urutkan perubahan backend yang paling kecil dan aman lebih dulu
   - utamakan modifikasi pada auth flow/config yang sudah ada sebelum membuat struktur baru
   - sebutkan file/backend area yang akan diubah
   - jika ada config/env baru, jelaskan kenapa belum bisa memakai yang sudah ada

6. Implement backend changes saja:
   - endpoint refresh
   - auth/service/middleware changes
   - persistence/model/storage changes bila memang diperlukan
   - config additions bila memang dibutuhkan oleh contract final
   - update flow yang sudah ada bila itu cukup
   - jangan menyentuh client code

7. Tambahkan verification:
   - test atau verification path untuk:
     - login -> access token expired -> refresh succeeds
     - refresh berulang menjaga continuity
     - tidak ada successful refresh/login selama 48 jam -> refresh denied -> full login required
     - revoked/invalid refresh token -> explicit non-refreshable response
     - logout/force logout/revoke session behavior
   - jika test path belum terkunci, tulis REQUIRES REPO VERIFICATION dengan detail yang spesifik

8. Dokumentasikan hasil akhir:
   - apa yang berubah
   - file backend yang diubah
   - env/config baru yang wajib diisi
   - contract yang harus dikonsumsi oleh Web FE dan Android
   - decision notes / ADR notes jika perubahan ini mengubah auth/session contract

Batasan penting:
- Scope backend only.
- Jangan implement Web FE / Android.
- Jangan membuat asumsi local-storage/client-state sebagai source of truth.
- Jangan samakan network/server failure dengan invalid refresh token.
- Jangan membuat arsitektur baru jika perubahan minimal pada auth flow/config yang ada sudah cukup.
- Jika arsitektur current repo memang tidak cocok untuk refresh token yang aman, jelaskan root cause dan usulkan perubahan minimum yang benar.

Format jawaban yang saya inginkan:
1. Ringkasan hasil baca issue
2. Audit current backend auth/token flow
3. Gap analysis terhadap INF-145
4. Existing plan review (atau nyatakan tidak ada/tidak valid)
5. Implementation plan singkat jika perlu
6. Daftar perubahan yang dilakukan
7. Config/env yang ditambahkan atau diubah
8. Response contract untuk client
9. Verification evidence / REQUIRES REPO VERIFICATION
10. Docs / ADR update note
11. Risiko dan follow-up untuk Web FE / Android consumers
```

## Notes

- Prompt ini sengaja memaksa agent backend mulai dari **membaca issue** dan **mengaudit kontrak auth saat ini**, bukan langsung menambah endpoint refresh.
- `INF-145` adalah tiket contract/source-of-truth.
- `INF-146` dan `INF-147` adalah consumer rollout tickets untuk Web FE dan Android setelah contract backend jelas.
