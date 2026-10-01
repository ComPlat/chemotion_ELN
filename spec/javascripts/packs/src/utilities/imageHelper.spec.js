import expect from 'expect';
import { describe, it } from 'mocha';
import { isPreviewableAttachment } from 'src/utilities/imageHelper';

describe('isPreviewableAttachment', () => {
  it('follows the server-provided previewable flag', () => {
    expect(isPreviewableAttachment({ content_type: 'image/png', previewable: true })).toBe(true);
    expect(isPreviewableAttachment({ content_type: 'application/pdf', previewable: true })).toBe(true);
  });

  it('rejects attachments the server marked as not previewable, even with a thumbnail', () => {
    expect(isPreviewableAttachment({ filename: 'report.docx', thumb: true, previewable: false })).toBe(false);
    expect(isPreviewableAttachment({ filename: 'report.pdf', previewable: false })).toBe(false);
  });

  it('lets attachments without the flag through (unsaved or raw-serialized)', () => {
    expect(isPreviewableAttachment({ filename: 'photo.png', is_new: true })).toBe(true);
    expect(isPreviewableAttachment({ id: 1, thumb: true })).toBe(true);
  });
});
