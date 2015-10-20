import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';

export default class DeleteButton extends React.Component {
  render() {
    const {isDisabled, onClick} = this.props;
    const tooltip = (
      <Tooltip>Delete from all Collections</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button bsStyle="danger" onClick={() => onClick()} disabled={isDisabled}>
          <i className="fa fa-trash"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}
