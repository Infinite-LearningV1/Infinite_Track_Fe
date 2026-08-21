const CHART_VIEWBOX_WIDTH = 992;
const CHART_VIEWBOX_HEIGHT = 220;
const TOOLTIP_WIDTH = 190;

function formatBadgeValue(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const APEX_AXIS_FRAME = Object.freeze({
  translateX: 46,
  translateY: 30,
  width: 932,
  height: 240,
  gridlines: [0, 48, 96, 144, 192, 240],
});

function createEmptyRange() {
  return {
    key: "",
    label: "",
    metrics: [],
    series: [],
    hoverPoints: [],
    plotArea: {
      leftX: 24,
      rightX: 948,
      topY: 20,
      baselineY: 185,
      viewBoxWidth: CHART_VIEWBOX_WIDTH,
      viewBoxHeight: CHART_VIEWBOX_HEIGHT,
    },
    axisFrame: APEX_AXIS_FRAME,
    xAxisLabels: [],
    yAxisLabels: [],
  };
}

function getSelectedTrendRange(panel, selectedKey) {
  const ranges = Array.isArray(panel?.data?.ranges) ? panel.data.ranges : [];
  const fallbackKey =
    panel?.data?.defaultRangeKey || ranges[0]?.key || "monthly";
  const resolvedKey = selectedKey || fallbackKey;

  return (
    ranges.find((range) => range.key === resolvedKey) ||
    ranges.find((range) => range.key === fallbackKey) ||
    ranges[0] ||
    createEmptyRange()
  );
}

function createLegendItems(series = []) {
  return series.map((item) => ({
    key: item.key,
    label: item.label,
    color: item.color,
  }));
}

function createRenderableSeries(series = []) {
  return series.map((item) => ({
    key: item.key,
    label: item.label,
    color: item.color,
    gradientId: item.gradientId,
    chartPath: item.chartPath || "",
    areaPath: item.areaPath || "",
    points: Array.isArray(item.points) ? item.points : [],
  }));
}

function createSeriesTransform(plotArea, axisFrame) {
  const leftX = Number(plotArea?.leftX);
  const rightX = Number(plotArea?.rightX);
  const topY = Number(plotArea?.topY);
  const baselineY = Number(plotArea?.baselineY);
  const width = Number(axisFrame?.width);
  const height = Number(axisFrame?.height);

  if (
    !Number.isFinite(leftX) ||
    !Number.isFinite(rightX) ||
    !Number.isFinite(topY) ||
    !Number.isFinite(baselineY) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    rightX <= leftX ||
    baselineY <= topY
  ) {
    return "";
  }

  const scaleX = width / (rightX - leftX);
  const scaleY = height / (baselineY - topY);
  const translateX = -leftX * scaleX;
  const translateY = -topY * scaleY;

  return `matrix(${scaleX} 0 0 ${scaleY} ${translateX} ${translateY})`;
}

function escapeSvgText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createSeriesMarkup(series = []) {
  return createRenderableSeries(series)
    .map((item) => {
      const areaPath = item.areaPath
        ? `<path d="${item.areaPath}" fill="url(#${item.gradientId})"></path>`
        : "";
      const linePath = item.chartPath
        ? `<path d="${item.chartPath}" stroke="${item.color || "#465fff"}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>`
        : "";
      const pointMarkers = item.points
        .map((point) => {
          const x = Number(point?.x);
          const y = Number(point?.y);

          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return "";
          }

          return `<circle cx="${x}" cy="${y}" r="4" fill="${item.color || "#465fff"}" stroke="#ffffff" stroke-width="2"></circle>`;
        })
        .join("");

      return `${areaPath}${linePath}${pointMarkers}`;
    })
    .join("");
}

function createYAxisMarkup(labels = []) {
  return labels
    .map((tick, index) => {
      const y = APEX_AXIS_FRAME.translateY + index * 48 + 4;

      return `<text x="36" y="${y}" text-anchor="end" fill="currentColor">${escapeSvgText(tick)}</text>`;
    })
    .join("");
}

function createXAxisMarkup(labels = [], axisFrame = APEX_AXIS_FRAME) {
  const labelCount = Math.max(labels.length - 1, 1);
  const step = Number(axisFrame?.width) / labelCount;
  const originX = Number(axisFrame?.translateX) || APEX_AXIS_FRAME.translateX;

  return labels
    .map((label, index) => {
      const x = originX + step * index;

      return `<text x="${x}" y="294" text-anchor="middle" fill="currentColor">${escapeSvgText(label)}</text>`;
    })
    .join("");
}

