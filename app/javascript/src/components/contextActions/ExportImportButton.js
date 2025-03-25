import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, ButtonGroup } from 'react-bootstrap';

import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ModalImport from 'src/components/contextActions/ModalImport';
import ModalExport from 'src/components/contextActions/ModalExport';
import ModalReactionExport from 'src/components/contextActions/ModalReactionExport';
import ModalExportCollection from 'src/components/contextActions/ModalExportCollection';
import ModalExportRadarCollection from 'src/components/contextActions/ModalExportRadarCollection';
import ModalImportCollection from 'src/components/contextActions/ModalImportCollection';
import { elementShowOrNew } from 'src/utilities/routesUtils';

const importSampleFunction = (updateModalProps, importAsChemical) => {
  const title = 'Import samples from file';
  const component = ModalImport;
  const action = ElementActions.importSamplesFromFile;
  const listSharedCollections = false;
  const modalProps = {
    show: true,
    title,
    component,
    action,
    listSharedCollections,
  };
  updateModalProps(modalProps);
};

const exportFunction = (updateModalProps) => {
  const title = 'Select Data to Export';
  const component = ModalExport;
  const modalProps = {
    show: true,
    title,
    component,
    customModal: 'modal-lg'
  };
  updateModalProps(modalProps);
};

const exportReactionFunction = (updateModalProps) => {
  const component = ModalReactionExport;
  const modalProps = {
    show: true,
    title: 'Reaction smiles export',
    component
  };
  updateModalProps(modalProps);
};

const exportCollectionFunction = (updateModalProps) => {
  const title = 'Export collections as zip archive';
  const component = ModalExportCollection;
  const action = CollectionActions.exportCollectionsToFile;
  const full = false;
  const listSharedCollections = false;

  const modalProps = {
    show: true,
    title,
    component,
    action,
    full,
    listSharedCollections,
  };

  updateModalProps(modalProps);
};

const importCollectionFunction = (updateModalProps) => {
  const title = 'Import Collections from ZIP archive';
  const component = ModalImportCollection;
  const action = CollectionActions.importCollectionsFromFile;
  const listSharedCollections = false;

  const modalProps = {
    show: true,
    title,
    component,
    action,
    listSharedCollections,
  };

  updateModalProps(modalProps);
};

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

const exportCollectionToRadarFunction = (updateModalProps) => {
  const title = 'Publish current collection via RADAR';
  const component = ModalExportRadarCollection;
  const action = CollectionActions.exportCollectionToRadar;

  const modalProps = {
    show: true,
    title,
    component,
    action,
    editAction: editMetadataFunction
  };

  updateModalProps(modalProps);
};

function ExportImportButton({ isDisabled, updateModalProps, customClass }) {
  const showRadar = UIStore.getState().hasRadar;
  return (
    <Dropdown as={ButtonGroup} id="export-dropdown">
      <Dropdown.Toggle variant="light" className={customClass}>
        <i className="fa fa-download" />
        <i className="fa fa-upload ms-1" />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item
          onClick={() => exportFunction(updateModalProps)}
          title="Export to spreadsheet"
        >
          Export samples from selection
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => exportReactionFunction(updateModalProps)}
          title="Export reaction smiles to csv"
        >
          Export reactions from selection
        </Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item
          onClick={() => importSampleFunction(updateModalProps, false)}
          disabled={isDisabled}
          title="Import from spreadsheet or sdf"
        >
          Import samples to collection
        </Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item
          onClick={() => exportCollectionFunction(updateModalProps)}
          title="Export as ZIP archive"
        >
          Export collections
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => importCollectionFunction(updateModalProps)}
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
              onClick={() => exportCollectionToRadarFunction(updateModalProps)}
              disabled={isDisabled}
              title="Export to RADAR"
            >
              Publish current collection via RADAR
            </Dropdown.Item>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

ExportImportButton.propTypes = {
  isDisabled: PropTypes.bool,
  customClass: PropTypes.string,
};

ExportImportButton.defaultProps = {
  isDisabled: false,
  customClass: null,
};

export default ExportImportButton;
