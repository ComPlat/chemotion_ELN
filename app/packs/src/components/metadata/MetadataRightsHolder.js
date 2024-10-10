import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, Form, Row
} from 'react-bootstrap';

const MetadataRightsHolder = ({
  rightsHolder, index, onChange, onRemove
}) => (
  <Row className="mb-3">
    <Form.Group as={Col} xs={11}>
      <Form.Control
        type="text"
        value={rightsHolder}
        onChange={(event) => onChange(event.target.value, 'rightsHolders', index)}
      />
    </Form.Group>
    <Col xs={1}>
      <Button variant="danger" onClick={() => onRemove('rightsHolders', index)}>
        <i className="fa fa-trash-o" />
      </Button>
    </Col>
  </Row>
);

MetadataRightsHolder.propTypes = {
  rightsHolder: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataRightsHolder;
