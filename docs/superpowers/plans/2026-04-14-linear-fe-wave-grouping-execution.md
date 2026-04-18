# Linear FE Wave Grouping Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read all active/open Web FE issues from Linear, group them into release-aware transaction-chain waves, publish the grouping output, and write the assignments back into Linear.

**Architecture:** The execution is split into four layers: discover the FE issue universe, classify each issue into a transaction-chain-first wave model, generate the final wave report, and write the result back into Linear using one canonical document plus per-issue assignment comments. The plan avoids destructive issue mutations and keeps one primary wave per issue while preserving linked-wave visibility.

**Tech Stack:** Linear MCP tools, Markdown reporting, issue classification workflow, local repo docs

---

## File structure and responsibility map

- Create: `docs/superpowers/plans/2026-04-14-linear-fe-wave-grouping-execution.md` (this plan)
- Create: `docs/superpowers/reports/2026-04-14-linear-fe-wave-grouping-report.md` (local canonical report of the grouping run)
- Modify: none in product code
- External system: Linear teams, issue statuses, issue list, issue details, Linear document, issue comments

## Preconditions

- The grouping rules are defined in `docs/superpowers/specs/2026-04-14-linear-fe-wave-grouping-design.md`.
- The execution scope is **Web FE only**.
- Active/open means only issues in **backlog**, **todo**, and **in progress**.
- The grouping model is **Hybrid**:
  1. group by shared API contract / transaction chain first
  2. order by delivery / release sequence second
- Cross-chain issues must have exactly:
  - `1` primary wave
  - `0..n` linked waves
- Because external-system writes are harder to reverse than local notes, Linear writeback should use:
  - one workspace-level Linear document for the grouped output
  - one per-issue comment for the assignment record
- Do **not** edit issue titles or descriptions unless the user explicitly asks later.
- Do **not** create git commits for the generated report unless the user explicitly asks.

## FE detection rule for execution

Treat an issue as a **FE candidate** if at least one of these is true:
- issue team name or key contains `fe`, `frontend`, `front-end`, `web`, or `ui`
- any issue label contains `fe`, `frontend`, `front-end`, `web`, or `ui`
- the issue title or description clearly describes browser UI behavior and does **not** read as backend-only, mobile-only, infra-only, or data-only work

Treat an issue as **ambiguous** instead of force-including it if:
- it lacks FE team/label markers
- and the title/description does not make the FE surface obvious

Ambiguous issues must be tracked in the local report and the Linear document under a manual-review section instead of being silently assigned to a wave.

## Output contract

The final report must contain all three layers from the design spec:
1. **Wave summary**
2. **Detailed wave breakdown**
3. **Cross-wave issue ledger**

The per-issue Linear comment must use this exact template:

```md
Wave assignment — 2026-04-14

- Primary Wave: FE Wave N — <wave name>
- Linked Waves: <comma-separated wave names or None>
- Reason: <1-2 sentence explanation of the transaction-chain grouping>
- Release Order: <numeric order>
```

The Linear document title must use this exact format:

```text
2026-04-14 FE Wave Grouping
```

---

### Task 1: Discover the Linear workspace surfaces used for FE grouping

**Files:**
- Create: `docs/superpowers/reports/2026-04-14-linear-fe-wave-grouping-report.md`
- Test: none

- [ ] **Step 1: List Linear teams and capture FE-relevant candidates**

Use this tool call:
```json
{
  "tool": "mcp__plugin_linear_linear__list_teams",
  "arguments": {
    "limit": 250,
    "includeArchived": false,
    "orderBy": "updatedAt"
  }
}
```

Expected:
- a complete team list for the active workspace
- FE-likely teams are identifiable by `name` or `key`
- no Linear data is modified

- [ ] **Step 2: List issue labels and capture FE-related label markers**

Use this tool call:
```json
{
  "tool": "mcp__plugin_linear_linear__list_issue_labels",
  "arguments": {
    "limit": 250,
    "orderBy": "updatedAt"
  }
}
```

Expected:
- the workspace label list is available
- FE-relevant markers such as `frontend`, `fe`, `web`, or `ui` can be recorded if they exist
- no Linear data is modified

- [ ] **Step 3: Create the local report scaffold**

Write this exact starter content into `docs/superpowers/reports/2026-04-14-linear-fe-wave-grouping-report.md`:

