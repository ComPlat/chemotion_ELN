import React from 'react';
import { Button, Popover, Overlay, ControlLabel, FormGroup, FormControl, Col, InputGroup, ButtonGroup } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { CirclePicker } from 'react-color';

const WellOverlay = ({
  show, well, readoutTitles, placement, target, handleClose, removeSampleFromWell, handleWellLabel, handleColorPicker, selectedColor, saveColorCode}) => {
  return (
    <Overlay  rootClose
              show={show}
              target={target}
              placement={placement}
              onHide={() => handleClose()} >
      <Popover title={title(handleClose)} id={'wellpop'+well.id}>
        {content(well, readoutTitles, removeSampleFromWell, handleWellLabel, handleColorPicker, selectedColor, saveColorCode)}
      </Popover>
    </Overlay>
  );
}

// TODO: remove this
// const content = (well, readoutTitles, removeSampleFromWell) => {
//   const { sample, readouts } = well;
//   return (
//     <div style={{ width: 200 }}>
//       {renderWellContent(well, removeSampleFromWell)}
//       <div>
//         <hr style={{ marginTop: 28, marginBottom: 10 }} />
//         <FormGroup>
//           {readouts && readouts.map((readout, index) => (
//             <div key={`readout_${readout.id}`}>
//               <ControlLabel>{readoutTitles[index]}</ControlLabel>
//               <InputGroup>
//                 <FormControl
//                   type="text"
//                   value={readout.value}
//                   disabled
//                   placeholder="Value"
//                 />
//                 <InputGroup.Addon disabled>{readout.unit}</InputGroup.Addon>
//               </InputGroup>
//             </div>
//           ))}
//         </FormGroup>
//         <FormGroup style={{ display: 'none' }}>
//           <ControlLabel>Imported Readout</ControlLabel>
//           <FormControl
//             componentClass="textarea"
//             disabled
//             value={sampleImportedReadout(sample) || ''}
//             style={{ height: 50 }}
//           />
//         </FormGroup>
//       </div>
//     </div>
//   );
// };

const content = (
  well, readoutTitles, removeSampleFromWell, handleWellLabel, handleColorPicker, selectedColor, saveColorCode) => {
  const { sample, readouts } = well;
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
    <div style={{width: 220, height: 850}}>
      {renderWellContent(well, removeSampleFromWell)}
      <div>
        <hr style={{marginTop: 28, marginBottom: 10}}/>
        <Select
          id="label"
          name="label"
          multi
          options={labels}
          value={well.label}
          onChange={e => handleWellLabel(e)}
        />
        &nbsp;
        <FormGroup>
          {readouts && readouts.map((readout, index) => (
            <div key={`readout_${readout.id}`}>
              <ControlLabel>{readoutTitles[index]}</ControlLabel>
              <InputGroup>
                <FormControl
                  type="text"
                  value={readout.value}
                  disabled
                  placeholder="Value"
                />
                <InputGroup.Addon disabled>{readout.unit}</InputGroup.Addon>
              </InputGroup>
            </div>
          ))}
        </FormGroup>
        <FormGroup style={{ display: 'none' }}>
          <ControlLabel>Imported Readout</ControlLabel>
          <FormControl
            componentClass="textarea"
            disabled
            value={sampleImportedReadout(sample) || ''}
            style={{ height: 50 }}
          />
        </FormGroup>
        <FormGroup style={{ top: '50px' }} controlId="colorInput">
          <Col componentClass={ControlLabel} sm={3}>
            Select Color
          </Col>
          <Col sm={9}>
            <InputGroup>
              <InputGroup.Addon style={bcStyle}></InputGroup.Addon>
              <FormControl
                type="text"
                readOnly
                value={selectedColor || well.color_code}
              />
            </InputGroup>
          </Col>
        </FormGroup>
        <FormGroup controlId="formHorizontalPicker">
          <Col sm={12}>
            <CirclePicker width="132%" onChangeComplete={e => handleColorPicker(e)} />
          </Col>
        </FormGroup>
        <ButtonGroup style={{ top: '10px', bottom: '10px' }}>
          <Button style={{ left: '80px' }} onClick={saveColorCode}>Save</Button>
        </ButtonGroup>
      </div>
    </div>
  )
}

const sampleName = (sample) => {
  if (sample) {
    const { name, external_label, short_label } = sample;
    const sampleNameLabel = `${name || ''} ${external_label || ''} ${short_label || ''}`;
    if (sample.isNew) {
      return sampleNameLabel;
    }
    return (
      <a onClick={() => handleSampleClick(sample)} style={{ cursor: 'pointer' }}>
        {sampleNameLabel}
      </a>
    );
  }
  return (<div />);
};

const renderWellContent = (well, removeSampleFromWell) => {
  const { sample } = well;
  let svg = '';
  let moleculeName = '';
  let removeButton = '';
  const namesStyle = { textAlign: 'center', marginTop: 5 };
  const svgContainerStyle = {
    borderRadius: '50%',
    height: 200,
    width: 200,
    border: '6px solid lightgray',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 2
  };
  if (sample) {
    svg = <SVG key={sample.id} className="molecule-mid" src={sample.svgPath} />;
    moleculeName = sample.molecule.iupac_name;
    removeButton = (
      <div className="pull-right">
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => removeSampleFromWell(well)}>
          <span className="fa fa-trash-o" />
        </Button>
      </div>
    );
  }
  return (
    <div>
      <div style={svgContainerStyle}>
        {svg}
      </div>
      <div style={namesStyle}>
        {sampleName(sample)}<br />
        {moleculeName}<br />
      </div>
      {removeButton}
    </div>
  );
};

const sampleImportedReadout = sample => (sample ? sample.imported_readout : '');

WellOverlay.propTypes = {
  show: PropTypes.bool.isRequired,
  well: PropTypes.object.isRequired,
  readoutTitles: PropTypes.array.isRequired,
  placement: PropTypes.string.isRequired,
  target: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
  removeSampleFromWell: PropTypes.func.isRequired,
};

export default WellOverlay;