import React, {Component} from 'react';
import {Button, Popover, Overlay, Table, Input} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import UiStore from './stores/UIStore';

export default class WellOverlay extends Component {
  handleSampleClick(sample) {
    const uiState = UiStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}/sample/${sample.id}`);
  }

  sampleName() {
    const {sample} = this.props.well;
    if(sample) {
      let {name, external_label, short_label} = sample
      let sampleName = `${name || ""} ${external_label || ""} ${short_label || ""}`
      if(sample.isNew) {
        return sampleName;
      } else {
        return (
          <a onClick={() => this.handleSampleClick(sample)} style={{cursor: 'pointer'}}>
            {sampleName}
          </a>
        );
      }

    }
  }

  renderWellContent() {
    const {well, removeSampleFromWell} = this.props;
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
      svg = <SVG key={sample.id} className="molecule-mid" src={`/images/molecules/${sample.molecule.molecule_svg_file}`}/>;
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
          {this.sampleName()}<br/>
          {moleculeName}<br/>
        </div>
        {removeButton}
      </div>
    );
  }

  sampleImportedReadout() {
    const {sample} = this.props.well;
    if(sample) {
      return sample.imported_readout
    }
    return ""
  }

  render() {
    const {show, well, target, handleClose, placement} = this.props;

    let title = (
      <div>
        Well Details
        <span className='pull-right' style={{marginRight: -8, marginTop: -3}}>
          <Button bsSize='xsmall' onClick={() => handleClose()}>
            <i className="fa fa-times"></i>
          </Button>
        </span>
      </div>
    );
    return (
      <div>
        <Overlay
          rootClose
          show={show}
          target={target}
          placement={placement}
          onHide={() => handleClose()}
          >
          <Popover title={title}>
            <div style={{width: 200, height: 620}}>
              {this.renderWellContent()}
              <div>
                <hr style={{marginTop: 28, marginBottom: 10}}/>
                <Input
                  type="textarea"
                  label="Readout"
                  disabled={true}
                  value={well.readout}
                  style={{height: 100}}
                  />
                <Input
                  type="textarea"
                  label="Imported Readout"
                  disabled={true}
                  value={this.sampleImportedReadout()}
                  style={{height: 100}}
                  />
              </div>
            </div>
          </Popover>
        </Overlay>
      </div>
    );
  }
}
