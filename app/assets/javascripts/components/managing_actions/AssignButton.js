import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';

export default class AssignButton extends React.Component {
  render() {
    const {isDisabled, onClick} = this.props;
    const tooltip = (
      <Tooltip id="assign_button">Assign to Collection</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button bsStyle="success" onClick={() => onClick()} disabled={isDisabled}>
          <i className="fa fa-plus-square"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}

AssignButton.propTypes = {
  isDisabled: React.PropTypes.bool,
  onClick:    React.PropTypes.func,
}
