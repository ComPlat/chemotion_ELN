// TODO: check if imported_readout is still functionality that is used or if it is abandoned and should be removed

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, Form } from 'react-bootstrap';
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
    return (
      this.props.readoutTitles && this.props.readoutTitles.map((title, index) => {
        return (
          [
            <th key={`readout_${index}_value_header`} width="15%">{title} Value</th>,
            <th key={`readout_${index}_unit_header`} width="10%">{title} Unit</th>
          ]
        );
      })
    );
  }

  renderReadoutFields(well) {
    return (
      well.readouts && well.readouts.map((readout, index) => {
        return (
          [
            <td key={`well_${well.id}_readout_${index}_value`} className="p-0">
              <Form.Control
                value={readout.value || ''}
                onChange={event => this.handleReadoutOfWellChange(event, well, index, 'value')}
                className="m-0"
              />
            </td>,
            <td key={`well_${well.id}_readout_${index}_unit`} className="p-0">
              <Form.Control
                value={readout.unit || ''}
                onChange={event => this.handleReadoutOfWellChange(event, well, index, 'unit')}
                className="m-0"
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
      <Table bordered hover responsive>
        <thead>
          <tr>
            <th width="3%">#</th>
            <th width="5%">Position</th>
            <th width="5%">Molecule</th>
            <th width="11%">Name</th>
            <th width="11%">External Label</th>
            <th width="15%">Sum-Formula</th>
            {this.renderReadoutHeaders()}
            <th style={{ display: 'none' }} width="25%">Imported Readout</th>
          </tr>
        </thead>
        <tbody>
          {wells.map((well, key) => {
            const id = key + 1;
            const { sample, position } = well;
            let svgPath = '';
            let sampleName = '';
            let externalLabel = '';
            let sum_formular = '';
            let importedReadout = '';
            let svgNode = '';
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
                <td>{well.alphanumericPosition}</td>
                <td>{svgNode}</td>
                <td>{sampleName}</td>
                <td>{externalLabel}</td>
                <td>{sum_formular}</td>
                {this.renderReadoutFields(well)}
                <td className="p-0" style={{display: 'none'}}>
                  <Form.Control value={importedReadout || ''} disabled className="m-0" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }
}

WellplateList.propTypes = {
  wells: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  readoutTitles: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  handleWellsChange: PropTypes.func.isRequired
};
