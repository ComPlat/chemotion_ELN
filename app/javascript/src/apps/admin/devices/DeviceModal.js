import React, { useContext, useState } from 'react';
import {
  Modal, Button, ButtonToolbar, Alert, Tabs, Tab, Stack
} from 'react-bootstrap';
import Draggable from 'react-draggable';
import { endsWith } from 'lodash';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import DevicePropertiesTab from 'src/apps/admin/devices/DevicePropertiesTab';
import DeviceUserGroupsTab from 'src/apps/admin/devices/DeviceUserGroupsTab';
import DeviceDataCollectorTab from 'src/apps/admin/devices/DeviceDataCollectorTab';
import DeviceNovncTab from 'src/apps/admin/devices/DeviceNovncTab';
import DeviceMetadataTab from 'src/apps/admin/devices/DeviceMetadataTab';

function DeviceModal() {
  const devicesStore = useContext(StoreContext).devices;
  const deviceMetadataStore = useContext(StoreContext).deviceMetadata;
  let { device } = devicesStore;
  const disableTab = devicesStore.create_or_update !== 'update';
  const [deltaPosition, setDeltaPosition] = useState({ x: 0, y: 0 });

  const errorMessage = devicesStore.error_message + deviceMetadataStore.error_message;
  const successMessage = devicesStore.success_message + deviceMetadataStore.success_message;
  const withAlertClass = errorMessage || successMessage ? 'with-alert' : '';

  const minimizedClass = devicesStore.modalMinimized ? ' minimized' : '';
  let deviceParams = {};
  const datacollectorFields = [
    'datacollector_method', 'datacollector_user', 'datacollector_host',
    'datacollector_key_name', 'datacollector_dir'
  ];

  const trimDeviceStringValues = () => {
    deviceParams = { ...device };
    Object.keys(deviceParams).forEach((key) => {
      if (key !== 'id' && typeof deviceParams[key] === 'string') {
        deviceParams[key] = deviceParams[key].trim();
      }
    });
    return deviceParams;
  };

  const collectUserOrGroupIds = (deviceParams, type) => {
    if (deviceParams[type].length >= 1) {
      const users = [];
      deviceParams[type].map((u) => {
        if (u.id) {
          users.push(u.id);
        }
      });
      deviceParams[type] = users;
    }
    return deviceParams;
  };

  const prepareDeviceParams = () => {
    deviceParams = trimDeviceStringValues();
    deviceParams = collectUserOrGroupIds(deviceParams, 'people');
    deviceParams = collectUserOrGroupIds(deviceParams, 'groups');
    return deviceParams;
  };

  const anyDatacollectorFields = () => datacollectorFields.filter((field) => device[field] !== '' && device[field] !== null);

  const handleValidationState = () => {
    const errorMessages = ['Please fill out all needed fields'];

    const nameValue = device.name.trim() === '' ? 'is-invalid' : '';
    if (nameValue) { errorMessages.push('Please enter a name'); }
    devicesStore.changeDevice('valid_name', nameValue);

    const nameAbbreviationValue = device.name_abbreviation.trim() === '' ? 'is-invalid' : '';
    if (nameAbbreviationValue) { errorMessages.push('Please enter a name abbreviation'); }
    devicesStore.changeDevice('valid_name_abbreviation', nameAbbreviationValue);

    if (anyDatacollectorFields().length >= 1) {
      devicesStore.changeDevice('datacollector_fields', true);

      const methodValue = !device.datacollector_method ? 'is-invalid' : '';
      if (methodValue) { errorMessages.push('Please select watch method'); }
      devicesStore.changeDevice('valid_datacollector_method', methodValue);

      const dirValue = !device.datacollector_dir ? 'is-invalid' : '';
      if (dirValue) { errorMessages.push('Please enter a watch directory'); }
      devicesStore.changeDevice('valid_datacollector_dir', dirValue);

      if (endsWith(device.datacollector_method, 'sftp')) {
        const userValue = !device.datacollector_user ? 'is-invalid' : '';
        if (userValue) { errorMessages.push('Please enter a user'); }
        devicesStore.changeDevice('valid_datacollector_user', userValue);

        const hostValue = !device.datacollector_host ? 'is-invalid' : '';
        if (hostValue) { errorMessages.push('Please enter a host'); }
        devicesStore.changeDevice('valid_datacollector_host', hostValue);

        const keyNameValue = device.datacollector_authentication === 'keyfile' && !device.datacollector_key_name
          ? 'is-invalid' : '';
        if (keyNameValue) { errorMessages.push('Use key file, Please enter a key path'); }
        devicesStore.changeDevice('valid_datacollector_key_name', keyNameValue);
      }
    } else {
      devicesStore.changeDevice('datacollector_fields', false);
    }

    if (devicesStore.active_tab_key === 4) {
      const novncTarget = !device.novnc_target ? 'is-invalid' : '';
      if (novncTarget) { errorMessages.push('Please type a Target for the device'); }
      devicesStore.changeDevice('valid_novnc_target', novncTarget);
    }

    return errorMessages;
  };

  const removeErrors = () => {
    devicesStore.changeErrorMessage('');
    devicesStore.changeSuccessMessage('');
    deviceMetadataStore.changeErrorMessage('');
    deviceMetadataStore.changeSuccessMessage('');
    devicesStore.setChangeNovncPassword(false);
  };

  const saveDevice = () => {
    const errorMessages = handleValidationState();
    devicesStore.changeErrorMessage(errorMessages.join('\n'));
    device = devicesStore.device;

    if (errorMessages.length <= 1) {
      removeErrors();

      if (devicesStore.create_or_update === 'update') {
        devicesStore.updateDevice(prepareDeviceParams());
      } else {
        devicesStore.createDevice(prepareDeviceParams());
      }
    }
  };

  const saveDeviceMetadata = () => {
    // validation?
    removeErrors();
    const deviceMetadata = deviceMetadataStore.device_metadata;
    deviceMetadataStore.updateDeviceMetadata(deviceMetadata);
  };

  const saveDeviceOrRelation = () => {
    if (devicesStore.active_tab_key === 5) {
      saveDeviceMetadata();
    } else {
      saveDevice();
    }
  };

  const handleCancel = () => {
    devicesStore.hideDeviceModal();
    devicesStore.clearDevice();
    devicesStore.setActiveTabKey(1);
    deviceMetadataStore.clearDeviceMetadata();
    removeErrors();
  };

  const handleSelectTab = (key) => {
    devicesStore.setActiveTabKey(key);
  };

  const modalTitle = () => {
    if (devicesStore.create_or_update === 'update') {
      return `Edit ${device.name}`;
    }
    return 'Add new device';
  };

  const showMessage = () => {
    if (errorMessage !== '') {
      return <Alert variant="danger" className="device-alert">{errorMessage}</Alert>;
    } if (successMessage !== '') {
      return <Alert variant="success" className="device-alert">{successMessage}</Alert>;
    }
  };

  const handleDrag = (e, ui) => {
    const { x, y } = deltaPosition;
    setDeltaPosition({
      x: x + ui.deltaX,
      y: y + ui.deltaY,
    });
  };

  return (
    <Draggable handle=".modal-header" onDrag={handleDrag}>
      <div>
        <Modal
          show={devicesStore.deviceModalVisible}
          onHide={() => handleCancel()}
          backdrop={false}
          keyboard={false}
          className={`draggable-modal-dialog${minimizedClass}`}
          size="xxxl"
          dialogClassName="draggable-modal"
          contentClassName={`draggable-modal-content${minimizedClass}`}
          style={{
            transform: `translate(${deltaPosition.x}px, ${deltaPosition.y}px)`,
          }}
        >
          <Modal.Header closeButton>
            <Stack direction="horizontal" className="draggable-modal-stack justify-content-between" gap={3}>
              <Modal.Title className="draggable-modal-stack-title">
                <i className="fa fa-arrows move" />
                {modalTitle()}
              </Modal.Title>
              <Button className="ms-auto ms-lg-5 pt-2 align-self-start bg-transparent border-0">
                <i
                  className="fa fa-window-minimize window-minimize"
                  onClick={() => devicesStore.toggleModalMinimized()}
                />
              </Button>
            </Stack>
          </Modal.Header>
          <Modal.Body>
            <div className={`draggable-modal-form-container${minimizedClass}`}>
              <div className="draggable-modal-form-fields">
                {showMessage()}
                <div className={`draggable-modal-scrollable-content ${withAlertClass}`}>
                  <Tabs
                    activeKey={devicesStore.active_tab_key}
                    onSelect={handleSelectTab}
                    key="form-tabs"
                  >
                    <Tab
                      eventKey={1}
                      title="Properties"
                      key="tab-properties-1"
                    >
                      <DevicePropertiesTab />
                    </Tab>
                    <Tab
                      eventKey={2}
                      title="Users & Groups"
                      key="tab-user-group-2"
                      disabled={disableTab}
                    >
                      <DeviceUserGroupsTab />
                    </Tab>
                    <Tab
                      eventKey={3}
                      title="Data Collector"
                      key="tab-data-collector-3"
                      disabled={disableTab}
                    >
                      <DeviceDataCollectorTab />
                    </Tab>
                    <Tab
                      eventKey={4}
                      title="NoVNC Settings"
                      key="tab-novnc-settings-4"
                      disabled={disableTab}
                    >
                      <DeviceNovncTab />
                    </Tab>
                    <Tab
                      eventKey={5}
                      title="Metadata"
                      key="tab-metadata-5"
                      disabled={disableTab}
                    >
                      <DeviceMetadataTab />
                    </Tab>
                  </Tabs>
                </div>
                <ButtonToolbar className="draggable-modal-form-buttons">
                  <Button variant="warning" onClick={() => handleCancel()}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={saveDeviceOrRelation}>
                    Save
                  </Button>
                </ButtonToolbar>
              </div>
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </Draggable>
  );
}

export default observer(DeviceModal);
