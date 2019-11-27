/* eslint-disable react/no-multi-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Button, Table, Modal, Tooltip, OverlayTrigger, Row, Col } from 'react-bootstrap';
import uuid from 'uuid';
import Clipboard from 'clipboard';
import NotificationActions from '../components/actions/NotificationActions';
import AdminFetcher from '../components/fetchers/AdminFetcher';
import NovncConfigContainer from '../admin/NovncConfigContainer';

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
      selectedToken: props.device.data.novnc.token || '',
      selectedTarget: props.device.data.novnc.target || '',
      selectedPassword: props.device.data.novnc.password || '',
      inputToken: props.device.data.novnc.token || '',
      inputTarget: props.device.data.novnc.target || ''
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
      data: {
        novnc: {
          token: selectedToken,
          target: selectedTarget,
          password: selectedPassword
        }
      },
    };

    params.data.novnc.token = this.refToken.value;
    params.data.novnc.target = this.refTarget.value;
    params.data.novnc.password = this.refPassword.value;

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
    const storedTarget = this.props.device.data.novnc.target;
    const storedToken = this.props.device.data.novnc.token;
    const storedPassword = this.props.device.data.novnc.password;
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
    data: PropTypes.shape({
      novnc: PropTypes.shape({
        target: PropTypes.string,
        token: PropTypes.string,
        password: PropTypes.string
      })
    })
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
    AdminFetcher.fetchDeviceById(device.id)
      .then((result) => {
        const selectedDevice = result.device;
        const emptyData = { novnc: { token: '', target: '', password: '' } };
        if (!selectedDevice.data.novnc) {
          selectedDevice.data = emptyData;
        }
        this.setState({
          selectedDevice,
          showConfigModal: true
        });
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
    const params = {
      id,
      data: {
        novnc: {
          token: '',
          target: '',
          password: ''
        }
      },
    };
    AdminFetcher.editNovncSettings(params)
      .then(() => {
        devices.map((dev) => {
          if (dev.id === id) { dev.data = {}; }
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
      if (device.data && device.data.novnc && device.data.novnc.token) {
        return `${device.data.novnc.target}?token=${device.data.novnc.token}`;
      } else if (device.data && device.data.novnc && !device.data.novnc.token) {
        return device.data.novnc.target;
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
