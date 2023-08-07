/* eslint-disable react/no-multi-comp */
/* eslint-disable max-classes-per-file */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Panel, Button, Table, Modal, Tooltip, OverlayTrigger, Form, FormGroup, ControlLabel, Col
} from 'react-bootstrap';
import uuid from 'uuid';
import Clipboard from 'clipboard';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import NovncConfigContainer from 'src/apps/admin/NovncConfigContainer';

import styles from 'Styles';

const tipEditConfig = <Tooltip id="edit_tooltip">Edit config</Tooltip>;
const Notification = (props) => (
  NotificationActions.add({
    title: `Device [${props.device.name}]`,
    message: props.msg,
    level: props.lvl,
    position: 'tc',
    dismissible: 'button',
    uid: uuid.v4()
  })
);
const NotificationError = (props) => Notification({ ...props, lvl: 'error' });

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
        show={this.props.isShow}
        onHide={this.props.onClose}
      >
        <Modal.Header closeButton>
          <Modal.Title style={styles.modalTitle}>
            NoVNC Settings:&nbsp;
            {this.props.device.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form horizontal>
            <FormGroup style={{ marginRight: '5px' }} controlId="formInlineTarget">
              <Col componentClass={ControlLabel} sm={3}>
                Target:
              </Col>
              <Col sm={9}>
                <input
                  ref={(ref) => { this.refTarget = ref; }}
                  className="form-control is-invalid"
                  type="text"
                  id="inputTarget"
                  placeholder="e.g. ws://localhost:8092/websockify"
                  required
                  onChange={(e) => this.updateTarget(e)}
                  defaultValue={storedTarget || ''}
                />
              </Col>
            </FormGroup>
            <FormGroup
              style={{ marginRight: '5px', display: 'flex', alignItems: 'center' }}
              controlId="formInlineToken"
            >
              <Col componentClass={ControlLabel} sm={3}>
                Websockify Token:
              </Col>
              <Col sm={9}>
                <input
                  ref={(ref) => { this.refToken = ref; }}
                  className="form-control is-invalid"
                  type="text"
                  id="inputToken"
                  placeholder="e.g. 000001"
                  required
                  onChange={(e) => this.updateToken(e)}
                  disabled={missingTarget}
                  defaultValue={storedToken || ''}
                />
              </Col>
            </FormGroup>
            <FormGroup style={{ marginTop: '20px', marginLeft: '40px' }}>
              <span className="fa fa-info-circle" aria-hidden="true">
              &nbsp;
                <b>Current Target   </b>
                <RenderStoredTarget />
              </span>
            </FormGroup>
            <FormGroup style={{ marginTop: '-10px', marginLeft: '40px' }}>
              <span className="fa fa-info-circle" aria-hidden="true">
              &nbsp;
                <b>Edited Target   </b>
                <RenderCurrentTarget />
              </span>
            </FormGroup>
            <FormGroup />
            <p className="text-left" style={{ fontWeight: 'bold', marginLeft: '10px', fontSize: '18px' }}>
              RFB Credentials
            </p>
            <FormGroup style={{ marginRight: '5px' }} controlId="formInlinePassword">
              <Col componentClass={ControlLabel} sm={3}>
                Password:
              </Col>
              <Col sm={9}>
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
            </FormGroup>
            <FormGroup style={{ marginRight: '5px' }}>
              <Col sm={12} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button bsStyle="warning" style={styles.modalBtn} onClick={() => this.handleSave(this.props.device)}>
                  Save&nbsp;&nbsp;
                  <i className="fa fa-floppy-o" style={{ fontSize: '18px' }} />
                </Button>
          &nbsp;
              </Col>
            </FormGroup>
          </Form>
        </Modal.Body>
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
    return this.state.showConfigModal
      ? (
        <ModelConfig
          device={this.state.selectedDevice}
          isShow={this.state.showConfigModal}
          onClose={this.handleConfigModalClose}
        />
      ) : null;
  }

  render() {
    const { devices } = this.state;

    const renderTarget = (device) => {
      if (device.data && device.data.novnc && device.data.novnc.token) {
        return `${device.data.novnc.target}?token=${device.data.novnc.token}`;
      } if (device.data && device.data.novnc && !device.data.novnc.token) {
        return device.data.novnc.target;
      }
      return 'Blank target';
    };

    const tcolumn = (
      <tr style={{ height: '26px', verticalAlign: 'middle' }}>
        <th width="3%">#</th>
        <th width="7%">Actions</th>
        <th width="15%">Name</th>
        <th width="15%">ID</th>
        <th width="40%">Target</th>
      </tr>
    );

    const tbody = devices.map((device, idx) => (
      <tr
        key={`row_${device.id}`}
        style={{
          height: '25px',
          verticalAlign: 'middle',
          backgroundColor: idx % 2 === 0 ? '#F0F2F5' : '#F4F6F9',
        }}
      >
        <td style={{ verticalAlign: 'middle' }}>{idx + 1}</td>
        <td style={{ verticalAlign: 'middle' }}>
          <div style={{
            display: 'flex', alignItems: 'center'
          }}
          >
            <OverlayTrigger placement="top" overlay={tipEditConfig}>
              <Button
                bsSize="xsmall"
                bsStyle="primary"
                onClick={() => this.handleConfigModalShow(device)}
                style={{ ...styles.panelIcons, marginRight: '15px' }}
              >
                <i className="fa fa-pencil" aria-hidden="true" style={{ fontSize: '16px' }} />
              </Button>
            </OverlayTrigger>
            <NovncConfigContainer
              device={device}
              handleRemoveConfig={() => this.handleRemoveConfig(device.id)}
            />
          </div>
        </td>
        <td style={{ verticalAlign: 'middle' }}>{device.name}</td>
        <td style={{ verticalAlign: 'middle' }}>{device.id}</td>
        <td style={{ verticalAlign: 'middle' }}>{renderTarget(device)}</td>
      </tr>
    ));

    return (
      <div>
        <Panel style={styles.panelGrp}>
          <Panel.Title style={{
            ...styles.modalTitle, marginTop: '20px', marginLeft: '20px', marginBottom: '20px', verticalAlign: 'center'
          }}
          >
            NoVNC Settings
          </Panel.Title>
          <Table>
            <thead>{tcolumn}</thead>
            <tbody>{tbody}</tbody>
          </Table>
        </Panel>
        {this.renderConfiModal()}
      </div>
    );
  }
}
