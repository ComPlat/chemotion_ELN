import expect from 'expect';
import { describe, it } from 'mocha';

import {
  fixDigit, validDigit, correctPrefix,
} from '../../../app/assets/javascripts/components/utils/MathUtils';

describe('fixDigit', () => {
  it('return number with correct precisons', () => {
    const num = 123.4567890;
    const result = fixDigit(num, 3).toString();
    const expected = '123.457';
    expect(result).toEqual(expected);
  });
});

describe('validDigit', () => {
  it('return number0 with correct precisons', () => {
    const num = 12345.67890;
    const result = validDigit(num, 3).toString();
    const expected = '12346';
    expect(result).toEqual(expected);
  });

  it('return number1 with correct precisons', () => {
    const num = 1234.567890;
    const result = validDigit(num, 3).toString();
    const expected = '1235';
    expect(result).toEqual(expected);
  });

  it('return number2 with correct precisons', () => {
    const num = 123.4567890;
    const result = validDigit(num, 3).toString();
    const expected = '123';
    expect(result).toEqual(expected);
  });

  it('return number3 with correct precisons', () => {
    const num = 12.34567890;
    const result = validDigit(num, 3).toString();
    const expected = '12.3';
    expect(result).toEqual(expected);
  });

  it('return number4 with correct precisons', () => {
    const num = 1.234567890;
    const result = validDigit(num, 3).toString();
    const expected = '1.23';
    expect(result).toEqual(expected);
  });

  it('return number5 with correct precisons', () => {
    const num = 0.1234567890;
    const result = validDigit(num, 3).toString();
    const expected = '0.123';
    expect(result).toEqual(expected);
  });

  it('return number6 with correct precisons', () => {
    const num = 0.01234567890;
    const result = validDigit(num, 3).toString();
    const expected = '0.0123';
    expect(result).toEqual(expected);
  });

  it('return number7 with correct precisons', () => {
    const num = 0.001234567890;
    const result = validDigit(num, 3).toString();
    const expected = '0.00123';
    expect(result).toEqual(expected);
  });

  it('return number8 with correct precisons', () => {
    const num = 0.0001234567890;
    const result = validDigit(num, 3).toString();
    const expected = '0.000123';
    expect(result).toEqual(expected);
  });

  it('return number9 with correct precisons', () => {
    const num = 0.00001234567890;
    const result = validDigit(num, 3).toString();
    const expected = '0.0000123';
    expect(result).toEqual(expected);
  });

  it('return number10 with correct precisons', () => {
    const num = 0.0;
    const result = validDigit(num, 3).toString();
    const expected = '0.00';
    expect(result).toEqual(expected);
  });

  it('return number11 with correct precisons', () => {
    const num = 1.0;
    const result = validDigit(num, 3).toString();
    const expected = '1.00';
    expect(result).toEqual(expected);
  });

  it('return number12 with correct precisons', () => {
    const num = 1.00000000;
    const result = validDigit(num, 3).toString();
    const expected = '1.00';
    expect(result).toEqual(expected);
  });

  it('return number13 with correct precisons', () => {
    const num = 1.00012345678;
    const result = validDigit(num, 3).toString();
    const expected = '1.00';
    expect(result).toEqual(expected);
  });

  it('return number14 with correct precisons', () => {
    const num = 12.00012345678;
    const result = validDigit(num, 3).toString();
    const expected = '12.0';
    expect(result).toEqual(expected);
  });

  it('return number15 with correct precisons', () => {
    const num = 0;
    const result = validDigit(num, 0).toString();
    const expected = '0';
    expect(result).toEqual(expected);
  });

  it('return number16 with correct precisons', () => {
    const num = 0.10000000000;
    const result = validDigit(num, 3).toString();
    const expected = '0.100';
    expect(result).toEqual(expected);
  });

  it('return number17 with correct precisons', () => {
    const num = 0.0000000058688;
    const result = validDigit(num, 3).toString();
    const expected = '0.00000000587';
    expect(result).toEqual(expected);
  });

  it('return number18 with correct precisons', () => {
    const num = 1234567890.1234567890;
    const result = validDigit(num, 3).toString();
    const expected = '1234567890';
    expect(result).toEqual(expected);
  });
});

describe('correctPrefix', () => {
  it('return a correct prefix for 1.1', () => {
    const num = 1.1;
    const result = correctPrefix(num, 3).toString();
    const expected = '1.10 ';
    expect(result).toEqual(expected);
  });

  it('return a correct prefix for 0.0111', () => {
    const num = 0.0111;
    const result = correctPrefix(num, 3).toString();
    const expected = '11.1 m';
    expect(result).toEqual(expected);
  });

  it('return a correct prefix for 0.0000111', () => {
    const num = 0.0000111;
    const result = correctPrefix(num, 3).toString();
    const expected = `${11.1} \u03BC`;
    expect(result).toEqual(expected);
  });
});
