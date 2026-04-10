import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Modal } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';

const ManagingModalRemove = ({ onHide }) => {
  const submit = () => {
    const ui_state = UIStore.getState();
    ElementActions.removeElementsCollection({ ui_state });
    onHide();
  };

  return (
    <Modal show centered onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Remove selected elements from this Collection?</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <ButtonToolbar className="gap-1">
          <Button variant="primary" onClick={onHide}>Cancel</Button>
          <Button variant="warning" onClick={submit}>Remove</Button>
        </ButtonToolbar>
      </Modal.Body>
    </Modal>
  );
};

ManagingModalRemove.propTypes = {
  onHide: PropTypes.func.isRequired,
};

export default ManagingModalRemove;
