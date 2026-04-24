import expect from 'expect';
import { describe, it } from 'mocha';

import {
  formatPks,
  formatMpy,
  isNmrLayout,
} from 'src/apps/mydb/elements/details/spectraCompare/formatters/spectraFormatters';

describe('spectraFormatters', () => {
  describe('isNmrLayout', () => {
    it('returns true for the canonical NMR labels', () => {
      ['1H', '13C', '15N', '19F', '29Si', '31P'].forEach((l) => {
        expect(isNmrLayout(l)).toEqual(true);
      });
    });

    it('returns false for non-NMR layouts', () => {
      expect(isNmrLayout('UVVIS')).toEqual(false);
      expect(isNmrLayout('CYCLIC_VOLTAMMETRY')).toEqual(false);
      expect(isNmrLayout(null)).toEqual(false);
    });
  });

  describe('formatPks', () => {
    it('returns [] when entity is missing', () => {
      expect(formatPks({ layout: '1H' })).toEqual([]);
    });

    it('returns [] when layout is unknown', () => {
      expect(formatPks({ entity: {}, layout: 'UNKNOWN' })).toEqual([]);
    });
  });

  describe('formatMpy', () => {
    it('returns [] when entity is missing', () => {
      expect(formatMpy({ layout: '1H' })).toEqual([]);
    });

    it('returns [] when shift / integration / multiplicity are missing', () => {
      expect(formatMpy({ entity: {}, layout: '1H' })).toEqual([]);
    });
  });
});
