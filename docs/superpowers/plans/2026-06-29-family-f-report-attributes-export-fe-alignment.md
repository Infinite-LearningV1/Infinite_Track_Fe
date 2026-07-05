# Family F Report Attributes Export FE Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyelaraskan FE PDF/Excel export dengan backend response final `GET /api/summary/reports` tanpa mengarang field di luar contract canonical.

**Architecture:** Export tetap client-generated, tetapi seluruh payload dibekukan ke contract canonical backend: `summary` untuk aggregate, `report.data` untuk row detail, `report.pagination` untuk completeness, `report.user_attendance_summary` untuk compact per-user summary bila tersedia, dan `analytics.discipline_analysis` hanya untuk aggregate discipline yang explicit. Implementasi dibagi menjadi tiga area: generator contract alignment, orchestration/UI alignment, dan regression coverage agar target visual tetap tunduk ke backend truth.

**Tech Stack:** Alpine.js, Webpack multi-page app, jsPDF, jspdf-autotable, xlsx, node:test

## Global Constraints

- Backend tetap source of truth.
- Web FE tidak boleh mengarang reporting truth.
- Export tidak boleh terlihat seperti final ledger kalau datanya hanya presentation/reporting.
- Jika value tidak tersedia, mark `Unavailable` atau omit.
- Dashboard analytics tidak boleh dipakai sebagai report/export truth kecuali field tersebut explicit di canonical report/export response.
- Canonical report/export source adalah `GET /api/summary/reports`.
- `GET /api/summary/reports/pdf` dan `GET /api/summary/reports/excel` bukan dependency aktif FE pada scope ini.
- `phone_number`, `needs_attention`, `recommended_action`, dan explicit `per_user_avg_discipline_score` tidak boleh dianggap available bila tidak ada di canonical response.
- PDF harus menghilangkan section `Report Insight`.
- Workbook target hanya `Summary`, `Attendance Report`, dan `Discipline Insight`.
- Export harus fail closed saat completeness payload tidak bisa diverifikasi.
- REQUIRES REPO VERIFICATION untuk klaim runtime end-to-end di luar test file yang disebut eksplisit di plan ini.

---

## File Structure

- `src/js/utils/reportGenerator.js`
  - Tanggung jawab: membentuk PDF layout model dan workbook yang tunduk ke canonical backend response.
  - Perubahan utama: hapus drift lama (`Honest Insight`, `User Attendance Summary` workbook sheet, asumsi phone number / recommended action), bekukan mapping field final, dan pertahankan only-safe derived values.
- `src/js/utils/reportGenerator.test.js`
  - Tanggung jawab: regression suite untuk PDF/Excel generator contract.
  - Perubahan utama: ubah fixture dan assertion agar sesuai contract final; tambahkan coverage untuk field absent/out-of-scope.
- `src/js/features/dashboard/dashboard.js`
  - Tanggung jawab: load export payload, fail-closed completeness, orchestration export PDF/Excel.
  - Perubahan utama: jaga load path tetap `/summary/reports`, pastikan export payload yang diteruskan ke generator memuat hanya section canonical yang dibutuhkan, dan rapikan copy/error untuk field absent.
- `src/partials/cards/stats-card-group.html`
  - Tanggung jawab: modal export UI.
  - Perubahan utama: sinkronkan copy dengan contract final, hilangkan implied capability yang belum dijamin backend, dan pertahankan pilihan format yang mengikuti canonical response.
- `tests/dashboard-cockpit-template.test.js`
  - Tanggung jawab: regression test untuk export modal partial.
  - Perubahan utama: ubah assertion copy/modal agar sesuai contract final.
- `tests/dashboard/dashboardPageOrchestration.test.js`
  - Tanggung jawab: orchestration regression.
  - Perubahan utama: tambahkan coverage untuk export behavior yang fail-closed dan tidak mempromosikan field absent menjadi fakta.

### Task 1: Selaraskan `reportGenerator.js` dengan contract final PDF/Excel

**Files:**
- Modify: `src/js/utils/reportGenerator.js`
- Test: `src/js/utils/reportGenerator.test.js`

**Interfaces:**
- Consumes:
  - `summaryData.summary`
  - `summaryData.report.data`
  - `summaryData.report.pagination`
  - `summaryData.report.user_attendance_summary`
  - `summaryData.analytics?.discipline_analysis?.average_discipline_score`
- Produces:
  - `buildPdfReportLayoutModel(summaryData, period, generatedAt)`
  - `buildWorkbook(summaryData, period, generatedAt)`
  - `generatePDF(summaryData, period)`
  - `generateExcel(summaryData, period)`

- [ ] **Step 1: Tulis test gagal untuk workbook target baru tanpa drift lama**

