import React, { useState, useEffect } from 'react';
import { ListGroup, ListGroupItem } from 'react-bootstrap';
import PropTypes from 'prop-types';
import SafetySheetItem from 'src/components/chemicalTab/safetySheets/SafetySheetItem';
import ChemicalPropertiesSection from 'src/components/chemicalTab/safetySheets/ChemicalPropertiesSection';
import PropertiesModal from 'src/components/chemicalTab/safetySheets/PropertiesModal';
import SafetyPhrasesSection from 'src/components/chemicalTab/safetySheets/SafetyPhrasesSection';
import CopyLinkButton from 'src/components/chemicalTab/safetySheets/CopyLinkButton';
import SaveSdsButton from 'src/components/chemicalTab/safetySheets/SaveSdsButton';
import useSafetySheets from 'src/hooks/useSafetySheets';
import useChemicalProperties from 'src/hooks/useChemicalProperties';
import { removeSafetySheet } from 'src/utils/safetySheetUtils';

/**
 * Component for displaying and managing safety sheet attachments
 */
function SafetySheetsAttachments({
  safetySheets: initialSafetySheets,
  chemical,
  sample,
  handleUpdateSample,
  handleFieldChanged,
  handleSubmitSave
}) {
  // Local state for safety sheets
  const [safetySheets, setSafetySheets] = useState(initialSafetySheets);

  // Sync state with props when they change
  useEffect(() => {
    setSafetySheets(initialSafetySheets);
  }, [initialSafetySheets]);

  // Initialize hooks
  const {
    loadingSaveSafetySheets,
    loadingQuerySafetySheets,
    warningMessage: safetyWarning,
    handleFetchSafetyPhrases,
    isValidSafetySheet,
    shouldDisableSaveButton,
    handleSaveSds
  } = useSafetySheets(chemical, sample, handleFieldChanged, handleSubmitSave);

  const {
    loadChemicalProperties,
    viewChemicalPropertiesModal,
    warningMessage: propertiesWarning,
    handlePropertiesModal,
    closePropertiesModal,
    handleFetchChemicalProperties,
    getModalDataForDisplay
  } = useChemicalProperties(chemical, sample, handleUpdateSample);

  // Combined warning message from both hooks
  const warningMessage = safetyWarning || propertiesWarning;

  // Early return if no chemical data
  if (!chemical || !chemical._chemical_data || !chemical._chemical_data.length) {
    return null;
  }

  // Get safety sheets from initial props or state
  const savedSds = chemical._chemical_data[0]?.safetySheetPath;
  const sdsStatus = safetySheets.length ? safetySheets : savedSds;

  if (!Array.isArray(sdsStatus)) {
    console.error('sdsStatus is not an array', sdsStatus);
    return null;
  }

  // Override the hook's handleRemove to work with our state
  const handleRemoveWithState = (index, document) => {
    const updatedSheets = removeSafetySheet(
      sdsStatus,
      index,
      document,
      chemical,
      handleFieldChanged,
      handleSubmitSave
    );
    setSafetySheets(updatedSheets);
  };

  /**
   * Render the chemical properties section
   * @param {string} vendor - The vendor name
   * @returns {React.Element} - The chemical properties component
   */
  const renderChemicalProperties = (vendor) => (
    <ChemicalPropertiesSection
      vendor={vendor}
      loadingQuerySafetySheets={loadingQuerySafetySheets}
      loadChemicalProperties={loadChemicalProperties}
      fetchChemicalProperties={handleFetchChemicalProperties}
      handlePropertiesModal={handlePropertiesModal}
    />
  );

  /**
   * Render the safety phrases section
   * @param {string} vendor - The vendor name
   * @returns {React.Element} - The safety phrases component
   */
  const renderSafetyPhrases = (vendor) => (
    <SafetyPhrasesSection
      vendor={vendor}
      fetchSafetyPhrases={handleFetchSafetyPhrases}
    />
  );

  /**
   * Render the save button
   * @param {Object} sdsInfo - Safety data sheet info
   * @param {number} index - Index in the list
   * @returns {React.Element} - The save button component
   */
  const renderSaveButton = (sdsInfo, index) => (
    <SaveSdsButton
      sdsInfo={sdsInfo}
      index={index}
      loadingSaveSafetySheets={loadingSaveSafetySheets}
      isDisabled={shouldDisableSaveButton(sdsInfo, index)}
      onSave={handleSaveSds}
    />
  );

  /**
   * Render the check mark button
   * @param {Object} document - The document
   * @returns {React.Element|null} - The check mark or null
   */
  const renderCheckMark = (document) => {
    if (document.alfa_link) {
      return shouldDisableSaveButton(document, 0) && document.alfa_product_number
        ? <i className="fa fa-check-circle" data-tooltip="Saved" />
        : null;
    }
    if (document.merck_link) {
      return shouldDisableSaveButton(document, 0) && document.merck_product_number
        ? <i className="fa fa-check-circle" data-tooltip="Saved" />
        : null;
    }
    return null;
  };

  /**
   * Render the copy button
   * @param {Object} document - The document to render copy button for
   * @returns {React.Element} - The copy button component
   */
  const renderCopyButton = (document) => (
    <CopyLinkButton
      chemical={chemical}
      document={document}
    />
  );

  /**
   * Map safety sheets to components
   */
  const renderSafetySheets = () => {
    return sdsStatus.map((document, index) => {
      if (!isValidSafetySheet(document)) return null;
      
      return (
        <div className="mt-3 w-100" key={index}>
          <ListGroupItem className="p-3 safety-sheet-width">
            <SafetySheetItem
              document={document}
              index={index}
              handleRemove={handleRemoveWithState}
              copyButton={renderCopyButton}
              saveSafetySheetsButton={renderSaveButton}
              renderChemicalProperties={renderChemicalProperties}
              querySafetyPhrases={renderSafetyPhrases}
              checkMarkButton={renderCheckMark}
            />
          </ListGroupItem>
        </div>
      );
    });
  };

  return (
    <div data-component="SafetySheetsAttachments">
      <ListGroup className="my-3 overflow-auto">
        {renderSafetySheets()}
      </ListGroup>

      {warningMessage && (
        <div className="text-danger">
          {warningMessage}
        </div>
      )}

      <PropertiesModal
        show={viewChemicalPropertiesModal}
        onClose={closePropertiesModal}
        title="Fetched Chemical Properties"
        propertiesData={getModalDataForDisplay()}
      />
    </div>
  );
}

SafetySheetsAttachments.propTypes = {
  safetySheets: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({})
  ])),
  chemical: PropTypes.shape({
    _chemical_data: PropTypes.arrayOf(PropTypes.shape({
      safetySheetPath: PropTypes.arrayOf(PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({})
      ]))
    })),
    isNew: PropTypes.bool
  }).isRequired,
  sample: PropTypes.shape({
    id: PropTypes.number,
    xref: PropTypes.shape({
      cas: PropTypes.string,
      flash_point: PropTypes.shape({}),
      form: PropTypes.string,
      color: PropTypes.string,
      refractive_index: PropTypes.string,
      solubility: PropTypes.string
    }),
    updateRange: PropTypes.func,
    density: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  handleUpdateSample: PropTypes.func.isRequired,
  handleFieldChanged: PropTypes.func.isRequired,
  handleSubmitSave: PropTypes.func.isRequired
};

SafetySheetsAttachments.defaultProps = {
  safetySheets: []
};

export default SafetySheetsAttachments;
