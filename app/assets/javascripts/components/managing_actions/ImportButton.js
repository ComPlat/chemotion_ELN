import React, {Component} from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';

export default class ImportButton extends Component {
  render() {
    const {isDisabled, onClick} = this.props;
    const tooltip = (
      <Tooltip id="import_button">Import elements</Tooltip>
    );

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button onClick={() => onClick()} disabled={isDisabled}>
          <i className="fa fa-upload"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}
