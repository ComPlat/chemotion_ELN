/* eslint-disable max-len */
import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Col, Row, Form } from 'react-bootstrap';
import { CreatableSelect } from 'src/components/common/Select';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';
import { StoreContext } from 'src/stores/mobx/RootStore';

function VesselSuggestProperties({ id, label, field, value, readOnly, storeUpdater, isMismatch = false, onTemplateSelect }) {
  const { vesselDetailsStore } = useContext(StoreContext);
  const [options, setOptions] = useState([]);
  const [vesselType, setVesselType] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [details, setDetails] = useState('');
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);

  const isTemplateMismatch = (vesselData) => (
    vesselData?.vessel_type !== vesselType
    || vesselData?.material_type !== materialType
    || vesselData?.volume_amount !== vesselDetailsStore.getVessel(id)?.volumeAmount
  );

  useEffect(() => {
    const currentName = vesselDetailsStore.getVessel(id)?.vesselName;
    const matched = options.find((opt) => opt.value === currentName);

    if (!matched) {
      vesselDetailsStore.setNameDuplicateFlag(id, false);
      setSelectedTemplateData(null);
    }
  }, [value, options]);

  useEffect(() => {
    VesselsFetcher.getAllVesselNames()
      .then((data) =>
        data.map((vessel) => {
          if (field === 'vessel_name') {
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

  const handleFieldChange = (selectedOption, fieldType) => {
    if (selectedOption && typeof selectedOption.value === 'string') {
      storeUpdater(id, selectedOption.value);

      if (fieldType === 'details') setDetails(selectedOption.value);
      if (fieldType === 'vessel_type') setVesselType(selectedOption.value);
      if (fieldType === 'material_type') setMaterialType(selectedOption.value);

      if (['details', 'vessel_type', 'material_type'].includes(fieldType) && selectedTemplateData) {
        const vessel = vesselDetailsStore.getVessel(id);
        const mismatch = (
          selectedTemplateData.vessel_type !== (fieldType === 'vessel_type' ? selectedOption.value : vessel.vesselType)
          || selectedTemplateData.material_type !== (fieldType === 'material_type' ? selectedOption.value : vessel.materialType)
          || selectedTemplateData.volume_amount !== vessel.volumeAmount
        );
        vesselDetailsStore.setNameDuplicateFlag(id, mismatch);
      }
    }
  };

  const handleChange = (selectedOption) => {
    if (selectedOption && typeof selectedOption.value === 'string') {
      const currentEntry = options.find((x) => x.value === selectedOption.value);

      storeUpdater(id, selectedOption.value);

      if (field === 'vessel_name') {
        vesselDetailsStore.setNameDuplicateFlag(id, false);

        if (currentEntry) {
          if (typeof onTemplateSelect === 'function') {
            onTemplateSelect(currentEntry.vesselData);
          }

          VesselsFetcher.getVesselMaterialById(selectedOption.id)
            .then((result) => {
              vesselDetailsStore.setMaterialProperties(id, result);
            })
            .catch((error) => {
              console.error('Error fetching vessel template properties:', error);
            });
        } else {
          if (typeof onTemplateSelect === 'function') {
            onTemplateSelect(null);
          }
        }
      }
    }
  };

  const handleInputChange = (inputValue, actionMeta) => {
    if (actionMeta.action === 'input-change' && field === 'vessel_name') {
      storeUpdater(id, inputValue);

      const existing = options.find((opt) => opt.value === inputValue);
      const mismatch = existing ? isTemplateMismatch(existing.vesselData) : false;

      vesselDetailsStore.setNameDuplicateFlag(id, mismatch);
    }
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
    <Form.Group as={Row} className="mt-3">
      <Form.Label column sm={3}>{label}</Form.Label>
      <Col sm={6}>
        <CreatableSelect
          value={
            value
              ? options.find((opt) => opt.value === value) || { value, label: value }
              : null
          }
          onInputChange={handleInputChange}
          onChange={field === 'vessel_name' ? handleChange : (option) => handleFieldChange(option, field)}
          options={options}
          placeholder={`Enter new ${label.toLowerCase()} or choose from existing ones`}
          formatCreateLabel={(input) => `Create new: "${input}"`}
          isValidNewOption={(inputValue, _, options) =>
            !!inputValue && !options.some((opt) => opt.value === inputValue)
          }
        />
        {field === 'vessel_name' && (
          <div className="mt-1 ms-2">
            {isMismatch ? (
              <div className="text-danger">
                A different template already uses this name. Please choose a unique one.
              </div>
            ) : (
              <Form.Text className="text-muted">
                You can edit this name. It will act as a unique identifier for this vessel template.
              </Form.Text>
            )}
          </div>
        )}
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
