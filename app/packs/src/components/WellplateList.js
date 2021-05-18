import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, FormControl } from 'react-bootstrap';
import SVG from 'react-inlinesvg';

export default class WellplateList extends Component {
  handleReadoutOfWellChange(event, well, index, type) {
    const { value } = event.target;
    const { wells, handleWellsChange } = this.props;
    const wellId = wells.indexOf(well);
    wells[wellId].readouts[index][type] = value;
    handleWellsChange(wells);
  }

  renderReadoutHeaders() {
    const { readoutTitles } = this.props;
    return (
      readoutTitles.map((title) => {
        const key = title.id;
        return (
          [
            <th key={`v_${key}`} width="15%">{title} Value</th>,
            <th key={`u_${key}`} width="10%">{title} Unit</th>
          ]
        );
      })
    );
  }

  renderReadoutFields(well) {
    const { readouts } = well;
    const inputContainerStyle = {
      padding: 0
    };
    const inputFieldStyle = {
      resize: 'none',
      height: 66
    };
    return (
      readouts && readouts.map((readout, index) => {
        const key = readout.id;
        return (
          [
            <td key={`v_${key}`} style={inputContainerStyle}>
              <FormControl
                componentClass="textarea"
                style={inputFieldStyle}
                value={readout.value || ''}
                onChange={event => this.handleReadoutOfWellChange(event, well, index, 'value')}
                className="no-margin"
              />
            </td>,
            <td key={`u_${key}`} style={inputContainerStyle}>
              <FormControl
                componentClass="textarea"
                style={inputFieldStyle}
                value={readout.unit || ''}
                onChange={event => this.handleReadoutOfWellChange(event, well, index, 'unit')}
                className="no-margin"
              />
            </td>,
          ]
        );
      })
    );
  }

  render() {
    const { wells } = this.props;
    return (
      <div>
        <Table bordered hover condensed>
          <thead>
            <tr>
              <th width="3%">#</th>
              <th width="5%">Position</th>
              <th width="5%">Molecule</th>
              <th width="11%">Name</th>
              <th width="11%">External Label</th>
              <th width="15%">Sum-Formula</th>
              {this.renderReadoutHeaders()}
              <th width="25%">Imported Readout</th>
            </tr>
          </thead>
          <tbody>
            {wells.map((well, key) => {
              const id = key + 1;
              const { sample, position } = well;
              const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
              const positionY = alphabet[position.y - 1];
              const positions = positionY + position.x;
              let svgPath = '';
              let sampleName = '';
              let externalLabel = '';
              let sum_formular = '';
              let importedReadout = '';
              let svgNode = '';
              const style = {
                resize: 'none',
                height: 66
              };
              const inputContainerStyle = {
                padding: 0
              };
              if (sample) {
                svgPath = `/images/molecules/${sample.molecule.molecule_svg_file}`;
                svgNode = <SVG className="molecule-small" src={svgPath} />;
                const { external_label, short_label, imported_readout } = sample;
                sampleName = `${short_label || ''}`;
                externalLabel = `${external_label || ''}`;
                importedReadout = imported_readout;
                sum_formular = sample.molecule_formula;
              }
              return (
                <tr key={key}>
                  <td>{id}</td>
                  <td>{positions}</td>
                  <td>{svgNode}</td>
                  <td>{sampleName}</td>
                  <td>{externalLabel}</td>
                  <td>{sum_formular}</td>
                  {this.renderReadoutFields(well)}
                  <td style={inputContainerStyle}>
                    <FormControl
                      componentClass="textarea"
                      style={style}
                      value={importedReadout || ''}
                      disabled
                      className="no-margin"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    );
  }
}

WellplateList.propTypes = {
  wells: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  readoutTitles: PropTypes.array.isRequired,
  handleWellsChange: PropTypes.func.isRequired
};
