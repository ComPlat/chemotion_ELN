import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col } from 'react-bootstrap';
import RFB from '@novnc/noVNC/lib/rfb';
import { uniq } from 'lodash';
// import Immutable from 'immutable';

import Navigation from './Navigation';
import DeviceActions from '../components/actions/UserActions';
import DeviceStore from '../components/stores/UserStore';
import FocusNovnc from '../components/FocusNovnc';
import { ConnectedBtn, DisconnectedBtn } from '../components/NovncStatus';
import UsersFetcher from '../components/fetchers/UsersFetcher';

class CnC extends React.Component {
  constructor() {
    super();
    this.state = {
      devices: [],
      selected: {},
      showDeviceList: true,
      connected: false,
      rfb: null,
      isNotFocused: true,
      show: false,
      data: [],
      watching: 0,
      using: 0,
      autoBlur: null,
      autoDisconnect: null
    };
    this.UserStoreChange = this.UserStoreChange.bind(this);
    this.toggleDeviceList = this.toggleDeviceList.bind(this);

    this.connect = this.connect.bind(this);
    this.connected = this.connected.bind(this);
    this.disconnected = this.disconnected.bind(this);
    this.autoDisconnect = this.autoDisconnect.bind(this);

    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    
    this.fetchConnections = this.fetchConnections.bind(this);
  }

  componentDidMount() {
    DeviceStore.listen(this.UserStoreChange);
    DeviceActions.fetchNoVNCDevices();
  }

  shouldComponentUpdate(nextState) {
    return this.state.connected !== nextState.connected
    || this.state.rfb !== nextState.rfb
    || this.state.selected.id !== nextState.selected.id
    || this.state.isNotFocused !== nextState.isNotFocused;
  }

  componentWillUnmount() {
    DeviceStore.unlisten(this.UserStoreChange);
    this.disconnect();
  }

  UserStoreChange(UserStoreState) {
    this.setState(prevState => ({ ...prevState, devices: UserStoreState.devices }));
  }

  connected() {
    this.setState({ connected: true });
  }

  disconnected() {
    this.setState({ connected: false });
  }

  handleFocus() {
    if (!this.state.rfb) { return; }
    const tempRFB = this.state.rfb;
    tempRFB.viewOnly = false;
    this.setState({ rfb: tempRFB, isNotFocused: false });
    const blurTime = setTimeout(this.handleBlur, 2000);
    this.setState({ autoBlur: blurTime });
  }

  handleBlur() {
    if (!this.state.rfb) { return; }
    const tempRFB = this.state.rfb;
    tempRFB.viewOnly = true;
    this.setState({ rfb: tempRFB, isNotFocused: true });
    const disconnectTime = setTimeout(this.autoDisconnect, 5000);
    this.setState({ autoDisconnect: disconnectTime });
  }

  handleMouseEnter() {
    if (!this.state.rfb || this.state.isNotFocused) { return; }
    clearTimeout(this.state.autoBlur);
    clearTimeout(this.state.autoDisconnect);
    this.setState({ autoBlur: null, autoDisconnect: null });
  }

  handleMouseLeave() {
    if (this.state.isNotFocused) { return; }
    const blurTime = setTimeout(this.handleFocus, 2000);
    this.setState({ autoBlur: blurTime });
   }


  connect() {
    this.disconnect();
    const { id, novnc } = this.state.selected;
    if (!this.canvas || !id || !novnc) { return; }

    const rfb = new RFB(
      this.canvas,
      novnc.target,
      {
        repeaterID: '',
        shared: true,
        credentials: { password: novnc.password },
      }
    );
    rfb.viewOnly = true;
    rfb.reconnect = true;
    rfb.addEventListener('connect', () => this.connected());
    rfb.addEventListener('disconnect', () => this.disconnected());
    this.setState(prevState => ({ ...prevState, rfb, isNotFocused: true }));
    setInterval(this.fetchConnections, 10000);
  }

  fetchConnections() {
    fetch(`/api/v1/devices/current_connection?id=${this.state.selected.id}&status=${this.state.isNotFocused}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then((json) => {
        const data = uniq(json.result).map(line => line.split(','));
        this.setState({ data });
        this.setState({ using: 0, watching: 0 });
        this.state.data.forEach((element) => {
          const status = element[1].substring(0, 1);
          if (status === '0') {
            this.setState({ using: this.state.using + 1 });
          } else if (status === '1') {
            this.setState({ watching: this.state.watching + 1 });
          }
        });
      });
  }

  autoDisconnect() {
    this.state.rfb.disconnect();
  }

  disconnect() {
    if (!this.state.rfb) {
      return;
    }
    this.state.rfb.disconnect();
    this.setState(prevState => ({ ...prevState, rfb: null }));
  }

  toggleDeviceList() {
    const { showDeviceList } = this.state;
    this.setState({
      showDeviceList: !showDeviceList,
      indicatorClassName: showDeviceList ? 'fa fa-chevron-circle-right' : 'fa fa-chevron-circle-left',
      mainContentClassName: showDeviceList ? 'small-col full-main' : 'small-col main-content'
    });
  }

  deviceClick(device) {
    UsersFetcher.fetchNoVNCDevices(device.id)
      .then(devices => this.setState(
        prevState => ({ ...prevState, selected: devices[0] }),
        this.connect
      ));
  }

  tree(dev, selectedId) {
    return (
      <Col className="small-col collec-tree">
        <div className="tree-view">
          <div className="title" style={{ backgroundColor: 'white' }}>
            <i className="fa fa-list" /> &nbsp;&nbsp; Devices
          </div>
        </div>
        <div className="tree-wrapper">
          {dev.map((device, index) => (
            <div
              className="tree-view"
              key={`device${device.id}`}
              onClick={() => this.deviceClick(device)}
              role="button"
              tabIndex={index === 0 ? 0 : -1}
            >
              <div
                className={`title ${selectedId === device.id ? 'selected' : null}`}

              >
                {device.name}
                {selectedId === device.id && this.state.connected ? <ConnectedBtn /> : null}
                {selectedId === device.id && !this.state.connected ? <DisconnectedBtn /> : null}
              </div>
            </div>
          ))}
        </div>
      </Col>
    );
  }

  render() {
    const {
      devices, selected, showDeviceList
    } = this.state;

    return (
      <div>
        <Grid fluid>
          <Row className="card-navigation">
            <Navigation toggleDeviceList={this.toggleDeviceList} />
          </Row>
          <Row className="card-content container-fluid" >
            {showDeviceList ? this.tree(devices, selected.id) : null}
            <Col className="small-col main-content" >
              <FocusNovnc
                isNotFocused={this.state.isNotFocused}
                handleFocus={this.handleFocus}
                handleBlur={this.handleBlur}
                connected={this.state.connected}
                watching={this.state.watching}
                using={this.state.using}
                data={this.state.data}
              />
              <div
                ref={(ref) => { this.canvas = ref; }}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
              />
            </Col>
          </Row>
        </Grid>
      </div>
    );
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('CnC');
  if (domElement) { ReactDOM.render(<CnC />, domElement); }
});
