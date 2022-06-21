import Aviator from 'aviator';
import equal from 'deep-equal';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ButtonToolbar, Button, ButtonGroup, DropdownButton, MenuItem } from 'react-bootstrap';
import { v4 as uuidv4 } from 'uuid';
import LoadingActions from '../actions/LoadingActions';
import MeasurementsFetcher from '../fetchers/MeasurementsFetcher';

class MeasurementCandidate extends Component {
  constructor(props) {
    super(props);
  }

  _status() {
    if (this.props.id) {
      return (<span className='success'>Success: Created measurement for sample</span>);
    }
    if (this.props.errors.length > 0) {
      return (<span className='danger'>Error: {this.props.errors.join('. ')}</span>);
    }
  }

  _selector() {
    if (this.props.errors.length > 0) { return ''; }
    if (this.props.id) { return ''; } // Prevent resubmitting if the server has already supplied an ID

    return (
      <input
        type="checkbox"
        className="measurementSelector"
        checked={this.props.selected}
        onChange={() => this.props.onChange(this.props.uuid)} />
    );
  }

  _canExport() {
    return this.props.sample_identifier &&
      this.props.description &&
      this.props.value &&
      this.props.unit;
  }

  render() {
    if (!this._canExport()) {
      return null;
    }

    return (
      <tr>
        <td>{this._selector()}</td>
        <td>{this.props.sample_identifier}</td>
        <td>{this.props.description} {this.props.value} {this.props.unit}</td>
        <td>{this._status()}</td>
      </tr>
    );
  }
}
MeasurementCandidate.propTypes = {
  description: PropTypes.string,
  errors: PropTypes.array,
  id: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  sample_identifier: PropTypes.string,
  selected: PropTypes.bool.isRequired,
  unit: PropTypes.string,
  uuid: PropTypes.string.isRequired,
  value: PropTypes.string,
};

