import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Form } from 'react-bootstrap';

const VesselProperty = ({ label, value, onChange, readOnly, isNumeric = false, optional = false }) => {
  let styleClass = '';
  if (!optional && !readOnly) {
    if (isNumeric) {
      styleClass = Number.isFinite(value) && value > 0 ? '' : 'invalid-input';
    } else {
      styleClass = value.trim() === '' ? 'invalid-input' : '';
    }
  }

  return (
    <Form.Group as={Row} className="mt-3">
      <Form.Label column sm={3}>{label}</Form.Label>
      <Col sm={9}>
        <Form.Control
          disabled={readOnly}
          className={styleClass}
          type={isNumeric ? 'number' : 'text'}
          value={value}
          onChange={onChange}
        />
      </Col>
    </Form.Group>
  );
};

VesselProperty.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired,
  isNumeric: PropTypes.bool,
  optional: PropTypes.bool
};

export default VesselProperty;
