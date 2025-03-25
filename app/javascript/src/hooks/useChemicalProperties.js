import { useState } from 'react';
import {
  fetchChemicalProperties,
  mapToSampleProperties,
  getPropertiesModalData,
  savePropertiesToChemical
} from 'src/utils/chemicalPropertiesUtils';

/**
 * Custom hook for managing chemical properties state and actions
 * @param {Object} chemical - The chemical data
 * @param {Object} sample - The sample data
 * @param {Function} handleUpdateSample - Function to update sample
 * @returns {Object} - Chemical properties state and actions
 */
const useChemicalProperties = (chemical, sample, handleUpdateSample) => {
  const [loadChemicalProperties, setLoadChemicalProperties] = useState({ loading: false, vendor: '' });
  const [viewChemicalPropertiesModal, setViewChemicalPropertiesModal] = useState(false);
  const [viewModalForVendor, setViewModalForVendor] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  /**
   * Handles opening the properties modal for a vendor
   * @param {string} vendor - The vendor name
   */
  const handlePropertiesModal = (vendor) => {
    setViewChemicalPropertiesModal(true);
    setViewModalForVendor(vendor);
  };

  /**
   * Closes the properties modal
   */
  const closePropertiesModal = () => {
    setViewChemicalPropertiesModal(false);
    setViewModalForVendor('');
  };

  /**
   * Gets the product link for a vendor
   * @param {string} vendor - The vendor name
   * @returns {string} - The product link
   */
  const getProductLink = (vendor) => {
    if (!chemical || !chemical._chemical_data?.[0]) return '';

    if (vendor === 'thermofischer') {
      return chemical._chemical_data[0].alfaProductInfo
        ? chemical._chemical_data[0].alfaProductInfo.productLink
        : '';
    } else if (vendor === 'merck') {
      return chemical._chemical_data[0].merckProductInfo
        ? chemical._chemical_data[0].merckProductInfo.productLink
        : '';
    }
    
    return '';
  };

  /**
   * Handles fetching chemical properties for a vendor
   * @param {string} vendor - The vendor name
   */
  const handleFetchChemicalProperties = async (vendor) => {
    setLoadChemicalProperties({ vendor, loading: true });
    setWarningMessage('');

    const productLink = getProductLink(vendor);
    const warningMsg = 'Please fetch and save corresponding safety data sheet first';

    try {
      const result = await fetchChemicalProperties(productLink);
      
      if (result === 'Could not find additional chemical properties' || result === null) {
        setWarningMessage(warningMsg);
      } else {
        const saved = savePropertiesToChemical(chemical, vendor, result);
        if (saved) {
          mapToSampleProperties(chemical, sample, vendor, handleUpdateSample);
        }
      }
    } catch (error) {
      console.error('Error fetching chemical properties:', error);
    } finally {
      setLoadChemicalProperties({ vendor: '', loading: false });
    }
  };

  /**
   * Gets the data to display in the properties modal
   * @returns {string} - The formatted properties data
   */
  const getModalDataForDisplay = () => {
    return getPropertiesModalData(chemical, viewModalForVendor);
  };

  return {
    loadChemicalProperties,
    viewChemicalPropertiesModal,
    viewModalForVendor,
    warningMessage,
    setWarningMessage,
    handlePropertiesModal,
    closePropertiesModal,
    handleFetchChemicalProperties,
    getModalDataForDisplay
  };
};

export default useChemicalProperties; 