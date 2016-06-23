import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';

export default class ReportButton extends React.Component {
  createElementOfType(type) {
    Aviator.navigate(`/collection/all/${type}/new`);
  }

  render() {
    const tooltip = (
      <Tooltip id="report_button">Generate report</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button bsStyle="success" onClick={() => this.createElementOfType('report')} >
          <i className="fa fa-cogs"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}
