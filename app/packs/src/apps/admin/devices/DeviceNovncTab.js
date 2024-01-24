import React, { useContext } from 'react';
import { FormControl, FormGroup, ControlLabel, Form } from 'react-bootstrap';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DeviceNovncTab = () => {
  const devicesStore = useContext(StoreContext).devices;
  const device = devicesStore.device;

  const onChange = (field, value) => {
    let newValue = value ? value : '';
    devicesStore.changeDevice(field, newValue);
  }

  const RenderStoredTarget = () => {
    if (device.novnc_target && device.novnc_token) {
      return `${device.novnc_target}?token=${device.novnc_token}`;
    }
    if (device.novnc_target && device.novnc_token === '') {
      return device.novnc_target;
    }
    return 'None';
  };

  const RenderCurrentTarget = () => {
    if (device.novnc_target && device.novnc_token) {
      return `${device.novnc_target}?token=${device.novnc_token}`;
    }
    if (device.novnc_target && !device.novnc_token) {
      return device.novnc_target;
    }
    return 'You haven\'t edited the target so far';
  };

  return (
    <Form className="form-with-columns">
      <FormGroup validationState={device.valid_novnc_target} className="col-half">
        <ControlLabel>Target</ControlLabel>
        <FormControl
          type="text"
          value={device.novnc_target ? device.novnc_target : ''}
          onChange={(event) => onChange('novnc_target', event.target.value)}
          placeholder="e.g. ws://localhost:8092/websockify"
        />
      </FormGroup>

      <FormGroup className="col-half">
        <ControlLabel>Websockify Token</ControlLabel>
        <FormControl
          type="text"
          value={device.novnc_token ? device.novnc_token : ''}
          onChange={(event) => onChange('novnc_token', event.target.value)}
          placeholder="e.g. 000001"
        />
      </FormGroup>

      <FormGroup className="col-full">
        <span className="fa fa-info-circle" aria-hidden="true">&nbsp;
          <b>Current Target</b>&nbsp;
          <RenderStoredTarget />
        </span>
        <br />
        <span className="fa fa-info-circle" aria-hidden="true">&nbsp;
          <b>Edited Target</b>&nbsp;
          <RenderCurrentTarget />
        </span>
        <hr />
        <h4>RFB Credentials</h4>
      </FormGroup>

      <FormGroup className="col-half">
        <ControlLabel>Password</ControlLabel>
        <FormControl
          type="text"
          value={device.novnc_password ? device.novnc_password : ''}
          onChange={(event) => onChange('novnc_password', event.target.value)}
          placeholder="Password"
        />
      </FormGroup>
    </Form>
  );
}

export default observer(DeviceNovncTab);
