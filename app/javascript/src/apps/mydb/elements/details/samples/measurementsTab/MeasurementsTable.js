import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { observer } from 'mobx-react';

import { StoreContext } from 'src/stores/mobx/RootStore';
import { aviatorNavigation, researchPlanShowOrNew } from 'src/utilities/routesUtils';
import { isMttMeasurement } from 'src/utilities/mttDataProcessor';

class MeasurementsTable extends Component {
  static propTypes = {
    sample: PropTypes.object.isRequired,
  };
  static contextType = StoreContext;

  constructor(props) {
    super(props);
  }

  // currently only research plan is supported as source
  navigateToSource(measurement) {
    aviatorNavigation(measurement.source_type, measurement.source_id);
    if (measurement.source_type === 'research_plan') {
      researchPlanShowOrNew({ params: { research_planID: measurement.source_id } });
    }
  }

  // Column Layout:
  //  - Sample Name/Identifier
  //  - 1 Column per unique description
  //
  // NOTE: No action column for deletion, as we aggregate multiple measurements within one row
  //       Use list view for deleting individual measurements

  rows() {
    const { measurementsStore } = this.context;
    const sample_ids = [...this.props.sample.ancestor_ids, this.props.sample.id].filter(e => e);
    return sample_ids.map(sampleId => {
      if (!measurementsStore.dataForSampleAvailable(sampleId)) { return null; }

      const sampleHeader = measurementsStore.sampleHeader(sampleId);
      const columnsForRow = [this._sampleOutput(sampleHeader)];

      // Filter out MTT measurements once per sample
      const nonMttMeasurements = measurementsStore.measurementsForSample(sampleId)
        .filter(m => !isMttMeasurement(m));

      this._uniqueDescriptions().forEach((description) => {
        const measurements = this._measurementsWithDescription(nonMttMeasurements, description);

        const descriptionColumn = (
          <td
            className={'measurementTable--Sample--sortedReadout'}
            key={`MeasurementTableSampleSortedReadout${sampleId}.${description}`}
          >
            <ul className="list-unstyled">
              {measurements}
            </ul>
          </td>
        );
        columnsForRow.push(descriptionColumn);
      });

      return (
        <tr className="measurementTable--Sample" key={`MeasurementTableSample${sampleId}`}>
          {columnsForRow}
        </tr>
      );
    });
  }

  render() {
    const descriptionColumns = this._uniqueDescriptions()
      .map(description => (<th key={description}>{description}</th>));
    return (
      <table className="table measurementTable table-sm table-hover">
        <thead>
          <tr>
            <td></td>
            {descriptionColumns}
          </tr>
        </thead>
        <tbody className="table-group-divider">
          {this.rows()}
        </tbody>
      </table>
    );
  }

  _uniqueDescriptions() {
    const descriptions = {};
    const sampleIds = [...this.props.sample.ancestor_ids, this.props.sample.id].filter(e => e);
    this.context.measurements
      .measurementsForSamples(sampleIds)
      .filter(m => !isMttMeasurement(m))
      .forEach(measurement => descriptions[measurement.description] = 1);

    return Object.keys(descriptions).sort();
  }

  _sampleOutput(sampleHeader) {
    return (
      <th className="measurementTable--Sample--name" key={`MeasurementTableSampleName${sampleHeader.id}`}>
        {`${sampleHeader.short_label} ${sampleHeader.name}`}
      </th>
    );
  }

  _measurementOutput(measurement) {
    return (
      <li key={`MeasurementSource${measurement.id}`}>
        <Button
          key={`MeasurementSourceLink${measurement.id}`}
          onClick={() => this.navigateToSource(measurement)}
          variant="neat"
        >
          {measurement.value} {measurement.unit}
        </Button>
      </li>
    );
  }

  _measurementsWithDescription(measurements, description) {
    return measurements
      .filter(measurement => measurement.description === description)
      .map(measurement => this._measurementOutput(measurement));
  }
}
export default observer(MeasurementsTable);
