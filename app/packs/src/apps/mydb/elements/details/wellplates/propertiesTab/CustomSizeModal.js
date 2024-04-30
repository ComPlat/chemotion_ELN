import React, { Component } from 'react';
import {
  Button, Modal, FormGroup, FormControl, ControlLabel, Col, Row
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import Wellplate from 'src/models/Wellplate';

export default class CustomSizeModal extends Component {
  static isInteger(value) {
    return !Number.isNaN(value) && Number.isInteger(Number(value));// && Number(value) > 0;
  }

  static propertyIsInvalid(value) {
    return value > Wellplate.MAX_DIMENSION || value <= 0;
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
    const { handleClose, wellplate, triggerUIUpdate } = this.props;
    const { height, width } = this.state;
    wellplate.changeSize(width, height);
    triggerUIUpdate();
    handleClose();
  }

  updateDimension(dimension, value) {
    if (!CustomSizeModal.isInteger(value)) {
      return; // state is not updated if value is not an integer
    }
    this.setState({ [dimension]: value });
  }

  renderApplyButton() {
    const { height, width } = this.state;
    const disabled = CustomSizeModal.propertyIsInvalid(height) || CustomSizeModal.propertyIsInvalid(width);
    return (
      <Button
        onClick={() => this.applySizeChange()}
        disabled={disabled}
      >
        Apply
      </Button>
    );
  }

  renderProperty(value, label, propertyName) {
    const invalidStyleClass = CustomSizeModal.propertyIsInvalid(value)
      ? 'invalid-wellplate-size' : 'size-without-error';
    const errorMessage = CustomSizeModal.propertyIsInvalid(value)
      ? (
        <div className="invalid-wellplate-size-text">
          {label}
          {' '}
          must be between 0 and 100.
        </div>
      )
      : null;
    return (
      <div className="floating-left">
        <FormGroup>
          <ControlLabel>{label}</ControlLabel>
          <FormControl
            type="text"
            value={value}
            className={invalidStyleClass}
            onChange={(event) => this.updateDimension(propertyName, event.target.value)}
          />
          {errorMessage}
        </FormGroup>
      </div>
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
        onShow={() => this.updateDimensionsFromWellplate()}
      >
        <Modal.Header closeButton>Wellplate Dimensions</Modal.Header>
        <Modal.Body>
          <Row>
            <Col xs={4}>
              {this.renderProperty(width, 'Width', 'width') }
            </Col>
            <Col xs={4}>
              {this.renderProperty(height, 'Height', 'height') }
            </Col>
            <Col xs={4}>
              {this.renderSize() }
            </Col>
          </Row>
          <Row>
            <Col xs={1} xsOffset={10}>
              {this.renderApplyButton()}
            </Col>
          </Row>
        </Modal.Body>
      </Modal>
    );
  }
}

CustomSizeModal.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  showCustomSizeModal: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  triggerUIUpdate: PropTypes.func.isRequired,
};