```js
test("report generator builds workbook with only Summary, Attendance Report, and Discipline Insight sheets", () => {
  const workbook = reportGenerator.buildWorkbook(COMPLETE_SUMMARY_DATA, "monthly", GENERATED_AT);

  assert.deepEqual(workbook.SheetNames, [
    "Summary",
    "Attendance Report",
    "Discipline Insight",
  ]);

  const summarySheet = workbook.Sheets.Summary;
  assert.equal(getSheetValue(summarySheet, "A1"), "Infinite Track Palu");
  assert.notEqual(getSheetValue(summarySheet, "A16"), "Honest Insight");

  const attendanceSheet = workbook.Sheets["Attendance Report"];
  assert.equal(getSheetValue(attendanceSheet, "A1"), "Full Name");
  assert.equal(getSheetValue(attendanceSheet, "E1"), "Email");
  assert.equal(getSheetValue(attendanceSheet, "O1"), "Discipline Label");
  assert.equal(getSheetValue(attendanceSheet, "P1"), "Location Description");

  const disciplineSheet = workbook.Sheets["Discipline Insight"];
  assert.equal(getSheetValue(disciplineSheet, "A1"), "Discipline Insight");
});
```

- [ ] **Step 2: Jalankan test untuk memastikan gagal**

Run: `node --test src/js/utils/reportGenerator.test.js`
Expected: FAIL karena workbook saat ini masih memuat `User Attendance Summary` dan `Honest Insight`.

- [ ] **Step 3: Implementasikan perubahan minimal di generator workbook**

```js
buildSummarySheetRows(summaryData, period = "all", generatedAt = new Date()) {
  return [
    ["Infinite Track Palu"],
    ["Attendance Report Export"],
    [""],
    ...this.buildPdfMetadataRows(summaryData?.report, period, generatedAt),
    [""],
    ["Executive KPI Summary"],
    ["Metric", "Value"],
    ...this.buildExecutiveSummaryRows(summaryData?.summary, summaryData?.report),
    [""],
    ["Summary Statistics"],
    ["Category", "Count"],
    ...this.buildSummaryRows(summaryData?.summary),
  ];
}

buildWorkbook(summaryData, period = "all", generatedAt = new Date()) {
  const reportRows = this.validateExportData(summaryData, "Excel");
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet(
    this.buildSummarySheetRows(summaryData, period, generatedAt),
  );
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const attendanceSheet = XLSX.utils.aoa_to_sheet(
    this.buildAttendanceReportSheetRows(reportRows),
  );
  XLSX.utils.book_append_sheet(workbook, attendanceSheet, "Attendance Report");

  const disciplineSourceRows = Array.isArray(summaryData?.report?.user_attendance_summary)
    ? summaryData.report.user_attendance_summary
    : [];
  const disciplineSheet = XLSX.utils.aoa_to_sheet(
    this.buildDisciplineInsightSheetRows(disciplineSourceRows, period, generatedAt),
  );
  XLSX.utils.book_append_sheet(workbook, disciplineSheet, "Discipline Insight");

  return workbook;
}
```

- [ ] **Step 4: Tulis test gagal untuk field absent yang harus out-of-scope**

```js
test("report generator does not expose out-of-scope fields as available workbook columns", () => {
  const rows = reportGenerator.buildAttendanceReportSheetRows(COMPLETE_SUMMARY_DATA.report.data);

  assert.equal(rows[0].includes("Phone Number"), false);
  assert.equal(rows[1].includes("08123456789"), false);
});

test("report generator marks needs attention as unavailable/out-of-scope in executive cards", () => {
  const cards = reportGenerator.buildExecutiveSummaryCards(
    COMPLETE_SUMMARY_DATA.summary,
    COMPLETE_SUMMARY_DATA.report.data,
    COMPLETE_SUMMARY_DATA.analytics,
  );

  assert.equal(cards[3].label, "Needs Attention");
  assert.equal(cards[3].state, "backendRequired");
  assert.equal(cards[3].value, "Unavailable");
});
```

- [ ] **Step 5: Jalankan test untuk memastikan gagal**

Run: `node --test src/js/utils/reportGenerator.test.js`
Expected: FAIL karena header attendance sheet saat ini masih memuat `Phone Number`, dan executive card lama belum memakai nilai `Unavailable` yang konsisten untuk absent field.

- [ ] **Step 6: Implementasikan perubahan minimal pada mapping field final**

