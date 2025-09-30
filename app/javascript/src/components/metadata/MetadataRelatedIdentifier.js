import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, Form, Row
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';

import { relatedIdentifierTypes } from 'src/components/staticDropdownOptions/radar/relatedIdentifierTypes';
import { relationTypes } from 'src/components/staticDropdownOptions/radar/relationTypes';

const MetadataRelatedIdentifier = ({
  relatedIdentifier, index, onChange, onRemove
}) => {
  const relatedIdentifierType = relatedIdentifierTypes.find((el) => el.value == relatedIdentifier.relatedIdentifierType);
  const relationType = relationTypes.find((el) => el.value == relatedIdentifier.relationType);

  return (
    <Row className="mb-3">
      <Form.Group as={Col} xs={5}>
        <Form.Label>
          Identifier
        </Form.Label>
        <Form.Control
          type="text"
          value={relatedIdentifier.value}
          onChange={(event) => onChange(event.target.value, 'relatedIdentifiers', index, 'value')}
        />
      </Form.Group>
      <Form.Group as={Col} xs={3}>
        <Form.Label>
          Identifier type
        </Form.Label>
        <Select
          name="relatedIdentifierType"
          options={relatedIdentifierTypes}
          onChange={(option) => onChange(option.value, 'relatedIdentifiers', index, 'relatedIdentifierType')}
          value={relatedIdentifierType}
        />
      </Form.Group>
      <Form.Group as={Col} xs={3}>
        <Form.Label>
          Relation type
        </Form.Label>
        <Select
          name="relationType"
          options={relationTypes}
          onChange={(option) => onChange(option.value, 'relatedIdentifiers', index, 'relationType')}
          value={relationType}
        />
      </Form.Group>
      <Col xs={1} className="d-flex align-items-center">
        <Button variant="danger" onClick={() => onRemove('relatedIdentifiers', index)}>
          <i className="fa fa-trash-o" />
        </Button>
      </Col>
    </Row>
  );
};

MetadataRelatedIdentifier.propTypes = {
  relatedIdentifier: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataRelatedIdentifier;
