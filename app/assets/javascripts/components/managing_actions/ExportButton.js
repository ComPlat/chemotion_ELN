import React, {Component} from 'react';
import {Button, Tooltip, OverlayTrigger, DropdownButton, MenuItem} from 'react-bootstrap';
import CollectionActions from '../actions/CollectionActions';

export default class ExportButton extends Component {
  render() {
    const {isDisabled} = this.props;
    const tooltip = (
      <Tooltip id="export_button">Export Report</Tooltip>
    );

    let title = <i className="fa fa-download"></i>

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <DropdownButton title={title} disabled={isDisabled}>
          <MenuItem onSelect={() => CollectionActions.downloadReportCollectionSamples()}>Export samples from collection</MenuItem>
          <MenuItem onSelect={() => CollectionActions.downloadReportCollectionReactions()}>Export samples from collection reactions</MenuItem>
          <MenuItem onSelect={() => CollectionActions.downloadReportCollectionWellplates()}>Export samples from collection wellplates</MenuItem>
        </DropdownButton>
      </OverlayTrigger>
    )
  }
}
