import Aviator from 'aviator';
import { researchPlanShowOrNew } from './routesUtils';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Glyphicon } from 'react-bootstrap';
import ConfirmDeletionModal from './ConfirmDeletionModal';
import MeasurementsFetcher from './fetchers/MeasurementsFetcher';
import LoadingActions from './actions/LoadingActions';

export default class MeasurementsList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      measurementToDelete: null
    }
  };

  // currently only research plan is supported as source
  navigateToSource(measurement) {
    const { uri } = Aviator.getCurrentRequest();
    Aviator.navigate(`${uri}/${measurement.source_type}/${measurement.source_id}`, { silent: true });
    if (measurement.source_type == 'research_plan') {
      researchPlanShowOrNew({ params: { research_planID: measurement.source_id } });
    }
  }

  deleteMeasurement() {
    const measurement = this.state.measurementToDelete;
    if (measurement == null) { return; }

    LoadingActions.start();
    const id = measurement.id
    MeasurementsFetcher.deleteMeasurement(id).then(_result => {
      console.log('Successfully deleted', measurement);
      this.hideConfirmationModal();
      LoadingActions.stop();
      this.props.onDelete();
    });
  }

  hideConfirmationModal() {
    this.setState({ measurementToDelete: null });
  }

  renderDeleteButton(measurement) {
    return (
      <Button
        bsStyle="danger"
        bsSize="xsmall"
        key={`Measurement${measurement.id}-DeleteButton`}
        onClick={() => { this.setState({ measurementToDelete: measurement }) }}
      >
        <Glyphicon glyph="trash" />
      </Button>
    );
  }

  renderEntry(entry) {
    const measurements = entry.measurements.map(measurement => {
      let measurementDisplay;
      if (measurement.source_id) {
        measurementDisplay = (
          <a
            key={`Measurement${measurement.id}-SourceLink`}
            onClick={() => this.navigateToSource(measurement)}
            style={{ cursor: 'pointer' }}
          >
            {measurement.description}: {measurement.value}{measurement.unit}
          </a>
        );
      } else {
        measurementDisplay = (
          <span key={`Measurement${measurement.id}-Display`}>
            {measurement.description}: {measurement.value}{measurement.unit}
          </span>
        );
      }

      return (
        <tr key={`Measurement${measurement.id}`}>
          <td>
            {measurementDisplay}
          </td>
          <td>
            {this.renderDeleteButton(measurement)}
          </td>
        </tr>
      );
    });

    return (
      <div key={`MeasurementListEntry${entry.id}`}>
        <h4 key={`MeasurementListEntry${entry.id}-SampleName`}>
          {entry.short_label} {entry.name}
        </h4>
        <table className="table striped condensed hover">
          <thead>
            <tr>
              <th>Measurement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {measurements}
          </tbody>
        </table>
        <ConfirmDeletionModal
          show={this.state.measurementToDelete != null}
          onConfirm={this.deleteMeasurement.bind(this)}
          onCancel={this.hideConfirmationModal.bind(this)}
          confirmationText="Are you sure you want to delete this measurement?"
        />
      </div>
    );
  }

  render() {
    const entries = this.props.samplesWithMeasurements.map(entry => this.renderEntry(entry));
    return (
      <div className="measurementList">
        {entries}
      </div>
    );
  }
}
MeasurementsList.propTypes = {
  onDelete: PropTypes.func.isRequired,
  samplesWithMeasurements: PropTypes.array.isRequired
};
