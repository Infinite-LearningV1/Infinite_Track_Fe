/**
 * Role badge color mapping shared by the Management Pengguna table (Akses
 * column) and the Detail Pengguna drawer (profile header badge).
 *
 * Pure helper: deterministic, no side effects, no reliance on `this`.
 * Colour is supplementary only — callers must keep `user.role` (or
 * equivalent) as the badge's visible text, so this never becomes the sole
 * carrier of status.
 *
 * Reuses the light-variant badge palettes already defined in
 * src/badge.html (src/partials/badge/badge-01.html) rather than
 * inventing a new one:
 *   Admin      -> error   (bg-error-50 / text-error-600)
 *   Management -> warning (bg-warning-50 / text-warning-600)
 *   Employee   -> success (bg-success-50 / text-success-600)
 *   Internship -> info / blue-light (bg-blue-light-50 / text-blue-light-500)
 *   other/absent -> gray/light (bg-gray-100 / text-gray-700)
 *
 * @param {string|null|undefined} role
 * @returns {string} full Tailwind class string (bg + text + dark variants)
 */
export function roleBadgeClass(role) {
  const palette = {
    admin:
      "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
    management:
      "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
    employee:
      "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
    internship:
      "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500",
  };
  const fallback =
    "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80";
  const key = (role || "").toString().trim().toLowerCase();
  return palette[key] || fallback;
}
