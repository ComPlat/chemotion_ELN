import React, { Component } from 'react';
import {
  Button, Modal, FormGroup, FormControl, ControlLabel
} from 'react-bootstrap';
import PropTypes from 'prop-types';

export default class CustomSizeModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      width: props.wellplate.width,
      height: props.wellplate.height
    };
  }

  updateDimesion() {
    this.setState({
      width: this.props.wellplate.width,
      height: this.props.wellplate.height
    });
  }

  applySizeChange() {
    const { handleClose, wellplate } = this.props;
    const { height, width } = this.state;
    wellplate.changeSize(width, height);
    handleClose();
  }

  checkInput(value) {
    return !Number.isNaN(value) && Number.isInteger(Number(value));
  }

  updateDimension(event, type) {
    if (this.checkInput(event.target.value)) {
      this.setState({ [type]: event.target.value });
    }
  }

  renderApplyButton() {
    return (
      <Button
        onClick={() => this.applySizeChange()}
      >
        Apply
      </Button>
    );
  }

  renderProperty(value, label, propertyName) {
    return (
      <FormGroup>
        <ControlLabel>{label}</ControlLabel>
        <FormControl
          type="text"
          value={value}
          onChange={(event) => this.updateDimension(event, propertyName)}
        />
      </FormGroup>
    );
  }

  render() {
    const { showCustomSizeModal, handleClose } = this.props;
    const { height, width } = this.state;
    return (
      <Modal
        show={showCustomSizeModal}
        onHide={handleClose}
        onShow={() => { this.updateDimesion(); }}
      >
        <Modal.Header closeButton />
        <Modal.Body>
          {this.renderProperty(width, 'Width', 'width') }
          {this.renderProperty(height, 'Height', 'height') }
          {this.renderApplyButton()}
        </Modal.Body>
      </Modal>
    );
  }
}
