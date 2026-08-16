import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDashboardMapMarkers,
  buildDashboardMapPopup,
} from "../../src/js/components/dashboardMap/dashboardMap.js";

test("buildDashboardMapMarkers filters out invalid coordinates", () => {
  const markers = buildDashboardMapMarkers([
    { full_name: "Valid A", latitude: "-0.900", longitude: "119.900" },
    { full_name: "Invalid Lat", latitude: "abc", longitude: "119.800" },
    { full_name: "Invalid Lng", latitude: "-0.500", longitude: null },
    { full_name: "Valid B", latitude: 0, longitude: 0 },
  ]);

  assert.equal(markers.length, 2);
  assert.deepEqual(
    markers.map((marker) => marker.fullName),
    ["Valid A", "Valid B"],
  );
});

test("buildDashboardMapMarkers normalizes marker fields from mixed payload shape", () => {
  const [marker] = buildDashboardMapMarkers([
    {
      full_name: "Alex Doe",
      work_mode: "WFO",
      status: "on_time",
      check_in_time: "08:02",
      description: "Main office",
      latitude: "-0.923",
      longitude: "119.877",
    },
  ]);

  assert.deepEqual(marker, {
    fullName: "Alex Doe",
    mode: "WFO",
    status: "on_time",
    checkInTime: "08:02",
    description: "Main office",
    latitude: -0.923,
    longitude: 119.877,
  });
});

test("buildDashboardMapPopup escapes unsafe text", () => {
  const popupHtml = buildDashboardMapPopup({
    fullName: '<img src=x onerror="alert(1)">',
    mode: '<script>alert("x")</script>',
    status: "active",
    checkInTime: "08:00",
    description: 'Office & "HQ"',
  });

  assert.match(popupHtml, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(
    popupHtml,
    /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/,
  );
  assert.match(popupHtml, /Office &amp; &quot;HQ&quot;/);
  assert.doesNotMatch(popupHtml, /<script>/);
  assert.doesNotMatch(popupHtml, /<img/);
});

test("buildDashboardMapPopup includes mode and check-in time", () => {
  const popupHtml = buildDashboardMapPopup({
    fullName: "Budi",
    mode: "WFH",
    status: "late",
    checkInTime: "08:44",
    description: "Remote",
  });

  assert.match(popupHtml, /WFH/);
  assert.match(popupHtml, /08:44/);
});
