import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Button, MenuItem, Glyphicon } from 'react-bootstrap';

import ElementActions from '../actions/ElementActions';
import UIActions from '../actions/UIActions';
import ModalImport from './ModalImport';
import ModalImportChemScanner from './ModalImportChemScanner';
import ModalExport from './ModalExport';
import ModalReactionExport from './ModalReactionExport';
import ModalCollectionExport from './ModalCollectionExport';

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
      <MenuItem onSelect={() => exportCollectionFunction(updateModalProps)} disabled={isDisabled}
        title='Export collections'>
        Export collections
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
  const component = ModalCollectionExport;
  const modalProps = {
    show: true,
    title: "Collection Export",
    component,
    customModal: "exportModal"
  };
  updateModalProps(modalProps);
}

export default ExportImportButton