function createRenderedPoint(point, plotArea, axisFrame = APEX_AXIS_FRAME) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  const leftX = Number(plotArea?.leftX);
  const rightX = Number(plotArea?.rightX);
  const topY = Number(plotArea?.topY);
  const baselineY = Number(plotArea?.baselineY);
  const frameX = Number(axisFrame?.translateX) || APEX_AXIS_FRAME.translateX;
  const frameY = Number(axisFrame?.translateY) || APEX_AXIS_FRAME.translateY;
  const frameWidth = Number(axisFrame?.width) || APEX_AXIS_FRAME.width;
  const frameHeight = Number(axisFrame?.height) || APEX_AXIS_FRAME.height;

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(leftX) ||
    !Number.isFinite(rightX) ||
    !Number.isFinite(topY) ||
    !Number.isFinite(baselineY) ||
    rightX <= leftX ||
    baselineY <= topY
  ) {
    return { x, y };
  }

  return {
    x: frameX + ((x - leftX) / (rightX - leftX)) * frameWidth,
    y: frameY + ((y - topY) / (baselineY - topY)) * frameHeight,
  };
}

function createTooltipItem(item, plotArea, axisFrame) {
  const renderedPoint = createRenderedPoint(item, plotArea, axisFrame);

  return {
    key: item.key,
    label: item.label,
    color: item.color,
    value: item.displayValue || formatBadgeValue(item.value),
    x: renderedPoint.x,
    y: renderedPoint.y,
  };
}

function createActiveHoverPoint(
  selectedRange,
  activeHoverIndex,
  axisFrame = APEX_AXIS_FRAME,
) {
  const hoverPoints = Array.isArray(selectedRange?.hoverPoints)
    ? selectedRange.hoverPoints
    : [];
  const plotArea = selectedRange?.plotArea || createEmptyRange().plotArea;

  if (!hoverPoints.length || !Number.isInteger(activeHoverIndex)) {
    return null;
  }

  const hoverPoint = hoverPoints[activeHoverIndex] || null;

  if (!hoverPoint) {
    return null;
  }

  const renderedPoint = createRenderedPoint(hoverPoint, plotArea, axisFrame);

  return {
    ...hoverPoint,
    x: renderedPoint.x,
    y: renderedPoint.y,
    label: selectedRange?.xAxisLabels?.[activeHoverIndex] || "",
    items: Array.isArray(hoverPoint.items)
      ? hoverPoint.items.map((item) =>
          createTooltipItem(item, plotArea, axisFrame),
        )
      : [],
  };
}

function createTooltipStyle(activeHoverPoint, axisFrame = APEX_AXIS_FRAME) {
  if (!activeHoverPoint) {
    return "";
  }

  const frameX = Number(axisFrame?.translateX) || APEX_AXIS_FRAME.translateX;
  const frameY = Number(axisFrame?.translateY) || APEX_AXIS_FRAME.translateY;
  const frameWidth = Number(axisFrame?.width) || APEX_AXIS_FRAME.width;
  const left = clamp(
    activeHoverPoint.x + 14,
    frameX,
    frameX + frameWidth - TOOLTIP_WIDTH,
  );
  const topAnchor = Math.min(
    ...activeHoverPoint.items.map((item) => item.y ?? activeHoverPoint.y),
  );
  const top = clamp(topAnchor - 72, frameY + 8, frameY + 126);

  return `left:${left}px;top:${top}px;`;
}

function createMarkerStyle(item) {
  return `left:${item.x}px;top:${item.y}px;transform:translate(-50%, -50%);`;
}

function createCrosshairStyle(activeHoverPoint, axisFrame = APEX_AXIS_FRAME) {
  if (!activeHoverPoint) {
    return "";
  }

  const frameY = Number(axisFrame?.translateY) || APEX_AXIS_FRAME.translateY;
  const frameHeight = Number(axisFrame?.height) || APEX_AXIS_FRAME.height;

  return `left:${activeHoverPoint.x}px;top:${frameY}px;height:${frameHeight}px;transform:translateX(-50%);`;
}

export function createHistoricalTrendViewState(
  panel,
  selectedKey,
  activeHoverIndex = null,
) {
  const ranges = Array.isArray(panel?.data?.ranges) ? panel.data.ranges : [];
  const selectedRange = getSelectedTrendRange(panel, selectedKey);
  const axisFrame = selectedRange.axisFrame || APEX_AXIS_FRAME;
  const activeHoverPoint = createActiveHoverPoint(
    selectedRange,
    activeHoverIndex,
    axisFrame,
  );
  const seriesTransform = createSeriesTransform(
    selectedRange.plotArea,
    axisFrame,
  );

  return {
    title: panel?.title || "",
    subtitle: panel?.subtitle || "",
    detail: panel?.detail || "",
    message: panel?.message || "",
    note: panel?.note || "",
    isPreview: Boolean(panel?.data?.isPreview),
    ranges,
    selectedRange,
    legendItems: createLegendItems(selectedRange.series),
    axisFrame,
    seriesTransform,
    seriesMarkup: createSeriesMarkup(selectedRange.series),
    xAxisMarkup: createXAxisMarkup(selectedRange.xAxisLabels, axisFrame),
    yAxisMarkup: createYAxisMarkup(selectedRange.yAxisLabels),
    activeHoverPoint,
    tooltipStyle: createTooltipStyle(activeHoverPoint, axisFrame),
    crosshairStyle: createCrosshairStyle(activeHoverPoint, axisFrame),
    getMarkerStyle: createMarkerStyle,
  };
}
