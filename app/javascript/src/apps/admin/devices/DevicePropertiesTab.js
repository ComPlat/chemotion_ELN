import React, { useContext } from 'react';
import { Form } from 'react-bootstrap';
import { useIntl, FormattedMessage } from 'react-intl';
import { Select } from 'src/components/common/Select';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function DevicePropertiesTab() {
  const intl = useIntl();
  const devicesStore = useContext(StoreContext).devices;
  const { device } = devicesStore;

  const verificationOptions = [
    { label: intl.formatMessage({ id: 'none' }), value: 'none' },
    { label: intl.formatMessage({ id: 'devices-verification_verified_device' }), value: 'verified_device' },
    {
      label: intl.formatMessage(
        { id: 'devices-verification_unverified_sub_version' }
      ),
      value: 'unverified_sub_version'
    },
    { label: intl.formatMessage({ id: 'devices-verification_verified_sub_version' }), value: 'verified_sub_version' },
  ];
  const verificationStatusValue = device
    ? verificationOptions.filter((f) => f.value === device.verification_status) : '';

  const onChange = (field, value) => {
    const newValue = value || '';
    devicesStore.changeDevice(field, newValue);
  };

  return (
    <Form>
      <Form.Group className="mb-4">
        <Form.Label>
          <FormattedMessage id="name" />
          {' '}
          *
        </Form.Label>
        <Form.Control
          type="text"
          value={device.name}
          className={device.valid_name}
          onChange={(event) => onChange('name', event.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label>
          <FormattedMessage id="devices-name_abbreviation" />
          {' '}
          *
        </Form.Label>
        <Form.Control
          type="text"
          value={device.name_abbreviation}
          className={device.valid_name_abbreviation}
          onChange={(event) => onChange('name_abbreviation', event.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label><FormattedMessage id="email" /></Form.Label>
        <Form.Control
          type="text"
          value={device.email}
          className={device.email}
          onChange={(event) => onChange('email', event.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label><FormattedMessage id="devices-serial_number" /></Form.Label>
        <Form.Control
          type="text"
          value={device.serial_number ? device.serial_number : ''}
          onChange={(event) => onChange('serial_number', event.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label><FormattedMessage id="devices-verification_status" /></Form.Label>
        <Select
          isClearable
          value={verificationStatusValue}
          options={verificationOptions}
          onChange={(event) => onChange('verification_status', event.value)}
        />
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Check
          id="device_active"
          type="checkbox"
          checked={device.account_active}
          label={intl.formatMessage({ id: 'devices-active' })}
          onChange={(event) => onChange('account_active', event.target.checked)}
        />
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Check
          id="device_visible"
          type="checkbox"
          checked={device.visibility}
          label={intl.formatMessage({ id: 'devices-visibility' })}
          onChange={(event) => onChange('visibility', event.target.checked)}
        />
      </Form.Group>
    </Form>
  );
}

export default observer(DevicePropertiesTab);