```md
# FE Wave Grouping Report — 2026-04-14

## Scope
- Surface: Web FE only
- Included states: backlog, todo, in progress
- Grouping model: transaction-chain first, release-order second
- Cross-chain rule: 1 primary wave, optional linked waves

## FE detection markers
### Team markers
- fe
- frontend
- front-end
- web
- ui

### Label markers
- fe
- frontend
- front-end
- web
- ui

## Raw issue pool
| Issue | Team | State | FE Signal | Candidate Chain | Notes |
|---|---|---|---|---|---|

## Wave summary

## Wave details

## Cross-wave issue ledger
| Issue | Primary Wave | Linked Waves | Reason |
|---|---|---|---|

## Ambiguous issues for manual review
| Issue | Team | State | Why ambiguous |
|---|---|---|---|
```

Expected:
- the report file exists locally
- the execution has a stable place to accumulate findings

- [ ] **Step 4: Commit**

Do not create a commit in this task. This task only creates the local execution scaffold.

---

### Task 2: Pull the active/open issue universe and isolate FE candidates

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-linear-fe-wave-grouping-report.md`
- Test: none

- [ ] **Step 1: Page through all non-archived issues in the workspace**

Start with this tool call:
```json
{
  "tool": "mcp__plugin_linear_linear__list_issues",
  "arguments": {
    "limit": 250,
    "includeArchived": false,
    "orderBy": "updatedAt"
  }
}
```

If a cursor is returned, continue with:
```json
{
  "tool": "mcp__plugin_linear_linear__list_issues",
  "arguments": {
    "limit": 250,
    "includeArchived": false,
    "orderBy": "updatedAt",
    "cursor": "<returned cursor>"
  }
}
```

Expected:
- every active workspace issue is retrieved across all pages
- no issue is skipped because of team-only assumptions

- [ ] **Step 2: Filter the workspace issue pool down to active/open states only**

Keep only issues whose normalized state name is one of:
```text
backlog
todo
in progress
```

Normalize by:
- lowercasing
- trimming whitespace
- converting repeated spaces to a single space

Expected:
- completed/canceled issues are fully excluded
- the remaining set represents the active/open pool only

- [ ] **Step 3: Apply the FE detection rule and separate candidates from ambiguous items**

Use this exact decision order for each active/open issue:
```text
1. If team marker matches FE keywords -> include as FE candidate
2. Else if any label matches FE keywords -> include as FE candidate
3. Else if title/description is clearly browser-UI work and not backend/mobile/infra/data-only -> include as FE candidate
4. Else if still unclear -> put in ambiguous pool
5. Else exclude from this run
```

Expected:
- FE candidate set is deterministic
- ambiguous issues are preserved for review instead of silently discarded

- [ ] **Step 4: Fetch full details for every FE candidate and every ambiguous item**

For each retained issue identifier, call:
```json
{
  "tool": "mcp__plugin_linear_linear__get_issue",
  "arguments": {
    "id": "<ISSUE-ID>",
    "includeRelations": true,
    "includeCustomerNeeds": false
  }
}
```

Expected:
- each retained issue now has full description, labels, relations, and branch metadata if present
- enough detail exists to classify transaction chains and dependencies

- [ ] **Step 5: Populate the Raw issue pool and Ambiguous issues tables in the report**

Append one row per FE candidate to:
```md
## Raw issue pool
| Issue | Team | State | FE Signal | Candidate Chain | Notes |
```

Append one row per ambiguous issue to:
```md
## Ambiguous issues for manual review
| Issue | Team | State | Why ambiguous |
```

Expected:
- the local report contains the full candidate set before wave assignment begins

- [ ] **Step 6: Commit**

Do not create a commit in this task. This task only records the fetched Linear data locally.

---

### Task 3: Classify each FE issue into transaction-chain-first waves

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-linear-fe-wave-grouping-report.md`
- Test: none

- [ ] **Step 1: Derive the chain taxonomy from the retrieved issue set**

Use this exact starter taxonomy and only keep entries that are actually needed by the fetched issues:
```text
auth/session establishment
profile/bootstrap
cart/order initialization
order creation
payment submission
payment result handling
retry/recovery
history/status synchronization
notification/confirmation surface
admin/operations UI support
```

Expected:
- every FE candidate can be mapped to one of the observed chains
- unused starter chains can be omitted from the final report

- [ ] **Step 2: Assign one candidate chain and one primary wave to every non-ambiguous issue**

For each FE candidate, answer these questions in order:
```text
1. What transaction outcome changes if this issue ships?
2. Which API contract or transaction step is most directly affected?
3. Which chain owns most of the acceptance criteria?
4. Which wave is earliest in delivery order while still matching the logic owner?
```

Expected:
- every classified issue has exactly one primary wave
- no issue has two primary owners

- [ ] **Step 3: Identify linked waves for cross-chain issues**

If an issue materially affects more than one chain, record this exact structure:
```md
- Primary Wave: FE Wave N — <wave name>
- Linked Waves: FE Wave X — <wave name>, FE Wave Y — <wave name>
- Reason: <why this issue belongs primarily to one wave but still affects the others>
```

