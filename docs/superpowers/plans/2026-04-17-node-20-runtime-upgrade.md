# Node 20+ Runtime Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Node.js 20+ the explicit runtime contract for this Web FE repo, align repo-level runtime documentation to that contract, and verify install/build on the active runtime as long as it is Node 20 or newer.

**Architecture:** Treat `package.json` as the runtime policy source of truth and keep the contract flexible at `>=20` instead of pinning to Node 20 only. Remove single-version local hints that would falsely imply an exact runtime lock, keep deploy examples on a safe Node 20 baseline, and use a smoke check on the active `>=20` runtime to validate the repo still installs and builds.

**Tech Stack:** Node.js 20+, npm, Webpack 5, Alpine.js, Tailwind CSS 4, Markdown docs

---

## File Structure Map

- `package.json` — primary runtime contract; must declare Node `>=20`.
- `.nvmrc` — single-version local hint; should be removed because the repo policy is now flexible 20+.
- `README.md` — public install prerequisites; should say Node 20 or later.
- `DEPLOYMENT.md` — runtime/deploy guide; should say Node 20+ and keep the Docker example on a Node 20 baseline image.
- local install metadata / lockfile state — may refresh during the smoke install on the active runtime, but is not a committed repo artifact.

### Task 1: Make the runtime contract flexible at Node 20+

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/package.json:1-66`
- Delete: `E:/skrisi/clonefee/Infinite_Track_Fe/.nvmrc`
- Test: runtime-contract inspection via Node and file reads

- [ ] **Step 1: Capture the current pinned-20 state**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- package.json .nvmrc
python - <<'PY'
import json
from pathlib import Path
root = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe")
pkg = json.loads((root / "package.json").read_text())
print("engines:", pkg.get("engines"))
print("nvmrc exists:", (root / ".nvmrc").exists())
if (root / ".nvmrc").exists():
    print("nvmrc value:", (root / ".nvmrc").read_text().strip())
PY
```
Expected:
- Output shows the repo is currently pinned to `>=20 <21` and `.nvmrc` contains `20`.

- [ ] **Step 2: Relax the engine contract to `>=20`**

In `E:/skrisi/clonefee/Infinite_Track_Fe/package.json`, replace this block:

```json
  "engines": {
    "node": ">=20 <21"
  },
```

with this block:

```json
  "engines": {
    "node": ">=20"
  },
```

- [ ] **Step 3: Remove `.nvmrc` because it implies an exact version pin**

Delete `E:/skrisi/clonefee/Infinite_Track_Fe/.nvmrc` entirely.

Run:
```bash
python - <<'PY'
from pathlib import Path
path = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/.nvmrc")
if path.exists():
    path.unlink()
print("removed .nvmrc")
PY
```
Expected:
- Script prints `removed .nvmrc`.
- The file no longer exists.

- [ ] **Step 4: Verify the flexible runtime contract reads back correctly**

Run:
```bash
python - <<'PY'
import json
from pathlib import Path
root = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe")
pkg = json.loads((root / "package.json").read_text())
assert pkg["engines"]["node"] == ">=20", pkg.get("engines")
assert not (root / ".nvmrc").exists(), ".nvmrc should be removed"
print("runtime contract ok: >=20 and no exact local pin")
PY
```
Expected:
- Script prints `runtime contract ok: >=20 and no exact local pin`.

- [ ] **Step 5: Commit the runtime-contract change**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add package.json .nvmrc
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "chore: relax runtime contract to node 20+"
```
Expected:
- One commit containing the `package.json` change and the `.nvmrc` removal.

### Task 2: Align repo-level runtime documentation to Node 20+

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/README.md:36-67`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT.md:16-20`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT.md:312-320`
- Test: grep-based drift check over repo-level docs

- [ ] **Step 1: Capture the current Node 20-only wording**

Run:
```bash
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/README.md"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT.md"),
]
for path in files:
    print(f"\n== {path.name} ==")
    for i, line in enumerate(path.read_text().splitlines(), start=1):
        if "Node.js 20.x" in line or "node:20-alpine" in line:
            print(f"{i}: {line}")
PY
```
Expected:
- Output shows the current exact wording that still implies Node 20 specifically.

