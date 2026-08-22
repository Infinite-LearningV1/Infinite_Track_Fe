import test from "node:test";
import assert from "node:assert/strict";

import { createFuzzyAhpViewState } from "../../src/js/components/fuzzyAhpPanel.js";

test("Fuzzy AHP ranking rows use backend name as the main label and preserve the backend grade label separately", () => {
  const panel = {
    title: "Fuzzy AHP Decision Center",
    data: {
      decisions: [
        {
          key: "discipline",
          title: "Discipline",
          consistencyRatio: 0.079,
          consistencyThreshold: 0.1,
          consistencyStatus: "Konsistensi dapat diterima",
          isConsistent: true,
          updatedAtLabel:
            "Backend generated at 2026-07-01T21:43:55+07:00 (Asia/Jakarta)",
          criteriaWeights: [{ label: "Disiplin Kehadiran", weight: 1 }],
          rankings: [
            {
              rank: 1,
              name: "Abdi Mulia Pranidana",
              score: 100,
              label: "Sangat Baik",
            },
            {
              rank: 4,
              name: "",
              score: 44.79,
              label: "Cukup",
            },
          ],
        },
      ],
      activeDecisionKey: "discipline",
    },
  };

  const viewState = createFuzzyAhpViewState(panel, "discipline");

  assert.equal(viewState.rankingRows[0].label, "Abdi Mulia Pranidana");
  assert.equal(viewState.rankingRows[0].rank, 1);
  assert.equal(viewState.rankingRows[0].secondaryLabel, "Sangat Baik");
  assert.equal(viewState.rankingRows[0].scoreLabel, "100.000");
  assert.equal(viewState.rankingRows[1].label, "Alternative 2");
  assert.equal(viewState.consistencyStatusLabel, "Konsisten");
  assert.equal(viewState.rankingRows[1].rank, 4);
  assert.equal(viewState.rankingRows[1].secondaryLabel, "Cukup");
});
