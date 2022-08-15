import Aviator from 'aviator';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Glyphicon } from 'react-bootstrap';
import { observer } from 'mobx-react';

import { StoreContext } from '../mobx-stores/RootStore';
import { researchPlanShowOrNew } from './routesUtils';
import ConfirmDeletionModal from './ConfirmDeletionModal';
import LoadingActions from './actions/LoadingActions';

class MeasurementsList extends Component {
  static propTypes = {
    sample: PropTypes.object.isRequired
  };
  static contextType = StoreContext;

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
    this.context.measurements.deleteMeasurement(
      measurement.id,
      () => {
        this.hideConfirmationModal();
        LoadingActions.stop();
      }
    );
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

  renderEntry(sampleHeader, measurements) {
    measurements = measurements.map(measurement => {
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
      <div key={`MeasurementListEntry${sampleHeader.id}`}>
        <h4 key={`MeasurementListEntry${sampleHeader.id}-SampleName`}>
          {sampleHeader.short_label} {sampleHeader.name}
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
    const measurementsStore = this.context.measurements;
    let sampleIds = [...this.props.sample.ancestor_ids, this.props.sample.id].filter(a => a);
    const entries = sampleIds.map(sampleId => {
      if (!measurementsStore.dataForSampleAvailable(sampleId)) { return null; }

      return this.renderEntry(
        measurementsStore.sampleHeader(sampleId),
        measurementsStore.measurementsForSample(sampleId)
      );
    });

    return (
      <div className="measurementList">
        {entries}
      </div>
    );
  }
}

export default observer(MeasurementsList);
