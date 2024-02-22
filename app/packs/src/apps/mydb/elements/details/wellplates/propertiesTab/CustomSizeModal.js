import React, { Component } from 'react';
import {
  Button, Modal, FormGroup, FormControl, ControlLabel
} from 'react-bootstrap';
import PropTypes from 'prop-types';

function isPositiveInteger(value) {
  return !Number.isNaN(value) && Number.isInteger(Number(value)) && Number(value) > 0;
}

export default class CustomSizeModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      width: props.wellplate.width,
      height: props.wellplate.height
    };
  }

  // TODO: change function name
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

  updateDimension(type, value) {
    if (isPositiveInteger(value)) {
      this.setState({ [type]: value });
    }
  }

  renderApplyButton() {
    //Check if all values are not zero
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

  render() {
    const { showCustomSizeModal, handleClose } = this.props;
    const { height, width } = this.state;
    return (
      <Modal
        show={showCustomSizeModal}
        onHide={handleClose}
        onShow={() => { this.updateDimesion(); }}
      >
        <Modal.Header closeButton >Blablabla</Modal.Header>
        <Modal.Body>
          {this.renderProperty(width, 'Width', 'width') }
          {this.renderProperty(height, 'Height', 'height') }
          {this.renderApplyButton()}
        </Modal.Body>
      </Modal>
    );
  }
}

CustomSizeModal.propTypes = { /* eslint-disable react/forbid-prop-types */
  wellplate: PropTypes.object.isRequired,
  showCustomSizeModal: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
};
