import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Button, MenuItem, Glyphicon } from 'react-bootstrap';

import CollectionActions from '../actions/CollectionActions';
import ElementActions from '../actions/ElementActions';
import UIActions from '../actions/UIActions';
import UIStore from '../stores/UIStore';
import ModalImport from './ModalImport';
import ModalImportChemScanner from './ModalImportChemScanner';
import ModalExport from './ModalExport';
import ModalReactionExport from './ModalReactionExport';
import ModalExportCollection from './ModalExportCollection';
import ModalExportRadarCollection from './ModalExportRadarCollection';
import ModalImportCollection from './ModalImportCollection';
import { elementShowOrNew } from '../routesUtils'

const ExportImportButton = ({ isDisabled, updateModalProps, customClass }) => (
  <Dropdown id='export-dropdown'>
    <Dropdown.Toggle className={customClass}>
      <Glyphicon glyph="import"/> <Glyphicon glyph="export"/>
    </Dropdown.Toggle>
    <Dropdown.Menu>
      <MenuItem onSelect={() => exportFunction(updateModalProps)}
        title='Export to spreadsheet'>
        Export samples from selection
      </MenuItem>
      <MenuItem onSelect={() => exportReactionFunction(updateModalProps)}
        title='Export reaction smiles to csv'>
        Export reactions from selection
      </MenuItem>
      <MenuItem divider />
      <MenuItem onSelect={() => importSampleFunction(updateModalProps)} disabled={isDisabled}
        title='Import from spreadsheet or sdf'>
        Import samples to collection
      </MenuItem>
      <MenuItem divider />
      <MenuItem onSelect={() => exportCollectionFunction(updateModalProps)}
        title='Export as ZIP archive'>
        Export collections
      </MenuItem>
      <MenuItem onSelect={() => importCollectionFunction(updateModalProps)}
        title='Import collections from ZIP archive'>
        Import collections
      </MenuItem>
      <MenuItem divider />
      <MenuItem onSelect={() => editMetadataFunction()}
                disabled={isDisabled}
                title='Edit metadata'>
        Edit collection metadata
      </MenuItem>
      <MenuItem onSelect={() => exportCollectionToRadarFunction(updateModalProps)} disabled={isDisabled}
        title='Export to RADAR'>
        Archive current collection to RADAR
      </MenuItem>
      {/* <MenuItem onSelect={() => importChemScannerFunction(updateModalProps)} disabled={isDisabled} */}
      {/*   title='Import from Docs'> */}
      {/*   Import elements from Docs */}
      {/* </MenuItem> */}
    </Dropdown.Menu>
  </Dropdown>
);

ExportImportButton.propTypes = {
  isDisabled: PropTypes.bool,
  customClass: PropTypes.string,
};

ExportImportButton.defaultProps = {
  isDisabled: false,
  customClass: null,
};

const importSampleFunction = (updateModalProps) => {
  const title = "Import Samples from File";
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

const importChemScannerFunction = (updateModalProps) => {
  const title = 'Import Elements from Docs';
  const component = ModalImportChemScanner;
  const listSharedCollections = false;
  const modalProps = {
    show: true,
    title,
    component,
    customModal: 'importChemDrawModal',
    listSharedCollections,
  };

  updateModalProps(modalProps);
};

const exportFunction = (updateModalProps) => {
  const title = "Select Data to Export";
  const component = ModalExport;
  const modalProps = {
    show: true,
    title,
    component,
    customModal: "exportModal"
  };
  updateModalProps(modalProps);
}

const exportReactionFunction = (updateModalProps) => {
  const component = ModalReactionExport;
  const modalProps = {
    show: true,
    title: "Reaction Smiles Export",
    component,
    customModal: "exportModal"
  };
  updateModalProps(modalProps);
}

const exportCollectionFunction = (updateModalProps) => {
  const title = "Export Collections as ZIP archive";
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
}

const importCollectionFunction = (updateModalProps) => {
  const title = "Import Collections from ZIP archive";
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
    Aviator.navigate(uri, { silent: true} );

    elementShowOrNew({
      type: 'metadata',
      params: { collectionID: currentCollection.id }
    });
}

const exportCollectionToRadarFunction = (updateModalProps) => {
  const title = "Archive current Collection to RADAR";
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

export default ExportImportButton
