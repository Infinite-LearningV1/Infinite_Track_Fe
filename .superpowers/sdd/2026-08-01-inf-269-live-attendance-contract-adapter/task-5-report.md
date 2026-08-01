# Task 5 Report - Built attendance table contract

## Scope

- Added exact development dependency `parse5@7.3.0`.
- Added a production-build DOM contract test for `build/management-attendance.html`.
- Bound only Pegawai, Tanggal, Kehadiran, and Status to the Backend sort state.
- Kept Mode, Lokasi, and Aksi static.
- Rendered Backend mode/status labels before key-based fallback text while retaining key-based badge classes.
- Rendered list location exclusively from `location.available` and `location.description`.
- Proved list location summaries do not initialize a map and detail coordinates remain the map owner.
- Did not modify Backend code or add local row sorting.

## TDD evidence

RED command:

```powershell
npm run build
node --test tests/attendance-built-page-contract.test.js tests/attendance-audit-table.test.js tests/attendance-truthfulness-template.test.js tests/attendance-audit-state.test.js
```

Observed expected RED: 44 tests, 40 passed, 4 failed. The failures were the missing built sort controls, missing supported sort bindings, missing live label/location bindings, and coordinate-dependent list location presentation.

GREEN command:

```powershell
$tests = Get-ChildItem tests -Filter 'attendance-*.test.js' | ForEach-Object FullName
node --test $tests
```

Observed GREEN: 124 tests passed, 0 failed.

## Additional verification

- `npm run build`: passed.
- Prettier completed for all touched source, tests, and package manifests.
- `git diff --check`: passed.
- Existing Node module-type warnings remain unchanged.
- `npm install` reported 19 existing audit findings (2 low, 6 moderate, 8 high, 3 critical); no audit remediation was attempted because it is outside Task 5 scope.
