/* eslint-disable react/function-component-definition */
import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Row, Col, Form } from 'react-bootstrap';

const VesselProperty = ({ label, value, onChange, readOnly, isNumeric = false, optional = false }) => (
  <Form.Group as={Row} className="mt-3">
    <Form.Label column sm={3}>{label}</Form.Label>
    <Col sm={6}>
      <Form.Control
        readOnly={readOnly}
        type={isNumeric ? 'number' : 'text'}
        value={value}
        onChange={(e) => {
          onChange(e);
        }}
        style={readOnly ? { cursor: 'not-allowed' } : undefined}
      />
    </Col>
  </Form.Group>
);

VesselProperty.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired,
  isNumeric: PropTypes.bool,
  optional: PropTypes.bool
};

export default observer(VesselProperty);
