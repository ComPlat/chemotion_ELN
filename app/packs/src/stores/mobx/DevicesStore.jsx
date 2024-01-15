import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import AdminDeviceFetcher from 'src/fetchers/AdminDeviceFetcher';

const newDevice = {
  id: '',
  name: '',
  name_abbreviation: '',
  serial_number: '',
  verification_status: '',
  account_active: false,
  visibility: false,
  people: [],
  groups: [],
  datacollector_config: {
    method: '',
    method_params: {
      dir: '',
      host: '',
      user: '',
      authen: 'password',
      number_of_files: '1',
      key_name: '',
    },
  },
  novnc_settings: {},
  device_metadata: {},
  valid_name: null,
  valid_name_abbreviation: null,
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
  })
  .actions(self => ({
    load: flow(function* loadDevices() {
      let result = yield AdminDeviceFetcher.fetchDevices();
      self.setDevices(result.devices);
    }),
    createDevice: flow(function* createDevice(params) {
      let result = yield AdminDeviceFetcher.createDevice(params);
      if (result.errors) {
        self.changeErrorMessage(self.errorMessage(result.errors));
      } else {
        self.setCreateOrUpdate('update');
        self.changeSuccess_message('Successfully saved');
        self.setDevice(result.device);
        self.load();
      }
    }),
    updateDevice: flow(function* updateDevice(params) {
      let result = yield AdminDeviceFetcher.updateDevice(params)
      if (result && result.errors) {
        self.changeErrorMessage(self.errorMessage(result.errors));
      } else {
        self.changeSuccess_message('Successfully saved');
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
      self.active_tab_key = key;
    },
    changeDevice(field, value) {
      let device = { ...self.device };
      device[field] = value;
      self.setDevice(device);
    },
    changeDeviceDataCollectorConfig(field, value, method_params) {
      let device = { ...self.device };
      if (method_params) {
        device.datacollector_config.method_params[field] = value;
      } else {
        device.datacollector_config[field] = value;
      }
      self.setDevice(device);
    },
    errorMessage(errors) {
      let message = 'Validation failed:\n';
      Object.entries(errors).forEach(([key, value]) => {
        let errorKey = key.split('_').join(' ');
        if (key == 'name') { self.changeDevice('valid_name', 'error'); }
        if (key == 'name_abbreviation') { self.changeDevice('valid_name_abbreviation', 'error'); }
        message += `${errorKey.charAt(0).toUpperCase() + errorKey.slice(1)}: ${value.join(', ')}\n`;
      });
      return message;
    },
    changeErrorMessage(message) {
      self.error_message = message;
    },
    changeSuccess_message(message) {
      self.success_message = message;
    },
    setIsLoading(value) {
      self.is_loading = value;
    },
  }))
  .views(self => ({
    get deviceModalVisible() { return self.device_modal_visible },
    get modalMinimized() { return self.modal_minimized },
    get devicesValues() { return values(self.devices) },
  }));
