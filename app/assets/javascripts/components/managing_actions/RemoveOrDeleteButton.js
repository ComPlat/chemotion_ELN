import React from 'react';
import {OverlayTrigger, DropdownButton, MenuItem, Tooltip} from 'react-bootstrap';

export default class RemoveOrDeleteButton extends React.Component {
  render() {
    const {removeVisibility, deleteVisibility, onClick} = this.props
    let display

    if (removeVisibility && deleteVisibility) display = "hidden"

    let removeItem, deleteItem

    if (removeVisibility) {
      removeItem = <div />
    } else {
      removeItem = <MenuItem onSelect={() => onClick("remove")}>
                     Remove from Collection
                   </MenuItem>
    }

    if (deleteVisibility) {
      deleteItem = <div />
    } else {
      deleteItem = <MenuItem onSelect={() => onClick("delete")}>
                     Delete from Collection
                   </MenuItem>
    }

    const tooltip = (<Tooltip id="export_button">Remove/Delete sample</Tooltip>)
    const title = (<i className="fa fa-minus-square"></i>)

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <DropdownButton bsStyle="warning" title={title} id="remove-or-delete-btn"
                        style={{visibility: display}}>
          {removeItem}
          {deleteItem}
        </DropdownButton>
      </OverlayTrigger>
    )
  }
}

RemoveOrDeleteButton.propTypes = {
  removeVisibility: React.PropTypes.bool,
  deleteVisibility: React.PropTypes.bool,
  onClick: React.PropTypes.func,
}
