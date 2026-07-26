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
