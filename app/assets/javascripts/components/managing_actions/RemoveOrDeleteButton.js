import React from 'react';
import {DropdownButton, MenuItem} from 'react-bootstrap';

export default class RemoveOrDeleteButton extends React.Component {
  render() {
    const {removeDisabled, deleteDisabled, onClick} = this.props

    const title = (<i className="fa fa-minus-square"></i>)

    return (
      <DropdownButton bsStyle="warning" title={title} id="remove-or-delete-btn"
          disabled={removeDisabled && deleteDisabled}>
        <MenuItem onSelect={() => onClick("remove")} disabled={removeDisabled}>
          Remove from Collection
        </MenuItem>
        <MenuItem onSelect={() => onClick("delete")} disabled={deleteDisabled}>
          Delete from all Collection
        </MenuItem>
      </DropdownButton>
    )
  }
}

RemoveOrDeleteButton.propTypes = {
  removeDisabled: React.PropTypes.bool,
  deleteDisabled: React.PropTypes.bool,
  onClick: React.PropTypes.func,
}
