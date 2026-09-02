import expect from 'expect';
import { describe, it } from 'mocha';
import { isPreviewableAttachment } from 'src/utilities/imageHelper';

describe('isPreviewableAttachment', () => {
  it('accepts images and PDFs by content type', () => {
    expect(isPreviewableAttachment({ content_type: 'image/png' })).toBe(true);
    expect(isPreviewableAttachment({ content_type: 'image/tiff' })).toBe(true);
    expect(isPreviewableAttachment({ content_type: 'application/pdf' })).toBe(true);
  });

  it('rejects thumbnailed files that GET image/:id cannot serve', () => {
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4',
      'model/stl',
    ].forEach((contentType) => {
      expect(isPreviewableAttachment({ content_type: contentType, thumb: true })).toBe(false);
    });
  });

  it('does not trust the filename extension over the stored content type', () => {
    expect(isPreviewableAttachment({ filename: 'report.pdf', content_type: 'application/zip' })).toBe(false);
    expect(isPreviewableAttachment({ filename: 'spectrum.zip' })).toBe(false);
  });
});
