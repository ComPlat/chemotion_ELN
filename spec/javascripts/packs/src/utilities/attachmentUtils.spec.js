/* global describe, it */
import expect from 'expect';
import Attachment from 'src/models/Attachment';
import {
  addAttachmentsFromFiles,
  setAttachmentDeleted,
  replaceAttachment,
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
});
