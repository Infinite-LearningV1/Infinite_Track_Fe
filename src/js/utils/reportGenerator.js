import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Utility class untuk generate laporan dalam format PDF dan Excel
 */
class ReportGenerator {
  /**
   * Generate PDF report dari data summary
   * @param {Object} summaryData - Data summary dari API
   * @param {string} period - Period filter yang digunakan
   */
  generatePDF(summaryData, period = "all") {
    console.log("PDF Generator - Raw summaryData:", summaryData);
    console.log("PDF Generator - Summary section:", summaryData?.summary);
    console.log("PDF Generator - Report section:", summaryData?.report);

    // Validasi struktur data untuk memastikan ini adalah data API yang valid
    if (!summaryData || !summaryData.summary || !summaryData.report) {
      console.error("PDF Generator - Invalid data structure:", summaryData);
      throw new Error(
        "Invalid data structure for PDF generation. Expected API data with summary and report sections.",
      );
    }

    // Validasi lebih lanjut untuk memastikan data bukan mock data
    const reportData = summaryData.report.data || summaryData.report;
    if (!Array.isArray(reportData)) {
      console.error("PDF Generator - Report data is not an array:", reportData);
      throw new Error("Invalid report data format for PDF generation.");
    }

    // Log data source validation
    this.logDataSource(summaryData);

    console.log(
      "PDF Generator - Using validated API data with",
      reportData.length,
      "records",
    );

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Header Section
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Attendance Summary Report", margin, 25);

    // Divider line under header
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1);
    doc.line(margin, 30, pageWidth - margin, 30);

