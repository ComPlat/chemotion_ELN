import React from 'react';
import RFB from '@novnc/novnc/lib/rfb';
import { Grid, Row, Col } from 'react-bootstrap';
import { uniq } from 'lodash';

import DeviceActions from 'src/stores/alt/actions/UserActions';
import DeviceStore from 'src/stores/alt/stores/UserStore';
import FocusNovnc from 'src/apps/commandAndControl/FocusNovnc';
import Navigation from 'src/apps/commandAndControl/Navigation';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import { ConnectedBtn, DisconnectedBtn } from 'src/apps/commandAndControl/NovncStatus';

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
      isForcedScreenResizing: false,
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
    this.handleScreenSizeChanging = this.handleScreenSizeChanging.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleForceScreenResizing = this.handleForceScreenResizing.bind(this);
    this.handleCursor = this.handleCursor.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.clearTimers = this.clearTimers.bind(this);

    this.fetchConnections = this.fetchConnections.bind(this);
  }

  componentDidMount() {
    DeviceStore.listen(this.UserStoreChange);
    DeviceActions.fetchNoVNCDevices();
    // Listen for window resize event and handle it accordingly
    window.addEventListener("resize", this.handleScreenSizeChanging);
  }

  shouldComponentUpdate(nextState) {
    return this.state.connected !== nextState.connected
      || this.state.rfb !== nextState.rfb
      || this.state.selected.id !== nextState.selected.id
      || this.state.isNotFocused !== nextState.isNotFocused
      || this.state.isForcedScreenResizing !== nextState.isForcedScreenResizing;
  }

  componentWillUnmount() {
    DeviceStore.unlisten(this.UserStoreChange);
    this.disconnect();

    // Remove event listener for window resize
    window.removeEventListener("resize", this.handleScreenSizeChanging);
  }

  UserStoreChange(UserStoreState) {
    this.setState((prevState) => ({ ...prevState, devices: UserStoreState.devices }));
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
  
    // Focuses the RFB instance
    this.state.rfb.focus();
    this.clearTimers(); // Clear the auto blur and auto disconnect timers
    this.setState({ rfb: tempRFB, isNotFocused: false, showDeviceList: false });
  }

  /**
   * Handles the event when the screen size is changing.
   * If screen resizing is forced, toggles the `scaleViewport` property of the RFB instance.
   * This is done by setting it to false and then back to true, which triggers a resize.
   */
  handleScreenSizeChanging() {
    // If there is no RFB instance or screen resizing is not forced, return early
    if (!this.state.rfb || !this.state.isForcedScreenResizing) { return; }
    const tempRFB = this.state.rfb;
    // Toggle the `scaleViewport` property of the RFB instance
    tempRFB.scaleViewport = false;
    tempRFB.scaleViewport = true;

    this.setState({ rfb: tempRFB });
  }

  /*
   * Toggles the `scaleViewport` property of the RFB instance and updates the state accordingly.
   * Also clears the auto blur and auto disconnect timers and updates the state accordingly.
   */
  handleForceScreenResizing() {
    // If there is no RFB instance, return early
    if (!this.state.rfb) { return; }
    // Create a copy of the current RFB instance
    const tempRFB = this.state.rfb;
    // Toggle the `scaleViewport` property of the RFB instance
    tempRFB.scaleViewport = !this.state.isForcedScreenResizing;
    // Clear the auto blur and auto disconnect timers
    this.clearTimers();
    // Update the state with the new RFB instance and toggled `isForcedScreenResizing` property
    this.setState({
      rfb: tempRFB,
      isForcedScreenResizing: !this.state.isForcedScreenResizing 
    });
  }

  handleBlur() {
    if (!this.state.rfb) { return; }
    const tempRFB = this.state.rfb;
    tempRFB.viewOnly = true;
    // Toggle the device list when the screen is blurred
    // This provides a way to hide the device list when the user is not focused on the screen
    this.toggleDeviceList();
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
    const { id, target, password } = this.state.selected;
    if (!this.canvas || !id || !target) { return; }

    const rfb = new RFB(
      this.canvas,
      target,
      {
        repeaterID: '',
        shared: true,
        credentials: { password: password },
      }
    );
    rfb.viewOnly = true;
    rfb.reconnect = true;
    rfb.show_dot = true;
    // Prevent the viewport from jumping to the clicked position when in focus mode on the device remote display
    rfb.focusOnClick = false;

    rfb.addEventListener('connect', () => this.connected());
    rfb.addEventListener('disconnect', () => this.disconnected());
    this.setState((prevState) => ({
      ...prevState,
      rfb,
      isNotFocused: true,
      isForcedScreenResizing: false,
      connections: setInterval(this.fetchConnections, TIME_CONN)
    }));
  }

  fetchConnections() {
    const {
      selected, isNotFocused
    } = this.state;
    fetch(`/api/v1/devices/current_connection?id=${selected.id}&status=${isNotFocused}`, {
      credentials: 'same-origin'
    }).then((response) => response.json())
      .then((json) => {
        let using = 0;
        let watching = 0;
        const data = uniq(json.result).map((line) => line.split(','));
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
    this.setState((prevState) => ({ ...prevState, rfb: null }));
  }

  toggleDeviceList() {
    const { showDeviceList } = this.state;
    const { isNotFocused } = this.state;

    // If the device is currently in focus, we want to toggle the isNotFocused state
    // so that the device is blurred when the device list is toggled.
    if (!this.state.isNotFocused) {
      this.setState({ isNotFocused: !isNotFocused });
    }
    this.setState({
      showDeviceList: !showDeviceList,
      indicatorClassName: showDeviceList ? 'fa fa-chevron-circle-right' : 'fa fa-chevron-circle-left',
      mainContentClassName: showDeviceList ? 'small-col full-main' : 'small-col main-content'
    });
  }

  deviceClick(device) {
    UsersFetcher.fetchNoVNCDevices(device.id)
      .then((devices) => this.setState(
        (prevState) => ({ ...prevState, selected: devices[0] }),
        this.connect
      ));
  }

  tree(dev, selectedId) {
    const sortedDevices = dev.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });

    return (
      <Col className="small-col collec-tree">
        <div className="tree-view">
          <div className="title" style={{ backgroundColor: 'white' }}>
            <i className="fa fa-list" />
            {' '}
&nbsp;&nbsp; Devices
          </div>
        </div>
        <div className="tree-wrapper">
          {sortedDevices.map((device, index) => (
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
      isNotFocused, isForcedScreenResizing, connected, watching, using, forceCursor
    } = this.state;

    return (
      <div>
        <Grid fluid>
          <Row className="card-navigation">
            <Navigation toggleDeviceList={this.toggleDeviceList} />
          </Row>
          <Row className="card-content container-fluid">
            {showDeviceList && isNotFocused ? this.tree(devices, selected.id) : null}
            <Col className="small-col main-content">
              <FocusNovnc
                isNotFocused={isNotFocused}
                isForcedScreenResizing={isForcedScreenResizing}
                handleFocus={this.handleFocus}
                handleBlur={this.handleBlur}
                handleForceScreenResizing={this.handleForceScreenResizing}
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

export default CnC;
