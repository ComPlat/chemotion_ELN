import Attachment from 'src/models/Attachment';

/**
 * Returns a new attachments array with Attachment instances created from
 * the dropped files appended at the end.
 */
export function addAttachmentsFromFiles(attachments, files) {
  return [...(attachments || []), ...files.map((f) => Attachment.fromFile(f))];
}

/**
 * Returns a new array reference with the matching attachment's is_deleted
 * flag set to isDeleted. The attachment object itself is mutated in-place
 * so that reference equality (indexOf) continues to work for undo operations.
 */
export function setAttachmentDeleted(attachments, attachment, isDeleted) {
  const updated = [...(attachments || [])];
  const index = updated.indexOf(attachment);
  if (index >= 0) {
    updated[index].is_deleted = isDeleted;
  }
  return updated;
}

/**
 * Returns a new array replacing the attachment whose id matches the given
 * attachment. All other items keep their original references.
 */
export function replaceAttachment(attachments, attachment) {
  return (attachments || []).map((a) => (a.id === attachment.id ? attachment : a));
}
