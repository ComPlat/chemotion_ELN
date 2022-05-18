import React from 'react';
import {
  Button,
  Popover,
  Overlay,
  ControlLabel,
  FormGroup,
  FormControl,
  Col, InputGroup, ButtonGroup, Form,
} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import UIStore from './stores/UIStore';
import { wellplateShowSample } from './routesUtils';
import Select from 'react-select';
import { CirclePicker } from 'react-color';

const WellOverlay = ({show, well, placement, target, handleClose, removeSampleFromWell, handleWellLabel, handleColorPicker, selectedColor, saveColorCode}) => {
  return (
    <Overlay  rootClose
              show={show}
              target={target}
              placement={placement}
              style={{ position: 'sticky', top: 0, overflow: 'scroll' }}
              onHide={() => handleClose()} >
      <Popover title={title(handleClose)} id={'wellpop'+well.id}>
        {content(well, removeSampleFromWell, handleWellLabel, handleColorPicker, selectedColor, saveColorCode)}
      </Popover>
    </Overlay>
  );
}

const content = (well, removeSampleFromWell, handleWellLabel, handleColorPicker, selectedColor, saveColorCode) => {
  const { sample } = well;
  const bcStyle = {
    backgroundColor: selectedColor || well.color_code
  };
  const wellLabels = well.label ? well.label.split(',') : [];
  const isDisable = () => wellLabels.some(item => item === 'Molecular structure');

  const labels = [{
    label: 'Name',
    value: 'Name',
    disabled: isDisable()
  }, {
    label: 'External label',
    value: 'External label',
    disabled: isDisable()
  }, {
    label: 'Molecular structure',
    value: 'Molecular structure',
    disabled: (wellLabels.some(item => item !== 'Molecular structure'))
  }];

  return(
    <div style={{ width: 220, height: 650 }}>
      {renderWellContent(well, removeSampleFromWell)}
      <div>
        <Select
          id="label"
          name="label"
          multi
          options={labels}
          value={well.label}
          onChange={e => handleWellLabel(e)}
          style={{ top: '2px', bottom: '2px' }}
        />
        <FormGroup>
          <ControlLabel>Readout</ControlLabel>
          <FormControl componentClass="textarea"
            disabled={true}
            value={well.readout || ''}
            style={{ height: 50 }}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Imported Readout</ControlLabel>
          <FormControl componentClass="textarea"
            disabled={true}
            value={sampleImportedReadout(sample) || ''}
            style={{ height: 50 }}
          />
        </FormGroup>
        <FormGroup>
          <Col style={{ marginLeft: '-15px' }} class="row row-no-gutters" componentClass={ControlLabel} sm={3}>
            Select&nbsp;Color
          </Col>
          <Col sm={9} style={{ marginLeft: '35px', width: '65%' }}>
            <InputGroup>
              <InputGroup.Addon style={bcStyle}></InputGroup.Addon>
              <FormControl
                class="input-sm"
                type="text"
                readOnly
                value={selectedColor || well.color_code}
              />
            </InputGroup>
          </Col>
        </FormGroup>
        <FormGroup controlId="formHorizontalPicker" style={{ marginTop: '60px' }}>
          <CirclePicker circleSize={17} width="100%" onChangeComplete={e => handleColorPicker(e)} />
        </FormGroup>
        <ButtonGroup style={{ bottom: '5x' }}>
          <Button style={{ left: '80px' }} onClick={saveColorCode}>Save</Button>
        </ButtonGroup>
      </div>
    </div>
  )
}

const title = (handleClose) => {
  return(
    <div>
      Well Details
      <span className='pull-right' style={{marginRight: -8, marginTop: -3}}>
        <Button bsSize='xsmall' onClick={() => handleClose()}>
          <i className="fa fa-times"></i>
        </Button>
      </span>
    </div>
  )
}

const renderWellContent = (well, removeSampleFromWell) => {
  const {sample} = well;
  let svg, moleculeName, removeButton = '';

  const svgContainerStyle = {
    borderRadius: '50%',
    height: 190,
    width: 190,
    border: '6px solid lightgray',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 2
  };
  if (sample) {
    svg = <SVG key={sample.id} className="molecule-mid" src={sample.svgPath}/>;
    moleculeName = sample.molecule.iupac_name;
    removeButton = (
      <div className="pull-right">
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => removeSampleFromWell(well)}>
          <span className="fa fa-trash-o"></span>
        </Button>
      </div>
    );
  }
  return (
    <div>
      <div style={svgContainerStyle}>
        {svg}
      </div>
      <div className="wellplate-overlay">
        {sampleName(sample)}<br/>
        {moleculeName}<br/>
      </div>
        <div>
          {removeButton}
      </div>
    </div>
  );
}

const sampleImportedReadout = (sample) => {
  return sample
    ? sample.imported_readout
    : ''
}

const sampleName = (sample) => {
  if(sample) {
    let {name, external_label, short_label} = sample
    let sampleNameLabel = `${name || ""} ${external_label || ""} ${short_label || ""}`
    if(sample.isNew) {
      return sampleNameLabel;
    } else {
      return (
        <a onClick={() => handleSampleClick(sample)} style={{cursor: 'pointer'}}>
          {sampleNameLabel}
        </a>
      );
    }

  }
}

const handleSampleClick = (sample) => {
  const { params, uri } = Aviator.getCurrentRequest();
  Aviator.navigate(`${uri}/sample/${sample.id}`, { silent: true });
  wellplateShowSample({ params: { ...params, sampleID: sample.id } });
}

export default WellOverlay;
