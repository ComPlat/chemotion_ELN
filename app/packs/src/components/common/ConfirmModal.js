import React from 'react';
import { Button, Modal, ButtonToolbar } from 'react-bootstrap';

const ConfirmModal = ({ showModal, title, content, onClick, dialogClassName }) => {
  return (
    <Modal centered animation show={showModal} dialogClassName={dialogClassName} onHide={() => onClick(false)}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {content}

        <ButtonToolbar className="pull-right">
          <Button variant="primary" onClick={() => onClick(false)} className="pull-right" >No</Button>
          <Button variant="danger" onClick={() => onClick(true)} >Yes</Button>
        </ButtonToolbar>
        <br /><br />
      </Modal.Body>
    </Modal>
  );
}

export { ConfirmModal };
