import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import DeviceDescriptionFetcher from 'src/fetchers/DeviceDescriptionFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
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
    attachment_editor: types.optional(types.boolean, false),
    attachment_extension: types.optional(types.frozen({}), {}),
    attachment_image_edit_modal_shown: types.optional(types.boolean, false),
    attachment_selected: types.optional(types.frozen({}), {}),
    attachment_show_import_confirm: types.optional(types.array(types.frozen({})), []),
    attachment_filter_text: types.optional(types.string, ''),
    attachment_sort_by: types.optional(types.string, 'name'),
    attachment_sort_direction: types.optional(types.string, 'asc'),
    filtered_attachments: types.optional(types.array(types.frozen({})), []),
    show_ontology_modal: types.optional(types.boolean, false),
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

      device_description.updated = false;
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
    setAttachmentEditor(value) {
      self.attachment_editor = value;
    },
    setAttachmentExtension(value) {
      self.attachment_extension = value;
    },
    setFilteredAttachments(attachments) {
      self.filtered_attachments = attachments;
    },
    setShowImportConfirm(value) {
      self.attachment_show_import_confirm = value;
    },
    toogleAttachmentModal() {
      self.attachment_image_edit_modal_shown = !self.attachment_image_edit_modal_shown;
    },
    setAttachmentSelected(attachment) {
      self.attachment_selected = attachment;
    },
    setAttachmentFilterText(value) {
      self.attachment_filter_text = value;
    },
    setAttachmentSortBy(value) {
      self.attachment_sort_by = value;
    },
    setAttachmentSortDirectory(value) {
      self.attachment_sort_direction = value;
    },
    changeAttachment(index, key, value, initial = false) {
      let device_description = { ...self.device_description };
      let attachment = { ...device_description.attachments[index] };
      attachment[key] = value;
      device_description.attachments[index] = attachment;
      self.setFilteredAttachments(device_description.attachments);
      self.setDeviceDescription(device_description, initial);
    },
    loadPreviewImagesOfAttachments(device_description) {
      if (device_description.attachments.length === 0) { return device_description }
      let deviceDescription = { ...device_description }

      deviceDescription.attachments.map((attachment, index) => {
        let attachment_object = { ...device_description.attachments[index] };
        if (attachment.thumb) {
          AttachmentFetcher.fetchThumbnail({ id: attachment.id })
            .then((result) => {
              let preview = result != null ? `data:image/png;base64,${result}` : '/images/wild_card/not_available.svg';
              attachment_object.preview = preview;
              deviceDescription.attachments[index] = attachment_object;
              self.setFilteredAttachments(deviceDescription.attachments);
            });
        }
      });
    },
    toggleOntologyModal() {
      self.show_ontology_modal = !self.show_ontology_modal;
    },
  }))
  .views(self => ({
    get deviceDescriptionsValues() { return values(self.devices_descriptions) },
    get filteredAttachments() { return values(self.filtered_attachments) },
  }));
