# INF-247 WFH Detail Drawer Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Management Pengguna WFH map modal with a truthful, accessible right-side Detail Pengguna drawer whose map lifecycle cannot leak stale Leaflet instances.

**Architecture:** Coordinate normalization stays in the existing `mapLocationTruth.js` helpers and is now actually used by the shared Alpine state. Drawer open/close logic moves into a new `userDetailDrawerLifecycle.js` module that receives its map adapter by injection, so the reopen cycle is unit-testable without a DOM. The template becomes a right-side `role="dialog"` drawer whose four close paths all route through one canonical handler.

**Tech Stack:** Alpine.js 3, Leaflet 1.9, Tailwind CSS 4, Webpack 5, Node built-in test runner (`node --test`), Prettier.

**Spec:** `docs/superpowers/specs/2026-07-26-inf-247-wfh-detail-drawer-hardening-design.md`

## Global Constraints

- Test command is `node --test "tests/**/*.test.js"`. The bare form `node --test tests/` FAILS on Node 24 — the directory resolves as a module path. Always use the quoted glob.
- Baseline on `develop` @ `f80141e` is **183 tests / 162 pass / 21 fail**. Absolute green is not achievable. The gate is: failures drop **21 → 20**, zero new failure names.
- `npm run lint` runs `prettier --check src tests docs`. Every file you create or edit — including markdown — must be Prettier-clean or lint fails.
- All user-facing copy is Indonesian. WFH status strings are exactly `Tersedia` and `Belum diatur`. Empty-location copy is exactly `Lokasi WFH belum diatur`.
- Never use the words "live", "current", "terkini", or "saat ini" for WFH location. The data is a configured target/geofence. Use `Lokasi WFH` or `Area WFH`.
- Never invent location data. No default radius, no placeholder description. Absent means absent.
- Do not modify `src/js/features/wfaBooking/bookingList.js`, `src/partials/modal/map-detail-modal.html`, `src/js/features/dashboard/dashboard.js`, or `src/js/features/attendance/attendanceLog.js`. They are out of scope.
- Status must be conveyed by text, not colour alone (INF-248 accessibility contract).
- Commit after every task.

---

### Task 1: Escape untrusted text in Leaflet popups

`mapDetailModal.js` interpolates backend-supplied `fullName` and `description` straight into a
popup HTML string passed to Leaflet's `bindPopup()`. Leaflet renders that string as HTML, so
backend text is currently executed as markup.

**Files:**

- Create: `src/js/utils/escapeHtml.js`
- Create: `tests/escape-html.test.js`
- Modify: `src/js/components/modal/mapDetailModal.js` (add import; lines 86 and 104)

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `escapeHtml(value: unknown) => string` from `src/js/utils/escapeHtml.js`. Returns `""` for `null`/`undefined`, otherwise the `String(value)` form with `&<>"'` replaced by HTML entities.

- [ ] **Step 1: Write the failing test**

Create `tests/escape-html.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { escapeHtml } from "../src/js/utils/escapeHtml.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modalSource = readFileSync(
  join(root, "src", "js", "components", "modal", "mapDetailModal.js"),
  "utf8",
);

test("escapeHtml neutralizes HTML control characters", () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
  );
  assert.equal(escapeHtml("Tom & Jerry"), "Tom &amp; Jerry");
  assert.equal(escapeHtml("it's"), "it&#39;s");
});

test("escapeHtml renders absent values as empty string, not literal null", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(""), "");
});

test("escapeHtml preserves zero and other falsy non-empty values", () => {
  assert.equal(escapeHtml(0), "0");
  assert.equal(escapeHtml(false), "false");
});

test("escapeHtml escapes an already-encoded entity exactly once", () => {
  assert.equal(escapeHtml("&lt;"), "&amp;lt;");
});

test("map popup escapes untrusted backend text instead of interpolating it raw", () => {
  assert.match(modalSource, /escapeHtml\(locationData\.fullName\)/);
  assert.match(modalSource, /escapeHtml\(locationData\.description\)/);
  assert.doesNotMatch(modalSource, /\$\{locationData\.fullName\}/);
  assert.doesNotMatch(modalSource, /\$\{locationData\.description\}/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/escape-html.test.js`

Expected: FAIL — `Cannot find module` for `../src/js/utils/escapeHtml.js`.

- [ ] **Step 3: Write the implementation**

Create `src/js/utils/escapeHtml.js`:

```js
const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escape a value for safe interpolation into an HTML string.
 *
 * Leaflet's bindPopup() renders its argument as HTML, so any backend-supplied
 * text must pass through here first. A single replace pass is used so an
 * already-encoded entity is escaped exactly once.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/[&<>"']/g, (character) => {
    return HTML_ESCAPE_MAP[character];
  });
}
```

- [ ] **Step 4: Apply it at both popup interpolation sites**

In `src/js/components/modal/mapDetailModal.js`, add the import next to the existing
`mapLocationTruth` import at the top of the file:

```js
import { escapeHtml } from "../../utils/escapeHtml.js";
```

Change line 86 from:

<!-- prettier-ignore -->
```text
            <h4 class="font-semibold text-gray-900 mb-1">${locationData.fullName}</h4>
```

to:

<!-- prettier-ignore -->
```text
            <h4 class="font-semibold text-gray-900 mb-1">${escapeHtml(locationData.fullName)}</h4>
```

Change line 104 from:

<!-- prettier-ignore -->
```text
                <strong>Deskripsi:</strong> ${locationData.description}
```

to:

<!-- prettier-ignore -->
```text
                <strong>Deskripsi:</strong> ${escapeHtml(locationData.description)}
```

These two fences are `text`, not `js`, on purpose. They are fragments of an HTML string inside a
template literal, and Prettier's Tailwind plugin reorders class names inside `js` and `html`
fences — which would make the "from" snippet stop matching the real file.

