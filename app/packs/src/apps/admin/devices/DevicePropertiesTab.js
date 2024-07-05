import React, { useContext } from 'react';
import { Form } from 'react-bootstrap';
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
      <Form.Group validationState={device.valid_name}>
        <Form.Label>Name *</Form.Label>
        <Form.Control
          type="text"
          value={device.name}
          onChange={(event) => onChange('name', event.target.value)}
        />
      </Form.Group>

      <Form.Group validationState={device.valid_name_abbreviation}>
        <Form.Label>Name abbreviation *</Form.Label>
        <Form.Control
          type="text"
          value={device.name_abbreviation}
          onChange={(event) => onChange('name_abbreviation', event.target.value)}
        />
      </Form.Group>

      <Form.Group>
        <Form.Label>Email</Form.Label>
        <Form.Control
          type="text"
          value={device.email}
          readOnly={true}
        />
      </Form.Group>

      <Form.Group>
        <Form.Label>Serial number</Form.Label>
        <Form.Control
          type="text"
          value={device.serial_number ? device.serial_number : ''}
          onChange={(event) => onChange('serial_number', event.target.value)}
        />
      </Form.Group>

      <Form.Group>
        <Form.Label>Verification Status</Form.Label>
        <Select
          isClearable
          value={verificationStatusValue}
          options={verificationOptions}
          onChange={(event) => onChange('verification_status', event.value)}
        />
      </Form.Group>

      <Form.Group>
        <Form.Check
          type="checkbox"
          checked={device.account_active}
          onChange={(event) => onChange('account_active', event.target.checked)}
        >
          Active
        </Form.Check>
      </Form.Group>

      <Form.Group>
        <Form.Check
          type="checkbox"
          checked={device.visibility}
          onChange={(event) => onChange('visibility', event.target.checked)}
        >
          Visibility
        </Form.Check>
      </Form.Group>
    </Form>
  );
}

export default observer(DevicePropertiesTab);
