# User Table Client-Driven Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the active user table so it has one truthful client-driven state contract, no duplicate helpers, and no stale implementation/wiring that conflicts with the live UI.

**Architecture:** Keep the user table client-driven and centered on one active Alpine source: `userListSimple.js`. Clean the active state and action surface, then remove stale implementation and misleading global wiring only where it is no longer referenced by the active partial and bootstrap path.

**Tech Stack:** Alpine.js, Webpack multi-page HTML partials, existing user service layer, GitHub PR workflow, `npm run build` verification.

---

## File structure and responsibilities

### Active source to keep and clean
- `src/js/features/userManagement/userListSimple.js`
  - canonical active source for user table state, derived state, and user actions
- `src/partials/table/table-user.html`
  - canonical active user table UI contract

### Stale / residue candidates to evaluate and remove
- `src/js/components/userList.js`
  - stale alternate implementation if not referenced by active bootstrap
- `src/js/index.js`
  - stale global user-table-related block(s) if they no longer align with `table-user.html`

### Verification target
- `package.json`
  - `npm run build` is the canonical repo verification command

---

### Task 1: Clean the active user table source contract

**Files:**
- Modify: `src/js/features/userManagement/userListSimple.js`
- Test: `src/js/features/userManagement/userListSimple.js`

- [ ] **Step 1: Write the failing contract check for duplicate helpers**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/js/features/userManagement/userListSimple.js','utf8');console.log((s.match(/getInitials\(/g)||[]).length,(s.match(/getAvatarColor\(/g)||[]).length)"
```
Expected: output shows duplicate helper method counts greater than `1` for at least one helper.

- [ ] **Step 2: Verify the contract check fails for the expected reason**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/js/features/userManagement/userListSimple.js','utf8');const initials=(s.match(/getInitials\(/g)||[]).length;const colors=(s.match(/getAvatarColor\(/g)||[]).length;console.log({initials,colors});process.exit(initials===1&&colors===1?0:1)"
```
Expected: FAIL because duplicate helper wrappers still exist.

- [ ] **Step 3: Remove duplicate helper wrappers and keep one active source of truth**

In `src/js/features/userManagement/userListSimple.js`, keep exactly one wrapper for:
```js
getInitials(fullName) {
  return getInitials(fullName);
},

getAvatarColor(fullName) {
  return getAvatarColor(fullName);
},
```
Delete the duplicate copies later in the same returned Alpine object. Do not change the client-driven state model (`users`, `searchQuery`, `entriesPerPage`, `currentPage`, `filteredUsers`, `paginatedUsers`, `totalPages`, `showingInfo`).

