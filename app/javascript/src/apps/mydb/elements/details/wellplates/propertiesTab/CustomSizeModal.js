import React, { useState } from 'react';
import {
  Form, Col, Row
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import Wellplate from 'src/models/Wellplate';
import AppModal from 'src/components/common/AppModal';

const isInteger = (value) => {
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

const CustomSizeModal = ({ show, wellplate, updateWellplate, handleClose }) => {
  const [width, setWidth] = useState(wellplate.width)
  const [height, setHeight] = useState(wellplate.height)

  const widthIsValid = dimensionIsValid(width)
  const heightIsValid = dimensionIsValid(height)
  const widthChanged = width != wellplate.width
  const heightChanged = height != wellplate.height
  const canSubmit = widthIsValid && heightIsValid && (widthChanged || heightChanged)

  const handleApply = () => {
    updateWellplate({ type: 'size', value: { width, height } })
    handleClose()
  }

  return (
    <AppModal
      show={show}
      onHide={handleClose}
      title="Wellplate Dimensions"
      primaryActionLabel="Apply"
      onPrimaryAction={handleApply}
      primaryActionDisabled={!canSubmit}
    >
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
    </AppModal>
  )
}

CustomSizeModal.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
}

export default CustomSizeModal
