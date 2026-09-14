/* global describe, it */
import expect from 'expect';
import Attachment from 'src/models/Attachment';
import {
  addAttachmentsFromFiles,
  setAttachmentDeleted,
  replaceAttachment,
  createInlineImageAttachment,
  replaceInlineImageAttachment,
  markInlineAttachmentDeleted,
} from 'src/utilities/attachmentUtils';

function makeAttachment(overrides = {}) {
  return Object.assign(
    new Attachment({ id: Math.floor(Math.random() * 99999), filename: 'f.txt', is_deleted: false }),
    overrides
  );
}

describe('attachmentUtils', () => {
  describe('addAttachmentsFromFiles', () => {
    it('appends new Attachment instances for each file', () => {
      const existing = [makeAttachment({ id: 1 })];
      const file = new File([''], 'new.pdf', { type: 'application/pdf' });
      const result = addAttachmentsFromFiles(existing, [file]);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1);
      expect(result[1].filename).toBe('new.pdf');
    });

    it('handles null/undefined existing attachments', () => {
      const file = new File([''], 'a.txt');
      const result = addAttachmentsFromFiles(null, [file]);
      expect(result.length).toBe(1);
    });

    it('returns a new array reference', () => {
      const existing = [makeAttachment({ id: 1 })];
      const result = addAttachmentsFromFiles(existing, []);
      expect(result).not.toBe(existing);
    });
  });

  describe('setAttachmentDeleted', () => {
    it('marks the matching attachment is_deleted=true', () => {
      const a = makeAttachment({ id: 1, is_deleted: false });
      const result = setAttachmentDeleted([a], a, true);
      expect(result[0].is_deleted).toBe(true);
    });

    it('marks the matching attachment is_deleted=false (undo)', () => {
      const a = makeAttachment({ id: 1, is_deleted: true });
      const result = setAttachmentDeleted([a], a, false);
      expect(result[0].is_deleted).toBe(false);
    });

    it('preserves reference equality of the item (for later indexOf)', () => {
      const a = makeAttachment({ id: 1 });
      const result = setAttachmentDeleted([a], a, true);
      expect(result[0]).toBe(a);
    });

    it('returns a new array reference', () => {
      const a = makeAttachment({ id: 1 });
      const orig = [a];
      const result = setAttachmentDeleted(orig, a, true);
      expect(result).not.toBe(orig);
    });

    it('does nothing when attachment is not in the array', () => {
      const a = makeAttachment({ id: 1 });
      const b = makeAttachment({ id: 2 });
      const result = setAttachmentDeleted([a], b, true);
      expect(result[0].is_deleted).toBe(false);
    });
  });

  describe('replaceAttachment', () => {
    it('replaces the attachment matching by id', () => {
      const a = makeAttachment({ id: 5, filename: 'old.pdf' });
      const updated = Object.assign(makeAttachment({ id: 5 }), { filename: 'new.pdf' });
      const result = replaceAttachment([a], updated);
      expect(result[0].filename).toBe('new.pdf');
    });

    it('returns a new array', () => {
      const a = makeAttachment({ id: 5 });
      const updated = makeAttachment({ id: 5 });
      const orig = [a];
      expect(replaceAttachment(orig, updated)).not.toBe(orig);
    });

    it('leaves non-matching items unchanged', () => {
      const a = makeAttachment({ id: 1 });
      const b = makeAttachment({ id: 2, filename: 'keep.pdf' });
      const updated = makeAttachment({ id: 1 });
      const result = replaceAttachment([a, b], updated);
      expect(result[1]).toBe(b);
    });
  });

  describe('createInlineImageAttachment', () => {
    it('flags the attachment as is_image_field', () => {
      const file = new File([''], 'p.png', { type: 'image/png' });
      const att = createInlineImageAttachment(file);
      expect(att.is_image_field).toBe(true);
      expect(att.ancestor).toBeUndefined();
    });

    it('records ancestor identifier when provided', () => {
      const file = new File([''], 'p.png', { type: 'image/png' });
      const att = createInlineImageAttachment(file, 'anc-uuid');
      expect(att.ancestor).toBe('anc-uuid');
    });
  });

  describe('replaceInlineImageAttachment', () => {
    it('appends the new attachment', () => {
      const file = new File([''], 'p.png');
      const { attachments, newAttachment } = replaceInlineImageAttachment([], file);
      expect(attachments.length).toBe(1);
      expect(attachments[0]).toBe(newAttachment);
    });

    it('marks the ancestor as deleted', () => {
      const anc = makeAttachment({ identifier: 'anc-uuid' });
      const file = new File([''], 'p.png');
      const { attachments } = replaceInlineImageAttachment([anc], file, 'anc-uuid');
      const marked = attachments.find((a) => a.identifier === 'anc-uuid');
      expect(marked.is_deleted).toBe(true);
      expect(marked.is_image_field).toBe(true);
    });

    it('returns a new array reference', () => {
      const orig = [];
      const file = new File([''], 'p.png');
      const { attachments } = replaceInlineImageAttachment(orig, file);
      expect(attachments).not.toBe(orig);
    });

    it('handles a frozen ancestor without throwing (MobX safety)', () => {
      const anc = Object.freeze({ identifier: 'anc-uuid', is_deleted: false });
      const file = new File([''], 'p.png');
      let attachments;
      expect(() => {
        ({ attachments } = replaceInlineImageAttachment([anc], file, 'anc-uuid'));
      }).not.toThrow();
      const marked = attachments.find((a) => a.identifier === 'anc-uuid');
      expect(marked.is_deleted).toBe(true);
      expect(marked).not.toBe(anc);
    });

    it('handles a non-extensible ancestor without throwing (MobX preventExtensions)', () => {
      const anc = Object.preventExtensions({ identifier: 'anc-uuid', is_deleted: false });
      const file = new File([''], 'p.png');
      let attachments;
      expect(() => {
        ({ attachments } = replaceInlineImageAttachment([anc], file, 'anc-uuid'));
      }).not.toThrow();
      const marked = attachments.find((a) => a.identifier === 'anc-uuid');
      expect(marked.is_deleted).toBe(true);
    });
  });

  describe('markInlineAttachmentDeleted', () => {
    it('returns the array unchanged when identifier is falsy', () => {
      const arr = [makeAttachment({ identifier: 'x' })];
      expect(markInlineAttachmentDeleted(arr, null)).toBe(arr);
    });

    it('marks a single attachment when there is no ancestor chain', () => {
      const a = makeAttachment({ identifier: 'a', is_deleted: false });
      const result = markInlineAttachmentDeleted([a], 'a');
      expect(result[0].is_deleted).toBe(true);
      expect(result[0].is_image_field).toBe(true);
    });

    it('walks the ancestor chain iteratively (depth 3)', () => {
      const a = makeAttachment({ identifier: 'a', is_deleted: false });
      const b = Object.assign(makeAttachment({ identifier: 'b', is_deleted: false }), { ancestor: 'a' });
      const c = Object.assign(makeAttachment({ identifier: 'c', is_deleted: false }), { ancestor: 'b' });
      const result = markInlineAttachmentDeleted([a, b, c], 'c');
      expect(result.every((x) => x.is_deleted)).toBe(true);
    });

    it('does nothing for a non-existent identifier', () => {
      const a = makeAttachment({ identifier: 'a', is_deleted: false });
      const result = markInlineAttachmentDeleted([a], 'other');
      expect(result[0].is_deleted).toBe(false);
    });

    it('is stack-safe on a cyclic ancestor reference and marks both', () => {
      const a = Object.assign(makeAttachment({ identifier: 'a' }), { ancestor: 'b' });
      const b = Object.assign(makeAttachment({ identifier: 'b' }), { ancestor: 'a' });
      let result;
      expect(() => { result = markInlineAttachmentDeleted([a, b], 'a'); }).not.toThrow();
      expect(result.every((x) => x.is_deleted)).toBe(true);
    });

    it('handles frozen attachments without throwing', () => {
      const a = Object.freeze({ identifier: 'a', is_deleted: false });
      let result;
      expect(() => { result = markInlineAttachmentDeleted([a], 'a'); }).not.toThrow();
      expect(result[0].is_deleted).toBe(true);
      expect(result[0]).not.toBe(a);
    });
  });
});

