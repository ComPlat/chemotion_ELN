import React from 'react';
import { Form, ControlLabel, Panel, Button, Table, Modal } from 'react-bootstrap';
import Select from 'react-select';
import _ from 'lodash';

import AdminFetcher from '../components/fetchers/AdminFetcher';

export default class DataCollector extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      collectMethod: [
        { value: 'filewatchersftp', name: 'filewatchersftp', label: 'filewatchersftp' },
        { value: 'filewatcherlocal', name: 'filewatcherlocal', label: 'filewatcherlocal' },
        { value: 'folderwatchersftp', name: 'folderwatchersftp', label: 'folderwatchersftp' },
        { value: 'folderwatcherlocal', name: 'folderwatcherlocal', label: 'folderwatcherlocal' },
      ],
      selectedCollectMethod: null,
      devices: [],
      showConfigModal: false,
      selectedDevice: null,
      disableForLocal: true,
      disableForFile: true,
    };
    this.handleDeviceListFetch = this.handleDeviceListFetch.bind(this);
    this.handleCollectMethodChange = this.handleCollectMethodChange.bind(this);
    this.handleConfigModalShow = this.handleConfigModalShow.bind(this);
    this.handleConfigModalClose = this.handleConfigModalClose.bind(this);
  }

  componentDidMount() {
    this.handleDeviceListFetch();
  }

  handleConfigModalShow(deviceId, show) {
    AdminFetcher.fetchDeviceById(deviceId)
      .then((result) => {
        if (result.device) {
          const selectedDevice = result.device;
          this.setState({
            selectedDevice,
            selectedCollectMethod: selectedDevice.data.method,
            disableForLocal: _.endsWith(selectedDevice.data.method, 'local'),
            disableForFile: _.startsWith(selectedDevice.data.method, 'file'),
            showConfigModal: show
          });
        }
      });
  }

  handleConfigModalClose() {
    AdminFetcher.fetchDevices()
      .then((result) => {
        this.setState({
          devices: result.devices,
          showConfigModal: false,
        });
      });
  }

  handleCollectMethodChange(selectedCollectMethod) {
    const { selectedDevice } = this.state;
    
    if (_.startsWith(selectedCollectMethod.value, 'file')) {
      if (selectedDevice.data.method_params && selectedDevice.data.method_params.number_of_files) {
        selectedDevice.data.method_params.number_of_files = 0;
      }
    }

    if (selectedCollectMethod) {
      this.setState({
        selectedCollectMethod: selectedCollectMethod.value,
        disableForLocal: _.endsWith(selectedCollectMethod.value, 'local'),
        disableForFile: _.startsWith(selectedCollectMethod.value, 'file'),
        selectedDevice,
      });
    }
  }

  handleDeviceListFetch() {
    AdminFetcher.fetchDevices()
      .then((result) => {
        this.setState({
          devices: result.devices,
        });
      });
  }

  saveData() {
    const { selectedDevice, selectedCollectMethod } = this.state;

    if (!selectedCollectMethod) {
      alert('Please select Data Collector Method!');
      return false;
    }
    if (!this.refDir || this.refDir.value.trim() === '') {
      alert('Please input Dir!');
      return false;
    }
    if (!_.endsWith(selectedCollectMethod, 'local')) {
      if (!this.refHost || this.refHost.value.trim() === '') {
        alert('Please input Host!');
        return false;
      }
      if (!this.refUser || this.refUser.value.trim() === '') {
        alert('Please input User!');
        return false;
      }
    }
    if (_.startsWith(selectedCollectMethod, 'folder') && Math.trunc(this.refNumberOfFiles.value) < 1) {
      alert('Number of Files must be greater than 0!');
      return false;
    }

    const params = {
      id: selectedDevice.id,
      data: {
        method: selectedCollectMethod,
        method_params: {
          dir: this.refDir.value.trim(),
        }
      }
    };

    if (!_.endsWith(selectedCollectMethod, 'local')) {
      params.data.method_params.host = this.refHost.value.trim();
      params.data.method_params.user = this.refUser.value.trim();
    }
    if (_.startsWith(selectedCollectMethod, 'folder')) {
      params.data.method_params.number_of_files = Math.trunc(this.refNumberOfFiles.value);
    }
    AdminFetcher.updateDeviceMethod(params)
      .then((result) => {
        if (result.error) {
          return false;
        }
        this.handleConfigModalClose();
        return true;
      });
    return true;
  }

  renderConfiModal() {
    if (this.state.showConfigModal) {
      const {
        selectedDevice, selectedCollectMethod, collectMethod, disableForLocal, disableForFile
      } = this.state;
      let defaultNumber = 0;
      if (!disableForFile) {
        defaultNumber = selectedDevice.data.method_params &&
        selectedDevice.data.method_params.number_of_files ?
          selectedDevice.data.method_params.number_of_files : 1;
      }

      return (
        <Modal
          show={this.state.showConfigModal}
          onHide={this.handleConfigModalClose}
        >
          <Modal.Header closeButton>
            <Modal.Title>Data Collector Configuration</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto' }}>
            <Form>
              <ControlLabel>Device Name</ControlLabel>
              <input className="form-control" type="text" readOnly defaultValue={`${selectedDevice.name}`} />
              <br />
              <Panel>
                <Panel.Heading>
                  <Panel.Title>
                    Data Collector Method & Parameters
                  </Panel.Title>
                </Panel.Heading>
                <ControlLabel>Data Collector Method</ControlLabel>
                <Select
                  value={selectedCollectMethod}
                  onChange={this.handleCollectMethodChange}
                  options={collectMethod}
                  placeholder="Select collection method"
                  autoFocus
                  required
                />
                <div>
                  <ControlLabel>Dir</ControlLabel>
                  <input
                    ref={(ref) => { this.refDir = ref; }}
                    className="form-control is-invalid"
                    type="text"
                    id="inputDir"
                    placeholder="e.g. /home/sftp/eln"
                    required
                    defaultValue={`${(selectedDevice.data.method_params ? selectedDevice.data.method_params.dir : '')}`}
                  />
                </div>
                <div>
                  <ControlLabel>Host</ControlLabel>
                  <input
                    ref={(ref) => { this.refHost = ref; }}
                    className="form-control is-invalid"
                    type="text"
                    id="inputHost"
                    placeholder="e.g. sftp.kit.edu"
                    required
                    readOnly={disableForLocal}
                    defaultValue={`${selectedDevice.data.method_params && selectedDevice.data.method_params.host ? selectedDevice.data.method_params.host : ''}`}
                  />
                </div>
                <div>
                  <ControlLabel>User</ControlLabel>
                  <input
                    ref={(ref) => { this.refUser = ref; }}
                    className="form-control is-invalid"
                    type="text"
                    id="inputUser"
                    placeholder="e.g. user001"
                    required
                    readOnly={disableForLocal}
                    defaultValue={`${selectedDevice.data.method_params && selectedDevice.data.method_params.user ? selectedDevice.data.method_params.user : ''}`}
                  />
                </div>
                <div>
                  <ControlLabel>Number of Files</ControlLabel>
                  <input
                    ref={(ref) => { this.refNumberOfFiles = ref; }}
                    className="form-control is-invalid"
                    type="number"
                    id="inputNumber"
                    min="1"
                    readOnly={disableForFile}
                    defaultValue={defaultNumber}
                  />
                </div>
                <div><br />
                </div>
                <div>
                  <Button
                    bsStyle="primary"
                    onClick={() => this.saveData()}
                  >
                  Save
                  </Button>
                </div>
              </Panel>
            </Form>
          </Modal.Body>
        </Modal>
      );
    }
    return (
      <div />
    );
  }

  render() {
    const { devices } = this.state;

    const tcolumn = (
      <tr style={{ height: '26px', verticalAlign: 'middle' }}>
        <th width="1%">#</th>
        <th width="2%" />
        <th width="15%">Name</th>
        <th width="15%">Method</th>
        <th width="25%">Dir</th>
        <th width="20%">Host</th>
        <th width="15%">User</th>
        <th width="5%">Num. of Files</th>
        <th width="2%">ID</th>
      </tr>
    );

    const tbody = devices.map((device, idx) => (
      <tr key={`row_${device.id}`} style={{ height: '26px', verticalAlign: 'middle' }}>
        <td>
          {idx + 1}
        </td>
        <td>
          <Button
            bsSize="xsmall"
            bsStyle="primary"
            onClick={() => this.handleConfigModalShow(device.id, true)}
          >
            <i className="fa fa-pencil" />
          </Button>
        </td>
        <td> {device.name} </td>
        <td> {(device.data && device.data.method ? device.data.method : '')} </td>
        <td> {(device.data && device.data.method_params ? device.data.method_params.dir : '')} </td>
        <td> {(device.data && device.data.method_params ? device.data.method_params.host : '')} </td>
        <td> {(device.data && device.data.method_params ? device.data.method_params.user : '')} </td>
        <td> {(device.data && device.data.method_params && device.data.method_params.number_of_files ?
          device.data.method_params.number_of_files : 0)}
        </td>
        <td> {device.id} </td>
      </tr>
    ));

    return (
      <div>
        <Panel>
          <Panel.Heading>
            <Panel.Title>
              Data Collector
            </Panel.Title>
          </Panel.Heading>
          <Table>
            <thead>
              { tcolumn }
            </thead>
            <tbody>
              { tbody }
            </tbody>
          </Table>
        </Panel>
        { this.renderConfiModal() }
      </div>
    );
  }
}
