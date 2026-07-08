import React, {
  useRef, useContext, useEffect, useState
} from 'react';
import { observer } from 'mobx-react';
import RFB from '@novnc/novnc/lib/rfb';
import {
  Container, Row, Col, ListGroup
} from 'react-bootstrap';

import { StoreContext } from 'src/stores/mobx/RootStore';
import FocusNovnc from 'src/apps/commandAndControl/FocusNovnc';
import BaseNavigation from 'src/components/navigation/BaseNavigation';
import DeviceFetcher from 'src/fetchers/DeviceFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';

// Timeout before disconnection when not focused
const TIME_DISCO = 180000;
// Timeout before bluring when focused and mouse has left the canvas
const TIME_BLUR = 55000;
// Interval to query connection counter
const TIME_CONN = 4000;

function CnC() {
  const { devices } = useContext(StoreContext).userStore;
  const [selectedDevice, setSelectedDevice] = useState({});
  const [showDeviceList, setShowDeviceList] = useState(true);
  const [connected, setConnected] = useState(false);
  const [rfb, setRfb] = useState(null);
  const [isNotFocused, setIsNotFocused] = useState(true);
  const [isForcedScreenResizing, setIsForcedScreenResizing] = useState(false);
  const [using, setUsing] = useState(0);
  const [watching, setWatching] = useState(0);
  const [autoBlur, setAutoBlur] = useState(null);
  const [autoDisconnect, setAutoDisconnect] = useState(null);
  const [forceCursor, setForceCursor] = useState(false);
  const [connections, setConnections] = useState(null);
  const canvasRef = useRef();

  const { userStore } = useContext(StoreContext);

  useEffect(() => {
    userStore.fetchCurrentUser();
  }, []);

  /**
   * Handles the event when the screen size is changing.
   * If screen resizing is forced, toggles the `scaleViewport` property of the RFB instance.
   * This is done by setting it to false and then back to true, which triggers a resize.
   */
  const handleScreenSizeChanging = () => {
    // If there is no RFB instance or screen resizing is not forced, return early
    if (!rfb || !isForcedScreenResizing) { return; }
    const tempRFB = rfb;
    // Toggle the `scaleViewport` property of the RFB instance
    tempRFB.scaleViewport = false;
    tempRFB.scaleViewport = true;

    setRfb(tempRFB);
  };

  const fetchConnections = () => {
    if (!selectedDevice || !selectedDevice.id) { return; }

    DeviceFetcher.fetchCurrentConnection(selectedDevice, isNotFocused)
      .then((result) => {
        setUsing(result.using);
        setWatching(result.watching);
      });
  };

  const disconnect = () => {
    clearInterval(connections);
    if (!rfb) return;

    rfb.disconnect();
    setRfb(null);
  };

  const connect = () => {
    disconnect();
    const { id, target, password } = selectedDevice;
    if (!canvasRef.current || !id || !target) { return; }

    const newRfb = new RFB(
      canvasRef.current,
      target,
      {
        repeaterID: '',
        shared: true,
        credentials: { password },
      }
    );
    newRfb.viewOnly = true;
    newRfb.reconnect = true;
    newRfb.show_dot = true;
    // Prevent the viewport from jumping to the clicked position when in focus mode on the device remote display
    newRfb.focusOnClick = false;

    newRfb.addEventListener('connect', () => setConnected(true));
    newRfb.addEventListener('disconnect', () => setConnected(false));

    setRfb(newRfb);
    setIsNotFocused(true);
    setIsForcedScreenResizing(false);
    setConnections(setInterval(fetchConnections, TIME_CONN));
  };

  useEffect(() => {
    userStore.fetchNoVNCDevices();
    // Listen for window resize event and handle it accordingly
    window.addEventListener('resize', handleScreenSizeChanging);

    return () => {
      disconnect();

      // Remove event listener for window resize
      window.removeEventListener('resize', handleScreenSizeChanging);
    };
  }, []);

  // Connect to device after a new device is selected
  // This is intended to replace the following code from deviceClick():
  //    this.setState(
  //      (prevState) => ({ ...prevState, selected: devices[0] }),
  //      this.connect
  //    ));
  useEffect(() => {
    connect();
  }, [selectedDevice]);

  const clearTimers = () => {
    clearTimeout(autoBlur);
    clearTimeout(autoDisconnect);
  };

  const handleFocus = () => {
    if (!rfb) { return; }

    const newRFB = rfb;
    newRFB.viewOnly = false;

    // Focuses the RFB instance
    newRFB.focus();
    clearTimers(); // Clear the auto blur and auto disconnect timers
    setRfb(newRFB);
    setIsNotFocused(false);
    setShowDeviceList(false);

    // If screen resizing is forced, trigger the `handleScreenSizeChanging` function
    if (isForcedScreenResizing) {
      setTimeout(handleScreenSizeChanging, 1);
    }
  };

  /*
   * Toggles the `scaleViewport` property of the RFB instance and updates the state accordingly.
   * Also clears the auto blur and auto disconnect timers and updates the state accordingly.
   */
  const handleForceScreenResizing = () => {
    // If there is no RFB instance, return early
    if (!rfb) { return; }

    // Create a copy of the current RFB instance
    const tempRFB = rfb;
    // Toggle the `scaleViewport` property of the RFB instance
    tempRFB.scaleViewport = !isForcedScreenResizing;
    // Clear the auto blur and auto disconnect timers
    clearTimers();
    // Update the state with the new RFB instance and toggled `isForcedScreenResizing` property
    setRfb(tempRFB);
    setIsForcedScreenResizing(!isForcedScreenResizing);
  };

  const autoDisconnectHandler = () => {
    clearInterval(connections);
    rfb.disconnect();
  };

  const handleBlur = () => {
    if (!rfb) { return; }
    const tempRFB = rfb;
    tempRFB.viewOnly = true;
    // Toggle the device list when the screen is blurred
    // This provides a way to hide the device list when the user is not focused on the screen
    // this.toggleDeviceList();
    clearTimers();
    const disconnectTime = setTimeout(autoDisconnectHandler, TIME_DISCO);
    setRfb(tempRFB);
    setIsNotFocused(true);
    setShowDeviceList(true);
    setAutoDisconnect(disconnectTime);

    // If screen resizing is forced, trigger the `handleScreenSizeChanging` function
    if (isForcedScreenResizing) {
      setTimeout(handleScreenSizeChanging, 1);
    }
  };

  const toggleForceCursor = () => {
    setForceCursor(!forceCursor);
  };

  const handleMouseEnter = () => {
    if (!rfb || isNotFocused) { return; }

    clearTimers();
  };

  const handleMouseLeave = () => {
    if (isNotFocused) { return; }

    clearTimers();
    const blurTime = setTimeout(handleBlur, TIME_BLUR);
    setAutoBlur(blurTime);
  };

  const toggleDeviceList = () => {
    // If the device is currently in focus, we want to call handleBlur
    // so that the device is blurred when the device list is toggled.
    if (!isNotFocused) {
      handleBlur();
    }

    setShowDeviceList(!showDeviceList);
  };

  const deviceClick = (device) => {
    UsersFetcher.fetchNoVNCDevices(device.id)
      .then((newDevices) => setSelectedDevice(newDevices[0]));
  };

  const renderDeviceList = () => {
    const sortedDevices = devices.slice().sort((a, b) => a.name.localeCompare(b.name));

    return (
      <ListGroup>
        {sortedDevices.map((device) => (
          <ListGroup.Item
            action
            key={`device${device.id}`}
            onClick={() => deviceClick(device)}
            active={selectedDevice.id === device.id}
          >
            <div className="d-flex align-items-center justify-content-between">
              {device.name}
              {selectedDevice.id === device.id && (
                <i className={`fa ${connected
                  ? 'fa-check-circle-o text-success'
                  : 'fa-times-circle-o text-danger'}`}
                />
              )}
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  };

  const showList = showDeviceList && isNotFocused;

  return (
    <>
      <BaseNavigation toggleDeviceList={toggleDeviceList} />
      <Container fluid>
        <Row className="pt-3">
          {showList && (
            <Col xs={2}>
              <div className="d-flex gap-2 align-items-baseline">
                <i className="fa fa-list" />
                <span>Devices</span>
              </div>

              {renderDeviceList()}
            </Col>
          )}
          <Col xs={showList ? 10 : 12} className="d-flex flex-column gap-2">
            <FocusNovnc
              isNotFocused={isNotFocused}
              isForcedScreenResizing={isForcedScreenResizing}
              handleFocus={handleFocus}
              handleBlur={handleBlur}
              handleForceScreenResizing={handleForceScreenResizing}
              toggleDeviceList={toggleDeviceList}
              isDeviceListVisible={showList}
              connected={connected}
              watching={watching}
              using={using}
              forceCursor={forceCursor}
              handleCursor={toggleForceCursor}
            />
            <div
              className={forceCursor ? 'force-mouse-pointer' : ''}
              ref={canvasRef}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default observer(CnC);
