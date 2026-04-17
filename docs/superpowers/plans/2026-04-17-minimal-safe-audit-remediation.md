# Minimal Safe Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the most relevant dependency vulnerabilities by updating only fixable direct dependencies that are actually used in the app, while keeping the repo installable/buildable and explicitly carrying `xlsx` as residual risk.

**Architecture:** Apply remediation in two small dependency groups: first `axios` because it is widely used in the service layer, then `jspdf` + `jspdf-autotable` because they are coupled in the report export path. Keep `xlsx` unchanged, record it as residual risk, and verify every dependency change through install, build, and targeted source compatibility checks.

**Tech Stack:** npm, Node.js 20+, Webpack 5, Axios, jsPDF, jsPDF-AutoTable, SheetJS (`xlsx`), Markdown docs

---

## File Structure Map

- `E:/skrisi/clonefee/Infinite_Track_Fe/package.json` — direct dependency version ranges for `axios`, `jspdf`, and `jspdf-autotable`.
- `E:/skrisi/clonefee/Infinite_Track_Fe/package-lock.json` — resolved dependency tree after remediation installs.
- `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/authService.js` — representative auth-layer `axios` usage to verify compatibility.
- `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/userService.js` — large service module with multiple `axios` calls; useful compatibility check target.
- `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/bookingService.js` — representative CRUD `axios` usage.
- `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/attendanceService.js` — representative `axios` usage with auth headers and delete flow.
- `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/reportService.js` — representative report-fetch `axios` usage and dev fallback behavior.
- `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/utils/reportGenerator.js` — coupled `jspdf`, `jspdf-autotable`, and `xlsx` usage; the only file that may need minimal source adjustment for PDF export compatibility.
- `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-17-minimal-safe-audit-remediation-design.md` — approved design/spec for this remediation.

### Task 1: Patch `axios` with the smallest safe direct-dependency update

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/package.json:48-67`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/package-lock.json`
- Test: `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/authService.js`
- Test: `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/userService.js`
- Test: `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/bookingService.js`
- Test: `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/attendanceService.js`
- Test: `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/reportService.js`

- [ ] **Step 1: Capture the current `axios` range, installed version, and usage surface**

Run:
```bash
python - <<'PY'
import json
from pathlib import Path
root = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe")
pkg = json.loads((root / "package.json").read_text())
print("package.json axios:", pkg["dependencies"]["axios"])
PY
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" ls axios --depth=0
python - <<'PY'
from pathlib import Path
files = [
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/authService.js"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/userService.js"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/bookingService.js"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/attendanceService.js"),
    Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/src/js/services/reportService.js"),
]
for path in files:
    text = path.read_text()
    if "axios" in text:
        print(path.name, "uses axios")
PY
```
Expected:
- `package.json axios:` prints the current version range.
- `npm ls` prints the installed axios version.
- All listed service files print as axios consumers.

- [ ] **Step 2: Update `axios` to the latest safe direct version without broadening scope**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" install axios@latest
```
Expected:
- `package.json` updates only the `axios` dependency entry.
- `package-lock.json` refreshes to the matching installed tree.
- No other direct dependency is intentionally changed in this step.

- [ ] **Step 3: Inspect the resulting axios version and package diff**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" ls axios --depth=0
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" diff -- package.json package-lock.json
```
Expected:
- `npm ls` shows the new axios version.
- Diff shows an `axios` update and associated lockfile refresh, without unrelated direct dependency edits.

- [ ] **Step 4: Verify install/build still succeed after the axios update**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" install
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build
```
Expected:
- Install succeeds.
- Build succeeds.
- No source edits are required for service-layer `axios` usage.

- [ ] **Step 5: Confirm audit impact and commit the targeted axios remediation**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" audit
```
Expected:
- `axios` should no longer appear with the previous advisory set, or the reported exposure should be reduced to the upgraded version range if registry metadata lags.

Then commit:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add package.json package-lock.json
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "fix: remediate axios audit findings"
```
Expected:
- One commit containing only the axios-targeted dependency and lockfile changes.

### Task 2: Patch `jspdf` and `jspdf-autotable` together and keep PDF export source-compatible

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/package.json:48-67`
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/package-lock.json`
- Modify if needed: `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/utils/reportGenerator.js:1-220`
- Test: `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/utils/reportGenerator.js`

- [ ] **Step 1: Capture the current jsPDF package ranges, installed versions, and import usage**

Run:
```bash
python - <<'PY'
import json
from pathlib import Path
root = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe")
pkg = json.loads((root / "package.json").read_text())
print("package.json jspdf:", pkg["dependencies"]["jspdf"])
print("package.json jspdf-autotable:", pkg["dependencies"]["jspdf-autotable"])
PY
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" ls jspdf jspdf-autotable --depth=0
python - <<'PY'
from pathlib import Path
path = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/src/js/utils/reportGenerator.js")
for i, line in enumerate(path.read_text().splitlines(), start=1):
    if i <= 10 or "new jsPDF" in line or "autoTable(" in line:
        if i <= 10 or "new jsPDF" in line or "autoTable(" in line:
            print(f"{i}: {line}")
