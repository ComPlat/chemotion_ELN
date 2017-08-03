import React from 'react';
import {DropdownButton, MenuItem} from 'react-bootstrap';

export default class MoveOrAssignButton extends React.Component {
  render() {
    const {assignDisabled, moveDisabled, onClick} = this.props

    const title = (<i className="fa fa-arrow-right"></i>)

    return (
      <DropdownButton bsStyle="success" title={title} id="move-or-assign-btn"
          disabled={assignDisabled && moveDisabled}>
        <MenuItem onSelect={() => onClick("move")} disabled={moveDisabled}>
          Move to Collection
        </MenuItem>
        <MenuItem onSelect={() => onClick("assign")} disabled={assignDisabled}>
          Assign to Collection
        </MenuItem>
      </DropdownButton>
    )
  }
}

MoveOrAssignButton.propTypes = {
  assignDisabled: React.PropTypes.bool,
  moveDisabled: React.PropTypes.bool,
  onClick: React.PropTypes.func,
}
