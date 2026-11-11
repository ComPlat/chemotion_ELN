import expect from 'expect';
import { describe, it } from 'mocha';

import { normalizeNumberInput, handleNumberInputPaste } from 'src/utilities/MathUtils';

describe('normalizeNumberInput', () => {
  it('converts a decimal comma to a dot', () => {
    expect(normalizeNumberInput('12,5')).toBe('12.5');
  });

  it('rejects unexpected characters and scientific notation instead of removing them', () => {
    ['1a2 b3', '12.3abc', '1.013e5', '1.013E+5', '0x10', 'Infinity', '1 013.25'].forEach((value) => {
      expect(normalizeNumberInput(value)).toBe(null);
    });
  });

  it('accepts consistently grouped decimal pastes without dropping digits or precision', () => {
    [
      ['1,013.25', '1013.25'],
      ['1.013,25', '1013.25'],
      ['12,345,678.90', '12345678.90'],
      ['12.345.678,90', '12345678.90'],
      ['1,013.25000000000000001', '1013.25000000000000001'],
    ].forEach(([raw, expected]) => {
      expect(normalizeNumberInput(raw, { allowGrouping: true })).toBe(expected);
    });
  });

  it('rejects malformed grouping instead of truncating the reading', () => {
    ['1.2.3', '1,2,3', '1013,25.7', '12,34.56', '1.234.5'].forEach((value) => {
      expect(normalizeNumberInput(value)).toBe(null);
    });
  });

  it('keeps incomplete drafts editable', () => {
    expect(normalizeNumberInput('')).toBe('');
    expect(normalizeNumberInput('.')).toBe('.');
    expect(normalizeNumberInput('5.')).toBe('5.');
  });

  it('preserves ASCII and Unicode minus signs only when negatives are allowed', () => {
    expect(normalizeNumberInput('-4.5')).toBe(null);
    expect(normalizeNumberInput('−5')).toBe(null);
    expect(normalizeNumberInput('-4.5', { allowNegative: true })).toBe('-4.5');
    expect(normalizeNumberInput('−5', { allowNegative: true })).toBe('-5');
    expect(normalizeNumberInput(' −4,5 ', { allowNegative: true })).toBe('-4.5');
    expect(normalizeNumberInput('−1.013,25', { allowNegative: true, allowGrouping: true })).toBe('-1013.25');
    expect(normalizeNumberInput('-', { allowNegative: true })).toBe('-');
    expect(normalizeNumberInput('−.', { allowNegative: true })).toBe('-.');
  });

  it('rejects non-finite decimal readings', () => {
    expect(normalizeNumberInput('9'.repeat(400))).toBe(null);
  });

  it('refuses extra separators during typing instead of multiplying the reading', () => {
    ['0.250,', '21.500,', '0,250.', '21,500.', '1.013,25'].forEach((raw) => {
      expect(normalizeNumberInput(raw)).toBe(null);
    });
  });

  it('inserts a paste at the selected text and explicitly enables grouping', () => {
    let result;
    let prevented = false;
    handleNumberInputPaste({
      target: { value: '-42', selectionStart: 1, selectionEnd: 3 },
      clipboardData: { getData: () => '1.013,25' },
      preventDefault: () => { prevented = true; },
    }, (raw, options) => { result = normalizeNumberInput(raw, { ...options, allowNegative: true }); });
    expect(prevented).toBe(true);
    expect(result).toBe('-1013.25');
  });
});
