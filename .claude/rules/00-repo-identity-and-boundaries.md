# Repo identity and boundaries

Derived from `CLAUDE.md`. If this file and `CLAUDE.md` differ, `CLAUDE.md` is canonical.

- This repo is the Web FE admin and reporting surface for Infinite Track Palu.
- It is a Webpack-built multi-page app using HTML, Alpine.js, Tailwind CSS, and Axios.
- Web FE is not the final source of truth for attendance, auth authority, or reporting authority.
- Prefer changes that keep admin flows clear, backend-truth aligned, and safe for maintainability.

## Source of truth hierarchy
- Product intent: web admin supports operations and reporting; reporting must not create conflicting truth.
- Current repo/runtime behavior is the active as-is truth.
- Gap priorities: auth/session correctness, reporting responsibility, deploy/config correctness, and documentation discipline remain sensitive.
- Accepted ADRs override informal preferences when they exist.
- If sources conflict, call out the conflict explicitly instead of silently choosing one.
