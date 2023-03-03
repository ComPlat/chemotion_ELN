import React from 'react';
import PropTypes from 'prop-types';
import { Button, Col, ControlLabel, FormControl, FormGroup, Row } from 'react-bootstrap';
import Select from 'react-select3';

import { funderIdentifierTypes } from 'src/components/staticDropdownOptions/radar/funderIdentifierTypes'

const MetadataFundingReference = ({ fundingReference, index, onChange, onRemove }) => {
  const funderIdentifierType = funderIdentifierTypes.find(el => el.value == fundingReference.funderIdentifierType)

  return (
    <div>
      <Row>
        <Col sm={12}>
          <FormGroup>
            <ControlLabel>
              Funder name
            </ControlLabel>
            <FormControl
              type="text"
              value={fundingReference.funderName}
              onChange={event => onChange(event.target.value, 'fundingReferences', index, 'funderName')}
            />
          </FormGroup>
        </Col>
        <Col sm={8}>
          <FormGroup>
            <ControlLabel>
              Funder identifier
            </ControlLabel>
            <FormControl
              type="text"
              value={fundingReference.funderIdentifier}
              onChange={event => onChange(event.target.value, 'fundingReferences', index, 'funderIdentifier')}
            />
          </FormGroup>
        </Col>
        <Col sm={4}>
          <FormGroup>
            <ControlLabel>
              Funder identifier type
            </ControlLabel>
            <Select
              name="relationType"
              options={funderIdentifierTypes}
              onChange={option => onChange(option.value, 'fundingReferences', index, 'funderIdentifierType')}
              value={funderIdentifierType}
              menuPortalTarget={document.body}
              styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
            />
          </FormGroup>
        </Col>
        <Col sm={12}>
          <FormGroup>
            <ControlLabel>
              Award title
            </ControlLabel>
            <FormControl
              type="text"
              value={fundingReference.awardTitle}
              onChange={event => onChange(event.target.value, 'fundingReferences', index, 'awardTitle')}
            />
          </FormGroup>
        </Col>
        <Col sm={6}>
          <FormGroup>
            <ControlLabel>
              Award number
            </ControlLabel>
            <FormControl
              type="text"
              value={fundingReference.awardNumber}
              onChange={event => onChange(event.target.value, 'fundingReferences', index, 'awardNumber')}
            />
          </FormGroup>
        </Col>
        <Col sm={6}>
          <FormGroup>
            <ControlLabel>
              Award URI
            </ControlLabel>
            <FormControl
              type="text"
              value={fundingReference.awardURI}
              onChange={event => onChange(event.target.value, 'fundingReferences', index, 'awardURI')}
            />
          </FormGroup>
        </Col>
        <Col sm={12}>
          <Button bsStyle="danger" bsSize="small" onClick={() => onRemove('fundingReferences', index)}>
            Remove funding reference
          </Button>
        </Col>
      </Row>
      <hr />
    </div>
  )
}

MetadataFundingReference.propTypes = {
  fundingReference: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired
};

export default MetadataFundingReference;
