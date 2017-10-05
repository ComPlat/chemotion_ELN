import React, {Component} from 'react';
import {Dropdown, Button, MenuItem, Glyphicon}
  from 'react-bootstrap';
import ElementActions from '../actions/ElementActions';
import ModalImport from './ModalImport';
import ModalExport from './ModalExport';

const ExportImportButton = ({isDisabled, updateModalProps}) => {
  return (
    <Dropdown id='export-dropdown' disabled={isDisabled} >
      <Dropdown.Toggle>
        <Glyphicon glyph="import"/> <Glyphicon glyph="export"/>
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <MenuItem onSelect={() => exportFunction(updateModalProps)}
          title='Export to spreadsheet'>
          Export samples from selection
        </MenuItem>
        <MenuItem divider />
        <MenuItem onSelect={() => importFunction(updateModalProps)}
          title='Import from spreadsheet or sdf'>
          Import samples to collection
        </MenuItem>
      </Dropdown.Menu>
    </Dropdown>
  )
}

const importFunction = (updateModalProps) => {
  const title = "Import Samples from File";
  const component = ModalImport;
  const action = ElementActions.importSamplesFromFile;
  const listSharedCollections = false
  const modalProps = {
    show: true,
    title,
    component,
    action,
    listSharedCollections,
  };
  updateModalProps(modalProps);
}

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

export default ExportImportButton
