import React from 'react';
import PropTypes from 'prop-types';
import { Button, Col, FormControl, FormGroup, Row } from 'react-bootstrap';
import Select from 'react-select3';

import { controlledRightsList } from 'src/components/staticDropdownOptions/radar/controlledRightsList'
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

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
              options={controlledRightsList}
              onChange={option => onChange(option.value, 'rights', index, 'controlledRights')}
              value={controlledRights}
              menuPortalTarget={document.body}
              styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
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
          <Button variant="danger" size="sm" onClick={() => onRemove('rights', index)}>
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
