function createEmptySegments() {
  return [];
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function createDonutSlicePath(
  centerX,
  centerY,
  outerRadius,
  innerRadius,
  startAngle,
  endAngle,
) {
  const outerStart = polarToCartesian(
    centerX,
    centerY,
    outerRadius,
    startAngle,
  );
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerStart = polarToCartesian(
    centerX,
    centerY,
    innerRadius,
    startAngle,
  );
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function createLegendItems(segments = []) {
  return segments.map((segment) => ({
    key: segment.key,
    label: segment.label,
    color: segment.color || "#94a3b8",
    percentageLabel: segment.percentageLabel || "0%",
  }));
}

function createSummaryRows(segments = []) {
  return segments.map((segment) => ({
    key: segment.key,
    label: segment.label,
    value: Number(segment.value) || 0,
    valueLabel: String(Number(segment.value) || 0),
    percentageLabel: segment.percentageLabel || "0%",
    color: segment.color || "#94a3b8",
  }));
}

function createChartSlices(segments = []) {
  let currentAngle = 0;

  return segments
    .filter((segment) => Number(segment.percentage) > 0)
    .map((segment) => {
      const angle = (Number(segment.percentage) / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle = endAngle;

      return {
        key: segment.key,
        label: segment.label,
        color: segment.color || "#94a3b8",
        value: Number(segment.value) || 0,
        valueLabel: String(Number(segment.value) || 0),
        percentageLabel: segment.percentageLabel || "0%",
        path: createDonutSlicePath(200, 132, 120, 78, startAngle, endAngle),
      };
    });
}

function createChartSlicesMarkup(slices = []) {
  return slices
    .map(
      (slice) =>
        `<path d="${slice.path}" fill="${slice.color}" data-segment-key="${slice.key}"></path>`,
    )
    .join("");
}

function createCenterValue(panel, summaryRows = []) {
  return String(
    panel?.data?.total ??
      summaryRows.reduce((total, row) => total + row.value, 0),
  );
}

function createTotalSummary(panel, summaryRows = []) {
  return {
    label: "Total",
    value: createCenterValue(panel, summaryRows),
  };
}

export function createAttendanceModeViewState(panel) {
  const segments = Array.isArray(panel?.data?.segments)
    ? panel.data.segments
    : createEmptySegments();
  const summaryRows = createSummaryRows(segments);
  const chartSlices = createChartSlices(segments);
  const totalSummary = createTotalSummary(panel, summaryRows);

  return {
    title: panel?.title || "",
    subtitle: panel?.subtitle || "",
    detail: panel?.detail || "",
    message: panel?.message || "",
    note: panel?.note || "",
    chartStyle: panel?.data?.chartStyle || "",
    legendItems: createLegendItems(segments),
    summaryRows,
    chartSlices,
    chartSlicesMarkup: createChartSlicesMarkup(chartSlices),
    centerLabel: totalSummary.label,
    centerValue: totalSummary.value,
    activeSegmentLabel: totalSummary.label,
    activeSegmentValue: totalSummary.value,
    getActiveSegment(activeSegmentKey) {
      if (!activeSegmentKey) {
        return {
          label: totalSummary.label,
          value: totalSummary.value,
        };
      }

      const activeSlice = chartSlices.find(
        (slice) => slice.key === activeSegmentKey,
      );

      return activeSlice
        ? {
            key: activeSlice.key,
            label: activeSlice.label,
            value: activeSlice.value,
            valueLabel: activeSlice.valueLabel,
            percentageLabel: activeSlice.percentageLabel,
            color: activeSlice.color,
          }
        : null;
    },
  };
}
