import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adr004 = readFileSync(
  new URL(
    "../../docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md",
    import.meta.url,
  ),
  "utf8",
);
const adr009 = readFileSync(
  new URL(
    "../../docs/adr/ADR-009-dashboard-cockpit-contract-adoption.md",
    import.meta.url,
  ),
  "utf8",
);

test("dashboard ADRs align with dashboard-only owner-driven flow", () => {
  assert.equal(adr009.includes("/summary/reports"), false);
  assert.equal(
    adr009.includes(
      "1. `GET /summary/dashboard-analytics` (analytics authority, including Fuzzy AHP snapshot)",
    ),
    false,
  );
  assert.equal(
    adr009.includes(
      "- `GET /analysis/fuzzy-ahp` is used for lazy-loaded Fuzzy AHP detail.",
    ),
    false,
  );
  assert.equal(
    adr004.includes("/analysis/fuzzy-ahp` for decision-support output"),
    false,
  );
  assert.equal(
    adr004.includes(
      "Geofence Evidence Context remains a backend-required placeholder",
    ),
    false,
  );
});
