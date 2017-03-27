import React from 'react';
import {ButtonGroup, Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import ElementActions from '../actions/ElementActions';

export default class ReportButton extends React.Component {
  showReportContainer() {
    ElementActions.showReportContainer();
  }

  render() {
    const tooltip = (
      <Tooltip id="report_button">Generate report</Tooltip>
    );

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
      <ButtonGroup>
        <Button bsStyle="success" onClick={() => this.showReportContainer()} >
          <i className="fa fa-file-text-o" style={{marginRight: 4}}></i>
          <i className="fa fa-pencil"></i>
        </Button>
        </ButtonGroup>
      </OverlayTrigger>
    )
  }
}
