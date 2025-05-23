/**
 * Chemical Import Data Validation Utilities
 * This file contains validation functions for chemical import data
 * Based on the database schema and import rules from import_chemicals.rb
 */

// Constants used for validation
const PICTOGRAMS = [
  'GHS01', 'GHS02', 'GHS03', 'GHS04', 'GHS05',
  'GHS06', 'GHS07', 'GHS08', 'GHS09'
];

const AMOUNT_UNITS = ['g', 'mg', 'μg'];
const VOLUME_UNITS = ['ml', 'l', 'μl'];
const TEMPERATURE_UNITS = ['°C'];

// Expected format for unit-based fields
const EXPECTED_UNIT_FORMATS = {
  amount: 'value + unit (e.g., "100 mg")',
  volume: 'value + unit (e.g., "50 ml")',
  storage_temperature: 'value + unit (e.g., "4 °C")'
};

/**
 * Default schema definition for chemical import validation
 * Based on the schema and import rules from import_chemicals.rb
 */
export const defaultChemicalSchemaValidation = {
  // Chemical fields
  status: { type: 'string' },
  vendor: { type: 'string' },
  order_number: { type: 'string' },
  price: { type: 'float' },
  person: { type: 'string' },
  required_date: { type: 'date' },
  ordered_date: { type: 'date' },
  required_by: { type: 'string' },
  host_building: { type: 'string' },
  host_room: { type: 'string' },
  host_cabinet: { type: 'string' },
  host_group: { type: 'string' },
  host_owner: { type: 'string' },
  borrowed_by: { type: 'string' },
  current_building: { type: 'string' },
  current_room: { type: 'string' },
  current_cabinet: { type: 'string' },
  current_group: { type: 'string' },
  disposal_info: { type: 'string' },
  important_notes: { type: 'string' },
  expiration_date: { type: 'date' },
  amount: { type: 'object' }, // Object with value and unit
  volume: { type: 'object' }, // Object with value and unit
  storage_temperature: { type: 'object' }, // Object with value and unit
  safetyPhrases: { type: 'object' } // Complex object with pictograms, h_statements, p_statements
};

// Cache for hazard and precautionary phrases - will be loaded on demand
let hazardPhrasesCache = null;
let precautionaryPhrasesCache = null;

/**
 * Loads hazard phrases from the JSON file
 * @returns {Promise<Object>} - Promise resolving to an object of hazard phrases
 */
export const loadHazardPhrases = async () => {
  if (hazardPhrasesCache) {
    return hazardPhrasesCache;
  }

  try {
    const response = await fetch('/json/hazardPhrases.json');
    hazardPhrasesCache = await response.json();
    return hazardPhrasesCache;
  } catch (error) {
    console.error('Failed to load hazard phrases:', error);
    return {};
  }
};

/**
 * Loads precautionary phrases from the JSON file
 * @returns {Promise<Object>} - Promise resolving to an object of precautionary phrases
 */
export const loadPrecautionaryPhrases = async () => {
  if (precautionaryPhrasesCache) {
    return precautionaryPhrasesCache;
  }

  try {
    const response = await fetch('/json/precautionaryPhrases.json');
    precautionaryPhrasesCache = await response.json();
    return precautionaryPhrasesCache;
  } catch (error) {
    console.error('Failed to load precautionary phrases:', error);
    return {};
  }
};

