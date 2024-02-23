import React, { Component } from 'react';
import {
  Button, Modal, FormGroup, FormControl, ControlLabel
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import Wellplate from 'src/models/Wellplate';

export default class CustomSizeModal extends Component {
  static isPositiveInteger(value) {
    return !Number.isNaN(value) && Number.isInteger(Number(value)) && Number(value) > 0;
  }

  constructor(props) {
    super(props);
    this.state = {
      width: props.wellplate.width,
      height: props.wellplate.height
    };
  }

  updateDimensionsFromWellplate() {
    const { wellplate } = this.props;
    this.setState({
      width: wellplate.width,
      height: wellplate.height
    });
  }

  applySizeChange() {
    const { handleClose, wellplate } = this.props;
    const { height, width } = this.state;
    wellplate.changeSize(width, height);
    handleClose();
  }

  updateDimension(type, value) {
    if (CustomSizeModal.isPositiveInteger(value)) {
      this.setState({ [type]: value });
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
          onChange={(event) => this.updateDimension(propertyName, event.target.value)}
        />
      </FormGroup>
    );
  }

  renderSize() {
    const { height, width } = this.state;
    return (
      <FormGroup>
        <ControlLabel>Size</ControlLabel>
        <FormControl.Static>{height * width}</FormControl.Static>
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
        onShow={() => { this.updateDimensionsFromWellplate(); }}
      >
        <Modal.Header closeButton>Wellplate Dimensions</Modal.Header>
        <Modal.Body>
          {this.renderProperty(width, 'Width', 'width') }
          {this.renderProperty(height, 'Height', 'height') }
          {this.renderSize() }
          {this.renderApplyButton()}
        </Modal.Body>
      </Modal>
    );
  }
}

CustomSizeModal.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  showCustomSizeModal: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
};