Leave the `radius` interpolation on line 95 alone — it is already gated by
`Number.isFinite(locationData.radius)` and cannot carry markup.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/escape-html.test.js`

Expected: PASS, 5 tests.

- [ ] **Step 6: Verify no regression and commit**

```bash
node --test "tests/**/*.test.js" 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```

Expected: 188 tests, 167 pass, 21 fail (the 5 new tests pass; the 21 pre-existing failures are unchanged).

```bash
npx prettier --write src/js/utils/escapeHtml.js tests/escape-html.test.js src/js/components/modal/mapDetailModal.js
git add src/js/utils/escapeHtml.js tests/escape-html.test.js src/js/components/modal/mapDetailModal.js
git commit -m "fix(webfe): escape untrusted backend text in Leaflet popups

fullName and description were interpolated raw into the popup HTML string
passed to bindPopup(), which Leaflet renders as markup.

Refs INF-247"
```

---

### Task 2: Make the shared coordinate contract finite-number based

`tests/map-detail-modal-truthfulness.test.js` is **already failing on `develop`**. Its third
case requires `src/js/index.js` to use the `mapLocationTruth` helpers. The truthy `||` chains
at `index.js:152-159` silently discard a latitude or longitude of exactly `0`.

This task turns an existing RED test GREEN. Do not write a new test — the test already exists.

**Files:**

- Modify: `src/js/index.js` (add import; lines 152-159 and 172-179)

**Interfaces:**

- Consumes: `firstFiniteMapNumber`, `hasFiniteCoordinates` from the pre-existing `src/js/utils/mapLocationTruth.js`.
- Produces: nothing new. `mapDetailModalState.selectedUserLocation` keeps the same property names, so the dashboard and attendance partials continue to work unchanged.

- [ ] **Step 1: Run the existing test to confirm the RED state**

Run: `node --test tests/map-detail-modal-truthfulness.test.js`

Expected: FAIL — 4 tests, 3 pass, 1 fail. The failing case is
`global map detail modal state uses finite-number helpers instead of truthy coordinate checks`,
asserting `/firstFiniteMapNumber\(/` is absent from `index.js`.

- [ ] **Step 2: Add the import**

In `src/js/index.js`, add after the existing `formatDate` import:

```js
import {
  firstFiniteMapNumber,
  hasFiniteCoordinates,
} from "./utils/mapLocationTruth.js";
```

- [ ] **Step 3: Replace the truthy coordinate chains**

In `Alpine.data("mapDetailModalState", ...)`, replace lines 152-161 — the `latitude`,
`longitude`, `radius`, and `description` entries — with:

```js
      latitude: firstFiniteMapNumber(
        user.latitude,
        user.location?.latitude,
        user.lat,
      ),
      longitude: firstFiniteMapNumber(
        user.longitude,
        user.location?.longitude,
        user.lng,
        user.lon,
      ),
      radius: firstFiniteMapNumber(user.radius, user.location?.radius),
      description:
        user.description ?? user.location?.description ?? user.address ?? "",
```

`??` replaces `||` for `description` so an intentional empty string is preserved rather than
falling through to the next candidate.

- [ ] **Step 4: Replace the truthy map-initialization guard**

Replace the `$nextTick` block at lines 172-179 with:

```js
this.$nextTick(() => {
  if (hasFiniteCoordinates(this.selectedUserLocation)) {
    window.mapDetailModal.initializeMap(this.selectedUserLocation);
  }
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/map-detail-modal-truthfulness.test.js`

Expected: PASS, 4 tests, 4 pass, 0 fail.

- [ ] **Step 6: Verify the failure count dropped and commit**

```bash
node --test "tests/**/*.test.js" 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```

Expected: 188 tests, 168 pass, **20 fail**. This is the 21 → 20 delta the spec gates on.

```bash
npx prettier --write src/js/index.js
git add src/js/index.js
git commit -m "fix(webfe): use finite-number coordinate contract in shared map state

Truthy || chains discarded a latitude or longitude of exactly 0. Switch to
the existing mapLocationTruth helpers, turning the pre-existing failing
truthfulness test green.

Affects the dashboard and attendance log surfaces as well as the user list,
since mapDetailModalState is shared. No layout or lifecycle change.

Refs INF-247"
```

---

### Task 3: Focus trap utility

The drawer needs focus containment and focus return. The element-ordering logic is extracted
as a pure function so it can be tested without a DOM; only the thin event wiring touches real
elements.

**Files:**

- Create: `src/js/utils/focusTrap.js`
- Create: `tests/focus-trap.test.js`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `FOCUSABLE_SELECTOR: string` — CSS selector for focusable descendants.
  - `getFocusableEdges(elements: Iterable) => { first: Element|null, last: Element|null }` — skips elements carrying a `hidden` attribute.
  - `createFocusTrap(container: Element) => { activate(): void, handleKeydown(event): void, deactivate(): void }`.

- [ ] **Step 1: Write the failing test**

Create `tests/focus-trap.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  getFocusableEdges,
  FOCUSABLE_SELECTOR,
} from "../src/js/utils/focusTrap.js";

function fakeElement(id, { hidden = false } = {}) {
  return {
    id,
    hasAttribute(name) {
      return name === "hidden" && hidden;
    },
  };
}

test("getFocusableEdges returns first and last focusable elements", () => {
  const a = fakeElement("a");
  const b = fakeElement("b");
  const c = fakeElement("c");

  const edges = getFocusableEdges([a, b, c]);

  assert.equal(edges.first, a);
  assert.equal(edges.last, c);
});

test("getFocusableEdges collapses a single element to both edges", () => {
  const only = fakeElement("only");

  const edges = getFocusableEdges([only]);

  assert.equal(edges.first, only);
  assert.equal(edges.last, only);
});

test("getFocusableEdges returns nulls for an empty collection", () => {
  const edges = getFocusableEdges([]);

  assert.equal(edges.first, null);
  assert.equal(edges.last, null);
});

test("getFocusableEdges tolerates null and undefined input", () => {
  assert.deepEqual(getFocusableEdges(null), { first: null, last: null });
  assert.deepEqual(getFocusableEdges(undefined), { first: null, last: null });
});

test("getFocusableEdges skips hidden elements when resolving edges", () => {
  const hiddenFirst = fakeElement("hidden-first", { hidden: true });
  const visible = fakeElement("visible");
  const hiddenLast = fakeElement("hidden-last", { hidden: true });

  const edges = getFocusableEdges([hiddenFirst, visible, hiddenLast]);

  assert.equal(edges.first, visible);
  assert.equal(edges.last, visible);
});

test("FOCUSABLE_SELECTOR excludes disabled controls and tabindex -1", () => {
  assert.match(FOCUSABLE_SELECTOR, /button:not\(\[disabled\]\)/);
  assert.match(FOCUSABLE_SELECTOR, /\[tabindex\]:not\(\[tabindex="-1"\]\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/focus-trap.test.js`

Expected: FAIL — `Cannot find module` for `../src/js/utils/focusTrap.js`.

- [ ] **Step 3: Write the implementation**

Create `src/js/utils/focusTrap.js`:

```js
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Resolve the first and last focusable elements of a collection.
 *
 * Kept free of DOM APIs beyond hasAttribute so it can be unit tested with
 * plain objects — this repository has no jsdom.
 *
 * @param {Iterable<Element>|null|undefined} elements
 * @returns {{ first: Element|null, last: Element|null }}
 */
export function getFocusableEdges(elements) {
  const visible = Array.from(elements ?? []).filter((element) => {
    return !element?.hasAttribute?.("hidden");
  });

  if (visible.length === 0) {
    return { first: null, last: null };
  }

  return { first: visible[0], last: visible[visible.length - 1] };
}

/**
 * Contain Tab focus inside a container and restore focus on deactivate.
 *
 * @param {Element} container
 */
export function createFocusTrap(container) {
  let previouslyFocused = null;

  function edges() {
    return getFocusableEdges(container.querySelectorAll(FOCUSABLE_SELECTOR));
  }

  return {
    activate() {
      previouslyFocused = container.ownerDocument?.activeElement ?? null;
      edges().first?.focus();
    },

    handleKeydown(event) {
      if (event.key !== "Tab") {
        return;
      }

      const { first, last } = edges();

      if (!first || !last) {
        return;
      }

      const active = container.ownerDocument?.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },

    deactivate() {
      previouslyFocused?.focus?.();
      previouslyFocused = null;
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/focus-trap.test.js`

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/js/utils/focusTrap.js tests/focus-trap.test.js
git add src/js/utils/focusTrap.js tests/focus-trap.test.js
git commit -m "feat(webfe): add focus trap utility for modal drawer semantics

Refs INF-247"
```

---

### Task 4: Drawer lifecycle module with injected map adapter

This is the core of the issue. The lifecycle owns the invariants that prevent stale Leaflet
instances, and it receives its map adapter by injection so those invariants can be proven by
`node --test` with a fake adapter that mimics Leaflet's real "already initialized" throw.

**Files:**

- Create: `src/js/features/userManagement/userDetailDrawerLifecycle.js`
- Create: `tests/user-detail-drawer-lifecycle.test.js`

**Interfaces:**

- Consumes: `firstFiniteMapNumber`, `hasFiniteCoordinates` from `src/js/utils/mapLocationTruth.js`.
- Produces:
  - `WFH_STATUS_AVAILABLE = "Tersedia"`, `WFH_STATUS_UNSET = "Belum diatur"`.
  - `normalizeWfhLocation(user?: object) => { id, fullName, email, position, nipNim, role, latitude, longitude, radius, description }` — coordinates and radius are `number|null`, strings default to `""`.
  - `resolveWfhStatus(location) => string` — one of the two status constants.
  - `createEmptyWfhLocation() => object` — same shape, all values empty/null.
  - `createUserDetailDrawerLifecycle({ mapAdapter }) => { open(user), close(), isOpen, selectedUserLocation, wfhStatus }` where `mapAdapter` is `{ initialize(location), destroy() }`. `isOpen`, `selectedUserLocation`, and `wfhStatus` are getters.

- [ ] **Step 1: Write the failing test**

Create `tests/user-detail-drawer-lifecycle.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/user-detail-drawer-lifecycle.test.js`

Expected: FAIL — `Cannot find module` for the lifecycle module.

- [ ] **Step 3: Write the implementation**

Create `src/js/features/userManagement/userDetailDrawerLifecycle.js`:

```js
import {
  firstFiniteMapNumber,
  hasFiniteCoordinates,
} from "../../utils/mapLocationTruth.js";

export const WFH_STATUS_AVAILABLE = "Tersedia";
export const WFH_STATUS_UNSET = "Belum diatur";

/**
 * Build the drawer view model for a user row.
 *
 * Absent values stay absent. No default radius and no placeholder description
 * are invented, because the drawer presents a configured WFH geofence and must
 * not imply configuration that does not exist.
 *
 * @param {object} [user]
 */
export function normalizeWfhLocation(user = {}) {
  return {
    id: user.id ?? null,
    fullName: user.fullName || user.full_name || "",
    email: user.email || "",
    position: user.position || user.position_name || "",
    nipNim: user.nipNim || user.nip_nim || "",
    role: user.role || user.role_name || "",
    latitude: firstFiniteMapNumber(user.latitude, user.location?.latitude),
    longitude: firstFiniteMapNumber(user.longitude, user.location?.longitude),
    radius: firstFiniteMapNumber(user.radius, user.location?.radius),
    description: user.description ?? user.location?.description ?? "",
  };
}

export function createEmptyWfhLocation() {
  return normalizeWfhLocation({});
}

/**
 * @param {{ latitude: unknown, longitude: unknown }} location
 * @returns {string} WFH_STATUS_AVAILABLE or WFH_STATUS_UNSET
 */
export function resolveWfhStatus(location) {
  return hasFiniteCoordinates(location)
    ? WFH_STATUS_AVAILABLE
    : WFH_STATUS_UNSET;
}

/**
 * Own the Detail Pengguna drawer open/close lifecycle.
 *
 * The map adapter is injected so the reopen contract can be asserted without a
 * DOM or a real Leaflet instance.
 *
 * Invariants:
 *  - open() closes any previous surface first, so the adapter never receives a
 *    second initialize() without an intervening destroy().
 *  - close() is idempotent: repeated calls destroy at most once per open.
 *  - the map is initialized only when both coordinates are finite.
 *
 * @param {{ mapAdapter: { initialize(location): void, destroy(): void } }} deps
 */
export function createUserDetailDrawerLifecycle({ mapAdapter } = {}) {
  if (!mapAdapter) {
    throw new Error(
      "createUserDetailDrawerLifecycle requires a mapAdapter with initialize() and destroy()",
    );
  }

  let isOpen = false;
  let selectedUserLocation = createEmptyWfhLocation();

  function close() {
    if (!isOpen) {
      return;
    }

    isOpen = false;
    mapAdapter.destroy();
    selectedUserLocation = createEmptyWfhLocation();
  }

  function open(user) {
    close();

    selectedUserLocation = normalizeWfhLocation(user);
    isOpen = true;

    if (hasFiniteCoordinates(selectedUserLocation)) {
      mapAdapter.initialize(selectedUserLocation);
    }
  }

  return {
    open,
    close,
    get isOpen() {
      return isOpen;
    },
    get selectedUserLocation() {
      return selectedUserLocation;
    },
    get wfhStatus() {
      return resolveWfhStatus(selectedUserLocation);
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/user-detail-drawer-lifecycle.test.js`

Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/js/features/userManagement/userDetailDrawerLifecycle.js tests/user-detail-drawer-lifecycle.test.js
git add src/js/features/userManagement/userDetailDrawerLifecycle.js tests/user-detail-drawer-lifecycle.test.js
git commit -m "feat(webfe): add injectable WFH detail drawer lifecycle

Canonical open/close with an injected map adapter, so the reopen contract
is provable without a DOM. Guarantees close() idempotency, no double
initialize, and no invented radius or description.

Refs INF-247"
```

---

### Task 5: Right-side Detail Pengguna drawer

Replace the centered map modal with the right-side drawer locked by INF-248, wire it to the
lifecycle module, and route all four close paths through one canonical handler.

**Files:**

- Create: `src/partials/modal/user-detail-drawer.html`
- Delete: `src/partials/modal/user-map-modal.html`
- Create: `tests/user-detail-drawer-template.test.js`
- Modify: `src/js/index.js` (register `userDetailDrawerState`)
- Modify: `src/management-user.html` (lines 22 and 68)
- Modify: `tests/map-detail-modal-truthfulness.test.js` (partial path and variable name)

**Interfaces:**

- Consumes: `createUserDetailDrawerLifecycle`, `resolveWfhStatus` (Task 4); `createFocusTrap` (Task 3).
- Produces: Alpine data `userDetailDrawerState()` exposing `isUserDetailDrawerOpen`, `selectedUserLocation`, `wfhStatus`, `openUserDetailDrawer(user)`, `closeUserDetailDrawer()`, `handleDrawerTab($event)`.

The state property is deliberately named `selectedUserLocation`, matching the shared state, so
the existing template assertions in `map-detail-modal-truthfulness.test.js` stay valid with only
a path change.

- [ ] **Step 1: Write the failing template test**

Create `tests/user-detail-drawer-template.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const drawerPath = join(
  root,
  "src",
  "partials",
  "modal",
  "user-detail-drawer.html",
);
const drawer = readFileSync(drawerPath, "utf8");
const indexSource = readFileSync(join(root, "src", "js", "index.js"), "utf8");
const managementUser = readFileSync(
  join(root, "src", "management-user.html"),
  "utf8",
);

test("the superseded map modal partial is gone", () => {
  assert.equal(
    existsSync(join(root, "src", "partials", "modal", "user-map-modal.html")),
    false,
  );
  assert.doesNotMatch(managementUser, /user-map-modal\.html/);
  assert.match(managementUser, /user-detail-drawer\.html/);
});

test("every close path routes through the canonical handler", () => {
  const closeCalls = drawer.match(/closeUserDetailDrawer\(\)/g) ?? [];
  assert.ok(
    closeCalls.length >= 4,
    `expected at least 4 canonical close bindings, found ${closeCalls.length}`,
  );
  assert.doesNotMatch(drawer, /isUserDetailDrawerOpen\s*=\s*false/);
  assert.doesNotMatch(drawer, /isMapDetailModalOpen/);
});

test("Escape closes the drawer", () => {
  assert.match(drawer, /@keydown\.escape\.window="closeUserDetailDrawer\(\)"/);
});

test("the drawer exposes dialog semantics and an accessible name", () => {
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /aria-labelledby="userDetailDrawerTitle"/);
  assert.match(drawer, /aria-describedby="userDetailDrawerDescription"/);
  assert.match(drawer, /id="userDetailDrawerTitle"/);
  assert.match(drawer, /id="userDetailDrawerDescription"/);
});

test("focus containment is wired to the panel", () => {
  assert.match(drawer, /@keydown\.tab="handleDrawerTab\(\$event\)"/);
});

test("the icon-only close control has an accessible label", () => {
  assert.match(drawer, /aria-label="Tutup detail pengguna"/);
});

test("the backdrop is hidden from assistive technology", () => {
  assert.match(drawer, /aria-hidden="true"/);
});

test("the drawer anchors to the right edge", () => {
  assert.match(drawer, /inset-y-0 right-0/);
});

test("WFH status is rendered as text, not colour alone", () => {
  assert.match(drawer, /x-text="wfhStatus"/);
});

test("the empty state uses the approved copy and renders no map", () => {
  assert.match(drawer, /Lokasi WFH belum diatur/);
});

test("the drawer never claims live or current employee location", () => {
  assert.doesNotMatch(drawer, /Lokasi Terkini/i);
  assert.doesNotMatch(drawer, /Lokasi Saat Ini/i);
  assert.doesNotMatch(drawer, /live location/i);
  assert.doesNotMatch(drawer, /current location/i);
});

test("index.js registers the drawer state and injects a real map adapter", () => {
  assert.match(indexSource, /Alpine\.data\("userDetailDrawerState"/);
  assert.match(indexSource, /createUserDetailDrawerLifecycle\(/);
  assert.match(indexSource, /createFocusTrap\(/);
});

test("management-user page mounts the drawer state", () => {
  assert.match(managementUser, /\.\.\.userDetailDrawerState\(\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/user-detail-drawer-template.test.js`

Expected: FAIL — `ENOENT` reading `user-detail-drawer.html`.

- [ ] **Step 3: Create the drawer partial**

Create `src/partials/modal/user-detail-drawer.html`:

```html
<!-- Detail Pengguna Drawer -->
<div
  x-show="isUserDetailDrawerOpen"
  x-cloak
  class="fixed inset-0 z-99999"
  style="display: none"
  @keydown.escape.window="closeUserDetailDrawer()"
>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-gray-400/50 backdrop-blur-[32px]"
    aria-hidden="true"
    @click="closeUserDetailDrawer()"
  ></div>

  <!-- Drawer Panel -->
  <div
    x-ref="userDetailDrawerPanel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="userDetailDrawerTitle"
    aria-describedby="userDetailDrawerDescription"
    class="no-scrollbar fixed inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl dark:bg-gray-900"
    x-transition:enter="transition ease-out duration-300 transform"
    x-transition:enter-start="translate-x-full"
    x-transition:enter-end="translate-x-0"
    x-transition:leave="transition ease-in duration-200 transform"
    x-transition:leave-start="translate-x-0"
    x-transition:leave-end="translate-x-full"
    @keydown.tab="handleDrawerTab($event)"
  >
    <!-- Drawer Header -->
    <div
      class="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-700"
    >
      <div>
        <h2
          id="userDetailDrawerTitle"
          class="text-theme-xl font-semibold text-gray-800 dark:text-white/90"
        >
          Detail Pengguna
        </h2>
        <p
          id="userDetailDrawerDescription"
          class="mt-1 text-sm text-gray-500 dark:text-gray-400"
        >
          Informasi pengguna dan area WFH yang dikonfigurasi.
        </p>
      </div>
      <button
        type="button"
        aria-label="Tutup detail pengguna"
        class="focus:ring-brand-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 focus:ring-2 focus:outline-none dark:bg-white/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.07]"
        @click="closeUserDetailDrawer()"
      >
        <svg
          class="h-5 w-5 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M6.04289 16.5418C5.65237 16.9323 5.65237 17.5655 6.04289 17.956C6.43342 18.3465 7.06658 18.3465 7.45711 17.956L11.9987 13.4144L16.5408 17.9565C16.9313 18.347 17.5645 18.347 17.955 17.9565C18.3455 17.566 18.3455 16.9328 17.955 16.5423L13.4129 12.0002L17.955 7.45808C18.3455 7.06756 18.3455 6.43439 17.955 6.04387C17.5645 5.65335 16.9313 5.65335 16.5408 6.04387L11.9987 10.586L7.45711 6.04439C7.06658 5.65386 6.43342 5.65386 6.04289 6.04439C5.65237 6.43491 5.65237 7.06808 6.04289 7.4586L10.5845 12.0002L6.04289 16.5418Z"
          />
        </svg>
      </button>
    </div>

    <!-- Drawer Body -->
    <div class="flex-1 space-y-6 p-6">
      <!-- Identitas -->
      <section class="space-y-3">
        <h3
          class="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
        >
          Identitas
        </h3>
        <div>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Nama Lengkap
          </span>
          <p
            class="text-base font-semibold text-gray-900 dark:text-white"
            x-text="selectedUserLocation.fullName || '-'"
          ></p>
        </div>
        <div>
          <span class="text-sm text-gray-500 dark:text-gray-400">Email</span>
          <p
            class="text-base text-gray-900 dark:text-white"
            x-text="selectedUserLocation.email || '-'"
          ></p>
        </div>
        <div>
          <span class="text-sm text-gray-500 dark:text-gray-400">NIP/NIM</span>
          <p
            class="text-base text-gray-900 dark:text-white"
            x-text="selectedUserLocation.nipNim || '-'"
          ></p>
        </div>
      </section>

      <!-- Akses -->
      <section class="space-y-3">
        <h3
          class="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
        >
          Akses
        </h3>
        <div>
          <span class="text-sm text-gray-500 dark:text-gray-400">Role</span>
          <p
            class="text-base text-gray-900 dark:text-white"
            x-text="selectedUserLocation.role || '-'"
          ></p>
        </div>
      </section>

      <!-- Organisasi -->
      <section class="space-y-3">
        <h3
          class="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
        >
          Organisasi
        </h3>
        <div>
          <span class="text-sm text-gray-500 dark:text-gray-400">Posisi</span>
          <p
            class="text-base text-gray-900 dark:text-white"
            x-text="selectedUserLocation.position || '-'"
          ></p>
        </div>
      </section>

      <!-- Lokasi WFH -->
      <section class="space-y-3">
        <h3
          class="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
        >
          Lokasi WFH
        </h3>
        <div>
          <span class="text-sm text-gray-500 dark:text-gray-400">Status</span>
          <p
            class="text-base font-medium text-gray-900 dark:text-white"
            x-text="wfhStatus"
          ></p>
        </div>

        <!-- Configured location detail -->
        <div
          class="space-y-3"
          x-show="Number.isFinite(selectedUserLocation.latitude) && Number.isFinite(selectedUserLocation.longitude)"
        >
          <div>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              Latitude
            </span>
            <p
              class="font-mono text-base text-gray-900 dark:text-white"
              x-text="Number.isFinite(selectedUserLocation.latitude) ? selectedUserLocation.latitude : '-'"
            ></p>
          </div>
          <div>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              Longitude
            </span>
            <p
              class="font-mono text-base text-gray-900 dark:text-white"
              x-text="Number.isFinite(selectedUserLocation.longitude) ? selectedUserLocation.longitude : '-'"
            ></p>
          </div>
          <div x-show="Number.isFinite(selectedUserLocation.radius)">
            <span class="text-sm text-gray-500 dark:text-gray-400">Radius</span>
            <p
              class="text-base text-gray-900 dark:text-white"
              x-text="Number.isFinite(selectedUserLocation.radius) ? selectedUserLocation.radius + ' m' : '-'"
            ></p>
          </div>
          <div x-show="selectedUserLocation.description">
            <span class="text-sm text-gray-500 dark:text-gray-400">
              Deskripsi
            </span>
            <p
              class="text-base text-gray-900 dark:text-white"
              x-text="selectedUserLocation.description"
            ></p>
          </div>

          <!-- Area WFH map preview -->
          <div
            class="h-64 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div
              id="mapDetailContainer"
              class="h-full w-full bg-gray-100 dark:bg-gray-800"
            ></div>
          </div>
        </div>

        <!-- Empty state -->
        <p
          class="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          x-show="!Number.isFinite(selectedUserLocation.latitude) || !Number.isFinite(selectedUserLocation.longitude)"
        >
          Lokasi WFH belum diatur.
        </p>
      </section>
    </div>

    <!-- Drawer Footer -->
    <div
      class="flex items-center justify-between gap-3 border-t border-gray-200 p-6 dark:border-gray-700"
    >
      <a
        :href="`form-user.html?id=${selectedUserLocation.id}`"
        class="bg-brand-500 hover:bg-brand-600 focus:ring-brand-500 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors focus:ring-2 focus:outline-none"
      >
        Edit Pengguna
      </a>
      <button
        type="button"
        class="focus:ring-brand-500 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:ring-2 focus:outline-none dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        @click="closeUserDetailDrawer()"
      >
        Tutup
      </button>
    </div>
  </div>
</div>
```

The map container keeps the id `mapDetailContainer` so the existing
`mapDetailModal.initializeMap()` / `destroyMap()` implementation works unchanged. No page
includes both this drawer and `map-detail-modal.html`, so there is no duplicate-id collision.

- [ ] **Step 4: Delete the superseded partial**

```bash
git rm src/partials/modal/user-map-modal.html
```

- [ ] **Step 5: Register the drawer state in index.js**

Add to the imports in `src/js/index.js`:

```js
import { createFocusTrap } from "./utils/focusTrap.js";
import { createUserDetailDrawerLifecycle } from "./features/userManagement/userDetailDrawerLifecycle.js";
```

Add after the existing `Alpine.data("mapDetailModalState", ...)` block:

```js
// Detail Pengguna drawer state for Management Pengguna
Alpine.data("userDetailDrawerState", () => {
  const lifecycle = createUserDetailDrawerLifecycle({
    mapAdapter: {
      initialize(location) {
        window.mapDetailModal.initializeMap(location);
      },
      destroy() {
        window.mapDetailModal.destroyMap();
      },
    },
  });

  let focusTrap = null;

  return {
    isUserDetailDrawerOpen: false,
    selectedUserLocation: lifecycle.selectedUserLocation,
    wfhStatus: lifecycle.wfhStatus,

    openUserDetailDrawer(user) {
      lifecycle.open(user);
      this.syncDrawerState();

      this.$nextTick(() => {
        const panel = this.$refs.userDetailDrawerPanel;

        if (!panel) {
          return;
        }

        focusTrap = createFocusTrap(panel);
        focusTrap.activate();
      });
    },

    closeUserDetailDrawer() {
      lifecycle.close();
      this.syncDrawerState();

      focusTrap?.deactivate();
      focusTrap = null;
    },

    handleDrawerTab(event) {
      focusTrap?.handleKeydown(event);
    },

    syncDrawerState() {
      this.isUserDetailDrawerOpen = lifecycle.isOpen;
      this.selectedUserLocation = lifecycle.selectedUserLocation;
      this.wfhStatus = lifecycle.wfhStatus;
    },
  };
});
```

`syncDrawerState()` copies the lifecycle getters into reactive Alpine properties. The lifecycle
stays the single owner of the invariants; Alpine only mirrors them for rendering.

- [ ] **Step 6: Mount the drawer on the page**

In `src/management-user.html`, change line 22 from:

```html
...mapDetailModalState()
```

to:

```html
...userDetailDrawerState()
```

and change line 68 from:

```html
<include src="./partials/modal/user-map-modal.html"></include>
```

to:

```html
<include src="./partials/modal/user-detail-drawer.html"></include>
```

Also update the surrounding comment on line 67 from `<!-- Map Detail Modal -->` to
`<!-- Detail Pengguna Drawer -->`.

- [ ] **Step 7: Point the existing truthfulness test at the new partial**

In `tests/map-detail-modal-truthfulness.test.js`, replace the `userMapModal` constant
(lines 23-26):

```js
const userDetailDrawer = readFileSync(
  join(root, "src", "partials", "modal", "user-detail-drawer.html"),
  "utf8",
);
```

and update the loop at line 80:

```js
  for (const templateSource of [dashboardMapModal, userDetailDrawer]) {
```

- [ ] **Step 8: Run both tests to verify they pass**

Run: `node --test tests/user-detail-drawer-template.test.js tests/map-detail-modal-truthfulness.test.js`

Expected: PASS — 13 template tests plus 4 truthfulness tests, 0 fail.

- [ ] **Step 9: Verify the build resolves the renamed include and commit**

```bash
npm run build 2>&1 | tail -20
```

Expected: webpack completes without error. A missing `<include>` target fails the build, so this
step is what proves the rename is wired correctly.

```bash
npx prettier --write src/partials/modal/user-detail-drawer.html src/js/index.js src/management-user.html tests/user-detail-drawer-template.test.js tests/map-detail-modal-truthfulness.test.js
git add -A
git commit -m "feat(webfe): replace user map modal with accessible detail drawer

Right-side Detail Pengguna drawer per the locked INF-248 design. All four
close paths, Escape, and programmatic close route through one canonical
handler that destroys the Leaflet instance, so reopening cannot hit a
stale container.

Adds dialog semantics, accessible name and description, initial focus,
focus containment, and focus return. Coordinates, radius, description, and
the map render only inside the drawer and only when finite.

Refs INF-247"
```

---

### Task 6: Status-only Lokasi WFH column

Remove raw coordinates from the table, show readiness only, and move the detail affordance into
the Aksi column with an accessible label.

**Files:**

- Modify: `src/partials/table/table-user.html` (header line 161; cell lines 260-290; Aksi cell lines 291-335)
- Modify: `src/js/features/userManagement/userListSimple.js` (replace `openMapDetailModal`, lines 251-286)
- Create: `tests/user-table-wfh-status-column.test.js`

**Interfaces:**

- Consumes: `normalizeWfhLocation`, `resolveWfhStatus` (Task 4); `openUserDetailDrawer` (Task 5, resolved through the Alpine scope chain from the `<body>` state).
- Produces: `wfhStatusFor(user) => string` on `userListAlpineData`.

- [ ] **Step 1: Write the failing test**

Create `tests/user-table-wfh-status-column.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const table = readFileSync(
  join(root, "src", "partials", "table", "table-user.html"),
  "utf8",
);
const listSource = readFileSync(
  join(root, "src", "js", "features", "userManagement", "userListSimple.js"),
  "utf8",
);

test("the table exposes a Lokasi WFH column instead of Koordinat", () => {
  assert.match(table, /Lokasi WFH/);
  assert.doesNotMatch(table, /Koordinat/);
});

test("the table renders WFH readiness as text", () => {
  assert.match(table, /x-text="wfhStatusFor\(user\)"/);
});

test("the table never renders raw coordinates", () => {
  assert.doesNotMatch(table, /x-text="user\.latitude/);
  assert.doesNotMatch(table, /x-text="user\.longitude/);
  assert.doesNotMatch(table, /user\.latitude\s*\+\s*/);
});

test("the detail control opens the drawer and is labelled for assistive tech", () => {
  assert.match(table, /openUserDetailDrawer\(user\)/);
  assert.match(
    table,
    /:aria-label="`Lihat detail pengguna \$\{user\.fullName\}`"/,
  );
});

test("the superseded map modal entry point is gone from the table", () => {
  assert.doesNotMatch(table, /openMapDetailModal/);
});

test("the feature exposes wfhStatusFor and no longer builds a modal payload", () => {
  assert.match(listSource, /wfhStatusFor\(user\)/);
  assert.match(listSource, /resolveWfhStatus\(/);
  assert.doesNotMatch(listSource, /openMapDetailModal/);
});

test("the feature no longer invents radius or description defaults", () => {
  assert.doesNotMatch(listSource, /radius:\s*user\.radius\s*\|\|\s*100/);
  assert.doesNotMatch(listSource, /Lokasi pengguna/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/user-table-wfh-status-column.test.js`

Expected: FAIL — `Koordinat` still present, `wfhStatusFor` missing.

- [ ] **Step 3: Rename the column header**

In `src/partials/table/table-user.html`, change the header cell text on line 161 from
`Koordinat` to `Lokasi WFH`. Leave the surrounding `<th>` markup and the other seven headers
untouched — the column count stays 8, so `colspan="8"` on line 178 needs no change.

- [ ] **Step 4: Replace the Koordinat cell with a status cell**

Replace the entire `<td>` block at lines 260-290 (the comment through the closing `</td>`) with:

```html
<!-- Lokasi WFH -->
<td class="px-6 py-4 text-sm whitespace-nowrap">
  <span
    class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="wfhStatusFor(user) === 'Tersedia' ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
    x-text="wfhStatusFor(user)"
  ></span>
</td>
```

Status is carried by the text node; the badge colour is supplementary, satisfying the INF-248
requirement that status is not conveyed by colour alone.

- [ ] **Step 5: Add the Detail control to the Aksi column**

In the Aksi cell, insert this button as the first child of the
`<div class="flex items-center space-x-3">` wrapper, before the existing Edit link:

```html
<!-- Detail Button -->
<button
  type="button"
  @click="openUserDetailDrawer(user)"
  :aria-label="`Lihat detail pengguna ${user.fullName}`"
  class="focus:ring-brand-500 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors hover:bg-blue-200 focus:ring-2 focus:outline-none dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-800/50"
  title="Detail Pengguna"
>
  <svg
    class="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    ></path>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    ></path>
  </svg>
</button>
```

`openUserDetailDrawer` resolves up the Alpine scope chain to the `<body>` state, so no change to
`userListAlpineData` wiring is needed for the call itself.

- [ ] **Step 6: Replace the dead modal payload builder**

In `src/js/features/userManagement/userListSimple.js`, add to the imports at the top:

```js
import {
  normalizeWfhLocation,
  resolveWfhStatus,
} from "./userDetailDrawerLifecycle.js";
```

Replace the whole `openMapDetailModal(user) { ... }` method (lines 251-286, comment block
included) with:

```js
    /**
     * WFH readiness label for the table's Lokasi WFH column.
     *
     * Coordinates stay out of the table; the drawer owns location detail.
     */
    wfhStatusFor(user) {
      return resolveWfhStatus(normalizeWfhLocation(user));
    },
```

Take care to keep the trailing comma structure valid — the original method ended with
`} /**` running straight into the next JSDoc block.

This deletes the `radius: user.radius || 100` and `description: user.description || "Lokasi pengguna"`
fabrications along with the method.

- [ ] **Step 7: Run the test to verify it passes**

Run: `node --test tests/user-table-wfh-status-column.test.js`

Expected: PASS, 7 tests.

- [ ] **Step 8: Full suite, lint, build, then commit**

```bash
node --test "tests/**/*.test.js" 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```

Expected: 20 fail — the pre-existing baseline minus the one we fixed. Zero new failure names.

```bash
npm run lint && npm run build 2>&1 | tail -10
```

```bash
git add -A
git commit -m "feat(webfe): show WFH readiness only in the user table

Koordinat column becomes a status-only Lokasi WFH column (Tersedia /
Belum diatur) with status carried by text, not colour. Raw latitude and
longitude no longer appear in the table; the drawer owns location detail.

Deletes the modal payload builder, which invented a 100 m default radius
and a placeholder description when the backend supplied neither.

Refs INF-247"
```

---

### Task 7: ADR update and runtime verification

**Files:**

- Modify: `docs/adr/ADR-001-webfe-source-of-truth-and-responsibility-boundary.md`
- Modify: `docs/adr/ADR-004-dashboard-reporting-and-export-responsibility.md`

- [ ] **Step 1: Read both ADRs to match their existing structure**

Read each file in full before editing. Follow the heading structure and tone already in use —
do not impose a new template.

- [ ] **Step 2: Record the WFH truth boundary in ADR-001**

Add a subsection stating that the Web FE presents the **configured WFH target/geofence** and
never live or current employee location; that coordinates are detail-surface-only and must not
appear as a default table column; and that absent configuration is reported as
`Lokasi WFH belum diatur` rather than filled with defaults.

- [ ] **Step 3: Record the surface ownership split in ADR-004**

Add a subsection stating that the Management Pengguna list surface owns readiness status only,
while the Detail Pengguna drawer owns coordinates, radius, description, and map preview. Note
that this split exists so the list cannot become a parallel source of location truth.

- [ ] **Step 4: Verify docs lint and commit**

```bash
npm run lint
git add docs/adr
git commit -m "docs(webfe): record WFH configured-location truth boundary

ADR-001 gains the configured-target vs live-tracking boundary; ADR-004
gains the list-vs-drawer ownership split for location detail.

DOCS/ADR UPDATE REQUIRED satisfied for INF-247.

Refs INF-247"
```

- [ ] **Step 5: Runtime verification in the browser preview**

Start the dev server and exercise `management-user.html`. Capture evidence for each:

1. Open the drawer, close it, reopen — **10 times**. Console must stay clean; specifically no
   `Map container is already initialized`.
2. A user with no WFH location: drawer shows `Lokasi WFH belum diatur`, no map renders, no
   Leaflet error.
3. A user with a configured location: latitude, longitude, and map render; radius appears only
   if the backend supplied one.
4. Keyboard only: Tab reaches the Detail control; Enter opens; focus lands inside the drawer;
   Tab cycles without escaping; Escape closes; focus returns to the Detail control.
5. Narrow viewport: the drawer overlays content rather than shrinking the table.
6. Confirm no table cell shows raw coordinates.

- [ ] **Step 6: Report results honestly**

State the final counts and what was observed. If any acceptance criterion could not be verified,
say which and why — do not report the task complete on partial evidence. Do not move Linear
INF-247 to `Done` until the runtime accessibility and reopen evidence above is attached to the
issue.

---

## Self-review

**Spec coverage.** Every INF-247 acceptance criterion maps to a task: status-only table and no
raw coordinates → Task 6; detail control opens the drawer → Tasks 5, 6; coordinates drawer-only
→ Tasks 5, 6; single canonical cleanup across all close paths → Tasks 4, 5; reopen ×10 → Task 4
(unit) and Task 7 (runtime); one finite-number contract → Task 2; missing coordinates show
`Lokasi WFH belum diatur` and initialize no Leaflet → Tasks 4, 5; popup escaping → Task 1;
drawer a11y semantics and focus behaviour → Tasks 3, 5, 7; labelled icon-only controls →
Tasks 5, 6; never presenting configured location as live → Tasks 5, 6, 7; radius only when
valid → Tasks 4, 5, 6; automated coverage of cleanup, missing location, and safe rendering →
Tasks 1, 3, 4, 5, 6; `npm run build` → Tasks 5, 6.

**Type consistency.** `selectedUserLocation` is the state property name in the lifecycle module,
the `index.js` drawer state, and the drawer template, so the existing truthfulness assertions
hold with only a path change. `mapAdapter` is `{ initialize, destroy }` in the interface block,
the fake adapter, and the production adapter. `wfhStatusFor` is defined in Task 6 and used only
in the Task 6 template. `openUserDetailDrawer` / `closeUserDetailDrawer` / `handleDrawerTab` are
defined in Task 5 and referenced in Tasks 5 and 6. `getFocusableEdges` and `createFocusTrap` are
defined in Task 3 and consumed in Task 5.

**Ordering.** Task 2 must precede Task 5 so the shared coordinate contract is finite-number
based before the drawer relies on it. Tasks 3 and 4 must precede Task 5, which imports both.
Task 5 must precede Task 6, since the table's detail button targets the drawer state.
