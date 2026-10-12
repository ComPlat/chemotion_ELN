/* eslint-disable import/no-unresolved,no-undef */
import expect from 'expect';
import { parseSdsQuantity } from 'src/utilities/sdsValueParser';

const point = (value, unit) => ({ low: value, high: value, unit });

// The p-Xylene values are verbatim from an AI extraction, comma decimal separators included.
describe('sdsValueParser', () => {
  describe('parseSdsQuantity', () => {
    it('reads a comma decimal separator', () => {
      expect(parseSdsQuantity('0,861 g/cm3 at 20 °C - lit.')).toEqual(point(0.861, 'g/cm3'));
    });

    it('reads a dot decimal separator', () => {
      expect(parseSdsQuantity('0.58 mPa.s at 25 °C')).toEqual(point(0.58, 'mPa.s'));
    });

    it('takes the quantity, not the condition it was measured at', () => {
      expect(parseSdsQuantity('124,1 hPa at 2,6 °C')).toEqual(point(124.1, 'hPa'));
      expect(parseSdsQuantity('64.7 °C at 1013 hPa')).toEqual(point(64.7, '°C'));
    });

    it('keeps a negative sign', () => {
      expect(parseSdsQuantity('-94,9 °C')).toEqual(point(-94.9, '°C'));
    });

    it('reads a typographic minus, a no-break space and a spaced degree sign', () => {
      expect(parseSdsQuantity('\u221298\u00A0°C')).toEqual(point(-98, '°C'));
      expect(parseSdsQuantity('64 ° C')).toEqual(point(64, '°C'));
    });

    it('reads both bounds of a range', () => {
      expect(parseSdsQuantity('12 - 13 °C - lit.')).toEqual({ low: 12, high: 13, unit: '°C' });
      expect(parseSdsQuantity('-10 - -5 °C')).toEqual({ low: -10, high: -5, unit: '°C' });
    });

    it('drops the source or method the sheet appends', () => {
      expect(parseSdsQuantity('138 °C - lit.')).toEqual(point(138, '°C'));
      expect(parseSdsQuantity('27 °C - closed cup')).toEqual(point(27, '°C'));
    });

    it('keeps the unit printed next to the number', () => {
      expect(parseSdsQuantity('81 °F')).toEqual(point(81, '°F'));
      expect(parseSdsQuantity('337 K')).toEqual(point(337, 'K'));
    });

    it('reads the value before a bracketed conversion, with its own unit', () => {
      expect(parseSdsQuantity('11 °C (52 °F)')).toEqual(point(11, '°C'));
      expect(parseSdsQuantity('148 °F (64 °C)')).toEqual(point(148, '°F'));
    });

    it('keeps a unit the sample cannot take, so the caller can refuse it', () => {
      expect(parseSdsQuantity('790 kg/m³ at 20 °C')).toEqual(point(790, 'kg/m³'));
    });

    it('refuses a value that does not open with its number', () => {
      expect(parseSdsQuantity('at 20 °C: 0.79 g/cm³')).toBe(null);
      expect(parseSdsQuantity('Relative density 2.7 (air = 1)')).toBe(null);
      expect(parseSdsQuantity('> 100 °C')).toBe(null);
    });

    it('refuses a bracket that is a reference rather than a measuring condition', () => {
      expect(parseSdsQuantity('2.7 (air = 1)')).toBe(null);
    });

    it('reads the Celsius value of a Celsius / Fahrenheit pair, like the built-in reader', () => {
      expect(parseSdsQuantity('64 °C / 147 °F')).toEqual(point(64, '°C'));
    });

    it('refuses any other pair of values', () => {
      expect(parseSdsQuantity('-144 °F / -98 °C')).toBe(null);
    });

    it('returns null for a value that states no quantity', () => {
      expect(parseSdsQuantity('not applicable')).toBe(null);
      expect(parseSdsQuantity('')).toBe(null);
      expect(parseSdsQuantity(undefined)).toBe(null);
    });
  });
});
