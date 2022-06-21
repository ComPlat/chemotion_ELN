import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'react-bootstrap';
import { observer } from 'mobx-react';

import { StoreContext } from '../mobx-stores/RootStore';
import MeasurementsTable from './MeasurementsTable';
import MeasurementsList from './MeasurementsList';

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
    this.loadSampleData();
  }

  loadSampleData() {
    const measurementsStore = this.context.measurementsStore;
    this.setState({ loading: true });
    measurementsStore.loadDataForSample(
      this.props.sample.id,
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
    console.debug('MeasurementsTab.render');
    const measurementsStore = this.context.measurementsStore;
    if (this.state.loading) {
      return (<h2>Loading measurements...</h2>);
    }
    if (!measurementsStore.dataForSampleAvailable(this.props.sample)) {
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
