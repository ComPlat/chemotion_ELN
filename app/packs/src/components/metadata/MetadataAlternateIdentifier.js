import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, Form, Row
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';

import { alternateIdentifierTypes } from 'src/components/staticDropdownOptions/radar/alternateIdentifierTypes';

const MetadataAlternateIdentifier = ({
  alternateIdentifier, index, onChange, onRemove
}) => {
  const alternateIdentifierType = alternateIdentifierTypes
    .find((el) => el.value === alternateIdentifier.alternateIdentifierType);

  return (
    <Row className="mb-3">
      <Form.Group as={Col} xs={8}>
        <Form.Label>
          Identifier
        </Form.Label>
        <Form.Control
          type="text"
          value={alternateIdentifier.value}
          onChange={(event) => onChange(event.target.value, 'alternateIdentifiers', index, 'value')}
        />
      </Form.Group>
      <Form.Group as={Col} xs={3}>
        <Form.Label>
          Identifier type
        </Form.Label>
        <Select
          name="alternateIdentifierType"
          options={alternateIdentifierTypes}
          onChange={(option) => onChange(option.value, 'alternateIdentifiers', index, 'alternateIdentifierType')}
          value={alternateIdentifierType}
          menuPortalTarget={document.body}
          styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        />
      </Form.Group>
      <Col xs={1} className="d-flex align-items-center">
        <Button variant="danger" onClick={() => onRemove('alternateIdentifiers', index)}>
          <i className="fa fa-trash-o" />
        </Button>
      </Col>
    </Row>
  );
};

MetadataAlternateIdentifier.propTypes = {
  alternateIdentifier: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataAlternateIdentifier;
