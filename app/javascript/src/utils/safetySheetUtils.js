import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';

/**
 * Fetches safety sheets from the API
 * @param {Object} params - Query parameters
 * @returns {Promise} - Promise with the safety sheets data
 */
export const fetchSafetySheets = async (params) => {
  try {
    const result = await ChemicalFetcher.fetchSafetySheets(params);
    const obj = JSON.parse(result);
    return obj !== null && obj !== undefined ? Object.values(obj) : ['mockValue'];
  } catch (error) {
    console.error('Error fetching safety sheets:', error);
    return [];
  }
};

/**
 * Fetches safety phrases for a specific vendor
 * @param {Object} params - The parameters for fetching safety phrases
 * @param {Function} handleFieldChanged - Function to update parent component state
 * @returns {Promise<string>} - The warning message if there is one
 */
export const fetchSafetyPhrases = async (params, handleFieldChanged) => {
  try {
    const result = await ChemicalFetcher.safetyPhrases(params);
    const warningMsg = 'Please fetch and save corresponding safety data sheet first';

    if (result === warningMsg || result === 204) {
      return warningMsg;
    } else if (result === 'Could not find H and P phrases') {
      return result;
    } else {
      handleFieldChanged('safetyPhrases', result);
      return '';
    }
  } catch (error) {
    console.error('Error fetching safety phrases:', error);
    return 'Error fetching safety phrases';
  }
};

/**
 * Saves a safety data sheet file
 * @param {Object} params - API parameters
 * @param {Object} productInfo - Product information
 * @param {Object} chemical - Chemical data
 * @param {Function} handleFieldChanged - Function to update parent component state
 * @param {Function} handleSubmitSave - Function to save data
 * @param {Function} handleCheckMark - Function to update check mark
 * @returns {Promise<boolean>} - Success status
 */
export const saveSafetySheetFile = async (
  params,
  productInfo,
  chemical,
  handleFieldChanged,
  handleSubmitSave,
  handleCheckMark
) => {
  try {
    const result = await ChemicalFetcher.saveSafetySheets(params);

    if (result) {
      const value = `/safety_sheets/${productInfo.productNumber}_${productInfo.vendor}.pdf`;
      const chemicalData = chemical._chemical_data;
      const pathArr = [];
      const pathParams = {};

      const vendorParams = productInfo.vendor === 'Thermofisher' ? 'alfa_link' : 'merck_link';
      pathParams[vendorParams] = value;

      if (chemicalData[0].safetySheetPath === undefined || chemicalData[0].safetySheetPath.length === 0) {
        pathArr.push(pathParams);
        handleFieldChanged('safetySheetPath', pathArr);
      } else if (chemicalData[0].safetySheetPath.length === 1 && chemicalData[0].safetySheetPath[0][vendorParams] === undefined) {
        chemicalData[0].safetySheetPath.push(pathParams);
      } else if (chemicalData[0].safetySheetPath.length === 1 && chemicalData[0].safetySheetPath[0][vendorParams] !== undefined && chemicalData[0].safetySheetPath[0][vendorParams] !== value) {
        chemicalData[0].safetySheetPath[0][vendorParams] = value;
      } else {
        for (let i = 0; i < chemicalData[0].safetySheetPath.length; i += 1) {
          if (chemicalData[0].safetySheetPath[i][vendorParams] !== undefined && chemicalData[0].safetySheetPath[i][vendorParams] !== value) {
            chemicalData[0].safetySheetPath[i][vendorParams] = value;
          }
        }
      }

      // Mark chemical as not new and save it
      chemical.isNew = false;
      handleSubmitSave();
      handleCheckMark(productInfo.vendor);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error saving safety sheet:', error);
    return false;
  }
};

/**
 * Removes a safety sheet from the list
 * @param {Array} safetySheets - List of safety sheets
 * @param {number} index - Index of the sheet to remove
 * @param {Object} document - The safety sheet document
 * @param {Object} chemical - Chemical data
 * @param {Function} handleFieldChanged - Function to update fields
 * @param {Function} handleSubmitSave - Function to save data
 * @returns {Array} - Updated safety sheets list
 */
export const removeSafetySheet = (
  safetySheets,
  index,
  document,
  chemical,
  handleFieldChanged,
  handleSubmitSave
) => {
  const newSafetySheets = [...safetySheets];
  newSafetySheets.splice(index, 1);

  // Update parent component state
  handleFieldChanged('safetySheets', newSafetySheets);

  // Handle chemical data updates
  if (chemical && chemical._chemical_data && chemical._chemical_data[0]) {
    const parameters = chemical._chemical_data[0];
    const path = chemical._chemical_data[0].safetySheetPath;

    if (path && path.length > 0) {
      const { safetySheetPath } = chemical._chemical_data[0];
      const alfaIndex = safetySheetPath.findIndex((element) => element.alfa_link);
      const merckIndex = safetySheetPath.findIndex((element) => element.merck_link);

      if (alfaIndex !== -1 && document.alfa_link) {
        delete parameters.alfaProductInfo;
        path.splice(alfaIndex, 1);
      } else if (merckIndex !== -1 && document.merck_link) {
        delete parameters.merckProductInfo;
        path.splice(merckIndex, 1);
      }

      handleSubmitSave();
    }
  }

  return newSafetySheets;
};

export default {
  fetchSafetySheets,
  fetchSafetyPhrases,
  saveSafetySheetFile,
  removeSafetySheet
}; 