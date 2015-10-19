import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';

export default class RemoveButton extends React.Component {
  render() {
    const {isDisabled, onClick} = this.props;
    const tooltip = (
      <Tooltip>Remove from Collection</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button bsStyle="warning" onClick={() => onClick()} disabled={isDisabled}>
          <i className="fa fa-minus-square"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}