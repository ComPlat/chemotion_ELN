import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, Form, Row
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';

import { funderIdentifierTypes } from 'src/components/staticDropdownOptions/radar/funderIdentifierTypes';

const MetadataFundingReference = ({
  fundingReference, index, onChange, onRemove
}) => {
  const funderIdentifierType = funderIdentifierTypes.find((el) => el.value == fundingReference.funderIdentifierType);

  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label>
          Funder name
        </Form.Label>
        <Form.Control
          type="text"
          value={fundingReference.funderName}
          onChange={(event) => onChange(event.target.value, 'fundingReferences', index, 'funderName')}
        />
      </Form.Group>
      <Row className="mb-3">
        <Form.Group as={Col} xs={8}>
          <Form.Label>
            Funder identifier
          </Form.Label>
          <Form.Control
            type="text"
            value={fundingReference.funderIdentifier}
            onChange={(event) => onChange(event.target.value, 'fundingReferences', index, 'funderIdentifier')}
          />
        </Form.Group>
        <Form.Group as={Col} xs={4}>
          <Form.Label>
            Funder identifier type
          </Form.Label>
          <Select
            name="relationType"
            options={funderIdentifierTypes}
            onChange={(option) => onChange(option.value, 'fundingReferences', index, 'funderIdentifierType')}
            value={funderIdentifierType}
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
        </Form.Group>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>
          Award title
        </Form.Label>
        <Form.Control
          type="text"
          value={fundingReference.awardTitle}
          onChange={(event) => onChange(event.target.value, 'fundingReferences', index, 'awardTitle')}
        />
      </Form.Group>
      <Row className="mb-3">
        <Form.Group as={Col} xs={6}>
          <Form.Label>
            Award number
          </Form.Label>
          <Form.Control
            type="text"
            value={fundingReference.awardNumber}
            onChange={(event) => onChange(event.target.value, 'fundingReferences', index, 'awardNumber')}
          />
        </Form.Group>
        <Form.Group as={Col} xs={6}>
          <Form.Label>
            Award URI
          </Form.Label>
          <Form.Control
            type="text"
            value={fundingReference.awardURI}
            onChange={(event) => onChange(event.target.value, 'fundingReferences', index, 'awardURI')}
          />
        </Form.Group>
      </Row>
      <Button variant="danger" size="sm" onClick={() => onRemove('fundingReferences', index)}>
        Remove funding reference
      </Button>
      <hr />
    </div>
  );
};

MetadataFundingReference.propTypes = {
  fundingReference: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default MetadataFundingReference;
