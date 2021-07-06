import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar } from 'react-bootstrap';

import UIStore from '../stores/UIStore';

const ManagingModalRemove = ({ onHide, action }) => {
  const ui_state = UIStore.getState();
  return (
    <ButtonToolbar>
      <Button bsStyle="primary" onClick={() => onHide()}>Cancel</Button>
      <Button
        bsStyle="warning"
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
