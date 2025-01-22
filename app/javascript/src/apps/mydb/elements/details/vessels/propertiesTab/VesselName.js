import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { Col, Row, Form } from 'react-bootstrap';
import { CreatableSelect } from 'src/components/common/Select';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';

const VesselName = ({ id, name, readOnly }) => {
  const { vesselDetailsStore } = useContext(StoreContext);
  const [nameSuggestions, setNameSuggestions] = useState([]);

  useEffect(() => {
    VesselsFetcher.getAllVesselNames()
      .then((data) =>
        data.map((x) => ({
          value: x.id,
          label: x.name,
          name: x.name,
        }))
      )
      .then((data) => {
        setNameSuggestions(data);
      });
  }, []);

  const handleChange = (e) => {
    if (e && typeof e.value === 'string') {
      const currentEntry = nameSuggestions.find((x) => x.value === e.value);
      if (currentEntry) {
        vesselDetailsStore.changeVesselName(id, currentEntry.name);
        VesselsFetcher.getVesselMaterialById(e.value)
          .then((result) => {
            vesselDetailsStore.setMaterialProperties(id, result);
          })
          .catch((error) => {
            console.error('Error fetching vessel material properties:', error);
          });
      } else {
        vesselDetailsStore.changeVesselName(id, e.value);
      }
    } else if (e?.value) {
      vesselDetailsStore.changeVesselName(id, e.value);
    }
  };

  const handleInputChange = (e, action) => {
    if (action.action === 'input-change') {
      vesselDetailsStore.changeVesselName(id, e);
    }
  };

  if (readOnly) {
    return (
      <Form.Group as={Row}>
        <Form.Label column sm={3}>Vessel name *</Form.Label>
        <Col sm={9}>
          <Form.Control
            disabled
            type="text"
            value={vesselDetailsStore.getVessel(id).vesselName}
          />
        </Col>
      </Form.Group>
    );
  }
  
  return (
    <Form.Group as={Row}>
      <Form.Label column sm={3}>Vessel name *</Form.Label>
      <Col sm={9}>
        <CreatableSelect
          value={
            name
              ? nameSuggestions.find((x) => x.name === name) || { value: name, label: name }
              : null
          }
          onChange={handleChange}
          onInputChange={handleInputChange}
          options={nameSuggestions}
          placeholder="Enter new vessel name or choose from existing ones"
        />
      </Col>
    </Form.Group>
  );
}

VesselName.propTypes = {
  id: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
};

export default observer(VesselName);
