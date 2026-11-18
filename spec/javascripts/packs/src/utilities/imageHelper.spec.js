import expect from 'expect';
import { describe, it } from 'mocha';
import {
  getAttachmentFromContainer, getContainerImageData, isPreviewableAttachment,
} from 'src/utilities/imageHelper';

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

describe('getAttachmentFromContainer', () => {
  const container = (attachments) => ({ children: [{ container_type: 'dataset', attachments }] });
  const png = {
    id: 1, filename: 'spectrum.png', thumb: true, previewable: true, updated_at: '01.01.2026, 10:00:00 +0000',
  };
  const pptx = {
    id: 2, filename: 'slides.pptx', thumb: true, previewable: false, updated_at: '02.01.2026, 10:00:00 +0000',
  };

  it('prefers a previewable file over a newer thumbnailed one that cannot be previewed', () => {
    expect(getAttachmentFromContainer(container([png, pptx]))).toBe(png);
  });

  it('falls back to a thumbnailed file that cannot be previewed when it is the only one', () => {
    expect(getAttachmentFromContainer(container([pptx]))).toBe(pptx);
  });

  it('still picks the latest previewable file, and a "combined" one first', () => {
    const newerPng = { ...png, id: 3, updated_at: '03.01.2026, 10:00:00 +0000' };
    const combined = { ...png, id: 4, filename: 'combined.png' };
    expect(getAttachmentFromContainer(container([png, newerPng, pptx]))).toBe(newerPng);
    expect(getAttachmentFromContainer(container([newerPng, combined]))).toBe(combined);
  });

  it('defaults to the latest updated file regardless of array order', () => {
    const newerPng = { ...png, id: 3, updated_at: '03.01.2026, 10:00:00 +0000' };
    expect(getAttachmentFromContainer(container([png, newerPng]))).toBe(newerPng);
    expect(getAttachmentFromContainer(container([newerPng, png]))).toBe(newerPng);
  });

  it('skips attachments marked for deletion', () => {
    const deletedNewer = {
      ...png, id: 3, updated_at: '03.01.2026, 10:00:00 +0000', is_deleted: true,
    };
    expect(getAttachmentFromContainer(container([png, deletedNewer]))).toBe(png);
    expect(getAttachmentFromContainer(container([deletedNewer]))).toBe(null);
  });

  it('skips attachments of a removed dataset', () => {
    const newerPng = { ...png, id: 3, updated_at: '03.01.2026, 10:00:00 +0000' };
    const analysis = {
      children: [
        { container_type: 'dataset', is_deleted: true, attachments: [newerPng] },
        { container_type: 'dataset', attachments: [png] },
      ],
    };
    expect(getAttachmentFromContainer(analysis)).toBe(png);
  });
});

describe('getContainerImageData', () => {
  const png = { id: 1, filename: 'a.png', thumb: true };
  const jpg = { id: 2, filename: 'b.jpg', thumb: true };
  const analysis = (preferred) => ({
    children: [
      { container_type: 'dataset', is_deleted: true, attachments: [jpg] },
      { container_type: 'dataset', attachments: [png] },
    ],
    extended_metadata: { preferred_thumbnail: preferred },
  });

  it('offers no candidates from a removed dataset and drops a preference pointing there', () => {
    const data = getContainerImageData(analysis('2'));
    expect(data.candidateIds).toEqual([1]);
    expect(data.preferredId).toBe(null);
    expect(getContainerImageData(analysis('1')).preferredId).toBe(1);
  });
});
