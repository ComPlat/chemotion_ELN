import React, { useContext } from 'react';
import { Modal, Button, ButtonToolbar, Alert, Tabs, Tab } from 'react-bootstrap';
import Draggable from "react-draggable";
import DevicePropertiesTab from './DevicePropertiesTab';
import DeviceUserGroupsTab from './DeviceUserGroupsTab';
import DeviceDataCollectorTab from './DeviceDataCollectorTab';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DeviceModal = () => {
  const devicesStore = useContext(StoreContext).devices;
  let device = devicesStore.device;
  const disableTab = devicesStore.create_or_update == 'update' ? false : true;

  const minimizedClass = devicesStore.modalMinimized ? ' minimized' : '';
  let deviceParams = {};

  const trimDeviceStringValues = () => {
    deviceParams = { ...device };
    Object.keys(deviceParams).forEach((key) => {
      if (key !== 'id' && typeof deviceParams[key] == 'string') {
        deviceParams[key] = deviceParams[key].trim();
      }
    });
    return deviceParams;
  }

  const collectUserOrGroupIds = (deviceParams, type) => {
    if (deviceParams[type].length >= 1) {
      let users = [];
      deviceParams[type].map((u) => {
        if (u.id) {
          users.push(u.id);
        }
      });
      deviceParams[type] = users;
    }
    return deviceParams;
  }

  const prepareDeviceParams = () => {
    deviceParams = trimDeviceStringValues();
    deviceParams = collectUserOrGroupIds(deviceParams, 'people');
    deviceParams = collectUserOrGroupIds(deviceParams, 'groups');
    return deviceParams;
  }

  const handleValidationState = () => {
    let nameValue = device.name.trim() === '' ? 'error' : null;
    devicesStore.changeDevice('valid_name', nameValue);
    let nameAbbreviationValue = device.name_abbreviation.trim() === '' ? 'error' : null;
    devicesStore.changeDevice('valid_name_abbreviation', nameAbbreviationValue);
  }

  const saveDevice = () => {
    devicesStore.changeErrorMessage('Please fill out all needed fields');
    handleValidationState();
    device = devicesStore.device;

    if (device.valid_name === null && device.valid_name_abbreviation === null) {
      removeErrors();

      if (devicesStore.create_or_update == 'update') {
        devicesStore.updateDevice(prepareDeviceParams());
      } else {
        devicesStore.createDevice(prepareDeviceParams());
      }
    }
  }

  const handleCancel = () => {
    devicesStore.hideDeviceModal();
    devicesStore.clearDevice();
    devicesStore.setActiveTabKey(1);
    removeErrors();
  }

  const removeErrors = () => {
    devicesStore.changeErrorMessage('');
    devicesStore.changeSuccess_message('');
  }

  const handleSelectTab = (key) => {
    devicesStore.setActiveTabKey(key);
  }

  const modalTitle = () => {
    if (devicesStore.create_or_update == 'update') {
      return `Edit ${device.name}`;
    } else {
      return 'Add new device';
    }
  }

  const showMessage = () => {
    if (devicesStore.error_message !== '') {
      return <Alert bsStyle="danger" className="device-alert">{devicesStore.error_message}</Alert>;
    } else if (devicesStore.success_message !== '') {
      return <Alert bsStyle="success">{devicesStore.success_message}</Alert>;
    }
  }

  return (
    <Draggable handle=".handle">
      <Modal
        show={devicesStore.deviceModalVisible}
        onHide={() => handleCancel()}
        backdrop={false}
        dialogas="draggable-modal"
      >
        <Modal.Header className="handle" closeButton>
          <div className="col-md-11 col-sm-11">
            <Modal.Title>
              <i className="fa fa-arrows move" />
              {modalTitle()}
            </Modal.Title>
          </div>
          <div className="col-md-1 col-sm-1">
            <i
              className="fa fa-window-minimize window-minimize"
              onClick={() => devicesStore.toggleModalMinimized()} />
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className={`draggable-modal-form-container${minimizedClass}`}>
            <div className="draggable-modal-form-fields">
              <div className="draggable-modal-scrollable-content">
                {showMessage()}
                <Tabs
                  activeKey={devicesStore.active_tab_key}
                  animation={false}
                  onSelect={handleSelectTab}
                  id="device-form-tabs"
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
                    title="NoVnc Settings"
                    key="tab-novnc-settings-4"
                    disabled={disableTab}
                  >
                    NoVnc Settings Einstellungen
                  </Tab>
                  <Tab
                    eventKey={5}
                    title="Metadata"
                    key="tab-metadata-5"
                    disabled={disableTab}
                  >
                    Metadata
                  </Tab>
                </Tabs>
              </div>
              <ButtonToolbar className="draggable-modal-form-buttons">
                <Button bsStyle="warning" onClick={() => handleCancel()}>
                  Cancel
                </Button>
                <Button bsStyle="primary" onClick={saveDevice} >
                  Save
                </Button>
              </ButtonToolbar>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </Draggable>
  );
}

export default observer(DeviceModal);
