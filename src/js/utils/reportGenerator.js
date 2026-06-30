import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const SUMMARY_FIELDS = [
  ["On Time", "total_ontime"],
  ["Late", "total_late"],
  ["Alpha (Absent)", "total_alpha"],
  ["Work From Office", "total_wfo"],
  ["Work From Home", "total_wfh"],
  ["Work From Anywhere", "total_wfa"],
];

const PDF_ATTENDANCE_TABLE_COLUMNS = [
  { header: "Employee", width: 26, halign: "left" },
  { header: "Role/Division", width: 20, halign: "left" },
  { header: "Attendance Coverage", width: 22, halign: "center" },
  { header: "On Time", width: 11, halign: "center" },
  { header: "Late", width: 11, halign: "center" },
  { header: "Alpha", width: 11, halign: "center" },
  { header: "Work Mode Mix", width: 28, halign: "center" },
  { header: "Latest Status", width: 18, halign: "center" },
  { header: "Notes", width: 31, halign: "left" },
];

const DEFAULT_BADGE_STYLE = {
  fillColor: [241, 245, 249],
  textColor: [100, 116, 139],
  borderColor: [203, 213, 225],
};

const STATUS_BADGE_STYLES = {
  ontime: {
    fillColor: [220, 252, 231],
    textColor: [21, 128, 61],
    borderColor: [134, 239, 172],
  },
  "on time": {
    fillColor: [220, 252, 231],
    textColor: [21, 128, 61],
    borderColor: [134, 239, 172],
  },
  present: {
    fillColor: [220, 252, 231],
    textColor: [21, 128, 61],
    borderColor: [134, 239, 172],
  },
  late: {
    fillColor: [255, 237, 213],
    textColor: [194, 65, 12],
    borderColor: [253, 186, 116],
  },
  alpha: {
    fillColor: [252, 231, 243],
    textColor: [190, 24, 93],
    borderColor: [249, 168, 212],
  },
  absent: {
    fillColor: [252, 231, 243],
    textColor: [190, 24, 93],
    borderColor: [249, 168, 212],
  },
  unavailable: DEFAULT_BADGE_STYLE,
};

const WORK_MODE_BADGE_STYLES = {
  wfo: {
    fillColor: [245, 243, 255],
    textColor: [109, 40, 217],
    borderColor: [196, 181, 253],
  },
  "work from office": {
    fillColor: [245, 243, 255],
    textColor: [109, 40, 217],
    borderColor: [196, 181, 253],
  },
  wfh: {
    fillColor: [236, 254, 255],
    textColor: [14, 116, 144],
    borderColor: [165, 243, 252],
  },
  "work from home": {
    fillColor: [236, 254, 255],
    textColor: [14, 116, 144],
    borderColor: [165, 243, 252],
  },
  wfa: {
    fillColor: [254, 249, 195],
    textColor: [161, 98, 7],
    borderColor: [253, 224, 71],
  },
  "work from anywhere": {
    fillColor: [254, 249, 195],
    textColor: [161, 98, 7],
    borderColor: [253, 224, 71],
  },
  unavailable: DEFAULT_BADGE_STYLE,
};

class ReportGenerator {
  buildSummaryRows(summary = {}) {
    return SUMMARY_FIELDS.map(([label, field]) => [
      label,
      this.formatUnavailableValue(summary[field]),
    ]);
  }

  buildExecutiveSummaryRows(summary = {}, report = {}) {
    return [
      ["Total Records", this.formatReportTotalRecords(report)],
      ["On Time", this.formatUnavailableValue(summary.total_ontime)],
      ["Late", this.formatUnavailableValue(summary.total_late)],
      ["Alpha (Absent)", this.formatUnavailableValue(summary.total_alpha)],
    ];
  }

  buildPdfMetadataRows(report = {}, period = "all", generatedAt = new Date()) {
    return [
      ["Period", this.formatPeriod(period)],
      ["Generated on", this.formatGeneratedOn(generatedAt)],
      ["Total Records", this.formatReportTotalRecords(report)],
      ["Provenance", this.buildExportProvenanceNote()],
    ];
  }

  buildSummarySheetRows(summaryData, period = "all", generatedAt = new Date()) {
    return [
      ["Infinite Track Palu"],
      ["Attendance Report Export"],
      [""],
      ...this.buildPdfMetadataRows(summaryData?.report, period, generatedAt),
      [""],
      ["Executive KPI Summary"],
      ["Metric", "Value"],
      ...this.buildExecutiveSummaryRows(
        summaryData?.summary,
        summaryData?.report,
      ),
      [""],
      ["Summary Statistics"],
      ["Category", "Count"],
      ...this.buildSummaryRows(summaryData?.summary),
    ];
  }

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

  buildUserAttendanceSummarySheetRows(rows = []) {
    return [
      this.buildPdfAttendanceTableColumns().map((column) => column.header),
      ...this.buildPdfAttendanceTableRows(rows),
    ];
  }

  extractUserAttendanceSummaryRows(report = {}) {
    if (Array.isArray(report?.user_attendance_summary)) {
      return report.user_attendance_summary;
    }

    return null;
  }

