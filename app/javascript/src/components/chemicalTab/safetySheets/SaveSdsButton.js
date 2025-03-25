import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

/**
 * Component for rendering a button to save safety data sheet
 */
function SaveSdsButton({
  sdsInfo,
  index,
  loadingSaveSafetySheets,
  isDisabled,
  onSave
}) {
  /**
   * Gets the product info from the safety sheet info
   * @returns {Object} - Product info object
   */
  const getProductInfo = () => {
    let vendor;
    let sdsLink;
    let productNumber;
    let productLink;

    if (sdsInfo.alfa_link !== undefined) {
      vendor = 'Thermofisher';
      sdsLink = sdsInfo.alfa_link;
      productNumber = sdsInfo.alfa_product_number;
      productLink = sdsInfo.alfa_product_link;
    } else if (sdsInfo.merck_link !== undefined) {
      vendor = 'Merck';
      sdsLink = sdsInfo.merck_link;
      productNumber = sdsInfo.merck_product_number;
      productLink = sdsInfo.merck_product_link;
    }

    return {
      vendor,
      sdsLink,
      productNumber,
      productLink
    };
  };

  const handleClick = () => {
    const productInfo = getProductInfo();
    onSave(productInfo);
  };

  return (
    <Button
      id="saveSafetySheetButton"
      size="xsm"
      variant="warning"
      disabled={isDisabled}
      onClick={handleClick}
    >
      {loadingSaveSafetySheets && sdsInfo.merck_link !== undefined
        ? (
          <div>
            <i className="fa fa-spinner fa-pulse fa-fw" />
          </div>
        )
        : <i className="fa fa-save" />}
    </Button>
  );
}

SaveSdsButton.propTypes = {
  sdsInfo: PropTypes.shape({
    alfa_link: PropTypes.string,
    alfa_product_number: PropTypes.string,
    alfa_product_link: PropTypes.string,
    merck_link: PropTypes.string,
    merck_product_number: PropTypes.string,
    merck_product_link: PropTypes.string
  }).isRequired,
  index: PropTypes.number.isRequired,
  loadingSaveSafetySheets: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired
};

export default SaveSdsButton; 