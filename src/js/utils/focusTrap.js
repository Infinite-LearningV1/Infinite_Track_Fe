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
