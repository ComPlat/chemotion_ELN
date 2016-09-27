import React from 'react';
import {OverlayTrigger, DropdownButton, MenuItem, Tooltip} from 'react-bootstrap';

export default class RemoveOrDeleteButton extends React.Component {
  render() {
    const {removeDisabled, deleteDisabled, onClick} = this.props

    const tooltip = (<Tooltip id="export_button">Remove/Delete sample</Tooltip>)
    const title = (<i className="fa fa-minus-square"></i>)

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <DropdownButton bsStyle="warning" title={title} id="remove-or-delete-btn"
            disabled={removeDisabled && deleteDisabled}>
          <MenuItem onSelect={() => onClick("remove")} disabled={removeDisabled}>
            Remove from Collection
          </MenuItem>
          <MenuItem onSelect={() => onClick("delete")} disabled={deleteDisabled}>
            Delete from all Collection
          </MenuItem>
        </DropdownButton>
      </OverlayTrigger>
    )
  }
}

RemoveOrDeleteButton.propTypes = {
  removeDisabled: React.PropTypes.bool,
  deleteDisabled: React.PropTypes.bool,
  onClick: React.PropTypes.func,
}
