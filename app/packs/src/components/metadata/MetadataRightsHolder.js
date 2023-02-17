import React from 'react';
import PropTypes from 'prop-types';
import { Button, Col, ControlLabel, FormControl, FormGroup, Row } from 'react-bootstrap';

const MetadataRightsHolder = ({ rightsHolder, index, onChange, onRemove }) => (
  <div>
    <Row>
      <Col sm={11}>
        <FormGroup>
          <FormControl
            type="text"
            value={rightsHolder}
            onChange={event => onChange(event.target.value, 'rightsHolders', index)}
          />
        </FormGroup>
      </Col>
      <Col sm={1}>
        <Button bsStyle="danger" onClick={() => onRemove('rightsHolders', index)}>
          <i className="fa fa-trash-o" />
        </Button>
      </Col>
    </Row>
  </div>
);

MetadataRightsHolder.propTypes = {
  rightsHolder: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataRightsHolder;
