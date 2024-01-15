import React, { useState, useEffect, useContext } from 'react';
import { FormControl, FormGroup, ControlLabel, Form, InputGroup, Tooltip, OverlayTrigger, Button } from 'react-bootstrap';
import Select from 'react-select3';
import { startsWith, endsWith } from 'lodash';

import AdminFetcher from 'src/fetchers/AdminFetcher';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DeviceDataCollectorTab = () => {
  const devicesStore = useContext(StoreContext).devices;
  const [localCollectorValues, setLocalCollectorValues] = useState([]);
  const device = devicesStore.device;
  console.log(device);

  useEffect(() => {
    AdminFetcher.fetchLocalCollector()
      .then((result) => {
        setLocalCollectorValues(result.listLocalCollector);
      });
  }, []);

  let methodParams = {
    dir: '',
    host: '',
    user: '',
    authen: '',
    number_of_files: '1',
    key_name: '',
  };

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

  methodParams = device && device.datacollector_config && device.datacollector_config.method_params ? device.datacollector_config.method_params : methodParams;
  const methodValue = device && device.datacollector_config ? methodOptions.filter(f => f.value == device.datacollector_config.method) : '';
  const authenticationValue = device && methodParams && methodParams.authen ? authenticationOptions.filter(f => f.value == methodParams.authen) : { value: 'password', label: 'password' };
  const userValue = device && methodParams && methodParams.user ? methodParams.user : '';
  const hostValue = device && methodParams && methodParams.host ? methodParams.host : '';
  const keyFileValue = device && methodParams && methodParams.key_name ? methodParams.key_name : '';
  const dirValue = device && methodParams && methodParams.dir ? methodParams.dir : '';
  const numberOfFilesValue = device && methodParams && methodParams.number_of_files ? methodParams.number_of_files : '1';

  const tipCopyClipboard = <Tooltip id="copy_tooltip">copy to clipboard</Tooltip>;

  const onChange = (field, value, methodParams) => {
    let newValue = value ? (['method', 'authen'].includes(field) ? value.value : value) : '';
    console.log(field, value, newValue);
    //datacollector_config
    //devicesStore.changeDeviceDataCollectorConfig(field, newValue, methodParams);
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
        </div >
      </>
    );
  }

  // checks key, test connections (in list) and other things ....
  // admin_fetcher updateDeviceMethod error bei falschem key
  // {"method": "folderwatchersftp", "method_params": {"dir": "/home/chemotion-dev/app/tmp/datacollector", "host": "http://localhost:3000", "user": "blub", "authen": "password", "number_of_files": 1, "key_name": "/home/user/.ssh/rsa/eln-privatekey.pem"}}

  return (
    <Form>
      <FormGroup>
        <ControlLabel>Watch method</ControlLabel>
        <Select
          isClearable
          value={methodValue}
          options={methodOptions}
          onChange={(event) => onChange('method', event, false)}
        />
      </FormGroup>

      <FormGroup>
        <ControlLabel>User</ControlLabel>
        <FormControl
          type="text"
          value={userValue}
          onChange={(event) => onChange('user', event.target.value, true)}
          placeholder="e.g. User"
          readOnly={endsWith(methodValue[0].value, 'local')}
        />
      </FormGroup>

      <FormGroup>
        <ControlLabel>Host</ControlLabel>
        <FormControl
          type="text"
          value={hostValue}
          onChange={(event) => onChange('host', event.target.value, true)}
          placeholder="e.g. google.com"
          readOnly={endsWith(methodValue[0].value, 'local')}
        />
      </FormGroup>

      <FormGroup>
        <ControlLabel>SFTP authentication with</ControlLabel>
        <Select
          isClearable
          value={authenticationValue}
          options={authenticationOptions}
          onChange={(event) => onChange('authen', event, true)}
        />
      </FormGroup>

      <FormGroup>
        <ControlLabel>Key file</ControlLabel>
        <FormControl
          type="text"
          value={keyFileValue}
          onChange={(event) => onChange('key_name', event.target.value, true)}
          placeholder="e.g. /home/user/.ssh/rsa/eln-privatekey.pem"
          readOnly={endsWith(methodValue[0].value, 'local') || authenticationValue[0].value === 'password'}
        />
      </FormGroup>

      <FormGroup>
        <ControlLabel>Watch directory</ControlLabel>
        <FormControl
          type="text"
          value={dirValue}
          onChange={(event) => onChange('dir', event.target.value, true)}
          placeholder="e.g. /home/sftp/eln"
        />
        {
          endsWith(methodValue[0].value, 'local') ? <ListLocalCollector /> : null
        }
      </FormGroup>

      <FormGroup>
        <ControlLabel>Number of files</ControlLabel>
        <FormControl
          type="number"
          value={numberOfFilesValue}
          onChange={(event) => onChange('number_of_files', event.target.value, true)}
          min="0"
          placeholder="e.g. 10"
          readOnly={startsWith(methodValue[0].value, 'file')}
        />
        <span className="fa fa-info-circle" aria-hidden="true">&nbsp;Folderwatcher: set to 0 for a varying number of files</span>
      </FormGroup>
    </Form>
  );
}

export default observer(DeviceDataCollectorTab);
