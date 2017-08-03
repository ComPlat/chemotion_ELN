import React from 'react';
import {ButtonGroup, Button} from 'react-bootstrap';
import ElementActions from '../actions/ElementActions';

export default class ReportButton extends React.Component {
  showReportContainer() {
    ElementActions.showReportContainer();
  }

  render() {
    return (
      <ButtonGroup>
        <Button bsStyle="success" onClick={() => this.showReportContainer()} >
          <i className="fa fa-file-text-o" style={{marginRight: 4}}></i>
          <i className="fa fa-pencil"></i>
        </Button>
        </ButtonGroup>
    )
  }
}
