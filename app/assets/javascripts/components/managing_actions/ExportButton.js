import React, {Component} from 'react';
import {Button, Tooltip, OverlayTrigger, DropdownButton, MenuItem} from 'react-bootstrap';
import CollectionActions from '../actions/CollectionActions';

export default class ExportButton extends Component {
  render() {
    const {isDisabled} = this.props;
    const tooltip = (
      <Tooltip>Export Report</Tooltip>
    );

    let title = <i className="fa fa-download"></i>

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <DropdownButton title={title} disabled={isDisabled}>
          <MenuItem onClick={() => CollectionActions.downloadReport("sample")}>Export Samples</MenuItem>
          <MenuItem onClick={() => CollectionActions.downloadReport("reaction")}>Export Reaction Samples</MenuItem>
          <MenuItem onClick={() => CollectionActions.downloadReport("wellplate")}>Export Wellplate Samples</MenuItem>
        </DropdownButton>
      </OverlayTrigger>
    )
  }
}