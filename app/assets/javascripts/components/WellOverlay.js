import React from 'react';
import {Button, Popover, Overlay, ControlLabel, FormGroup, FormControl} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import UIStore from './stores/UIStore';

const WellOverlay = ({show, well, placement, target, handleClose, removeSampleFromWell}) => {
  return (
    <Overlay  rootClose
              show={show}
              target={target}
              placement={placement}
              onHide={() => handleClose()} >
      <Popover title={title(handleClose)} id={'wellpop'+well.id}>
        {content(well, removeSampleFromWell)}
      </Popover>
    </Overlay>
  );
}

const content = (well, removeSampleFromWell) => {
  const { sample } = well;
  return(
    <div style={{width: 200, height: 620}}>
      {renderWellContent(well, removeSampleFromWell)}
      <div>
        <hr style={{marginTop: 28, marginBottom: 10}}/>
        <FormGroup>
          <ControlLabel>Readout</ControlLabel>
          <FormControl componentClass="textarea"
            disabled={true}
            value={well.readout || ''}
            style={{height: 100}}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Imported Readout</ControlLabel>
          <FormControl componentClass="textarea"
            disabled={true}
            value={sampleImportedReadout(sample) || ''}
            style={{height: 100}}
          />
        </FormGroup>
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
  const namesStyle= {textAlign: 'center', marginTop: 5};
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
      <div style={namesStyle}>
        {sampleName(sample)}<br/>
        {moleculeName}<br/>
      </div>
      {removeButton}
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
  const {currentCollection,isSync} = UIStore.getState();
  const currentURI = Aviator.getCurrentURI();
  Aviator.navigate(`${currentURI}/sample/${sample.id}`);
}

export default WellOverlay;
