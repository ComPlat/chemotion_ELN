import Quill from 'quill';

// Inline atomic embed for a file attachment reference. Renders as a
// self-contained pill (paperclip icon + filename) with an optional download
// link. Uses Quill's Embed blot type so the pill is treated as a single
// character in the editor — cursor moves around it, but its internals are
// managed by this blot, not by Quill's text-child machinery.
//
// Op shape:
//   { insert: { "attachment-file": { attachment_identifier, filename, filesize } } }

const Embed = Quill.import('blots/embed');

const humanFileSize = (bytes) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) return '';
  const units = ['B', 'kB', 'MB', 'GB'];
  let val = bytes;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i += 1; }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

export default class AttachmentFileBlot extends Embed {
  static create(value) {
    const node = super.create();
    const identifier = (value && value.attachment_identifier) || '';
    const filename = (value && value.filename) || 'attachment';
    const filesize = value && value.filesize;
    node.setAttribute('data-attachment-identifier', identifier);
    node.setAttribute('data-filename', filename);
    if (filesize) node.setAttribute('data-filesize', String(filesize));
    node.setAttribute('class', 'quill-inline-attachment-file');
    node.setAttribute('contenteditable', 'false');
    node.setAttribute('title', filesize ? `${filename} (${humanFileSize(filesize)})` : filename);
    if (identifier) {
      // Use the identifier-fallback route (id=-1). The server sends
      // Content-Disposition: attachment, so a plain same-window navigation
      // triggers a download without leaving the page. `download` hint tells
      // the browser to save with the correct filename. No target=_blank —
      // avoids the new-tab tabnabbing / open-in-new-tab security concern.
      node.setAttribute('href', `/api/v1/attachments/-1?identifier=${encodeURIComponent(identifier)}`);
      node.setAttribute('download', filename);
    }
    // Build children via DOM APIs — filename is user-controlled, so never
    // interpolate it into innerHTML.
    const icon = document.createElement('i');
    icon.className = 'fa fa-paperclip me-1';
    icon.setAttribute('aria-hidden', 'true');
    node.appendChild(icon);

    const nameEl = document.createElement('span');
    nameEl.className = 'quill-inline-attachment-file__name';
    nameEl.textContent = filename;
    node.appendChild(nameEl);

    if (filesize) {
      const sizeEl = document.createElement('span');
      sizeEl.className = 'quill-inline-attachment-file__size ms-1';
      sizeEl.textContent = humanFileSize(filesize);
      node.appendChild(sizeEl);
    }
    return node;
  }

  static value(node) {
    const filesize = node.getAttribute('data-filesize');
    return {
      attachment_identifier: node.getAttribute('data-attachment-identifier') || undefined,
      filename: node.getAttribute('data-filename') || undefined,
      filesize: filesize ? Number(filesize) : undefined,
    };
  }
}

AttachmentFileBlot.blotName = 'attachment-file';
AttachmentFileBlot.tagName = 'a';
// Intentionally no static `className` — leaving it unset prevents Quill's HTML
// parser from auto-attaching this blot to any pasted `<a class="quill-inline-
// attachment-file" ...>`. Our own inserts go through `insertEmbed` and initial
// renders go through Delta→create(value), neither of which needs class-based
// DOM parsing. If intra-doc copy/paste of a pill ever needs to survive an
// HTML round-trip, add a scoped `quill.clipboard.addMatcher` that validates
// the identifier shape instead of re-enabling blanket parser attachment.

Quill.register(AttachmentFileBlot, true);
