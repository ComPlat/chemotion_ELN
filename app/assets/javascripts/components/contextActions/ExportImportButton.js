import React, {Component} from 'react';
import {OverlayTrigger, Dropdown, Button, MenuItem, Tooltip, Glyphicon}
  from 'react-bootstrap';
import ElementActions from '../actions/ElementActions';
import ModalImport from './ModalImport';
import ModalExport from './ModalExport';

const ExportImportButton = ({isDisabled, updateModalProps}) => {
  const tooltip = (<Tooltip id="export_button">Import Export</Tooltip>)
  const title =
    <div>
      <Glyphicon bsSize="small" glyph="import"/> <Glyphicon bsSize="small" glyph="export"/>
    </div>

  return (
    <OverlayTrigger placement="bottom" overlay={tooltip}>
      <Dropdown id='export-dropdown' title={title} disabled={isDisabled}>
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
    </OverlayTrigger>
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
  const title = "Select Export columns";
  const component = ModalExport;
  const modalProps = {
    show: true,
    title,
    component,
  };
  updateModalProps(modalProps);
}

export default ExportImportButton
