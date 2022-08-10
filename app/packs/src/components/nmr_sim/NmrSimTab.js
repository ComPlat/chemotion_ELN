import React from 'react';
import { Button, ButtonToolbar, ListGroup, ListGroupItem } from 'react-bootstrap';
import PropTypes from 'prop-types';

import NmrSimActions from 'src/stores/alt/actions/NmrSimActions';
import NmrSimStore from 'src/stores/alt/stores/NmrSimStore';
import LineChartWrapper from 'src/components/nmr_sim/LineChartWrapper';
import { ViewAtNmrdb, LinkToNmrdb } from 'src/components/nmr_sim/NmrdbReference';

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

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const sample = this.props.sample;
    if (sample.molecule.id !== nextProps.sample.molecule.id) {
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
          <ListGroupItem bsStyle={style}>
            Sorry, the {type} simulation is not available now. Please check directly on
            <a target="_blank" href="https://www.nmrdb.org/">
              <img src="/images/nmrdb_logo.jpg" alt="" width="80" />
            </a>
          </ListGroupItem>
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
      <div style={{ width: '100%' }}>
        <ButtonToolbar>
          <Button bsStyle="primary"
                  onClick={ this.updateNmrdb.bind(this, '1H') }>
            predict 1H NMR
          </Button>
          <Button bsStyle="success"
                  onClick={ this.updateNmrdb.bind(this, '13C') }>
            predict 13C NMR
          </Button>
          <ViewAtNmrdb is13C={type === '13C'}
                       smile={smile} />
        </ButtonToolbar>

        {this.showChartNmrdb(spectrum)}

        <br />
        <ListGroupItem>
          <LinkToNmrdb />
        </ListGroupItem>
      </div>
    );
  }

}

NmrSimTab.propTypes = {
  sample: PropTypes.object,
};
