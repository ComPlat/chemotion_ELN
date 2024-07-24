import React from 'react';
import {
  Button,
  ButtonGroup,
  Col,
  Form,
  InputGroup,
  Modal,
  Row
} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { CirclePicker } from 'react-color';
import { wellplateShowSample } from 'src/utilities/routesUtils';
import Aviator from 'aviator';
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

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
    <a onClick={() => navigateToSample(sample)} role="button">
      {sampleNameLabel}
    </a>
  );
}

const sampleVisualisation = (well, onChange) => {
  const { sample } = well;
  let svg = null;
  let removeButton = null;
  const removeSampleFromWell = () => {
    well.sample = null
    onChange(well)
  }

  const svgContainerStyle = {
    borderRadius: '50%',
    height: 190,
    width: 190,
    border: '6px solid lightgray',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 2,
    margin: '0 auto'
  };
  if (sample) {
    svg = <SVG key={sample.id} className="molecule-mid" src={sample.svgPath} />;
    removeButton = (
      <Button className="pull-right" size="sm" variant="danger" onClick={removeSampleFromWell}>
        <i className="fa fa-trash-o" />
      </Button>
    );
  }
  return (
    <>
      {removeButton}
      <div style={svgContainerStyle}>
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
  if (!readouts || readouts.every(readout => readout.unit == '' && readout.value == '')) return null;

  const readoutListItems = readouts.map((readout, index) => {
    return (
      <li key={`readout_${index}`}>
        <strong>{readoutTitles[index]}:</strong>
        {readout.value}
      </li>
    )
  })

  return (
    <div class="mt-3">
      <h4>Readouts</h4>
      <ul>
        {readoutListItems}
      </ul>
    </div>
  )
}

const labelSelection = (well, onChange) => {
  const wellLabels = well.label ? well.label.split(',') : [];
  const labelsIncludesMolecularStructure = wellLabels.some(item => item === 'Molecular structure')
  const labelsIncludeNonMolecularStructure = wellLabels.some(item => item !== 'Molecular structure')

  const labels = [
    { label: 'Name', value: 'Name', disabled: labelsIncludesMolecularStructure },
    { label: 'External label', value: 'External label', disabled: labelsIncludesMolecularStructure },
    { label: 'Molecular structure', value: 'Molecular structure', disabled: labelsIncludeNonMolecularStructure }
  ];

  return (
    <div class="mt-3">
      <h4>Select label type</h4>
      <Select
        className="well-overlay-select"
        id="label"
        name="label"
        multi
        options={labels}
        value={well.label}
        onChange={selectedOptions => {
          const newLabel = selectedOptions.map(option => option.label).toString()
          well.label = newLabel
          onChange(well)
        }}
      />
    </div>
  )
}

const colorPicker = (well, onChange) => {
  const { sample, readouts } = well;

  return (
    <div class="mt-3">
      <Form.Group as={Row} controlId="formColorSelectorDisplay">
        <Form.Label as="h4">Select Color</Form.Label>
        <InputGroup>
          <InputGroup.Text style={{backgroundColor: well.color_code}} />
          <Form.Control
            className="input-sm"
            type="text"
            readOnly
            value={well.color_code}
          />
        </InputGroup>
      </Form.Group>
      <Form.Group controlId="formHorizontalPicker" class="my-3">
        <CirclePicker
          circleSize={17}
          width="100%"
          onChangeComplete={(color) => {
            well.color_code = color.hex;
            onChange(well)
          }}
        />
      </Form.Group>
    </div>
  );
};

const WellDetails = ({ well, readoutTitles, handleClose, onChange}) => {
  return (
    <Modal
      animation
      centered
      show={() => { well != null }}
      onHide={handleClose}
    >
      <Modal.Header closeButton>
        <Modal.Title as="h3">Well Details for Well {well.alphanumericPosition}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {sampleVisualisation(well, onChange)}
        {labelSelection(well, onChange)}
        {readoutSection(well.readouts, readoutTitles)}
        {colorPicker(well, onChange)}
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
