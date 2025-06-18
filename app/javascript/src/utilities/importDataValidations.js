/**
 * Import Data Validation Utilities
 * This file contains validation functions for import data in Chemotion
 * Based on the database schema and import rules from import_samples.rb
 */

import {
  validateChemicalField,
  validateChemicalData,
  defaultChemicalSchemaValidation
} from 'src/utilities/chemicalDataValidations';

// Fields that require units when provided
const fieldsWithUnits = ['density', 'molarity', 'flash_point'];

// Fields that should be numrange (numeric intervals)
const numrangeFields = ['melting_point', 'boiling_point'];

/**
 * Validates if a value can be converted to a float
 * @param {string|number} value - The value to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateFloat = (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' };
  }

  if (typeof value === 'number') {
    return { valid: true, message: '' };
  }

  // Try to convert string to float
  const floatValue = parseFloat(value);
  if (Number.isNaN(floatValue)) {
    return { valid: false, message: `Value "${value}" cannot be converted to a number` };
  }

  return { valid: true, message: '' };
};

/**
 * Validates a numrange value (for melting_point and boiling_point)
 * @param {string} value - The value to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateNumrange = (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // Empty values are considered valid
  }

  // Check if it's a single number or a range (e.g. "100" or "100-200")
  const rangeRegex = /^(-?\d+(?:[.,]\d+)?)(?:\s*-\s*(-?\d+(?:[.,]\d+)?))?$/;
  if (!rangeRegex.test(value)) {
    return {
      valid: false,
      message: `Value "${value}" is not a valid number range.
      Format should be a single number or a range (e.g. "100" or "100-200")`
    };
  }

  // Extract the numbers
  const matches = value.match(rangeRegex);
  if (!matches) {
    return { valid: false, message: `Value "${value}" is not in correct format` };
  }

  // Check if we have two numbers and the second is larger than the first
  if (matches[2]) {
    const lowerBound = parseFloat(matches[1]);
    const upperBound = parseFloat(matches[2]);

    if (lowerBound > upperBound) {
      return {
        valid: false,
        message: `Invalid range: the lower bound (${lowerBound}) cannot be greater than the upper bound (${upperBound})`
      };
    }
  }

  return { valid: true, message: '' };
};

/**
 * Validates a value with a unit
 * @param {string} value - The value to validate
 * @param {string} fieldType - The field type (e.g. 'density', 'molarity', 'flash_point')
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateValueWithUnit = (value, fieldType) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // Empty values are considered valid
  }

  // First extract the numerical value
  const numMatch = value.match(/\b\d+(?:\.\d+)?\b/);
  if (!numMatch) {
    return {
      valid: false,
      message: `Value "${value}" does not contain a number`
    };
  }

  // Select the appropriate unit regex based on field type
  let expectedUnit;
  let isValid = false;

  switch (fieldType) {
    case 'density':
      // Check for exact units g/mL or g/ml
      isValid = /\d\s+g\/m[Ll]$/.test(value);
      expectedUnit = 'g/mL';
      break;
    case 'molarity':
      // Check for exact units M, m/L, or mol/L
      isValid = /\d\s+(?:m\/L|mol\/L|M)$/.test(value);
      expectedUnit = 'M or mol/L';
      break;
    case 'flash_point':
      // Check for exact units °C, °F, or K
      isValid = /\d\s+(?:°C|°F|K)$/.test(value);
      expectedUnit = '°C, °F, or K';
      break;
    default:
      return {
        valid: false,
        message: `Unknown field type "${fieldType}" for unit validation`
      };
  }

  // Check if the value has the expected unit
  if (!isValid) {
    return {
      valid: false,
      message: `Value "${value}" is missing the expected unit (${expectedUnit})`
    };
  }

  return { valid: true, message: '' };
};

/**
 * Validates a boolean value
 * @param {string|boolean} value - The value to validate
 * @returns {Object} - { valid: boolean, message: string, parsedValue: boolean }
 */
export const validateBoolean = (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '', parsedValue: false };
  }

  if (typeof value === 'boolean') {
    return { valid: true, message: '', parsedValue: value };
  }

  // Convert string values to boolean
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    if (['true', 'yes', '1', 'y'].includes(lowerValue)) {
      return { valid: true, message: '', parsedValue: true };
    }
    if (['false', 'no', '0', 'n'].includes(lowerValue)) {
      return { valid: true, message: '', parsedValue: false };
    }

    return {
      valid: false,
      message: `Value "${value}" is not a recognized boolean format. Use 'yes'/'no', 'true'/'false', or '1'/'0'.`,
      parsedValue: false
    };
  }

  // Handle numeric values
  if (typeof value === 'number') {
    return { valid: true, message: '', parsedValue: value !== 0 };
  }

  return {
    valid: false,
    message: `Value "${value}" is not a valid boolean format`,
    parsedValue: false
  };
};

