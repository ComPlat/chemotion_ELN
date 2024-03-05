import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'react-bootstrap';
import { observer } from 'mobx-react';

import { StoreContext } from 'src/stores/mobx/RootStore';
import MeasurementsTable from 'src/apps/mydb/elements/details/samples/measurementsTab/MeasurementsTable';
import MeasurementsList from 'src/apps/mydb/elements/details/samples/measurementsTab/MeasurementsList';

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
    if (this.state.loading) {
      return (<h2>Loading measurements...</h2>);
    }
    if (!this.context.measurements.dataForSampleHierarchyAvailable(this.props.sample)) {
      return (<span>No measurements recorded for this sample</span>);
    }

    const displaySwitcher = this.renderDisplaySwitcher();

    let displayData =
      this.state.displayMode == 'table'
        ? <MeasurementsTable sample={this.props.sample} />
        : <MeasurementsList sample={this.props.sample} />;

    return (
      <div>
        {displaySwitcher}
        {displayData}
      </div>
    );
  }
}
export default observer(MeasurementsTab);
