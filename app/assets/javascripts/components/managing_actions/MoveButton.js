import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';

export default class MoveButton extends React.Component {
  render() {
    const {isDisabled, onClick} = this.props;
    const tooltip = (
      <Tooltip id="move_button">Move to Collection</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button bsStyle="primary" onClick={() => onClick()} disabled={isDisabled}>
          <i className="fa fa-arrow-right"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}
