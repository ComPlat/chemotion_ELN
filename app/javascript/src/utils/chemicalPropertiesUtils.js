import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';

/**
 * Fetches chemical properties from the API
 * @param {string} productLink - Link to product
 * @returns {Promise<Object>} - Chemical properties data
 */
export const fetchChemicalProperties = async (productLink) => {
  try {
    return await ChemicalFetcher.chemicalProperties(productLink);
  } catch (error) {
    console.error('Error fetching chemical properties:', error);
    return null;
  }
};

/**
 * Maps properties data to sample properties
 * @param {Object} chemical - The chemical data
 * @param {Object} sample - The sample to update
 * @param {string} vendor - The vendor name
 * @param {Function} handleUpdateSample - Function to update sample
 */
export const mapToSampleProperties = (chemical, sample, vendor, handleUpdateSample) => {
  if (!chemical || !sample) return;

  const chemicalData = chemical._chemical_data?.[0] || {};
  let properties = {};

  if (vendor === 'thermofischer' && chemicalData.alfaProductInfo) {
    properties = chemicalData.alfaProductInfo.properties || {};
  } else if (vendor === 'merck' && chemicalData.merckProductInfo) {
    properties = chemicalData.merckProductInfo.properties || {};
  }

  // Apply boiling and melting points
  updateSampleRangeProperty(sample, 'boiling_point', properties.boiling_point);
  updateSampleRangeProperty(sample, 'melting_point', properties.melting_point);

  // Set flash point
  if (properties.flash_point) {
    sample.xref.flash_point = {
      unit: '°C',
      value: properties.flash_point
    };
  }

  // Set density
  const densityNumber = properties.density?.match(/[0-9.]+/g);
  if (densityNumber) {
    sample.density = densityNumber[0];
  }

  // Set other properties
  sample.xref.form = properties.form || sample.xref.form;
  sample.xref.color = properties.color || sample.xref.color;
  sample.xref.refractive_index = properties.refractive_index || sample.xref.refractive_index;
  sample.xref.solubility = properties.solubility || sample.xref.solubility;

  // Update the sample in both the parent component and the store
  handleUpdateSample(sample);
  ElementActions.updateSample(sample, false);
};

/**
 * Updates a range property on a sample
 * @param {Object} sample - The sample to update
 * @param {string} propertyName - Name of the property to update
 * @param {string} propertyValue - Value to parse for the range
 */
const updateSampleRangeProperty = (sample, propertyName, propertyValue) => {
  if (!propertyValue) return;

  const rangeValues = propertyValue.replace(/°C?/g, '').trim().split('-');
  // Replace hyphen with minus sign and parse
  const lowerBound = parseFloat(rangeValues[0].replace('−', '-')) || Number.NEGATIVE_INFINITY;
  const upperBound = rangeValues.length === 2
    ? parseFloat(rangeValues[1].replace('−', '-'))
    : Number.POSITIVE_INFINITY;

  sample.updateRange(propertyName, lowerBound, upperBound);
};

/**
 * Gets formatted chemical properties data for display
 * @param {Object} chemical - The chemical data
 * @param {string} vendor - The vendor name
 * @returns {string} - Formatted properties data
 */
export const getPropertiesModalData = (chemical, vendor) => {
  if (!chemical || !chemical._chemical_data?.[0]) {
    return 'Please fetch chemical properties first to view results';
  }

  let fetchedProperties = 'Please fetch chemical properties first to view results';
  const chemicalData = chemical._chemical_data[0];

  if (vendor === 'thermofischer' && chemicalData.alfaProductInfo?.properties) {
    fetchedProperties = JSON.stringify(chemicalData.alfaProductInfo.properties, null, '\n');
  } else if (vendor === 'merck' && chemicalData.merckProductInfo?.properties) {
    fetchedProperties = JSON.stringify(chemicalData.merckProductInfo.properties, null, '\n');
  }

  return fetchedProperties;
};

/**
 * Saves properties data to chemical
 * @param {Object} chemical - The chemical data
 * @param {string} vendor - The vendor name
 * @param {Object} result - The properties data to save
 * @returns {boolean} - Whether the save was successful
 */
export const savePropertiesToChemical = (chemical, vendor, result) => {
  if (!chemical || !result) return false;

  try {
    if (vendor === 'thermofischer' && chemical._chemical_data?.[0]) {
      if (!chemical._chemical_data[0].alfaProductInfo) {
        chemical._chemical_data[0].alfaProductInfo = {};
      }
      chemical._chemical_data[0].alfaProductInfo.properties = result;
      return true;
    } else if (vendor === 'merck' && chemical._chemical_data?.[0]?.merckProductInfo) {
      chemical._chemical_data[0].merckProductInfo.properties = result;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error saving properties to chemical:', error);
    return false;
  }
};

export default {
  fetchChemicalProperties,
  mapToSampleProperties,
  getPropertiesModalData,
  savePropertiesToChemical
}; 