import React, { useState, useEffect, useContext } from 'react';
import {
  FormControl, FormGroup, ControlLabel, Form, InputGroup, Tooltip, OverlayTrigger, Button, Checkbox
} from 'react-bootstrap';
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
    { value: 'folderwatcherlocal', label: 'folderwatcherlocal' },
    { value: 'disabled', label: 'disabled' }
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
        <div className="device-datacollector-directory-list">
          <h6><b>Local Collector Dir Configurtaion</b></h6>
          {
            localCollectorValues.map((c, i) => (
              <div key={`list-collector-${i}`}>
                <FormGroup bsSize="small">
                  <InputGroup>
                    <InputGroup.Button>
                      <OverlayTrigger placement="right" overlay={tipCopyClipboard}>
                        <Button bsSize="xsmall" active className="clipboardBtn" data-clipboard-target={`#copy-input-${i}`} >
                          <i className="fa fa-clipboard" />
                        </Button>
                      </OverlayTrigger>
                    </InputGroup.Button>
                    <FormControl
                      id={`copy-input-${i}`}
                      type="text"
                      value={c.path}
                      readOnly
                    />
                  </InputGroup>
                </FormGroup>
              </div>
            ))
          }
        </div>
      </>
    );
  }

  return (
    <Form className="form-with-columns">
      <FormGroup validationState={device.valid_datacollector_method} className="col-full">
        <ControlLabel>Watch method *</ControlLabel>
        <Select
          isClearable
          value={methodValue}
          options={methodOptions}
          onChange={(event) => onChange('datacollector_method', event)}
        />
      </FormGroup>

      <FormGroup validationState={device.valid_datacollector_user} className="col-half">
        <ControlLabel>User *</ControlLabel>
        <FormControl
          type="text"
          value={userValue}
          onChange={(event) => onChange('datacollector_user', event.target.value)}
          placeholder="e.g. User"
          readOnly={endsWith(methodValueCheck, 'local')}
        />
      </FormGroup>

      <FormGroup validationState={device.valid_datacollector_host} className="col-half">
        <ControlLabel>Host *</ControlLabel>
        <FormControl
          type="text"
          value={hostValue}
          onChange={(event) => onChange('datacollector_host', event.target.value)}
          placeholder="e.g. remote.address or localhost:2222"
          readOnly={endsWith(methodValueCheck, 'local')}
        />
      </FormGroup>

      <FormGroup className="col-half">
        <ControlLabel>SFTP authentication with</ControlLabel>
        <Select
          value={authenticationValue}
          options={authenticationOptions}
          onChange={(event) => onChange('datacollector_authentication', event)}
        />
      </FormGroup>

      <FormGroup validationState={device.valid_datacollector_key_name} className="col-half">
        <ControlLabel>Key file</ControlLabel>
        <FormControl
          type="text"
          value={keyFileValue}
          onChange={(event) => onChange('datacollector_key_name', event.target.value)}
          placeholder="e.g. /home/user/.ssh/rsa/eln-privatekey.pem"
          readOnly={endsWith(methodValueCheck, 'local') || readonlyKeyName}
        />
      </FormGroup>

      <FormGroup validationState={device.valid_datacollector_dir} className="col-full">
        <ControlLabel>Watch directory *</ControlLabel>
        <FormControl
          type="text"
          value={dirValue}
          onChange={(event) => onChange('datacollector_dir', event.target.value)}
          placeholder="e.g. /home/sftp/eln"
          readOnly={userLevelSelected}
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
          <div>
            <Checkbox
              checked={userLevelSelected}
              onChange={(event) => onChange('datacollector_user_level_selected', event.target.checked)}
            >
              Enable user level data collection&nbsp;
              <span className="fa fa-info-circle" aria-hidden="true" />
            </Checkbox>
          </div>
        </OverlayTrigger>

        {
          endsWith(methodValueCheck, 'local') ? <ListLocalCollector /> : null
        }
      </FormGroup>

      <FormGroup className="col-full">
        <ControlLabel>Number of files</ControlLabel>
        <FormControl
          type="number"
          value={numberOfFilesValue}
          onChange={(event) => onChange('datacollector_number_of_files', event.target.value)}
          min="0"
          placeholder="e.g. 10"
          readOnly={startsWith(methodValueCheck, 'file')}
        />
        <span className="fa fa-info-circle" aria-hidden="true">&nbsp;Folderwatcher: set to 0 for a varying number of files</span>
      </FormGroup>
    </Form>
  );
}

export default observer(DeviceDataCollectorTab);
