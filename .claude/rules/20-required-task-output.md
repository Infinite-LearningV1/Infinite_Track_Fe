# Required task output

Derived from `CLAUDE.md`. If this file and `CLAUDE.md` differ, `CLAUDE.md` is canonical.

For each Web FE task, respond in this order:
1. Tujuan task
2. Fakta
3. Asumsi
4. Perlu verifikasi
5. Risiko perubahan
6. Plan implementasi
7. File/area terdampak
8. Verification plan
9. Docs / ADR update note
10. Review / PR / release / build notes

## Definition of done
Do not call a task done unless:
- scope is clear and bounded
- risks are explicitly stated
- affected files/areas are named
- verification evidence exists, or the response clearly states `REQUIRES REPO VERIFICATION`
- high-risk impact is called out when relevant
- `DOCS/ADR UPDATE REQUIRED` is included for architecture-significant changes
- review / PR / release / build notes are present when relevant
- the linked Linear issue status matches the actual state of the work, or the response states that no Linear issue applies

## Linear issue sync expectation
- Merging a PR does not update Linear. Issue status must be set explicitly by whoever closes out the work.
- A merged PR is not by itself proof of completion. Move an issue to `Done` only when its acceptance criteria are met, not when its branch lands.
- If the work delivered an artifact but the acceptance criteria still require runtime or operational evidence, keep the issue open and name the missing evidence.
- Reference the correct issue in the branch name. A branch citing an issue owned by another repo leaves the real work untracked and pollutes that repo's backlog.
