/* eslint-disable react/no-multi-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Button, Table, Modal, Tooltip, OverlayTrigger, Row, Col } from 'react-bootstrap';
import uuid from 'uuid';
import Clipboard from 'clipboard';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import AdminDeviceFetcher from 'src/fetchers/AdminDeviceFetcher';
import NovncConfigContainer from 'src/apps/admin/NovncConfigContainer';

const tipEditConfig = <Tooltip id="edit_tooltip">edit config</Tooltip>;
const tipRemoveConfig = <Tooltip id="remove_tooltip">remove config</Tooltip>;
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

class ModelConfig extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedToken: props.device.novnc_token || '',
      selectedTarget: props.device.novnc_target || '',
      selectedPassword: props.device.novnc_password || '',
      inputToken: props.device.novnc_token || '',
      inputTarget: props.device.novnc_target || ''
    };
    this.handleSave = this.handleSave.bind(this);
    this.updateTarget = this.updateTarget.bind(this);
    this.updateToken = this.updateToken.bind(this);
  }

  handleSave(device) {
    const {
      selectedToken, selectedTarget, selectedPassword, inputTarget
    } = this.state;
    const missingTarget = !inputTarget;

    const params = {
      id: device.id,
      novnc_token: selectedToken,
      novnc_target: selectedTarget,
      novnc_password: selectedPassword,
      datacollector_fields: false,
    };

    params.novnc_token = this.refToken.value;
    params.novnc_target = this.refTarget.value;
    params.novnc_password = this.refPassword.value;

    if (missingTarget) {
      NotificationError({ device, msg: 'Please type a Target for the device!' });
      return false;
    }

    AdminFetcher.editNovncSettings(params)
      .then(() => {
        this.props.onClose();
        return true;
      });
    return true;
  }

  updateTarget(e) {
    this.setState({
      inputTarget: e.target.value,
    });
  }

  updateToken(e) {
    this.setState({
      inputToken: e.target.value,
    });
  }

  render() {
    const rowStyle = { padding: '8px', display: 'flex' };
    const colStyle = { textAlign: 'right', marginTop: 'auto', marginBottom: 'auto' };
    const storedTarget = this.props.device.novnc_target;
    const storedToken = this.props.device.novnc_token;
    const storedPassword = this.props.device.novnc_password;
    const { inputTarget, inputToken } = this.state;
    const missingTarget = !inputTarget;

    const RenderStoredTarget = () => {
      if (storedTarget && storedToken) { return `${storedTarget}?token=${storedToken}`; }
      if (storedTarget && storedToken === '') { return storedTarget; }
      return ' None';
    };

    const RenderCurrentTarget = () => {
      if (inputTarget && inputToken) {
        return `${inputTarget}?token=${inputToken}`;
      }
      if (inputTarget && !inputToken) {
        return inputTarget;
      }
      return 'You haven\'t edited the target so far';
    };

    return (
      <Modal
        bsSize="large"
        show={this.props.isShow}
        onHide={this.props.onClose}
      >
        <Modal.Header closeButton>
          <Modal.Title> <b>NoVNC Settings for <u>{this.props.device.name}</u></b></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row style={rowStyle}>
            <Col sm={2} md={2} lg={2} style={colStyle}>
              <b>Target</b>
            </Col>
            <Col sm={6} md={6} lg={6}>
              <input
                ref={(ref) => { this.refTarget = ref; }}
                className="form-control is-invalid"
                type="text"
                id="inputTarget"
                placeholder="e.g. ws://localhost:8092/websockify"
                required
                onChange={e => this.updateTarget(e)}
                defaultValue={storedTarget || ''}
              />

            </Col>

            <Col sm={2} md={2} lg={2} style={colStyle}>
              <b>Websockify Token</b>
            </Col>
            <Col sm={6} md={6} lg={6}>
              <input
                ref={(ref) => { this.refToken = ref; }}
                className="form-control is-invalid"
                type="text"
                id="inputToken"
                placeholder="e.g. 000001"
                required
                onChange={e => this.updateToken(e)}
                disabled={missingTarget}
                defaultValue={storedToken || ''}
              />

            </Col>
          </Row>
          <Row style={rowStyle}>
            <Col style={colStyle}>
              <span className="fa fa-info-circle" aria-hidden="true">&nbsp;
                <b>Current Target   </b>
                <RenderStoredTarget />
              </span>
            </Col>
          </Row>
          <Row style={rowStyle}>
            <Col style={colStyle}>
              <span className="fa fa-info-circle" aria-hidden="true">&nbsp;
                <b>Edited Target   </b>
                <RenderCurrentTarget />
              </span>
            </Col>
          </Row>
          <hr />
          <Row style={rowStyle}>
            <h4>RFB Credentials</h4>
          </Row>
          <Row style={rowStyle}>
            <Col sm={2} md={2} lg={2} style={colStyle}>
              <b>Password</b>
            </Col>
            <Col sm={10} md={10} lg={10}>
              <input
                ref={(ref) => { this.refPassword = ref; }}
                className="form-control is-invalid"
                type="text"
                id="inputPassword"
                placeholder="Password"
                required
                defaultValue={storedPassword || ''}
              />
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
    novnc_target: PropTypes.string,
    novnc_token: PropTypes.string,
    novnc_password: PropTypes.string,
  }).isRequired,
  isShow: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default class NovncSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      devices: [],
      selectedDevice: null,
      showConfigModal: false,
    };
    this.clipboard = new Clipboard('.clipboardBtn');
    this.handleDeviceListFetch = this.handleDeviceListFetch.bind(this);
    this.handleConfigModalShow = this.handleConfigModalShow.bind(this);
    this.handleConfigModalClose = this.handleConfigModalClose.bind(this);
  }

  componentDidMount() {
    this.handleDeviceListFetch();
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  handleConfigModalShow(device) {
    AdminDeviceFetcher.fetchDeviceById(device.id)
      .then((result) => {
        const selectedDevice = result.device;
        this.setState({
          selectedDevice: selectedDevice,
          showConfigModal: true
        });
      });
  }

  handleConfigModalClose() {
    AdminDeviceFetcher.fetchDevices()
      .then((result) => {
        this.setState({
          devices: result.devices,
          showConfigModal: false,
        });
      });
  }

  handleDeviceListFetch() {
    AdminDeviceFetcher.fetchDevices()
      .then((result) => {
        this.setState({
          devices: result.devices,
        });
      });
  }

  handleRemoveConfig(id) {
    const { devices } = this.state;
    const params = {
      id,
      novnc_token: '',
      novnc_target: '',
      novnc_password: '',
    };
    AdminFetcher.editNovncSettings(params)
      .then(() => {
        devices.map((dev) => {
          if (dev.id === id) {
            dev.novnc_token = '';
            dev.novnc_target = '';
            dev.novnc_password = '';
          }
        });
        this.setState({ devices });
      });
  }

  renderConfiModal() {
    return this.state.showConfigModal ?
      <ModelConfig
        device={this.state.selectedDevice}
        isShow={this.state.showConfigModal}
        onClose={this.handleConfigModalClose}
      /> : null;
  }

  render() {
    const { devices } = this.state;

    const renderTarget = (device) => {
      if (device.novnc_target && device.novnc_token) {
        return `${device.novnc_target}?token=${device.novnc_token}`;
      } else if (device.novnc_target && !device.novnc_token) {
        return device.novnc_target;
      }
      return 'Blank target';
    };

    const tcolumn = (
      <tr style={{ height: '26px', verticalAlign: 'middle' }}>
        <th width="2%" colSpan="2">#</th>
        <th width="5%">ID</th>
        <th width="20%">Name</th>
        <th width="40%">Target</th>
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
          &nbsp;&nbsp;&nbsp;&nbsp;
          <OverlayTrigger placement="left" overlay={tipRemoveConfig} >
            <NovncConfigContainer
              device={device}
              handleRemoveConfig={() => this.handleRemoveConfig(device.id)}
            />
          </OverlayTrigger>
        </td>
        <td> {device.id} </td>
        <td> {device.name} </td>
        <td>
          {renderTarget(device)}
        </td>
      </tr>
    ));

    return (
      <div>
        <Panel>
          <Panel.Heading>
            <Panel.Title>
              NoVNC Settings
            </Panel.Title>
          </Panel.Heading>
          <Table responsive hover bordered>
            <thead>
              {tcolumn}
            </thead>
            <tbody>
              {tbody}
            </tbody>
          </Table>
        </Panel>
        {this.renderConfiModal()}
      </div>
    );
  }
}
