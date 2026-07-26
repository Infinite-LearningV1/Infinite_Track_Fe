import test from "node:test";
import assert from "node:assert/strict";

import {
  getFocusableEdges,
  FOCUSABLE_SELECTOR,
  isElementRendered,
} from "../src/js/utils/focusTrap.js";

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
