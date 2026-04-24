---
name: codex-review-summary
description: Convert raw Codex output into the repository's mandatory structured review summary after /codex:review, /codex:adversarial-review, or /codex:rescue.
disable-model-invocation: true
allowed-tools:
  - Read
  - Glob
  - Grep
  - AskUserQuestion
paths:
  - Infinite_Track_Fe/**
---

# codex-review-summary

## Purpose
Use this skill after any Codex invocation to prevent raw Codex output from being presented directly.

## Output contract compatibility
- This skill defines a governance-specific review summary shape.
- It does not replace the repo-wide 10-part Web FE task response contract in `CLAUDE.md`.
- When the surrounding response is a Web FE task report, preserve the 10-part format and embed this review summary in the relevant verification or review/PR sections.

## Accepted sources
- `/codex:review`
- `/codex:adversarial-review`
- `/codex:rescue`

## Required inputs
- purpose of the Codex invocation
- raw Codex result
- change context
- risk tier
- current local verification state

## Mandatory output shape
1. Ringkasan tujuan pemanggilan
2. Temuan utama
3. Severity
   - blocker
   - important
   - nice-to-have
4. Dampak ke
   - correctness
   - maintainability
   - test coverage
   - risk
5. Keputusan
   - fix now
   - pindah ke follow-up
   - catat sebagai risk accepted
6. Test yang harus ditambah / dijalankan ulang
7. Apakah perubahan sudah layak ke PR atau belum

## Special handling for `/codex:adversarial-review`
Also separate:
- blocker risk
- non-blocking risk
- test gap
- design concern
- follow-up candidate

## Special handling for `/codex:rescue`
Also include:
- root-cause confidence
- fix confidence
- unresolved uncertainty
- verification debt

## Boundaries
- Do not present raw Codex output without interpretation.
- Do not convert Codex feedback into automatic implementation instructions.
- Do not hide uncertainty when rescue confidence is low.

## Required tone
- concise
- review-ready
- evidence-oriented
- explicit about unresolved risk
