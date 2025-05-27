import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import expect from 'expect';
import sinon from 'sinon';

import {
  validateDate,
  validateStatus,
  validateValueWithUnit,
  validatePictograms,
  validateHStatements,
  validatePStatements,
  validateSafetyPhrases,
  validateChemicalField,
  validateChemicalData,
  loadHazardPhrases,
  loadPrecautionaryPhrases,
  defaultChemicalSchemaValidation,
  testUtils
} from 'src/utilities/chemicalDataValidations';

describe('Chemical Data Validations', () => {
  let fetchStub;
  let mockHazardPhrases;
  let mockPrecautionaryPhrases;

  beforeEach(() => {
    // Reset caches before each test
    testUtils.setHazardPhrasesCache();
    testUtils.setPrecautionaryPhrasesCache();

    // Mock hazard phrases and precautionary phrases
    mockHazardPhrases = {
      H200: 'Unstable explosive',
      H201: 'Explosive; mass explosion hazard',
      H300: 'Fatal if swallowed'
    };

    mockPrecautionaryPhrases = {
      P201: 'Obtain special instructions before use',
      P202: 'Do not handle until all safety precautions have been read and understood',
      P301: 'IF SWALLOWED:'
    };

    // Create a fetch stub to mock API calls
    fetchStub = sinon.stub();
    global.fetch = fetchStub;

    // Mock hazard phrases fetch
    fetchStub.withArgs('/json/hazardPhrases.json')
      .resolves({
        json: () => Promise.resolve(mockHazardPhrases)
      });

    // Mock precautionary phrases fetch
    fetchStub.withArgs('/json/precautionaryPhrases.json')
      .resolves({
        json: () => Promise.resolve(mockPrecautionaryPhrases)
      });
  });

  afterEach(() => {
    // Clean up all stubs
    sinon.restore();
    delete global.fetch;
  });

  describe('validateDate', () => {
    it('should validate valid date strings', () => {
      expect(validateDate('2023-01-01')).toEqual({ valid: true, message: '' });
      expect(validateDate('2023/01/01')).toEqual({ valid: true, message: '' });
      expect(validateDate('January 1, 2023')).toEqual({ valid: true, message: '' });
    });

    it('should handle empty values', () => {
      expect(validateDate(null)).toEqual({ valid: true, message: '' });
      expect(validateDate(undefined)).toEqual({ valid: true, message: '' });
      expect(validateDate('')).toEqual({ valid: true, message: '' });
    });

    it('should invalidate incorrect date formats', () => {
      const result = validateDate('not-a-date');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not a valid date');
    });
  });

  describe('validateStatus', () => {
    it('should validate valid status values', () => {
      expect(validateStatus('To be ordered')).toEqual({ valid: true, message: '' });
      expect(validateStatus('Ordered')).toEqual({ valid: true, message: '' });
      expect(validateStatus('Out of Stock')).toEqual({ valid: true, message: '' });
      expect(validateStatus('Available')).toEqual({ valid: true, message: '' });
    });

    it('should handle empty values', () => {
      expect(validateStatus(null)).toEqual({ valid: true, message: '' });
      expect(validateStatus(undefined)).toEqual({ valid: true, message: '' });
      expect(validateStatus('')).toEqual({ valid: true, message: '' });
    });

    it('should invalidate unknown status values', () => {
      const result = validateStatus('Invalid Status');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not a valid status');
    });
  });

  describe('validateValueWithUnit', () => {
    describe('for object values with unit/value properties', () => {
      it('should validate amount with valid units', () => {
        const value = { value: '100', unit: 'g' };
        expect(validateValueWithUnit(value, 'amount')).toEqual({ valid: true, message: '' });

        const value2 = { value: '50', unit: 'mg' };
        expect(validateValueWithUnit(value2, 'amount')).toEqual({ valid: true, message: '' });

        const value3 = { value: '10', unit: 'μg' };
        expect(validateValueWithUnit(value3, 'amount')).toEqual({ valid: true, message: '' });
      });

      it('should validate volume with valid units', () => {
        const value = { value: '100', unit: 'ml' };
        expect(validateValueWithUnit(value, 'volume')).toEqual({ valid: true, message: '' });

        const value2 = { value: '2', unit: 'l' };
        expect(validateValueWithUnit(value2, 'volume')).toEqual({ valid: true, message: '' });

        const value3 = { value: '10', unit: 'μl' };
        expect(validateValueWithUnit(value3, 'volume')).toEqual({ valid: true, message: '' });
      });

      it('should validate storage_temperature with valid units', () => {
        const value = { value: '4', unit: '°C' };
        expect(validateValueWithUnit(value, 'storage_temperature')).toEqual({ valid: true, message: '' });
      });

      it('should invalidate objects missing value or unit', () => {
        const valueOnly = { value: '100' };
        const result1 = validateValueWithUnit(valueOnly, 'amount');
        expect(result1.valid).toBe(false);
        expect(result1.message).toContain('must have both \'value\' and \'unit\' properties');

        const unitOnly = { unit: 'g' };
        const result2 = validateValueWithUnit(unitOnly, 'amount');
        expect(result2.valid).toBe(false);
        expect(result2.message).toContain('must have both \'value\' and \'unit\' properties');
      });

      it('should invalidate objects with non-numeric values', () => {
        const invalidValue = { value: 'abc', unit: 'g' };
        const result = validateValueWithUnit(invalidValue, 'amount');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('not a valid number');
      });

      it('should invalidate objects with invalid units', () => {
        const invalidUnit = { value: '100', unit: 'kg' };
        const result = validateValueWithUnit(invalidUnit, 'amount');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('not valid for amount');
      });
    });

    describe('for string values', () => {
      it('should validate amount strings with valid units', () => {
        expect(validateValueWithUnit('100 g', 'amount')).toEqual({ valid: true, message: '' });
        expect(validateValueWithUnit('50 mg', 'amount')).toEqual({ valid: true, message: '' });
        expect(validateValueWithUnit('10 μg', 'amount')).toEqual({ valid: true, message: '' });
      });

      it('should validate volume strings with valid units', () => {
        expect(validateValueWithUnit('100 ml', 'volume')).toEqual({ valid: true, message: '' });
        expect(validateValueWithUnit('2 l', 'volume')).toEqual({ valid: true, message: '' });
        expect(validateValueWithUnit('10 μl', 'volume')).toEqual({ valid: true, message: '' });
      });

      it('should validate storage_temperature strings with valid units', () => {
        expect(validateValueWithUnit('4 °C', 'storage_temperature')).toEqual({ valid: true, message: '' });
      });

      it('should invalidate strings without numbers', () => {
        const result = validateValueWithUnit('no-number g', 'amount');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('does not contain both a number and a unit');
      });

      it('should invalidate strings with invalid units', () => {
        const result = validateValueWithUnit('100 kg', 'amount');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('not valid for amount');
      });
    });

    it('should invalidate values with unknown field types', () => {
      const result = validateValueWithUnit('100 g', 'unknown_field');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Unknown field type');
    });

    it('should invalidate incorrect value types', () => {
      const result = validateValueWithUnit(123, 'amount');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('must be an object with \'value\' and \'unit\' properties or a string');
    });
  });

  describe('validatePictograms', () => {
    it('should validate array of valid pictograms', () => {
      expect(validatePictograms(['GHS01', 'GHS02'])).toEqual({ valid: true, message: '' });
      expect(validatePictograms(['GHS03'])).toEqual({ valid: true, message: '' });
    });

    it('should validate string of valid pictograms', () => {
      expect(validatePictograms('GHS01')).toEqual({ valid: true, message: '' });
      expect(validatePictograms('GHS01,GHS02')).toEqual({ valid: true, message: '' });
      expect(validatePictograms('GHS03-GHS04')).toEqual({ valid: true, message: '' });
    });

    it('should handle empty values', () => {
      expect(validatePictograms(null)).toEqual({ valid: true, message: '' });
      expect(validatePictograms(undefined)).toEqual({ valid: true, message: '' });
      expect(validatePictograms('')).toEqual({ valid: true, message: '' });
    });

    it('should invalidate arrays with invalid pictograms', () => {
      const result = validatePictograms(['GHS01', 'INVALID']);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid pictogram(s): INVALID');
    });

    it('should invalidate strings with invalid pictograms', () => {
      const result = validatePictograms('GHS01,INVALID');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid pictogram(s): INVALID');
    });

    it('should invalidate non-string, non-array values', () => {
      const result = validatePictograms(123);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Pictograms must be an array or a string');
    });
  });

  describe('validateHStatements', () => {
    it('should validate object with valid H statements', async () => {
      const result = await validateHStatements({ H200: 'description', H201: 'description' });
      expect(result.valid).toBe(true);
    });

    it('should validate array of valid H statements', async () => {
      const result = await validateHStatements(['H200', 'H201']);
      expect(result.valid).toBe(true);
    });

    it('should validate string of valid H statements', async () => {
      const result = await validateHStatements('H200,H201');
      expect(result.valid).toBe(true);
    });

    it('should handle empty values', async () => {
      expect(await validateHStatements(null)).toEqual({ valid: true, message: '' });
      expect(await validateHStatements(undefined)).toEqual({ valid: true, message: '' });
      expect(await validateHStatements('')).toEqual({ valid: true, message: '' });
    });

    it('should invalidate objects with invalid H statements', async () => {
      const result = await validateHStatements({ H200: 'description', INVALID: 'description' });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid H statement(s): INVALID');
    });

    it('should invalidate arrays with invalid H statements', async () => {
      const result = await validateHStatements(['H200', 'INVALID']);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid H statement(s): INVALID');
    });

    it('should invalidate strings with invalid H statements', async () => {
      const result = await validateHStatements('H200,INVALID');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid H statement(s): INVALID');
    });

    it('should invalidate non-string, non-array, non-object values', async () => {
      const result = await validateHStatements(123);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('H statements must be an object, array, or a string');
    });
  });

  describe('validatePStatements', () => {
    it('should validate object with valid P statements', async () => {
      const result = await validatePStatements({ 'P201': 'description', 'P202': 'description' });
      expect(result.valid).toBe(true);
    });

    it('should validate array of valid P statements', async () => {
      const result = await validatePStatements(['P201', 'P202']);
      expect(result.valid).toBe(true);
    });

    it('should validate string of valid P statements', async () => {
      const result = await validatePStatements('P201,P202');
      expect(result.valid).toBe(true);
    });

    it('should handle empty values', async () => {
      expect(await validatePStatements(null)).toEqual({ valid: true, message: '' });
      expect(await validatePStatements(undefined)).toEqual({ valid: true, message: '' });
      expect(await validatePStatements('')).toEqual({ valid: true, message: '' });
    });

    it('should invalidate objects with invalid P statements', async () => {
      const result = await validatePStatements({ 'P201': 'description', 'INVALID': 'description' });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid P statement(s): INVALID');
    });

    it('should invalidate arrays with invalid P statements', async () => {
      const result = await validatePStatements(['P201', 'INVALID']);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid P statement(s): INVALID');
    });

    it('should invalidate strings with invalid P statements', async () => {
      const result = await validatePStatements('P201,INVALID');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid P statement(s): INVALID');
    });

    it('should invalidate non-string, non-array, non-object values', async () => {
      const result = await validatePStatements(123);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('P statements must be an object, array, or a string');
    });
  });

  describe('validateSafetyPhrases', () => {
    it('should validate object with valid safety phrases components', async () => {
      const safetyPhrases = {
        pictograms: ['GHS01', 'GHS02'],
        h_statements: ['H200', 'H201'],
        p_statements: ['P201', 'P202']
      };
      const result = await validateSafetyPhrases(safetyPhrases);
      expect(result.valid).toBe(true);
    });

    it('should handle empty values', async () => {
      expect(await validateSafetyPhrases(null)).toEqual({ valid: true, message: '' });
      expect(await validateSafetyPhrases(undefined)).toEqual({ valid: true, message: '' });
      expect(await validateSafetyPhrases('')).toEqual({ valid: true, message: '' });
    });

    it('should validate object with partial safety phrases', async () => {
      const safetyPhrases = {
        pictograms: ['GHS01', 'GHS02']
      };
      const result = await validateSafetyPhrases(safetyPhrases);
      expect(result.valid).toBe(true);
    });

    it('should invalidate non-object values', async () => {
      const result = await validateSafetyPhrases('not-an-object');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Safety phrases must be an object');
    });

    it('should invalidate objects with invalid components', async () => {
      const safetyPhrases = {
        pictograms: ['GHS01', 'INVALID'],
        h_statements: ['H200', 'H201'],
        p_statements: ['P201', 'P202']
      };
      const result = await validateSafetyPhrases(safetyPhrases);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid pictogram(s): INVALID');
    });

    it('should invalidate objects with multiple invalid components', async () => {
      const safetyPhrases = {
        pictograms: ['GHS01', 'INVALID'],
        h_statements: ['H200', 'INVALID_H'],
        p_statements: ['P201', 'INVALID_P']
      };
      const result = await validateSafetyPhrases(safetyPhrases);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid pictogram(s): INVALID');
      expect(result.message).toContain('Invalid H statement(s): INVALID_H');
      expect(result.message).toContain('Invalid P statement(s): INVALID_P');
    });
  });

  describe('validateChemicalField', () => {
    describe('date fields', () => {
      it('should validate ordered_date', async () => {
        const result = await validateChemicalField('2023-01-01', 'ordered_date');
        expect(result).toEqual({ valid: true, message: '' });
      });

      it('should validate required_date', async () => {
        const result = await validateChemicalField('2023-01-01', 'required_date');
        expect(result).toEqual({ valid: true, message: '' });
      });

      it('should validate expiration_date', async () => {
        const result = await validateChemicalField('2023-01-01', 'expiration_date');
        expect(result).toEqual({ valid: true, message: '' });
      });

      it('should handle invalid date format', async () => {
        const result = await validateChemicalField('invalid-date', 'ordered_date');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('not a valid date');
      });
    });

    describe('status field', () => {
      it('should validate valid status', async () => {
        const result = await validateChemicalField('To be ordered', 'status');
        expect(result).toEqual({ valid: true, message: '' });
      });

      it('should handle invalid status', async () => {
        const result = await validateChemicalField('Invalid Status', 'status');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('not a valid status');
      });
    });

    describe('value with unit fields', () => {
      it('should validate amount field', async () => {
        const result = await validateChemicalField({ value: '100', unit: 'g' }, 'amount');
        expect(result).toEqual({ valid: true, message: '' });
      });

      it('should validate volume field', async () => {
        const result = await validateChemicalField({ value: '100', unit: 'ml' }, 'volume');
        expect(result).toEqual({ valid: true, message: '' });
      });

      it('should validate storage_temperature field', async () => {
        const result = await validateChemicalField({ value: '4', unit: '°C' }, 'storage_temperature');
        expect(result).toEqual({ valid: true, message: '' });
      });
    });

    describe('price field', () => {
      it('should validate numeric price', async () => {
        const result = await validateChemicalField(100.50, 'price');
        expect(result).toEqual({ valid: true, message: '' });
      });

      it('should validate string price that can be converted to number', async () => {
        const result = await validateChemicalField('100.50', 'price');
        expect(result).toEqual({ valid: true, message: '' });
      });

      it('should invalidate non-numeric string price', async () => {
        const result = await validateChemicalField('not-a-number', 'price');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('cannot be converted to a number');
      });

      it('should invalidate non-number, non-string price', async () => {
        const result = await validateChemicalField({ value: 100 }, 'price');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('is not a number');
      });
    });

    describe('default case', () => {
      it('should return valid for unknown fields', async () => {
        const result = await validateChemicalField('any value', 'unknown_field');
        expect(result).toEqual({ valid: true, message: '' });
      });

      it('should handle empty values when not required', async () => {
        const result = await validateChemicalField(null, 'unknown_field');
        expect(result).toEqual({ valid: true, message: '' });
      });

      it('should handle empty values when required', async () => {
        const result = await validateChemicalField(null, 'unknown_field', { required: true });
        expect(result).toEqual({ valid: true, message: '' });
      });
    });
  });

  describe('validateChemicalData', () => {
    it('should validate flat chemical data structure', async () => {
      const chemicalData = {
        ordered_date: '2023-01-01',
        status: 'To be ordered',
        amount: { value: '100', unit: 'g' },
        price: 100.50
      };

      const result = await validateChemicalData(chemicalData);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate nested chemical_data structure', async () => {
      const chemicalData = {
        chemical_data: [{
          ordered_date: '2023-01-01',
          status: 'To be ordered',
          amount: { value: '100', unit: 'g' },
          price: 100.50
        }]
      };

      const result = await validateChemicalData(chemicalData);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should exclude special fields from validation', async () => {
      const chemicalData = {
        id: 1,
        valid: true,
        errors: [],
        delete: false,
        safetySheetPath: '/path/to/sheet',
        merckProductInfo: { some: 'info' },
        ordered_date: '2023-01-01'
      };

      const result = await validateChemicalData(chemicalData);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should collect validation errors', async () => {
      const chemicalData = {
        ordered_date: 'invalid-date',
        status: 'Invalid Status',
        amount: { value: 'abc', unit: 'g' },
        price: 'not-a-number'
      };

      const result = await validateChemicalData(chemicalData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('ordered_date');
      expect(result.errors[1]).toContain('status');
      expect(result.errors[2]).toContain('amount');
      expect(result.errors[3]).toContain('price');
    });

    it('should use provided field types for validation', async () => {
      const chemicalData = {
        custom_field: '2023-01-01'
      };

      const fieldTypes = {
        custom_field: { type: 'date' }
      };

      const result = await validateChemicalData(chemicalData, fieldTypes);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle null or undefined input', async () => {
      const result = await validateChemicalData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Invalid chemical data']);

      const result2 = await validateChemicalData(undefined);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toEqual(['Invalid chemical data']);
    });

    it('should handle empty object input', async () => {
      const result = await validateChemicalData({});
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle invalid chemical_data array', async () => {
      const chemicalData = {
        chemical_data: []
      };
      const result = await validateChemicalData(chemicalData);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Invalid date format']);
    });

    it('should handle non-array chemical_data', async () => {
      const chemicalData = {
        chemical_data: 'not-an-array'
      };
      const result = await validateChemicalData(chemicalData);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('defaultChemicalSchemaValidation', () => {
    it('should have expected fields', () => {
      expect(defaultChemicalSchemaValidation).toHaveProperty('status');
      expect(defaultChemicalSchemaValidation).toHaveProperty('vendor');
      expect(defaultChemicalSchemaValidation).toHaveProperty('price');
      expect(defaultChemicalSchemaValidation).toHaveProperty('amount');
      expect(defaultChemicalSchemaValidation).toHaveProperty('volume');
      expect(defaultChemicalSchemaValidation).toHaveProperty('storage_temperature');
      expect(defaultChemicalSchemaValidation).toHaveProperty('safetyPhrases');
    });
  });

  describe('Phrase Loading Functions', () => {
    let consoleErrorStub;

    beforeEach(() => {
      // Reset caches
      testUtils.setHazardPhrasesCache(null);
      testUtils.setPrecautionaryPhrasesCache(null);
      // Setup stubs
      consoleErrorStub = sinon.stub(console, 'error');
    });

    afterEach(() => {
      // Cleanup
      consoleErrorStub.restore();
      sinon.restore();
    });

    const formatErrorMessage = (cacheName) => {
      const phraseType = cacheName
        .replace('Cache', '')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase();
      return `Failed to load ${phraseType}:`;
    };

    const testPhraseLoader = (loaderFn, url, cacheName) => {
      describe(`${loaderFn.name}`, () => {
        const mockData = {
          [cacheName === 'hazardPhrasesCache' ? 'H200' : 'P201']: 'Test phrase'
        };

        it('should fetch and cache phrases when cache is empty', async () => {
          fetchStub.withArgs(url).resolves({
            json: () => Promise.resolve(mockData)
          });

          const result = await loaderFn();
          expect(result).toEqual(mockData);
          expect(fetchStub.calledOnceWith(url)).toBe(true);

          // Verify caching
          fetchStub.resetHistory();
          const cachedResult = await loaderFn();
          expect(cachedResult).toEqual(mockData);
          expect(fetchStub.called).toBe(false);
        });

        it('should return cached data when available', async () => {
          // Pre-populate cache
          testUtils[`set${cacheName.charAt(0).toUpperCase() + cacheName.slice(1)}`](mockData);
          const result = await loaderFn();
          expect(result).toEqual(mockData);
          expect(fetchStub.called).toBe(false);
        });

        it('should handle fetch errors gracefully', async () => {
          const error = new Error('Network error');
          fetchStub.withArgs(url).rejects(error);

          const result = await loaderFn();
          expect(result).toEqual({});
          expect(consoleErrorStub.calledOnce).toBe(true);
          expect(consoleErrorStub.firstCall.args[0]).toBe(formatErrorMessage(cacheName));
          expect(consoleErrorStub.firstCall.args[1]).toBe(error);
        });

        it('should handle invalid JSON response', async () => {
          fetchStub.withArgs(url).resolves({
            json: () => Promise.reject(new Error('Invalid JSON'))
          });

          const result = await loaderFn();
          expect(result).toEqual({});
          expect(consoleErrorStub.calledOnce).toBe(true);
          expect(consoleErrorStub.firstCall.args[0]).toBe(formatErrorMessage(cacheName));
        });
      });
    };

    // Test both functions
    testPhraseLoader(loadHazardPhrases, '/json/hazardPhrases.json', 'hazardPhrasesCache');
    testPhraseLoader(loadPrecautionaryPhrases, '/json/precautionaryPhrases.json', 'precautionaryPhrasesCache');
  });
});