/**
 * Validates a solvent value
 * @param {string} value - The solvent string to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateSolvent = (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // Empty values are considered valid
  }

  // List of valid solvents from sample_const.rb
  const validSolvents = [
    'Acetic acid', 'Acetone', 'Acetonitrile', 'Benzene', 'Butanol',
    'Carbon tetrachloride', 'Chloroform', 'Cyclohexane', 'Dichloromethane',
    'Diethyl ether', 'Dimethyl formamide', 'Dimethyl sulfoxide', 'Dioxane',
    'Ethanol', 'Ethyl acetate', 'Heptane', 'Hexane', 'Isopropanol', 'Methanol',
    'Pentane', 'Pyridine', 'Tetrahydrofuran', 'Toluene', 'Water', 'Other'
  ];

  // Based on the backend implementation, solvents should be slash-separated values
  const solvents = value.split('/');

  // Check if solvent format is valid
  if (solvents.some((solvent) => !solvent.trim())) {
    return {
      valid: false,
      message: `Solvent "${value}" has an invalid format. Use slash-separated values (e.g. "Methanol/Water")`
    };
  }

  // Check if each solvent is in the list of valid solvents
  const invalidSolvents = solvents.filter((solvent) => solvent.trim() !== 'Other'
    && !validSolvents.includes(solvent.trim()));

  if (invalidSolvents.length > 0) {
    return {
      valid: false,
      message: `Invalid solvent(s): ${invalidSolvents.join(', ')}. Valid options are: ${validSolvents.join(', ')}`
    };
  }

  return { valid: true, message: '' };
};

/**
 * Main validation function that routes to specific validators based on field type
 * @param {any} value - The value to validate
 * @param {string} fieldName - The name of the field
 * @param {Object} options - Additional options (like data types)
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateField = (value, fieldName, options = {}) => {
  // Skip validation for empty values if not marked as required
  if ((value === null || value === undefined || value === '') && !options.required) {
    return { valid: true, message: '' };
  }

  // Handle numeric fields
  if (options.type === 'float'
      || fieldName === 'target_amount_value'
      || fieldName === 'real_amount_value'
      || fieldName === 'purity'
      || fieldName === 'refractive_index'
      || fieldName === 'molecular_mass') {
    return validateFloat(value);
  }

  // Handle boolean fields
  if (options.type === 'boolean'
      || fieldName === 'dry_solvent'
      || fieldName === 'is_top_secret'
      || fieldName === 'decoupled') {
    return validateBoolean(value);
  }

  // Handle numrange fields (melting_point, boiling_point)
  if (numrangeFields.includes(fieldName)) {
    return validateNumrange(value);
  }

  // Handle fields with units
  if (fieldsWithUnits.includes(fieldName)) {
    return validateValueWithUnit(value, fieldName);
  }

  // Handle solvent field (jsonb in the database)
  if (fieldName === 'solvent') {
    return validateSolvent(value);
  }

  // Default validation passes
  return { valid: true, message: '' };
};

/**
 * Validates a complete row of data
 * @param {Object} rowData - The row data to validate
 * @param {Object} fieldTypes - Mapping of field names to their expected types
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export const validateRow = (rowData, fieldTypes = {}) => {
  const errors = [];
  let isValid = true;

  // Skip validation for special fields
  const excludedFields = ['id', 'valid', 'errors', 'delete'];
  Object.entries(rowData).forEach(([fieldName, value]) => {
    // Skip excluded fields
    if (excludedFields.includes(fieldName)) {
      return;
    }

    const options = fieldTypes[fieldName] || {};

    // Validate the field
    const validation = validateField(value, fieldName, options);

    if (!validation.valid) {
      isValid = false;
      errors.push(`Field "${fieldName}": ${validation.message}`);
    }
  });

  return { valid: isValid, errors };
};

/**
 * Default schema definition for import validation
 * Based on the database schema.rb
 */
export const defaultSampleSchemaValidation = {
  // Sample fields
  name: { type: 'string' },
  description: { type: 'string' },
  target_amount_value: { type: 'float', defaultValue: 0.0 },
  target_amount_unit: { type: 'string', defaultValue: 'g' },
  real_amount_value: { type: 'float' },
  real_amount_unit: { type: 'string' },
  purity: { type: 'float', defaultValue: 1.0 },
  melting_point: { type: 'numrange' },
  boiling_point: { type: 'numrange' },
  density: { type: 'string' }, // String with unit g/mL, or g/ml
  molarity: { type: 'string' }, // Unified field replacing molarity_value and molarity_unit
  flash_point: { type: 'string' }, // String with unit (°C, °F, K)
  dry_solvent: { type: 'boolean', defaultValue: false },
  is_top_secret: { type: 'boolean', defaultValue: false },
  decoupled: { type: 'boolean', defaultValue: false },
  molecular_mass: { type: 'float' },
  sum_formula: { type: 'string' },
  cas: { type: 'string' },
  solvent: { type: 'string' },
  refractive_index: { type: 'float' },
  location: { type: 'string' },
  external_label: { type: 'string' },
  impurities: { type: 'string' },
};

