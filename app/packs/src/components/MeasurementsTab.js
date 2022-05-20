import MeasurementsFetcher from './fetchers/MeasurementsFetcher';
import MeasurementsTable from './MeasurementsTable';
import MeasurementsList from './MeasurementsList';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'react-bootstrap';

export default class MeasurementsTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      displayMode: 'table',
      samplesWithMeasurements: []
    };
  }

  componentDidMount() {
    this.loadSampleData();
  }

  loadSampleData() {
    MeasurementsFetcher.fetchMeasurementHierarchy(this.props.sample).then(samples => {
      this.setState({ samplesWithMeasurements: samples });
    });
  }

  renderDisplaySwitcher() {
    return (<ButtonGroup>
      <Button
        active={this.state.displayMode == 'table'}
        bsSize="small"
        onClick={() => this.setState({ displayMode: 'table' })}
      >
        Show as Table
      </Button>
      <Button
        active={this.state.displayMode == 'list'}
        bsSize="small"
        onClick={() => this.setState({ displayMode: 'list' })}
      >
        Show as List
      </Button>
    </ButtonGroup>);
  }

  render() {
    if (this.state.samplesWithMeasurements.length == 0) {
      return (<span>No measurements recorded for this sample</span>);
    }

    const displaySwitcher = this.renderDisplaySwitcher();

    let displayData = null;
    if (this.state.displayMode == 'table') {
      displayData = (<MeasurementsTable samplesWithMeasurements={this.state.samplesWithMeasurements} />);
    } else {
      displayData = (
        <MeasurementsList
          onDelete={this.loadSampleData.bind(this)}
          samplesWithMeasurements={this.state.samplesWithMeasurements}
        />
      );
    }

    return (
      <div>
        {displaySwitcher}
        {displayData}
      </div>
    );
  }
}
MeasurementsTab.propTypes = {
  sample: PropTypes.object.isRequired
};