PY
```
Expected:
- Output shows the current dependency ranges and installed versions.
- Output confirms `reportGenerator.js` imports `jspdf` and `jspdf-autotable` and uses `new jsPDF()` / `autoTable(...)`.

- [ ] **Step 2: Update `jspdf` and `jspdf-autotable` together**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" install jspdf@latest jspdf-autotable@latest
```
Expected:
- `package.json` updates the two dependency entries.
- `package-lock.json` refreshes to the matching tree.
- No unrelated direct dependency is intentionally changed in this step.

- [ ] **Step 3: Check whether `reportGenerator.js` still matches the installed API surface**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" ls jspdf jspdf-autotable --depth=0
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build
```
Expected:
- Best case: build succeeds without any source change, proving the current imports/API are still compatible.
- If build fails because of `jspdf` / `jspdf-autotable` API mismatch, only then continue to Step 4.

- [ ] **Step 4: If needed, make the smallest source change only in `reportGenerator.js` and rebuild**

Only if Step 3 fails because of PDF export package API changes, inspect the build error and update `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/utils/reportGenerator.js` minimally so that:
- the file still imports `jspdf` and `jspdf-autotable`
- `new jsPDF()` still creates the document instance
- table generation still uses the package’s supported call form

After the minimal fix, run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build
```
Expected:
- Build succeeds.
- No unrelated report/export refactor is introduced.

- [ ] **Step 5: Confirm audit impact and commit the targeted PDF export remediation**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" audit
```
Expected:
- The advisory footprint for `jspdf` / `jspdf-autotable` should be reduced relative to the starting state.
- If `dompurify` remains, it should reflect the dependency graph of the upgraded `jspdf` package rather than the older vulnerable path.

Then commit:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add package.json package-lock.json src/js/utils/reportGenerator.js
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "fix: remediate pdf export audit findings"
```
Expected:
- One commit containing the jsPDF dependency update, lockfile refresh, and `reportGenerator.js` only if a source fix was actually required.

### Task 3: Record `xlsx` as residual risk and produce the final audit delta

**Files:**
- Modify: `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-17-minimal-safe-audit-remediation-design.md`
- Test: final `npm audit` output and source usage verification in `E:/skrisi/clonefee/Infinite_Track_Fe/src/js/utils/reportGenerator.js`

- [ ] **Step 1: Reconfirm that `xlsx` is still used directly and still has no upstream fix**

Run:
```bash
python - <<'PY'
from pathlib import Path
path = Path(r"E:/skrisi/clonefee/Infinite_Track_Fe/src/js/utils/reportGenerator.js")
for i, line in enumerate(path.read_text().splitlines(), start=1):
    if 'xlsx' in line.lower() or 'XLSX.' in line:
        print(f"{i}: {line}")
PY
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" audit
```
Expected:
- Output confirms direct `xlsx` usage in `reportGenerator.js`.
- Audit output still reports `xlsx` as unresolved / no fix available.

- [ ] **Step 2: Add a residual-risk note to the approved remediation spec**

Append this section to the end of `E:/skrisi/clonefee/Infinite_Track_Fe/docs/superpowers/specs/2026-04-17-minimal-safe-audit-remediation-design.md`:

```md
## Residual Risk Note
- `xlsx` remains in use at `src/js/utils/reportGenerator.js` for Excel export.
- Current audit data reports no upstream fix available for the known advisory set affecting `xlsx`.
- This remediation intentionally leaves `xlsx` unchanged in the minimal-safe phase.
- Recommended follow-up: evaluate a replacement/export strategy in a separate scoped remediation if the project’s risk posture requires eliminating this dependency.
```

- [ ] **Step 3: Produce the final audit delta after the targeted updates**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" audit
```
Expected:
- Audit output still contains some findings, but the targeted direct-dependency findings for `axios` and `jspdf` should be reduced compared with the starting state.
- `xlsx` should remain as an explicit unresolved item.

- [ ] **Step 4: Verify the repo still installs and builds after the full minimal-safe remediation set**

Run:
```bash
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" install
npm --prefix "E:/skrisi/clonefee/Infinite_Track_Fe" run build
```
Expected:
- Install succeeds.
- Build succeeds.
- No new source file outside the intended scope was modified.

- [ ] **Step 5: Commit the residual-risk note and final remediation state**

Run:
```bash
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" add docs/superpowers/specs/2026-04-17-minimal-safe-audit-remediation-design.md package-lock.json package.json src/js/utils/reportGenerator.js
git -C "E:/skrisi/clonefee/Infinite_Track_Fe" commit -m "docs: record residual xlsx audit risk"
```
Expected:
- One final commit captures the explicit residual-risk note and any last lockfile/source state from the completed remediation.
- If `reportGenerator.js` was not changed in Task 2, `git add` will simply ignore it as unchanged.

## Self-Review Checklist

- Spec coverage: this plan covers targeted remediation for `axios`, coordinated remediation for `jspdf` + `jspdf-autotable`, explicit residual-risk handling for `xlsx`, and verification via install/build/audit delta.
- Placeholder scan: there are no `TODO`/`TBD` markers; each task includes exact commands and exact file targets.
- Type consistency: the same files and package names are used consistently across tasks, and `xlsx` is consistently treated as unchanged residual risk rather than an implementation target.
