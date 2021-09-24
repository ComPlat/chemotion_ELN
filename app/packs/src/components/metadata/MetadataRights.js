import React from 'react';
import PropTypes from 'prop-types';
import { Button, Col, ControlLabel, FormControl, FormGroup, Row } from 'react-bootstrap';
import Select from 'react-select3';

const controlledRightsList = [
  'CC BY 4.0 Attribution',
  'CC BY-ND 4.0 Attribution-NoDerivs',
  'CC BY-SA 4.0 Attribution-ShareAlike',
  'CC BY-NC 4.0 Attribution-NonCommercial',
  'CC BY-NC-SA 4.0 Attribution-NonCommercial-ShareAlike',
  'CC BY-NC-ND 4.0 Attribution-NonCommercial-NoDerivs',
  'CC0 1.0 Universal Public Domain Dedication',
  'All rights reserved',
  'Other'
].map(value => ({ label: value, value }))

const MetadataRights = ({ rights, index, onChange, onRemove }) => {
  const controlledRights = controlledRightsList.find(el => el.value == rights.controlledRights)

  return (
    <div>
      <Row>
        <Col sm={12}>
          <FormGroup>
            <ControlLabel>
              Controlled rights
            </ControlLabel>
            <Select
              name="relationType"
              classNamePrefix="react-select"
              options={controlledRightsList}
              onChange={option => onChange(option.value, 'rights', index, 'controlledRights')}
              value={controlledRights}
            />
          </FormGroup>
        </Col>
        <Col sm={12}>
          <FormGroup>
            <ControlLabel>
              Additional rights
            </ControlLabel>
            <FormControl
              type="text"
              value={rights.additionalRights}
              onChange={event => onChange(event.target.value, 'rights', index, 'additionalRights')}
            />
          </FormGroup>
        </Col>
        <Col sm={12}>
          <Button bsStyle="danger" bsSize="small" onClick={() => onRemove('rights', index)}>
            Remove rights
          </Button>
        </Col>
      </Row>
      <hr />
    </div>
  )
};

MetadataRights.propTypes = {
  rights: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired
};

export default MetadataRights;
