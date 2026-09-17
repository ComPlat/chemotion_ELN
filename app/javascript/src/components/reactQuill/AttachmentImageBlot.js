import Quill from 'quill';
import { getInlineImagePreview, getSessionPreview } from 'src/utilities/attachmentPreviewCache';

// Custom Quill blot that renders `insert: { image: { attachment_identifier, filename } }`
// as an <img> whose src is fetched (and memoised) via the shared preview cache.
//
// Inline embed (blots/embed) so images flow with surrounding text rather than
// forcing a block break. Text can wrap alongside; multiple images can share
// a line. Matches Quill's built-in image behaviour + Google Docs UX.
//
// The blot serialises back to the same op shape so save / reload preserves the
// attachment reference without ever embedding image bytes in the Quill delta.

const Embed = Quill.import('blots/embed');

const NOT_AVAILABLE = '/images/wild_card/not_available.svg';

export default class AttachmentImageBlot extends Embed {
  static create(value) {
    const node = super.create();
    const identifier = value && value.attachment_identifier;
    const filename = (value && value.filename) || '';
    node.setAttribute('data-attachment-identifier', identifier || '');
    node.setAttribute('data-filename', filename);
    // Empty alt so the browser's alt-text fallback doesn't leak the filename
    // as visible text next to a slow/broken image. The `title` below still
    // exposes the filename on hover for context.
    node.setAttribute('alt', '');
    if (filename) node.setAttribute('title', filename);
    // Alignment (ql-resize-style-*) is applied by quill-resize-module's Toolbar
    // via the `resize-inline` ClassAttributor, not through our blot value —
    // Quill stamps the class onto this <img> when the user picks an alignment
    // and preserves it across save/reload as long as `resize-inline` is in
    // the editor's `formats` allowlist.
    node.setAttribute('class', 'quill-inline-attachment-image');
    node.setAttribute('src', NOT_AVAILABLE);
    // Restore persisted display width if the delta carried one from a prior
    // resize. quill-resize-module writes width via IDL assignment on drag-end
    // (node_modules/quill-resize-module/src/modules/Resize.ts:88-94), which
    // for <img> reflects to the HTML `width` attribute — that's what we
    // serialize in value() and re-apply here.
    if (value && value.width !== undefined && value.width !== null && value.width !== '') {
      node.setAttribute('width', String(value.width));
    }

    // Resolution order:
    //  1. `value.preview` passed on first insert (freshest blob URL)
    //  2. Session-local blob cache (survives Quill setContents rebuilds
    //     across React parent re-renders — the common cause of blob loss)
    //  3. Server-backed preview via getInlineImagePreview(identifier)
    //  4. onerror fallback → identifier fetch (handles stale on-wire blobs
    //     from pre-fix saves)
    const fetchByIdentifier = () => {
      if (!identifier) return;
      getInlineImagePreview(identifier)
        .then((result) => {
          if (result && typeof result.data === 'string' && result.data.length > 0) {
            node.setAttribute('src', result.data);
          }
        })
        .catch(() => { node.setAttribute('src', NOT_AVAILABLE); });
    };
    node.addEventListener('error', fetchByIdentifier, { once: true });

    const freshPreview = value && typeof value.preview === 'string' && value.preview.startsWith('blob:')
      ? value.preview
      : '';
    const sessionPreview = identifier ? getSessionPreview(identifier) : null;

    if (freshPreview) {
      node.setAttribute('src', freshPreview);
    } else if (sessionPreview) {
      node.setAttribute('src', sessionPreview);
    } else {
      fetchByIdentifier();
    }
    return node;
  }

  static value(node) {
    // Intentionally omit `preview` from the serialised value — that blob URL
    // is meaningful only within the current browser session, and letting it
    // leak into the persisted delta would bloat the payload with a dead ref.
    // Alignment is NOT tracked here — the `resize-inline` ClassAttributor
    // that quill-resize-module registers stamps the alignment class onto
    // the node and Quill preserves it via its own format machinery.
    const width = node.getAttribute('width');
    return {
      attachment_identifier: node.getAttribute('data-attachment-identifier') || undefined,
      filename: node.getAttribute('data-filename') || undefined,
      width: width || undefined,
    };
  }
}

AttachmentImageBlot.blotName = 'attachment-image';
AttachmentImageBlot.tagName = 'img';

// Register at module load so any importer (editor, viewer) can render the
// blot without a separate registration step. Idempotent under { overwrite }.
Quill.register(AttachmentImageBlot, true);
