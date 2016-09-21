import React from 'react';
import {OverlayTrigger, DropdownButton, MenuItem, Tooltip} from 'react-bootstrap';

export default class MoveOrAssignButton extends React.Component {
  render() {
    const {assignVisibility, moveVisibility, onClick} = this.props
    let display

    if (assignVisibility && moveVisibility) display = "hidden"

    let moveItem, assignItem

    if (moveVisibility) {
      moveItem = <div />
    } else {
      moveItem = <MenuItem onSelect={() => onClick("move")}>
                   Move to Collection
                 </MenuItem>
    }

    if (assignVisibility) {
      assignItem = <div />
    } else {
      assignItem = <MenuItem onSelect={() => onClick("assign")}>
                     Assign to Collection
                   </MenuItem>
    }

    const tooltip = (<Tooltip id="export_button">Move/Assign sample</Tooltip>)
    const title = (<i className="fa fa-arrow-right"></i>)

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <DropdownButton bsStyle="success" title={title} id="move-or-assign-btn"
                        style={{visibility: display}}>
          {moveItem}
          {assignItem}
        </DropdownButton>
      </OverlayTrigger>
    )
  }
}

MoveOrAssignButton.propTypes = {
  assignVisibility: React.PropTypes.bool,
  moveVisibility: React.PropTypes.bool,
  onClick: React.PropTypes.func,
}
