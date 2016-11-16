import React from 'react';
import {Tabs, Tab, Button, Label, Modal, ButtonToolbar} from 'react-bootstrap';

const ConfirmModal = ({showModal, title, content, onClick}) => {
  return (
    <Modal animation show={showModal}>
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {content}
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => onClick(false)}>No</Button>
          <Button bsStyle="danger" onClick={() => onClick(true)}>Yes</Button>
        </ButtonToolbar>
      </Modal.Body>
    </Modal>
  );
}

export { ConfirmModal };
