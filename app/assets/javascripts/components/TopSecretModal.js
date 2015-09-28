import React from 'react';
import {Button, Input, Modal} from 'react-bootstrap';

import Aviator from 'aviator';

export default class TopSecretModal extends React.Component {
  constructor(props) {
    super(props);
  }

  hideModal() {
    Aviator.navigate(Aviator.getCurrentURI()+'/hide');
  }

  render() {
    return (
      <div>
        <Modal animation show={true} onHide={this.hideModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Sharing not allowed</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            One of the selected elements contains one or several samples marked as top secret.
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}
