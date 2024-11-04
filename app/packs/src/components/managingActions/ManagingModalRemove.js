import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';

const ManagingModalRemove = ({ onHide, action }) => {
  const ui_state = UIStore.getState();
  return (
    <ButtonToolbar className="gap-1">
      <Button variant="primary" onClick={() => onHide()}>Cancel</Button>
      <Button
        variant="warning"
        onClick={() => { action({ ui_state }); onHide(); }}
      >
        Remove
      </Button>
    </ButtonToolbar>
  );
};

ManagingModalRemove.propTypes = {
  onHide: PropTypes.func.isRequired,
  action: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]).isRequired
};

export default ManagingModalRemove;