/**
 * Validates a date string
 * @param {string} value - The date string to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // Empty values are considered valid
  }

  // Check if it's a valid date
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      valid: false,
      message: `Value "${value}" is not a valid date. Please use YYYY-MM-DD format.`
    };
  }

  return { valid: true, message: '' };
};

/**
 * Validates a chemical status value
 * @param {string} value - The status value to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateStatus = (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // Empty values are considered valid
  }

  const validStatuses = [
    'To be ordered', 'Ordered', 'Out of Stock', 'Available',
  ];

  if (!validStatuses.includes(value)) {
    return {
      valid: false,
      message: `Value "${value}" is not a valid status. Valid options are: ${validStatuses.join(', ')}`
    };
  }

  return { valid: true, message: '' };
};

/**
 * Validates a value with a unit (amount, volume, temperature)
 * @param {string|Object} value - The value to validate
 * @param {string} fieldType - The field type (e.g. 'amount', 'volume', 'storage_temperature')
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateValueWithUnit = (value, fieldType) => {
  // If already an object with unit/value properties
  if (value && typeof value === 'object') {
    if (!value.value || !value.unit) {
      return {
        valid: false,
        message: 'Object must have both \'value\' and \'unit\' properties. '
          + `Expected format: ${EXPECTED_UNIT_FORMATS[fieldType]}`
      };
    }

    // Validate the numeric value
    const numValue = parseFloat(value.value);
    if (Number.isNaN(numValue)) {
      return {
        valid: false,
        message: `Value "${value.value}" is not a valid number`
      };
    }

    // Validate the unit based on field type
    let validUnits;
    let expectedFormat;
    switch (fieldType) {
      case 'amount':
        validUnits = AMOUNT_UNITS;
        expectedFormat = EXPECTED_UNIT_FORMATS.amount;
        break;
      case 'volume':
        validUnits = VOLUME_UNITS;
        expectedFormat = EXPECTED_UNIT_FORMATS.volume;
        break;
      case 'storage_temperature':
        validUnits = TEMPERATURE_UNITS;
        expectedFormat = EXPECTED_UNIT_FORMATS.storage_temperature;
        break;
      default:
        return {
          valid: false,
          message: `Unknown field type "${fieldType}" for unit validation`
        };
    }

    if (!validUnits.includes(value.unit)) {
      return {
        valid: false,
        message: `Unit "${value.unit}" is not valid for ${fieldType}. Valid units: ${validUnits.join(', ')}.`
          + ` Expected format: ${expectedFormat}`
      };
    }

    return { valid: true, message: '' };
  }

  // If a string that needs to be parsed
  if (typeof value === 'string') {
    // Extract numeric part and unit part
    const matches = value.match(/^([\d.]+)\s*(.+)$/);
    if (!matches) {
      return {
        valid: false,
        message: `Value "${value}" does not contain both a number and a unit. `
          + `Expected format: ${EXPECTED_UNIT_FORMATS[fieldType]}`
      };
    }

    const numValue = parseFloat(matches[1]);
    const unit = matches[2].trim();

    if (Number.isNaN(numValue)) {
      return {
        valid: false,
        message: `Value "${matches[1]}" is not a valid number`
      };
    }

    // Validate the unit based on field type
    let validUnits;
    let expectedFormat;
    switch (fieldType) {
      case 'amount':
        validUnits = AMOUNT_UNITS;
        expectedFormat = EXPECTED_UNIT_FORMATS.amount;
        break;
      case 'volume':
        validUnits = VOLUME_UNITS;
        expectedFormat = EXPECTED_UNIT_FORMATS.volume;
        break;
      case 'storage_temperature':
        validUnits = TEMPERATURE_UNITS;
        expectedFormat = EXPECTED_UNIT_FORMATS.storage_temperature;
        break;
      default:
        return {
          valid: false,
          message: `Unknown field type "${fieldType}" for unit validation`
        };
    }

    if (!validUnits.includes(unit)) {
      return {
        valid: false,
        message: `Unit "${unit}" is not valid for ${fieldType}. Valid units: ${validUnits.join(', ')}.`
          + ` Expected format: ${expectedFormat}`
      };
    }

    return { valid: true, message: '' };
  }

  return {
    valid: false,
    message: 'Value must be an object with \'value\' and \'unit\' properties or a string with a number and unit. '
      + `Expected format: ${EXPECTED_UNIT_FORMATS[fieldType] || 'value unit'}`
  };
};

/**
 * Validates a pictogram code
 * @param {string|Array} value - The pictogram code(s) to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validatePictograms = (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // Empty values are considered valid
  }

  // Handle array of pictograms
  if (Array.isArray(value)) {
    const invalidPictograms = value.filter((p) => !PICTOGRAMS.includes(p));
    if (invalidPictograms.length > 0) {
      return {
        valid: false,
        message: `Invalid pictogram(s): ${invalidPictograms.join(', ')}. Valid options are: ${PICTOGRAMS.join(', ')}`
      };
    }
    return { valid: true, message: '' };
  }

  // Handle single pictogram as string
  if (typeof value === 'string') {
    // Split by commas or dashes if multiple are provided in a string
    const pictogramsList = value.split(/[,-]/).map((p) => p.trim());
    const invalidPictograms = pictogramsList.filter((p) => p && !PICTOGRAMS.includes(p));

    if (invalidPictograms.length > 0) {
      return {
        valid: false,
        message: `Invalid pictogram(s): ${invalidPictograms.join(', ')}. Valid options are: ${PICTOGRAMS.join(', ')}`
      };
    }
    return { valid: true, message: '' };
  }

  return {
    valid: false,
    message: 'Pictograms must be an array or a string'
  };
};

/**
 * Validates H statements (hazard phrases)
 * @param {Object|string} value - The H statements to validate
 * @returns {Promise<Object>} - Promise resolving to { valid: boolean, message: string }
 */
