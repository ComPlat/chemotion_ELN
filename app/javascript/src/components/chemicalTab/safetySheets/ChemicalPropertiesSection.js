import React from 'react';
import PropTypes from 'prop-types';
import {
  InputGroup, Button, OverlayTrigger, Tooltip
} from 'react-bootstrap';

/**
 * Component for displaying and managing chemical properties section
 */
function ChemicalPropertiesSection({
  vendor,
  loadingQuerySafetySheets,
  loadChemicalProperties,
  fetchChemicalProperties,
  handlePropertiesModal
}) {
  const isLoading = loadChemicalProperties.loading && loadChemicalProperties.vendor === vendor;

  return (
    <div className="w-100 mt-0 ms-2">
      <InputGroup>
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id="renderChemProp">
              Info, if any found, will be copied to properties fields in sample properties tab
            </Tooltip>
          )}
        >
          <Button
            id="fetch-properties"
            onClick={() => fetchChemicalProperties(vendor)}
            disabled={!!loadingQuerySafetySheets || !!loadChemicalProperties.loading}
            variant="light"
          >
            {isLoading ? (
              <div>
                <i className="fa fa-spinner fa-pulse fa-fw" />
                <span>Loading...</span>
              </div>
            ) : 'fetch Chemical Properties'}
          </Button>
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="viewChemProp">click to view fetched chemical properties</Tooltip>}
        >
          <Button
            active
            onClick={() => handlePropertiesModal(vendor)}
            variant="light"
          >
            <i className="fa fa-file-text" />
          </Button>
        </OverlayTrigger>
      </InputGroup>
    </div>
  );
}

ChemicalPropertiesSection.propTypes = {
  vendor: PropTypes.string.isRequired,
  loadingQuerySafetySheets: PropTypes.bool.isRequired,
  loadChemicalProperties: PropTypes.shape({
    loading: PropTypes.bool,
    vendor: PropTypes.string
  }).isRequired,
  fetchChemicalProperties: PropTypes.func.isRequired,
  handlePropertiesModal: PropTypes.func.isRequired
};

export default ChemicalPropertiesSection;