    // Report Info Section
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${this.formatPeriod(period)}`, margin, 45);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      margin,
      55,
    );
    doc.text(
      `Total Records: ${summaryData.report?.data?.length || 0}`,
      margin,
      65,
    );

    // Summary Statistics Section
    if (summaryData.summary) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary Statistics", margin, 85);

      const summaryRows = [
        ["On Time", (summaryData.summary.total_ontime || 0).toString()],
        ["Late", (summaryData.summary.total_late || 0).toString()],
        ["Alpha (Absent)", (summaryData.summary.total_alpha || 0).toString()],
        ["Work From Office", (summaryData.summary.total_wfo || 0).toString()],
        ["Work From Home", (summaryData.summary.total_wfh || 0).toString()],
        ["Work From Anywhere", (summaryData.summary.total_wfa || 0).toString()],
      ];

      autoTable(doc, {
        startY: 95,
        head: [["Category", "Count"]],
        body: summaryRows,
        theme: "striped",
        styles: {
          fontSize: 11,
          cellPadding: 6,
          halign: "left",
          valign: "middle",
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          fontSize: 12,
        },
        columnStyles: {
          0: { cellWidth: 80, halign: "left" }, // Category - rata kiri, lebih lebar
          1: { cellWidth: 40, halign: "right" }, // Count - rata kanan, lebih lebar
        },
        margin: { left: margin, right: margin },
      });
    }

    // Attendance Report Table Section
    if (
      summaryData.report &&
      summaryData.report.data &&
      summaryData.report.data.length > 0
    ) {
      const reportStartY = doc.lastAutoTable
        ? doc.lastAutoTable.finalY + 25
        : 160;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Detailed Attendance Report", margin, reportStartY);

      const reportColumns = [
        "Name",
        "NIP/NIM",
        "Role",
        "Date",
        "Check In",
        "Check Out",
        "Status",
        "Information",
        "Discipline",
      ];

      const reportRows = summaryData.report.data.map((item) => [
        item.full_name || "-",
        item.nip_nim || "-",
        item.role || "-",
        item.attendance_date
          ? new Date(item.attendance_date).toLocaleDateString("id-ID")
          : "-",
        item.time_in || "-",
        item.time_out || "-",
        this.formatStatus(item.status),
        this.formatInformation(
          item.location_details?.category || item.information,
        ),
        `${item.discipline_score || 0}/100`,
      ]);

      // Calculate available width and distribute proportionally
      const availableWidth = pageWidth - 2 * margin;
      const totalProportions = 22 + 16 + 18 + 18 + 16 + 16 + 16 + 22 + 16; // Total = 160

      // Calculate proportional widths that fit in available space
      const columnWidths = {
        0: Math.floor((22 / totalProportions) * availableWidth), // Name
        1: Math.floor((16 / totalProportions) * availableWidth), // NIP/NIM
        2: Math.floor((18 / totalProportions) * availableWidth), // Role
        3: Math.floor((18 / totalProportions) * availableWidth), // Date
        4: Math.floor((16 / totalProportions) * availableWidth), // Check In
        5: Math.floor((16 / totalProportions) * availableWidth), // Check Out
        6: Math.floor((16 / totalProportions) * availableWidth), // Status
        7: Math.floor((22 / totalProportions) * availableWidth), // Information
        8: Math.floor((16 / totalProportions) * availableWidth), // Discipline
      };

      console.log(
        "PDF - Available width:",
        availableWidth,
        "Calculated column widths:",
        columnWidths,
      );

      autoTable(doc, {
        startY: reportStartY + 10,
        head: [reportColumns],
        body: reportRows,
        theme: "striped",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          halign: "left",
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: columnWidths[0], halign: "left" }, // Name
          1: { cellWidth: columnWidths[1], halign: "center" }, // NIP/NIM
          2: { cellWidth: columnWidths[2], halign: "left" }, // Role
          3: { cellWidth: columnWidths[3], halign: "center" }, // Date
          4: { cellWidth: columnWidths[4], halign: "center" }, // Check In
          5: { cellWidth: columnWidths[5], halign: "center" }, // Check Out
          6: { cellWidth: columnWidths[6], halign: "center" }, // Status
          7: { cellWidth: columnWidths[7], halign: "left" }, // Information
          8: { cellWidth: columnWidths[8], halign: "center" }, // Discipline
        },
        margin: { left: margin, right: margin },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
        tableWidth: "auto", // Let autotable adjust automatically
        // Add page break handling
        didDrawPage: function (data) {
          // Footer
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(
            `Page ${data.pageNumber} - Generated by Infinite Track System`,
            margin,
            pageHeight - 10,
          );
        },
      });
    }

    // Final footer if no table was drawn
    if (
      !summaryData.report ||
      !summaryData.report.data ||
      summaryData.report.data.length === 0
    ) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Page 1 - Generated by Infinite Track System",
        margin,
        pageHeight - 10,
      );
    }

    // Save the PDF
    const fileName = `attendance-report-${period}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
  }

  /**
   * Generate Excel report dari data summary
   * @param {Object} summaryData - Data summary dari API
   * @param {string} period - Period filter yang digunakan
   */
  generateExcel(summaryData, period = "all") {
    console.log("Excel Generator - Raw summaryData:", summaryData);

    // Validasi struktur data untuk memastikan ini adalah data API yang valid
    if (!summaryData || !summaryData.summary || !summaryData.report) {
      console.error("Excel Generator - Invalid data structure:", summaryData);
      throw new Error(
        "Invalid data structure for Excel generation. Expected API data with summary and report sections.",
      );
    }

    // Validasi lebih lanjut untuk memastikan data bukan mock data
    const reportData = summaryData.report.data || summaryData.report;
    if (!Array.isArray(reportData)) {
      console.error(
        "Excel Generator - Report data is not an array:",
        reportData,
      );
      throw new Error("Invalid report data format for Excel generation.");
    }

    // Log data source validation
    this.logDataSource(summaryData);

    // Log data source validation
    this.logDataSource(summaryData);

    console.log(
      "Excel Generator - Using validated API data with",
      reportData.length,
      "records",
    );

    const workbook = XLSX.utils.book_new();

    // Summary sheet
    if (summaryData.summary) {
      const summaryData_ws = [
        ["Attendance Summary Report"],
        [""],
        ["Period:", this.formatPeriod(period)],
        [
          "Generated on:",
          new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        ],
        ["Total Records:", summaryData.report?.data?.length || 0],
        [""],
        ["Category", "Count"],
        ["On Time", summaryData.summary.total_ontime || 0],
        ["Late", summaryData.summary.total_late || 0],
        ["Alpha (Absent)", summaryData.summary.total_alpha || 0],
        ["Work From Office", summaryData.summary.total_wfo || 0],
        ["Work From Home", summaryData.summary.total_wfh || 0],
        ["Work From Anywhere", summaryData.summary.total_wfa || 0],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData_ws);

      // Set column widths
      summarySheet["!cols"] = [
        { wch: 25 }, // Column A
        { wch: 15 }, // Column B
      ];

      // Style the header
      if (summarySheet["A1"]) {
        summarySheet["A1"].s = {
          font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "3B82F6" } },
          alignment: { horizontal: "center" },
        };
      }

      // Style category headers
      if (summarySheet["A7"]) {
        summarySheet["A7"].s = { font: { bold: true } };
      }
      if (summarySheet["B7"]) {
        summarySheet["B7"].s = { font: { bold: true } };
      }

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    }

    // Report sheet
    if (
      summaryData.report &&
      summaryData.report.data &&
      summaryData.report.data.length > 0
    ) {
      const reportData = [
        [
          "Full Name",
          "NIP/NIM",
          "Role",
          "Email",
          "Phone Number",
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
        ...summaryData.report.data.map((item) => [
          item.full_name || "-",
          item.nip_nim || "-",
          item.role || "-",
          item.email || "-",
          item.phone_number || "-",
          item.attendance_date
            ? new Date(item.attendance_date).toLocaleDateString("id-ID")
            : "-",
          item.time_in || "-",
          item.time_out || "-",
          item.work_hour || "-",
          this.formatStatus(item.status),
          this.formatInformation(
            item.location_details?.category || item.information,
          ),
          item.information || "-",
          item.notes || "-",
          item.discipline_score || "0",
          item.discipline_label || "Unknown",
          item.location_details?.description ||
            item.location_description ||
            "-",
        ]),
      ];

      const reportSheet = XLSX.utils.aoa_to_sheet(reportData);

      // Set column widths for better readability
      reportSheet["!cols"] = [
        { wch: 20 }, // Full Name
        { wch: 15 }, // NIP/NIM
        { wch: 15 }, // Role
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 12 }, // Date
        { wch: 10 }, // Check In
        { wch: 10 }, // Check Out
        { wch: 12 }, // Work Hours
        { wch: 12 }, // Status
        { wch: 18 }, // Work Category
        { wch: 18 }, // Information
        { wch: 20 }, // Notes
        { wch: 12 }, // Discipline Score
        { wch: 15 }, // Discipline Label
        { wch: 25 }, // Location Description
      ];

      // Style the header row
      const headerRow = 1;
      for (let col = 0; col < reportData[0].length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
        if (reportSheet[cellRef]) {
          reportSheet[cellRef].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "3B82F6" } },
            alignment: { horizontal: "center" },
          };
        }
      }

      XLSX.utils.book_append_sheet(workbook, reportSheet, "Attendance Report");
    }

    // Save the Excel file
    const fileName = `attendance-report-${period}-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Format period untuk display
   * @param {string} period - Period value
   * @returns {string} Formatted period string
   */
  formatPeriod(period) {
    const periodMap = {
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      all: "All Time",
    };

    return periodMap[period] || period;
  }

  /**
   * Format status untuk display yang lebih rapi
   * @param {string} status - Status value
   * @returns {string} Formatted status
   */
  formatStatus(status) {
    const statusMap = {
      ontime: "On Time",
      late: "Late",
      alpha: "Alpha",
      present: "Present",
      absent: "Absent",
    };
    return statusMap[status?.toLowerCase()] || status || "-";
  }

  /**
   * Format information untuk display yang lebih rapi
   * @param {string} info - Information value
   * @returns {string} Formatted information
   */
  formatInformation(info) {
    const infoMap = {
      wfo: "Work From Office",
      wfh: "Work From Home",
      wfa: "Work From Anywhere",
      "work from office": "Work From Office",
      "work from home": "Work From Home",
      "work from anywhere": "Work From Anywhere",
    };
    return infoMap[info?.toLowerCase()] || info || "-";
  }

  /**
   * Log data source validation results to console
   * @param {Object} summaryData - Data summary from API
   */
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

    // Check if this looks like mock data
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

    // Log first few records to verify
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

// Export singleton instance
export const reportGenerator = new ReportGenerator();

// Export convenience functions
export const generatePDFReport = (summaryData, period) =>
  reportGenerator.generatePDF(summaryData, period);
export const generateExcelReport = (summaryData, period) =>
  reportGenerator.generateExcel(summaryData, period);
