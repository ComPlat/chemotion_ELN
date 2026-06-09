import React, { useContext } from 'react';
import { Form } from 'react-bootstrap';
import { useIntl, FormattedMessage } from 'react-intl';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function DeviceNovncTab() {
  const intl = useIntl();
  const devicesStore = useContext(StoreContext).devices;
  const { device } = devicesStore;

  const onChange = (field, value) => {
    const newValue = value || '';
    if (field == 'novnc_password') {
      devicesStore.setChangeNovncPassword(true);
    }
    devicesStore.changeDevice(field, newValue);
  };

  const renderStoredTarget = () => {
    if (device.novnc_target && device.novnc_token) {
      return `${device.novnc_target}?token=${device.novnc_token}`;
    }
    if (device.novnc_target && device.novnc_token === '') {
      return device.novnc_target;
    }
    return intl.formatMessage({ id: 'none' });
  };

  const renderCurrentTarget = () => {
    if (device.novnc_target && device.novnc_token) {
      return `${device.novnc_target}?token=${device.novnc_token}`;
    }
    if (device.novnc_target && !device.novnc_token) {
      return device.novnc_target;
    }
    return intl.formatMessage({ id: 'devices-novnc_no_target_yet' });
  };

  let passwordValue = '';
  if (devicesStore.change_novnc_password) {
    passwordValue = device.novnc_password;
  } else if (device.novnc_password_decrypted) {
    passwordValue = device.novnc_password_decrypted;
  }

  return (
    <Form className="d-flex justify-content-between flex-wrap">
      <Form.Group className="w-50 mb-3 pe-4">
        <Form.Label>
          <FormattedMessage id="devices-novnc_target" />
          {' '}
          *
        </Form.Label>
        <Form.Control
          type="text"
          value={device.novnc_target ? device.novnc_target : ''}
          className={device.valid_novnc_target}
          onChange={(event) => onChange('novnc_target', event.target.value)}
          placeholder={intl.formatMessage({ id: 'devices-novnc_target_placeholder' })}
        />
      </Form.Group>

      <Form.Group className="w-50 mb-3">
        <Form.Label><FormattedMessage id="devices-novnc_websockify_token" /></Form.Label>
        <Form.Control
          type="text"
          value={device.novnc_token ? device.novnc_token : ''}
          onChange={(event) => onChange('novnc_token', event.target.value)}
          placeholder={intl.formatMessage({ id: 'devices-novnc_token_placeholder' })}
        />
      </Form.Group>

      <p className="mb-3">
        <i className="fa fa-info-circle" />
        <span className="fw-bold px-1">
          <FormattedMessage id="devices-novnc_current_target" />
          :
        </span>
        {renderStoredTarget()}
        <br />
        <i className="fa fa-info-circle" />
        <span className="fw-bold px-1">
          <FormattedMessage id="devices-novnc_edited_target" />
          :
        </span>
        {renderCurrentTarget()}
      </p>

      <hr className="w-100" />
      <h4 className="w-100 mb-4"><FormattedMessage id="devices-novnc_rfb_credentials" /></h4>

      <Form.Group className="w-50 mb-4 pe-4">
        <Form.Label><FormattedMessage id="user_management-password" /></Form.Label>
        <Form.Control
          type="text"
          value={passwordValue}
          onChange={(event) => onChange('novnc_password', event.target.value)}
          placeholder={intl.formatMessage({ id: 'user_management-password' })}
        />
      </Form.Group>
    </Form>
  );
}

export default observer(DeviceNovncTab);