- [ ] **Step 2: Update the README prerequisite to Node 20 or later**

In `E:/skrisi/clonefee/Infinite_Track_Fe/README.md`, replace this line:

```md
- Node.js 20.x
```

with this line:

```md
- Node.js 20.x or later
```

- [ ] **Step 3: Update deployment requirements to say Node 20+ while keeping the Docker example on a safe baseline**

In `E:/skrisi/clonefee/Infinite_Track_Fe/DEPLOYMENT.md`, replace this block:

```md
- Node.js 20.x
- npm yang bundled dengan Node.js 20 atau yarn >= 1.22.x
- Git
```

with this block:

```md
- Node.js 20.x atau lebih baru
- npm yang bundled dengan runtime aktif atau yarn >= 1.22.x
- Git
```

Keep this Docker builder line as-is:

```dockerfile
FROM node:20-alpine AS builder
```

The example stays on Node 20 because it is the minimum supported baseline, even though the repo policy allows newer Node versions.

- [ ] **Step 4: Verify repo-level docs now describe a 20+ policy**

Run:
```bash
python - <<'PY'
from pathlib import Path
root = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe")
readme = (root / "README.md").read_text()
deploy = (root / "DEPLOYMENT.md").read_text()
assert "Node.js 20.x or later" in readme
assert "Node.js 20.x atau lebih baru" in deploy
assert "node:20-alpine" in deploy
print("repo-level runtime docs aligned to node 20+")
PY
```
Expected:
- Script prints `repo-level runtime docs aligned to node 20+`.

- [ ] **Step 5: Commit the runtime-doc alignment**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add README.md DEPLOYMENT.md
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: describe node 20 plus runtime policy"
```
Expected:
- One commit containing only the repo-level runtime doc updates.

### Task 3: Run a smoke validation on the active Node 20+ runtime

**Files:**
- Modify if needed: `E:/skrisi/clonefee/Infinite_Track_Fe/package-lock.json`
- Modify if a real compatibility issue is proven: `E:/skrisi/clonefee/Infinite_Track_Fe/package.json`
- Test: `node -v`, `npm install`, and `npm run build`

- [ ] **Step 1: Require the active runtime to be Node 20 or newer**

Run:
```bash
node - <<'JS'
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  console.error(`Expected Node >=20, got ${process.version}`);
  process.exit(1);
}
console.log(`Using ${process.version}`);
JS
```
Expected:
- Command prints `Using v20...`, `Using v22...`, `Using v24...`, or another `>=20` version.
- If it prints a lower version, stop and switch the shell/session before going further.

- [ ] **Step 2: Run a real install on the active runtime**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" install
```
Expected:
- Install completes successfully on the active Node 20+ runtime.
- `package-lock.json` may change to reflect install metadata or dependency resolution.

- [ ] **Step 3: Run the production build on the active runtime**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build
```
Expected:
- Build completes successfully.
- If install/build exposes a real compatibility issue, fix only the package needed to resolve that issue.

- [ ] **Step 4: Inspect whether the smoke validation changed only lock metadata or exposed a real compatibility issue**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- package.json package-lock.json
```
Expected:
- Best case: only `package-lock.json` changes, or no diff at all.
- If `package.json` changes beyond the `engines` block from Task 1, there must be a clear install/build reason tied to compatibility.

- [ ] **Step 5: Commit the verification output only if verification produced a real repo change**

If Step 4 showed a `package-lock.json` change or a minimal compatibility fix, run:

```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add package.json package-lock.json
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "chore: smoke test node 20 plus runtime"
```

Expected:
- A commit is created only when verification produced a real repo change.
- If there is no diff, do not create a commit just for the smoke check.

## Self-Review Checklist

- Spec coverage: this revised plan covers the user-approved change from a Node 20-only contract to a Node 20+ contract, including removing the misleading exact-version local hint, updating docs, and changing validation from exact-20 enforcement to active-runtime smoke validation.
- Placeholder scan: there are no `TODO`/`TBD` markers, and every planned edit includes the exact text or command to use.
- Type/signature consistency: the runtime policy string is consistently `>=20`, `.nvmrc` is consistently removed, and the smoke-check gate consistently accepts any runtime whose major version is 20 or greater.
