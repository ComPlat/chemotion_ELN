import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

// Identifier → Promise<{ data, type }> — memoises inline-image preview fetches
// so a Quill blot (or any consumer) rendering an image many times per session
// only downloads it once per identifier.

const MAX = 100;
const cache = new Map();

function touch(identifier, promise) {
  if (cache.has(identifier)) cache.delete(identifier);
  // Self-evict on rejection so a transient network/permission blip doesn't
  // poison the entry forever. Without this, every subsequent read of the
  // same identifier returns the same rejected Promise until a full reload —
  // catastrophic once Quill blots render inline images on scroll.
  const guarded = promise.catch((err) => {
    cache.delete(identifier);
    throw err;
  });
  cache.set(identifier, guarded);
  if (cache.size > MAX) {
    const oldestKey = cache.keys().next().value;
    invalidateInlineImagePreview(oldestKey);
  }
}

/**
 * Returns the cached preview Promise, or fetches and caches on miss.
 * Returns null for a falsy identifier.
 * Every hit re-touches the entry so LRU eviction reflects actual access
 * order, not just insertion order.
 */
export function getInlineImagePreview(identifier) {
  if (!identifier) return Promise.resolve(null);
  if (cache.has(identifier)) {
    const existing = cache.get(identifier);
    cache.delete(identifier);
    cache.set(identifier, existing);
    return existing;
  }
  touch(identifier, AttachmentFetcher.fetchImageAttachment({ identifier }));
  return cache.get(identifier);
}

/**
 * Drops a single identifier from the cache and revokes any blob URL its
 * preview allocated. Safe to call on a miss.
 */
export function invalidateInlineImagePreview(identifier) {
  if (!identifier) return;
  const entry = cache.get(identifier);
  if (!entry) return;
  entry
    .then((res) => {
      if (res && typeof res.data === 'string' && res.data.startsWith('blob:')) {
        URL.revokeObjectURL(res.data);
      }
    })
    .catch(() => {});
  cache.delete(identifier);
}

/** Batch variant — invalidates each identifier in the list. */
export function invalidateInlineImagePreviewBatch(identifiers = []) {
  identifiers.forEach(invalidateInlineImagePreview);
}

// ---------------------------------------------------------------------------
// Session-local blob-URL cache for pre-save previews. When a user pastes/drops
// a file into a Quill editor, the handler mints a client-side blob URL via
// URL.createObjectURL(file) and stashes it here. Quill re-creates blots on
// setContents (any parent re-render), which loses the `preview` prop —
// consulting this cache lets the blot recover the blob URL without a network
// round-trip until the attachment is saved and the server-backed preview
// takes over via getInlineImagePreview().
// ---------------------------------------------------------------------------

const sessionPreviews = new Map(); // identifier → blob URL (session-local)

export function setSessionPreview(identifier, blobUrl) {
  if (!identifier || typeof blobUrl !== 'string') return;
  const existing = sessionPreviews.get(identifier);
  if (existing && existing !== blobUrl && existing.startsWith('blob:')) {
    URL.revokeObjectURL(existing);
  }
  sessionPreviews.set(identifier, blobUrl);
}

export function getSessionPreview(identifier) {
  return identifier ? (sessionPreviews.get(identifier) || null) : null;
}

export function clearSessionPreview(identifier) {
  if (!identifier) return;
  const url = sessionPreviews.get(identifier);
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
  sessionPreviews.delete(identifier);
}
