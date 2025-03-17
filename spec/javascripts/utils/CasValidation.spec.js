/* eslint-disable no-undef */
import expect from 'expect';
import {
  addHyphensToCas,
  checkCasDigit,
  validateCas
} from '@src/utilities/CasValidation';

describe('CasValidation', () => {
  describe('addHyphensToCas', () => {
    it('should add hyphens to a CAS number in the correct format', () => {
      const cas = '456644';
      const expected = '456-64-4';
      const result = addHyphensToCas(cas)[0];
      expect(result).toEqual(expected);
    });
  });

  describe('checkCasDigit', () => {
    it('should return the correct check digit for a given CAS number', () => {
      const digits = '456644'.split('').splice(-1).reverse();
      const expected = 4;
      const remain = checkCasDigit(digits);
      expect(remain).toEqual(expected);
    });
  });

  describe('validateCas', () => {
    it('should return the correctly formatted CAS number if it is valid', () => {
      const cas = '637-87-6';
      const expected = '637-87-6';
      const result = validateCas(cas, true);
      expect(result).toEqual(expected);
    });

    it('should return false if the CAS number is invalid and boolean is set to true', () => {
      const cas = '123-45-6';
      const result = validateCas(cas, true);
      expect(result).toEqual(false);
    });

    it('should return "smile" if the entered CAS value is invalid (is SMILE) and boolean is set to false', () => {
      const cas = 'C=O';
      const result = validateCas(cas, false);
      expect(result).toEqual('smile');
    });
  });
});
