import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';

import {
  expandWikiLinks,
  fetchWorkshopPage,
  fetchWorkshopSidebar,
  parseSidebar,
  slugFromHref,
  workshopBase,
  workshopDefaultSlug,
} from 'src/components/workshopGuide/workshopGuideFetch';

const remarkPlugins = [gfm];

function extractText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node.props && node.props.children) return extractText(node.props.children);
  return '';
}

// Works on http://… origins too (navigator.clipboard requires a secure context).
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) { /* fall through to legacy path */ }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.left = '0';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

function CopyButton({ getText }) {
  const [state, setState] = useState('idle');
  const onClick = async () => {
    const ok = await copyText(getText());
    setState(ok ? 'copied' : 'failed');
    setTimeout(() => setState('idle'), 1500);
  };
  let label = 'Copy';
  if (state === 'copied') label = 'Copied';
  else if (state === 'failed') label = 'Press Ctrl+C';
  return (
    <button
      type="button"
      className="workshop-guide__copy"
      onClick={onClick}
      aria-label="Copy to clipboard"
    >
      {label}
    </button>
  );
}

function PreWithCopy({ children }) {
  return (
    <div className="workshop-guide__code">
      <CopyButton getText={() => extractText(children).replace(/\n$/, '')} />
      <pre>{children}</pre>
    </div>
  );
}

function BlockquoteWithCopy({ children }) {
  return (
    <div className="workshop-guide__quote">
      <CopyButton getText={() => extractText(children).trim()} />
      <blockquote>{children}</blockquote>
    </div>
  );
}

// Resolve a markdown link's href to either a known wiki slug or a fully
// qualified URL. Returns `{ slug }` for internal navigation, `{ href }` for
// asset links / external links.
function resolveHref(href, knownSlugs) {
  if (!href) return { href };
  if (/^[a-z]+:\/\//i.test(href) || href.startsWith('mailto:')) return { href, external: true };
  const slug = slugFromHref(href);
  if (slug && knownSlugs.has(slug)) return { slug };
  if (href.startsWith('/')) return { href };
  return { href: `${workshopBase}/${href.replace(/^\.\//, '')}` };
}

export default function WorkshopContent({ initialSlug, embedded }) {
  const [slug, setSlug] = useState(initialSlug || workshopDefaultSlug);
  const [content, setContent] = useState('');
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchWorkshopSidebar()
      .then((md) => { if (!cancelled) setGroups(parseSidebar(md)); })
      .catch(() => { /* sidebar is optional */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWorkshopPage(slug)
      .then((md) => {
        if (cancelled) return;
        setContent(expandWikiLinks(md));
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  const knownSlugs = useMemo(() => {
    const set = new Set();
    groups.forEach((g) => g.items.forEach((it) => it.slug && set.add(it.slug)));
    return set;
  }, [groups]);

  const navigate = useCallback((next) => {
    if (!next) return;
    setSlug(next);
  }, []);

  const renderers = useMemo(() => ({
    a: ({ href, children }) => {
      const resolved = resolveHref(href, knownSlugs);
      if (resolved.slug) {
        return (
          <a
            href={`#${resolved.slug}`}
            onClick={(e) => { e.preventDefault(); navigate(resolved.slug); }}
          >
            {children}
          </a>
        );
      }
      return (
        <a href={resolved.href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    img: ({ src, alt }) => {
      const resolved = resolveHref(src, knownSlugs);
      return <img src={resolved.href || src} alt={alt || ''} style={{ maxWidth: '100%' }} />;
    },
    pre: PreWithCopy,
    blockquote: BlockquoteWithCopy,
  }), [knownSlugs, navigate]);

  const sidebar = groups.length ? (
    <nav className="workshop-guide__nav">
      {groups.map((g) => (
        <div key={g.title || 'group'} className="workshop-guide__nav-group">
          {g.title && <div className="workshop-guide__nav-title">{g.title}</div>}
          <ul>
            {g.items.map((it) => (
              <li key={it.slug}>
                <button
                  type="button"
                  className={`workshop-guide__nav-link${it.slug === slug ? ' is-active' : ''}`}
                  onClick={() => navigate(it.slug)}
                >
                  {it.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  ) : null;

  return (
    <div className={`workshop-guide${embedded ? ' workshop-guide--embedded' : ''}`}>
      {sidebar}
      <div className="workshop-guide__body">
        {loading && <div className="workshop-guide__loading">Loading…</div>}
        {error && (
          <div className="workshop-guide__error">
            <p>Could not load workshop page <code>{slug}</code>.</p>
            <p>
              Ask the operator to run <code>rake workshop_guide:sync</code>, or
              open the wiki directly.
            </p>
          </div>
        )}
        {!loading && !error && (
          <ReactMarkdown remarkPlugins={remarkPlugins} components={renderers}>
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
