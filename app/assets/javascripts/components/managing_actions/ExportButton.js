import React, {Component} from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import CollectionActions from '../actions/CollectionActions';

export default class ExportButton extends Component {
  render() {
    const {isDisabled} = this.props;
    const tooltip = (
      <Tooltip>Export Report</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button onClick={() => CollectionActions.downloadReport()} disabled={isDisabled}>
          <i className="fa fa-download"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}