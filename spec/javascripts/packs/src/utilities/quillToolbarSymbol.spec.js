// eslint-disable-next-line import/no-unresolved
import { SpectraOps } from 'src/utilities/quillToolbarSymbol';
import expect from 'expect';

describe('quillToolbarSymbol.SpectraOps', () => {
  // ViewSpectra#formatPks and NMRiumDisplayer spread head(...) and tail() into the peak ops.
  Object.entries(SpectraOps).forEach(([layout, ops]) => {
    it(`${layout}: head and tail return op arrays`, () => {
      expect(typeof ops.head).toBe('function');
      expect(typeof ops.tail).toBe('function');
      expect(Array.isArray(ops.head('400 MHz, ', ''))).toBe(true);
      expect(Array.isArray(ops.tail())).toBe(true);
    });
  });

  it('PLAIN adds no prefix and closes the peaks like the other layouts', () => {
    // writeCommon appends to the existing ops, so the tail keeps repeated writes apart.
    expect([
      ...SpectraOps.PLAIN.head('400 MHz, ', ''),
      { insert: 'peaks' },
      ...SpectraOps.PLAIN.tail(),
    ]).toEqual([{ insert: 'peaks' }, { insert: '. ' }]);
  });
});
