import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardSectionOrder } from '../../src/js/services/dashboardCockpitService.js';

test('dashboard section ownership order returns the approved owner-based section order', () => {
  assert.deepEqual(buildDashboardSectionOrder(), [
    'liveOperationsMap',
    'historicalOverview',
    'fahpRecap',
    'geofenceEvidence'
  ]);
});
