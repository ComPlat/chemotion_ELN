import React from 'react';
import PropTypes from 'prop-types';
import { Button, Col, ControlLabel, FormControl, FormGroup, Row } from 'react-bootstrap';

const MetadataAlternateIdentifier = ({ alternateIdentifier, index, onChange, onRemove }) => (
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
          <FormControl
            type="text"
            value={alternateIdentifier.alternateIdentifierType}
            onChange={event => onChange(event.target.value, 'alternateIdentifiers', index, 'alternateIdentifierType')}
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
);

MetadataAlternateIdentifier.propTypes = {
  alternateIdentifier: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataAlternateIdentifier;
