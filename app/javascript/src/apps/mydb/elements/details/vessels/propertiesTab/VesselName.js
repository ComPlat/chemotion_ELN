import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { Col, Row, Form } from 'react-bootstrap';
import { CreatableSelect } from 'src/components/common/Select';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';

function VesselName({ id, name, readOnly }) {
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
    if (typeof e.value === 'number') {
      const currentEntry = nameSuggestions.filter((x) => x.value === e.value);
      if (currentEntry.length > 0) {
        vesselDetailsStore.changeVesselName(id, currentEntry[0].name);
        VesselsFetcher.getVesselMaterialById(e.value).then((result) => {
          vesselDetailsStore.setMaterialProperties(id, result);
        });
      }
    } else {
      vesselDetailsStore.changeVesselName(id, e.value);
    }
  };

  const handleInputChange = (e, action) => {
    if (action.action === 'input-change') {
      vesselDetailsStore.changeVesselName(id, e);
    }
  };

  const renderNameSuggestion = (name, src) => (
    <span className="d-block text-start">
      {name}
      (
      {src}
      )
    </span>
  );

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

  const className = vesselDetailsStore.getVessel(id).vesselName
    ? 'cell-line-name-autocomplete'
    : 'cell-line-name-autocomplete invalid';

  return (
    <Form.Group as={Row} className="cell-line-name">
      <Form.Label column sm={3}>Vessel name *</Form.Label>
      <Col sm={9}>
        <CreatableSelect
          // className={className}
          onChange={handleChange}
          onInputChange={handleInputChange}
          options={nameSuggestions}
          placeholder="Enter new vessel name or choose from existing ones"
          defaultInputValue={name}
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

export default VesselName;
