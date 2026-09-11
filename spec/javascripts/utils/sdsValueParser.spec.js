/* eslint-disable import/no-unresolved,no-undef */
import expect from 'expect';
import { parseSdsNumber, parseSdsRange, parseSdsTemperature } from 'src/utilities/sdsValueParser';

// The values below are verbatim from an extraction of a p-Xylene sheet, comma
// decimal separators included.
describe('sdsValueParser', () => {
  describe('parseSdsNumber', () => {
    it('reads a comma decimal separator', () => {
      expect(parseSdsNumber('0,861 g/cm3 at 20 °C - lit.')).toBe(0.861);
    });

    it('reads a dot decimal separator', () => {
      expect(parseSdsNumber('0.58 mPa.s at 25 °C')).toBe(0.58);
    });

    it('takes the quantity, not the temperature it was measured at', () => {
      expect(parseSdsNumber('124,1 hPa at 2,6 °C')).toBe(124.1);
    });

    it('reads a quantity behind a comparison', () => {
      expect(parseSdsNumber('> 100 °C')).toBe(100);
    });

    it('keeps a negative sign', () => {
      expect(parseSdsNumber('-94,9 °C')).toBe(-94.9);
    });

    it('returns null for a value that states no quantity', () => {
      expect(parseSdsNumber('not applicable')).toBe(null);
      expect(parseSdsNumber(undefined)).toBe(null);
    });
  });

  describe('parseSdsRange', () => {
    it('reads both bounds of a range', () => {
      expect(parseSdsRange('12 - 13 °C - lit.')).toEqual({ lower: 12, upper: 13 });
    });

    it('leaves a single value open-ended rather than reading the annotation as a bound', () => {
      expect(parseSdsRange('138 °C - lit.')).toEqual({ lower: 138, upper: Number.POSITIVE_INFINITY });
    });

    it('does not read a trailing measurement temperature as an upper bound', () => {
      expect(parseSdsRange('0,861 g/cm3 at 20 °C - lit.'))
        .toEqual({ lower: 0.861, upper: Number.POSITIVE_INFINITY });
    });

    it('reads a range of negative temperatures', () => {
      expect(parseSdsRange('-10 - -5 °C')).toEqual({ lower: -10, upper: -5 });
    });

    it('returns null for a value that states no quantity', () => {
      expect(parseSdsRange('')).toBe(null);
    });
  });

  describe('parseSdsTemperature', () => {
    it('separates the value from the method the sheet names', () => {
      expect(parseSdsTemperature('27 °C - closed cup')).toEqual({ value: 27, unit: '°C' });
    });

    it('keeps the unit the sheet used', () => {
      expect(parseSdsTemperature('81 °F')).toEqual({ value: 81, unit: '°F' });
      expect(parseSdsTemperature('300 K')).toEqual({ value: 300, unit: 'K' });
    });

    it('returns null for a value that states no quantity', () => {
      expect(parseSdsTemperature('no data available')).toBe(null);
    });
  });
});
