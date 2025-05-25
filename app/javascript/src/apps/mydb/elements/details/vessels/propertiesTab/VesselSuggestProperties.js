/* eslint-disable max-len */
import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Col, Row, Form } from 'react-bootstrap';
import { CreatableSelect } from 'src/components/common/Select';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';
import { StoreContext } from 'src/stores/mobx/RootStore';

function VesselSuggestProperties({ id, label, field, value, readOnly, storeUpdater, onTemplateSelect }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    VesselsFetcher.getAllVesselNames()
      .then((data) =>
        data.map((vessel) => {
          if (field === 'vessel_name' || field === 'copy_properties') {
            const label = `${vessel.name} | ${vessel.vessel_type || ''} | ${vessel.material_type || ''} | ${vessel.volume_amount || ''} ${vessel.volume_unit || ''}`;
            return {
              value: vessel.name,
              label,
              id: vessel.id,
              vesselData: vessel,
            };
          }
          return {
            value: vessel[field],
            label: vessel[field],
            id: vessel.id,
            vesselData: vessel,
          };
        })
      )
      .then(setOptions);
  }, [field]);

  const handleChange = (selectedOption) => {
    if (!selectedOption || typeof selectedOption.value !== 'string') return;
  
    const currentEntry = options.find((x) => x.value === selectedOption.value);
    storeUpdater(id, selectedOption.value);
    if (onTemplateSelect && typeof onTemplateSelect === 'function' && currentEntry?.vesselData) {
      onTemplateSelect(currentEntry.vesselData);
    }
  };
  const handleInputChange = (inputValue) => {
    return inputValue;
  };


  if (readOnly) {
    return (
      <Form.Group as={Row} className="mb-3">
        <Form.Label column sm={3}>{label}</Form.Label>
        <Col sm={6}>
          <Form.Control disabled type="text" value={value} />
        </Col>
      </Form.Group>
    );
  }
  return (
    <Form.Group as={Row} className="my-3">
      <Form.Label column sm={3}>{label}</Form.Label>
      <Col sm={6}>
        <CreatableSelect
          value={
            value
              ? options.find((opt) => opt.value === value) || { value, label: value }
              : null
          }
          onInputChange={handleInputChange}
          onChange={handleChange}
          options={options}
          placeholder={`Enter new ${label.toLowerCase()} or choose from existing ones`}
          formatCreateLabel={(input) => `Create new: "${input}"`}
          isValidNewOption={(inputValue, _, options) =>
            !!inputValue && !options.some((opt) => opt.value === inputValue)
          }
        />
      </Col>
    </Form.Group>
  );
}

VesselSuggestProperties.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  field: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  storeUpdater: PropTypes.func.isRequired,
  isMismatch: PropTypes.bool,
  onTemplateSelect: PropTypes.func.isRequired,
};

export default observer(VesselSuggestProperties);
