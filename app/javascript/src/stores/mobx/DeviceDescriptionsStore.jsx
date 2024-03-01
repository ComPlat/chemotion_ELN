import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import DeviceDescriptionFetcher from 'src/fetchers/DeviceDescriptionFetcher';
import DeviceDescription from 'src/models/DeviceDescription';
import Container from 'src/models/Container';

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
    device_description_checksum: types.optional(types.string, ''),
    devices_descriptions: types.optional(types.optional(types.array(types.frozen({})), [])),
    active_tab_key: types.optional(types.number, 1),
    key_prefix: types.optional(types.string, ''),
    toggable_contents: types.optional(types.frozen({}), toggableContents),
    analysis_mode: types.optional(types.string, 'edit'),
    analysis_open_panel: types.optional(types.union(types.string, types.number), 'none'),
    analysis_comment_box: types.optional(types.boolean, false),
    analysis_start_export: types.optional(types.boolean, false),
  })
  .actions(self => ({
    setDeviceDescription(device_description, initial = false) {
      if (initial) {
        self.device_description_checksum = device_description._checksum;
      }
      device_description.changed = false;
      const deviceDescription = new DeviceDescription(device_description);

      if (deviceDescription.checksum() != self.device_description_checksum || deviceDescription.isNew) {
        deviceDescription.changed = true;
      }
      self.device_description = deviceDescription;
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
    changeAnalysisMode(mode) {
      self.analysis_mode = mode;
    },
    changeAnalysisOpenPanel(panel) {
      self.analysis_open_panel = panel;
    },
    addEmptyAnalysisContainer() {
      const container = Container.buildEmpty();
      container.container_type = "analysis"
      let device_description = { ...self.device_description };
      device_description.container.children[0].children.push(container);
      self.setDeviceDescription(device_description);
    },
    changeAnalysisContainerContent(container) {
      let device_description = { ...self.device_description };
      const index = device_description.container.children[0].children.findIndex((c) => c.id === container.id);
      device_description.container.children[0].children[index] = container;
      self.setDeviceDescription(device_description);
    },
    changeAnalysisContainer(children) {
      let device_description = { ...self.device_description };
      device_description.container.children[0].children = children;
      self.setDeviceDescription(device_description);
    },
    toggleAnalysisCommentBox() {
      self.analysis_comment_box = !self.analysis_comment_box;
    },
    changeAnalysisComment(comment) {
      let device_description = { ...self.device_description };
      let container = { ...self.device_description.container }
      container.description = comment;
      device_description.container = container;
      self.setDeviceDescription(device_description);
    },
    toggleAnalysisStartExport() {
      self.analysis_start_export = !self.analysis_start_export;
    },
  }))
  .views(self => ({
    get deviceDescriptionsValues() { return values(self.devices_descriptions) },
  }));
