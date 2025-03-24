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
  const [suggestedName, setSuggestedName] = useState('');
  const [details, setDetails] = useState('');
  const [vesselType, setVesselType] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [onChangeTimeout, setOnChangeTimeout] = useState(null);

  useEffect(() => {
    VesselsFetcher.getAllVesselNames()
      .then((data) => data.map((vessel) => ({
        value: field === 'vessel_name' ? vessel.name : vessel[field],
        label: field === 'vessel_name' ? vessel.name : vessel[field],
        id: vessel.id,
        vesselData: vessel,
      })))
      .then(setOptions);
  }, [field]);

  useEffect(() => {
    if (details && vesselType && materialType) {
      if (onChangeTimeout) clearTimeout(onChangeTimeout);

      const timeout = setTimeout(() => {
        VesselsFetcher.suggestVesselName({
          details,
          vessel_type: vesselType,
          material_type: materialType,
        })
          .then((response) => {
            if (response?.name) {
              storeUpdater(id, response.name);
            }
          })
          .catch((error) => console.error('Error suggesting vessel name:', error));
      }, 500);

      setOnChangeTimeout(timeout);
    }
  }, [details, vesselType, materialType]);

  const suggestVesselName = (details, vesselType, materialType) => {
    VesselsFetcher.suggestVesselName({ details, vessel_type: vesselType, material_type: materialType })
      .then((response) => {
        if (response?.name) {
          storeUpdater(id, response.name);
        }
      })
      .catch((error) => {
        console.error('Error suggesting vessel name:', error);
      });
  };

  const handleFieldChange = (selectedOption, fieldType) => {
    if (selectedOption && typeof selectedOption.value === 'string') {
      storeUpdater(id, selectedOption.value);

      if (fieldType === 'details') setDetails(selectedOption.value);
      if (fieldType === 'vessel_type') setVesselType(selectedOption.value);
      if (fieldType === 'material_type') setMaterialType(selectedOption.value);

      suggestVesselName(
        fieldType === 'details' ? selectedOption.value : details,
        fieldType === 'vessel_type' ? selectedOption.value : vesselType,
        fieldType === 'material_type' ? selectedOption.value : materialType
      );
    }
  };

  const handleChange = (selectedOption) => {
    if (selectedOption && typeof selectedOption.value === 'string') {
      const currentEntry = options.find((x) => x.value === selectedOption.value);

      if (currentEntry) {
        storeUpdater(id, currentEntry.value);

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
    }
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
    <Form.Group as={Row} className="mt-3">
      <Form.Label column sm={3}>{label}</Form.Label>
      <Col sm={6}>
        <CreatableSelect
          value={value ? { value, label: value } : null}
          onChange={field === 'vessel_name' ? handleChange : (option) => handleFieldChange(option, field)}
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
