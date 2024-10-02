import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';

import { controlledRightsList } from 'src/components/staticDropdownOptions/radar/controlledRightsList';

const MetadataRights = ({
  rights, index, onChange, onRemove
}) => {
  const controlledRights = controlledRightsList.find((el) => el.value == rights.controlledRights);

  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label>
          Controlled rights
        </Form.Label>
        <Select
          name="relationType"
          options={controlledRightsList}
          onChange={(option) => onChange(option.value, 'rights', index, 'controlledRights')}
          value={controlledRights}
          menuPortalTarget={document.body}
          styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>
          Additional rights
        </Form.Label>
        <Form.Control
          type="text"
          value={rights.additionalRights}
          onChange={(event) => onChange(event.target.value, 'rights', index, 'additionalRights')}
        />
      </Form.Group>
      <Button variant="danger" size="sm" onClick={() => onRemove('rights', index)}>
        Remove rights
      </Button>
      <hr />
    </div>
  );
};

MetadataRights.propTypes = {
  rights: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired
};

export default MetadataRights;