- [ ] **Step 4: Run the duplicate-helper contract check again**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/js/features/userManagement/userListSimple.js','utf8');const initials=(s.match(/getInitials\(/g)||[]).length;const colors=(s.match(/getAvatarColor\(/g)||[]).length;console.log({initials,colors});process.exit(initials===1&&colors===1?0:1)"
```
Expected: PASS with `{ initials: 1, colors: 1 }`.

- [ ] **Step 5: Build-check the repo after active source cleanup**

Run:
```bash
npm run build
```
Expected: PASS with webpack build completion and no syntax/runtime config errors.

- [ ] **Step 6: Commit the active-source cleanup**

```bash
git add src/js/features/userManagement/userListSimple.js
git commit -m "refactor: clean active user table state contract"
```

---

### Task 2: Align the active partial with active handlers only

**Files:**
- Modify: `src/partials/table/table-user.html`
- Modify: `src/js/features/userManagement/userListSimple.js`
- Test: `src/partials/table/table-user.html`

- [ ] **Step 1: Write the failing partial/handler alignment check**

Run:
```bash
node -e "const fs=require('fs');const html=fs.readFileSync('src/partials/table/table-user.html','utf8');const js=fs.readFileSync('src/js/features/userManagement/userListSimple.js','utf8');const handlers=['openMapDetailModal','editUser','showDeleteModal'];const missing=handlers.filter(h=>html.includes(h+'(')&&!js.includes(h+'('));console.log({missing});process.exit(missing.length===0?0:1)"
```
Expected: FAIL if any active partial action is not implemented in the active source.

- [ ] **Step 2: Verify the failure reason matches partial/source mismatch**

Run:
```bash
node -e "const fs=require('fs');const html=fs.readFileSync('src/partials/table/table-user.html','utf8');const js=fs.readFileSync('src/js/features/userManagement/userListSimple.js','utf8');const handlers=['openMapDetailModal','editUser','showDeleteModal'];for(const h of handlers){console.log(h, html.includes(h+'('), js.includes(h+'('));}"
```
Expected: clear true/false output showing which action(s) are partial-active vs source-active.

- [ ] **Step 3: Make the active partial truthful to the active source**

Ensure `src/partials/table/table-user.html` only calls handlers that actually exist in `userListSimple.js`. If any action in the partial still points to stale/nonexistent handler names, change the partial to the active names already present in `userListSimple.js` rather than inventing new handlers.

If `userListSimple.js` is missing one of the active partial handlers and the feature is clearly live (edit/delete/map detail), add the minimal active wrapper in `userListSimple.js` using the existing current pattern instead of using global/stale aliases.

- [ ] **Step 4: Run the alignment check again**

Run:
```bash
node -e "const fs=require('fs');const html=fs.readFileSync('src/partials/table/table-user.html','utf8');const js=fs.readFileSync('src/js/features/userManagement/userListSimple.js','utf8');const handlers=['openMapDetailModal','editUser','showDeleteModal'];const missing=handlers.filter(h=>html.includes(h+'(')&&!js.includes(h+'('));console.log({missing});process.exit(missing.length===0?0:1)"
```
Expected: PASS with `{ missing: [] }`.

- [ ] **Step 5: Build-check after partial/source alignment**

Run:
```bash
npm run build
```
Expected: PASS.

- [ ] **Step 6: Commit the partial alignment cleanup**

```bash
git add src/partials/table/table-user.html src/js/features/userManagement/userListSimple.js
git commit -m "refactor: align user table partial with active handlers"
```

---

### Task 3: Remove stale alternate user-list implementation

**Files:**
- Delete: `src/js/components/userList.js`
- Test: `src/js/index.js`

- [ ] **Step 1: Write the failing stale-reference check**

Run:
```bash
node -e "const fs=require('fs');const index=fs.readFileSync('src/js/index.js','utf8');const page=fs.readFileSync('src/management-user.html','utf8');const refs=[index.includes('components/userList'),page.includes('components/userList')];console.log({refs});process.exit(refs.some(Boolean)?1:0)"
```
Expected: PASS if no active bootstrap path references `src/js/components/userList.js`; if it fails, stop and inspect before deleting.

- [ ] **Step 2: Verify the stale file is not the active source**

Run:
```bash
grep -R -n "components/userList" src || true
```
Expected: no active references, or references only in clearly stale/non-active code paths.

- [ ] **Step 3: Delete the stale user-list implementation**

Delete:
```text
src/js/components/userList.js
```
Only do this if Steps 1-2 confirm it is not referenced by the active bootstrap path.

- [ ] **Step 4: Build-check after deleting the stale implementation**

Run:
```bash
npm run build
```
Expected: PASS.

- [ ] **Step 5: Commit the stale-file cleanup**

```bash
git add src/js/components/userList.js
git commit -m "refactor: remove stale user list implementation"
```

---

### Task 4: Remove misleading global residue in `index.js`

**Files:**
- Modify: `src/js/index.js`
- Test: `src/js/index.js`

- [ ] **Step 1: Write the failing stale-wiring check**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/js/index.js','utf8');const markers=['menyetujui booking','hapus booking','.js-success-btn','.js-info-btn','.js-danger-btn'];const hits=markers.filter(m=>s.includes(m));console.log({hits});process.exit(hits.length===0?0:1)"
```
Expected: FAIL if stale booking-like residue still exists in the user-table-related block.

- [ ] **Step 2: Verify that the residue is actually misleading for user table scope**

Run:
```bash
grep -n -E "menyetujui booking|hapus booking|\.js-success-btn|\.js-info-btn|\.js-danger-btn" src/js/index.js || true
```
Expected: output points to the stale/misaligned block that should be removed or neutralized.

- [ ] **Step 3: Remove only the misleading residue block**

In `src/js/index.js`, delete or neutralize the user-table-related global block that still uses booking-specific selectors/messages and does not match `table-user.html` active behavior. Do not redesign modal handling globally; only remove residue that is not truthful to the active user table contract.

- [ ] **Step 4: Re-run the stale-wiring check**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/js/index.js','utf8');const markers=['menyetujui booking','hapus booking','.js-success-btn','.js-info-btn','.js-danger-btn'];const hits=markers.filter(m=>s.includes(m));console.log({hits});process.exit(hits.length===0?0:1)"
```
Expected: PASS with `{ hits: [] }`.

- [ ] **Step 5: Build-check after residue cleanup**

Run:
```bash
npm run build
```
Expected: PASS.

- [ ] **Step 6: Commit the global residue cleanup**

```bash
git add src/js/index.js
git commit -m "refactor: remove stale user table global wiring"
```

---

## Spec coverage check
- Keep user table client-driven: covered in Tasks 1-2 by preserving the active local state model.
- Remove duplicate helpers in active source: covered in Task 1.
- Align partial with active handlers: covered in Task 2.
- Remove stale alternate implementation: covered in Task 3.
- Remove misleading residue wiring: covered in Task 4.
- Keep scope narrow and avoid server-driven migration/modals redesign: enforced across all tasks.
- Build safety verification after each cleanup step: covered in every task.

## Placeholder scan
No `TODO`, `TBD`, “implement later”, or vague “handle appropriately” instructions remain.

## Type consistency check
- Active source remains `userListSimple.js` throughout.
- Canonical active state remains `users`, `searchQuery`, `entriesPerPage`, `currentPage`.
- Canonical derived state remains `filteredUsers`, `paginatedUsers`, `totalPages`, `showingInfo`.
- Canonical action names remain `editUser`, `showDeleteModal`, `openMapDetailModal`.
