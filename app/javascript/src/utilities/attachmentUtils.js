import Attachment from 'src/models/Attachment';

/**
 * Returns a new attachments array with Attachment instances created from
 * the dropped files appended at the end.
 */
export function addAttachmentsFromFiles(attachments, files) {
  return [...(attachments || []), ...files.map((f) => Attachment.fromFile(f))];
}

/**
 * Returns a new array with the matching attachment's is_deleted flag set.
 * Mutates the attachment in place when it is extensible (alt/Flux elements)
 * so undo can rely on reference equality; falls back to a shallow copy when
 * the object is frozen by MobX-state-tree (CellLine, DeviceDescription, SBMM).
 */
export function setAttachmentDeleted(attachments, attachment, isDeleted) {
  return (attachments || []).map((a) => {
    if (a !== attachment) return a;
    if (Object.isExtensible(a) && !Object.isFrozen(a)) {
      a.is_deleted = isDeleted;
      return a;
    }
    return { ...a, is_deleted: isDeleted };
  });
}

/**
 * Returns a new array replacing the attachment whose id matches the given
 * attachment. All other items keep their original references.
 */
export function replaceAttachment(attachments, attachment) {
  return (attachments || []).map((a) => (a.id === attachment.id ? attachment : a));
}
