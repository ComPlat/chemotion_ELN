import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';

import ModalExportCollection from 'src/components/contextActions/export/ModalExportCollection';
import ModalExportRadarCollection from 'src/components/contextActions/export/ModalExportRadarCollection';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import ModalImport from 'src/components/contextActions/import/ModalImport';
import ModalImportConfirm from 'src/components/contextActions/import/ModalImportConfirm';
import ModalImportCollection from 'src/components/contextActions/import/ModalImportCollection';

import { PermissionConst } from 'src/utilities/PermissionConst';
import { elementShowOrNew } from 'src/utilities/routesUtils';

const editMetadataFunction = () => {
  const { currentCollection, isSync } = UIStore.getState();
  const uri = isSync
    ? `/scollection/${currentCollection.id}/metadata`
    : `/collection/${currentCollection.id}/metadata`;
  Aviator.navigate(uri, { silent: true });

  elementShowOrNew({
    type: 'metadata',
    params: { collectionID: currentCollection.id }
  });
};

function CollectionManagementMenu() {
  const [modal, showModal] = useState(null);
  const [hasRadar, setHasRadar] = useState(false);
  const hideModal = () => showModal(null);

  const [isDisabled, setIsDisabled] = useState(true);

  const onUIStoreChange = ({ currentCollection, hasRadar: storeHasRadar }) => {
    if (!currentCollection) {
      setIsDisabled(true);
      return;
    }

    const {
      label, is_locked, is_shared, permission_level
    } = currentCollection;
    const newIsDisabled = (
      (label === 'All' && is_locked)
      || (is_shared === true && permission_level < PermissionConst.ImportElements)
    );
    setIsDisabled(newIsDisabled);
    setHasRadar(storeHasRadar);
  };

  useEffect(() => {
    UIStore.listen(onUIStoreChange);
    onUIStoreChange(UIStore.getState());
    return () => UIStore.unlisten(onUIStoreChange);
  }, []);

  const modalContent = ((m) => {
    switch (m) {
      case 'importSamples': return <ModalImport onHide={hideModal} />;
      case 'exportCollection': return <ModalExportCollection onHide={hideModal} />;
      case 'importCollection': return <ModalImportCollection onHide={hideModal} />;
      case 'exportCollectionToRadar': return (
        <ModalExportRadarCollection
          onHide={hideModal}
          editAction={editMetadataFunction}
        />
      );
      default: return null;
    }
  })(modal);

  return (
    <div className="mb-3 d-flex gap-2">
          <Button variant="light" onClick={ElementActions.showLiteratureDetail} title="Reference Manager">
            Reference Manager
          </Button>
          <Button
            variant="light"
            onClick={() => showModal('importSamples')}
            disabled={isDisabled}
            title="Import from spreadsheet or sdf"
          >
            Import samples to collection
          </Button>
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
          {hasRadar && (
            <>
              <Button
                variant="light"
                onClick={() => editMetadataFunction()}
                disabled={isDisabled}
                title="Edit metadata"
              >
                Edit collection metadata
              </Button>
              <Button
                variant="light"
                onClick={() => showModal('exportCollectionToRadar')}
                disabled={isDisabled}
                title="Export to RADAR"
              >
                Publish current collection via RADAR
              </Button>
            </>
          )}

      {modalContent}
      <ModalImportConfirm />
    </div>
  );
}

export default CollectionManagementMenu;