Expected:
- cross-chain visibility is preserved
- ownership remains singular

- [ ] **Step 4: Mark issues that still cannot be cleanly classified as manual-review items**

Move any issue that fails the primary-wave decision to the ambiguous section with one exact reason from this list:
```text
insufficient issue description
conflicting multi-surface scope
unclear FE ownership
unclear transaction-chain owner
```

Expected:
- no weak or guessed assignment is forced into the final waves

- [ ] **Step 5: Update the Raw issue pool rows with candidate chain and wave notes**

For each classified issue, fill in:
- `Candidate Chain`
- `Notes` with `Primary: FE Wave N` and any linked-wave note

Expected:
- the raw table becomes traceable back to the final wave output

- [ ] **Step 6: Commit**

Do not create a commit in this task. This task only refines the local classification output.

---

### Task 4: Build the final wave output and sequence it for delivery

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-linear-fe-wave-grouping-report.md`
- Test: none

- [ ] **Step 1: Collapse the classified issue set into concrete waves**

Every final wave entry must use this exact structure:
```md
### FE Wave N — <wave name>
- Objective: <one sentence>
- Transaction Chain / API Contract: <primary chain>
- Primary Issues:
  - LIN-123 — <title>
- Linked Issues:
  - LIN-456 — <title>
- Dependencies:
  - <dependency text>
- Why these belong together:
  - <1-3 bullets>
- Suggested Release Order: <number>
- Notes / Risks:
  - <risk text or None>
```

Expected:
- every wave is readable without reopening each issue one-by-one

- [ ] **Step 2: Write the top-level wave summary in release order**

Use this exact section shape:
```md
## Wave summary
1. **FE Wave 1 — <name>**
   - Objective: <one sentence>
   - Issue count: <number>
   - Dependency note: <short note>
2. **FE Wave 2 — <name>**
   - Objective: <one sentence>
   - Issue count: <number>
   - Dependency note: <short note>
```

Expected:
- the release order is immediately visible
- dependency sequencing is explicit

- [ ] **Step 3: Write the cross-wave issue ledger**

Use this exact table shape:
```md
## Cross-wave issue ledger
| Issue | Primary Wave | Linked Waves | Reason |
|---|---|---|---|
| LIN-123 | FE Wave 2 — Payment Submission | FE Wave 3 — Payment Result | Shared status polling contract |
```

Expected:
- every multi-chain issue is visible in one place

- [ ] **Step 4: Run the definition-of-done QA pass against the report**

Verify this exact checklist:
```text
- all FE issues in backlog/todo/in progress are classified or explicitly marked ambiguous
- every classified issue has exactly one primary wave
- cross-chain issues have linked waves where needed
- release order exists across waves
- dependencies are recorded
- no ambiguous item was silently assigned
```

Expected:
- the report is complete enough to publish back to Linear without hidden gaps

- [ ] **Step 5: Commit**

Do not create a commit in this task. This task finalizes the local wave output only.

---

### Task 5: Publish the grouped output into Linear as the canonical wave document

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-linear-fe-wave-grouping-report.md`
- Test: Linear document retrieval

- [ ] **Step 1: Check whether the canonical Linear document already exists**

Use this tool call:
```json
{
  "tool": "mcp__plugin_linear_linear__list_documents",
  "arguments": {
    "limit": 50,
    "includeArchived": false,
    "query": "2026-04-14 FE Wave Grouping",
    "orderBy": "updatedAt"
  }
}
```

Expected:
- either an exact-title match exists and can be updated
- or no match exists and a new document must be created

- [ ] **Step 2: Create or update the Linear document with the final report content**

If no exact match exists, create it with:
```json
{
  "tool": "mcp__plugin_linear_linear__create_document",
  "arguments": {
    "title": "2026-04-14 FE Wave Grouping",
    "content": "<full markdown from docs/superpowers/reports/2026-04-14-linear-fe-wave-grouping-report.md>"
  }
}
```

If the document already exists, update it with:
```json
{
  "tool": "mcp__plugin_linear_linear__update_document",
  "arguments": {
    "id": "<DOCUMENT-ID>",
    "title": "2026-04-14 FE Wave Grouping",
    "content": "<full markdown from docs/superpowers/reports/2026-04-14-linear-fe-wave-grouping-report.md>"
  }
}
```

Expected:
- Linear now contains a canonical FE wave-grouping document
- the document content matches the local report exactly

- [ ] **Step 3: Record the resulting document ID and URL in the local report footer**

Append this exact section to the local report once the document exists:
```md
## Linear publication
- Document title: 2026-04-14 FE Wave Grouping
- Document ID: <document id>
- Published: yes
```

