export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Check if an element is rendered and therefore focusable.
 *
 * Returns false for elements with the hidden attribute, inline display:none,
 * or no offsetParent (not laid out in the document). Kept simple to work
 * with plain test objects that may lack these properties.
 *
 * @param {Element} element
 * @returns {boolean}
 */
export function isElementRendered(element) {
  if (!element) {
    return false;
  }

  if (element.hasAttribute?.("hidden")) {
    return false;
  }

  if (element.style?.display === "none") {
    return false;
  }

  if (typeof element.offsetParent !== "undefined") {
    return element.offsetParent !== null;
  }

  return true;
}

/**
 * Resolve the first and last focusable elements of a collection.
 *
 * Kept free of DOM APIs beyond hasAttribute and style access so it can be
 * unit tested with plain objects — this repository has no jsdom.
 *
 * @param {Iterable<Element>|null|undefined} elements
 * @param {Function} [isVisible=isElementRendered] Predicate to filter visible elements.
 * @returns {{ first: Element|null, last: Element|null }}
 */
export function getFocusableEdges(elements, isVisible = isElementRendered) {
  const visible = Array.from(elements ?? []).filter((element) => {
    return isVisible(element);
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
