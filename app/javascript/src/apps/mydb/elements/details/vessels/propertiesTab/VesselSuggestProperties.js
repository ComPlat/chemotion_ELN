import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Col, Row, Form } from 'react-bootstrap';
import { CreatableSelect } from 'src/components/common/Select';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';
import { StoreContext } from 'src/stores/mobx/RootStore';

function VesselSuggestProperties({ id, label, field, value, readOnly, storeUpdater }) {
  const { vesselDetailsStore } = useContext(StoreContext);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    VesselsFetcher.getAllVesselNames()
      .then((data) => data.map((vessel) => ({
        value: field === 'vessel_name' ? vessel.name : vessel[field],
        label: field === 'vessel_name' ? vessel.name : vessel[field],
        id: vessel.id,
        vesselData: vessel,
      }))
      )
      .then(setOptions);
  }, [field]);

  const handleChange = (selectedOption) => {
    if (selectedOption && typeof selectedOption.value === 'string') {
      const currentEntry = options.find((x) => x.value === selectedOption.value);

      if (currentEntry) {
        storeUpdater(id, currentEntry.value);

        // Fetch and set vessel material properties for other fields if the selected field is vessel name
        if (field === 'vessel_name') {
          VesselsFetcher.getVesselMaterialById(selectedOption.id)
            .then((result) => {
              vesselDetailsStore.setMaterialProperties(id, result);
            })
            .catch((error) => {
              console.error('Error fetching vessel template properties:', error);
            });
        }
      } else {
        storeUpdater(id, selectedOption.value);
      }
    } else if (selectedOption?.value) {
      storeUpdater(id, selectedOption.value);
    }
  };

  if (readOnly) {
    return (
      <Form.Group as={Row}>
        <Form.Label column sm={3}>{label}</Form.Label>
        <Col sm={6}>
          <Form.Control disabled type="text" value={value} />
        </Col>
      </Form.Group>
    );
  }
  return (
    <Form.Group as={Row} className="mt-3">
      <Form.Label column sm={3}>{label}</Form.Label>
      <Col sm={6}>
        <CreatableSelect
          value={value ? { value, label: value } : null}
          onChange={handleChange}
          options={options}
          placeholder={`Enter new ${label.toLowerCase()} or choose from existing ones`}
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
};

export default observer(VesselSuggestProperties);
