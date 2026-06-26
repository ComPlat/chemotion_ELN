/* global describe, it */

import expect from 'expect';
import { parseRangeInput } from 'src/apps/mydb/elements/details/samples/propertiesTab/TextRangeWithAddon';

describe('parseRangeInput', () => {
  it('treats an empty string as an empty range', () => {
    const result = parseRangeInput('');
    expect(result).toEqual({
      lower: '', upper: '', label: '', kind: 'empty',
    });
  });

  it('treats whitespace-only input as an empty range', () => {
    expect(parseRangeInput('   ').kind).toBe('empty');
  });

  it('parses a single positive number', () => {
    const result = parseRangeInput('65');
    expect(result.kind).toBe('single');
    expect(result.lower).toBe(65);
    expect(result.upper).toBe(65);
    expect(result.label).toBe('65');
  });

  it('parses a single negative number', () => {
    const result = parseRangeInput('-65');
    expect(result.kind).toBe('single');
    expect(result.lower).toBe(-65);
    expect(result.upper).toBe(-65);
  });

  it('parses a decimal value', () => {
    const result = parseRangeInput('65.5');
    expect(result.lower).toBe(65.5);
    expect(result.upper).toBe(65.5);
  });

  it('parses a dash-separated range "65-68"', () => {
    const result = parseRangeInput('65-68');
    expect(result.kind).toBe('range');
    expect(result.lower).toBe(65);
    expect(result.upper).toBe(68);
    expect(result.label).toBe('65 – 68');
  });

  it('parses a space-separated range "65 68"', () => {
    const result = parseRangeInput('65 68');
    expect(result.kind).toBe('range');
    expect(result.lower).toBe(65);
    expect(result.upper).toBe(68);
  });

  it('parses an en-dash range "65 – 68"', () => {
    const result = parseRangeInput('65 – 68');
    expect(result.kind).toBe('range');
    expect(result.lower).toBe(65);
    expect(result.upper).toBe(68);
  });

  it('parses a two-dot separated range "65..68"', () => {
    const result = parseRangeInput('65..68');
    expect(result.kind).toBe('range');
    expect(result.lower).toBe(65);
    expect(result.upper).toBe(68);
  });

  it('parses a range with decimals "1.5-2.5"', () => {
    const result = parseRangeInput('1.5-2.5');
    expect(result.kind).toBe('range');
    expect(result.lower).toBe(1.5);
    expect(result.upper).toBe(2.5);
  });

  it('parses a range of negative numbers separated by spaces', () => {
    const result = parseRangeInput('-65 -60');
    expect(result.kind).toBe('range');
    expect(result.lower).toBe(-65);
    expect(result.upper).toBe(-60);
  });

  it('parses ">300" as an open-upper range', () => {
    const result = parseRangeInput('>300');
    expect(result.kind).toBe('open-upper');
    expect(result.lower).toBe(300);
    expect(result.upper).toBe(Number.POSITIVE_INFINITY);
    expect(result.label).toBe('>300');
  });

  it('parses ">=300" as an open-upper range', () => {
    const result = parseRangeInput('>=300');
    expect(result.kind).toBe('open-upper');
    expect(result.lower).toBe(300);
    expect(result.label).toBe('>=300');
  });

  it('parses "≥300" as an open-upper range', () => {
    const result = parseRangeInput('≥300');
    expect(result.kind).toBe('open-upper');
    expect(result.lower).toBe(300);
  });

  it('parses "<200" as an open-lower range', () => {
    const result = parseRangeInput('<200');
    expect(result.kind).toBe('open-lower');
    expect(result.lower).toBe(Number.NEGATIVE_INFINITY);
    expect(result.upper).toBe(200);
    expect(result.label).toBe('<200');
  });

  it('parses "<=200" as an open-lower range', () => {
    const result = parseRangeInput('<=200');
    expect(result.kind).toBe('open-lower');
    expect(result.upper).toBe(200);
  });

  it('returns null for non-numeric input', () => {
    expect(parseRangeInput('abc')).toBeNull();
  });

  it('returns null when upper bound is below lower bound', () => {
    expect(parseRangeInput('100 50')).toBeNull();
    expect(parseRangeInput('100-50')).toBeNull();
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseRangeInput('  65  ').lower).toBe(65);
    expect(parseRangeInput('  65 - 68  ').lower).toBe(65);
  });

  it('parses decimal-comma input as numeric values', () => {
    const singleValueResult = parseRangeInput('65,5');
    expect(singleValueResult.kind).toBe('single');
    expect(singleValueResult.lower).toBe(65.5);
    expect(singleValueResult.upper).toBe(65.5);

    const rangeResult = parseRangeInput('1,5-2,5');
    expect(rangeResult.kind).toBe('range');
    expect(rangeResult.lower).toBe(1.5);
    expect(rangeResult.upper).toBe(2.5);
  });
});
