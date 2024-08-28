import React, { useState, useEffect, useContext } from 'react';
import { Form, InputGroup, Tooltip, OverlayTrigger, Button } from 'react-bootstrap';
import Select from 'react-select3';
import Clipboard from 'clipboard';
import { startsWith, endsWith } from 'lodash';

import AdminFetcher from 'src/fetchers/AdminFetcher';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DeviceDataCollectorTab = () => {
  const devicesStore = useContext(StoreContext).devices;
  const [localCollectorValues, setLocalCollectorValues] = useState([]);
  const device = devicesStore.device;
  let clipboard = new Clipboard('.clipboardBtn');

  useEffect(() => {
    AdminFetcher.fetchLocalCollector()
      .then((result) => {
        setLocalCollectorValues(result.listLocalCollector);
      });
    devicesStore.changeDevice('datacollector_authentication', 'password');
  }, []);

  useEffect(() => {
    return () => {
      clipboard.destroy();
    }
  }, [devicesStore.deviceModalVisible]);

  const methodOptions = [
    { value: 'filewatchersftp', label: 'filewatchersftp' }, 
    { value: 'filewatcherlocal', label: 'filewatcherlocal' },
    { value: 'folderwatchersftp', label: 'folderwatchersftp' },
    { value: 'folderwatcherlocal', label: 'folderwatcherlocal' }
  ];

  const authenticationOptions = [
    { value: 'password', label: 'password' },
    { value: 'keyfile', label: 'keyfile' }
  ];

  let methodValue = '';
  let authenticationValue = { value: 'password', label: 'password' };

  if (device && device.datacollector_method) {
    methodValue = methodOptions.filter(f => f.value == device.datacollector_method);
  }
  if (device && device.datacollector_authentication) {
    authenticationValue = authenticationOptions.filter(f => f.value == device.datacollector_authentication);
  }

  const methodValueCheck = methodValue ? methodValue[0].value : '';
  const readonlyKeyName = authenticationValue !== null && authenticationValue[0] && authenticationValue[0].value == 'password';
  const userValue = device && device.datacollector_user ? device.datacollector_user : '';
  const hostValue = device && device.datacollector_host ? device.datacollector_host : '';
  const keyFileValue = device && device.datacollector_key_name ? device.datacollector_key_name : '';
  const numberOfFilesValue = device && device.datacollector_number_of_files ? device.datacollector_number_of_files : '1';
  const dir = device && device.datacollector_dir ? device.datacollector_dir : '';
  const userLevelSelected = device && device.datacollector_user_level_selected ? device.datacollector_user_level_selected : false;
  const dirValue = userLevelSelected && dir ? `${dir}/{UserSubDirectories}` : (dir ? dir : '');

  const tipCopyClipboard = <Tooltip id="copy_tooltip">copy to clipboard</Tooltip>;
  const userLevelLabel = (<>Enable user level data collection <i className="fa fa-info-circle" /></>);

  const onChange = (field, value) => {
    let newValue = '';
    if (value) {
      newValue = ['datacollector_method', 'datacollector_authentication'].includes(field) ? value.value : value;
    }
    devicesStore.changeDevice(field, newValue);
  }

  const ListLocalCollector = () => {
    return (
      <>
        <div className="mt-3 p-2 border-1 border-danger border-dashed">
          {
            localCollectorValues.map((c, i) => (
              <div key={`list-collector-${i}`}>
                <Form.Label className="fw-bold">Local Collector Dir Configurtaion</Form.Label>
                <Form.Group>
                  <InputGroup>
                    <OverlayTrigger placement="right" overlay={tipCopyClipboard}>
                      <Button size="sm" variant="secondary" className="clipboardBtn btn-xxsm" data-clipboard-target={`#copy-input-${i}`}>
                        <i className="fa fa-clipboard" />
                      </Button>
                    </OverlayTrigger>
                    <Form.Control
                      id={`copy-input-${i}`}
                      type="text"
                      value={c.path}
                      readOnly
                      className="border-0 h-25"
                    />
                  </InputGroup>
                </Form.Group>
              </div>
            ))
          }
        </div>
      </>
    );
  }

  return (
    <Form className="d-flex justify-content-between flex-wrap">
      <Form.Group className="w-100 mb-4">
        <Form.Label>Watch method *</Form.Label>
        <Select
          isClearable
          value={methodValue}
          classNamePrefix={device.valid_datacollector_method}
          options={methodOptions}
          onChange={(event) => onChange('datacollector_method', event)}
        />
      </Form.Group>

      <Form.Group className="w-50 mb-4 pe-4">
        <Form.Label>User *</Form.Label>
        <Form.Control
          type="text"
          value={userValue}
          className={device.valid_datacollector_user}
          onChange={(event) => onChange('datacollector_user', event.target.value)}
          placeholder="e.g. User"
          readOnly={endsWith(methodValueCheck, 'local')}
          disabled={endsWith(methodValueCheck, 'local')}
        />
      </Form.Group>

      <Form.Group className="w-50 mb-4">
        <Form.Label>Host *</Form.Label>
        <Form.Control
          type="text"
          value={hostValue}
          className={device.valid_datacollector_host}
          onChange={(event) => onChange('datacollector_host', event.target.value)}
          placeholder="e.g. remote.address or localhost:2222"
          readOnly={endsWith(methodValueCheck, 'local')}
          disabled={endsWith(methodValueCheck, 'local')}
        />
      </Form.Group>

      <Form.Group className="w-50 mb-4 pe-4">
        <Form.Label>SFTP authentication with</Form.Label>
        <Select
          value={authenticationValue}
          options={authenticationOptions}
          onChange={(event) => onChange('datacollector_authentication', event)}
        />
      </Form.Group>

      <Form.Group className="w-50 mb-4">
        <Form.Label>Key file</Form.Label>
        <Form.Control
          type="text"
          value={keyFileValue}
          className={device.valid_datacollector_key_name}
          onChange={(event) => onChange('datacollector_key_name', event.target.value)}
          placeholder="e.g. /home/user/.ssh/rsa/eln-privatekey.pem"
          readOnly={endsWith(methodValueCheck, 'local') || readonlyKeyName}
          disabled={endsWith(methodValueCheck, 'local') || readonlyKeyName}
        />
      </Form.Group>

      <Form.Group className="w-100 mb-4">
        <Form.Label>Watch directory *</Form.Label>
        <Form.Control
          type="text"
          value={dirValue}
          className={device.valid_datacollector_dir}
          onChange={(event) => onChange('datacollector_dir', event.target.value)}
          placeholder="e.g. /home/sftp/eln"
          readOnly={userLevelSelected}
          disabled={userLevelSelected}
        />

        <OverlayTrigger
          placement="bottom"
          overlay={(
            <Tooltip id="enableUserLevel">
              If you choose this option, the system will gather files and folders from subdirectories within the
              directory you have specified. These subdirectories must align with user name abbreviations.
            </Tooltip>
          )}
        >
          <div className="mt-4">
            <Form.Check
              type="checkbox"
              checked={userLevelSelected}
              label={userLevelLabel}
              onChange={(event) => onChange('datacollector_user_level_selected', event.target.checked)}
            >
            </Form.Check>
          </div>
        </OverlayTrigger>

        {
          endsWith(methodValueCheck, 'local') ? <ListLocalCollector /> : null
        }
      </Form.Group>

      <Form.Group className="w-100 mb-4">
        <Form.Label className="fw-bold">Number of files</Form.Label>
        <Form.Control
          type="number"
          value={numberOfFilesValue}
          onChange={(event) => onChange('datacollector_number_of_files', event.target.value)}
          min="0"
          placeholder="e.g. 10"
          readOnly={startsWith(methodValueCheck, 'file')}
          disabled={startsWith(methodValueCheck, 'file')}
        />
        <i className="fa fa-info-circle"> Folderwatcher: set to 0 for a varying number of files</i>
      </Form.Group>
    </Form>
  );
}

export default observer(DeviceDataCollectorTab);
