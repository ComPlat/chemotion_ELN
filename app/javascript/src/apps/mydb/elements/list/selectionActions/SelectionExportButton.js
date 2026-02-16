import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';

import ModalExport from 'src/components/contextActions/export/ModalExport';
import ModalReactionExport from 'src/components/contextActions/export/ModalReactionExport';

function SelectionExportButton() {
  const [modal, showModal] = useState(null);
  const hideModal = () => showModal(null);

  const modalContent = ((m) => {
    switch (m) {
      case 'export': return <ModalExport onHide={hideModal} />;
      case 'exportReaction': return <ModalReactionExport onHide={hideModal} />;
      default: return null;
    }
  })(modal);

  return (
    <>
      <Dropdown id="export-dropdown">
        <Dropdown.Toggle variant="light" size="sm">
          <i className="icon-arrow-up-from-bracket me-1" />
          <span className="selection-action-text-label">Export</span>
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item
            onClick={() => showModal('export')}
            title="Export to spreadsheet"
          >
            Export samples from selection
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => showModal('exportReaction')}
            title="Export reaction smiles to csv"
          >
            Export reactions from selection
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      {modalContent}
    </>
  );
}

export default SelectionExportButton;
