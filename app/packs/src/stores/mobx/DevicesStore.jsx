import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import AdminDeviceFetcher from 'src/fetchers/AdminDeviceFetcher';

const newDevice = {
  id: '',
  name: '',
  name_abbreviation: '',
  initials: '',
  email: '',
  serial_number: '',
  verification_status: '',
  account_active: false,
  visibility: false,
  users: [],
  people: [],
  groups: [],
  datacollector_fields: false,
  datacollector_method: '',
  datacollector_dir: '',
  datacollector_host: '',
  datacollector_user: '',
  datacollector_authentication: 'password',
  datacollector_number_of_files: '1',
  datacollector_key_name: '',
  datacollector_user_level_selected: false,
  novnc_token: '',
  novnc_target: '',
  novnc_password: '',
  novnc_password_decrypted: '',
  valid_name: '',
  valid_name_abbreviation: '',
  valid_datacollector_method: '',
  valid_datacollector_user: '',
  valid_datacollector_host: '',
  valid_datacollector_key_name: '',
  valid_datacollector_dir: '',
  valid_novnc_target: '',
}

export const DevicesStore = types
  .model({
    device_modal_visible: types.optional(types.boolean, false),
    device: types.optional(types.frozen({}), newDevice),
    devices: types.optional(types.optional(types.array(types.frozen({})), [])),
    modal_minimized: types.optional(types.boolean, false),
    error_message: types.optional(types.string, ''),
    success_message: types.optional(types.string, ''),
    create_or_update: types.optional(types.string, 'create'),
    active_tab_key: types.optional(types.number, 1),
    is_loading: types.optional(types.boolean, false),
    device_testing_id: types.optional(types.number, 0),
    change_novnc_password: types.optional(types.boolean, false),
  })
  .actions(self => ({
    load: flow(function* loadDevices() {
      let result = yield AdminDeviceFetcher.fetchDevices();
      self.setDevices(result.devices);
    }),
    deviceById: flow(function* deviceById(deviceId) {
      let result = yield AdminDeviceFetcher.fetchDeviceById(deviceId);
      if (result) {
        self.setDevice(result.device);
      }
    }),
    createDevice: flow(function* createDevice(params) {
      let result = yield AdminDeviceFetcher.createDevice(params);
      if (result.errors) {
        self.changeErrorMessage(self.errorMessage(result.errors));
      } else if (result) {
        self.setCreateOrUpdate('update');
        self.changeSuccessMessage('Successfully saved');
        self.setDevice(result.device);
        self.load();
      }
    }),
    updateDevice: flow(function* updateDevice(params) {
      let result = yield AdminDeviceFetcher.updateDevice(params)
      if (result && result.errors) {
        self.changeErrorMessage(self.errorMessage(result.errors));
      } else if (result && result.error) {
        self.changeErrorMessage(self.errorMessage({ key_file: [result.error] }));
      } else if (result) {
        let message = ['Successfully saved'];
        if (result.device.datacollector_fields && self.active_tab_key == 3) {
          message.push('Warning: Unprocessable files will be deleted from the target directory!');
        };

        self.changeSuccessMessage(message.join('\n'));
        self.setDevice(result.device);
        self.load();
      }
    }),
    deleteDevice: flow(function* deleteDevice(device_id) {
      let result = yield AdminDeviceFetcher.deleteDevice(device_id);
      if (result.deleted == device_id) {
        self.setDevices(self.devices.filter(d => d.id != device_id));
      }
    }),
    deleteDeviceRelation: flow(function* deleteDeviceRelation(user, device) {
      let result = yield AdminDeviceFetcher.deleteRelation(user.id, device.id)
      if (result) {
        self.setDevices(result.devices);
      }
    }),
    testSFTP: flow(function* testSFTP(device) {
      let result = yield AdminDeviceFetcher.testSFTP(device)
      let message = result && result.message ? `${device.name} - test connection: ${result.message}` : '';
      if (result.status == 'error') {
        self.changeErrorMessage(message);
      } else if (result.status == 'success') {
        self.changeSuccessMessage(message);
      }
      self.setDeviceTestingId(0);
    }),
    showDeviceModal() {
      self.device_modal_visible = true;
    },
    hideDeviceModal() {
      self.device_modal_visible = false;
    },
    toggleModalMinimized() {
      self.modal_minimized = !self.modal_minimized;
    },
    setDevice(device) {
      self.device = device;
    },
    setDevices(devices) {
      self.devices = devices;
    },
    clearDevice() {
      self.device = newDevice;
    },
    setCreateOrUpdate(value) {
      self.create_or_update = value;
    },
    setActiveTabKey(key) {
      self.active_tab_key = key * 1;
    },
    changeDevice(field, value) {
      let device = { ...self.device };
      device[field] = value;
      self.setDevice(device);
    },
    setChangeNovncPassword(value) {
      self.change_novnc_password = value;
    },
    clearDataCollector(device) {
      let changedDevice = { ...device };
      changedDevice.datacollector_fields = false;
      changedDevice.datacollector_method = '';
      changedDevice.datacollector_dir = '';
      changedDevice.datacollector_host = '';
      changedDevice.datacollector_user = '';
      changedDevice.datacollector_authentication = '';
      changedDevice.datacollector_number_of_files = '';
      changedDevice.datacollector_key_name = '';
      self.updateDevice(changedDevice);
    },
    clearNovncSettings(device) {
      let changedDevice = { ...device };
      changedDevice.novnc_token = '';
      changedDevice.novnc_target = '';
      changedDevice.novnc_password = '';
      self.updateDevice(changedDevice);
    },
    errorMessage(errors) {
      let message = 'Validation failed:\n';
      Object.entries(errors).forEach(([key, value]) => {
        let errorKey = key.replace('datacollector_', '').split('_').join(' ');
        if (key == 'name') { self.changeDevice('valid_name', 'error'); }
        if (key == 'name_abbreviation') { self.changeDevice('valid_name_abbreviation', 'is-invalid'); }
        if (key == 'datacollector_method') { self.changeDevice('valid_datacollector_method', 'is-invalid'); }
        if (key == 'datacollector_dir') { self.changeDevice('valid_datacollector_dir', 'is-invalid'); }
        if (key == 'datacollector_user') { self.changeDevice('valid_datacollector_user', 'is-invalid'); }
        if (key == 'datacollector_host') { self.changeDevice('valid_datacollector_host', 'is-invalid'); }
        if (key == 'datacollector_key_name') { self.changeDevice('valid_datacollector_key_name', 'is-invalid'); }
        message += `${errorKey.charAt(0).toUpperCase() + errorKey.slice(1)}: ${value.join(', ')}\n`;
      });
      return message;
    },
    changeErrorMessage(message) {
      self.error_message = message;
    },
    changeSuccessMessage(message) {
      self.success_message = message;
    },
    setIsLoading(value) {
      self.is_loading = value;
    },
    setDeviceTestingId(value) {
      self.device_testing_id = value;
    },
  }))
  .views(self => ({
    get deviceModalVisible() { return self.device_modal_visible },
    get modalMinimized() { return self.modal_minimized },
    get devicesValues() { return values(self.devices) },
  }));
