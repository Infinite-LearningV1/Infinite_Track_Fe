import test from "node:test";
import assert from "node:assert/strict";

import { createAttendanceModeViewState } from "../../src/js/components/attendanceModePanel.js";

test("createAttendanceModeViewState exposes active slice state for donut center hover", () => {
  const viewState = createAttendanceModeViewState({
    title: "Attendance Mode",
    data: {
      total: 936,
      segments: [
        {
          key: "wfo",
          label: "WFO",
          value: 851,
          percentage: 90.9,
          percentageLabel: "90.9%",
          color: "#465fff",
        },
        {
          key: "wfh",
          label: "WFH",
          value: 31,
          percentage: 3.3,
          percentageLabel: "3.3%",
          color: "#f59e0b",
        },
      ],
    },
  });

  assert.equal(viewState.centerLabel, "Total");
  assert.equal(viewState.centerValue, "936");
  assert.equal(viewState.activeSegmentLabel, "Total");
  assert.equal(viewState.activeSegmentValue, "936");
  assert.equal(typeof viewState.getActiveSegment, "function");
  assert.deepEqual(viewState.getActiveSegment("wfo"), {
    key: "wfo",
    label: "WFO",
    value: 851,
    valueLabel: "851",
    percentageLabel: "90.9%",
    color: "#465fff",
  });
  assert.equal(viewState.legendItems[0].label, "WFO");
  assert.equal(viewState.legendItems[0].percentageLabel, "90.9%");
  assert.equal(viewState.legendItems[0].valueLabel, undefined);
  assert.match(viewState.chartSlicesMarkup, /<path d="/);
  assert.match(viewState.chartSlicesMarkup, /fill="#465fff"/);
  assert.match(viewState.chartSlicesMarkup, /data-segment-key="wfo"/);
});
