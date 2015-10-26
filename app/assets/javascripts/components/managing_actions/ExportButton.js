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
          <MenuItem onClick={() => CollectionActions.downloadReportCollectionSamples()}>Export samples from collection</MenuItem>
          <MenuItem onClick={() => CollectionActions.downloadReportCollectionReactions()}>Export samples from collection reactions</MenuItem>
          <MenuItem onClick={() => CollectionActions.downloadReportCollectionWellplates()}>Export samples from collection wellplates</MenuItem>
        </DropdownButton>
      </OverlayTrigger>
    )
  }
}