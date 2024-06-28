import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';

export default class ConfirmDeletionModal extends Component {
  render() {
    return (
      <Modal centered show={this.props.show} onHide={this.props.onCancel}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h4>{this.props.confirmationText}</h4>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.props.onConfirm}>Yes</Button>
          <Button onClick={this.props.onCancel}>No</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
ConfirmDeletionModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  confirmationText: PropTypes.string.isRequired
}
