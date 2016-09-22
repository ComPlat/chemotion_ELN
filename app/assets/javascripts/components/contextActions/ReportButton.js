import React from 'react';
import {ButtonGroup, Button, Tooltip, OverlayTrigger} from 'react-bootstrap';

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
      <ButtonGroup>
        <Button bsStyle="success" onClick={() => this.createElementOfType('report')} >
          <i className="fa fa-file-text-o" style={{marginRight: 4}}></i>
          <i className="fa fa-pencil"></i>
        </Button>
        </ButtonGroup>
      </OverlayTrigger>
    )
  }
}
