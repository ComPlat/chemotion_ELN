import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'react-bootstrap';
import { observer } from 'mobx-react';

import { StoreContext } from 'src/stores/mobx/RootStore';
import MeasurementsTable from 'src/apps/mydb/elements/details/samples/measurementsTab/MeasurementsTable';
import MeasurementsList from 'src/apps/mydb/elements/details/samples/measurementsTab/MeasurementsList';
import MttMeasurementsTable from 'src/apps/mydb/elements/details/samples/measurementsTab/MttMeasurementsTable';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

class MeasurementsTab extends Component {
  static propTypes = {
    sample: PropTypes.object.isRequired
  };
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      displayMode: 'table',
      loading: false
    };
  }

  componentDidMount() {
    this.loadMeasurementsForSample();
  }

  loadMeasurementsForSample() {
    this.setState({ loading: true });
    this.context.measurements.loadMeasurementsForSample(
      this.props.sample,
      () => this.setState({ loading: false })
    );
  }

  renderDisplaySwitcher() {
    return (<ButtonGroup className="mb-3">
      <ButtonGroupToggleButton
        size="xsm"
        active={this.state.displayMode == 'table'}
        onClick={() => this.setState({ displayMode: 'table' })}
      >
        <i className="fa fa-table me-1" />
        Show as Table
      </ButtonGroupToggleButton>
      <ButtonGroupToggleButton
        size="xsm"
        active={this.state.displayMode == 'list'}
        onClick={() => this.setState({ displayMode: 'list' })}
      >
        <i className="fa fa-list me-1" />
        Show as List
      </ButtonGroupToggleButton>
    </ButtonGroup>);
  }

  getMttMeasurements() {
    const sampleIds = [...this.props.sample.ancestor_ids, this.props.sample.id].filter(a => a);
    return this.context.measurements.measurementsForSamples(sampleIds)
      .filter(m => m.metadata && m.metadata.analysis_type === 'mtt_output');
  }

  render() {
    if (this.state.loading) {
      return (<h2>Loading measurements...</h2>);
    }

    const mttMeasurements = this.getMttMeasurements();
    const hasData = this.context.measurements.dataForSampleHierarchyAvailable(this.props.sample);

    if (!mttMeasurements.length && !hasData) {
      return (<span>No measurements recorded for this sample</span>);
    }

    const displaySwitcher = this.renderDisplaySwitcher();

    let displayData =
      this.state.displayMode == 'table'
        ? <MeasurementsTable sample={this.props.sample} />
        : <MeasurementsList sample={this.props.sample} />;

    return (
      <div>
        {mttMeasurements.length > 0 && (
          <div className="mb-4">
            <MttMeasurementsTable
              sample={this.props.sample}
              measurements={mttMeasurements}
            />
          </div>
        )}

        {hasData && (
          <div>
            {displaySwitcher}
            {displayData}
          </div>
        )}
      </div>
    );
  }
}
export default observer(MeasurementsTab);
