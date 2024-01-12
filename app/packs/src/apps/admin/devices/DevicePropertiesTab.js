import React, { useContext } from 'react';
import { FormGroup, ControlLabel, Form, FormControl, Checkbox } from 'react-bootstrap';
import Select from 'react-select3';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DevicePropertiesTab = () => {
  const devicesStore = useContext(StoreContext).devices;
  let device = devicesStore.device;

  const verificationOptions = [
    { label: 'None', value: 'none' },
    { label: 'Verified device', value: 'verified_device' },
    { label: 'Unverified sub-version', value: 'unverified_sub_version' },
    { label: 'Verified sub-version', value: 'verified_sub_version' },
  ];
  const verificationStatusValue = device ? verificationOptions.filter(f => f.value == device.verification_status) : '';

  const onChange = (field, value) => {
    let newValue = value ? value : '';
    devicesStore.changeDevice(field, newValue);
  }

  return (
    <Form>
      <FormGroup validationState={device.valid_name}>
        <ControlLabel>Name *</ControlLabel>
        <FormControl
          type="text"
          value={device.name}
          onChange={(event) => onChange('name', event.target.value)}
        />
      </FormGroup>

      <FormGroup validationState={device.valid_name_abbreviation}>
        <ControlLabel>Name abbreviation *</ControlLabel>
        <FormControl
          type="text"
          value={device.name_abbreviation}
          onChange={(event) => onChange('name_abbreviation', event.target.value)}
        />
      </FormGroup>

      <FormGroup>
        <ControlLabel>Serial number</ControlLabel>
        <FormControl
          type="text"
          value={device.serial_number ? device.serial_number : ''}
          onChange={(event) => onChange('serial_number', event.target.value)}
        />
      </FormGroup>

      <FormGroup>
        <ControlLabel>Verification Status</ControlLabel>
        <Select
          isClearable
          value={verificationStatusValue}
          options={verificationOptions}
          onChange={(event) => onChange('verification_status', event.value)}
        />
      </FormGroup>

      <FormGroup>
        <Checkbox
          checked={device.account_active}
          onChange={(event) => onChange('account_active', event.target.checked)}
        >
          Active
        </Checkbox>
      </FormGroup>

      <FormGroup>
        <Checkbox
          checked={device.visibility}
          onChange={(event) => onChange('visibility', event.target.checked)}
        >
          Visibility
        </Checkbox>
      </FormGroup>
    </Form>
  );
}

export default observer(DevicePropertiesTab);
