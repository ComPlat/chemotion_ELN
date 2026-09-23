import { createInlineImageAttachment, markInlineAttachmentDeleted } from 'src/utilities/attachmentUtils';
import { setSessionPreview } from 'src/utilities/attachmentPreviewCache';

// Shared handler for routing files pasted or dropped into a Quill editor
// through the polymorphic Attachment pipeline instead of embedding bytes in
// the delta.
//
// Wiring:
//   const handler = createQuillImageHandler({
//     getAttachments,      // () => currentAttachmentsArray
//     onAttachmentsChange, // (nextAttachmentsArray) => void
//   });
//   handler.install(quill);
//
// Behavior:
//   - Image files insert as `{ image: { attachment_identifier, filename, preview } }`
//     using the `attachment-image` blot (renders inline via preview cache).
//   - Non-image files insert as `{ file: { attachment_identifier, filename, filesize } }`
//     using the `attachment-file` blot (renders as a downloadable pill).
//   - Each dropped/pasted file becomes a new `Attachment` pushed into the
//     element's attachments array. Consumer decides when to persist.

const isImageFile = (file) => !!file && typeof file.type === 'string' && file.type.startsWith('image/');

const insertAttachmentAtCursor = (quill, attachment, file) => {
  const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
  const filename = attachment.filename || file.name;
  if (isImageFile(file)) {
    const preview = URL.createObjectURL(file);
    // Session cache lets the blot recover its src after setContents-driven
    // re-creates (Quill rebuilds embed nodes when a parent React re-render
    // fires componentDidUpdate).
    setSessionPreview(attachment.identifier, preview);
    quill.insertEmbed(range.index, 'attachment-image', {
      attachment_identifier: attachment.identifier,
      filename,
      preview,
    }, 'user');
  } else {
    quill.insertEmbed(range.index, 'attachment-file', {
      attachment_identifier: attachment.identifier,
      filename,
      filesize: file.size,
    }, 'user');
  }
  quill.setSelection(range.index + 1, 0, 'silent');
};

// Harvest every attachment_identifier referenced by an inline embed op in
// the current editor contents. Used by the orphan-cleanup reconciler to
// diff before/after each text-change and detect removed blots.
const collectInlineIdentifiers = (quill) => {
  const ops = (quill.getContents() || {}).ops || [];
  const identifiers = new Set();
  ops.forEach((op) => {
    const insert = op && op.insert;
    if (!insert || typeof insert !== 'object') return;
    const image = insert['attachment-image'];
    const file = insert['attachment-file'];
    const id = (image && image.attachment_identifier)
      || (file && file.attachment_identifier);
    if (id) identifiers.add(id);
  });
  return identifiers;
};

const filesFromClipboard = (dataTransfer) => {
  if (!dataTransfer) return [];
  if (dataTransfer.files && dataTransfer.files.length) return Array.from(dataTransfer.files);
  if (!dataTransfer.items) return [];
  return Array.from(dataTransfer.items)
    .filter(it => it.kind === 'file')
    .map(it => it.getAsFile())
    .filter(Boolean);
};

export function createQuillImageHandler({ getAttachments, onAttachmentsChange }) {
  if (typeof getAttachments !== 'function' || typeof onAttachmentsChange !== 'function') {
    throw new Error('createQuillImageHandler: getAttachments and onAttachmentsChange required');
  }

  const ingest = (quill, files) => {
    if (!files || files.length === 0) return false;
    const nextAttachments = [...(getAttachments() || [])];
    files.forEach((file) => {
      const attachment = createInlineImageAttachment(file);
      nextAttachments.push(attachment);
      insertAttachmentAtCursor(quill, attachment, file);
    });
    onAttachmentsChange(nextAttachments);
    return true;
  };

  return {
    install(quill) {
      // 1) Paste (clipboard)
      const editorRoot = quill.root;
      editorRoot.addEventListener('paste', (event) => {
        const files = filesFromClipboard(event.clipboardData);
        if (!files.length) return;
        event.preventDefault();
        event.stopPropagation();
        ingest(quill, files);
      });

      // 2) Drop
      editorRoot.addEventListener('drop', (event) => {
        const files = filesFromClipboard(event.dataTransfer);
        if (!files.length) return;
        event.preventDefault();
        event.stopPropagation();
        // Move the selection to the drop position so the file lands where the
        // cursor pointed, not at the previous selection.
        try {
          const doc = editorRoot.ownerDocument;
          let range = null;
          if (doc.caretRangeFromPoint) range = doc.caretRangeFromPoint(event.clientX, event.clientY);
          else if (doc.caretPositionFromPoint) {
            const pos = doc.caretPositionFromPoint(event.clientX, event.clientY);
            if (pos) { range = doc.createRange(); range.setStart(pos.offsetNode, pos.offset); }
          }
          if (range) {
            const sel = doc.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } catch (e) { /* best-effort cursor placement */ }
        ingest(quill, files);
      }, true);

      // 3) Guard against Quill's default image-format matcher trying to paste
      // dataURLs by intercepting the clipboard matcher for IMG elements.
      quill.clipboard.addMatcher('IMG', (node, delta) => {
        // If someone somehow got an <img> into the paste stream (e.g. pasting
        // HTML that includes a raw <img src="data:...">), drop it. Real image
        // paste already flowed through our `paste` handler above.
        return { ops: (delta.ops || []).filter(op => !(op.insert && op.insert.image)) };
      });

      // 4) Orphan-cleanup reconciler.
      // Snapshot the set of inline attachment identifiers currently in the
      // delta on install. After every user-driven text-change, rescan and
      // diff — any identifier that disappeared marks its Attachment as
      // deleted so the row doesn't persist as an orphan (surfacing in the
      // Attachments tab, wasting storage).
      let knownIdentifiers = collectInlineIdentifiers(quill);
      quill.on('text-change', (_delta, _oldDelta, source) => {
        // Programmatic setContents (e.g. React re-renders that reset the
        // editor value) shouldn't be interpreted as user removals — those
        // fire with source === 'silent' or 'api'. Only 'user' edits count.
        if (source !== 'user') {
          knownIdentifiers = collectInlineIdentifiers(quill);
          return;
        }
        const current = collectInlineIdentifiers(quill);
        const removed = [];
        knownIdentifiers.forEach((id) => { if (!current.has(id)) removed.push(id); });
        knownIdentifiers = current;
        if (removed.length === 0) return;

        let next = getAttachments() || [];
        removed.forEach((id) => { next = markInlineAttachmentDeleted(next, id); });
        onAttachmentsChange(next);
      });
    },
  };
}
