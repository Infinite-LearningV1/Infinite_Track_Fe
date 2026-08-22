import test from "node:test";
import assert from "node:assert/strict";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createFocusTrap,
  getFocusableEdges,
  FOCUSABLE_SELECTOR,
  isElementRendered,
} from "../../src/js/utils/focusTrap.js";

function fakeElement(
  id,
  { hidden = false, display = null, offsetParent = undefined } = {},
) {
  return {
    id,
    hasAttribute(name) {
      return name === "hidden" && hidden;
    },
    style: display !== null ? { display } : {},
    offsetParent: offsetParent,
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

test("FOCUSABLE_SELECTOR excludes input[type=hidden]", () => {
  assert.match(
    FOCUSABLE_SELECTOR,
    /input:not\(\[disabled\]\):not\(\[type="hidden"\]\)/,
  );
});

test("getFocusableEdges skips elements with inline display:none (Alpine x-show)", () => {
  const displayNone = fakeElement("display-none", { display: "none" });
  const visible = fakeElement("visible");

  const edges = getFocusableEdges([displayNone, visible]);

  assert.equal(edges.first, visible);
  assert.equal(edges.last, visible);
});

test("getFocusableEdges skips elements whose offsetParent is null", () => {
  const detached = fakeElement("detached", { offsetParent: null });
  const visible = fakeElement("visible", { offsetParent: {} });

  const edges = getFocusableEdges([detached, visible]);

  assert.equal(edges.first, visible);
  assert.equal(edges.last, visible);
});

test("getFocusableEdges treats fakes without offsetParent as visible", () => {
  const noOffsetParent = fakeElement("no-offset-parent", {
    offsetParent: undefined,
  });
  delete noOffsetParent.offsetParent;

  const edges = getFocusableEdges([noOffsetParent]);

  assert.equal(edges.first, noOffsetParent);
  assert.equal(edges.last, noOffsetParent);
});

test("getFocusableEdges honours a custom isVisible predicate", () => {
  const a = fakeElement("a");
  const b = fakeElement("b");
  const c = fakeElement("c");

  const customPredicate = (element) => element.id !== "b";
  const edges = getFocusableEdges([a, b, c], customPredicate);

  assert.equal(edges.first, a);
  assert.equal(edges.last, c);
});

test("isElementRendered filters by hidden attribute", () => {
  assert.equal(isElementRendered(fakeElement("visible")), true);
  assert.equal(
    isElementRendered(fakeElement("hidden", { hidden: true })),
    false,
  );
});

test("isElementRendered filters by inline display:none", () => {
  assert.equal(
    isElementRendered(fakeElement("display-none", { display: "none" })),
    false,
  );
  assert.equal(
    isElementRendered(fakeElement("visible", { display: "block" })),
    true,
  );
});

test("isElementRendered filters by offsetParent when available", () => {
  assert.equal(
    isElementRendered(fakeElement("detached", { offsetParent: null })),
    false,
  );
  assert.equal(
    isElementRendered(fakeElement("attached", { offsetParent: {} })),
    true,
  );
});

test("isElementRendered tolerates missing offsetParent", () => {
  const noOffsetParent = fakeElement("no-offset-parent", {
    offsetParent: undefined,
  });
  delete noOffsetParent.offsetParent;

  assert.equal(isElementRendered(noOffsetParent), true);
});

function focusableFake(id, focusLog) {
  const element = fakeElement(id);
  element.focus = () => focusLog.push(id);
  return element;
}

/**
 * Minimal container fake: owns a focusable list, an activeElement, and a
 * contains() that reports membership of that list plus the container itself.
 */
function fakeContainer(children, activeElement) {
  const container = {
    ownerDocument: { activeElement },
    querySelectorAll() {
      return children;
    },
    contains(element) {
      return element === container || children.includes(element);
    },
  };

  return container;
}

function tabEvent({ shiftKey = false } = {}) {
  return {
    key: "Tab",
    shiftKey,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}

test("Tab with focus outside the container pulls focus back to the first element", () => {
  const focusLog = [];
  const first = focusableFake("first", focusLog);
  const last = focusableFake("last", focusLog);
  const strayBody = fakeElement("body");

  const container = fakeContainer([first, last], strayBody);
  const trap = createFocusTrap(container);
  const event = tabEvent();

  trap.handleKeydown(event);

  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(focusLog, ["first"]);
});

test("Shift+Tab with focus outside the container also re-enters at the first element", () => {
  const focusLog = [];
  const first = focusableFake("first", focusLog);
  const last = focusableFake("last", focusLog);

  const container = fakeContainer([first, last], fakeElement("body"));
  const trap = createFocusTrap(container);
  const event = tabEvent({ shiftKey: true });

  trap.handleKeydown(event);

  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(focusLog, ["first"]);
});

test("the re-entry guard does not disturb focus already inside the container", () => {
  const focusLog = [];
  const first = focusableFake("first", focusLog);
  const middle = focusableFake("middle", focusLog);
  const last = focusableFake("last", focusLog);

  const container = fakeContainer([first, middle, last], middle);
  const trap = createFocusTrap(container);
  const event = tabEvent();

  trap.handleKeydown(event);

  assert.equal(event.defaultPrevented, false);
  assert.deepEqual(focusLog, []);
});

test("focus on the panel itself counts as inside the container", () => {
  const focusLog = [];
  const first = focusableFake("first", focusLog);
  const last = focusableFake("last", focusLog);

  const container = fakeContainer([first, last], null);
  container.ownerDocument.activeElement = container;

  const trap = createFocusTrap(container);
  const event = tabEvent();

  trap.handleKeydown(event);

  assert.equal(event.defaultPrevented, false);
  assert.deepEqual(focusLog, []);
});

test("Tab from the last element still wraps to the first", () => {
  const focusLog = [];
  const first = focusableFake("first", focusLog);
  const last = focusableFake("last", focusLog);

  const container = fakeContainer([first, last], last);
  const trap = createFocusTrap(container);
  const event = tabEvent();

  trap.handleKeydown(event);

  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(focusLog, ["first"]);
});

test("Shift+Tab from the first element still wraps to the last", () => {
  const focusLog = [];
  const first = focusableFake("first", focusLog);
  const last = focusableFake("last", focusLog);

  const container = fakeContainer([first, last], first);
  const trap = createFocusTrap(container);
  const event = tabEvent({ shiftKey: true });

  trap.handleKeydown(event);

  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(focusLog, ["last"]);
});

const drawerPartial = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "src",
    "partials",
    "modal",
    "user-detail-drawer.html",
  ),
  "utf8",
);

test("the drawer panel is programmatically focusable so clicks cannot drop focus to body", () => {
  const panel = drawerPartial.slice(
    drawerPartial.indexOf('x-ref="userDetailDrawerPanel"'),
    drawerPartial.indexOf("<!-- Drawer Header -->"),
  );

  assert.match(panel, /role="dialog"/);
  assert.match(panel, /tabindex="-1"/);
});
