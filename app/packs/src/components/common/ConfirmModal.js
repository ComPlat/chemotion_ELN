import React from 'react';
import {Tabs, Tab, Button, Label, Modal, ButtonToolbar} from 'react-bootstrap';

const ConfirmModal = ({ showModal, title, content, onClick, dialogClassName }) => {
  return (
    <Modal animation show={showModal} dialogClassName={dialogClassName} onHide={() => onClick(false)}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {content}

        <ButtonToolbar className="pull-right">
          <Button bsStyle="primary" onClick={() => onClick(false)} className="pull-right" >No</Button>
          <Button bsStyle="danger" onClick={() => onClick(true)} >Yes</Button>
        </ButtonToolbar>
        <br /><br />
      </Modal.Body>
    </Modal>
  );
}

export { ConfirmModal };