  buildDisciplineInsightSheetRows(
    rows = [],
    period = "all",
    generatedAt = new Date(),
  ) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [
        ["Discipline Insight"],
        [""],
        ["Period", this.formatPeriod(period)],
        ["Generated on", this.formatGeneratedOn(generatedAt)],
        [""],
        ["Availability", "Backend Required"],
        [
          "Insight Note",
          "Backend user_attendance_summary is unavailable for the selected period.",
        ],
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

  hasAvailableValue(value) {
    if (value === null || value === undefined) {
      return false;
    }

    return typeof value !== "string" || value.trim() !== "";
  }

  firstAvailableValue(...values) {
    return values.find((value) => this.hasAvailableValue(value));
  }

  formatUnavailableValue(value) {
    return this.hasAvailableValue(value) ? String(value) : "Unavailable";
  }

  formatPdfDisciplineScore(score) {
    return this.hasAvailableValue(score) ? `${score}/100` : "Unavailable";
  }

  formatGeneratedOn(date = new Date()) {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  formatDateValue(value) {
    if (!this.hasAvailableValue(value)) {
      return "Unavailable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("id-ID");
  }

  formatReportTotalRecords(report = {}) {
    const pagination = report?.pagination || {};
    const rawTotal = Object.prototype.hasOwnProperty.call(
      pagination,
      "total_records",
    )
      ? pagination.total_records
      : pagination.total_items;
    const totalRecords = Number(rawTotal);

    if (
      !this.hasAvailableValue(rawTotal) ||
      !Number.isFinite(totalRecords) ||
      totalRecords < 0 ||
      !Number.isInteger(totalRecords)
    ) {
      return "Unavailable";
    }

    return String(totalRecords);
  }

  extractReportRows(report = {}) {
    if (Array.isArray(report)) {
      return report;
    }

    if (Array.isArray(report?.data)) {
      return report.data;
    }

    return null;
  }

  getUnavailableSummaryLabels(summary = {}) {
    return SUMMARY_FIELDS.filter(
      ([, field]) => !this.hasAvailableValue(summary[field]),
    ).map(([label]) => label);
  }

  buildExportProvenanceNote() {
    return "Client-generated from /summary/reports using the selected report/export period. Missing backend fields remain Unavailable.";
  }

  buildAttendanceRateFromSummaryRow(item = {}) {
    const validAttendanceDays = this.normalizeExplicitCount(
      item.valid_attendance_days,
    );
    const expectedWorkingDays = this.normalizeExplicitCount(
      item.expected_working_days,
    );

    if (validAttendanceDays === null || expectedWorkingDays === null) {
      return "Unavailable";
    }

    if (expectedWorkingDays === 0) {
      return validAttendanceDays === 0 ? "0%" : "Unavailable";
    }

    return this.formatPercentValue(
      (validAttendanceDays / expectedWorkingDays) * 100,
    );
  }

  buildHonestInsightParagraph(summary = {}, report = {}) {
    const unavailableLabels = this.getUnavailableSummaryLabels(summary);
    const totalRecords = this.formatReportTotalRecords(report);

    if (unavailableLabels.length > 0) {
      return `This export uses the /summary/reports response for the selected report/export period and keeps Total Records at ${totalRecords}. ${unavailableLabels.join(", ")} were unavailable in the source payload and remain marked as Unavailable so the report does not invent reporting truth.`;
    }

    return `This export uses the /summary/reports response for the selected report/export period and keeps Total Records at ${totalRecords}. It remains a client-generated operational artifact for review, and any backend field that is absent would stay marked as Unavailable rather than inferred.`;
  }

  normalizeExplicitCount(value) {
    if (!this.hasAvailableValue(value)) {
      return null;
    }

    const count = Number(value);

    if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) {
      return null;
    }

    return count;
  }

  normalizeDisciplineScore(value) {
    if (!this.hasAvailableValue(value)) {
      return null;
    }

    const score = Number(value);

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return null;
    }

    return score;
  }

  formatCompactNumber(value, maximumFractionDigits = 1) {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
      maximumFractionDigits,
    }).format(value);
  }

  formatPercentValue(value) {
    return `${this.formatCompactNumber(value)}%`;
  }

  formatGeneratedOnCompact(date = new Date()) {
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  buildPdfHeaderMetadataRows(period = "all", generatedAt = new Date()) {
    return [
      ["Period", this.formatPeriod(period)],
      ["Generated on", this.formatGeneratedOnCompact(generatedAt)],
      ["Generated by", "Infinite Track System"],
      ["Data source", "/summary/reports payload for selected report/export period"],
    ];
  }

  buildPdfFooterContent(pageNumber) {
    return {
      left: "Generated by Infinite Track System",
      center: `Page ${pageNumber}`,
      right: "Confidential internal report",
    };
  }

  buildExecutiveSummaryCards(summary = {}, rows = [], analytics = {}) {
    const reportRows = Array.isArray(rows) ? rows : [];
    const averageDisciplineScore = this.normalizeDisciplineScore(
      analytics?.discipline_analysis?.average_discipline_score,
    );
    const onTime = this.normalizeExplicitCount(summary.total_ontime);
    const late = this.normalizeExplicitCount(summary.total_late);
    const alpha = this.normalizeExplicitCount(summary.total_alpha);
    const attendanceCountsReady = [onTime, late, alpha].every(
      (value) => value !== null,
    );
    const cards = [];

    if (!attendanceCountsReady) {
      cards.push({
        label: "Attendance Rate",
        value: "Unavailable",
        caption: "Explicit status counts unavailable.",
        state: "needsData",
        accent: [139, 92, 246],
      });
    } else {
      const totalAttendance = onTime + late + alpha;

      if (totalAttendance === 0) {
        cards.push({
          label: "Attendance Rate",
          value: "0%",
          caption: "No explicit attendance rows returned.",
          state: "empty",
          accent: [139, 92, 246],
        });
      } else {
        const presentCount = onTime + late;
        cards.push({
          label: "Attendance Rate",
          value: this.formatPercentValue(
            (presentCount / totalAttendance) * 100,
          ),
          caption: `${presentCount} present of ${totalAttendance} explicit rows.`,
          state: "ready",
          accent: [139, 92, 246],
        });
      }
    }

    if (!attendanceCountsReady) {
      cards.push({
        label: "Late / Alpha Risk",
        value: "Unavailable",
        caption: "Late or alpha counts unavailable.",
        state: "needsData",
        accent: [245, 158, 11],
      });
    } else {
      const totalAttendance = onTime + late + alpha;

      if (totalAttendance === 0) {
        cards.push({
          label: "Late / Alpha Risk",
          value: "0",
          caption: "No explicit attendance rows returned.",
          state: "empty",
          accent: [245, 158, 11],
        });
      } else {
        const riskCount = late + alpha;
        cards.push({
          label: "Late / Alpha Risk",
          value: String(riskCount),
          caption: `${this.formatPercentValue((riskCount / totalAttendance) * 100)} of rows need status review.`,
          state: "ready",
          accent: [245, 158, 11],
        });
      }
    }

    if (averageDisciplineScore !== null) {
      cards.push({
        label: "Avg Discipline",
        value: this.formatCompactNumber(averageDisciplineScore),
        caption: "Explicit backend average discipline score.",
        state: "ready",
        accent: [6, 182, 212],
      });
    } else {
      cards.push({
        label: "Avg Discipline",
        value: "Unavailable",
        caption:
          "Explicit backend average discipline score is not present in the canonical response.",
        state: "backendRequired",
        accent: [6, 182, 212],
      });
    }

    cards.push({
      label: "Needs Attention",
      value: "Unavailable",
      caption: "Field is not present in the canonical backend response.",
      state: "backendRequired",
      accent: [236, 72, 153],
    });

    return cards;
  }

  buildExecutiveKpiCards(summaryData = {}) {
    return this.buildExecutiveSummaryCards(
      summaryData?.summary || {},
      this.extractReportRows(summaryData?.report) || [],
      summaryData?.analytics || {},
    );
  }

  buildAttendanceDistribution(summary = {}) {
    const onTime = this.normalizeExplicitCount(summary.total_ontime);
    const late = this.normalizeExplicitCount(summary.total_late);
    const alpha = this.normalizeExplicitCount(summary.total_alpha);

    if ([onTime, late, alpha].some((value) => value === null)) {
      return {
        title: "Attendance Status Distribution",
        state: "needsData",
        message: "Explicit on-time, late, and alpha counts are unavailable.",
      };
    }

    const total = onTime + late + alpha;

    if (total === 0) {
      return {
        title: "Attendance Status Distribution",
        state: "empty",
        message: "No explicit attendance status counts were returned.",
      };
    }

    const segments = [
      { label: "On Time", value: onTime, color: [139, 92, 246] },
      { label: "Late", value: late, color: [245, 158, 11] },
      { label: "Alpha", value: alpha, color: [236, 72, 153] },
    ].map((segment) => ({
      ...segment,
      percentage: (segment.value / total) * 100,
      percentageLabel: this.formatPercentValue((segment.value / total) * 100),
    }));

    return {
      title: "Attendance Status Distribution",
      state: "ready",
      chartType: "donut",
      note: "Explicit counts from selected-period summary.",
      total,
      segments,
    };
  }

  buildAttendanceStatusStatistic(summary = {}) {
    return this.buildAttendanceDistribution(summary);
  }

  buildWorkModeDistribution(summary = {}) {
    const wfo = this.normalizeExplicitCount(summary.total_wfo);
    const wfh = this.normalizeExplicitCount(summary.total_wfh);
    const wfa = this.normalizeExplicitCount(summary.total_wfa);

    if ([wfo, wfh, wfa].some((value) => value === null)) {
      return {
        title: "Work Mode Distribution",
        state: "needsData",
        message: "Explicit WFO, WFH, and WFA counts are unavailable.",
      };
    }

    const total = wfo + wfh + wfa;

    if (total === 0) {
      return {
        title: "Work Mode Distribution",
        state: "empty",
        message: "No explicit work mode counts were returned.",
      };
    }

    return {
      title: "Work Mode Distribution",
      state: "ready",
      chartType: "horizontalBars",
      note: "Explicit counts from selected-period summary.",
      total,
      bars: [
        { label: "WFO", value: wfo, color: [139, 92, 246] },
        { label: "WFH", value: wfh, color: [6, 182, 212] },
        { label: "WFA", value: wfa, color: [245, 158, 11] },
      ].map((bar) => ({
        ...bar,
        percentage: (bar.value / total) * 100,
        percentageLabel: this.formatPercentValue((bar.value / total) * 100),
      })),
    };
  }

  buildWorkModeStatistic(summary = {}) {
    return this.buildWorkModeDistribution(summary);
  }

  buildDisciplineScoreDistribution(rows = []) {
    const reportRows = Array.isArray(rows) ? rows : [];

    if (reportRows.length === 0) {
      return {
        title: "Discipline Score Range",
        state: "empty",
        message: "No backend rows were returned for discipline scoring.",
      };
    }

    const normalizedScores = reportRows.map((item) =>
      this.normalizeDisciplineScore(item.discipline_score),
    );

    if (normalizedScores.some((score) => score === null)) {
      return {
        title: "Discipline Score Range",
        state: "needsData",
        message:
          "Some backend rows do not provide explicit 0-100 discipline scores.",
      };
    }

    const total = normalizedScores.length;

    return {
      title: "Discipline Score Range",
      state: "ready",
      chartType: "horizontalBars",
      note: `Binned from ${normalizedScores.length} explicit row score${normalizedScores.length === 1 ? "" : "s"}.`,
      total,
      bars: [
        {
          label: "Excellent (85-100)",
          value: normalizedScores.filter((score) => score >= 85).length,
          color: [139, 92, 246],
        },
        {
          label: "Good (70-84)",
          value: normalizedScores.filter((score) => score >= 70 && score < 85)
            .length,
          color: [6, 182, 212],
        },
        {
          label: "Needs Review (50-69)",
          value: normalizedScores.filter((score) => score >= 50 && score < 70)
            .length,
          color: [245, 158, 11],
        },
        {
          label: "Attention (<50)",
          value: normalizedScores.filter((score) => score < 50).length,
          color: [236, 72, 153],
        },
      ].map((bar) => ({
        ...bar,
        percentage: (bar.value / total) * 100,
        percentageLabel: this.formatPercentValue((bar.value / total) * 100),
      })),
    };
  }

  buildDisciplineScoreRangeStatistic(rows = []) {
    return this.buildDisciplineScoreDistribution(rows);
  }

  buildPdfStatisticsCards(summary = {}, rows = []) {
    return [
      this.buildAttendanceDistribution(summary),
      this.buildWorkModeDistribution(summary),
      this.buildDisciplineScoreDistribution(rows),
    ];
  }

  buildPdfAttendanceTableColumns() {
    return PDF_ATTENDANCE_TABLE_COLUMNS;
  }

  buildUserAttendanceRoleDivision(item = {}) {
    const role = this.firstAvailableValue(item.role_name, item.role);
    const division = item.division;
    const parts = [role, division].filter((value) =>
      this.hasAvailableValue(value),
    );

    return parts.length > 0 ? parts.join(" / ") : "Unavailable";
  }

  buildUserAttendanceCoverage(item = {}) {
    return this.formatUnavailableValue(item.attendance_coverage_label);
  }

  buildUserAttendanceWorkModeMix(item = {}) {
    const segments = [
      ["WFO", item.wfo_days],
      ["WFH", item.wfh_days],
      ["WFA", item.wfa_days],
    ];

    if (segments.every(([, value]) => !this.hasAvailableValue(value))) {
      return "Unavailable";
    }

    return segments
      .map(([label, value]) => `${label} ${this.formatUnavailableValue(value)}`)
      .join(" • ");
  }

  buildUserAttendanceLatestStatus(item = {}) {
    return this.formatStatus(item.latest_attendance_status);
  }

  buildUserAttendanceNotes(item = {}) {
    const noteParts = [];

    if (this.hasAvailableValue(item.summary_note)) {
      noteParts.push(String(item.summary_note));
    }

    if (this.hasAvailableValue(item.latest_attendance_date)) {
      noteParts.push(
        `Latest attendance: ${this.formatDateValue(item.latest_attendance_date)}.`,
      );
    }

    if (!this.hasAvailableValue(item.expected_working_days)) {
      noteParts.push("Expected working days unavailable.");
    }

    if (!this.hasAvailableValue(item.attendance_coverage_label)) {
      noteParts.push("Attendance coverage label unavailable.");
    }

    return noteParts.length > 0 ? noteParts.join(" ") : "Unavailable";
  }

  buildPdfAttendanceTableRows(rows = []) {
    return rows.map((item) => [
      this.formatUnavailableValue(item.full_name),
      this.buildUserAttendanceRoleDivision(item),
      this.buildUserAttendanceCoverage(item),
      this.formatUnavailableValue(item.on_time_days),
      this.formatUnavailableValue(item.late_days),
      this.formatUnavailableValue(item.alpha_days),
      this.buildUserAttendanceWorkModeMix(item),
      this.buildUserAttendanceLatestStatus(item),
      this.buildUserAttendanceNotes(item),
    ]);
  }

  buildUserAttendanceSummaryFallbackRows(
    message = "Backend user_attendance_summary is unavailable for the selected period.",
  ) {
    return [
      [
        "Backend Required",
        "Unavailable",
        "Unavailable",
        "Unavailable",
        "Unavailable",
        "Unavailable",
        "Unavailable",
        "Unavailable",
        message,
      ],
    ];
  }

  buildUserAttendanceSummaryTableModel(report = {}) {
    const summaryRows = this.extractUserAttendanceSummaryRows(report);

    if (summaryRows === null) {
      const message =
        "Backend user_attendance_summary is unavailable for the selected period.";

      return {
        state: "backendRequired",
        message,
        rows: this.buildUserAttendanceSummaryFallbackRows(message),
      };
    }

    if (summaryRows.length === 0) {
      return {
        state: "empty",
        message:
          "No backend user_attendance_summary rows were returned for the selected period.",
        rows: [],
      };
    }

    return {
      state: "ready",
      message: null,
      rows: this.buildPdfAttendanceTableRows(summaryRows),
    };
  }

  normalizeBadgeLookupValue(value) {
    if (!this.hasAvailableValue(value)) {
      return "unavailable";
    }

    return String(value).trim().toLowerCase();
  }

  getStatusBadgeStyle(status) {
    const normalizedStatus = this.normalizeBadgeLookupValue(status);
    return STATUS_BADGE_STYLES[normalizedStatus] || DEFAULT_BADGE_STYLE;
  }

  getWorkModeBadgeStyle(workMode) {
    const normalizedMode = this.normalizeBadgeLookupValue(workMode);
    return WORK_MODE_BADGE_STYLES[normalizedMode] || DEFAULT_BADGE_STYLE;
  }

  drawPdfBadge(doc, text, x, y, width, height, style = {}) {
    if (!this.hasAvailableValue(text) || width <= 0 || height <= 0) {
      return;
    }

    const label = String(text);
    const paddingX = style.paddingX ?? 2.4;
    const minFontSize = style.minFontSize ?? 4.4;
    let fontSize = style.fontSize ?? 5.6;

    doc.setFont("helvetica", style.fontStyle || "bold");

    while (fontSize > minFontSize) {
      doc.setFontSize(fontSize);
      if (doc.getTextWidth(label) <= width - paddingX * 2) {
        break;
      }
      fontSize -= 0.2;
    }

    doc.setFontSize(Math.max(fontSize, minFontSize));

    const badgeHeight = Math.min(style.height ?? 5.4, height);
    const textWidth = doc.getTextWidth(label);
    const badgeWidth = Math.min(
      width,
      Math.max(textWidth + paddingX * 2, style.minWidth ?? 10),
    );
    const badgeX = x + (width - badgeWidth) / 2;
    const badgeY = y + (height - badgeHeight) / 2;
    const radius = Math.min(style.radius ?? 2.6, badgeHeight / 2);

    doc.setLineWidth(style.lineWidth ?? 0.2);
    doc.setDrawColor(
      ...(style.borderColor || style.fillColor || [203, 213, 225]),
    );
    doc.setFillColor(...(style.fillColor || [241, 245, 249]));
    doc.roundedRect(
      badgeX,
      badgeY,
      badgeWidth,
      badgeHeight,
      radius,
      radius,
      "FD",
    );

    doc.setTextColor(...(style.textColor || [100, 116, 139]));
    doc.text(label, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2 + 1.05, {
      align: "center",
    });
  }

  buildPdfTableRows(rows = []) {
    return this.buildPdfAttendanceTableRows(rows);
  }

  buildPdfReportRows(rows = []) {
    return this.buildPdfAttendanceTableRows(rows);
  }

  buildExcelReportRows(rows = []) {
    return rows.map((item) => [
      this.formatUnavailableValue(item.full_name),
      this.formatUnavailableValue(item.nip_nim),
      this.formatUnavailableValue(item.role),
      this.formatUnavailableValue(item.email),
      this.formatDateValue(item.attendance_date),
      this.formatUnavailableValue(item.time_in),
      this.formatUnavailableValue(item.time_out),
      this.formatUnavailableValue(item.work_hour),
      this.formatStatus(item.status),
      this.formatInformation(
        this.firstAvailableValue(
          item.location_details?.category,
          item.information,
        ),
      ),
      this.formatUnavailableValue(item.information),
      this.formatUnavailableValue(item.notes),
      this.formatUnavailableValue(item.discipline_score),
      this.formatUnavailableValue(item.discipline_label),
      this.formatUnavailableValue(
        this.firstAvailableValue(
          item.location_details?.description,
          item.location_description,
        ),
      ),
    ]);
  }

  validateExportData(summaryData, exportType) {
    if (!summaryData || !summaryData.summary || !summaryData.report) {
      throw new Error(
        `Invalid data structure for ${exportType} generation. Expected API data with summary and report sections.`,
      );
    }

    const reportRows = summaryData.report.data || summaryData.report;

    if (!Array.isArray(reportRows)) {
      throw new Error(
        `Invalid report data format for ${exportType} generation.`,
      );
    }

    return reportRows;
  }

  buildPdfReportLayoutModel(
    summaryData,
    period = "all",
    generatedAt = new Date(),
  ) {
    const reportRows = this.validateExportData(summaryData, "PDF");
    const summary = summaryData.summary || {};
    const tableColumns = this.buildPdfAttendanceTableColumns();
    const tableModel = this.buildUserAttendanceSummaryTableModel(
      summaryData.report,
    );

    return {
      title: "Attendance Summary Report",
      sections: [
        { key: "header", title: "Header" },
        { key: "executiveSummary", title: "Executive Summary" },
        { key: "statistics", title: "Statistics" },
        { key: "userAttendanceSummaryTable", title: "User Attendance Summary" },
        { key: "footer", title: "Footer" },
      ],
      headerMetadata: this.buildPdfHeaderMetadataRows(period, generatedAt),
      executiveCards: this.buildExecutiveSummaryCards(
        summary,
        reportRows,
        summaryData.analytics,
      ),
      statisticsCards: this.buildPdfStatisticsCards(summary, reportRows),
      tableColumns,
      tableHead: [tableColumns.map((column) => column.header)],
      tableState: tableModel.state,
      tableMessage: tableModel.message,
      tableBody: tableModel.rows,
      footerTemplate: {
        left: "Generated by Infinite Track System",
        center: "Page {pageNumber}",
        right: "Confidential internal report",
      },
    };
  }

  buildPdfDocument(summaryData, period = "all", generatedAt = new Date()) {
    const layoutModel = this.buildPdfReportLayoutModel(
      summaryData,
      period,
      generatedAt,
    );
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    const primaryText = [15, 23, 42];
    const secondaryText = [71, 85, 105];
    const borderColor = [203, 213, 225];
    let currentY = margin;

    const tintColor = (accent, strength = 0.14) =>
      accent.map((value) => Math.round(255 - (255 - value) * strength));

    const ensureSpace = (requiredHeight) => {
      if (currentY + requiredHeight <= pageHeight - 22) {
        return;
      }

      doc.addPage();
      currentY = margin;
    };

    const drawSectionTitle = (title) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...primaryText);
      doc.text(title, margin, currentY);
      currentY += 5;
    };

    const drawKpiCard = (card, x, y, width, height) => {
      const fillColor = tintColor(card.accent);
      const labelLines = doc.splitTextToSize(card.label, width - 6);
      const valueLines = doc.splitTextToSize(String(card.value), width - 6);
      const captionLines = doc
        .splitTextToSize(card.caption, width - 6)
        .slice(0, 3);

      doc.setDrawColor(...card.accent);
      doc.setFillColor(...fillColor);
      doc.roundedRect(x, y, width, height, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...card.accent);
      doc.text(labelLines, x + 3, y + 4);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...primaryText);
      const valueY = y + 9 + Math.max(0, labelLines.length - 1) * 3;
      doc.text(valueLines, x + 3, valueY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.2);
      doc.setTextColor(...secondaryText);
      const captionY = valueY + valueLines.length * 4.2;
      doc.text(captionLines, x + 3, captionY);
    };

    const drawDonutStatistic = (card, x, y, width) => {
      const ringCenterX = x + 16;
      const ringCenterY = y + 15;
      const ringRadius = 8;
      const innerRadius = 4.6;
      const markerRadius = 0.9;
      const steps = 72;
      const segments = Array.isArray(card.segments) ? card.segments : [];
      let legendY = y + 4;

      const cumulativeSegments = [];
      let cumulativePercentage = 0;
      segments.forEach((segment) => {
        cumulativePercentage += segment.percentage;
        cumulativeSegments.push({ ...segment, cumulativePercentage });
      });

      for (let step = 0; step < steps; step += 1) {
        const angle = -Math.PI / 2 + (step / steps) * Math.PI * 2;
        const targetPercentage = ((step + 0.5) / steps) * 100;
        const segment =
          cumulativeSegments.find(
            (entry) => targetPercentage <= entry.cumulativePercentage,
          ) || cumulativeSegments[cumulativeSegments.length - 1];

        if (!segment) {
          break;
        }

        doc.setFillColor(...segment.color);
        doc.circle(
          ringCenterX + Math.cos(angle) * ringRadius,
          ringCenterY + Math.sin(angle) * ringRadius,
          markerRadius,
          "F",
        );
      }

      doc.setFillColor(248, 250, 252);
      doc.circle(ringCenterX, ringCenterY, innerRadius, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.4);
      doc.setTextColor(...primaryText);
      doc.text(String(card.total), ringCenterX, ringCenterY - 0.5, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.6);
      doc.setTextColor(...secondaryText);
      doc.text("Rows", ringCenterX, ringCenterY + 3, { align: "center" });

      segments.forEach((segment) => {
        const labelLines = doc
          .splitTextToSize(segment.label, width - 35)
          .slice(0, 2);

        doc.setFillColor(...segment.color);
        doc.roundedRect(x + 29, legendY - 1.8, 2.4, 2.4, 0.8, 0.8, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.8);
        doc.setTextColor(...primaryText);
        doc.text(labelLines, x + 33, legendY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.6);
        doc.setTextColor(...secondaryText);
        doc.text(
          `${segment.value} • ${segment.percentageLabel}`,
          x + width - 3,
          legendY,
          { align: "right" },
        );

        legendY += Math.max(6.5, labelLines.length * 3.2);
      });
    };

    const drawHorizontalBarStatistic = (card, x, y, width) => {
      const bars = Array.isArray(card.bars) ? card.bars : [];
      const maxValue = Math.max(...bars.map((bar) => bar.value), 1);
      let rowY = y + 2;

      bars.forEach((bar) => {
        const labelLines = doc
          .splitTextToSize(bar.label, width - 6)
          .slice(0, 2);
        const labelHeight = Math.max(3, labelLines.length * 2.8);
        const filledWidth = ((width - 6) * bar.value) / maxValue;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.8);
        doc.setTextColor(...primaryText);
        doc.text(labelLines, x + 3, rowY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.6);
        doc.setTextColor(...secondaryText);
        doc.text(`${bar.value} • ${bar.percentageLabel}`, x + width - 3, rowY, {
          align: "right",
        });

        const trackY = rowY + labelHeight + 1.2;
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(x + 3, trackY, width - 6, 3, 1, 1, "F");

        if (bar.value > 0) {
          doc.setFillColor(...bar.color);
          doc.roundedRect(
            x + 3,
            trackY,
            Math.max(1.2, filledWidth),
            3,
            1,
            1,
            "F",
          );
        }

        rowY = trackY + 5.5;
      });
    };

    const drawStatisticCard = (card, x, y, width, height) => {
      doc.setDrawColor(...borderColor);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, width, height, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(...primaryText);
      const titleLines = doc.splitTextToSize(card.title, width - 6);
      doc.text(titleLines, x + 3, y + 4);

      if (card.state !== "ready") {
        const message = card.message || "Unavailable";
        const messageLines = doc
          .splitTextToSize(message, width - 6)
          .slice(0, 5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.2);
        doc.setTextColor(...secondaryText);
        doc.text(messageLines, x + 3, y + 14);
        return;
      }

      const noteLines = doc
        .splitTextToSize(card.note || "", width - 6)
        .slice(0, 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...secondaryText);
      doc.text(noteLines, x + 3, y + 11);

      const chartTop = y + 18 + Math.max(0, noteLines.length - 1) * 2.6;

      if (card.chartType === "donut") {
        drawDonutStatistic(card, x, chartTop, width);
        return;
      }

      drawHorizontalBarStatistic(card, x, chartTop, width);
    };

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin, currentY, 16, 16, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("IT", margin + 8, currentY + 10, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...primaryText);
    doc.text("Infinite Track", margin + 20, currentY + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...secondaryText);
    doc.text("Palu", margin + 20, currentY + 10.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...primaryText);
    doc.text(layoutModel.title, pageWidth / 2, currentY + 6, {
      align: "center",
    });

    const metadataX = pageWidth - margin - 56;
    let metadataY = currentY + 2.5;

    layoutModel.headerMetadata.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...secondaryText);
      doc.text(label, metadataX, metadataY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...primaryText);
      const valueLines = doc.splitTextToSize(String(value), 30);
      doc.text(valueLines, metadataX + 18, metadataY);
      metadataY += Math.max(3.8, valueLines.length * 3 + 0.8);
    });

    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY + 20, pageWidth - margin, currentY + 20);
    currentY += 26;

    ensureSpace(34);
    drawSectionTitle("Executive Summary");

    const kpiGap = 4;
    const kpiCardWidth = (contentWidth - kpiGap * 3) / 4;
    const kpiCardHeight = 27;

    layoutModel.executiveCards.forEach((card, index) => {
      drawKpiCard(
        card,
        margin + index * (kpiCardWidth + kpiGap),
        currentY,
        kpiCardWidth,
        kpiCardHeight,
      );
    });

    currentY += kpiCardHeight + 8;

    ensureSpace(66);
    drawSectionTitle("Statistics");

    const statisticGap = 4;
    const statisticCardWidth = (contentWidth - statisticGap * 2) / 3;
    const statisticCardHeight = 58;

    layoutModel.statisticsCards.forEach((card, index) => {
      drawStatisticCard(
        card,
        margin + index * (statisticCardWidth + statisticGap),
        currentY,
        statisticCardWidth,
        statisticCardHeight,
      );
    });

    currentY += statisticCardHeight + 8;

    ensureSpace(16);
    drawSectionTitle("User Attendance Summary");
    doc.setDrawColor(221, 214, 254);
    doc.setLineWidth(0.6);
    doc.line(margin, currentY - 1.2, margin + 34, currentY - 1.2);
    currentY += 1.5;

    if (layoutModel.tableBody.length > 0) {
      const badgeColumnIndexes = new Set([7]);
      const tableColumnStyles = {};

      (layoutModel.tableColumns || []).forEach((column, index) => {
        tableColumnStyles[index] = {
          cellWidth: column.width,
          halign: column.halign,
        };
      });

      autoTable(doc, {
        startY: currentY,
        head: layoutModel.tableHead,
        body: layoutModel.tableBody,
        theme: "grid",
        styles: {
          fontSize: 7,
          cellPadding: {
            top: 3.1,
            right: 2.2,
            bottom: 3.1,
            left: 2.2,
          },
          minCellHeight: 9.5,
          halign: "left",
          valign: "middle",
          overflow: "linebreak",
          textColor: primaryText,
          lineColor: [226, 232, 240],
          lineWidth: 0.12,
          fillColor: [255, 255, 255],
        },
        headStyles: {
          fillColor: [245, 243, 255],
          textColor: [91, 33, 182],
          fontStyle: "bold",
          fontSize: 6.7,
          halign: "center",
          valign: "middle",
          lineColor: [221, 214, 254],
          lineWidth: 0.18,
        },
        alternateRowStyles: {
          fillColor: [250, 248, 255],
        },
        columnStyles: tableColumnStyles,
        margin: { left: margin, right: margin, bottom: 18 },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.12,
        didParseCell: (hookData) => {
          if (
            hookData.section === "body" &&
            badgeColumnIndexes.has(hookData.column.index)
          ) {
            hookData.cell.text = [""];
            hookData.cell.styles.halign = "center";
          }
        },
        didDrawCell: (hookData) => {
          if (
            hookData.section !== "body" ||
            !badgeColumnIndexes.has(hookData.column.index)
          ) {
            return;
          }

          const badgeText = this.formatUnavailableValue(hookData.cell.raw);
          const badgeStyle = this.getStatusBadgeStyle(badgeText);

          this.drawPdfBadge(
            doc,
            badgeText,
            hookData.cell.x + 1,
            hookData.cell.y + 1,
            hookData.cell.width - 2,
            hookData.cell.height - 2,
            badgeStyle,
          );
        },
      });
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...secondaryText);
      doc.text(
        layoutModel.tableMessage ||
          "No backend user_attendance_summary rows were returned for the selected period.",
        margin,
        currentY + 4,
      );
    }

    const totalPages = doc.getNumberOfPages();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      doc.setPage(pageNumber);
      const footer = this.buildPdfFooterContent(pageNumber, totalPages);

      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...secondaryText);
      doc.text(footer.left, margin, pageHeight - 8.5);
      doc.text(footer.center, pageWidth / 2, pageHeight - 8.5, {
        align: "center",
      });
      doc.text(footer.right, pageWidth - margin, pageHeight - 8.5, {
        align: "right",
      });
    }

    return doc;
  }

  generatePDF(summaryData, period = "all") {
    console.log("PDF Generator - Raw summaryData:", summaryData);
    console.log("PDF Generator - Summary section:", summaryData?.summary);
    console.log("PDF Generator - Report section:", summaryData?.report);

    this.validateExportData(summaryData, "PDF");
    this.logDataSource(summaryData);

    const doc = this.buildPdfDocument(summaryData, period);
    const fileName = `attendance-report-${period}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
  }

  buildWorkbook(summaryData, period = "all", generatedAt = new Date()) {
    const reportRows = this.validateExportData(summaryData, "Excel");
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet(
      this.buildSummarySheetRows(summaryData, period, generatedAt),
    );
    summarySheet["!cols"] = [{ wch: 24 }, { wch: 88 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const attendanceSheet = XLSX.utils.aoa_to_sheet(
      this.buildAttendanceReportSheetRows(reportRows),
    );
    attendanceSheet["!cols"] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      attendanceSheet,
      "Attendance Report",
    );

    const disciplineSourceRows = Array.isArray(
      summaryData?.report?.user_attendance_summary,
    )
      ? summaryData.report.user_attendance_summary
      : [];
    const disciplineSheet = XLSX.utils.aoa_to_sheet(
      this.buildDisciplineInsightSheetRows(
        disciplineSourceRows,
        period,
        generatedAt,
      ),
    );
    disciplineSheet["!cols"] = [
      { wch: 22 },
      { wch: 24 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      disciplineSheet,
      "Discipline Insight",
    );

    return workbook;
  }

  generateExcel(summaryData, period = "all") {
    console.log("Excel Generator - Raw summaryData:", summaryData);

    this.validateExportData(summaryData, "Excel");
    this.logDataSource(summaryData);

    const workbook = this.buildWorkbook(summaryData, period);
    const fileName = `attendance-report-${period}-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  formatPeriod(period) {
    const periodMap = {
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      all: "All Time",
    };

    return periodMap[period] || period;
  }

  formatStatus(status) {
    const statusMap = {
      ontime: "On Time",
      late: "Late",
      alpha: "Alpha",
      present: "Present",
      absent: "Absent",
    };

    if (!this.hasAvailableValue(status)) {
      return "Unavailable";
    }

    const normalizedStatus = String(status).toLowerCase();
    return statusMap[normalizedStatus] || String(status);
  }

  formatInformation(info) {
    const infoMap = {
      wfo: "Work From Office",
      wfh: "Work From Home",
      wfa: "Work From Anywhere",
      "work from office": "Work From Office",
      "work from home": "Work From Home",
      "work from anywhere": "Work From Anywhere",
    };

    if (!this.hasAvailableValue(info)) {
      return "Unavailable";
    }

    const normalizedInfo = String(info).toLowerCase();
    return infoMap[normalizedInfo] || String(info);
  }

  logDataSource(data) {
    console.log("=== REPORT DATA SOURCE VERIFICATION ===");
    console.log("Data structure:", {
      hasSummary: !!data.summary,
      hasReport: !!data.report,
      reportDataLength:
        data.report?.data?.length ||
        (Array.isArray(data.report) ? data.report.length : 0),
      summaryKeys: data.summary ? Object.keys(data.summary) : [],
    });

    const summaryValues = data.summary ? Object.values(data.summary) : [];
    const hasMockSummaryPattern =
      summaryValues.includes(21) && summaryValues.includes(19);

    if (hasMockSummaryPattern) {
      console.warn(
        "⚠️  WARNING: Data appears to contain mock values (21, 19). This might be mock data!",
      );
    } else {
      console.log("✅ Data appears to be from API (no mock patterns detected)");
    }

    const reportData = data.report?.data || data.report || [];
    if (reportData.length > 0) {
      console.log("Sample record:", reportData[0]);
      console.log("Record has API fields:", {
        hasFullName: !!reportData[0].full_name,
        hasNipNim: !!reportData[0].nip_nim,
        hasAttendanceDate: !!reportData[0].attendance_date,
        hasLocationDetails: !!reportData[0].location_details,
      });
    }
    console.log("=====================================");
  }
}

export const reportGenerator = new ReportGenerator();
export const generatePDFReport = (summaryData, period) =>
  reportGenerator.generatePDF(summaryData, period);
export const generateExcelReport = (summaryData, period) =>
  reportGenerator.generateExcel(summaryData, period);
