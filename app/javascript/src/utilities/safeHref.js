const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Returns a value usable as a link target, or null.
 *
 * Accepts absolute http(s) URLs and paths on this server (e.g. /safety_sheets/...).
 * Anything else yields null so callers can render the link as unavailable.
 *
 * @param {*} value candidate link, typically read from stored chemical data
 * @returns {string|null}
 */
export default function safeHref(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;

  if (s.startsWith('/')) {
    // a single leading slash is a local path; '//' and '/\' would point at another host
    return /^\/[/\\]/.test(s) ? null : s;
  }

  try {
    return ALLOWED_PROTOCOLS.includes(new URL(s).protocol) ? s : null;
  } catch {
    return null;
  }
}
