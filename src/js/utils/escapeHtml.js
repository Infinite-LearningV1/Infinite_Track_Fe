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
