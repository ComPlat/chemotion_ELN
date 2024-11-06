import React from 'react';
import { Dropdown, DropdownButton, Button, ButtonGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';

const MoveOrAssignButton = ({ assignDisabled, moveDisabled, onClick, customClass }) => (
  <DropdownButton
    as={ButtonGroup}
    variant={customClass ? null : 'success'}
    className={customClass}
    title={<i className="fa fa-arrow-right" />}
    id="move-or-assign-btn"
    disabled={assignDisabled && moveDisabled}
  >
    <Dropdown.Item onClick={() => onClick('move')} disabled={moveDisabled}>
      Move to Collection
    </Dropdown.Item>
    <Dropdown.Item onClick={() => onClick('assign')} disabled={assignDisabled}>
      Assign to Collection
    </Dropdown.Item>
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
    as={ButtonGroup}
    variant={customClass ? null : 'warning'}
    className={customClass}
    title={<i className="fa fa-minus-square" />}
    id="remove-or-delete-btn"
    disabled={removeDisabled && deleteDisabled}
  >
    <Dropdown.Item onClick={() => onClick('remove')} disabled={removeDisabled}>
      Remove from current Collection
    </Dropdown.Item>
    <Dropdown.Item onClick={() => onClick('delete')} disabled={deleteDisabled}>
      Remove from all Collections
    </Dropdown.Item>
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
    variant={customClass ? null : 'info'}
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

export { MoveOrAssignButton, ShareButton, RemoveOrDeleteButton };
