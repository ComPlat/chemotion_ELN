import React, {Component} from 'react';
import {Button, Tooltip, OverlayTrigger, DropdownButton, MenuItem} from 'react-bootstrap';
import CollectionActions from '../actions/CollectionActions';
import UIStore from '../stores/UIStore';

export default class ExportButton extends Component {
  render() {
    const {isDisabled} = this.props;
    const tooltip = (
      <Tooltip>Export Report</Tooltip>
    );

    let title = <i className="fa fa-download"></i>

    let {currentSearchSelection} = UIStore.getState();
    let search_text = (currentSearchSelection) ? "search" : "";

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <DropdownButton title={title} disabled={isDisabled}>
          <MenuItem onClick={() => CollectionActions.downloadReport("sample")}>Export {search_text} samples</MenuItem>
          <MenuItem onClick={() => CollectionActions.downloadReport("reaction")}>Export {search_text} reaction samples</MenuItem>
          <MenuItem onClick={() => CollectionActions.downloadReport("wellplate")}>Export {search_text} wellplate samples</MenuItem>
        </DropdownButton>
      </OverlayTrigger>
    )
  }
}