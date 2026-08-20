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

    it('formats peaks when the selected spectrum provides a plain shift object', () => {
      const result = formatPks({
        entity: {
          layout: '1H',
          features: [{ observeFrequency: [400], maxY: 1, minY: 0 }],
        },
        peaks: [{ x: 1.23, y: 1 }],
        shift: { ref: { label: false, name: '', value: 0 }, peak: { x: 0 } },
        layout: '1H',
        isAscend: true,
        decimal: 2,
        isIntensity: false,
        integration: { stack: [] },
        curveSt: { curveIdx: 1 },
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((op) => op.insert === '1.23')).toEqual(true);
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
