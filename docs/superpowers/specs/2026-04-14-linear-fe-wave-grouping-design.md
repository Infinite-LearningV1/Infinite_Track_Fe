# Linear FE Wave Grouping Design

## Purpose
Define a consistent way to group active/open Web FE issues in Linear into execution waves. Each wave should reflect connected business logic through shared API contracts or transaction chains, while still preserving delivery and release order.

## Current design context
- This design applies only to **Web FE** issues.
- The issue pool includes only issues in statuses equivalent to **backlog**, **todo**, and **in progress**.
- Grouping should not be driven primarily by page ownership or component ownership.
- Grouping should be driven primarily by **shared API contract / transaction chain**.
- Delivery order still matters, so grouping must support release sequencing and dependency visibility.

## Goals
- Group FE issues that belong to the same transaction chain into the same wave.
- Preserve a clear release order across waves.
- Make cross-wave dependencies visible without losing domain grouping.
- Ensure every issue has a single primary execution home.
- Support planning discussions and execution sequencing directly from the grouped output.

## Non-goals
- Group backend, mobile, or infrastructure issues.
- Reorganize Linear team workflows or status taxonomies.
- Replace detailed implementation planning.
- Enforce a strict project-only grouping boundary if issue relationships span multiple FE areas.

## Core grouping model
The grouping model is **Hybrid**:
1. Group issues by **shared API contract / transaction chain** first.
2. Sequence those groups by **delivery / release order** second.

This means wave boundaries are determined primarily by business transaction continuity, not by page location, component folder, or generic implementation type. Release order is an annotation and sequencing layer on top of that grouping, not the main grouping rule.

## Scope definition
### Included issues
Only **Web FE** issues that are currently active/open under these working buckets:
- backlog
- todo
- in progress

### Excluded issues
- done
- canceled
- any other status that clearly represents completed or discarded work
- non-FE issues

## Primary grouping principle
Each issue should be classified by the **transaction chain or API contract it most directly supports**.

Examples of qualifying chains:
- auth/session establishment
- order creation
- payment submission
- payment result handling
- retry/recovery flow
- history/status synchronization

A transaction chain may span multiple screens, states, and components. That is acceptable and expected. The grouping is based on transaction continuity, not UI geography.

## Why transaction-chain-first is preferred
Compared with grouping by page or shared module, transaction-chain-first grouping produces a more stable execution package because:
- FE work often spans several views while still serving one business transaction.
- API contract changes and transaction sequencing create the strongest execution coupling.
- It reduces fragmented planning where one business flow is spread across unrelated work buckets.

## Wave structure
Each wave should be represented with the following fields:
- **Wave Name**
- **Objective**
- **Transaction Chain / API Contract**
- **Included Issues**
- **Primary Issues**
- **Linked Issues from Other Waves**
- **Dependencies**
- **Release Order**
- **Notes / Risks**

## Assignment rules
### 1. Determine the main transaction chain
For each issue, determine:
- which API or contract it touches
- which transaction step it changes or supports
- which user-facing transaction outcome it affects

### 2. Assign exactly one Primary Wave
Each issue must have **one and only one** primary wave.

The primary wave is chosen by this priority order:
1. the wave containing the majority of the issue's acceptance criteria
2. if still ambiguous, the wave where the issue is most central in the transaction chain
3. if still ambiguous, the earliest wave that requires the issue for delivery

### 3. Allow Linked Waves for cross-chain visibility
If an issue materially affects more than one transaction chain, it may appear in more than one wave view, but only as:
- **1 Primary Wave**
- **0..n Linked Waves**

This preserves visibility without creating double ownership.

### 4. Do not create multiple primary owners
Even if an issue impacts several chains, execution ownership must remain singular. Cross-wave references are allowed; cross-wave primary ownership is not.

### 5. Use dependency annotation instead of regrouping by schedule
If an issue belongs logically to one chain but must be delivered earlier for another wave to proceed:
- keep the issue in its logic-based primary wave
- record the delivery dependency explicitly
- do not move the issue into another primary wave just to make sequencing look cleaner

### 6. Include FE support work when it serves a chain
Issues such as:
- loading states
- error states
- retry UI
- validation behavior
- polling/status refresh
- empty-state or result-state handling

should still be grouped into a transaction wave when they clearly support that chain.

## Cross-wave issue policy
For issues that touch multiple transaction chains, use this representation:
- **Primary Wave**
- **Linked Waves**
- **Reason**

This policy is the recommended compromise between execution clarity and dependency visibility.

## Recommended output format
The final grouping output should be presented in three layers.

### A. Wave summary
A top-level ordered list of waves with:
- wave name
- objective
- issue count
- short dependency note

### B. Detailed wave breakdown
For each wave, provide:
- **Wave Name**
- **Objective**
- **Transaction Chain / API Contract**
- **Primary Issues**
- **Linked Issues**
- **Dependencies**
- **Why these belong together**
- **Suggested Release Order**

### C. Cross-wave issue ledger
For every issue with multi-chain impact, provide:
- **Issue**
- **Primary Wave**
- **Linked Waves**
- **Reason**

## Suggested interpretation guidance
When reviewing an issue, ask these questions in order:
1. What transaction outcome changes if this issue is implemented?
2. Which API contract or transaction step is most directly affected?
3. Is this issue central to one chain or merely affecting adjacent chains?
4. Does another wave depend on this issue for delivery, even if it is not the logical owner?

The answers should drive classification.

## Definition of done for grouping
The grouping exercise is complete when:
- all FE issues in backlog/todo/in progress are classified
- every issue has exactly one primary wave
- cross-chain issues include linked waves where needed
- release order exists across waves
- inter-wave dependencies are recorded
- ambiguous issues are explicitly flagged for manual review instead of being silently forced into a weak classification

## Risks and failure modes
- If grouping is driven by screens or modules instead of transaction chains, one business flow may be fragmented across multiple waves.
- If a cross-chain issue is assigned to multiple primary waves, ownership becomes unclear.
- If delivery sequencing overrides logic grouping, waves may look neat but become misleading for execution.
- If issue descriptions are vague, classification quality will degrade and more manual review will be required.

## Operational recommendation
Use this design as the decision framework for reviewing all active/open FE issues in Linear. During execution, keep wave ownership logic-centered and let release sequencing be expressed through dependency notes and release order rather than through arbitrary regrouping.

## Summary rule
**Group by business transaction chain first, then annotate delivery dependency second.**