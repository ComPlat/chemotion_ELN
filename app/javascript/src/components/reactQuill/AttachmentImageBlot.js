import Quill from 'quill';
import { getInlineImagePreview, getSessionPreview } from 'src/utilities/attachmentPreviewCache';

// Custom Quill blot that renders `insert: { image: { attachment_identifier, filename } }`
// as an <img> whose src is fetched (and memoised) via the shared preview cache.
//
// The blot serialises back to the same op shape so save / reload preserves the
// attachment reference without ever embedding image bytes in the Quill delta.

const BlockEmbed = Quill.import('blots/block/embed');

const NOT_AVAILABLE = '/images/wild_card/not_available.svg';

export default class AttachmentImageBlot extends BlockEmbed {
  static create(value) {
    const node = super.create();
    const identifier = value && value.attachment_identifier;
    const filename = (value && value.filename) || '';
    node.setAttribute('data-attachment-identifier', identifier || '');
    node.setAttribute('data-filename', filename);
    node.setAttribute('alt', filename);
    node.setAttribute('class', 'quill-inline-attachment-image');
    node.setAttribute('src', NOT_AVAILABLE);

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
    // The in-DOM `data-preview` attribute keeps the preview alive for
    // client-side re-renders within the session.
    return {
      attachment_identifier: node.getAttribute('data-attachment-identifier') || undefined,
      filename: node.getAttribute('data-filename') || undefined,
    };
  }
}

AttachmentImageBlot.blotName = 'attachment-image';
AttachmentImageBlot.tagName = 'img';

// Register at module load so any importer (editor, viewer) can render the
// blot without a separate registration step. Idempotent under { overwrite }.
Quill.register(AttachmentImageBlot, true);
