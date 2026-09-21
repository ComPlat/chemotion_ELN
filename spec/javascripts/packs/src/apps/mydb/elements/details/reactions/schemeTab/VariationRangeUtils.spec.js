import expect from 'expect';
import {
  findVariationRange, variationRangeText
} from 'src/apps/mydb/elements/details/reactions/schemeTab/VariationRangeUtils';

/*
The reaction-level counterpart of MaterialHandler#findMinMayUnit: a scheme field the variations do
not agree on is shown as their range and cannot be edited on the parent reaction.
*/
describe('VariationRangeUtils', () => {
  const variationsOf = (...values) => values.map((value) => ({ data: { value } }));
  const byValue = (data) => data.value;

  describe('findVariationRange', () => {
    it('is no range without variations', () => {
      expect(findVariationRange([], byValue, 5)).toEqual({ min: null, max: null, isRangeField: false });
      expect(findVariationRange(undefined, byValue, 5)).toEqual({ min: null, max: null, isRangeField: false });
    });

    it('spans the variations that disagree', () => {
      expect(findVariationRange(variationsOf(1, 3, 2), byValue, 1)).toEqual({ min: 1, max: 3, isRangeField: true });
    });

    it('is a range even when the variations agree with each other but not with the reaction', () => {
      expect(findVariationRange(variationsOf(3, 3), byValue, 5)).toEqual({ min: 3, max: 3, isRangeField: true });
    });

    it('is no range when every variation matches the reaction', () => {
      expect(findVariationRange(variationsOf(5, 5), byValue, 5).isRangeField).toBe(false);
    });

    // `temperature_display` holds "reflux" as readily as a number; free text takes no part.
    it('drops non-numeric values from the range', () => {
      expect(findVariationRange(variationsOf('reflux', 2, 4), byValue, 2))
        .toEqual({ min: 2, max: 4, isRangeField: true });
    });

    it('is no range when no variation holds a number', () => {
      expect(findVariationRange(variationsOf('reflux', null, ''), byValue, 5).isRangeField).toBe(false);
    });
  });

  describe('variationRangeText', () => {
    it('writes a range as min-max', () => {
      expect(variationRangeText({ min: 1, max: 3 })).toBe('1-3');
    });

    it('writes an agreeing range as the single value', () => {
      expect(variationRangeText({ min: 3, max: 3 })).toBe('3');
    });

    it('rounds to four decimals without trailing zeros', () => {
      expect(variationRangeText({ min: 0.123456, max: 2.5 })).toBe('0.1235-2.5');
    });
  });
});
