/* eslint-disable camelcase */
import React, { useState, useEffect } from 'react';
import {
  Button,
  Form,
  InputGroup,
  Modal,
  Row,
  Col
} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import PropTypes from 'prop-types';
import { Select } from 'src/components/common/Select';
import { wellplateShowSample } from 'src/utilities/routesUtils';
import Aviator from 'aviator';
import { colorOptions } from 'src/components/staticDropdownOptions/options';

const navigateToSample = (sample) => {
  const { params, uri } = Aviator.getCurrentRequest();
  Aviator.navigate(`${uri}/sample/${sample.id}`, { silent: true });
  wellplateShowSample({ params: { ...params, sampleID: sample.id } });
};

const sampleName = (sample) => {
  if (sample == null) return 'No Sample selected';

  const { name, external_label, short_label } = sample;
  const sampleNameLabel = `${name || ''} ${external_label || ''} ${short_label || ''}`;
  if (sample.isNew) {
    return sampleNameLabel;
  }
  return (
    <a onClick={() => navigateToSample(sample)} role="button" className="text-primary">
      {sampleNameLabel}
    </a>
  );
};

const sampleVisualisation = (well, onChange) => {
  const { sample } = well;
  let svg = null;
  let removeButton = null;
  const removeSampleFromWell = () => {
    well.sample = null;
    onChange(well);
  };

  if (sample) {
    svg = <SVG key={sample.id} className="molecule-mid" src={sample.svgPath} />;
    removeButton = (
      <Button size="sm" variant="danger" onClick={removeSampleFromWell}>
        <i className="fa fa-trash-o" />
      </Button>
    );
  }
  return (
    <>
      {removeButton}
      <div className="well-details-svg-container">
        {svg}
      </div>
      <p className="wellplate-overlay text-center">
        {sampleName(sample)}
        <br />
        {sample?.molecule?.iupac_name || ''}
      </p>
    </>
  );
};

const readoutSection = (readouts, readoutTitles) => {
  if (!readouts || readouts.every((readout) => readout.unit == '' && readout.value == '')) return null;

  const readoutListItems = readouts.map((readout, index) => (
    <li key={`readout_${index}`}>
      <strong>
        {readoutTitles[index]}
        :
      </strong>
      {readout.value}
    </li>
  ));

  return (
    <div className="mt-3">
      <h4>Readouts</h4>
      <ul>
        {readoutListItems}
      </ul>
    </div>
  );
};

const labelSelection = (well, onChange) => {
  const wellLabels = well.label ? well.label.split(',') : [];
  const labelsIncludesMolecularStructure = wellLabels.some((item) => item === 'Molecular structure');
  const labelsIncludeNonMolecularStructure = wellLabels.some((item) => item !== 'Molecular structure');

  const labelOptions = [
    { label: 'Name', value: 'Name', disabled: labelsIncludesMolecularStructure },
    { label: 'External label', value: 'External label', disabled: labelsIncludesMolecularStructure },
    { label: 'Molecular structure', value: 'Molecular structure', disabled: labelsIncludeNonMolecularStructure }
  ];

  return (
    <div className="mt-3">
      <h4>Select label type</h4>
      <Select
        name="label"
        isMulti
        options={labelOptions}
        value={labelOptions.filter(({ value }) => wellLabels.includes(value))}
        isOptionDisabled={(option) => option.disabled}
        styles={{
          option: (provided, state) => {
            const isDisabled = state.data.disabled;
            return {
              ...provided,
              color: isDisabled ? 'gray' : 'black',
            };
          }
        }}
        onChange={(selectedOptions) => {
          const newLabel = selectedOptions.map((option) => option.label).join(',');
          well.label = newLabel;
          onChange(well);
        }}
      />
    </div>
  );
};

const colorPicker = (well, onChange, activeColor, setActiveColor) => (
  <div className="mt-3">
    <Form.Group as={Row} controlId="formColorSelectorDisplay">
      <Form.Label as="h4">Select Color</Form.Label>
      <Col xs="auto" className="pe-0">
        <div className="color-preview-box" style={{ backgroundColor: activeColor || "#fff" }} />
      </Col>
      <Col className="ps-0">
        <Select
          className="rounded-corners"
          name="colorPicker"
          isClearable
          options={colorOptions}
          value={colorOptions.find(({ value }) => value === activeColor) || null}
          onChange={(option) => {
            const hex = option?.value || null;
            const newColor = activeColor === hex ? null : hex;
            setActiveColor(newColor);
            onChange({ ...well, color_code: newColor });
          }}
          styles={{
            menuList: (base) => ({
              ...base,
              maxHeight: '200px',
            }),
          }}
          placeholder="Choose a color..."
        />
      </Col>
    </Form.Group>
  </div>
)

const WellDetails = ({ well, readoutTitles, handleClose, onChange }) => {
  const [activeColor, setActiveColor] = useState(well.color_code || null);
  return (
    <Modal
      animation
      centered
      show={() => { well != null; }}
      onHide={handleClose}
    >
      <Modal.Header closeButton>
        <Modal.Title as="h3">Well Details for Well {well.alphanumericPosition}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {sampleVisualisation(well, onChange)}
        {labelSelection(well, onChange)}
        {readoutSection(well.readouts, readoutTitles)}
        {colorPicker(well, onChange, activeColor, setActiveColor)}
      </Modal.Body>
    </Modal>
  );
}

WellDetails.propTypes = {
  well: PropTypes.object.isRequired,
  readoutTitles: PropTypes.array.isRequired,
  handleClose: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default WellDetails;
