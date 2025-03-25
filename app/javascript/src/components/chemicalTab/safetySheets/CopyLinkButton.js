import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

/**
 * Component for rendering a button to copy a product link
 */
function CopyLinkButton({ chemical, document }) {
  /**
   * Generates the tooltip for clipboard button
   * @param {string} value - The value to show in tooltip
   * @returns {React.Element} - Tooltip component
   */
  const clipboardTooltip = (value) => (
    <Tooltip id="productLink_button">{`product link (${value})`}</Tooltip>
  );

  /**
   * Gets the product link value from the document or chemical data
   * @returns {string} - The product link URL
   */
  const getProductLinkValue = () => {
    let info = '';
    let value = null;

    // Get chemical data
    if (chemical && chemical._chemical_data?.length) {
      info = chemical._chemical_data[0];
    }

    // Determine which product link to use
    if (document.alfa_link !== undefined) {
      if (info.alfaProductInfo) {
        value = info.alfaProductInfo.productLink;
      } else {
        value = document.alfa_product_link || null;
      }
    } else if (info.merckProductInfo) {
      value = info.merckProductInfo.productLink;
    } else {
      value = document.merck_product_link || null;
    }

    return value;
  };

  const linkValue = getProductLinkValue();

  return (
    <OverlayTrigger placement="bottom" overlay={clipboardTooltip(linkValue)}>
      <Button active size="xsm" variant="light">
        <a href={linkValue} target="_blank" rel="noreferrer">
          <i className="fa fa-external-link" />
        </a>
      </Button>
    </OverlayTrigger>
  );
}

CopyLinkButton.propTypes = {
  chemical: PropTypes.shape({
    _chemical_data: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  document: PropTypes.shape({
    alfa_link: PropTypes.string,
    alfa_product_link: PropTypes.string,
    merck_link: PropTypes.string,
    merck_product_link: PropTypes.string
  }).isRequired
};

export default CopyLinkButton; 