/**
 * Check if a field name belongs to the chemical domain
 * @param {string} fieldName - The name of the field to check
 * @returns {boolean} - True if the field is a chemical field, false otherwise
 */
export const isChemicalField = (fieldName) => {
  if (!fieldName || typeof fieldName !== 'string') {
    return false;
  }

  const chemicalFields = Object.keys(defaultChemicalSchemaValidation);
  const normalizedFieldName = fieldName.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase();

  // Special case for nested fields in chemical_data
  if (normalizedFieldName.startsWith('chemical_data.')) {
    return true;
  }

  // Also check for fields specific to chemical objects
  const chemicalSpecificFields = [
    'status', 'vendor', 'order_number', 'price', 'person', 'required_date',
    'ordered_date', 'required_by', 'host_building', 'host_room', 'host_cabinet',
    'host_group', 'host_owner', 'borrowed_by', 'current_building', 'current_room',
    'current_cabinet', 'current_group', 'safety_phrases', 'pictograms',
    'h_statements', 'p_statements', 'disposal_info', 'important_notes',
    'expiration_date', 'storage_temperature'
  ];

  // Check if the field is explicitly a chemical field
  const isExplicitlyChemical = chemicalFields.includes(normalizedFieldName)
    || chemicalSpecificFields.includes(normalizedFieldName);

  if (isExplicitlyChemical) {
    return true;
  }

  // If it's not explicitly a chemical field, check if it's a sample field
  const sampleFields = Object.keys(defaultSampleSchemaValidation);
  return !sampleFields.includes(normalizedFieldName);
};

/**
 * Unified validation function that handles both chemical and sample data
 * @param {any} value - The value to validate
 * @param {string} fieldName - The name of the field
 * @param {Object} options - Additional options (like data types)
 * @returns {Promise<Object>} - Promise resolving to { valid: boolean, message: string }
 */
export const validateFieldUnified = async (value, fieldName, options = {}) => {
  if (isChemicalField(fieldName)) {
    return validateChemicalField(value, fieldName, options);
  }
  return validateField(value, fieldName, options);
};

/**
 * Unified validation function for a complete row of data
 * @param {Object} rowData - The row data to validate
 * @param {Object} fieldTypes - Mapping of field names to their expected types
 * @returns {Promise<Object>} - Promise resolving to { valid: boolean, errors: string[] }
 */
export const validateRowUnified = async (rowData, fieldTypes = {}) => {
  // Initialize the result
  let isValid = true;
  const errors = [];
  const validationPromises = [];

  // Process each field in the row
  Object.keys(rowData).forEach((fieldName) => {
    if (fieldName === 'id' || fieldName === 'valid' || fieldName === 'errors') {
      return; // Skip internal fields
    }

    const value = rowData[fieldName];

    // Determine appropriate schema for this field
    const isChemField = isChemicalField(fieldName);
    const schemaToUse = isChemField
      ? defaultChemicalSchemaValidation : defaultSampleSchemaValidation;

    // Only validate if the field exists in the schema
    const fieldSchema = schemaToUse[fieldName];
    if (!fieldSchema && !isChemField && !defaultSampleSchemaValidation[fieldName]) {
      // Skip fields that don't exist in either schema
      return;
    }

    // Create a validation promise for this field
    const validationPromise = validateFieldUnified(value, fieldName, fieldTypes)
      .then((validation) => {
        if (!validation.valid) {
          errors.push(`Field "${fieldName}": ${validation.message}`);
          return false;
        }
        return true;
      });

    validationPromises.push(validationPromise);
  });

  // Wait for all validations to complete
  const results = await Promise.all(validationPromises);
  isValid = results.every((result) => result === true);

  console.log(`Validated row with ${Object.keys(rowData).length} fields. Valid: ${isValid}. Errors: ${errors.length}`);

  return { valid: isValid, errors };
};

/**
 * Get the appropriate schema validation based on data type
 * @param {string} type - The type of data ('sample' or 'chemical')
 * @returns {Object} - The schema validation object for the specified type
 */
export const getSchemaValidation = (type) => {
  switch (type.toLowerCase()) {
    case 'chemical':
      return defaultChemicalSchemaValidation;
    case 'sample':
      return defaultSampleSchemaValidation;
    default:
      throw new Error(`Unknown data type "${type}" for schema validation`);
  }
};
