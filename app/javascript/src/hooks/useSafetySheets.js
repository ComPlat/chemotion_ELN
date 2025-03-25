import { useState } from 'react';
import { 
  fetchSafetySheets, 
  fetchSafetyPhrases, 
  saveSafetySheetFile,
  removeSafetySheet
} from 'src/utils/safetySheetUtils';

/**
 * Custom hook for managing safety sheets state and actions
 * @param {Object} chemical - The chemical data
 * @param {Object} sample - The sample data
 * @param {Function} handleFieldChanged - Function to update parent component state
 * @param {Function} handleSubmitSave - Function to save data
 * @returns {Object} - Safety sheets state and actions
 */
const useSafetySheets = (chemical, sample, handleFieldChanged, handleSubmitSave) => {
  const [safetySheets, setSafetySheets] = useState([]);
  const [checkSaveIconThermofischer, setCheckSaveIconThermofischer] = useState(false);
  const [checkSaveIconMerck, setCheckSaveIconMerck] = useState(false);
  const [loadingSaveSafetySheets, setLoadingSaveSafetySheets] = useState(false);
  const [loadingQuerySafetySheets, setLoadingQuerySafetySheets] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  /**
   * Gets the initial safety sheets from the chemical data or state
   * @returns {Array} - Safety sheets array
   */
  const getSafetySheets = () => {
    if (!chemical || !chemical._chemical_data || !chemical._chemical_data.length) {
      return [];
    }

    const savedSds = chemical._chemical_data[0]?.safetySheetPath;
    return safetySheets.length ? safetySheets : savedSds || [];
  };

  /**
   * Updates the check mark for a vendor
   * @param {string} vendor - The vendor name
   */
  const handleCheckMark = (vendor) => {
    if (vendor === 'Thermofisher') {
      setCheckSaveIconThermofischer(true);
    } else if (vendor === 'Merck') {
      setCheckSaveIconMerck(true);
    }
  };

  /**
   * Resets check mark for a document
   * @param {Object} document - The document
   */
  const updateCheckMark = (document) => {
    if (document.alfa_link) {
      setCheckSaveIconThermofischer(false);
    } else if (document.merck_link) {
      setCheckSaveIconMerck(false);
    }
  };

  /**
   * Handles saving a safety sheet
   * @param {Object} productInfo - Product information
   */
  const handleSaveSds = async (productInfo) => {
    let vendorProduct;
    if (productInfo.vendor === 'Thermofisher') {
      vendorProduct = 'alfaProductInfo';
    } else if (productInfo.vendor === 'Merck') {
      vendorProduct = 'merckProductInfo';
      setLoadingSaveSafetySheets(true);
    }

    const cas = sample.xref?.cas ?? '';
    // Update chemical data before saving to the database
    handleFieldChanged(vendorProduct, productInfo);

    const params = {
      sample_id: sample.id,
      cas,
      chemical_data: chemical._chemical_data,
      vendor_product: vendorProduct
    };

    const success = await saveSafetySheetFile(
      params,
      productInfo,
      chemical,
      handleFieldChanged,
      handleSubmitSave,
      handleCheckMark
    );

    setLoadingSaveSafetySheets(false);
    return success;
  };

  /**
   * Handles removing a safety sheet
   * @param {number} index - Index of the sheet to remove
   * @param {Object} document - The document to remove
   */
  const handleRemove = (index, document) => {
    const updatedSheets = removeSafetySheet(
      safetySheets,
      index,
      document,
      chemical,
      handleFieldChanged,
      handleSubmitSave
    );

    setSafetySheets(updatedSheets);
    setWarningMessage('');
    updateCheckMark(document);
  };

  /**
   * Fetches safety phrases for a vendor
   * @param {string} vendor - The vendor name
   */
  const handleFetchSafetyPhrases = async (vendor) => {
    setLoadingQuerySafetySheets(true);

    const params = {
      vendor,
      id: sample.id
    };

    setWarningMessage('');
    const resultMessage = await fetchSafetyPhrases(params, handleFieldChanged);

    if (resultMessage) {
      setWarningMessage(resultMessage);
    }

    setLoadingQuerySafetySheets(false);
  };

  /**
   * Fetches safety sheets from the API
   * @param {Object} params - Query parameters
   */
  const handleFetchSafetySheets = async (params) => {
    setLoadingQuerySafetySheets(true);

    const results = await fetchSafetySheets(params);
    setSafetySheets(results);

    setLoadingQuerySafetySheets(false);
    return results;
  };

  /**
   * Checks if a safety sheet is valid for display
   * @param {Object} document - The document to check
   * @returns {boolean} - Whether the document is valid
   */
  const isValidSafetySheet = (document) => {
    return document !== 'Could not find safety data sheet from Thermofisher'
      && document !== 'Could not find safety data sheet from Merck';
  };

  /**
   * Determines if a save button should be disabled based on check mark status
   * @param {Object} sdsInfo - Safety data sheet info
   * @param {number} index - Index in the list
   * @returns {boolean} - Whether the save button should be disabled
   */
  const shouldDisableSaveButton = (sdsInfo, index) => {
    if (!chemical || !chemical._chemical_data) return true;

    const { safetySheetPath } = chemical._chemical_data[0] || {};

    if (sdsInfo.alfa_link !== undefined) {
      const hasAlfaLink = Boolean(safetySheetPath?.[index]?.alfa_link);
      return checkSaveIconThermofischer || hasAlfaLink;
    } else if (sdsInfo.merck_link !== undefined) {
      const hasMerckLink = Boolean(safetySheetPath?.[index]?.merck_link);
      return checkSaveIconMerck || hasMerckLink;
    }

    return true;
  };

  return {
    safetySheets,
    setSafetySheets,
    checkSaveIconThermofischer,
    checkSaveIconMerck,
    loadingSaveSafetySheets,
    loadingQuerySafetySheets,
    warningMessage,
    setWarningMessage,
    getSafetySheets,
    handleCheckMark,
    updateCheckMark,
    handleSaveSds,
    handleRemove,
    handleFetchSafetyPhrases,
    handleFetchSafetySheets,
    isValidSafetySheet,
    shouldDisableSaveButton
  };
};

export default useSafetySheets; 