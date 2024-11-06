import React from 'react';
import { Button, ButtonToolbar, ListGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';

import NmrSimActions from 'src/stores/alt/actions/NmrSimActions';
import NmrSimStore from 'src/stores/alt/stores/NmrSimStore';
import LineChartWrapper from 'src/apps/mydb/elements/details/samples/nmrSimTab/LineChartWrapper';
import { ViewAtNmrdb, LinkToNmrdb } from 'src/apps/mydb/elements/details/samples/nmrSimTab/NmrdbReference';

export default class NmrSimTab extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      nmrSpectrum: { data13C: [], data1H: [] },
      nmrType: '13C',
      synced: false,
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    NmrSimStore.listen(this.onChange);
  }

  componentDidUpdate(prevProps) {
    const { sample } = this.props;
    if (sample.molecule.id !== prevProps.sample.molecule.id) {
      NmrSimActions.resetNMR.defer();
    }
  }

  componentWillUnmount() {
    NmrSimStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState({
      nmrSpectrum: state.currentNmr,
      nmrType: state.currentType,
      synced: state.synced,
    });
  }

  updateNmrdb(type) {
    const sample = this.props.sample;
    const spectrum = this.state.nmrSpectrum;
    const needToFetch = spectrum.data13C.length + spectrum.data1H.length === 0;
    NmrSimActions.updateNmrdb(type, needToFetch, sample.molecule.id);
  }

  showChartNmrdb(spectrum) {
    const synced = this.state.synced;
    const is13C = this.state.nmrType === '13C';
    const data = is13C ? spectrum.data13C : spectrum.data1H;
    return (
      synced ? this.chartOrWarning(data) : null
    );
  }

  chartOrWarning(data) {
    return (
      data.length !== 0
        ? <LineChartWrapper data={data}
          type={this.state.nmrType}
          className="line-chart-wrapper" />
        : this.warning()
    );
  }

  warning() {
    const type = this.state.nmrType;
    const style = type === '13C' ? 'danger' : 'warning';
    return (
      <div>
        <br />
        <ListGroup>
          <ListGroup.Item variant={style} className="d-flex align-items-center gap-2">
            <span>Sorry, the {type} simulation is not available now. Please check directly on</span>
            <a target="_blank" href="https://www.nmrdb.org/" className="nmrdb-logo" />
          </ListGroup.Item>
        </ListGroup>
      </div>
    );
  }

  render() {
    const sample = this.props.sample;
    const spectrum = this.state.nmrSpectrum;
    const type = this.state.nmrType;
    const smile = sample.molecule_cano_smiles || 'c1ccccc1CC';

    return (
      <>
        <ButtonToolbar className="gap-2">
          <Button variant="primary"
            onClick={this.updateNmrdb.bind(this, '1H')}>
            predict 1H NMR
          </Button>
          <Button variant="success"
            onClick={this.updateNmrdb.bind(this, '13C')}>
            predict 13C NMR
          </Button>
          <ViewAtNmrdb is13C={type === '13C'}
            smile={smile} />
        </ButtonToolbar>

        {this.showChartNmrdb(spectrum)}

        <br />
        <ListGroup.Item>
          <LinkToNmrdb />
        </ListGroup.Item>
      </>
    );
  }

}

NmrSimTab.propTypes = {
  sample: PropTypes.object,
};
