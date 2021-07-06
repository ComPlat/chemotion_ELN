import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col } from 'react-bootstrap';
import RFB from '@novnc/novnc/lib/rfb';
import { uniq } from 'lodash';
// import Immutable from 'immutable';

import Navigation from './Navigation';
import DeviceActions from '../components/actions/UserActions';
import DeviceStore from '../components/stores/UserStore';
import FocusNovnc from '../components/FocusNovnc';
import { ConnectedBtn, DisconnectedBtn } from '../components/NovncStatus';
import UsersFetcher from '../components/fetchers/UsersFetcher';

// Timeout before disconnection when not focused
const TIME_DISCO = 180000;
// Timeout before bluring when focused and mouse has left the canvas
const TIME_BLUR = 55000;
// Interval to query connection counter
const TIME_CONN = 4000;

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
      watching: 0,
      using: 0,
      autoBlur: null,
      autoDisconnect: null,
      forceCursor: false,
      connections: null,
    };
    this.UserStoreChange = this.UserStoreChange.bind(this);
    this.toggleDeviceList = this.toggleDeviceList.bind(this);

    this.connect = this.connect.bind(this);
    this.connected = this.connected.bind(this);
    this.disconnected = this.disconnected.bind(this);
    this.autoDisconnect = this.autoDisconnect.bind(this);

    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleCursor = this.handleCursor.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.clearTimers = this.clearTimers.bind(this);

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

  clearTimers() {
    clearTimeout(this.state.autoBlur);
    clearTimeout(this.state.autoDisconnect);
  }

  handleFocus() {
    if (!this.state.rfb) { return; }
    const tempRFB = this.state.rfb;
    tempRFB.viewOnly = false;
    this.clearTimers();
    this.setState({ rfb: tempRFB, isNotFocused: false });
  }

  handleBlur() {
    if (!this.state.rfb) { return; }
    const tempRFB = this.state.rfb;
    tempRFB.viewOnly = true;
    this.clearTimers();
    const disconnectTime = setTimeout(this.autoDisconnect, TIME_DISCO);
    this.setState({ rfb: tempRFB, isNotFocused: true, autoDisconnect: disconnectTime });
  }

  handleCursor() {
    this.setState({ forceCursor: !this.state.forceCursor });
  }

  handleMouseEnter() {
    if (!this.state.rfb || this.state.isNotFocused) { return; }
    this.clearTimers();
  }

  handleMouseLeave() {
    if (this.state.isNotFocused) { return; }
    this.clearTimers();
    const blurTime = setTimeout(this.handleBlur, TIME_BLUR);
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
    rfb.show_dot = true;
    rfb.addEventListener('connect', () => this.connected());
    rfb.addEventListener('disconnect', () => this.disconnected());
    this.setState(prevState => ({
      ...prevState,
      rfb,
      isNotFocused: true,
      connections: setInterval(this.fetchConnections, TIME_CONN)
    }));
  }

  fetchConnections() {
    const {
      selected, isNotFocused
    } = this.state;
    fetch(`/api/v1/devices/current_connection?id=${selected.id}&status=${isNotFocused}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then((json) => {
        let using = 0;
        let watching = 0;
        const data = uniq(json.result).map(line => line.split(','));
        const conn = Object.fromEntries(data);

        Object.keys(conn).forEach((k) => {
          if (conn[k] === '0') { using += 1; }
          if (conn[k] === '1') { watching += 1; }
        });
        this.setState({ using, watching });
      });
  }

  autoDisconnect() {
    clearInterval(this.state.connections);
    this.state.rfb.disconnect();
  }

  disconnect() {
    clearInterval(this.state.connections);
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
      devices, selected, showDeviceList,
      isNotFocused, connected, watching, using, forceCursor
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
                isNotFocused={isNotFocused}
                handleFocus={this.handleFocus}
                handleBlur={this.handleBlur}
                connected={connected}
                watching={watching}
                using={using}
                forceCursor={forceCursor}
                handleCursor={this.handleCursor}
              />
              <div
                className={forceCursor ? 'force-mouse-pointer' : ''}
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
