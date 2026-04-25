# Code Review Governance

## Role split
- Claude Code is the primary builder, executor, and final owner.
- Codex is used for parallel review, challenge review, and rescue investigation.
- GitHub CLI (`gh`) is the default governance path for PRs, checks, rules, and linkage work.

## Default operating mode
Use this repository's review flow by default:
1. Claude Code implements the change and performs initial local verification.
2. Use the trigger matrix to decide whether Codex is required and which Codex command fits the situation.
3. Prefer background review for large or multi-file review work.
4. After any Codex invocation, convert the result into the required structured summary instead of forwarding raw output.
5. Before claiming a change is ready for PR, evaluate readiness against verification and review evidence.
6. Use `gh` or `gh api` for PR and governance operations.

## Trigger matrix
### Use `/codex:review` when:
- changes are stable enough for review
- you want a general quality pass
- multi-file changes already passed initial local verification
- work is approaching PR readiness
- a large revision needs a second pass

### Use `/codex:adversarial-review` when:
- risk tier is medium/high
- auth, permission, role, token, session, credential, or trust-boundary behavior changed
- business rules or failure-mode-sensitive logic changed
- persistence, retries, rollback, idempotency, queueing, scheduler behavior, caching, concurrency, or reliability tradeoffs need challenge review
- the chosen design has meaningful tradeoffs that should be challenged
- failure modes and hidden assumptions need pressure-testing

### Use `/codex:rescue` when:
- investigation is stuck
- root cause is unclear
- regression or flaky behavior needs narrowing
- an alternate investigation path is needed

## Post-Codex result summary rules
After any Codex command, summarize the result using:
1. Ringkasan tujuan pemanggilan
2. Temuan utama
3. Severity
4. Dampak
5. Keputusan
6. Test yang harus ditambah / dijalankan ulang
7. PR readiness

### Additional adversarial-review handling
Also separate:
- blocker risk
- non-blocking risk
- test gap
- design concern
- follow-up candidate

### Additional rescue handling
Also include:
- root-cause confidence
- fix confidence
- unresolved uncertainty
- verification debt

## PR readiness rules
Do not claim a change is ready for PR unless:
- self-review is done
- relevant local verification is done
- required Codex review has been considered
- unresolved concerns are visible
- PR notes are clear enough for a reviewer

Recommended final readiness framing:
- not review-ready
- review-ready but not PR-ready
- PR-ready with follow-up notes
- not PR-ready

## Integration with existing repo review assets
- Keep `webfe-review` as the Web FE-specific review-ready framing layer.
- Keep existing verification, docs, and reminder helpers where they add signal.
- If a correctness-sensitive contract reviewer such as `webfe-contract-reviewer` is present, keep it as a domain review layer rather than replacing it with the governance skills.
- Treat `codex-trigger-matrix`, `codex-review-summary`, and `codex-pr-readiness` as governance/meta-layer tools that sit above domain-specific review helpers.

## GitHub CLI-first governance
Use `gh` or `gh api` for:
- creating and editing PRs
- reading checks
- inspecting rulesets
- reading repository governance state
- issue/PR linkage

## Response contract compatibility
- The three governance skills define governance-specific routing, summary, and readiness shapes.
- They do not replace the repo-wide 10-part Web FE task response contract in `CLAUDE.md`.
- When reporting final Web FE task status, preserve the 10-part repo format and embed governance outputs inside the relevant verification, risk, and review/PR sections.

## Background-first review habit
For large or multi-file reviews:
- prefer `--background`
- use `/codex:status` to inspect progress
- read results with `/codex:result`
- cancel stale work with `/codex:cancel`

## Soft reminders
Soft reminder hooks are optional and should nudge rather than block by default.
They are most useful when:
- risk tier is medium/high
- a PR-readiness claim is about to be made
- Codex review appears required but has not yet been invoked

## Prohibitions
- Do not treat Codex as the primary builder.
- Do not use rescue as a shortcut for ordinary coding work.
- Do not present raw Codex output without interpretation.
- Do not downgrade medium/high-risk work to normal review when the trigger matrix clearly requires challenge review.
- Do not claim PR readiness without enough verification.
