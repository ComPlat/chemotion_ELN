import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col } from 'react-bootstrap';
import RFB from '@novnc/novnc/lib/rfb';
// import Immutable from 'immutable';

import Navigation from './Navigation';
import DeviceActions from '../components/actions/UserActions';
import DeviceStore from '../components/stores/UserStore';
import FocusNovnc from '../components/FocusNovnc';


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
      show: false
    };
    this.UserStoreChange = this.UserStoreChange.bind(this);
    this.toggleDeviceList = this.toggleDeviceList.bind(this);

    this.connect = this.connect.bind(this);
    this.connected = this.connected.bind(this);
    this.disconnected = this.disconnected.bind(this);

    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
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
  }

  handleBlur() {
    if (!this.state.rfb) { return; }
    const tempRFB = this.state.rfb;
    tempRFB.viewOnly = true;
    this.setState({ rfb: tempRFB, isNotFocused: true });
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
    this.setState(
      prevState => ({
        ...prevState,
        selected: device
      })
      ,
      this.connect
    );
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
              </div>
            </div>
          ))}
        </div>
      </Col>
    );
  }

  render() {
    const { devices, selected, showDeviceList } = this.state;

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
              />
              <div
                ref={(ref) => { this.canvas = ref; }}
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
