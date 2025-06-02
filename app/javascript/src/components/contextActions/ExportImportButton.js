import React, { useState, useEffect } from 'react';
import { Dropdown, ButtonGroup } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';

import ModalExport from 'src/components/contextActions/export/ModalExport';
import ModalReactionExport from 'src/components/contextActions/export/ModalReactionExport';
import ModalExportCollection from 'src/components/contextActions/export/ModalExportCollection';
import ModalExportRadarCollection from 'src/components/contextActions/export/ModalExportRadarCollection';

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

function ExportImportButton() {
  const [modal, showModal] = useState(null);
  const hideModal = () => showModal(null);

  const [isDisabled, setIsDisabled] = useState(true);

  const onUIStoreChange = ({ currentCollection }) => {
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
  };

  useEffect(() => {
    UIStore.listen(onUIStoreChange);
    onUIStoreChange(UIStore.getState());
    return () => UIStore.unlisten(onUIStoreChange);
  }, []);

  const modalContent = ((m) => {
    switch (m) {
      case 'export': return <ModalExport onHide={hideModal} />;
      case 'exportReaction': return <ModalReactionExport onHide={hideModal} />;
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

  const showRadar = UIStore.getState().hasRadar;
  return (
    <>
      <Dropdown as={ButtonGroup} id="export-dropdown">
        <Dropdown.Toggle variant="light">
          <i className="fa fa-download" />
          <i className="fa fa-upload ms-1" />
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
          <Dropdown.Divider />
          <Dropdown.Item
            onClick={() => showModal('importSamples')}
            disabled={isDisabled}
            title="Import from spreadsheet or sdf"
          >
            Import samples to collection
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item
            onClick={() => showModal('exportCollection')}
            title="Export as ZIP archive"
          >
            Export collections
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => showModal('importCollection')}
            title="Import collections from ZIP archive"
          >
            Import collections
          </Dropdown.Item>
          {showRadar && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item
                onClick={() => editMetadataFunction()}
                disabled={isDisabled}
                title="Edit metadata"
              >
                Edit collection metadata
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => showModal('exportCollectionToRadar')}
                disabled={isDisabled}
                title="Export to RADAR"
              >
                Publish current collection via RADAR
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>

      {modalContent}
      <ModalImportConfirm />
    </>
  );
}

export default ExportImportButton;