```js
buildAttendanceReportSheetRows(rows = []) {
  return [
    [
      "Full Name",
      "NIP/NIM",
      "Role",
      "Email",
      "Attendance Date",
      "Check In Time",
      "Check Out Time",
      "Work Hours",
      "Status",
      "Work Category",
      "Information",
      "Notes",
      "Discipline Score",
      "Discipline Label",
      "Location Description",
    ],
    ...this.buildExcelReportRows(rows),
  ];
}

buildExecutiveSummaryCards(summary = {}, reportRows = [], analytics = {}) {
  return [
    this.buildAttendanceRateCard(summary),
    this.buildLateAlphaRiskCard(summary),
    this.buildAverageDisciplineCard(analytics),
    {
      label: "Needs Attention",
      value: "Unavailable",
      caption: "Field is not present in the canonical backend response.",
      state: "backendRequired",
      accent: [236, 72, 153],
    },
  ];
}
```

- [ ] **Step 7: Tulis test gagal untuk Discipline Insight yang harus berbasis `user_attendance_summary`**

```js
test("discipline insight sheet uses backend user_attendance_summary rows instead of raw report rows", () => {
  const rows = reportGenerator.buildDisciplineInsightSheetRows(
    COMPLETE_SUMMARY_DATA.report.user_attendance_summary,
    "monthly",
    GENERATED_AT,
  );

  assert.equal(rows[0][0], "Discipline Insight");
  assert.equal(rows[6][0], "Employee Name");
  assert.equal(rows[6][1], "Division");
  assert.equal(rows[6][2], "Attendance Rate");
  assert.equal(rows[7][0], "Rina Summary");
  assert.equal(rows[7][1], "Operations");
  assert.equal(rows[7][3], "2");
  assert.equal(rows[7][4], "0");
});
```

- [ ] **Step 8: Jalankan test untuk memastikan gagal**

Run: `node --test src/js/utils/reportGenerator.test.js`
Expected: FAIL karena `buildDisciplineInsightSheetRows()` saat ini masih memakai raw report rows dan layout availability lama.

- [ ] **Step 9: Implementasikan Discipline Insight minimal sesuai contract final**

```js
buildDisciplineInsightSheetRows(rows = [], period = "all", generatedAt = new Date()) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [
      ["Discipline Insight"],
      [""],
      ["Period", this.formatPeriod(period)],
      ["Generated on", this.formatGeneratedOn(generatedAt)],
      [""],
      ["Availability", "Backend Required"],
      ["Insight Note", "Backend user_attendance_summary is unavailable for the selected period."],
    ];
  }

  return [
    ["Discipline Insight"],
    [""],
    ["Period", this.formatPeriod(period)],
    ["Generated on", this.formatGeneratedOn(generatedAt)],
    [""],
    [
      "Employee Name",
      "Division",
      "Attendance Rate",
      "Late Count",
      "Alpha Count",
      "Discipline Label",
    ],
    ...rows.map((item) => [
      this.formatUnavailableValue(item.full_name),
      this.formatUnavailableValue(item.division),
      this.buildAttendanceRateFromSummaryRow(item),
      this.formatUnavailableValue(item.late_days),
      this.formatUnavailableValue(item.alpha_days),
      "Unavailable",
    ]),
  ];
}
```

- [ ] **Step 10: Jalankan seluruh test generator untuk memastikan lulus**

