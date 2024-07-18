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
            <td key={`well_${well.id}_readout_${index}_value`} style={{ padding: 0 }}>
              <Form.Control
                componentClass="textarea"
                style={{ resize: 'none', height: 66 }}
                value={readout.value || ''}
                onChange={event => this.handleReadoutOfWellChange(event, well, index, 'value')}
                className="no-margin"
              />
            </td>,
            <td key={`well_${well.id}_readout_${index}_unit`} style={{ padding: 0 }}>
              <Form.Control
                componentClass="textarea"
                style={{ resize: 'none', height: 66 }}
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
            const style = {
              resize: 'none',
              height: 66
            };
            const inputContainerStyle = {
              padding: 0,
              display: 'none'
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
                <td>{well.alphanumericPosition}</td>
                <td>{svgNode}</td>
                <td>{sampleName}</td>
                <td>{externalLabel}</td>
                <td>{sum_formular}</td>
                {this.renderReadoutFields(well)}
                <td style={inputContainerStyle}>
                  <Form.Control
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
    );
  }
}

WellplateList.propTypes = {
  wells: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  readoutTitles: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  handleWellsChange: PropTypes.func.isRequired
};
