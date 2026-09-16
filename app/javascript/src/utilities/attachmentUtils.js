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

// ---------------------------------------------------------------------------
// Inline-image attachments — used by any editor that lets users embed an image
// directly in a rich-text/body-block field (currently ResearchPlan body-block
// image field; Phase 2 extends to Quill descriptions across all element types).
//
// Conventions (frontend-only — no DB column):
//   - `is_image_field: true` marks the attachment as belonging to an inline
//     editor rather than the general Attachments tab drop zone.
//   - `ancestor` (identifier of the previous attachment in the same slot)
//     lets a replace preserve lineage so the old file is marked deleted.
// ---------------------------------------------------------------------------

/**
 * Factory. Returns a new Attachment instance flagged as an inline image.
 * Optional `ancestorIdentifier` records the previous attachment in the same
 * slot so the caller can mark the ancestor chain as deleted on save.
 */
export function createInlineImageAttachment(file, ancestorIdentifier = null) {
  const att = Attachment.fromFile(file);
  att.is_image_field = true;
  if (ancestorIdentifier) att.ancestor = ancestorIdentifier;
  return att;
}

/**
 * Appends a new inline-image attachment to `attachments` and — if replacing
 * an existing one — marks the ancestor as deleted.
 *
 * Returns `{ attachments, newAttachment }`. The returned array is always a new
 * reference. Extensible items are mutated in place (preserves reference
 * equality for undo lookups); frozen / non-extensible items are shallow-cloned
 * so callers can safely feed MobX-state-tree instances (CellLine,
 * DeviceDescription, SBMM) without crashing.
 */
export function replaceInlineImageAttachment(attachments, file, ancestorIdentifier = null) {
  const newAttachment = createInlineImageAttachment(file, ancestorIdentifier);
  const next = [...(attachments || []), newAttachment];
  if (ancestorIdentifier) {
    const idx = next.findIndex((a) => a.identifier === ancestorIdentifier);
    if (idx >= 0) {
      const target = next[idx];
      if (Object.isExtensible(target) && !Object.isFrozen(target)) {
        target.is_deleted = true;
        target.is_image_field = true;
      } else {
        next[idx] = { ...target, is_deleted: true, is_image_field: true };
      }
    }
  }
  return { attachments: next, newAttachment };
}

/**
 * Releases a transient blob: URL owned by the previous field value. No-op if
 * the value is missing, not a string, or not a blob URL (server-backed
 * previews own their own lifecycle via `attachmentPreviewCache`).
 * Shared so every inline-image consumer revokes the same way — otherwise
 * each caller re-implements it and per-consumer drift creeps back in.
 */
export function revokeTransientBlob(oldFieldValue) {
  const pn = oldFieldValue && oldFieldValue.public_name;
  if (typeof pn === 'string' && pn.startsWith('blob:')) URL.revokeObjectURL(pn);
}

/**
 * Marks the attachment with `identifier` and every ancestor in its lineage as
 * deleted. Iterative (not recursive) so a long replace chain stays stack-safe.
 * Extensible items are mutated in place; frozen items are shallow-cloned.
 * Returns a new array reference.
 */
// Walks an element's `body` (Research-Plan-shaped array of fields) and
// collects every attachment identifier referenced by a richtext field's
// inline blot ops. Returns a Set for O(1) lookup. Empty Set when body is
// missing or contains no richtext fields.
//
// Reused by the Attachments tab to badge inline-referenced rows so users
// can tell a file is used inside the Rich Text field vs. plain tab upload.
export function collectInlineAttachmentIdentifiers(body) {
  const ids = new Set();
  if (!Array.isArray(body)) return ids;
  body.forEach((field) => {
    if (!field || field.type !== 'richtext') return;
    const ops = field.value && field.value.ops;
    if (!Array.isArray(ops)) return;
    ops.forEach((op) => {
      const insert = op && op.insert;
      if (!insert || typeof insert !== 'object') return;
      const image = insert['attachment-image'];
      const file = insert['attachment-file'];
      const id = (image && image.attachment_identifier)
        || (file && file.attachment_identifier);
      if (id) ids.add(id);
    });
  });
  return ids;
}

// Returns a new `body` array with every inline blot op referencing a
// deleted-identifier stripped from richtext fields. Non-richtext fields
// pass through unchanged. Used on the save path so that after the user
// deletes an inline attachment from the Attachments tab and saves, the
// persisted body no longer references the (now-deleted) attachment —
// preventing broken-image icons on reload.
//
// Non-mutating: returns a new outer array, new richtext field objects
// where a strip actually happened, and a new ops array in those cases.
// Fields with no matching ops are returned by reference.
export function stripDeletedInlineBlotsFromBody(body, deletedIdentifiers) {
  if (!Array.isArray(body)) return body;
  const deleted = deletedIdentifiers instanceof Set
    ? deletedIdentifiers
    : new Set(deletedIdentifiers || []);
  if (deleted.size === 0) return body;

  return body.map((field) => {
    if (!field || field.type !== 'richtext') return field;
    const ops = field.value && field.value.ops;
    if (!Array.isArray(ops)) return field;

    const nextOps = ops.filter((op) => {
      const insert = op && op.insert;
      if (!insert || typeof insert !== 'object') return true;
      const id = (insert['attachment-image'] && insert['attachment-image'].attachment_identifier)
        || (insert['attachment-file'] && insert['attachment-file'].attachment_identifier);
      return !(id && deleted.has(id));
    });

    if (nextOps.length === ops.length) return field;
    return { ...field, value: { ...field.value, ops: nextOps } };
  });
}

export function markInlineAttachmentDeleted(attachments, identifier) {
  if (!identifier) return attachments || [];
  const source = attachments || [];
  const byId = new Map(source.map((a) => [a.identifier, a]));
  const toMark = new Set();
  let cur = identifier;
  while (cur && byId.has(cur) && !toMark.has(cur)) {
    toMark.add(cur);
    cur = byId.get(cur).ancestor || null;
  }
  return source.map((a) => {
    if (!toMark.has(a.identifier)) return a;
    if (Object.isExtensible(a) && !Object.isFrozen(a)) {
      a.is_deleted = true;
      a.is_image_field = true;
      return a;
    }
    return { ...a, is_deleted: true, is_image_field: true };
  });
}
