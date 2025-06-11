/* eslint-disable */
import Aviator from 'aviator';
import equal from 'deep-equal';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ButtonToolbar, Button, ButtonGroup, Dropdown } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { v4 as uuidv4 } from 'uuid';
import { observer } from 'mobx-react';

import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { StoreContext } from 'src/stores/mobx/RootStore';

class ResearchPlanDetailsFieldTableMeasurementExportModal extends Component {
  static propTypes = {
    show: PropTypes.bool,
    onHide: PropTypes.func.isRequired,
    rows: PropTypes.array.isRequired,
    columns: PropTypes.array.isRequired,
  };
  static contextType = StoreContext;
  constructor(props) {
    super(props);

    this.state = {
      measurementCandidates: this._measurementCandidates(props.rows, props.columns),
      researchPlanId: this.getResearchPlanIdFromPath() ?? -1
    };
    this._selectAll = this._selectAll.bind(this);
    this._renderMeasurement = this._renderMeasurement.bind(this);
    this._renderCheckbox = this._renderCheckbox.bind(this);
    this._renderMeasurement = this._renderMeasurement.bind(this);
    this._renderStatus = this._renderStatus.bind(this);
    this._toggleCandidate = this._toggleCandidate.bind(this);
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
    this.context.measurements.createMeasurements(
      selectedCandidates,
      this.state.researchPlanId,
      (result) => {
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
      }
    );
  }

  readyForSubmit() {
    const candidatesSelected = this.state.measurementCandidates.findIndex((candidate) => candidate.selected === true) > -1;
    const researchPlanIdPresent = this.state.researchPlanId > -1;

    return candidatesSelected && researchPlanIdPresent;
  }

  render() {
    const { measurementCandidates } = this.state;

    const columnDefs = [
      {
        headerName: "",
        cellRenderer: this._renderCheckbox,
      },
      {
        headerName: "Sample",
        cellRenderer: props => {
          return this._canExport(props.data) ? props.data.sample_identifier : '';
        },
      },
      {
        headerName: "Measurement",
        cellRenderer: this._renderMeasurement,
      },
      {
        headerName: "Status",
        cellRenderer: this._renderStatus,
        wrapText: true,
        cellClass: ["lh-base", "py-2"],
      },
    ];

    const defaultColDef = {
      editable: false,
      flex: 1,
      autoHeight: true,
      sortable: false,
      resizable: false,
      suppressMovable: true,
    };

    return (
      <Modal centered animation size="lg" show={this.props.show} onHide={this.props.onHide}>
        <Modal.Header closeButton>
          <Modal.Title>
            Export measurements to samples
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '600px', overflowY: 'scroll' }}>
          {measurementCandidates && this._selectAllButton()}
          <div className="ag-theme-alpine">
            {measurementCandidates &&
              <AgGridReact
                columnDefs={columnDefs}
                autoSizeStrategy={{ type: 'fitGridWidth' }}
                defaultColDef={defaultColDef}
                rowData={measurementCandidates}
                rowHeight="auto"
                domLayout="autoHeight"
              />
            }
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <ButtonToolbar className="gap-1">
            <Button variant="warning" onClick={this.props.onHide}>
              Close
            </Button>
            <Button variant="primary" disabled={!this.readyForSubmit()} onClick={this.handleSubmit.bind(this)}>
              Link data to sample
            </Button>
          </ButtonToolbar>
        </Modal.Footer> 
      </Modal>
    );
  }

  _canExport(props) {
    return props.sample_identifier &&
      props.description &&
      props.value &&
      props.unit;
  }

  _renderMeasurement(node) {
    const props = node.data;
    if (!this._canExport(props)) { return null; }

    return `${props.description} ${props.value} ${props.unit}`;
  }

  _renderStatus(node) {
    const props = node.data;
    if (!this._canExport(props)) { return null; }

    if (props.id) {
      return (<span className='success'>Success: Created measurement for sample</span>);
    } else if (props.errors.length > 0) {
      return (<span className='danger'>Error: {props.errors.join('. ')}</span>);
    } else {
      return '';
    }
  }

  _renderCheckbox(node) {
    const props = node.data;
    if (props && !this._canExport(props)) { return null; }
    if (props.errors.length > 0) { return ''; }
    if (props.id) { return ''; } // Prevent resubmitting if the server has already supplied an ID

    return (
      <input
        type="checkbox"
        className="m-0"
        checked={props.selected}
        onChange={() => this._toggleCandidate(props.uuid)} />
    );
  }

  _selectAll(prefix = null) {
    const { measurementCandidates } = this.state;
    measurementCandidates.forEach((candidate) => {
      const candidate_has_no_errors = candidate.errors.length === 0;
      const candidate_matches_prefix = prefix == null || candidate.description == prefix;

      if (candidate_has_no_errors && candidate_matches_prefix) {
        candidate.selected = true;
      }
    });
    this.setState({ measurementCandidates });
  }

  _selectAllButton() {
    const prefixes = this._readouts(this.props.columns).map(readout => readout.description);
    if (prefixes.length == 1) {
      return (
        <Button className="mb-3" onClick={() => this._selectAll()}>Select all</Button>
      );
    } else {
      const readoutSelectors = prefixes.map((prefix, index) => (
        <Dropdown.Item
          eventKey={prefix}
          key={`SelectAllButtonForReadout${index}`}
          onClick={() => this._selectAll(prefix)}
        >
          {prefix}
        </Dropdown.Item>
      ));

      return (
        <ButtonGroup className="mb-3">
          <Button variant="light" onClick={() => this._selectAll()}>Select all</Button>
          <Dropdown as={ButtonGroup}>
            <Dropdown.Toggle variant="light" id="dropdown-basic">by Readout</Dropdown.Toggle>
            <Dropdown.Menu>
              {readoutSelectors}
            </Dropdown.Menu>
          </Dropdown>
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

export default observer(ResearchPlanDetailsFieldTableMeasurementExportModal);