Run: `node --test src/js/utils/reportGenerator.test.js`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/js/utils/reportGenerator.js src/js/utils/reportGenerator.test.js
git commit -m "refactor: align export generator with canonical report contract"
```

### Task 2: Selaraskan orchestration export di `dashboard.js`

**Files:**
- Modify: `src/js/features/dashboard/dashboard.js`
- Test: `tests/dashboard/dashboardPageOrchestration.test.js`

**Interfaces:**
- Consumes:
  - `fetchSummaryReport({ period, from, to, page, limit })`
  - `generatePDFReport(exportData, period)`
  - `generateExcelReport(exportData, period)`
- Produces:
  - `loadExportData()` yang hanya mengembalikan section canonical yang dibutuhkan generator
  - `loadValidatedExportData(format)`
  - `downloadPDF()` dan `downloadExcel()` yang fail-closed

- [ ] **Step 1: Tulis test gagal untuk canonical export payload pass-through**

```js
test("loadExportData keeps canonical summary, report, and analytics sections for export consumers", async () => {
  const dashboard = createDashboardPageState({});
  const component = dashboard.getInitialState();

  component.fetchSummaryReport = async () => ({
    summary: { total_ontime: 2, total_late: 1, total_alpha: 0 },
    report: {
      data: [{ full_name: "Rina" }],
      pagination: { total_records: 1 },
      user_attendance_summary: [{ full_name: "Rina Summary" }],
    },
    analytics: {
      discipline_analysis: { average_discipline_score: 88 },
    },
  });

  const exportData = await component.loadExportData();

  assert.deepEqual(exportData.analytics, {
    discipline_analysis: { average_discipline_score: 88 },
  });
  assert.equal(exportData.report.user_attendance_summary[0].full_name, "Rina Summary");
});
```

- [ ] **Step 2: Jalankan test untuk memastikan gagal**

Run: `node --test tests/dashboard/dashboardPageOrchestration.test.js`
Expected: FAIL karena `loadExportData()` saat ini hanya meneruskan `summary` dan `report`.

- [ ] **Step 3: Implementasikan pass-through canonical sections minimal**

```js
const exportData = {
  summary: response.summary,
  report: response.report,
  analytics: response.analytics,
};
```

- [ ] **Step 4: Tulis test gagal untuk fail-closed completeness message yang jujur**

```js
test("ensureExportDatasetComplete throws canonical contract error when total metadata is missing", () => {
  const dashboard = createDashboardPageState({});
  const component = dashboard.getInitialState();

  assert.throws(
    () => component.ensureExportDatasetComplete({ report: { data: [{}], pagination: {} } }),
    /Export data completeness could not be verified for the selected period/,
  );
});
```

- [ ] **Step 5: Jalankan test untuk memastikan gagal bila message berubah**

Run: `node --test tests/dashboard/dashboardPageOrchestration.test.js`
Expected: FAIL bila regression message atau behavior tidak sesuai.

- [ ] **Step 6: Rapikan minimal orchestration copy/error tanpa mengubah boundary**

```js
if (!exportData || !exportData.summary || !exportData.report) {
  this.showNotification(
    "The canonical export payload is missing required summary/report sections.",
    "error",
  );
  return null;
}
```

- [ ] **Step 7: Jalankan test orchestration untuk memastikan lulus**

Run: `node --test tests/dashboard/dashboardPageOrchestration.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/js/features/dashboard/dashboard.js tests/dashboard/dashboardPageOrchestration.test.js
git commit -m "refactor: keep export orchestration on canonical report payload"
```

### Task 3: Selaraskan modal export UI dengan contract final

**Files:**
- Modify: `src/partials/cards/stats-card-group.html`
- Test: `tests/dashboard-cockpit-template.test.js`

**Interfaces:**
- Consumes:
  - `openExportModal()`
  - `closeExportModal()`
  - `exportSelected('pdf' | 'excel')`
  - `dashboardRange`
- Produces:
  - Modal copy yang tidak menjanjikan capability di luar canonical response
  - CTA format yang konsisten dengan export contract final

- [ ] **Step 1: Tulis test gagal untuk copy modal contract-final**

```js
test("dashboard stats partial describes export as canonical report-response output", () => {
  assert.match(statsPartial, /Export Attendance Report/);
  assert.match(statsPartial, /canonical backend report payload/i);
  assert.doesNotMatch(statsPartial, /Phone Number/);
  assert.doesNotMatch(statsPartial, /Recommended Action/);
});
```

- [ ] **Step 2: Jalankan test untuk memastikan gagal**

Run: `node --test tests/dashboard-cockpit-template.test.js`
Expected: FAIL bila modal copy masih menyebut capability atau framing lama.

- [ ] **Step 3: Implementasikan perubahan copy minimal di partial**

```html
<p class="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
  Choose the report format for the active Dashboard Range. Export uses the
  canonical backend report response and fails closed when the dataset is
  incomplete.
</p>

<span class="mt-2 block text-sm leading-6 text-gray-500 dark:text-gray-400">
  Printable management report for the active Dashboard Range,
  generated from the canonical backend report response.
</span>

<span class="mt-2 block text-sm leading-6 text-gray-500 dark:text-gray-400">
  Spreadsheet workbook for HR/admin analysis using canonical backend rows
  from the active Dashboard Range.
</span>
```

- [ ] **Step 4: Jalankan test partial untuk memastikan lulus**

Run: `node --test tests/dashboard-cockpit-template.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/partials/cards/stats-card-group.html tests/dashboard-cockpit-template.test.js
git commit -m "copy: align export modal with canonical backend contract"
```

## Self-Review

- **Spec coverage:**
  - Canonical `/api/summary/reports` ownership covered in Task 2 and Task 3.
  - PDF removes `Report Insight`/drift lama covered in Task 1.
  - Workbook target reduced to `Summary`, `Attendance Report`, `Discipline Insight` covered in Task 1.
  - Out-of-scope fields (`phone_number`, `needs_attention`, `recommended_action`, explicit per-user avg discipline) covered in Task 1.
  - Fail-closed export completeness covered in Task 2.
  - Modal/export UI copy aligned to backend final covered in Task 3.
- **Placeholder scan:** tidak ada `TODO`, `TBD`, atau step kosong.
- **Type consistency:** semua task memakai nama fungsi yang sudah ada di codebase (`buildWorkbook`, `loadExportData`, `exportSelected`, `generatePDFReport`, `generateExcelReport`).

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-29-family-f-report-attributes-export-fe-alignment.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
