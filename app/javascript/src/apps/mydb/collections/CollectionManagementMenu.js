import React, { useState } from 'react';
import { Button } from 'react-bootstrap';

import ModalExportCollection from 'src/apps/mydb/collections/ModalExportCollection';
import ModalImportCollection from 'src/apps/mydb/collections/importSamples/ModalImportCollection';

function CollectionManagementMenu() {
  const [modal, showModal] = useState(null);
  const hideModal = () => showModal(null);

  const modalContent = ((m) => {
    switch (m) {
      case 'exportCollection': return <ModalExportCollection onHide={hideModal} />;
      case 'importCollection': return <ModalImportCollection onHide={hideModal} />;
      default: return null;
    }
  })(modal);

  return (
    <div className="mb-3 d-flex gap-2">
      <Button
        variant="light"
        onClick={() => showModal('exportCollection')}
        title="Export as ZIP archive"
      >
        Export collections
      </Button>
      <Button
        variant="light"
        onClick={() => showModal('importCollection')}
        title="Import collections from ZIP archive"
      >
        Import collections
      </Button>

      {modalContent}
    </div>
  );
}

export default CollectionManagementMenu;
