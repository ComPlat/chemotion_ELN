import React, { useEffect, useContext } from 'react';
import { Panel, Table, Button, Tooltip, OverlayTrigger, Popover, Alert } from 'react-bootstrap';
import DeviceModal from './DeviceModal';
import { endsWith } from 'lodash';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DevicesList = () => {
  const devicesStore = useContext(StoreContext).devices;
  const deviceMetadataStore = useContext(StoreContext).deviceMetadata;

  useEffect(() => {
    devicesStore.load();
  }, []);

  const showCreateDeviceModal = () => {
    devicesStore.setCreateOrUpdate('create');
    devicesStore.showDeviceModal();
    devicesStore.changeErrorMessage('');
    devicesStore.changeSuccessMessage('');
  }

  const showEditDeviceModal = (device) => {
    devicesStore.setCreateOrUpdate('update');
    devicesStore.setDevice(device);
    deviceMetadataStore.load(device.id);
    devicesStore.showDeviceModal();
    devicesStore.changeErrorMessage('');
    devicesStore.changeSuccessMessage('');
  }

  const toggleDeviceUsersAndGroups = (deviceId) => {
    document.getElementById(`row-device-${deviceId}`).classList.toggle('in');
  }

  const showBasicConfig = (device) => {
    let datacollectorText = '';
    let novncText = '';

    if (device.datacollector_method) {
      datacollectorText = device.datacollector_method;
    }

    if (device.novnc_target) {
      const token = device.novnc_token ? `?token=${device.novnc_token}` : '';
      novncText = `${device.novnc_target}${token}`;
    }

    return (
      <>
        <b className="devices-button-group-clear">Data Collector:</b>
        {datacollectorText}
        <br />
        <b className="devices-button-group-clear">Novnc:</b>
        {novncText}
      </>
    );
  }

  const listUsersAndGroups = (device, idx) => {
    return (
      <Table key={`users-table-${idx}`} className="device-users-table">
        <tbody>
          {device.users.map((user, i) => (
            <tr key={`row_${device.id}-${user.id}`}>
              <td width="5%">{i + 1}</td>
              <td width="30%">{user.name}</td>
              <td width="10%">{user.initials}</td>
              <td width="35%">{user.type}</td>
              <td width="20%">{deleteButton(device, user.type.toLowerCase(), user)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  }

  const testSFTP = (device) => {
    devicesStore.setDeviceTestingId(device.id);
    devicesStore.testSFTP(device);
  }

  const testSFTPButton = (device) => {
    if (!endsWith(device.datacollector_method, 'sftp')) { return null; }

    const tipTestConnect = <Tooltip id="test_tooltip">test data collector connection</Tooltip>;
    return (
      <OverlayTrigger placement="top" overlay={tipTestConnect}>
        <Button bsSize="xsmall" onClick={() => testSFTP(device)}>
          {
            devicesStore.device_testing_id == device.id ? <i className="fa fa-spin fa-spinner" aria-hidden="true" /> : <i className="fa fa-plug" aria-hidden="true" />
          }
        </Button>
      </OverlayTrigger>
    );
  }

  const clearDatacollector = (device) => {
    devicesStore.clearDataCollector(device);
  }

  const clearDatacollectorSettingsButton = (device) => {
    if (device.datacollector_method) {
      const tooltip = <Tooltip id="clearDatacollectorSettings">Clear data collector settings</Tooltip>;
      const clearPopover = (
        <Popover id="popover-positioned-scrolling-left">
          Remove data collector settings of {device.name}<br />
          <div className="btn-toolbar">
            <Button
              bsSize="xsmall"
              bsStyle="danger"
              className="devices-button-group"
              onClick={() => clearDatacollector(device)}>
              Yes
            </Button>
            <Button bsSize="xsmall" bsStyle="warning">
              No
            </Button>
          </div>
        </Popover>
      );

      return (
        <OverlayTrigger animation placement="right" root trigger="focus" overlay={clearPopover}>
          <OverlayTrigger placement="top" overlay={tooltip}>
            <Button bsSize="xsmall" className="devices-button-group-clear">
              <i className="fa fa-database" />
            </Button>
          </OverlayTrigger>
        </OverlayTrigger>
      )
    }
  }

  const clearNovncSettings = (device) => {
    devicesStore.clearNovncSettings(device);
  }

  const clearNovncSettingsButton = (device) => {
    if (device.novnc_target) {
      const tooltip = <Tooltip id="clearNovncSettings">Clear Novnc settings</Tooltip>;
      const clearPopover = (
        <Popover id="popover-positioned-scrolling-left">
          Remove Novnc settings of {device.name}<br />
          <div className="btn-toolbar">
            <Button
              bsSize="xsmall"
              bsStyle="danger"
              className="devices-button-group"
              onClick={() => clearNovncSettings(device)}>
              Yes
            </Button>
            <Button bsSize="xsmall" bsStyle="warning">
              No
            </Button>
          </div>
        </Popover>
      );

      return (
        <OverlayTrigger animation placement="right" root trigger="focus" overlay={clearPopover}>
          <OverlayTrigger placement="top" overlay={tooltip}>
            <Button bsSize="xsmall" className="devices-button-group-clear">
              <i className="fa fa-cogs" />
            </Button>
          </OverlayTrigger>
        </OverlayTrigger>
      )
    }
  }

  const confirmDelete = (device, type, user) => {
    if (type == 'device') {
      devicesStore.deleteDevice(device.id);
    } else {
      devicesStore.deleteDeviceRelation(user, device);
    }
  }

  const deleteButton = (object, type, user) => {
    const deletePopover = (
      <Popover id="popover-positioned-scrolling-left">
        Remove {type}: {object.name}<br />
        <div className="btn-toolbar">
          <Button
            bsSize="xsmall"
            bsStyle="danger"
            className="devices-button-group"
            onClick={() => confirmDelete(object, type, user)}>
            Yes
          </Button>
          <Button bsSize="xsmall" bsStyle="warning">
            No
          </Button>
        </div>
      </Popover>
    );

    return (
      <OverlayTrigger
        animation
        placement="right"
        root
        trigger="focus"
        overlay={deletePopover}
      >
        <Button bsSize="xsmall" bsStyle="danger" className="devices-button-group">
          <i className="fa fa-trash-o" />
        </Button>
      </OverlayTrigger>
    );
  }

  const listActionButtons = (device, idx) => {
    return (
      <td>
        <OverlayTrigger placement="top" overlay={<Tooltip id="editDevice">Edit device</Tooltip>}>
          <Button
            bsSize="xsmall"
            type="button"
            bsStyle="warning"
            className="devices-button-group"
            onClick={() => showEditDeviceModal(device)}>
            <i className="fa fa-pencil-square-o" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="top" overlay={<Tooltip id="UsersAndGroups">Show device users and groups</Tooltip>}>
          <Button
            bsSize="xsmall"
            type="button"
            bsStyle="info"
            className="devices-button-group"
            onClick={() => toggleDeviceUsersAndGroups(device.id)}>
            <i className="fa fa-users" />&nbsp;({device.users.length < 10 ? `0${device.users.length}` : device.users.length})
          </Button>
        </OverlayTrigger>
        {deleteButton(device, 'device', {})}
        {clearDatacollectorSettingsButton(device)}
        {clearNovncSettingsButton(device)}
        {testSFTPButton(device)}
      </td>
    );
  }

  const listDevices = () => {
    let tbody = [];
    let devices = devicesStore.devices;

    if (devices && devices.length <= 0) { return tbody; }

    Object.values(devices).map((device, idx) => {
      tbody.push(
        <tbody key={`device-${device.id}`}>
          <tr key={`row-${idx}`}>
            <td>{idx + 1}</td>
            {listActionButtons(device, idx)}
            <td>{device.name}</td>
            <td>{device.initials}</td>
            <td className="device-list-config">{showBasicConfig(device)}</td>
          </tr>
          <tr key={`users-row-${idx}-${device.id}`} className="collapse" id={`row-device-${device.id}`}>
            <td colSpan="5" className="device-users">
              <div className="device-users-headline">Device "{device.name}" managed by following users / groups</div>
              {listUsersAndGroups(device, idx)}
            </td>
          </tr>
        </tbody>
      );
    });

    return tbody;
  }

  const showMessage = () => {
    if (devicesStore.error_message !== '') {
      return <Alert bsStyle="danger" className="device-alert">{devicesStore.error_message}</Alert>;
    } else if (devicesStore.success_message !== '') {
      return <Alert bsStyle="success" className="device-alert">{devicesStore.success_message}</Alert>;
    }
  }

  return (
    <Panel>
      <Panel.Heading className="devices-panel-header">
        <span>Devices</span>
        <Button bsStyle="default" onClick={() => showCreateDeviceModal()}>Add new device</Button>
      </Panel.Heading>
      <Panel.Body>
        {showMessage()}
        <Table responsive condensed hover key="devices-list">
          <thead>
            <tr className="device-table-header">
              <th width="3%">#</th>
              <th width="22%">Actions</th>
              <th width="28%">Name</th>
              <th width="9%">Initial</th>
              <th width="38%">Data Collector / Novnc</th>
            </tr>
          </thead>
          {listDevices()}
        </Table>
        <DeviceModal />
      </Panel.Body>
    </Panel>
  );
};

export default observer(DevicesList);
