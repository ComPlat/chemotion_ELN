import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger, MenuItem, DropdownButton, ButtonGroup } from 'react-bootstrap';
import PrintCodeModal from 'src/components/common/PrintCodeModal';

// Component that allows users to print a PDF.
export default function PrintCodeButton({element, analyses}) {
  // State for the modal and preview
  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [json, setJson] = useState({});

  useEffect(() => {
    // Import the file when the component mounts
    async function loadData() {
      try {
        const response = await fetch('/json/printingConfig/defaultConfig.json');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const tmpJson = await response.json();
        setJson(tmpJson);
      } catch (err) {
        console.error('Failed to fetch JSON', err);
      }
    }
    loadData();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

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

  // Create the menu items for the dropdown button
  const menuItemsAnalyses = [
    {
      key: 'smallCode',
      contents: 'small',
      text: 'Small Label',
    },
    {
      key: 'bigCode',
      contents: 'big',
      text: 'Large Label',
    },
  ];



  // Create the menu items for the split button
  const menuItems = analyses.length > 0
    ? menuItemsAnalyses
    : Object.entries(json).map(([key]) => ({
      key,
      text: key,
      contents: key,
    }));

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
        <ButtonGroup className="button-right">
          <DropdownButton
            id="print-code"
            pullRight
            bsStyle="default"
            disabled={element.isNew}
            bsSize="xsmall"
            onToggle={(isOpen, event) => { if (event) { event.stopPropagation(); } }}
            title={<i className="fa fa-barcode fa-lg" />}
          >
            {menuItems.map((e) => (
              <MenuItem
                key={e.key}
                onSelect={() => {
                  setSelectedConfig(e.contents);
                  handleModalShow();
                }}
              >
                {e.text}
              </MenuItem>
            ))}
          </DropdownButton>
        </ButtonGroup>
      </OverlayTrigger>

      {/* Display the modal */}
      <PrintCodeModal
        showModal={showModal}
        handleModalClose={handleModalClose}
        element={element}
        selectedConfig={selectedConfig}
        analyses={analyses}
      />
    </>
  );
}

PrintCodeButton.propTypes = {
  element: PropTypes.object.isRequired,
};

PrintCodeButton.defaultProps = {
  analyses: [],
};