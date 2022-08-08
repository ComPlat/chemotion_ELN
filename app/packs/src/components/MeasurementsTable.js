import Aviator from 'aviator';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';

import { StoreContext } from '../mobx-stores/RootStore';
import { researchPlanShowOrNew } from './routesUtils';

class MeasurementsTable extends Component {
  static propTypes = {
    sample: PropTypes.object.isRequired,
  };
  static contextType = StoreContext;

  constructor(props) {
    super(props);
  };

  // currently only research plan is supported as source
  navigateToSource(measurement) {
    const { uri } = Aviator.getCurrentRequest();
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
    const measurementsStore = this.context.measurementsStore;
    let sample_ids = [...this.props.sample.ancestor_ids, this.props.sample.id].filter(e => e);
    return sample_ids.map(sampleId => {
      if (!measurementsStore.dataForSampleAvailable(sampleId)) { return null; }

      let sampleHeader = measurementsStore.sampleHeader(sampleId);
      const columnsForRow = [this._sampleOutput(sampleHeader)];

      this._uniqueDescriptions().forEach((description, index) => {
        const measurements = this._measurementsWithDescription(
          measurementsStore.measurementsForSample(sampleId),
          description
        );

        const descriptionColumn = (
          <td className={`measurementTable--Sample--sortedReadout`} key={`MeasurementTableSampleSortedReadout${sampleId}.${index}`}>
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
    let sampleIds = [...this.props.sample.ancestor_ids, this.props.sample.id].filter(e => e);
    this.context.measurements
      .measurementsForSamples(sampleIds)
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
export default observer(MeasurementsTable);
