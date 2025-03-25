import React from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar, Button } from 'react-bootstrap';

/**
 * Component for displaying a single safety sheet item
 */
function SafetySheetItem({
  document,
  index,
  handleRemove,
  copyButton,
  saveSafetySheetsButton,
  renderChemicalProperties,
  querySafetyPhrases,
  checkMarkButton
}) {
  const isThermofisher = document.alfa_link !== undefined;
  const vendor = isThermofisher ? 'thermofischer' : 'merck';
  const title = isThermofisher 
    ? 'Safety Data Sheet from Thermofisher' 
    : 'Safety Data Sheet from Merck';
  const link = isThermofisher ? document.alfa_link : document.merck_link;

  /**
   * Handle removal of this safety sheet
   */
  const onRemove = () => {
    handleRemove(index, document);
  };

  return (
    <div className="d-flex gap-3 align-items-center">
      <div className="d-flex me-auto gap-3">
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
        >
          {title}
          {checkMarkButton(document)}
        </a>
        <ButtonToolbar className="gap-1">
          {copyButton(document)}
          {saveSafetySheetsButton(document, index)}
          <Button
            size="xsm"
            variant="danger"
            onClick={onRemove}
          >
            <i className="fa fa-trash-o" />
          </Button>
        </ButtonToolbar>
      </div>
      <div className="me-auto">
        {renderChemicalProperties(vendor)}
      </div>
      <div className="justify-content-end">
        {querySafetyPhrases(vendor)}
      </div>
    </div>
  );
}

SafetySheetItem.propTypes = {
  document: PropTypes.shape({
    alfa_link: PropTypes.string,
    merck_link: PropTypes.string,
    alfa_product_number: PropTypes.string,
    merck_product_number: PropTypes.string
  }).isRequired,
  index: PropTypes.number.isRequired,
  handleRemove: PropTypes.func.isRequired,
  copyButton: PropTypes.func.isRequired,
  saveSafetySheetsButton: PropTypes.func.isRequired,
  renderChemicalProperties: PropTypes.func.isRequired,
  querySafetyPhrases: PropTypes.func.isRequired,
  checkMarkButton: PropTypes.func.isRequired
};

export default SafetySheetItem;