Expected:
- the local report points back to the authoritative Linear document

- [ ] **Step 4: Commit**

Do not create a commit in this task. This task publishes the output to Linear only.

---

### Task 6: Write wave assignments back to each issue as comments

**Files:**
- Modify: none locally unless the report footer needs counts updated
- Test: issue comment retrieval by re-listing comments

- [ ] **Step 1: Build the exact comment body for each classified issue**

For every classified issue, instantiate this exact template:
```md
Wave assignment — 2026-04-14

- Primary Wave: FE Wave N — <wave name>
- Linked Waves: <comma-separated wave names or None>
- Reason: <1-2 sentence explanation of the transaction-chain grouping>
- Release Order: <numeric order>
```

Expected:
- each issue has a deterministic, human-readable assignment payload

- [ ] **Step 2: Post the assignment comment to every classified issue**

Use this tool call per issue:
```json
{
  "tool": "mcp__plugin_linear_linear__save_comment",
  "arguments": {
    "issueId": "<ISSUE-ID>",
    "body": "Wave assignment — 2026-04-14\n\n- Primary Wave: FE Wave N — <wave name>\n- Linked Waves: <comma-separated wave names or None>\n- Reason: <1-2 sentence explanation of the transaction-chain grouping>\n- Release Order: <numeric order>"
  }
}
```

Expected:
- every classified issue now carries its primary wave assignment in Linear
- no issue title, description, or state is mutated

- [ ] **Step 3: Do not post assignment comments to ambiguous issues**

For ambiguous issues, leave the issue unchanged and rely on the Linear document section:
```md
## Ambiguous issues for manual review
```

Expected:
- only confident classifications are written back to issues
- ambiguous items remain reviewable without noisy or incorrect comments

- [ ] **Step 4: Update the local report with publication counts**

Append this exact section to the local report footer:
```md
## Publication counts
- Classified issues commented: <number>
- Ambiguous issues skipped: <number>
```

Expected:
- the local report and Linear output remain auditable

- [ ] **Step 5: Commit**

Do not create a commit in this task. These are Linear-side execution records, not repo code changes.

---

### Task 7: Verify the published Linear state before declaring completion

**Files:**
- Modify: `docs/superpowers/reports/2026-04-14-linear-fe-wave-grouping-report.md` only if verification notes need to be appended
- Test: Linear document and issue comment verification

- [ ] **Step 1: Re-open the published Linear document and verify the content is present**

Use this tool call:
```json
{
  "tool": "mcp__plugin_linear_linear__get_document",
  "arguments": {
    "id": "<DOCUMENT-ID>"
  }
}
```

Expected:
- the document title is `2026-04-14 FE Wave Grouping`
- the published content contains wave summary, wave details, and cross-wave ledger

- [ ] **Step 2: Sample at least one issue from each final wave and verify the comment exists**

For each sampled issue, run:
```json
{
  "tool": "mcp__plugin_linear_linear__list_comments",
  "arguments": {
    "issueId": "<ISSUE-ID>",
    "limit": 50,
    "orderBy": "updatedAt"
  }
}
```

Expected:
- the latest comments include the `Wave assignment — 2026-04-14` body
- the primary wave and release order match the published document

- [ ] **Step 3: Append the verification note to the local report**

Append this exact footer section:
```md
## Verification
- Linear document re-opened: yes
- Sample issue comments verified: yes
- Completion status: ready for user review
```

Expected:
- the local report includes evidence that publication really happened

- [ ] **Step 4: Commit**

Do not create a commit in this task unless the user explicitly requests repo persistence for the report.

---

## Spec coverage check

This plan covers every requirement from `docs/superpowers/specs/2026-04-14-linear-fe-wave-grouping-design.md`:
- FE-only scope -> Tasks 1-2
- backlog/todo/in progress filtering -> Task 2
- transaction-chain-first grouping -> Task 3
- one primary wave per issue -> Task 3
- linked waves for cross-chain issues -> Tasks 3-4
- release order and dependencies -> Task 4
- wave summary, wave details, cross-wave ledger -> Task 4
- writeback into Linear -> Tasks 5-6
- verification before completion -> Task 7

## Placeholder scan

No `TODO`, `TBD`, or deferred implementation markers remain in this plan. Every step has:
- exact tool calls or exact markdown shapes
- expected outcomes
- concrete stopping rules for ambiguity

## Type consistency check

The plan uses one consistent vocabulary throughout:
- `Primary Wave`
- `Linked Waves`
- `Release Order`
- `2026-04-14 FE Wave Grouping`
- `Wave assignment — 2026-04-14`

These terms must remain unchanged during execution so that the document, comments, and verification steps align.