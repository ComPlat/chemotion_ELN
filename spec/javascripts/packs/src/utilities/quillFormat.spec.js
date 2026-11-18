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
});
