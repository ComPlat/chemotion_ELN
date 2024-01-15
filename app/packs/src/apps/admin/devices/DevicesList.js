import React, { useEffect, useContext } from 'react';
import { Panel, Table, ButtonGroup, Button, Tooltip, OverlayTrigger, Popover } from 'react-bootstrap';
import DeviceModal from './DeviceModal';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DevicesList = () => {
  const devicesStore = useContext(StoreContext).devices;

  useEffect(() => {
    devicesStore.load();
  }, []);

  const showCreateDeviceModal = () => {
    devicesStore.setCreateOrUpdate('create');
    devicesStore.showDeviceModal();
  }

  const showEditDeviceModal = (device) => {
    devicesStore.setCreateOrUpdate('update');
    devicesStore.setDevice(device);
    devicesStore.showDeviceModal();
  }

  const toggleDeviceUsersAndGroups = (deviceId) => {
    document.getElementById(`row-device-${deviceId}`).classList.toggle('in');
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
        <Button bsSize="xsmall" bsStyle="danger">
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
            <td>{device.email}</td>
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

  return (
    <Panel>
      <Panel.Heading className="devices-panel-header">
        <span>Devices</span>
        <Button bsStyle="default" onClick={() => showCreateDeviceModal()}>Add new device</Button>
      </Panel.Heading>
      <Panel.Body>
        <Table responsive condensed hover key="devices-list">
          <thead>
            <tr className="device-table-header">
              <th width="4%">#</th>
              <th width="28%">Actions</th>
              <th width="28%">Name</th>
              <th width="12%">Initial</th>
              <th width="28%">Email</th>
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
