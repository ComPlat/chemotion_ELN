import {
  describe, it, before, after, beforeEach, afterEach
} from 'mocha';
import expect from 'expect';
import sinon from 'sinon';

import {
  validateFloat,
  validateNumrange,
  validateValueWithUnit,
  validateBoolean,
  validateSolvent,
  validateField,
  validateRow,
  validateRowUnified,
  isChemicalField,
  getSchemaValidation,
  validateFieldUnified,
  validateAndConvertAmountUnit,
  defaultSampleSchemaValidation
} from 'src/utilities/importDataValidations';

// Mock the chemical validations module
import * as chemicalValidations from 'src/utilities/chemicalDataValidations';

describe('Import Data Validations', () => {
  let validateChemicalFieldStub;

  beforeEach(() => {
    // Setup stubs for chemical validations
    validateChemicalFieldStub = sinon.stub(
      chemicalValidations,
      'validateChemicalField'
    ).resolves({ valid: true, message: '' });
  });

  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });

  describe('validateFloat', () => {
    it('should validate valid float values', () => {
      expect(validateFloat(123.45)).toEqual({ valid: true, message: '' });
      expect(validateFloat('123.45')).toEqual({ valid: true, message: '' });
      expect(validateFloat('-123.45')).toEqual({ valid: true, message: '' });
      expect(validateFloat('0')).toEqual({ valid: true, message: '' });
    });

    it('should handle empty values', () => {
      expect(validateFloat(null)).toEqual({ valid: true, message: '' });
      expect(validateFloat(undefined)).toEqual({ valid: true, message: '' });
      expect(validateFloat('')).toEqual({ valid: true, message: '' });
    });

    it('should invalidate non-numeric strings', () => {
      const result = validateFloat('abc');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cannot be converted to a number');
    });
  });

  describe('validateNumrange', () => {
    it('should validate single number ranges', () => {
      expect(validateNumrange('100')).toEqual({ valid: true, message: '' });
      expect(validateNumrange('-100')).toEqual({ valid: true, message: '' });
      expect(validateNumrange('100.5')).toEqual({ valid: true, message: '' });
    });

    it('should validate number ranges with hyphens', () => {
      expect(validateNumrange('100-200')).toEqual({ valid: true, message: '' });
      expect(validateNumrange('-100-200')).toEqual({ valid: true, message: '' });
      expect(validateNumrange('100.5-200.7')).toEqual({ valid: true, message: '' });
    });

    it('should handle empty values', () => {
      expect(validateNumrange(null)).toEqual({ valid: true, message: '' });
      expect(validateNumrange(undefined)).toEqual({ valid: true, message: '' });
      expect(validateNumrange('')).toEqual({ valid: true, message: '' });
    });

    it('should invalidate incorrect range formats', () => {
      const result1 = validateNumrange('abc');
      expect(result1.valid).toBe(false);
      expect(result1.message).toContain('not a valid number range');

      const result2 = validateNumrange('100-');
      expect(result2.valid).toBe(false);
      expect(result2.message).toContain('not a valid number range');
    });

    it('should invalidate ranges where lower bound is greater than upper bound', () => {
      const result = validateNumrange('200-100');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lower bound (200) cannot be greater than the upper bound (100)');
    });
  });

  describe('validateValueWithUnit', () => {
    it('should validate density values with correct units', () => {
      expect(validateValueWithUnit('1.5 g/mL', 'density')).toEqual({ valid: true, message: '' });
      expect(validateValueWithUnit('1.5 g/ml', 'density')).toEqual({ valid: true, message: '' });
    });

    it('should validate molarity values with correct units', () => {
      expect(validateValueWithUnit('1.5 M', 'molarity')).toEqual({ valid: true, message: '' });
      expect(validateValueWithUnit('1.5 mol/L', 'molarity')).toEqual({ valid: true, message: '' });
      expect(validateValueWithUnit('1.5 m/L', 'molarity')).toEqual({ valid: true, message: '' });
    });

    it('should validate flash point values with correct units', () => {
      expect(validateValueWithUnit('100 °C', 'flash_point')).toEqual({ valid: true, message: '' });
      expect(validateValueWithUnit('212 °F', 'flash_point')).toEqual({ valid: true, message: '' });
      expect(validateValueWithUnit('373 K', 'flash_point')).toEqual({ valid: true, message: '' });
      expect(validateValueWithUnit('98 °F', 'flash_point')).toEqual({ valid: true, message: '' });
    });

    it('should handle empty values', () => {
      expect(validateValueWithUnit(null, 'density')).toEqual({ valid: true, message: '' });
      expect(validateValueWithUnit(undefined, 'molarity')).toEqual({ valid: true, message: '' });
      expect(validateValueWithUnit('', 'flash_point')).toEqual({ valid: true, message: '' });
    });

    it('should invalidate values without numeric components', () => {
      const result = validateValueWithUnit('no-number g/mL', 'density');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('does not contain a number');
    });

    it('should invalidate values with incorrect units', () => {
      const result1 = validateValueWithUnit('1.5 kg', 'density');
      expect(result1.valid).toBe(false);
      expect(result1.message).toContain('missing the expected unit');

      const result2 = validateValueWithUnit('1.5 ppm', 'molarity');
      expect(result2.valid).toBe(false);
      expect(result2.message).toContain('missing the expected unit');

      const result3 = validateValueWithUnit('100 v', 'flash_point');
      expect(result3.valid).toBe(false);
      expect(result3.message).toContain('missing the expected unit');

      const result4 = validateValueWithUnit('100 °Cde', 'flash_point');
      expect(result4.valid).toBe(false);
      expect(result4.message).toContain('missing the expected unit');

      const result5 = validateValueWithUnit('100 K°', 'flash_point');
      expect(result5.valid).toBe(false);
      expect(result5.message).toContain('missing the expected unit');
    });

    it('should invalidate values with unknown field types', () => {
      const result = validateValueWithUnit('1.5 g/mL', 'unknown_field');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Unknown field type');
    });
  });

  describe('validateBoolean', () => {
    it('should validate boolean values', () => {
      expect(validateBoolean(true)).toMatchObject({ valid: true, parsedValue: true });
      expect(validateBoolean(false)).toMatchObject({ valid: true, parsedValue: false });
    });

    it('should validate string boolean representations', () => {
      expect(validateBoolean('true')).toMatchObject({ valid: true, parsedValue: true });
      expect(validateBoolean('false')).toMatchObject({ valid: true, parsedValue: false });
      expect(validateBoolean('yes')).toMatchObject({ valid: true, parsedValue: true });
      expect(validateBoolean('no')).toMatchObject({ valid: true, parsedValue: false });
      expect(validateBoolean('1')).toMatchObject({ valid: true, parsedValue: true });
      expect(validateBoolean('0')).toMatchObject({ valid: true, parsedValue: false });
      expect(validateBoolean('y')).toMatchObject({ valid: true, parsedValue: true });
      expect(validateBoolean('n')).toMatchObject({ valid: true, parsedValue: false });

      // Case insensitivity
      expect(validateBoolean('TRUE')).toMatchObject({ valid: true, parsedValue: true });
      expect(validateBoolean('Yes')).toMatchObject({ valid: true, parsedValue: true });

      // With whitespace
      expect(validateBoolean(' true ')).toMatchObject({ valid: true, parsedValue: true });
    });

    it('should validate numeric boolean representations', () => {
      expect(validateBoolean(1)).toMatchObject({ valid: true, parsedValue: true });
      expect(validateBoolean(0)).toMatchObject({ valid: true, parsedValue: false });
    });

    it('should handle empty values', () => {
      expect(validateBoolean(null)).toMatchObject({ valid: true, parsedValue: false });
      expect(validateBoolean(undefined)).toMatchObject({ valid: true, parsedValue: false });
      expect(validateBoolean('')).toMatchObject({ valid: true, parsedValue: false });
    });

    it('should invalidate unrecognized string values', () => {
      const result = validateBoolean('maybe');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not a recognized boolean format');
      expect(result.parsedValue).toBe(false);
    });
  });

  describe('validateSolvent', () => {
    it('should validate common solvents', () => {
      expect(validateSolvent('Water')).toEqual({ valid: true, message: '' });
      expect(validateSolvent('Methanol')).toEqual({ valid: true, message: '' });
      expect(validateSolvent('Acetone')).toEqual({ valid: true, message: '' });
    });

    it('should validate multiple solvents with slash separator', () => {
      expect(validateSolvent('Water/Methanol')).toEqual({ valid: true, message: '' });
      expect(validateSolvent('Methanol/Acetone/Water')).toEqual({ valid: true, message: '' });
    });

    it('should allow "Other" as a valid solvent', () => {
      expect(validateSolvent('Other')).toEqual({ valid: true, message: '' });
      expect(validateSolvent('Water/Other')).toEqual({ valid: true, message: '' });
    });

    it('should handle empty values', () => {
      expect(validateSolvent(null)).toEqual({ valid: true, message: '' });
      expect(validateSolvent(undefined)).toEqual({ valid: true, message: '' });
      expect(validateSolvent('')).toEqual({ valid: true, message: '' });
    });

    it('should invalidate unknown solvents', () => {
      const result = validateSolvent('Unknown Solvent');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid solvent(s): Unknown Solvent');
    });

    it('should invalidate improperly formatted solvent strings', () => {
      const result = validateSolvent('Water//Methanol');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('invalid format');
    });
  });

  describe('validateAndConvertAmountUnit', () => {
    describe('mass units', () => {
      it('should validate and convert mass units to grams', () => {
        expect(validateAndConvertAmountUnit('kg')).toMatchObject({
          valid: true,
          convertedUnit: 'g',
          conversionFactor: 1000,
          message: 'Unit "kg" is converted to "g"'
        });

        expect(validateAndConvertAmountUnit('mg')).toMatchObject({
          valid: true,
          convertedUnit: 'g',
          conversionFactor: 0.001,
          message: 'Unit "mg" is converted to "g"'
        });

        expect(validateAndConvertAmountUnit('μg')).toMatchObject({
          valid: true,
          convertedUnit: 'g',
          conversionFactor: 0.000001,
          message: 'Unit "μg" is converted to "g"'
        });

        expect(validateAndConvertAmountUnit('ug')).toMatchObject({
          valid: true,
          convertedUnit: 'g',
          conversionFactor: 0.000001,
          message: 'Unit "ug" is converted to "g"'
        });

        expect(validateAndConvertAmountUnit('microgram')).toMatchObject({
          valid: true,
          convertedUnit: 'g',
          conversionFactor: 0.000001,
          message: 'Unit "microgram" is converted to "g"'
        });
      });

      it('should accept grams without conversion', () => {
        expect(validateAndConvertAmountUnit('g')).toMatchObject({
          valid: true,
          convertedUnit: 'g',
          conversionFactor: 1,
          message: ''
        });
      });
    });

    describe('volume units', () => {
      it('should validate and convert volume units to liters', () => {
        expect(validateAndConvertAmountUnit('ml')).toMatchObject({
          valid: true,
          convertedUnit: 'l',
          conversionFactor: 0.001,
          message: 'Unit "ml" is converted to "l"'
        });

        expect(validateAndConvertAmountUnit('milliliter')).toMatchObject({
          valid: true,
          convertedUnit: 'l',
          conversionFactor: 0.001,
          message: 'Unit "milliliter" is converted to "l"'
        });

        expect(validateAndConvertAmountUnit('μl')).toMatchObject({
          valid: true,
          convertedUnit: 'l',
          conversionFactor: 0.000001,
          message: 'Unit "μl" is converted to "l"'
        });

        expect(validateAndConvertAmountUnit('ul')).toMatchObject({
          valid: true,
          convertedUnit: 'l',
          conversionFactor: 0.000001,
          message: 'Unit "ul" is converted to "l"'
        });

        expect(validateAndConvertAmountUnit('microliter')).toMatchObject({
          valid: true,
          convertedUnit: 'l',
          conversionFactor: 0.000001,
          message: 'Unit "microliter" is converted to "l"'
        });
      });

      it('should accept liters without conversion', () => {
        expect(validateAndConvertAmountUnit('l')).toMatchObject({
          valid: true,
          convertedUnit: 'l',
          conversionFactor: 1,
          message: ''
        });

        expect(validateAndConvertAmountUnit('liter')).toMatchObject({
          valid: true,
          convertedUnit: 'l',
          conversionFactor: 1,
          message: ''
        });
      });
    });

    describe('molar units', () => {
      it('should validate and convert molar units to mol', () => {
        expect(validateAndConvertAmountUnit('mmol')).toMatchObject({
          valid: true,
          convertedUnit: 'mol',
          conversionFactor: 0.001,
          message: 'Unit "mmol" is converted to "mol"'
        });

        expect(validateAndConvertAmountUnit('millimol')).toMatchObject({
          valid: true,
          convertedUnit: 'mol',
          conversionFactor: 0.001,
          message: 'Unit "millimol" is converted to "mol"'
        });

        expect(validateAndConvertAmountUnit('μmol')).toMatchObject({
          valid: true,
          convertedUnit: 'mol',
          conversionFactor: 0.000001,
          message: 'Unit "μmol" is converted to "mol"'
        });

        expect(validateAndConvertAmountUnit('umol')).toMatchObject({
          valid: true,
          convertedUnit: 'mol',
          conversionFactor: 0.000001,
          message: 'Unit "umol" is converted to "mol"'
        });

        expect(validateAndConvertAmountUnit('micromole')).toMatchObject({
          valid: true,
          convertedUnit: 'mol',
          conversionFactor: 0.000001,
          message: 'Unit "micromole" is converted to "mol"'
        });
      });

      it('should accept mol without conversion', () => {
        expect(validateAndConvertAmountUnit('mol')).toMatchObject({
          valid: true,
          convertedUnit: 'mol',
          conversionFactor: 1,
          message: ''
        });

        expect(validateAndConvertAmountUnit('mole')).toMatchObject({
          valid: true,
          convertedUnit: 'mol',
          conversionFactor: 1,
          message: ''
        });
      });
    });

    describe('case insensitivity and whitespace handling', () => {
      it('should handle uppercase and mixed case units', () => {
        expect(validateAndConvertAmountUnit('KG')).toMatchObject({
          valid: true,
          convertedUnit: 'g',
          conversionFactor: 1000
        });

        expect(validateAndConvertAmountUnit('Mg')).toMatchObject({
          valid: true,
          convertedUnit: 'g',
          conversionFactor: 0.001
        });

        expect(validateAndConvertAmountUnit('ML')).toMatchObject({
          valid: true,
          convertedUnit: 'l',
          conversionFactor: 0.001
        });
      });

      it('should handle whitespace around units', () => {
        expect(validateAndConvertAmountUnit(' mg ')).toMatchObject({
          valid: true,
          convertedUnit: 'g',
          conversionFactor: 0.001
        });

        expect(validateAndConvertAmountUnit('  ml  ')).toMatchObject({
          valid: true,
          convertedUnit: 'l',
          conversionFactor: 0.001
        });
      });
    });

    describe('invalid inputs', () => {
      it('should reject invalid units', () => {
        const result = validateAndConvertAmountUnit('pounds');
        expect(result.valid).toBe(false);
        expect(result.convertedUnit).toBe(null);
        expect(result.conversionFactor).toBe(1);
        expect(result.message).toContain('Invalid unit "pounds"');
        expect(result.message).toContain('Valid units are:');
      });

      it('should reject null, undefined, and empty inputs', () => {
        expect(validateAndConvertAmountUnit(null)).toMatchObject({
          valid: false,
          message: 'Unit is required and must be a string'
        });

        expect(validateAndConvertAmountUnit(undefined)).toMatchObject({
          valid: false,
          message: 'Unit is required and must be a string'
        });

        expect(validateAndConvertAmountUnit('')).toMatchObject({
          valid: false,
          message: 'Unit is required and must be a string'
        });
      });

      it('should reject non-string inputs', () => {
        expect(validateAndConvertAmountUnit(123)).toMatchObject({
          valid: false,
          message: 'Unit is required and must be a string'
        });

        expect(validateAndConvertAmountUnit({})).toMatchObject({
          valid: false,
          message: 'Unit is required and must be a string'
        });
      });
    });
  });

  describe('validateField with amount unit conversions', () => {
    it('should validate and convert target_amount_unit', () => {
      const result = validateField('mg', 'target_amount_unit');
      expect(result.valid).toBe(true);
      expect(result.convertedValue).toBe('g');
      expect(result.conversionFactor).toBe(0.001);
      expect(result.conversionMessage).toBe('Unit "mg" is converted to "g"');
    });

    it('should validate and convert real_amount_unit', () => {
      const result = validateField('ml', 'real_amount_unit');
      expect(result.valid).toBe(true);
      expect(result.convertedValue).toBe('l');
      expect(result.conversionFactor).toBe(0.001);
      expect(result.conversionMessage).toBe('Unit "ml" is converted to "l"');
    });

    it('should reject invalid amount units', () => {
      const result = validateField('pounds', 'target_amount_unit');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid unit "pounds"');
    });
  });

  describe('validateRow with unit conversions', () => {
    it('should convert units and values in a complete row', () => {
      const testRow = {
        name: 'Test Sample',
        target_amount_value: '500',
        target_amount_unit: 'mg',
        real_amount_value: '25',
        real_amount_unit: 'ml'
      };

      const result = validateRow(testRow);
      expect(result.valid).toBe(true);
      expect(result.conversions.length).toBe(2);
      expect(result.conversions).toContain('Field "target_amount_unit": Unit "mg" is converted to "g"');
      expect(result.conversions).toContain('Field "real_amount_unit": Unit "ml" is converted to "l"');

      // Check converted data
      expect(result.convertedData.target_amount_unit).toBe('g');
      expect(result.convertedData.target_amount_value).toBe(0.5); // 500 * 0.001
      expect(result.convertedData.real_amount_unit).toBe('l');
      expect(result.convertedData.real_amount_value).toBe(0.025); // 25 * 0.001
    });

    it('should handle precision correctly for small conversions', () => {
      const testRow = {
        target_amount_value: '1.5',
        target_amount_unit: 'μg'
      };

      const result = validateRow(testRow);
      expect(result.valid).toBe(true);
      expect(result.convertedData.target_amount_unit).toBe('g');
      expect(result.convertedData.target_amount_value).toBe(0.0000015); // 1.5 * 0.000001, rounded to 4 decimal places
    });

    it('should handle precision correctly to avoid floating point issues', () => {
      const testRow = {
        target_amount_value: '123.456789',
        target_amount_unit: 'mg'
      };

      const result = validateRow(testRow);
      expect(result.valid).toBe(true);
      expect(result.convertedData.target_amount_unit).toBe('g');
      // Should be rounded to 8 decimal places: 123.456789 * 0.001 = 0.123456789 -> 0.12345679
      expect(result.convertedData.target_amount_value).toBe(0.12345679);
    });

    it('should not convert units that are already in target format', () => {
      const testRow = {
        target_amount_value: '100',
        target_amount_unit: 'g',
        real_amount_value: '2',
        real_amount_unit: 'l'
      };

      const result = validateRow(testRow);
      expect(result.valid).toBe(true);
      expect(result.conversions.length).toBe(0); // No conversions needed
      expect(result.convertedData.target_amount_unit).toBe('g');
      expect(result.convertedData.target_amount_value).toBe('100'); // Unchanged
      expect(result.convertedData.real_amount_unit).toBe('l');
      expect(result.convertedData.real_amount_value).toBe('2'); // Unchanged
    });

    it('should handle invalid units and prevent conversion', () => {
      const testRow = {
        target_amount_value: '100',
        target_amount_unit: 'pounds' // Invalid unit
      };

      const result = validateRow(testRow);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('Invalid unit "pounds"');
      expect(result.conversions.length).toBe(0);
    });

    it('should handle missing value field gracefully', () => {
      const testRow = {
        target_amount_unit: 'mg' // No corresponding value field
      };

      const result = validateRow(testRow);
      expect(result.valid).toBe(true);
      expect(result.conversions.length).toBe(1);
      expect(result.convertedData.target_amount_unit).toBe('g');
      // No value field to convert, should not throw error
    });

    it('should handle non-numeric value fields gracefully', () => {
      const testRow = {
        target_amount_value: 'not-a-number',
        target_amount_unit: 'mg'
      };

      const result = validateRow(testRow);
      expect(result.valid).toBe(false); // Should fail on value validation
      expect(result.conversions.length).toBe(1); // Unit conversion still happens
      expect(result.convertedData.target_amount_unit).toBe('g');
      expect(result.convertedData.target_amount_value).toBe('not-a-number'); // Unchanged since it's not a number
    });
  });

  describe('validateRowUnified with unit conversions', () => {
    it('should handle unit conversions in unified validation', async () => {
      const testRow = {
        name: 'Test Sample',
        target_amount_value: '1000',
        target_amount_unit: 'mg',
        real_amount_value: '50',
        real_amount_unit: 'ml'
      };

      const result = await validateRowUnified(testRow);
      expect(result.valid).toBe(true);
      expect(result.conversions.length).toBe(2);
      expect(result.convertedData.target_amount_unit).toBe('g');
      expect(result.convertedData.target_amount_value).toBe(1); // 1000 * 0.001
      expect(result.convertedData.real_amount_unit).toBe('l');
      expect(result.convertedData.real_amount_value).toBe(0.05); // 50 * 0.001
    });

    it('should handle mixed valid and invalid conversions', async () => {
      const testRow = {
        target_amount_value: '500',
        target_amount_unit: 'mg', // Valid conversion
        real_amount_value: '25',
        real_amount_unit: 'pounds' // Invalid unit
      };

      const result = await validateRowUnified(testRow);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.conversions.length).toBe(1); // Only the valid conversion
      expect(result.convertedData.target_amount_unit).toBe('g');
      expect(result.convertedData.target_amount_value).toBe(0.5);
    });
  });

  describe('validateField', () => {
    it('should skip validation for empty values if not required', () => {
      expect(validateField(null, 'any_field')).toEqual({ valid: true, message: '' });
      expect(validateField('', 'any_field')).toEqual({ valid: true, message: '' });
    });

    it('should validate float fields correctly', () => {
      expect(validateField('123.45', 'target_amount_value')).toEqual({ valid: true, message: '' });
      expect(validateField('abc', 'target_amount_value').valid).toBe(false);

      expect(validateField('123.45', 'real_amount_value')).toEqual({ valid: true, message: '' });
      expect(validateField('123.45', 'purity')).toEqual({ valid: true, message: '' });
      expect(validateField('123.45', 'refractive_index')).toEqual({ valid: true, message: '' });
      expect(validateField('123.45', 'molecular_mass')).toEqual({ valid: true, message: '' });
    });

    it('should validate boolean fields correctly', () => {
      expect(validateField('yes', 'dry_solvent').valid).toBe(true);
      expect(validateField('nope', 'dry_solvent').valid).toBe(false);

      expect(validateField('true', 'is_top_secret').valid).toBe(true);
      expect(validateField('yes', 'decoupled').valid).toBe(true);
    });

    it('should validate numrange fields correctly', () => {
      expect(validateField('100-200', 'melting_point')).toEqual({ valid: true, message: '' });
      expect(validateField('abc', 'melting_point').valid).toBe(false);

      expect(validateField('100-200', 'boiling_point')).toEqual({ valid: true, message: '' });
      expect(validateField('200-100', 'boiling_point').valid).toBe(false);
    });

    it('should validate fields with units correctly', () => {
      expect(validateField('1.5 g/mL', 'density')).toEqual({ valid: true, message: '' });
      expect(validateField('1.5 kg', 'density').valid).toBe(false);

      expect(validateField('1.5 M', 'molarity')).toEqual({ valid: true, message: '' });
      expect(validateField('100 °C', 'flash_point')).toEqual({ valid: true, message: '' });
    });

    it('should validate solvent field correctly', () => {
      expect(validateField('Water/Methanol', 'solvent')).toEqual({ valid: true, message: '' });
      expect(validateField('Unknown Solvent', 'solvent').valid).toBe(false);
    });

    it('should pass for unrecognized fields', () => {
      expect(validateField('any value', 'unknown_field')).toEqual({ valid: true, message: '' });
    });
  });

  describe('validateRow', () => {
    it('should validate a valid row', () => {
      const validRow = {
        name: 'Test Sample',
        target_amount_value: '100',
        target_amount_unit: 'g',
        purity: '0.95',
        melting_point: '100-200',
        density: '1.5 g/mL',
        solvent: 'Water/Methanol',
        dry_solvent: 'yes'
      };

      const result = validateRow(validRow);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should find errors in an invalid row', () => {
      const invalidRow = {
        name: 'Test Sample',
        target_amount_value: 'abc', // Invalid: not a number
        melting_point: '200-100', // Invalid: wrong order
        density: '1.5', // Invalid: missing unit
        solvent: 'Unknown Solvent' // Invalid: unknown solvent
      };

      const result = validateRow(invalidRow);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it('should skip validation for special fields', () => {
      const rowWithSpecialFields = {
        id: '123',
        valid: false,
        errors: ['Some error'],
        delete: true,
        name: 'Test Sample'
      };

      const result = validateRow(rowWithSpecialFields);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should validate using provided field types', () => {
      const row = {
        custom_field: 'abc' // Not a valid float
      };

      const fieldTypes = {
        custom_field: { type: 'float' }
      };

      const result = validateRow(row, fieldTypes);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
    });
  });

  describe('isChemicalField', () => {
    it('should identify chemical fields', () => {
      expect(isChemicalField('status')).toBe(true);
      expect(isChemicalField('vendor')).toBe(true);
      expect(isChemicalField('chemical_data.some_property')).toBe(true);
    });

    it('should identify non-chemical fields', () => {
      expect(isChemicalField('name')).toBe(false);
      expect(isChemicalField('target_amount_value')).toBe(false);
      expect(isChemicalField('purity')).toBe(false);
    });

    it('should handle invalid inputs', () => {
      expect(isChemicalField(null)).toBe(false);
      expect(isChemicalField(undefined)).toBe(false);
      expect(isChemicalField(123)).toBe(false);
    });
  });

  describe('validateFieldUnified', () => {
    it('should route chemical fields to chemical validation', async () => {
      await validateFieldUnified('some value', 'vendor');
      expect(validateChemicalFieldStub.calledOnce).toBe(true);
    });

    it('should route sample fields to regular validation', async () => {
      const result = await validateFieldUnified('100', 'target_amount_value');
      expect(validateChemicalFieldStub.called).toBe(false);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateRowUnified', () => {
    it('should validate a row with both chemical and sample fields', async () => {
      const mixedRow = {
        name: 'Test Sample',
        target_amount_value: '100',
        vendor: 'Test Vendor',
        status: 'ordered'
      };

      validateChemicalFieldStub.withArgs('Test Vendor', 'vendor').resolves({ valid: true, message: '' });
      validateChemicalFieldStub.withArgs('ordered', 'status').resolves({ valid: true, message: '' });

      const result = await validateRowUnified(mixedRow);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(validateChemicalFieldStub.callCount).toBe(2);
    });

    it('should report errors for invalid fields', async () => {
      const invalidRow = {
        name: 'Test Sample',
        target_amount_value: 'abc', // Invalid: not a number
        vendor: 'Invalid Vendor'
      };

      validateChemicalFieldStub.withArgs('Invalid Vendor', 'vendor').resolves(
        { valid: false, message: 'Invalid vendor' }
      );

      const result = await validateRowUnified(invalidRow);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip internal fields', async () => {
      const rowWithInternalFields = {
        id: '123',
        valid: false,
        errors: ['Some error'],
        name: 'Test Sample'
      };

      const result = await validateRowUnified(rowWithInternalFields);
      expect(result.valid).toBe(true);
      expect(validateChemicalFieldStub.called).toBe(false);
    });
  });

  describe('getSchemaValidation', () => {
    it('should return chemical schema for chemical type', () => {
      const schema = getSchemaValidation('chemical');
      expect(schema).toBe(chemicalValidations.defaultChemicalSchemaValidation);
      expect(schema).toHaveProperty('status');
    });

    it('should return sample schema for sample type', () => {
      const schema = getSchemaValidation('sample');
      expect(schema).toBe(defaultSampleSchemaValidation);
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('description');
      expect(schema).toHaveProperty('target_amount_value');
    });

    it('should return error for unknown types', () => {
      expect(() => getSchemaValidation('unknown')).toThrow('Unknown data type "unknown" for schema validation');
    });
  });
});
