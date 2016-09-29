import React, {Component} from 'react';
import {OverlayTrigger, Dropdown, Button, MenuItem, Tooltip, Glyphicon}
  from 'react-bootstrap';
import Utils from '../utils/Functions';

const ExportImportButton = ({isDisabled, importFunction, uiState}) => {
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
          <MenuItem onSelect={() => exportSelections(uiState)}>
            Export samples from selection
          </MenuItem>
          <MenuItem divider />
          <MenuItem onSelect={() => importFunction()}>
            Import samples to collection
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    </OverlayTrigger>
  )
}

const exportSelections = (uiState) => {
  const { currentTab, currentCollection, sample, reaction, wellplate } = uiState;
  let url_params;
  switch(currentTab) {
    case 1:
      url_params = "type=sample" + selectedStringfy(sample, currentCollection);
      break;
    case 2:
      url_params = "type=reaction" + selectedStringfy(reaction, currentCollection);
      break;
    case 3:
      url_params = "type=wellplate" + selectedStringfy(wellplate, currentCollection);
      break;
  }
  Utils.downloadFile({ contents: "api/v1/reports/export_samples_from_selections?" + url_params });
}

const selectedStringfy = (input, currentCollection) => {
  const { checkedIds, uncheckedIds, checkedAll } = input;
  return "&checkedIds=" + checkedIds.toArray() +
          "&uncheckedIds=" + uncheckedIds.toArray() +
          "&checkedAll=" + checkedAll +
          "&currentCollection=" + currentCollection.id
}

export default ExportImportButton
