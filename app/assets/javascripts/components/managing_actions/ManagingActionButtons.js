import React from 'react';
import { DropdownButton, MenuItem, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

const MoveOrAssignButton = ({ assignDisabled, moveDisabled, onClick, customClass }) => (
  <DropdownButton
    bsStyle={customClass ? null : 'success'}
    className={customClass}
    title={<i className="fa fa-arrow-right" />}
    id="move-or-assign-btn"
    disabled={assignDisabled && moveDisabled}
  >
    <MenuItem onSelect={() => onClick('move')} disabled={moveDisabled}>
      Move to Collection
    </MenuItem>
    <MenuItem onSelect={() => onClick('assign')} disabled={assignDisabled}>
      Assign to Collection
    </MenuItem>
  </DropdownButton>
);

MoveOrAssignButton.propTypes = {
  assignDisabled: PropTypes.bool,
  moveDisabled: PropTypes.bool,
  onClick: PropTypes.func,
  customClass: PropTypes.string,
};

MoveOrAssignButton.defaultProps = {
  assignDisabled: false,
  moveDisabled: false,
  customClass: null,
  onClick: () => null,
};

const RemoveOrDeleteButton = ({ removeDisabled, deleteDisabled, onClick, customClass }) => (
  <DropdownButton
    bsStyle={customClass ? null : 'warning'}
    className={customClass}
    title={<i className="fa fa-minus-square" />}
    id="remove-or-delete-btn"
    disabled={removeDisabled && deleteDisabled}
  >
    <MenuItem onSelect={() => onClick('remove')} disabled={removeDisabled}>
      Remove from Collection
    </MenuItem>
    <MenuItem onSelect={() => onClick('delete')} disabled={deleteDisabled}>
      Delete from all Collection
    </MenuItem>
  </DropdownButton>
);

RemoveOrDeleteButton.propTypes = {
  removeDisabled: PropTypes.bool,
  deleteDisabled: PropTypes.bool,
  onClick: PropTypes.func,
  customClass: PropTypes.string,
};

RemoveOrDeleteButton.defaultProps = {
  deleteDisabled: false,
  removeDisabled: false,
  customClass: null,
  onClick: () => null,
};

const ShareButton = ({ isDisabled, customClass, onClick }) => (
  <Button
    bsStyle={customClass ? null : 'info'}
    id="share-btn"
    disabled={isDisabled}
    onClick={() => onClick('share')}
    className={customClass}
  >
    <i className="fa fa-share-alt" />
  </Button>
);

ShareButton.propTypes = {
  isDisabled: PropTypes.bool,
  onClick: PropTypes.func,
  customClass: PropTypes.string,
};

ShareButton.defaultProps = {
  isDisabled: false,
  customClass: null,
  onClick: () => null,
};

module.exports = { MoveOrAssignButton, ShareButton, RemoveOrDeleteButton };
