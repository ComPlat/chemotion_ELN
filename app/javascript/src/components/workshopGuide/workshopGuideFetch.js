// Same-origin fetch helpers for the workshop guide content checked out into
// /public/workshop by `rake workshop_guide:sync`. The wiki repo is private,
// but the cloned files are served as static public assets by Rails.

const BASE = '/workshop';
const SIDEBAR = `${BASE}/_sidebar.md`;
const DEFAULT_SLUG = 'home';

const cacheBust = () => `?_=${Date.now()}`;

export const workshopBase = BASE;
export const workshopDefaultSlug = DEFAULT_SLUG;

// Availability must not be probed by requesting the (expectedly missing) static
// file directly: a 404 fetch response doesn't throw, but the browser still logs
// the failed resource load to the console on every non-workshop instance. This
// endpoint always answers 200, so the "feature disabled" case stays silent.
export async function fetchWorkshopAvailability() {
  try {
    const res = await fetch('/api/v1/public/workshop_guide/available');
    if (!res.ok) return false;
    const { available } = await res.json();
    return !!available;
  } catch (e) {
    return false;
  }
}

export async function fetchWorkshopPage(slug) {
  const safeSlug = String(slug || DEFAULT_SLUG).replace(/[^a-zA-Z0-9_-]/g, '');
  const res = await fetch(`${BASE}/${safeSlug}.md${cacheBust()}`);
  if (!res.ok) {
    const err = new Error(`Workshop page "${safeSlug}" not found (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

export async function fetchWorkshopSidebar() {
  const res = await fetch(`${SIDEBAR}${cacheBust()}`);
  if (!res.ok) return null;
  return res.text();
}

// Parse a GitLab `_sidebar.md` into nav groups.
// Recognises markdown headings as group titles, list items `- [Title](slug)`
// and the `[[slug]]` wiki-link form. Returns `[{ title, items: [{ title, slug }] }]`.
export function parseSidebar(markdown) {
  if (!markdown) return [];
  const groups = [];
  let current = { title: null, items: [] };
  const linkRe = /\[([^\]]+)\]\(([^)\s]+)\)/;
  const wikiRe = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/;

  markdown.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;

    if (/^#{1,6}\s+/.test(line)) {
      if (current.items.length) groups.push(current);
      current = { title: line.replace(/^#+\s+/, ''), items: [] };
      return;
    }

    if (/^[-*+]\s+/.test(line)) {
      const content = line.replace(/^[-*+]\s+/, '');
      let m = content.match(linkRe);
      if (m) {
        current.items.push({ title: m[1], slug: slugFromHref(m[2]) });
        return;
      }
      m = content.match(wikiRe);
      if (m) {
        const slug = slugFromHref(m[1]);
        current.items.push({ title: m[2] || m[1], slug });
      }
    }
  });

  if (current.items.length) groups.push(current);
  return groups;
}

// Normalise a link target to a slug. Drops anchors, strips `.md`,
// rejects anything that looks absolute/external.
export function slugFromHref(href) {
  if (!href) return null;
  if (/^[a-z]+:\/\//i.test(href) || href.startsWith('mailto:')) return null;
  let s = href.split('#')[0].split('?')[0];
  s = s.replace(/^\.?\//, '').replace(/\.md$/i, '').trim();
  return s || null;
}

// Replace `[[slug]]` / `[[slug|Title]]` wiki-links with standard markdown links
// so react-markdown picks them up. Idempotent on standard `[a](b)` links.
export function expandWikiLinks(markdown) {
  if (!markdown) return markdown;
  return markdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, label) => {
    const t = target.trim();
    const text = (label || t).trim();
    return `[${text}](${t})`;
  });
}
