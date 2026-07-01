import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const statsPartial = readFileSync(
  join(root, "src", "partials", "cards", "stats-card-group.html"),
  "utf8",
);
const exportReportModal = readFileSync(
  join(root, "src", "partials", "modal", "export-report-modal.html"),
  "utf8",
);
const cockpitGrid = readFileSync(
  join(root, "src", "partials", "dashboard", "dashboard-cockpit-grid.html"),
  "utf8",
);
const indexHtml = readFileSync(join(root, "src", "index.html"), "utf8");
const mapDetailModal = readFileSync(
  join(root, "src", "partials", "modal", "map-detail-modal.html"),
  "utf8",
);

test("dashboard stats partial keeps export trigger lightweight and includes modal partial", () => {
  assert.match(statsPartial, /Dashboard Analytics/);
  assert.match(statsPartial, /cockpit\.kpis/);
  assert.match(statsPartial, /x-text="card\.title"/);
  assert.match(statsPartial, /card\.state === 'ready' \? card\.value : '—'/);
  assert.match(
    statsPartial,
    /card\.state === 'ready' \? card\.detail : card\.message/,
  );
  assert.match(statsPartial, /@click="openExportModal\(\)"/);
  assert.match(statsPartial, /x-model="dashboardRange"/);
  assert.match(statsPartial, /@change="onDashboardRangeChange\(\)"/);
  assert.match(statsPartial, /<include src="\.\.\/modal\/export-report-modal\.html" \/>/);
  assert.doesNotMatch(statsPartial, /x-model="filters\.period"/);
  assert.doesNotMatch(statsPartial, /Filter period for dashboard and export/);
  assert.doesNotMatch(statsPartial, /@click="exportSelected\('pdf'\)"/);
  assert.doesNotMatch(statsPartial, /@click="exportSelected\('excel'\)"/);
  assert.doesNotMatch(statsPartial, /Phone Number/);
  assert.doesNotMatch(statsPartial, /Recommended Action/);
  assert.doesNotMatch(statsPartial, /Management Cockpit/);
  assert.doesNotMatch(statsPartial, /Verified backend truth first/);
  assert.doesNotMatch(statsPartial, /card\.meta\.presentation/);
  assert.doesNotMatch(statsPartial, /cardSummaryData\./);
});

test("export report modal partial matches redesigned contract-aware layout", () => {
  assert.match(exportReportModal, /Export Attendance Report/);
  assert.match(exportReportModal, /Choose the report format and data scope for the selected period\./);
  assert.match(exportReportModal, /x-text="getExportPeriodLabel\(\)"/);
  assert.match(exportReportModal, /x-for="card in exportFormatCards"/);
  assert.match(exportReportModal, /@click="selectExportFormat\(card\.value\)"/);
  assert.match(exportReportModal, /x-text="card\.title"/);
  assert.match(exportReportModal, /x-text="card\.description"/);
  assert.match(exportReportModal, /x-for="feature in card\.features"/);
  assert.match(exportReportModal, /x-text="feature"/);
  assert.match(exportReportModal, /Export Scope/);
  assert.match(exportReportModal, /x-for="option in exportScopeOptions"/);
  assert.match(exportReportModal, /name="export-scope"/);
  assert.match(exportReportModal, /@change="selectExportScope\(option\.value\)"/);
  assert.match(exportReportModal, /x-text="option\.label"/);
  assert.match(exportReportModal, /x-text="option\.note"/);
  assert.match(exportReportModal, /Additional Options/);
  assert.match(exportReportModal, /x-for="option in exportAdditionalOptions"/);
  assert.match(exportReportModal, /@change="toggleExportOption\(option\.key\)"/);
  assert.match(exportReportModal, /Export is generated from validated attendance records for the selected period\./);
  assert.match(exportReportModal, /x-text="exportProgressMessage \|\| 'Preparing export file\.\.\.'"/);
  assert.match(exportReportModal, /x-if="!isExporting && exportInlineError"/);
  assert.match(exportReportModal, /@click="confirmExport\(\)"/);
  assert.match(exportReportModal, />\s*Cancel\s*</);
  assert.match(exportReportModal, /Export Report/);
  assert.match(exportReportModal, /x-show="!option\.enabled && option\.note"/);
  assert.match(exportReportModal, /:disabled="!selectedExportFormat \|\| isExporting"/);
  assert.match(exportReportModal, /x-show="isExportModalOpen"/);
  assert.match(exportReportModal, /@keydown.escape.window="closeExportModal\(\)"/);
  assert.match(exportReportModal, /@click="closeExportModal\(\)"/);
  assert.doesNotMatch(exportReportModal, /Phone Number/);
  assert.doesNotMatch(exportReportModal, /Recommended Action/);
});

