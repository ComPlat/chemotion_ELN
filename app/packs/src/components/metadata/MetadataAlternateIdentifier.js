import React from 'react';
import PropTypes from 'prop-types';
import { Button, Col, FormControl, FormGroup, Row } from 'react-bootstrap';
import Select from 'react-select3';
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

import { alternateIdentifierTypes } from 'src/components/staticDropdownOptions/radar/alternateIdentifierTypes'

const MetadataAlternateIdentifier = ({ alternateIdentifier, index, onChange, onRemove }) => {
  const alternateIdentifierType = alternateIdentifierTypes.find(el => el.value == alternateIdentifier.alternateIdentifierType)

  return (
    <div>
      <Row>
        <Col sm={8}>
          <FormGroup>
            <ControlLabel>
              Identifier
            </ControlLabel>
            <FormControl
              type="text"
              value={alternateIdentifier.value}
              onChange={event => onChange(event.target.value, 'alternateIdentifiers', index, 'value')}
            />
          </FormGroup>
        </Col>
        <Col sm={3}>
          <FormGroup>
            <ControlLabel>
              Identifier type
            </ControlLabel>
            <Select
              name="alternateIdentifierType"
              options={alternateIdentifierTypes}
              onChange={option => onChange(option.value, 'alternateIdentifiers', index, 'alternateIdentifierType')}
              value={alternateIdentifierType}
              menuPortalTarget={document.body}
              styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
            />
          </FormGroup>
        </Col>
        <Col sm={1}>
          <ControlLabel>
            &nbsp;
          </ControlLabel>
          <Button bsStyle="danger" onClick={() => onRemove('alternateIdentifiers', index)}>
            <i className="fa fa-trash-o" />
          </Button>
        </Col>
      </Row>
    </div>
  )
}

MetadataAlternateIdentifier.propTypes = {
  alternateIdentifier: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataAlternateIdentifier;
