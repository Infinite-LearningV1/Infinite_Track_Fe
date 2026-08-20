import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const statsPartial = readFileSync(
  join(root, "src", "partials", "cards", "stats-card-group.html"),
  "utf8",
);
const analyticsHeaderPartial = readFileSync(
  join(root, "src", "partials", "dashboard", "dashboard-analytics-header.html"),
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
const historicalTrendPartial = readFileSync(
  join(root, "src", "partials", "dashboard", "historical-trend-panel.html"),
  "utf8",
);
const fuzzyAhpPartial = readFileSync(
  join(root, "src", "partials", "dashboard", "fuzzy-ahp-panel.html"),
  "utf8",
);
const geofenceEvidencePartial = readFileSync(
  join(root, "src", "partials", "dashboard", "geofence-evidence-panel.html"),
  "utf8",
);
const attendanceModePartial = readFileSync(
  join(root, "src", "partials", "dashboard", "attendance-mode-panel.html"),
  "utf8",
);
const indexHtml = readFileSync(join(root, "src", "index.html"), "utf8");
const styleCss = readFileSync(join(root, "src", "css", "style.css"), "utf8");
const dashboardCockpitService = readFileSync(
  join(root, "src", "js", "services", "dashboardCockpitService.js"),
  "utf8",
);
const geofenceEvidenceComponent = readFileSync(
  join(root, "src", "js", "components", "geofenceEvidencePanel.js"),
  "utf8",
);
const historicalTrendComponent = readFileSync(
  join(root, "src", "js", "components", "historicalTrendPanel.js"),
  "utf8",
);
const mapDetailModal = readFileSync(
  join(root, "src", "partials", "modal", "map-detail-modal.html"),
  "utf8",
);

test("dashboard stats partial renders the analytics header, KPI shell, and export modal", () => {
  assert.match(statsPartial, /dashboard-analytics-header\.html/);
  assert.match(statsPartial, /cockpit\.kpis/);
  assert.match(statsPartial, /x-text="card\.title"/);
  assert.match(statsPartial, /getCockpitKpiDisplayValue\(card\)/);
  assert.match(statsPartial, /getCockpitKpiSupportText\(card\)/);
  assert.match(exportReportModal, /Export Attendance Report/);
  assert.match(exportReportModal, /x-text="card\.title"/);
  assert.match(exportReportModal, /card\.value === 'pdf'/);
  assert.match(exportReportModal, /card\.value === 'excel'/);
  assert.match(exportReportModal, /@click="selectExportFormat\(card\.value\)"/);

  assert.match(analyticsHeaderPartial, /Dashboard Analytics/);
  assert.match(analyticsHeaderPartial, /@click="openExportModal\(\)"/);
  assert.match(
    analyticsHeaderPartial,
    /@click="toggleDashboardRangeDropdown\(\)"/,
  );
  assert.match(
    analyticsHeaderPartial,
    /@click="selectDashboardRangeOption\(option\.value\)"/,
  );
  assert.match(analyticsHeaderPartial, /dashboardHeaderState\.selectedLabel/);
  assert.match(analyticsHeaderPartial, /dashboardHeaderState\.isDropdownOpen/);
  assert.match(analyticsHeaderPartial, /toggleDashboardRangeDropdown\(\)/);
  assert.match(
    analyticsHeaderPartial,
    /x-for="option in dashboardRangeOptions"/,
  );
  assert.match(analyticsHeaderPartial, /x-text="option\.label"/);
  assert.match(analyticsHeaderPartial, /x-ref="dashboardAnalyticsDatePicker"/);
  assert.match(
    analyticsHeaderPartial,
    /Select custom dashboard analytics range/,
  );
  assert.match(
    analyticsHeaderPartial,
    /x-for="option in dashboardRangeOptions"/,
  );
  assert.match(analyticsHeaderPartial, /x-text="option\.label"/);
  assert.doesNotMatch(analyticsHeaderPartial, /x-model="filters\.period"/);
  assert.doesNotMatch(
    analyticsHeaderPartial,
    /Filter period for dashboard and export/,
  );
  assert.doesNotMatch(analyticsHeaderPartial, /@click="exportToPDF\(\)"/);
  assert.doesNotMatch(analyticsHeaderPartial, /@click="exportToExcel\(\)"/);
  assert.doesNotMatch(statsPartial, /Management Cockpit/);
  assert.doesNotMatch(statsPartial, /Verified backend truth first/);
  assert.doesNotMatch(statsPartial, /card\.meta\.presentation/);
  assert.doesNotMatch(statsPartial, /cardSummaryData\./);
});

test("export report modal partial matches redesigned contract-aware layout", () => {
  assert.match(exportReportModal, /Export Attendance Report/);
  assert.match(
    exportReportModal,
    /Choose the report format and data scope for the selected period\./,
  );
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
  assert.match(
    exportReportModal,
    /@change="selectExportScope\(option\.value\)"/,
  );
  assert.match(exportReportModal, /x-text="option\.label"/);
  assert.match(exportReportModal, /x-text="option\.note"/);
  assert.match(exportReportModal, /Additional Options/);
  assert.match(exportReportModal, /x-for="option in exportAdditionalOptions"/);
  assert.match(
    exportReportModal,
    /@change="toggleExportOption\(option\.key\)"/,
  );
  assert.match(
    exportReportModal,
    /Export is generated from validated attendance records for the selected\s+period\./,
  );
  assert.match(
    exportReportModal,
    /x-text="exportProgressMessage \|\| 'Preparing export file\.\.\.'"/,
  );
  assert.match(exportReportModal, /x-if="!isExporting && exportInlineError"/);
  assert.match(exportReportModal, /@click="confirmExport\(\)"/);
  assert.match(exportReportModal, />\s*Cancel\s*</);
  assert.match(exportReportModal, /Export Report/);
  assert.match(exportReportModal, /x-show="!option\.enabled && option\.note"/);
  assert.match(
    exportReportModal,
    /:disabled="!selectedExportFormat \|\| isExporting"/,
  );
  assert.match(exportReportModal, /x-show="isExportModalOpen"/);
  assert.match(
    exportReportModal,
    /@keydown.escape.window="closeExportModal\(\)"/,
  );
  assert.match(exportReportModal, /@click="closeExportModal\(\)"/);
  assert.doesNotMatch(exportReportModal, /Phone Number/);
  assert.doesNotMatch(exportReportModal, /Recommended Action/);
});

test("dashboard cockpit grid renders map-only hero, preview trend, and backend-derived mode mix card", () => {
  assert.doesNotMatch(cockpitGrid, /cockpit\.hero\.title/);
  assert.doesNotMatch(cockpitGrid, /cockpit\.hero\.subtitle/);
  assert.match(cockpitGrid, /dashboardMapView/);
  assert.match(cockpitGrid, /Today Locations \/ Live Map/);
  assert.doesNotMatch(cockpitGrid, /Preview sample/);
  assert.match(cockpitGrid, /modeSummary\?\.modes/);
  assert.match(cockpitGrid, /relative isolate/);
  assert.match(cockpitGrid, /relative z-0 h-\[360px\]/);
  assert.match(cockpitGrid, /style="z-index: 0"/);
  assert.match(cockpitGrid, /dashboard-live-map-shell/);
  assert.match(
    styleCss,
    /\.dashboard-live-map-shell \.leaflet-top\.leaflet-left/,
  );
  assert.match(styleCss, /right: 1rem/);
  assert.match(styleCss, /left: auto/);
  assert.match(styleCss, /\.dark \.dashboard-live-map-shell \.leaflet-tile/);
  assert.match(cockpitGrid, /style="z-index: 1200"/);
  assert.doesNotMatch(cockpitGrid, /leaflet-top\.leaflet-right/);
  assert.match(cockpitGrid, /bg-white\/95/);
  assert.match(cockpitGrid, /backdrop-blur-sm/);
  assert.match(cockpitGrid, /Total Check-ins/);
  assert.match(cockpitGrid, /`\$\{mode\.key\}-summary`/);
  assert.match(cockpitGrid, /grid-cols-2/);
  assert.match(cockpitGrid, /sm:grid-cols-4/);
  assert.doesNotMatch(cockpitGrid, /Map View/);
  assert.doesNotMatch(cockpitGrid, /Location Data Scope/);
  assert.doesNotMatch(
    cockpitGrid,
    /xl:grid-cols-\[minmax\(0,1\.7fr\)_minmax\(280px,0\.8fr\)\]/,
  );
  assert.match(cockpitGrid, /dashboard-historical-overview-grid/);
  assert.doesNotMatch(cockpitGrid, /min-h-\[400px\]/);
  assert.doesNotMatch(cockpitGrid, /xl:min-h-\[440px\]/);
  assert.match(cockpitGrid, /h-\[360px\]/);
  assert.match(cockpitGrid, /xl:h-\[400px\]/);
  assert.match(cockpitGrid, /border-gray-200 bg-white/);
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
  assert.doesNotMatch(cockpitGrid, /openMapLocation\(location\)/);
  assert.match(cockpitGrid, /cockpit\.sections/);
  assert.match(cockpitGrid, /get historicalOverviewSection\(\)/);
  assert.match(cockpitGrid, /section\.key === 'historicalOverview'/);
  assert.match(cockpitGrid, /dashboard-historical-overview-grid/);
  assert.doesNotMatch(
    cockpitGrid,
    /section\.key === 'geofenceEvidence' \|\| section\.key === 'fahpRecap'/,
  );
  assert.match(cockpitGrid, /get liveOperationsMapSection\(\)/);
  assert.match(cockpitGrid, /section\.key === 'liveOperationsMap'/);
  assert.ok(
    cockpitGrid.indexOf('x-if="liveOperationsMapSection"') <
      cockpitGrid.indexOf('x-if="historicalOverviewSection"'),
  );
  assert.match(
    cockpitGrid,
    /panel\.key === 'historicalTrend' && panel\.data\?\.ranges\?\.length/,
  );
  assert.match(cockpitGrid, /historical-trend-panel\.html/);
  assert.doesNotMatch(cockpitGrid, /selectedRangeKey/);
  assert.doesNotMatch(cockpitGrid, /Excluded from export/);
  assert.match(historicalTrendPartial, /getHistoricalTrendViewState\(panel\)/);
  assert.match(historicalTrendPartial, /trendRange = range\.key/);
  assert.match(historicalTrendPartial, /viewState\.ranges/);
  assert.match(historicalTrendPartial, /viewState\.legendItems/);
  assert.doesNotMatch(historicalTrendPartial, /viewState\.summaryItems/);
  assert.doesNotMatch(historicalTrendPartial, /item\.key\}-summary/);
  assert.match(historicalTrendPartial, /setActiveTrendHover\(panel, \$event\)/);
  assert.match(historicalTrendPartial, /clearActiveTrendHover\(\)/);
  assert.match(historicalTrendPartial, /viewState\.activeHoverPoint/);
  assert.match(historicalTrendPartial, /viewState\.crosshairStyle/);
  assert.match(historicalTrendPartial, /viewState\.tooltipStyle/);
  assert.match(historicalTrendPartial, /viewState\.getMarkerStyle\(item\)/);
  assert.doesNotMatch(historicalTrendPartial, /viewState\.endBadges/);
  assert.doesNotMatch(
    historicalTrendPartial,
    /viewState\.selectedRange\.metrics/,
  );
  assert.match(historicalTrendPartial, /viewState\.seriesMarkup/);
  assert.match(
    historicalTrendComponent,
    /<circle cx="\$\{x\}" cy="\$\{y\}" r="4"/,
  );
  assert.match(historicalTrendComponent, /stroke="#ffffff" stroke-width="2"/);
  assert.match(historicalTrendPartial, /viewState\.seriesTransform/);
  assert.match(historicalTrendPartial, /viewState\.xAxisMarkup/);
  assert.match(historicalTrendPartial, /viewState\.yAxisMarkup/);
  assert.match(historicalTrendPartial, /x-html="viewState\.yAxisMarkup"/);
  assert.match(historicalTrendPartial, /x-html="viewState\.xAxisMarkup"/);
  assert.doesNotMatch(
    historicalTrendPartial,
    /x-for="\(tick, index\) in viewState\.selectedRange\.yAxisLabels"/,
  );
  assert.doesNotMatch(
    historicalTrendPartial,
    /x-for="\(label, index\) in viewState\.selectedRange\.xAxisLabels"/,
  );
  assert.equal(
    (historicalTrendPartial.match(/d="M 0 (0|48|96|144|192|240) H 932"/g) ?? [])
      .length,
    6,
  );
  assert.match(
    historicalTrendPartial,
    /custom-scrollbar max-w-full overflow-x-auto/,
  );
  assert.match(historicalTrendPartial, /id="chartEleven"/);
  assert.match(historicalTrendPartial, /min-height: 325px/);
  assert.match(historicalTrendPartial, /h-\[310px\]/);
  assert.match(historicalTrendPartial, /min-w-\[190px\]/);
  assert.match(historicalTrendPartial, /viewBox="0 0 1000 310"/);
  assert.match(historicalTrendPartial, /min-w-\[1000px\]/);
  assert.match(historicalTrendPartial, /style="min-height: 325px"/);
  assert.match(
    historicalTrendPartial,
    /style="transform: translate\(46px, 30px\)"/,
  );
  assert.match(historicalTrendPartial, /viewState\.xAxisMarkup/);
  assert.match(historicalTrendPartial, /viewState\.yAxisMarkup/);
  assert.match(historicalTrendPartial, /<defs id="historicalTrendSvgDefs">/);
  assert.match(historicalTrendPartial, /historicalTrendOntimeGradient/);
  assert.match(historicalTrendPartial, /historicalTrendLateGradient/);
  assert.match(historicalTrendPartial, /historicalTrendAlphaGradient/);
  assert.match(
    historicalTrendPartial,
    /stop-opacity="0\.45" stop-color="rgba\(70,95,255,0\.45\)" offset="0"/,
  );
  assert.match(
    historicalTrendPartial,
    /stop-opacity="0\.45" stop-color="rgba\(156,185,255,0\.45\)" offset="0"/,
  );
  assert.match(
    historicalTrendPartial,
    /stop-opacity="0\.45" stop-color="rgba\(239,68,68,0\.45\)" offset="0"/,
  );
  assert.match(
    historicalTrendPartial,
    /stop-opacity="0" stop-color="rgba\(255,255,255,0\)" offset="1"/,
  );
  assert.match(
    historicalTrendPartial,
    /Preview-only On Time, Late, and Alpha historical attendance trend chart/,
  );
  assert.match(
    historicalTrendPartial,
    /Historical attendance trend chart for On Time, Late, and Alpha/,
  );
  assert.match(cockpitGrid, /rounded-2xl overflow-hidden/);
  assert.match(
    historicalTrendPartial,
    /rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white\/\[0\.03\]/,
  );
  assert.match(
    historicalTrendPartial,
    /text-xl font-semibold leading-tight tracking-\[-0\.025em\]/,
  );
  assert.match(
    historicalTrendPartial,
    /apexcharts-tooltip apexcharts-theme-light/,
  );
  assert.match(historicalTrendPartial, /apexcharts-tooltip-title/);
  assert.match(
    historicalTrendPartial,
    /apexcharts-tooltip-series-group apexcharts-active/,
  );
  assert.match(historicalTrendPartial, /apexcharts-tooltip-y-group/);
  assert.match(
    historicalTrendPartial,
    /border-t border-gray-100 p-5 sm:p-6 dark:border-gray-800/,
  );
  assert.match(historicalTrendPartial, /x-if="viewState\.ranges\.length > 1"/);
  assert.doesNotMatch(historicalTrendPartial, /Preview data/);
  assert.doesNotMatch(historicalTrendPartial, /Backend trend feed pending/);
  assert.doesNotMatch(historicalTrendPartial, /Backend-backed trend/);
  assert.doesNotMatch(historicalTrendPartial, /metricToneClass\(tone\)/);
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
  assert.match(cockpitGrid, /attendance-mode-panel\.html/);
  assert.match(attendanceModePartial, /getAttendanceModeViewState\(panel\)/);
  assert.match(attendanceModePartial, /viewState\.chartSlicesMarkup/);
  assert.match(attendanceModePartial, /x-html="viewState\.chartSlicesMarkup"/);
  assert.doesNotMatch(
    attendanceModePartial,
    /x-for="slice in viewState\.chartSlices"/,
  );
  assert.match(
    attendanceModePartial,
    /text-xl font-semibold leading-tight tracking-\[-0\.025em\]/,
  );
  assert.match(
    attendanceModePartial,
    /x-text="viewState\.title \|\| 'Attendance Mode'"/,
  );
  assert.match(attendanceModePartial, /darkMode \? '#1d2939' : '#ffffff'/);
  assert.match(attendanceModePartial, /text-\[11px\] font-semibold uppercase/);
  assert.match(
    attendanceModePartial,
    /darkMode \? 'fill-white' : 'fill-gray-800'/,
  );
  assert.match(attendanceModePartial, /viewState\.activeSegmentLabel/);
  assert.match(attendanceModePartial, /viewState\.activeSegmentValue/);
  assert.match(attendanceModePartial, /viewState\.legendItems/);
  assert.match(attendanceModePartial, /handleSliceHover\(event\)/);
  assert.match(attendanceModePartial, /data-segment-key/);
  assert.match(
    attendanceModePartial,
    /@mousemove="handleSliceHover\(\$event\)"/,
  );
  assert.match(
    attendanceModePartial,
    /@mouseenter="activeSegmentKey = item\.key"/,
  );
  assert.match(attendanceModePartial, /@mouseleave="activeSegmentKey = null"/);
  assert.match(attendanceModePartial, /chartSixteen/);
  assert.match(attendanceModePartial, /chartDarkStyle/);
  assert.match(attendanceModePartial, /min-height: 329px/);
  assert.match(attendanceModePartial, /viewBox="0 0 400 264"/);
  assert.match(attendanceModePartial, /max-w-\[320px\]/);
  assert.match(attendanceModePartial, /<circle\s+cx="200"\s+cy="132"\s+r="78"/);
  assert.match(attendanceModePartial, /text-\[28px\] font-semibold/);
  assert.doesNotMatch(
    attendanceModePartial,
    /rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white\/\[0\.03\]/,
  );
  assert.doesNotMatch(attendanceModePartial, /border-t border-gray-100/);
  assert.doesNotMatch(attendanceModePartial, /Backend-backed/);
  assert.doesNotMatch(attendanceModePartial, /Sessions By Device/);
  assert.doesNotMatch(attendanceModePartial, /Desktop/);
  assert.doesNotMatch(attendanceModePartial, /Mobile/);
  assert.doesNotMatch(attendanceModePartial, /Tablet/);
  assert.match(cockpitGrid, /get geofenceEvidenceSection\(\)/);
  assert.match(cockpitGrid, /section\.key === 'geofenceEvidence'/);
  assert.match(cockpitGrid, /get fahpRecapSection\(\)/);
  assert.match(cockpitGrid, /section\.key === 'fahpRecap'/);
  assert.match(cockpitGrid, /geofenceEvidenceSection \|\| fahpRecapSection/);
  assert.match(
    cockpitGrid,
    /groupedSection in \[geofenceEvidenceSection, fahpRecapSection\]\.filter\(Boolean\)/,
  );
  assert.match(cockpitGrid, /get isGeofenceEvidenceReady\(\)/);
  assert.match(cockpitGrid, /usesCustomReadyLayout/);
  assert.match(cockpitGrid, /geofence-evidence-panel\.html/);
  assert.match(
    cockpitGrid,
    /panel\.key === 'geofenceEvidence' && panel\.state === 'ready' && panel\.data\?\.rawCounts/,
  );
  assert.match(cockpitGrid, /grid gap-6 xl:grid-cols-1/);
  assert.doesNotMatch(cockpitGrid, /grid gap-6 xl:grid-cols-2/);
  assert.match(cockpitGrid, /fuzzy-ahp-panel\.html/);
  assert.match(cockpitGrid, /get isFuzzyAhpPanel\(\)/);
  assert.match(
    cockpitGrid,
    /'border-transparent bg-transparent p-0 shadow-none dark:border-transparent dark:bg-transparent': usesCustomReadyLayout/,
  );
  assert.match(
    cockpitGrid,
    /class="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white\/\[0\.03\]"/,
  );
  assert.match(cockpitGrid, /x-if="!usesCustomReadyLayout"/);
  assert.doesNotMatch(dashboardCockpitService, /PREVIEW_GEOFENCE_EVIDENCE/);
  assert.match(dashboardCockpitService, /buildGeofenceEvidenceViewModel/);
  assert.match(dashboardCockpitService, /Geofence Operational Context/);
  assert.match(geofenceEvidencePartial, /x-text="viewState\.title"/);
  assert.match(
    geofenceEvidencePartial,
    /getGeofenceEvidenceViewState\(panel\)/,
  );
  assert.match(geofenceEvidencePartial, /viewState\.statCards/);
  assert.match(geofenceEvidenceComponent, /ENTER Events/);
  assert.match(geofenceEvidenceComponent, /EXIT Events/);
  assert.match(geofenceEvidenceComponent, /Total Events/);
  assert.match(geofenceEvidenceComponent, /People Seen/);
  assert.match(geofenceEvidencePartial, /viewState\.summaryLead/);
  assert.match(geofenceEvidencePartial, /viewState\.summaryText/);
  assert.match(geofenceEvidencePartial, /viewState\.notes/);
  assert.match(
    geofenceEvidenceComponent,
    /final attendance validity remains determined/,
  );
  assert.match(
    geofenceEvidencePartial,
    /rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/,
  );
  assert.match(geofenceEvidencePartial, /bg-brand-50/);
  assert.doesNotMatch(
    geofenceEvidencePartial,
    /border-brand-100 bg-white px-4 py-3/,
  );
  assert.doesNotMatch(
    geofenceEvidencePartial,
    /dark:border-brand-500\/20 dark:bg-gray-900/,
  );
  assert.doesNotMatch(
    geofenceEvidencePartial,
    /ENTER \/ EXIT \+ attendance evidence/,
  );
  assert.doesNotMatch(geofenceEvidencePartial, /Preview dummy/);
  assert.doesNotMatch(geofenceEvidencePartial, /date/i);
  assert.match(fuzzyAhpPartial, /Fuzzy AHP Decision Center/);
  assert.doesNotMatch(fuzzyAhpPartial, /Preview dummy/);
  assert.doesNotMatch(fuzzyAhpPartial, /bukan backend truth/);
  assert.doesNotMatch(
    fuzzyAhpPartial,
    /viewState\.isPreview \? 'Preview dummy/,
  );
  assert.doesNotMatch(fuzzyAhpPartial, /activeFahpTab/);
  assert.match(fuzzyAhpPartial, /@click="selectFahpType\(option\.key\)"/);
  assert.match(fuzzyAhpPartial, /data-fahp-status/);
  assert.match(fuzzyAhpPartial, /Consistency Check/);
  assert.match(fuzzyAhpPartial, /CR Value/);
  assert.match(fuzzyAhpPartial, /Threshold/);
  assert.match(fuzzyAhpPartial, /Konsistensi/);
  assert.match(fuzzyAhpPartial, /Criteria Weights/);
  assert.match(fuzzyAhpPartial, /Ranking Preview \(Top 5\)/);
  assert.match(fuzzyAhpPartial, /viewState\.criteriaRows/);
  assert.match(fuzzyAhpPartial, /viewState\.rankingRows/);
  assert.match(fuzzyAhpPartial, /viewState\.updatedAtLabel/);
  assert.match(fuzzyAhpPartial, /mt-3 max-w-full overflow-x-auto/);
  assert.match(fuzzyAhpPartial, /fuzzy-ahp-card-grid/);
  assert.match(styleCss, /\.fuzzy-ahp-card-grid \{/);
  assert.match(styleCss, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(
    styleCss,
    /@media \(min-width: 640px\) \{\r?\n    \.fuzzy-ahp-card-grid \{/,
  );
  assert.match(styleCss, /min-width: 760px/);
  assert.match(
    styleCss,
    /grid-template-columns: 150px minmax\(260px, 1fr\) minmax\(245px, 0\.9fr\)/,
  );
  assert.doesNotMatch(fuzzyAhpPartial, /min-width: 760px/);
  assert.doesNotMatch(
    fuzzyAhpPartial,
    /grid-template-columns: 150px minmax\(260px, 1fr\) minmax\(245px, 0\.9fr\)/,
  );
  assert.match(fuzzyAhpPartial, /dark:bg-white\/\[0\.03\]/);
  assert.match(fuzzyAhpPartial, /dark:bg-gray-900/);
  assert.match(fuzzyAhpPartial, /<ul[\s\S]*class="mt-3 flex flex-col/);
  assert.match(fuzzyAhpPartial, /<li[\s\S]*class="flex items-center gap-2/);
  assert.match(fuzzyAhpPartial, /class="min-w-0 flex-1"/);
  assert.match(fuzzyAhpPartial, /last:border-b-0/);
  assert.match(fuzzyAhpPartial, /dark:text-gray-400/);
  assert.match(fuzzyAhpPartial, /text-success-600 dark:text-success-500/);
  assert.match(fuzzyAhpPartial, /bg-success-500/);
  assert.doesNotMatch(fuzzyAhpPartial, /text-emerald-500/);
  assert.doesNotMatch(
    fuzzyAhpPartial,
    /rounded-lg border border-gray-100 bg-gray-50 px-2\.5 py-1\.5/,
  );
  assert.doesNotMatch(
    fuzzyAhpPartial,
    /style="min-width: 760px; grid-template-columns: 150px minmax\(260px, 1fr\) minmax\(245px, 0\.9fr\);"/,
  );
  assert.doesNotMatch(
    cockpitGrid,
    /section\.key === 'geofenceEvidence' \|\| section\.key === 'fahpRecap'/,
  );
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
  assert.doesNotMatch(indexHtml, /Loading summary data\.\.\./);
  assert.doesNotMatch(indexHtml, /x-show="loading"/);
});
