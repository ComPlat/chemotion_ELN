import Quill from 'quill';

// Custom Quill blot that renders `insert: { file: { attachment_identifier, filename, filesize } }`
// as a downloadable pill inside the editor. Non-image files can't render inline
// like an <img>, so we insert a compact chip with a paper-clip icon that opens
// the attachment on click.
//
// The pill serialises back to the same op shape so save / reload preserves the
// reference without embedding file bytes anywhere in the Quill delta.

const Inline = Quill.import('blots/inline');

const humanFileSize = (bytes) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) return '';
  const units = ['B', 'kB', 'MB', 'GB'];
  let val = bytes;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i += 1; }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

export default class AttachmentFileBlot extends Inline {
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
      node.setAttribute('href', `/api/v1/attachments/${encodeURIComponent(identifier)}`);
    }
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
    const parts = [
      '<i class="fa fa-paperclip me-1" aria-hidden="true"></i>',
      `<span class="quill-inline-attachment-file__name">${filename}</span>`,
    ];
    if (filesize) parts.push(`<span class="quill-inline-attachment-file__size ms-1">${humanFileSize(filesize)}</span>`);
    node.innerHTML = parts.join('');
    return node;
  }

  static formats(node) { return AttachmentFileBlot.value(node); }

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

Quill.register(AttachmentFileBlot, true);