export const validateHStatements = async (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // Empty values are considered valid
  }

  // Load hazard phrases if not already loaded
  const hazardPhrases = await loadHazardPhrases();

  // Handle object with H statement keys
  if (typeof value === 'object' && !Array.isArray(value)) {
    const invalidHStatements = Object.keys(value).filter((key) => !hazardPhrases[key]);

    if (invalidHStatements.length > 0) {
      return {
        valid: false,
        message: `Invalid H statement(s): ${invalidHStatements.join(', ')}`
      };
    }
    return { valid: true, message: '' };
  }

  // Handle array of H statements
  if (Array.isArray(value)) {
    const invalidHStatements = value.filter((h) => !hazardPhrases[h]);

    if (invalidHStatements.length > 0) {
      return {
        valid: false,
        message: `Invalid H statement(s): ${invalidHStatements.join(', ')}`
      };
    }
    return { valid: true, message: '' };
  }

  // Handle string with comma- or dash-separated H statements
  if (typeof value === 'string') {
    const hStatementsList = value.split(/[,-]/).map((h) => h.trim());
    const invalidHStatements = hStatementsList.filter((h) => {
      if (!h) return false; // Skip empty entries
      // Check if it's a valid H statement code
      return !Object.keys(hazardPhrases).some((key) => key === h);
    });

    if (invalidHStatements.length > 0) {
      return {
        valid: false,
        message: `Invalid H statement(s): ${invalidHStatements.join(', ')}`
      };
    }
    return { valid: true, message: '' };
  }

  return {
    valid: false,
    message: 'H statements must be an object, array, or a string'
  };
};

/**
 * Validates P statements (precautionary phrases)
 * @param {Object|string} value - The P statements to validate
 * @returns {Promise<Object>} - Promise resolving to { valid: boolean, message: string }
 */
export const validatePStatements = async (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // Empty values are considered valid
  }

  // Load precautionary phrases if not already loaded
  const precautionaryPhrases = await loadPrecautionaryPhrases();

  // Handle object with P statement keys
  if (typeof value === 'object' && !Array.isArray(value)) {
    const invalidPStatements = Object.keys(value).filter((key) => !precautionaryPhrases[key]);

    if (invalidPStatements.length > 0) {
      return {
        valid: false,
        message: `Invalid P statement(s): ${invalidPStatements.join(', ')}`
      };
    }
    return { valid: true, message: '' };
  }

  // Handle array of P statements
  if (Array.isArray(value)) {
    const invalidPStatements = value.filter((p) => !precautionaryPhrases[p]);

    if (invalidPStatements.length > 0) {
      return {
        valid: false,
        message: `Invalid P statement(s): ${invalidPStatements.join(', ')}`
      };
    }
    return { valid: true, message: '' };
  }

  // Handle string with comma- or dash-separated P statements
  if (typeof value === 'string') {
    const pStatementsList = value.split(/[,-]/).map((p) => p.trim());
    const invalidPStatements = pStatementsList.filter((p) => {
      if (!p) return false; // Skip empty entries
      // Check if it's a valid P statement code
      return !Object.keys(precautionaryPhrases).some((key) => key === p);
    });

    if (invalidPStatements.length > 0) {
      return {
        valid: false,
        message: `Invalid P statement(s): ${invalidPStatements.join(', ')}`
      };
    }
    return { valid: true, message: '' };
  }

  return {
    valid: false,
    message: 'P statements must be an object, array, or a string'
  };
};

/**
 * Validates safety phrases object (pictograms, h_statements, p_statements)
 * @param {Object} value - The safety phrases object to validate
 * @returns {Promise<Object>} - Promise resolving to { valid: boolean, message: string }
 */
