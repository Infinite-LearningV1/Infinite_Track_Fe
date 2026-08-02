import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  WFH_STATUS_AVAILABLE,
  WFH_STATUS_UNSET,
  createEmptyWfhLocation,
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

/**
 * Hand-rolled clock: a queue of pending callbacks flushed on demand.
 * No timers and no fake-timer dependency — the point is to control
 * *completion* ordering, which a synchronous fake can never express.
 */
function createManualClock() {
  let nextId = 1;
  const pending = new Map();

  return {
    get pendingCount() {
      return pending.size;
    },
    schedule(callback) {
      const id = nextId;
      nextId += 1;
      pending.set(id, callback);
      return id;
    },
    cancel(id) {
      if (id !== null && id !== undefined) {
        pending.delete(id);
      }
    },
    flush() {
      let guard = 0;

      while (pending.size > 0) {
        guard += 1;
        if (guard > 100) {
          throw new Error("clock did not settle");
        }

        const [id, callback] = pending.entries().next().value;
        pending.delete(id);
        callback();
      }
    },
  };
}

/**
 * Asynchronous map adapter modelled on MapDetailModal: construction of the
 * map is deferred (the real one waits 300ms for the drawer animation) and a
 * follow-up resize is deferred again. Like Leaflet, initializing over a still
 * live container throws.
 *
 * destroy() cancels pending deferred work — that is exactly the guarantee
 * MapDetailModal must provide, and without it a close that lands before the
 * timer fires leaves a live map behind.
 */
function createDeferredFakeMapAdapter(clock) {
  const calls = [];
  let live = false;
  let pendingInit = null;
  let pendingResize = null;

  function cancelPending() {
    clock.cancel(pendingInit);
    pendingInit = null;
    clock.cancel(pendingResize);
    pendingResize = null;
  }

  function teardown() {
    if (live) {
      live = false;
      calls.push({ type: "destroy" });
    }
  }

  return {
    calls,
    get isLive() {
      return live;
    },
    countOf(type) {
      return calls.filter((call) => call.type === type).length;
    },
    initialize(location) {
      cancelPending();
      teardown();

      pendingInit = clock.schedule(() => {
        pendingInit = null;

        if (live) {
          throw new Error("Map container is already initialized");
        }

        live = true;
        calls.push({ type: "initialize", location });

        pendingResize = clock.schedule(() => {
          pendingResize = null;
          calls.push({ type: "resize" });
        });
      });
    },
    destroy() {
      cancelPending();
      teardown();
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

test("a close before deferred map construction completes leaves no live map", () => {
  const clock = createManualClock();
  const adapter = createDeferredFakeMapAdapter(clock);
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  drawer.open(USER_WITH_LOCATION);
  assert.equal(
    clock.pendingCount,
    1,
    "map construction should still be pending",
  );

  drawer.close();
  clock.flush();

  assert.equal(adapter.isLive, false, "a map survived the close");
  assert.equal(adapter.countOf("initialize"), 0);
  assert.equal(clock.pendingCount, 0);
});

test("open, close, reopen and then flush ends with exactly one live map", () => {
  const clock = createManualClock();
  const adapter = createDeferredFakeMapAdapter(clock);
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  drawer.open(USER_WITH_LOCATION);
  drawer.close();
  drawer.open({ ...USER_WITH_LOCATION, id: 8 });

  assert.doesNotThrow(() => clock.flush(), /already initialized/);

  assert.equal(adapter.countOf("initialize"), 1);
  assert.equal(adapter.isLive, true);
  assert.equal(
    adapter.calls[0].location.id,
    8,
    "the stale user's map was built",
  );
  assert.equal(clock.pendingCount, 0);
});

test("deferred reopen cycles never leave a stale map or double-initialize", () => {
  const clock = createManualClock();
  const adapter = createDeferredFakeMapAdapter(clock);
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    drawer.open({ ...USER_WITH_LOCATION, id: attempt });
    assert.doesNotThrow(() => clock.flush(), `attempt ${attempt}`);
    assert.equal(adapter.isLive, true, `map not live on attempt ${attempt}`);

    drawer.close();
    clock.flush();
    assert.equal(adapter.isLive, false, `stale map on attempt ${attempt}`);
  }

  assert.equal(adapter.countOf("initialize"), 10);
  assert.equal(adapter.countOf("destroy"), 10);
});

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const mapDetailModalSource = readFileSync(
  join(repoRoot, "src", "js", "components", "modal", "mapDetailModal.js"),
  "utf8",
);

test("MapDetailModal stores its deferred timer handles instead of dropping them", () => {
  assert.match(mapDetailModalSource, /this\.pendingInitTimer = null;/);
  assert.match(mapDetailModalSource, /this\.pendingResizeTimer = null;/);
  assert.match(mapDetailModalSource, /this\.pendingInitTimer = setTimeout\(/);
  assert.match(mapDetailModalSource, /this\.pendingResizeTimer = setTimeout\(/);
});

test("MapDetailModal cancels pending deferred work on both entry points", () => {
  assert.match(mapDetailModalSource, /clearTimeout\(this\.pendingInitTimer\)/);
  assert.match(
    mapDetailModalSource,
    /clearTimeout\(this\.pendingResizeTimer\)/,
  );

  const initializeBody = mapDetailModalSource.slice(
    mapDetailModalSource.indexOf("initializeMap(locationData)"),
    mapDetailModalSource.indexOf("destroyMap()"),
  );
  const destroyBody = mapDetailModalSource.slice(
    mapDetailModalSource.indexOf("destroyMap() {"),
  );

  assert.match(initializeBody, /this\.cancelPendingTimers\(\);/);
  assert.match(destroyBody, /this\.cancelPendingTimers\(\);/);
});

test("normalizeWfhLocation passes through the user photo", () => {
  const location = normalizeWfhLocation({
    id: 9,
    full_name: "Foto User",
    photo: "https://res.cloudinary.com/demo/image/upload/v1/foto.jpg",
  });

  assert.equal(
    location.photo,
    "https://res.cloudinary.com/demo/image/upload/v1/foto.jpg",
  );
});

test("normalizeWfhLocation defaults photo to null when absent", () => {
  const location = normalizeWfhLocation({ id: 10, full_name: "Tanpa Foto" });

  assert.equal(location.photo, null);
});

test("normalizeWfhLocation derives initials and avatarColor from the full name", () => {
  const location = normalizeWfhLocation({
    id: 11,
    full_name: "Budi Santoso",
  });

  assert.equal(typeof location.initials, "string");
  assert.ok(location.initials.length > 0);
  assert.equal(typeof location.avatarColor, "string");
  assert.ok(location.avatarColor.length > 0);
});

test("createEmptyWfhLocation still resolves initials/avatarColor for an empty name", () => {
  const empty = createEmptyWfhLocation();

  assert.equal(typeof empty.initials, "string");
  assert.equal(typeof empty.avatarColor, "string");
  assert.equal(empty.photo, null);
});

test("close resets photo so no stale avatar leaks between users", () => {
  const adapter = createFakeMapAdapter();
  const drawer = createUserDetailDrawerLifecycle({ mapAdapter: adapter });

  drawer.open({ ...USER_WITH_LOCATION, photo: "https://example.com/a.jpg" });
  assert.equal(drawer.selectedUserLocation.photo, "https://example.com/a.jpg");

  drawer.close();

  assert.equal(drawer.selectedUserLocation.photo, null);
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
