// eslint-disable-next-line import/no-unresolved
import { stripImages } from 'src/utilities/quillFormat';
import expect from 'expect';

describe('quillFormat.stripImages', () => {
  it('drops object-form image inserts from a delta object', () => {
    const input = {
      ops: [
        { insert: 'hello ' },
        { insert: { image: 'data:image/png;base64,AAA' } },
        { insert: 'world' },
      ],
    };
    expect(stripImages(input)).toEqual({
      ops: [
        { insert: 'hello ' },
        { insert: 'world' },
      ],
    });
  });

  it('drops object-form image inserts from a bare ops array', () => {
    const input = [
      { insert: { image: 'x' } },
      { insert: 'kept' },
    ];
    expect(stripImages(input)).toEqual([{ insert: 'kept' }]);
  });

  it('preserves non-image embeds and attributed text', () => {
    const input = {
      ops: [
        { insert: 'bold', attributes: { bold: true } },
        { insert: { video: 'x' } },
        { insert: { image: 'x' } },
      ],
    };
    expect(stripImages(input)).toEqual({
      ops: [
        { insert: 'bold', attributes: { bold: true } },
        { insert: { video: 'x' } },
      ],
    });
  });

  it('returns empty/null inputs unchanged', () => {
    expect(stripImages(null)).toBe(null);
    expect(stripImages(undefined)).toBe(undefined);
    expect(stripImages({})).toEqual({});
  });

  // The blot conversion (BlockEmbed→Embed for image, Inline→Embed for file)
  // moved the delta key: `insert.image`/`insert.file` → `insert['attachment-image']`
  // / `insert['attachment-file']`. isImageOp / isFileOp / stripImages must
  // recognise both, and attachment-backed ops (identifier present) must be
  // kept so the export pipeline can render / strip as appropriate.
  it('keeps current-shape attachment-backed image and file ops', () => {
    const input = {
      ops: [
        { insert: 'kept ' },
        { insert: { 'attachment-image': { attachment_identifier: 'abc', filename: 'foo.png' } } },
        { insert: ' and ' },
        { insert: { 'attachment-file': { attachment_identifier: 'def', filename: 'bar.pdf' } } },
      ],
    };
    expect(stripImages(input)).toEqual(input);
  });

  it('drops current-shape image/file ops that lack an attachment_identifier', () => {
    const input = {
      ops: [
        { insert: 'kept' },
        { insert: { 'attachment-image': { filename: 'orphan.png' } } },
        { insert: { 'attachment-file': { filename: 'orphan.pdf' } } },
      ],
    };
    expect(stripImages(input)).toEqual({ ops: [{ insert: 'kept' }] });
  });

  it('keeps legacy image ops that carry an attachment_identifier', () => {
    const input = {
      ops: [
        { insert: 'kept ' },
        { insert: { image: { attachment_identifier: 'xyz', filename: 'legacy.png' } } },
      ],
    };
    expect(stripImages(input)).toEqual(input);
  });
});
