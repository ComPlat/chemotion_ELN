const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Returns a value usable as a link target, or null.
 *
 * Accepts absolute http(s) URLs and paths on this server (e.g. /safety_sheets/...).
 * The value is resolved the way the browser resolves an href, so what is checked
 * is where the link actually leads. Anything else yields null so callers can
 * render the link as unavailable.
 *
 * @param {*} value candidate link, typically read from stored chemical data
 * @returns {string|null}
 */
export default function safeHref(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;

  const { origin } = window.location;
  let url;
  try {
    url = new URL(s, origin);
  } catch {
    return null;
  }
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return null;

  // a value without a scheme must be a path on this server
  const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(s);
  if (!isAbsolute) {
    if (!s.startsWith('/') || url.origin !== origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return url.href;
}
