import React, { useState } from 'react';
import {
  Form, Col, Row
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import Wellplate from 'src/models/Wellplate';
import AppModal from 'src/components/common/AppModal';

// Seeds for the fields when the wellplate has no size yet.
const DEFAULT_WIDTH = 12;
const DEFAULT_HEIGHT = 8;

const isInteger = (value) => {
  if (value === '' || value === null || value === undefined) return false;
  if (Number.isNaN(value)) return false;

  return Number.isInteger(Number(value));
};

// Without the integer check, 'abc' and '5.5' both validate; changeSize then
// hands Array() a NaN length, which throws a RangeError out of a React event
// handler and takes the whole detail view down with it.
const dimensionIsValid = (value) => {
  if (!isInteger(value)) return false;

  const dimension = Number(value);

  return dimension > 0 && dimension <= Wellplate.MAX_DIMENSION;
};

const errorMessage = (label) => (
    <div className="invalid-wellplate-size-text">
      {label} must be between 1 and {Wellplate.MAX_DIMENSION}
    </div>
  );

const blockedMessage = (blockedWells) => (
  <div className="invalid-wellplate-size-text">
    {blockedWells.length}
    {' '}
    well
    {blockedWells.length === 1 ? '' : 's'}
    {' '}
    outside this size still
    {blockedWells.length === 1 ? ' holds' : ' hold'}
    {' '}
    data (
    {blockedWells.slice(0, 5).map((well) => well.alphanumericPosition).join(', ')}
    {blockedWells.length > 5 ? ', ...' : ''}
    ). Empty them and save before resizing.
  </div>
);

const CustomSizeModal = ({ show, wellplate, updateWellplate, handleClose }) => {
  // An unsized wellplate would otherwise open with both fields at 0 and two
  // validation errors already showing, before the user has typed anything.
  const seedWidth = () => wellplate.width || DEFAULT_WIDTH;
  const seedHeight = () => wellplate.height || DEFAULT_HEIGHT;

  const [width, setWidth] = useState(seedWidth);
  const [height, setHeight] = useState(seedHeight);
  const [wasShown, setWasShown] = useState(show);

  if (show !== wasShown) {
    setWasShown(show);
    if (show) {
      setWidth(seedWidth());
      setHeight(seedHeight());
    }
  }

  const widthIsValid = dimensionIsValid(width);
  const heightIsValid = dimensionIsValid(height);
  const widthChanged = Number(width) !== wellplate.width;
  const heightChanged = Number(height) !== wellplate.height;
  const blockedWells = widthIsValid && heightIsValid
    ? wellplate.occupiedWellsOutside(Number(width), Number(height))
    : [];
  const canSubmit = widthIsValid && heightIsValid
    && (widthChanged || heightChanged)
    && blockedWells.length === 0;

  const handleApply = () => {
    // Numbers, not the raw input strings the inputs hand back: the model and
    // the API both expect integers.
    updateWellplate({ type: 'size', value: { width: Number(width), height: Number(height) } });
    handleClose();
  };

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
      {blockedWells.length > 0 && (
        <Row>
          <Col xs={12}>{blockedMessage(blockedWells)}</Col>
        </Row>
      )}
    </AppModal>
  );
};

CustomSizeModal.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  updateWellplate: PropTypes.func.isRequired,
};

export default CustomSizeModal;
