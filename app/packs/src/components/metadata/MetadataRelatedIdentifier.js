import React from 'react';
import PropTypes from 'prop-types';
import { Button, Col, FormControl, FormGroup, Row } from 'react-bootstrap';
import Select from 'react-select3';

import { relatedIdentifierTypes } from 'src/components/staticDropdownOptions/radar/relatedIdentifierTypes'
import { relationTypes } from 'src/components/staticDropdownOptions/radar/relationTypes'
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

const MetadataRelatedIdentifier = ({ relatedIdentifier, index, onChange, onRemove }) => {
  const relatedIdentifierType = relatedIdentifierTypes.find(el => el.value == relatedIdentifier.relatedIdentifierType)
  const relationType = relationTypes.find(el => el.value == relatedIdentifier.relationType)

  return (
    <div>
      <Row>
        <Col sm={5}>
          <FormGroup>
            <ControlLabel>
              Identifier
            </ControlLabel>
            <FormControl
              type="text"
              value={relatedIdentifier.value}
              onChange={event => onChange(event.target.value, 'relatedIdentifiers', index, 'value')}
            />
          </FormGroup>
        </Col>
        <Col sm={3}>
          <FormGroup>
            <ControlLabel>
              Identifier type
            </ControlLabel>
            <Select
              name="relatedIdentifierType"
              options={relatedIdentifierTypes}
              onChange={option => onChange(option.value, 'relatedIdentifiers', index, 'relatedIdentifierType')}
              value={relatedIdentifierType}
              menuPortalTarget={document.body}
              styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
            />
          </FormGroup>
        </Col>
        <Col sm={3}>
          <FormGroup>
            <ControlLabel>
              Relation type
            </ControlLabel>
            <Select
              name="relationType"
              options={relationTypes}
              onChange={option => onChange(option.value, 'relatedIdentifiers', index, 'relationType')}
              value={relationType}
              menuPortalTarget={document.body}
              styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
            />
          </FormGroup>
        </Col>
        <Col sm={1}>
          <ControlLabel>
            &nbsp;
          </ControlLabel>
          <Button bsStyle="danger" onClick={() => onRemove('relatedIdentifiers', index)}>
            <i className="fa fa-trash-o" />
          </Button>
        </Col>
      </Row>
    </div>
  )
};

MetadataRelatedIdentifier.propTypes = {
  relatedIdentifier: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataRelatedIdentifier;
