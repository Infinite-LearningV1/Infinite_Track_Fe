import test from "node:test";
import assert from "node:assert/strict";

import { createDashboardRealApiDummyContract } from "../../src/js/features/dashboard/realApiCockpitDummyProvider.js";

test("real API cockpit dummy contract exposes Fuzzy AHP decision center attributes", () => {
  const contract = createDashboardRealApiDummyContract();
  const fahpEndpoints = contract.endpoints.filter((endpoint) =>
    endpoint.key.startsWith("fahp"),
  );

  assert.equal(fahpEndpoints.length, 3);

  for (const endpoint of fahpEndpoints) {
    assert.ok(endpoint.payload.tabLabel);
    assert.ok(endpoint.payload.consistency);
    assert.equal(typeof endpoint.payload.consistency.crValue, "number");
    assert.equal(typeof endpoint.payload.consistency.threshold, "number");
    assert.ok(endpoint.payload.consistency.label);
    assert.ok(Array.isArray(endpoint.payload.criteriaWeights));
    assert.ok(endpoint.payload.criteriaWeights.length >= 3);
    assert.ok(Array.isArray(endpoint.payload.rankings));
    assert.ok(endpoint.payload.rankings.length >= 5);
  }
});
