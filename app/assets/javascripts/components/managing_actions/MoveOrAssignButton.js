import React from 'react';
import {OverlayTrigger, DropdownButton, MenuItem, Tooltip} from 'react-bootstrap';

export default class MoveOrAssignButton extends React.Component {
  render() {
    const {assignDisabled, moveDisabled, onClick} = this.props

    const tooltip = (<Tooltip id="export_button">Move/Assign sample</Tooltip>)
    const title = (<i className="fa fa-arrow-right"></i>)

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <DropdownButton bsStyle="success" title={title} id="move-or-assign-btn"
            disabled={assignDisabled && moveDisabled}>
          <MenuItem onSelect={() => onClick("move")} disabled={moveDisabled}>
            Move to Collection
          </MenuItem>
          <MenuItem onSelect={() => onClick("assign")} disabled={assignDisabled}>
            Assign to Collection
          </MenuItem>
        </DropdownButton>
      </OverlayTrigger>
    )
  }
}

MoveOrAssignButton.propTypes = {
  assignDisabled: React.PropTypes.bool,
  moveDisabled: React.PropTypes.bool,
  onClick: React.PropTypes.func,
}
