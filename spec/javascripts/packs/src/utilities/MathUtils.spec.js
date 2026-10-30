import expect from 'expect';
import { describe, it } from 'mocha';

import { normalizeNumberInput } from 'src/utilities/MathUtils';

describe('normalizeNumberInput', () => {
  it('converts a decimal comma to a dot', () => {
    expect(normalizeNumberInput('12,5')).toBe('12.5');
  });

  it('drops non-numeric characters', () => {
    expect(normalizeNumberInput('1a2 b3')).toBe('123');
  });

  it('stops at a second decimal separator', () => {
    expect(normalizeNumberInput('1.2.3')).toBe('1.2');
    expect(normalizeNumberInput('1,2,3')).toBe('1.2');
  });

  it('keeps incomplete drafts editable', () => {
    expect(normalizeNumberInput('')).toBe('');
    expect(normalizeNumberInput('.')).toBe('.');
    expect(normalizeNumberInput('5.')).toBe('5.');
  });

  it('drops a minus sign unless negatives are allowed', () => {
    expect(normalizeNumberInput('-4.5')).toBe('4.5');
    expect(normalizeNumberInput('-4.5', { allowNegative: true })).toBe('-4.5');
    expect(normalizeNumberInput('-', { allowNegative: true })).toBe('-');
  });
});
