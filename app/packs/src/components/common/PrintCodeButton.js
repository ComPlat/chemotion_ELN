import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger, Button } from 'react-bootstrap';
import PrintCodeModal from 'src/components/common/PrintCodeModal';

// Component that allows users to print a PDF.
export default function PrintCodeButton({ element }) {
  // State for the modal and preview
  const [showModal, setShowModal] = useState(false);

  // Handles the show event for the modal.
  const handleModalShow = () => {
    setShowModal(true);
  };

  // Handles the close event for the modal.
  const handleModalClose = () => {
    setShowModal(false);
  };

  // Set the tooltip text for the button
  const tooltipText = 'Print code Label';

  // Render the component
  return (
    <>
      {/* Overlay for the button */}
      <OverlayTrigger
        placement="top"
        delayShow={500}
        overlay={(
          <Tooltip id="printCode">
            {tooltipText}
          </Tooltip>
        )}
      >
        {/* Button to open the modal */}
        <Button
          className="button-right"
          id="print-code"
          pullRight
          bsStyle="default"
          disabled={element.isNew}
          bsSize="xsmall"
          onClick={handleModalShow}
        >
          <i className="fa fa-barcode fa-lg" />
        </Button>
      </OverlayTrigger>

      {/* Display the modal */}
      <PrintCodeModal showModal={showModal} handleModalClose={handleModalClose} element={element} />
    </>
  );
}

PrintCodeButton.propTypes = {
  element: PropTypes.object.isRequired,
};
