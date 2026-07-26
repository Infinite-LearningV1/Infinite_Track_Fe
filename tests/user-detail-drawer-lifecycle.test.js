import test from "node:test";
import assert from "node:assert/strict";

import {
  WFH_STATUS_AVAILABLE,
  WFH_STATUS_UNSET,
  createUserDetailDrawerLifecycle,
  normalizeWfhLocation,
  resolveWfhStatus,
} from "../src/js/features/userManagement/userDetailDrawerLifecycle.js";

/**
 * Mimics Leaflet: initializing a second map over a live container throws,
 * exactly as L.map() does when _leaflet_id is already set.
 */
function createFakeMapAdapter() {
  const calls = [];
  let live = false;

  return {
    calls,
    get isLive() {
      return live;
    },
    countOf(type) {
      return calls.filter((call) => call.type === type).length;
    },
    initialize(location) {
      if (live) {
        throw new Error("Map container is already initialized");
      }
      live = true;
      calls.push({ type: "initialize", location });
    },
    destroy() {
      live = false;
      calls.push({ type: "destroy" });
    },
  };
}

const USER_WITH_LOCATION = {
  id: 7,
  full_name: "Budi Santoso",
  email: "budi@example.com",
  position_name: "Staff",
  nip_nim: "12345",
  role_name: "Employee",
  location: { latitude: -0.9, longitude: 119.8, radius: 150 },
};

test("createUserDetailDrawerLifecycle requires a map adapter", () => {
  assert.throws(() => createUserDetailDrawerLifecycle({}), /mapAdapter/);
});

test("open then close ten times never leaves a live map instance", () => {
  const adapter = createFakeMapAdapter();
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    drawer.open(USER_WITH_LOCATION);
    assert.equal(drawer.isOpen, true, `open failed on attempt ${attempt}`);
    assert.equal(adapter.isLive, true, `map not live on attempt ${attempt}`);

    drawer.close();
    assert.equal(drawer.isOpen, false, `close failed on attempt ${attempt}`);
    assert.equal(adapter.isLive, false, `stale map on attempt ${attempt}`);
  }

  assert.equal(adapter.countOf("initialize"), 10);
  assert.equal(adapter.countOf("destroy"), 10);
});

test("reopening without an explicit close destroys the previous map first", () => {
  const adapter = createFakeMapAdapter();
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  drawer.open(USER_WITH_LOCATION);
  drawer.open({ ...USER_WITH_LOCATION, id: 8 });

  assert.deepEqual(
    adapter.calls.map((call) => call.type),
    ["initialize", "destroy", "initialize"],
  );
  assert.equal(drawer.isOpen, true);
  assert.equal(drawer.selectedUserLocation.id, 8);
});

test("close is idempotent and destroys at most once per open", () => {
  const adapter = createFakeMapAdapter();
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  drawer.open(USER_WITH_LOCATION);
  drawer.close();
  drawer.close();
  drawer.close();

  assert.equal(adapter.countOf("destroy"), 1);
  assert.equal(drawer.isOpen, false);
});

test("closing a never-opened drawer does not touch the adapter", () => {
  const adapter = createFakeMapAdapter();
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  drawer.close();

  assert.equal(adapter.calls.length, 0);
});

test("close resets the selected location so no data leaks between users", () => {
  const adapter = createFakeMapAdapter();
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  drawer.open(USER_WITH_LOCATION);
  drawer.close();

  assert.equal(drawer.selectedUserLocation.fullName, "");
  assert.equal(drawer.selectedUserLocation.latitude, null);
  assert.equal(drawer.selectedUserLocation.radius, null);
  assert.equal(drawer.wfhStatus, WFH_STATUS_UNSET);
});

test("a user without coordinates opens the drawer but initializes no map", () => {
  const adapter = createFakeMapAdapter();
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  drawer.open({ id: 1, full_name: "Tanpa Lokasi" });

  assert.equal(drawer.isOpen, true);
  assert.equal(adapter.countOf("initialize"), 0);
  assert.equal(drawer.wfhStatus, WFH_STATUS_UNSET);
});

test("a half-configured location initializes no map", () => {
  const adapter = createFakeMapAdapter();
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  drawer.open({ id: 2, latitude: -0.9, longitude: null });

  assert.equal(adapter.countOf("initialize"), 0);
  assert.equal(drawer.wfhStatus, WFH_STATUS_UNSET);
});

test("zero coordinates are a valid configured location", () => {
  const adapter = createFakeMapAdapter();
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  drawer.open({ id: 3, latitude: 0, longitude: 0 });

  assert.equal(adapter.countOf("initialize"), 1);
  assert.equal(drawer.wfhStatus, WFH_STATUS_AVAILABLE);
});

test("normalizeWfhLocation never invents radius or description", () => {
  const location = normalizeWfhLocation({
    id: 4,
    latitude: -0.9,
    longitude: 119.8,
  });

  assert.equal(location.radius, null);
  assert.equal(location.description, "");
});

test("normalizeWfhLocation coerces numeric strings and rejects junk", () => {
  const location = normalizeWfhLocation({
    latitude: "-0.9",
    longitude: " 119.8 ",
    radius: "not-a-number",
  });

  assert.equal(location.latitude, -0.9);
  assert.equal(location.longitude, 119.8);
  assert.equal(location.radius, null);
});

test("normalizeWfhLocation accepts both snake_case and camelCase identity fields", () => {
  const fromSnake = normalizeWfhLocation({
    full_name: "A",
    nip_nim: "1",
    role_name: "Admin",
    position_name: "Kepala",
  });

  assert.equal(fromSnake.fullName, "A");
  assert.equal(fromSnake.nipNim, "1");
  assert.equal(fromSnake.role, "Admin");
  assert.equal(fromSnake.position, "Kepala");

  const fromCamel = normalizeWfhLocation({
    fullName: "B",
    nipNim: "2",
    role: "Employee",
    position: "Staff",
  });

  assert.equal(fromCamel.fullName, "B");
  assert.equal(fromCamel.nipNim, "2");
  assert.equal(fromCamel.role, "Employee");
  assert.equal(fromCamel.position, "Staff");
});

test("resolveWfhStatus reports readiness from coordinates alone", () => {
  assert.equal(
    resolveWfhStatus({ latitude: 0, longitude: 0 }),
    WFH_STATUS_AVAILABLE,
  );
  assert.equal(
    resolveWfhStatus({ latitude: null, longitude: 1 }),
    WFH_STATUS_UNSET,
  );
  assert.equal(resolveWfhStatus({}), WFH_STATUS_UNSET);
});
