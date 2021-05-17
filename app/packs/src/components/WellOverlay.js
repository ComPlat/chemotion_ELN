import React from 'react';
import { Button, Popover, Overlay, ControlLabel, FormGroup, FormControl, InputGroup } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import Aviator from 'aviator';
import PropTypes from 'prop-types';
import { wellplateShowSample } from './routesUtils';

const title = handleClose => (
  <div>
    Well Details
    <span className="pull-right" style={{ marginRight: -8, marginTop: -3 }}>
      <Button bsSize="xsmall" onClick={() => handleClose()}>
        <i className="fa fa-times" />
      </Button>
    </span>
  </div>
);

const handleSampleClick = (sample) => {
  const { params, uri } = Aviator.getCurrentRequest();
  Aviator.navigate(`${uri}/sample/${sample.id}`, { silent: true });
  wellplateShowSample({ params: { ...params, sampleID: sample.id } });
};

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

const content = (well, readoutTitles, removeSampleFromWell) => {
  const { sample, readouts } = well;
  return (
    <div style={{ width: 200 }}>
      {renderWellContent(well, removeSampleFromWell)}
      <div>
        <hr style={{ marginTop: 28, marginBottom: 10 }} />
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
        <FormGroup>
          <ControlLabel>Imported Readout</ControlLabel>
          <FormControl
            componentClass="textarea"
            disabled
            value={sampleImportedReadout(sample) || ''}
            style={{ height: 100 }}
          />
        </FormGroup>
      </div>
    </div>
  );
};

const WellOverlay = ({
  show, well, readoutTitles, placement, target, handleClose, removeSampleFromWell
}) => (
  <Overlay
    rootClose
    show={show}
    target={target}
    placement={placement}
    onHide={() => handleClose()}
  >
    <Popover title={title(handleClose)} id={`wellpop${well.id}`}>
      {content(well, readoutTitles, removeSampleFromWell)}
    </Popover>
  </Overlay>
);

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
