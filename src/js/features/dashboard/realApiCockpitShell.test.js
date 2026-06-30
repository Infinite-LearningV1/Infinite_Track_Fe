import test from "node:test";
import assert from "node:assert/strict";

import {
  DASHBOARD_REAL_API_ENDPOINTS,
  createDashboardRealApiDummyContract,
} from "./realApiCockpitDummyProvider.js";
import {
  REAL_API_COCKPIT_STATES,
  createRealApiCockpitShell,
} from "./realApiCockpitShell.js";

test("dummy contract covers every INF-160 final endpoint without real provider wiring", () => {
  const contract = createDashboardRealApiDummyContract();
  const endpoints = contract.endpoints.map((entry) => entry.endpoint);

  assert.deepEqual(endpoints, Object.values(DASHBOARD_REAL_API_ENDPOINTS));
  assert.equal(contract.provider, "dummy");
  assert.equal(contract.phase, "phase-2-dummy-provider");
  assert.ok(contract.endpoints.every((entry) => entry.provider === "dummy"));
});

test("real API cockpit shell exposes truthful phase 1/2 state", () => {
  const shell = createRealApiCockpitShell();

  assert.equal(shell.state, REAL_API_COCKPIT_STATES.READY);
  assert.equal(shell.provider, "dummy");
  assert.equal(shell.phaseLabel, "Phase 1 shell + Phase 2 dummy provider");
  assert.equal(shell.sections.length, 3);
  assert.equal(
    shell.overviewMetrics.find((metric) => metric.key === "realApiRuntime")
      ?.value,
    "Not wired",
  );
  assert.ok(
    shell.guardrails.some((guardrail) =>
      guardrail.includes("No Phase 1/2 panel calls backend"),
    ),
  );
});
