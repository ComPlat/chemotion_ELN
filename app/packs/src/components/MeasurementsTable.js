import Aviator from 'aviator';
import { researchPlanShowOrNew } from './routesUtils';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class MeasurementsTable extends Component {
  constructor(props) {
    super(props);
  };

  // currently only research plan is supported as source
  navigateToSource(measurement) {
    const { params, uri } = Aviator.getCurrentRequest();
    Aviator.navigate(`${uri}/${measurement.source_type}/${measurement.source_id}`, { silent: true });
    if (measurement.source_type == 'research_plan') {
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
    const rows = [];
    return this.props.samplesWithMeasurements.map(sample => {
      const columnsForRow = [this._sampleOutput(sample)];

      this._uniqueDescriptions().forEach((description, index) => {
        const measurements = this._measurementsWithDescription(sample.measurements, description);

        const descriptionColumn = (
          <td className={`measurementTable--Sample--sortedReadout`} key={`MeasurementTableSampleSortedReadout${sample.id}.${index}`}>
            <ul className="list-unstyled">
              {measurements}
            </ul>
          </td>
        );
        columnsForRow.push(descriptionColumn);
      });

      return (
        <tr className="measurementTable--Sample" key={`MeasurementTableSample${sample.id}`}>
          {columnsForRow}
        </tr>
      );
    });
  }

  render() {
    const descriptionColumns = this._uniqueDescriptions().map(description => (<th key={description}>{description}</th>));
    return (
      <table className="table measurementTable striped condensed hover">
        <thead>
          <tr>
            <td></td>
            {descriptionColumns}
          </tr>
        </thead>
        <tbody>
          {this.rows()}
        </tbody>
      </table>
    );
  }

  _uniqueDescriptions() {
    const descriptions = {};
    this.props.samplesWithMeasurements.forEach(sample => {
      sample.measurements.forEach(measurement => {
        descriptions[measurement.description] = 1
      })
    });

    return Object.keys(descriptions).sort();
  }

  _sampleOutput(sample) {
    return (
      <th className="measurementTable--Sample--name" key={`MeasurementTableSampleName${sample.id}`}>
        {`${sample.short_label} ${sample.name}`}
      </th>
    );
  }

  _measurementOutput(measurement) {
    return (
      <li key={`MeasurementSource${measurement.id}`}>
        <a
          key={`MeasurementSourceLink${measurement.id}`}
          onClick={() => this.navigateToSource(measurement)}
          style={{ cursor: 'pointer' }}
        >
          {measurement.value} {measurement.unit}
        </a>
      </li>
    );
  }

  _measurementsWithDescription(measurements, description) {
    return measurements
      .filter(measurement => measurement.description == description)
      .map(measurement => this._measurementOutput(measurement));
  }

  _navigateToSource(measurement) {
    const { uri } = Aviator.getCurrentRequest();
    Aviator.navigate(`${uri}/${measurement.source_type}/${measurement.source_id}`, { silent: true });
    if (measurement.source_type == 'research_plan') {
      researchPlanShowOrNew({ params: { research_planID: measurement.source_id } });
    }
  }
}
MeasurementsTable.propTypes = {
  samplesWithMeasurements: PropTypes.array.isRequired
};
