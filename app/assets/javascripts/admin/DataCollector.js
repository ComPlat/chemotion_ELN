/* eslint-disable react/no-multi-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Button, Table, Modal, Tooltip, OverlayTrigger, FormControl, InputGroup, FormGroup, DropdownButton, MenuItem, Row, Col } from 'react-bootstrap';
import { startsWith, endsWith } from 'lodash';
import uuid from 'uuid';
import Clipboard from 'clipboard';
import NotificationActions from '../components/actions/NotificationActions';
import AdminFetcher from '../components/fetchers/AdminFetcher';

const tipCopyClipboard = <Tooltip id="copy_tooltip">copy to clipboard</Tooltip>;
const tipEditConfig = <Tooltip id="edit_tooltip">edit config</Tooltip>;
const tipRemoveConfig = <Tooltip id="remove_tooltip">remove config</Tooltip>;
const tipTestConnect = <Tooltip id="test_tooltip">test connection</Tooltip>;
const optionsMethod = ['filewatchersftp', 'filewatcherlocal', 'folderwatchersftp', 'folderwatcherlocal'];
const optionsAuth = ['password', 'keyfile'];
const Notification = props =>
  (
    NotificationActions.add({
      title: `Device [${props.device.name}]`,
      message: props.msg,
      level: props.lvl,
      position: 'tc',
      dismissible: 'button',
      uid: uuid.v4()
    })
  );
const NotificationError = props => Notification({ ...props, lvl: 'error' });
const NotificationWarn = props => Notification({ ...props, lvl: 'warning' });
const ListLocalCollector = props =>
  (
    <div style={{ margin: '5px', padding: '5px', border: 'thin dashed darkred' }}>
      <h6 style={{ margin: 'unset' }}><b>Local Collector Dir Configurtaion</b></h6>
      {
        props.localCollector.map((c, i) => (
          <div key={uuid.v4()}>
            <FormGroup bsSize="small" style={{ marginBottom: 'unset' }}>
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
                  style={{ backgroundColor: 'unset', border: 'unset', boxShadow: 'none' }}
                />
              </InputGroup>
            </FormGroup>
          </div>
        ))
      }
    </div>
  );

ListLocalCollector.propTypes = {
  localCollector: PropTypes.arrayOf(PropTypes.object).isRequired
};

const DropdownSelection = props =>
  (
    <DropdownButton
      title={props.selected || props.placeholder}
      key={props.selected}
      id={`dropdown-${uuid.v4()}`}
      onSelect={props.onSelect}
    >
      {
        props.options.map(element => (
          <MenuItem key={element} eventKey={element} disabled={props.disabled}>
            {element}
          </MenuItem>
        ))
        }
    </DropdownButton>
  );

DropdownSelection.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  placeholder: PropTypes.string.isRequired,
  selected: PropTypes.string,
  onSelect: PropTypes.func,
  disabled: PropTypes.bool
};

DropdownSelection.defaultProps = {
  selected: null,
  onSelect: null,
  disabled: false
};

class ModelConfig extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedMethod: props.device.data.method || null,
      selectedAuth: (props.device.data.method_params && props.device.data.method_params.authen)
      || 'password',
    };
    this.handleSave = this.handleSave.bind(this);
    this.handleSelectMethod = this.handleSelectMethod.bind(this);
    this.handleSelectAuth = this.handleSelectAuth.bind(this);
  }

  handleSave(device) {
    const { selectedMethod, selectedAuth } = this.state;

    if (!selectedMethod) {
      NotificationError({ device, msg: 'Please select Data Collector Method!' });
      return false;
    }
    if (endsWith(selectedMethod, 'sftp')) {
      if (!this.refUser || this.refUser.value.trim() === '') {
        NotificationError({ device, msg: 'Please input User!' });
        return false;
      }
      if (!this.refHost || this.refHost.value.trim() === '') {
        NotificationError({ device, msg: 'Please input Host!' });
        return false;
      }
      if (selectedAuth === 'keyfile' && (!this.refKey || this.refKey.value.trim() === '')) {
        NotificationError({ device, msg: 'Use key file, Please input Key path!' });
        return false;
      }
    }
    if (!this.refDictionary || this.refDictionary.value.trim() === '') {
      NotificationError({ device, msg: 'Please input Dir!' });
      return false;
    }
    NotificationWarn({ device, msg: 'Warning: Unprocessable files will be deleted from the target directory!' });
    const params = {
      id: device.id,
      data: {
        method: selectedMethod,
        method_params: {
          authen: selectedAuth,
          dir: this.refDictionary.value.trim(),
        }
      }
    };
    if (endsWith(selectedMethod, 'sftp')) {
      params.data.method_params.host = this.refHost.value.trim();
      params.data.method_params.user = this.refUser.value.trim();
      if (selectedAuth === 'keyfile') {
        params.data.method_params.key_path = this.refKey.value.trim();
      }
    }
    if (startsWith(selectedMethod, 'folder')) {
      params.data.method_params.number_of_files = Math.trunc(this.refNumFiles.value);
    }
    AdminFetcher.updateDeviceMethod(params)
      .then((result) => {
        if (result.error) {
          NotificationError({ device, msg: result.error });
          return false;
        }
        this.props.onClose();
        return true;
      });
    return true;
  }

  handleSelectMethod(e) {
    this.setState({ selectedMethod: e });
  }

  handleSelectAuth(e) {
    this.setState({ selectedAuth: e });
  }

  render() {
    const { selectedMethod, selectedAuth } = this.state;
    const rowStyle = { padding: '8px', display: 'flex' };
    const colStyle = { textAlign: 'right', marginTop: 'auto', marginBottom: 'auto' };

    return (
      <Modal
        bsSize="large"
        show={this.props.isShow}
        onHide={this.props.onClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>Data Collector Configuration - Device: {this.props.device.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row style={rowStyle}>
            <Col sm={2} md={2} lg={2} style={colStyle}>
              <b>Watch method</b>
            </Col>
            <Col sm={2} md={2} lg={2}>
              <DropdownSelection
                options={optionsMethod}
                selected={selectedMethod}
                placeholder="Select method"
                onSelect={this.handleSelectMethod}
              />
            </Col>
            <Col sm={2} md={2} lg={2} style={colStyle}>
              <b>User</b>
            </Col>
            <Col sm={6} md={6} lg={6}>
              <input
                ref={(ref) => { this.refUser = ref; }}
                className="form-control is-invalid"
                type="text"
                id="inputUser"
                placeholder="e.g. User"
                required
                readOnly={endsWith(selectedMethod, 'local')}
                defaultValue={`${this.props.device.data.method_params && this.props.device.data.method_params.user ? this.props.device.data.method_params.user : ''}`}
              />
            </Col>
          </Row>
          <Row style={rowStyle}>
            <Col sm={2} md={2} lg={2} style={colStyle}>
              <b>Host</b>
            </Col>
            <Col sm={10} md={10} lg={10}>
              <input
                ref={(ref) => { this.refHost = ref; }}
                className="form-control is-invalid"
                type="text"
                id="inputHost"
                placeholder="e.g. google.com"
                required
                readOnly={endsWith(selectedMethod, 'local')}
                defaultValue={`${(this.props.device.data.method_params && this.props.device.data.method_params.host ? this.props.device.data.method_params.host : '')}`}
              />
            </Col>
          </Row>
          <Row style={rowStyle}>
            <Col sm={2} md={2} lg={2} style={colStyle}>
              <b>SFTP auth. with</b>
            </Col>
            <Col sm={2} md={2} lg={2}>
              <DropdownSelection
                options={optionsAuth}
                selected={selectedAuth || 'password'}
                placeholder="Select authentication"
                onSelect={this.handleSelectAuth}
                disabled={endsWith(selectedMethod, 'local')}
              />
            </Col>
            <Col sm={2} md={2} lg={2} style={colStyle}>
              <b>Key file</b>
            </Col>
            <Col sm={6} md={6} lg={6} style={{ display: 'flex' }}>
              <input
                ref={(ref) => { this.refKey = ref; }}
                className="form-control is-invalid"
                type="text"
                id="inputKey"
                placeholder="e.g. /home/user/.ssh/rsa/eln-privatekey.pem"
                required
                readOnly={endsWith(selectedMethod, 'local') || (selectedAuth === 'password')}
                defaultValue={`${(this.props.device.data.method_params && this.props.device.data.method_params.key_path ? this.props.device.data.method_params.key_path : '')}`}
              />
            </Col>
          </Row>
          <Row style={rowStyle}>
            <Col sm={2} md={2} lg={2} style={colStyle}>
              <b>Watch dictionary</b>
            </Col>
            <Col sm={10} md={10} lg={10}>
              <input
                ref={(ref) => { this.refDictionary = ref; }}
                className="form-control is-invalid"
                type="text"
                id="inputDictionary"
                placeholder="e.g. /home/sftp/eln"
                required
                defaultValue={`${(this.props.device.data.method_params ? this.props.device.data.method_params.dir : '')}`}
              />
              {
                endsWith(selectedMethod, 'local') ? <ListLocalCollector localCollector={this.props.localCollector} /> : null
              }
            </Col>
          </Row>
          <Row style={rowStyle}>
            <Col sm={2} md={2} lg={2} style={colStyle}>
              <b>Number of files</b>
            </Col>
            <Col sm={10} md={10} lg={10}>
              <input
                ref={(ref) => { this.refNumFiles = ref; }}
                className="form-control is-invalid"
                type="number"
                id="inputNumFiles"
                min="0"
                placeholder="e.g. 10"
                required
                readOnly={startsWith(selectedMethod, 'file')}
                defaultValue={`${(this.props.device.data.method_params ? this.props.device.data.method_params.number_of_files : 1)}`}
              />&nbsp;<span className="fa fa-info-circle" aria-hidden="true">&nbsp;Folderwatcher: set to 0 for a varying number of files</span>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer style={{ textAlign: 'left' }}>
          <Button bsStyle="primary" onClick={() => this.props.onClose()}>Close</Button>
          <Button bsStyle="warning" onClick={() => this.handleSave(this.props.device)}>Save</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

ModelConfig.propTypes = {
  device: PropTypes.shape({
    name: PropTypes.string,
    data: PropTypes.shape({
      method: PropTypes.string,
      method_params: PropTypes.shape({
        dir: PropTypes.string,
        host: PropTypes.string,
        user: PropTypes.string,
        authen: PropTypes.string,
        key_path: PropTypes.string,
        number_of_files: PropTypes.number
      })
    })
  }).isRequired,
  localCollector: PropTypes.arrayOf(PropTypes.object).isRequired,
  isShow: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

class BtnConnect extends Component {
  constructor(props) {
    super(props);
    this.state = { lock: false };
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(device) {
    this.setState({ lock: true });
    const params = {
      method: device.data.method,
      dir: device.data.method_params.dir,
      host: device.data.method_params.host,
      user: device.data.method_params.user,
      authen: device.data.method_params.authen || 'password',
      key_path: device.data.method_params.key_path,
    };
    AdminFetcher.testSFTP(params)
      .then((result) => {
        Notification({ device, msg: result.msg || result.error, lvl: result.lvl || 'error' });
        this.setState({ lock: false });
      });
  }

  render() {
    const { lock } = this.state;
    return (
      <OverlayTrigger placement="bottom" overlay={this.props.btnTip} >
        <Button
          bsSize="xsmall"
          // bsStyle="info"
          onClick={() => this.handleClick(this.props.device)}
        >
          {
            lock ? <i className="fa fa-spin fa-spinner" aria-hidden="true" /> : <i className="fa fa-plug" aria-hidden="true" />
          }
        </Button>
      </OverlayTrigger>
    );
  }
}

BtnConnect.propTypes = {
  device: PropTypes.shape({
    data: PropTypes.shape({
      method: PropTypes.string,
      method_params: PropTypes.shape({
        dir: PropTypes.string,
        host: PropTypes.string,
        user: PropTypes.string,
      })
    })
  }).isRequired,
  btnTip: PropTypes.element.isRequired
};

export default class DataCollector extends Component {
  constructor(props) {
    super(props);
    this.state = {
      devices: [],
      selectedDevice: null,
      localCollector: [],
      showConfigModal: false,
    };
    this.clipboard = new Clipboard('.clipboardBtn');
    this.handleDeviceListFetch = this.handleDeviceListFetch.bind(this);
    this.handleLocalCollectorFetch = this.handleLocalCollectorFetch.bind(this);
    this.handleConfigModalShow = this.handleConfigModalShow.bind(this);
    this.handleConfigModalClose = this.handleConfigModalClose.bind(this);
  }

  componentDidMount() {
    this.handleDeviceListFetch();
    this.handleLocalCollectorFetch();
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  handleLocalCollectorFetch() {
    AdminFetcher.fetchLocalCollector()
      .then((result) => {
        this.setState({
          localCollector: result.listLocalCollector,
        });
      });
  }

  handleConfigModalShow(device) {
    AdminFetcher.fetchDeviceById(device.id)
      .then((result) => {
        if (result.device) {
          const selectedDevice = result.device;
          this.setState({
            selectedDevice,
            showConfigModal: true
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

  handleDeviceListFetch() {
    AdminFetcher.fetchDevices()
      .then((result) => {
        this.setState({
          devices: result.devices,
        });
      });
  }

  handleRemoveConfig(id) {
    const { devices } = this.state;
    AdminFetcher.removeDeviceMethod({ id })
      .then((result) => {
        devices.splice(devices.findIndex(o => o.id === result.device.id), 1, result.device);
        this.setState({ devices });
      });
  }

  renderConfiModal() {
    return this.state.showConfigModal ?
      <ModelConfig
        device={this.state.selectedDevice}
        localCollector={this.state.localCollector}
        isShow={this.state.showConfigModal}
        onClose={this.handleConfigModalClose}
      /> : null;
  }

  render() {
    const { devices } = this.state;

    const tcolumn = (
      <tr style={{ height: '26px', verticalAlign: 'middle' }}>
        <th width="5%" colSpan="2">#</th>
        <th width="15%">Name</th>
        <th width="10%">Watch Method</th>
        <th width="10%">User</th>
        <th width="15%">Host</th>
        <th width="5%">SFTP Authentication</th>
        <th width="10%">Key file Path</th>
        <th width="25%">Watch Dictionary</th>
        <th width="3%">Num. of Files</th>
        <th width="2%">ID</th>
      </tr>
    );

    const tbody = devices.map((device, idx) => (
      <tr key={`row_${device.id}`} style={{ height: '26px', verticalAlign: 'middle' }}>
        <td>
          {idx + 1}
        </td>
        <td>
          <OverlayTrigger placement="bottom" overlay={tipEditConfig} >
            <Button
              bsSize="xsmall"
              bsStyle="primary"
              onClick={() => this.handleConfigModalShow(device)}
            >
              <i className="fa fa-pencil" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={tipRemoveConfig} >
            <Button
              bsSize="xsmall"
              bsStyle="danger"
              onClick={() => this.handleRemoveConfig(device.id)}
            >
              <i className="fa fa-eraser" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
        </td>
        <td> {device.name} </td>
        <td>
          {(device.data && device.data.method ? device.data.method : '')}
          &nbsp;
          {
            endsWith(device.data.method, 'sftp') ? <BtnConnect device={device} btnTip={tipTestConnect} /> : null
          }
        </td>
        <td> {(device.data && device.data.method_params ? device.data.method_params.user : '')} </td>
        <td> {(device.data && device.data.method_params ? device.data.method_params.host : '')} </td>
        <td>
          {(device.data && device.data.method_params && device.data.method_params.authen ? device.data.method_params.authen : 'password')}
        </td>
        <td> {(device.data && device.data.method_params && device.data.method_params.key_path ? device.data.method_params.key_path : '')} </td>
        <td> {(device.data && device.data.method_params ? device.data.method_params.dir : '')} </td>
        <td>
          {(device.data && device.data.method_params && device.data.method_params.number_of_files ?
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
          <Table responsive hover bordered>
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