test("dashboard cockpit grid renders map-only hero, preview trend, and backend-derived mode mix card", () => {
  assert.match(cockpitGrid, /cockpit\.hero\.title/);
  assert.match(cockpitGrid, /cockpit\.hero\.subtitle/);
  assert.match(cockpitGrid, /Map View/);
  assert.match(cockpitGrid, /dashboardMapView/);
  assert.match(cockpitGrid, /Location Data Scope/);
  assert.match(
    cockpitGrid,
    /xl:grid-cols-\[minmax\(0,1\.7fr\)_minmax\(280px,0\.8fr\)\]/,
  );
  assert.match(cockpitGrid, /min-h-\[400px\]/);
  assert.match(cockpitGrid, /xl:min-h-\[440px\]/);
  assert.match(cockpitGrid, /h-\[360px\]/);
  assert.match(cockpitGrid, /xl:h-\[400px\]/);
  assert.match(
    cockpitGrid,
    /Primary markers reflect the backend map context available in this analytics snapshot/,
  );
  assert.match(cockpitGrid, /Map context points without coordinates/);
  assert.doesNotMatch(
    statsPartial,
    /<option value="30d">Last 30 Days<\/option>/,
  );
  assert.doesNotMatch(
    statsPartial,
    /<option value="current_month">Current Month<\/option>/,
  );
  assert.doesNotMatch(statsPartial, /<option value="all">All Time<\/option>/);
  assert.doesNotMatch(statsPartial, /<option value="daily">Daily<\/option>/);
  assert.doesNotMatch(statsPartial, /<option value="weekly">Weekly<\/option>/);
  assert.match(cockpitGrid, /canRenderDashboardMap\(\)/);
  assert.match(cockpitGrid, /openMapLocation\(location\)/);
  assert.match(cockpitGrid, /cockpit\.middlePanels/);
  assert.match(cockpitGrid, /cockpit\.bottomPanels/);
  assert.match(
    cockpitGrid,
    /panel\.key === 'historicalTrend' && panel\.data\?\.ranges\?\.length/,
  );
  assert.match(cockpitGrid, /getSelectedTrendRange\(panel\)/);
  assert.match(cockpitGrid, /trendRange = range\.key/);
  assert.doesNotMatch(cockpitGrid, /selectedRangeKey/);
  assert.match(cockpitGrid, /panel\.data\.ranges/);
  assert.match(cockpitGrid, /x-text="range\.label"/);
  assert.match(cockpitGrid, /max-w-full overflow-x-auto custom-scrollbar/);
  assert.match(cockpitGrid, /id="chartEleven"/);
  assert.match(cockpitGrid, /min-w-\[1000px\]/);
  assert.match(cockpitGrid, /viewBox="0 0 992 220"/);
  assert.match(cockpitGrid, /historicalTrendOntimeGradient/);
  assert.match(cockpitGrid, /historicalTrendLateGradient/);
  assert.match(cockpitGrid, /historicalTrendAlphaGradient/);
  assert.match(cockpitGrid, /#465fff/);
  assert.match(cockpitGrid, /#f59e0b/);
  assert.match(cockpitGrid, /#ef4444/);
  assert.match(cockpitGrid, /selectedRange\.metrics/);
  assert.match(cockpitGrid, /x-for="series in selectedRange\.series"/);
  assert.match(cockpitGrid, /areaPath/);
  assert.match(cockpitGrid, /chartPath/);
  assert.match(cockpitGrid, /series\?\.points/);
  assert.match(cockpitGrid, /selectedRange\.xAxisLabels/);
  assert.match(cockpitGrid, /selectedRange\.yAxisLabels/);
  assert.match(cockpitGrid, /series\.label/);
  assert.match(
    cockpitGrid,
    /Preview-only On Time, Late, and Alpha historical attendance trend chart/,
  );
  assert.match(
    cockpitGrid,
    /Historical attendance trend chart for On Time, Late, and Alpha/,
  );
  assert.match(cockpitGrid, /Preview data/);
  assert.match(cockpitGrid, /Backend trend feed pending/);
  assert.doesNotMatch(cockpitGrid, /Excluded from export/);
  assert.match(cockpitGrid, /Backend-backed trend/);
  assert.match(
    cockpitGrid,
    /get isModeMixReady\(\) \{ return panel\.key === 'modeMix' && panel\.state === 'ready' \}/,
  );
  assert.match(
    cockpitGrid,
    /get hasTrendRanges\(\) \{ return panel\.key === 'historicalTrend' && panel\.data\?\.ranges\?\.length \}/,
  );
  assert.match(
    cockpitGrid,
    /get usesDetailedLayout\(\) \{ return this\.isModeMixReady \|\| this\.hasTrendRanges \}/,
  );
  assert.match(cockpitGrid, /metricToneClass\(tone\)/);
  assert.match(cockpitGrid, /panel\.data\.chartStyle/);
  assert.match(cockpitGrid, /panel\.data\.total/);
  assert.match(cockpitGrid, /panel\.data\.segments/);
  assert.match(cockpitGrid, /segment\.percentageLabel/);
  assert.match(cockpitGrid, /panel\.detail/);
  assert.match(cockpitGrid, /chartDarkStyle/);
  assert.match(cockpitGrid, /min-height: 286px/);
  assert.match(cockpitGrid, /Backend-backed/);
  assert.match(cockpitGrid, /state === 'backendRequired'/);
  assert.match(cockpitGrid, /!usesDetailedLayout/);
  assert.doesNotMatch(cockpitGrid, /Sessions By Device/);
  assert.doesNotMatch(cockpitGrid, /Desktop/);
  assert.doesNotMatch(cockpitGrid, /Mobile/);
  assert.doesNotMatch(cockpitGrid, /Tablet/);
  assert.doesNotMatch(cockpitGrid, /\$212,142\.12/);
  assert.doesNotMatch(cockpitGrid, /\$30,321\.23/);
  assert.doesNotMatch(cockpitGrid, /Avg\. Yearly Profit/);
  assert.doesNotMatch(cockpitGrid, /Sales/);
  assert.doesNotMatch(cockpitGrid, /Revenue/);
  assert.doesNotMatch(cockpitGrid, /Target you.ve set for each month/);
  assert.doesNotMatch(cockpitGrid, /Map data pending backend feed/);
  assert.doesNotMatch(cockpitGrid, /locationViewMode/);
  assert.doesNotMatch(cockpitGrid, /List View/);
  assert.doesNotMatch(cockpitGrid, /Today Locations \/ Map Snapshot/);
  assert.doesNotMatch(cockpitGrid, /View Mode/);
  assert.doesNotMatch(cockpitGrid, /Snapshot Note/);
  assert.doesNotMatch(
    cockpitGrid,
    /Switch between map and list shells without changing the backend truth surface/,
  );
  assert.doesNotMatch(
    cockpitGrid,
    /This panel stays scoped to a truthful today-location snapshot and does not imply continuous live tracking/,
  );
  assert.doesNotMatch(cockpitGrid, /cockpit\.panels/);
  assert.doesNotMatch(cockpitGrid, /needsVerification/);
  assert.doesNotMatch(cockpitGrid, /reportWorkspace\./);
  assert.doesNotMatch(cockpitGrid, /panel\.data\.previewRanges/);
  assert.doesNotMatch(cockpitGrid, /panel\.data\.yAxisLabels/);
  assert.doesNotMatch(cockpitGrid, /selectedRange\.comparisonAreaPath/);
  assert.doesNotMatch(cockpitGrid, /selectedRange\.comparisonChartPath/);
  assert.doesNotMatch(cockpitGrid, /selectedRange\.comparisonSeries/);
  assert.doesNotMatch(cockpitGrid, /Preview late \/ alpha risk/);
});

test("dashboard map detail modal keeps the canonical backend-backed context fields", () => {
  assert.match(mapDetailModal, /max-h-\[calc\(100vh-2\.5rem\)\]/);
  assert.match(mapDetailModal, /max-w-7xl/);
  assert.match(
    mapDetailModal,
    /modal-body flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:flex-row/,
  );
  assert.match(mapDetailModal, /lg:w-5\/12/);
  assert.match(mapDetailModal, /lg:w-7\/12/);
  assert.match(mapDetailModal, /Status Kehadiran/);
  assert.match(mapDetailModal, /Tanggal Absensi/);
  assert.match(mapDetailModal, /Work Mode/);
  assert.match(mapDetailModal, /Sumber Data/);
  assert.match(mapDetailModal, /Catatan Snapshot/);
  assert.match(
    mapDetailModal,
    /selectedUserLocation\.status \|\| 'Unavailable'/,
  );
  assert.match(
    mapDetailModal,
    /selectedUserLocation\.attendanceDate \|\| 'Unavailable'/,
  );
  assert.match(
    mapDetailModal,
    /selectedUserLocation\.workMode \|\| selectedUserLocation\.mode \|\| 'Unavailable'/,
  );
  assert.match(
    mapDetailModal,
    /selectedUserLocation\.sourceNote \|\| 'Unavailable'/,
  );
});

test("dashboard index composes header and cockpit grid without the visible report table", () => {
  const statsIndex = indexHtml.indexOf(
    "./partials/cards/stats-card-group.html",
  );
  const gridIndex = indexHtml.indexOf(
    "./partials/dashboard/dashboard-cockpit-grid.html",
  );
  const workspaceIndex = indexHtml.indexOf(
    "./partials/dashboard/dashboard-report-workspace.html",
  );
  const tableIndex = indexHtml.indexOf(
    "./partials/table/table-dashboard-report.html",
  );

  assert.notEqual(statsIndex, -1);
  assert.notEqual(gridIndex, -1);
  assert.equal(workspaceIndex, -1);
  assert.equal(tableIndex, -1);
  assert.ok(statsIndex < gridIndex);
});