export const validateSafetyPhrases = async (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, message: '' }; // Empty values are considered valid
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return {
      valid: false,
      message: 'Safety phrases must be an object'
    };
  }

  const errors = [];

  // Validate pictograms if present
  if (value.pictograms) {
    const pictogramsValidation = validatePictograms(value.pictograms);
    if (!pictogramsValidation.valid) {
      errors.push(pictogramsValidation.message);
    }
  }

  // Validate H statements if present
  if (value.h_statements) {
    const hStatementsValidation = await validateHStatements(value.h_statements);
    if (!hStatementsValidation.valid) {
      errors.push(hStatementsValidation.message);
    }
  }

  // Validate P statements if present
  if (value.p_statements) {
    const pStatementsValidation = await validatePStatements(value.p_statements);
    if (!pStatementsValidation.valid) {
      errors.push(pStatementsValidation.message);
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      message: errors.join('; ')
    };
  }

  return { valid: true, message: '' };
};

/**
 * Main validation function for chemical data fields
 * @param {any} value - The value to validate
 * @param {string} fieldName - The name of the field
 * @param {Object} options - Additional options (like data types)
 * @returns {Promise<Object>} - Promise resolving to { valid: boolean, message: string }
 */
export const validateChemicalField = async (value, fieldName, options = {}) => {
  // Skip validation for empty values if not marked as required
  if ((value === null || value === undefined || value === '') && !options.required) {
    return { valid: true, message: '' };
  }

  // Normalize field name to handle snake_case and camelCase variations
  const normalizedFieldName = fieldName.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase();

  // Route to the appropriate validator based on field name
  switch (normalizedFieldName) {
    // Date fields
    case 'ordered_date':
    case 'required_date':
    case 'expiration_date':
      return validateDate(value);

    // Status field
    case 'status':
      return validateStatus(value);

    // Amount, volume, and temperature fields
    case 'amount':
    case 'volume':
    case 'storage_temperature':
      return validateValueWithUnit(value, normalizedFieldName);

    // Safety phrases field and components
    case 'safety_phrases':
      return validateSafetyPhrases(value);

    case 'pictograms':
      return validatePictograms(value);

    case 'h_statements':
      return validateHStatements(value);

    case 'p_statements':
      return validatePStatements(value);

    // Numeric fields
    case 'price':
      // Always validate price as a number regardless of options
      if (typeof value === 'string') {
        const floatValue = parseFloat(value);
        if (Number.isNaN(floatValue)) {
          return {
            valid: false,
            message: `Value "${value}" cannot be converted to a number`
          };
        }
      } else if (typeof value !== 'number') {
        return {
          valid: false,
          message: `Value "${value}" is not a number`
        };
      }
      return { valid: true, message: '' };

    // Default case for other fields - no specific validation
    default:
      return { valid: true, message: '' };
  }
};

/**
 * Validates a chemical data object
 * @param {Object} chemicalData - The chemical data object to validate
 * @param {Object} fieldTypes - Mapping of field names to their expected types
 * @returns {Promise<Object>} - Promise resolving to { valid: boolean, errors: string[] }
 */
export const validateChemicalData = async (chemicalData, fieldTypes = {}) => {
  const errors = [];
  let isValid = true;

  // Skip validation for special fields
  const excludedFields = ['id', 'valid', 'errors', 'delete', 'safetySheetPath', 'merckProductInfo'];

  // Handle nested chemical_data structure
  const dataToValidate = Array.isArray(chemicalData.chemical_data)
    ? chemicalData.chemical_data[0]
    : chemicalData;

  // Use defaultChemicalSchemaValidation if no specific field types are provided
  const schemaToUse = Object.keys(fieldTypes).length > 0 ? fieldTypes : defaultChemicalSchemaValidation;

  // Validate each field in the chemical data using array iteration and collect promises
  const validationPromises = Object.entries(dataToValidate)
    .filter(([fieldName]) => !excludedFields.includes(fieldName))
    .map(([fieldName, value]) => {
      const options = schemaToUse[fieldName] || {};
      return validateChemicalField(value, fieldName, options).then((validation) => ({
        fieldName,
        validation
      }));
    });

  const results = await Promise.all(validationPromises);

  results.forEach(({ fieldName, validation }) => {
    if (!validation.valid) {
      isValid = false;
      errors.push(`Field "${fieldName}": ${validation.message}`);
    }
  });

  return { valid: isValid, errors };
};