export default class ResearchPlanDetailsFieldTableMeasurementExportModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      measurementCandidates: this._measurementCandidates(props.rows, props.columns),
      researchPlanId: this.getResearchPlanIdFromPath() ?? -1
    };
  }

  componentDidUpdate(prevProps, _prevState, _snapshot) {
    if (equal(this.props, prevProps)) {
      return;
    }

    this.setState({ measurementCandidates: this._measurementCandidates(this.props.rows, this.props.columns) })
  }

  getResearchPlanIdFromPath() {
    const currentURI = Aviator.getCurrentURI();

    const researchPlanMatch = currentURI.match(/\/research_plan\/(\d+)/);
    if (researchPlanMatch) {
      return researchPlanMatch[1];
    } else {
      return -1;
    }
  }

  handleSubmit() {
    const { measurementCandidates } = this.state;
    const selectedCandidates = measurementCandidates.filter(candidate => candidate.selected === true);
    if (selectedCandidates.length == 0) {
      return;
    }
    LoadingActions.start();
    MeasurementsFetcher.createMeasurements(selectedCandidates, this.state.researchPlanId).then((result) => {
      result.forEach((measurement) => {
        var index = measurementCandidates.findIndex(candidate => candidate.uuid === measurement.uuid);
        if (index > -1) { // safeguard to make sure the script does not crash if for whatever reason the candidate can not be found
          if (measurement.errors.length === 0) {
            measurementCandidates[index].id = measurement.id
            measurementCandidates[index].selected = false
          } else {
            measurement.errors.forEach(error => measurementCandidates[index].errors.push(error))
          }
        }
      });
      this.setState({ measurementCandidates });
      LoadingActions.stop();
    });

  }

  readyForSubmit() {
    const candidatesSelected = this.state.measurementCandidates.findIndex((candidate) => candidate.selected === true) > -1;
    const researchPlanIdPresent = this.state.researchPlanId > -1;

    return candidatesSelected && researchPlanIdPresent;
  }

  render() {
    const { measurementCandidates } = this.state;

    return (
      <Modal animation bsSize="large" show={this.props.show} onHide={this.props.onHide} className="measurementExportModal">
        <Modal.Header closeButton>
          <Modal.Title>
            Export measurements to samples
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='measurementExportModal__body'>
          <table className="table">
            <thead>
              <tr>
                <th>{this._selectAllButton()}</th>
                <th>Sample</th>
                <th>Measurement</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {measurementCandidates && measurementCandidates.map((candidate) => {
                return (
                  <MeasurementCandidate
                    description={candidate.description}
                    errors={candidate.errors}
                    id={candidate.id}
                    key={candidate.uuid}
                    onChange={this._toggleCandidate.bind(this)}
                    sample_identifier={candidate.sample_identifier}
                    selected={candidate.selected}
                    unit={candidate.unit}
                    uuid={candidate.uuid}
                    value={candidate.value}
                  />
                );
              })}
            </tbody>
          </table>
          <div>
            <ButtonToolbar>
              <Button bsStyle="warning" onClick={this.props.onHide}>
                Cancel
              </Button>
              <Button bsStyle="primary" disabled={!this.readyForSubmit()} onClick={this.handleSubmit.bind(this)}>
                Link data to sample
              </Button>
            </ButtonToolbar>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  _selectAll(prefix = null) {
    const { measurementCandidates } = this.state;
    measurementCandidates.forEach((candidate) => {
      const candidate_has_no_errors = candidate.errors.length === 0
      const candidate_matches_prefix = prefix == null || candidate.description == prefix

      if (candidate_has_no_errors && candidate_matches_prefix) {
        candidate.selected = true;
      }
    });
    this.setState({ measurementCandidates });
  }

  _selectAllButton() {
    const prefixes = this._readouts(this.props.columns).map(readout => readout.description)
    if (prefixes.length == 1) {
      return (
        <Button onClick={() => this._selectAll.bind(this)()}>Select all</Button>
      );
    } else {
      const readoutSelectors = prefixes.map((prefix, index) => (
        <MenuItem
          eventKey={prefix}
          key={`SelectAllButtonForReadout${index}`}
          onClick={() => this._selectAll.bind(this)(prefix)}
        >
          {prefix}
        </MenuItem>
      ));

      return (
        <ButtonGroup>
          <Button onClick={() => this._selectAll.bind(this)()}>Select all</Button>
          <DropdownButton title="by Readout">
            {readoutSelectors}
          </DropdownButton>
        </ButtonGroup>
      );
    }
  }

  _toggleCandidate(uuid) {
    const { measurementCandidates } = this.state;
    const index = measurementCandidates.findIndex(candidate => candidate.uuid === uuid);
    measurementCandidates[index].selected = !measurementCandidates[index].selected;
    this.setState({ measurementCandidates });
  }

  _sampleColumnField(columns) {
    const sampleColumn = columns.find((column) => {
      const matcher = /^Sample|sample$/
      return column.headerName.match(matcher) ||
        column.field.match(matcher) ||
        column.colId.match(matcher)
    });

    if (sampleColumn !== undefined) {
      return sampleColumn.field;
    } else {
      return null;
    }
  }

  _readouts(columns) {
    const readouts = [];

    // TODO: recognize if readout column duplicates exist
    columns.forEach((column) => {
      const valueMatcher = /[_ ][Vv]alue$/
      if (column.headerName && column.headerName.match(valueMatcher)) {
        const prefix = column.headerName.split(valueMatcher)[0];
        const unitColumn = columns.find(otherColumn => otherColumn.headerName.match(RegExp("^" + prefix + "[_ ][Uu]nit$")))
        if (unitColumn !== undefined) {
          readouts.push({
            valueColumn: column.field,
            unitColumn: unitColumn.field,
            description: prefix
          });
        }
      }
    });
    return readouts;
  }

  _measurementCandidates(rows, columns) {
    const candidates = [];
    const readouts = this._readouts(columns);
    const sampleColumnField = this._sampleColumnField(columns);

    rows.forEach((row) => {
      readouts.forEach((readout) => {
        var candidate = {
          uuid: uuidv4(),
          sample_identifier: row[sampleColumnField],
          description: readout.description,
          value: row[readout.valueColumn],
          unit: row[readout.unitColumn],
          errors: [],
          selected: false,
        }
        this._validateCandidate(candidate);

        candidates.push(candidate);
      });
    });

    return candidates;
  }

  _validateCandidate(candidate) {
    if (candidate.sample_identifier === undefined || candidate.sample_identifier === null) {
      candidate.errors.push('Missing sample identifier');
    }
    if (candidate.description === undefined || candidate.description === null) {
      candidate.errors.push('Missing description');
    }
    if (candidate.value === undefined || candidate.value === null) {
      candidate.errors.push('Missing value');
    }
    if (candidate.unit === undefined || candidate.unit === null) {
      candidate.errors.push('Missing unit');
    }
  }
}

ResearchPlanDetailsFieldTableMeasurementExportModal.propTypes = {
  show: PropTypes.bool,
  onHide: PropTypes.func.isRequired,
  rows: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
};
