import React, { useEffect, useContext } from 'react';
import { Table, Button, ButtonToolbar, Tooltip, OverlayTrigger, Popover, Alert, Card } from 'react-bootstrap';
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
    document.getElementById(`row-device-${deviceId}`).classList.toggle('show');
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
        <b className="text-success pe-1">Data Collector:</b>
        {datacollectorText}
        <br />
        <b className="text-success pe-1">Novnc:</b>
        {novncText}
      </>
    );
  }

  const listUsersAndGroups = (device, idx) => {
    return (
      <Table key={`users-table-${idx}`} className="bg-body-secondary">
        <tbody>
          {device.users.map((user, i) => (
            <tr key={`row_${device.id}-${user.id}`}>
              <td>{i + 1}</td>
              <td>{user.name}</td>
              <td>{user.initials}</td>
              <td>{user.type}</td>
              <td>{deleteButton(device, user.type.toLowerCase(), user)}</td>
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
        <Button size="sm" onClick={() => testSFTP(device)}>
          {
            devicesStore.device_testing_id == device.id
              ? <i className="fa fa-spin fa-spinner" aria-hidden="true" />
              : <i className="fa fa-plug" aria-hidden="true" />
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
      const clearPopover = (
        <Popover id="popover-clear-datacollector">
          <Popover.Header as="h3">Remove data collector settings of {device.name}</Popover.Header>
          <Popover.Body>
            <ButtonToolbar className="gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => clearDatacollector(device)}>
                Yes
              </Button>
              <Button size="sm" variant="warning">
                No
              </Button>
            </ButtonToolbar>
          </Popover.Body>
        </Popover>
      );

      return (
        <OverlayTrigger placement="right" trigger="focus" overlay={clearPopover}>
          <Button size="sm" className="bg-danger-subtle text-danger" title="Clear data collector settings">
            <i className="fa fa-database" />
          </Button>
        </OverlayTrigger>
      )
    }
  }

  const clearNovncSettings = (device) => {
    devicesStore.clearNovncSettings(device);
  }

  const clearNovncSettingsButton = (device) => {
    if (device.novnc_target) {
      const clearPopover = (
        <Popover id="popover-clear-novnc">
          <Popover.Header as="h3">Remove Novnc settings of {device.name}</Popover.Header>
          <Popover.Body>
            <ButtonToolbar className="gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => clearNovncSettings(device)}>
                Yes
              </Button>
              <Button size="sm" variant="warning">
                No
              </Button>
            </ButtonToolbar>
          </Popover.Body>
        </Popover>
      );

      return (
        <OverlayTrigger placement="right" trigger="focus" overlay={clearPopover}>
          <Button size="sm" className="bg-danger-subtle text-danger" title="Clear NoVNC settings">
            <i className="fa fa-cogs" />
          </Button>
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
      <Popover id="popover-delete-button">
        <Popover.Header as="h3">Remove {type}: {object.name}</Popover.Header>
        <Popover.Body>
          <ButtonToolbar className="gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={() => confirmDelete(object, type, user)}>
              Yes
            </Button>
            <Button size="sm" variant="warning">
              No
            </Button>
          </ButtonToolbar>
        </Popover.Body>
      </Popover>
    );

    return (
      <OverlayTrigger
        placement="right"
        trigger="focus"
        overlay={deletePopover}
      >
        <Button size="sm" variant="danger" title="Delete device">
          <i className="fa fa-trash-o" />
        </Button>
      </OverlayTrigger>
    );
  }

  const listActionButtons = (device, idx) => {
    return (
      <td>
        <ButtonToolbar className="gap-2">
          <OverlayTrigger placement="top" overlay={<Tooltip id="editDevice">Edit device</Tooltip>}>
            <Button
              size="sm"
              type="button"
              variant="warning"
              onClick={() => showEditDeviceModal(device)}>
              <i className="fa fa-pencil-square-o" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="UsersAndGroups">Show device users and groups</Tooltip>}>
            <Button
              size="sm"
              type="button"
              variant="info"
              onClick={() => toggleDeviceUsersAndGroups(device.id)}>
              <i className="fa fa-users me-1" />
              ({device.users.length < 10 ? `0${device.users.length}` : device.users.length})
            </Button>
          </OverlayTrigger>
          {deleteButton(device, 'device', {})}
          {clearDatacollectorSettingsButton(device)}
          {clearNovncSettingsButton(device)}
          {testSFTPButton(device)}
        </ButtonToolbar>
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
            <td>{showBasicConfig(device)}</td>
          </tr>
          <tr key={`users-row-${idx}-${device.id}`} className="collapse" id={`row-device-${device.id}`}>
            <td colSpan="5" className="border-top-0">
              <div className="fw-bold mt-1 mb-1">Device "{device.name}" managed by following users / groups</div>
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
      return <Alert variant="danger" className="device-alert">{devicesStore.error_message}</Alert>;
    } else if (devicesStore.success_message !== '') {
      return <Alert variant="success" className="device-alert">{devicesStore.success_message}</Alert>;
    }
  }

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span className="fw-bold fs-4">Devices</span>
        <Button variant="light" onClick={() => showCreateDeviceModal()}>Add new device</Button>
      </Card.Header>
      <Card.Body>
        {showMessage()}
        <Table responsive hover key="devices-list">
          <thead>
            <tr className="bg-dark-subtle">
              <th>#</th>
              <th>Actions</th>
              <th>Name</th>
              <th>Initial</th>
              <th>Data Collector / NoVNC</th>
            </tr>
          </thead>
          {listDevices()}
        </Table>
        <DeviceModal />
      </Card.Body>
    </Card>
  );
};

export default observer(DevicesList);
