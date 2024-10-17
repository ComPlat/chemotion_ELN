import React, { useState } from 'react';
import {
  Button, Modal, Form, Col, Row
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import Wellplate from 'src/models/Wellplate';

const isInteger = (value) =>{
  if (Number.isNaN(value)) return false

  return Number.isInteger(Number(value))
}

const dimensionIsValid = (value) => {
  if (value <= 0) return false
  if (value > Wellplate.MAX_DIMENSION) return false

  return true
}

const errorMessage = (label) => {
  return (
    <div class="invalid-wellplate-size-text">
      {label} must be between 1 and 100
    </div>
  )
}


const CustomSizeModal = ({show, wellplate, updateWellplate, handleClose}) => {
  const [width, setWidth] = useState(wellplate.width)
  const [height, setHeight] = useState(wellplate.height)

  const widthIsValid = dimensionIsValid(width)
  const heightIsValid = dimensionIsValid(height)
  const widthChanged = width != wellplate.width
  const heightChanged = height != wellplate.height
  const canSubmit = widthIsValid && heightIsValid && (widthChanged || heightChanged)

  return (
    <Modal centered show={show} onHide={handleClose}>
      <Modal.Header closeButton>Wellplate Dimensions</Modal.Header>
      <Modal.Body>
        <Row>
          <Col xs={5}>
            <Form.Group>
              <Form.Label>Width</Form.Label>
              <Form.Control
                type="text"
                value={width}
                className={widthIsValid ? 'size-without-error' : 'invalid-wellplate-size'}
                onChange={event => setWidth(event.target.value)}
              />
              {!widthIsValid && errorMessage('Width')}
            </Form.Group>
          </Col>
          <Col xs={5}>
            <Form.Group>
              <Form.Label>Height</Form.Label>
              <Form.Control
                type="text"
                value={height}
                className={heightIsValid ? 'size-without-error' : 'invalid-wellplate-size'}
                onChange={event => setHeight(event.target.value)}
              />
              {!heightIsValid && errorMessage('Height')}
            </Form.Group>
          </Col>
          <Col xs={2}>
            <Form.Group>
              <Form.Label>Size</Form.Label>
              <Form.Control type="text" disabled value={height * width} />
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col xs={{span: 1, offset: 10}}>
            <Button
              onClick={() => {
                updateWellplate({ type: 'size', value: { width: width, height: height }})
                handleClose()
              }}
              disabled={!canSubmit}
            >
              Apply
            </Button>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  )
}

CustomSizeModal.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  showCustomSizeModal: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  triggerUIUpdate: PropTypes.func.isRequired,
}

export default CustomSizeModal
