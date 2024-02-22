import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import DeviceDescriptionFetcher from 'src/fetchers/DeviceDescriptionFetcher';
import DeviceDescription from 'src/models/DeviceDescription';

const toggableContents = {
  'general': true,
  'version_specific': true,
  'operators_and_locations': true,
  'physical_data': true,
  'software_interfaces': true,
  'manuals': true,
  'publications': true,
  'settings': true,
};

export const DeviceDescriptionsStore = types
  .model({
    device_description: types.optional(types.frozen({}), {}),
    devices_descriptions: types.optional(types.optional(types.array(types.frozen({})), [])),
    active_tab_key: types.optional(types.number, 1),
    key_prefix: types.optional(types.string, ''),
    toggable_contents: types.optional(types.frozen({}), toggableContents),
  })
  .actions(self => ({
    setDeviceDescription(device_description) {
      self.device_description = device_description;
    },
    setDeviceDescriptions(devices_descriptions) {
      self.devices_descriptions = devices_descriptions;
    },
    clearDeviceDescription() {
      self.device_description = {};
    },
    changeDeviceDescription(field, value) {
      let device_description = { ...self.device_description };
      let operators = [...self.device_description['operators']];

      if (field.includes('operators_')) {
        const fieldElements = field.split('_');
        operators[fieldElements[2]][fieldElements[1]] = value;
        device_description['operators'] = operators;
      } else {
        device_description[field] = value;
      }

      device_description.isPendingToSave = true;
      //if (device_description.id) {
      //  device_description.isEdited = true;
      //}
      self.setDeviceDescription(device_description);
    },
    setActiveTabKey(key) {
      self.active_tab_key = key;
    },
    setKeyPrefix(prefix) {
      self.key_prefix = `${prefix}-${self.device_description.collection_id}`;
    },
    toggleContent(content) {
      let contents = { ...self.toggable_contents };
      contents[content] = !contents[content];
      self.toggable_contents = contents;
    },
  }))
  .views(self => ({
    get deviceDescriptionsValues() { return values(self.devices_descriptions) },
  }));
