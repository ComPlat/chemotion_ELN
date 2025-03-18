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
  'setup': true,
  'ontology': true,
  'ontology_segments': true,
  'general_aspects': true,
  'planned_maintenance': true,
  'unexpected_maintenance': true,
  'unexpected_power_shutdown': true,
  'planned_offline_period': true,
};

const multiRowFields = [
  'operators', 'contact_for_maintenance', 'planned_maintenance',
  'consumables_needed_for_maintenance', 'unexpected_maintenance',
];

export const DeviceDescriptionsStore = types
  .model({
    device_description: types.optional(types.frozen({}), {}),
    device_description_checksum: types.optional(types.string, ''),
    open_device_descriptions: types.optional(types.optional(types.array(types.frozen({})), [])),
    saved_current_device_description_id: types.optional(types.string, ''),
    active_tab_key: types.optional(types.string, 'properties'),
    key_prefix: types.optional(types.string, ''),
    toggable_contents: types.optional(types.frozen({}), toggableContents),
    toggable_segments: types.optional(types.array(types.string), []),
    analysis_mode: types.optional(types.string, 'edit'),
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
    show_ontology_select: types.optional(types.boolean, true),
    show_ontology_form_selection: types.optional(types.boolean, false),
    ontology_mode: types.optional(types.string, 'edit'),
    selected_segment_id: types.optional(types.number, 0),
    segment_expand_all: types.optional(types.boolean, false),
    ontology_index_for_edit: types.optional(types.number, -1),
    list_grouped_by: types.optional(types.string, 'serial_number'),
    show_all_groups: types.optional(types.boolean, true),
    all_groups: types.optional(types.array(types.string), []),
    shown_groups: types.optional(types.array(types.string), []),
    select_is_open: types.optional(types.array(types.frozen({})), []),
    multi_row_fields: types.optional(types.array(types.string), multiRowFields),
  })
  .actions(self => ({
    addDeviceDescriptionToOpen(device_description) {
      let openDeviceDescription = [...self.open_device_descriptions];
      const index = openDeviceDescription.findIndex(s => s.id === device_description.id);
      
      if (index === -1) { 
        self.setDeviceDescription(device_description, true);
        openDeviceDescription.push(self.device_description);
        self.open_device_descriptions = openDeviceDescription;
      } else if (self.saved_current_device_description_id === `${device_description.id}`) {
        self.device_description = device_description;
        openDeviceDescription[index] = device_description;
        self.open_device_descriptions = openDeviceDescription;
      } else {
        self.device_description = openDeviceDescription[index];
      }
      self.saved_current_device_description_id = '';
    },
    editDeviceDescriptions(device_description) {
      let openDeviceDescription = [...self.open_device_descriptions];
      const index = openDeviceDescription.findIndex(s => s.id === device_description.id);
      openDeviceDescription[index] = device_description;
      self.open_device_descriptions = openDeviceDescription;
    },
    removeFromOpenDeviceDescriptions(device_description) {
      const openDeviceDescription =
        self.open_device_descriptions.filter((s) => { return s.id !== device_description.id });
      self.open_device_descriptions = openDeviceDescription;
    },
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

      if (!initial) {
        self.editDeviceDescriptions(deviceDescription);
      }
    },
    changeDeviceDescription(field, value, type) {
      let device_description = { ...self.device_description };
      const fieldElements = field.split('-');

      if (values(self.multi_row_fields).includes(fieldElements[0]) && fieldElements.length > 1) {
        let element = [...self.device_description[fieldElements[0]]];
        element[fieldElements[2]][fieldElements[1]] = value;
        device_description[fieldElements[0]] = element;
      } else if (field.includes('setup_descriptions')) {
        device_description = self.changeSetupDescriptions(field, value, type, device_description);
      } else {
        device_description[field] = value;
      }

      device_description.updated = false;
      self.setDeviceDescription(device_description);
    },
    changeSetupDescriptions(field, value, type, device_description) {
      const fieldElements = field.split('-');
      const elementField = fieldElements.length > 1 ? fieldElements[0] : field;
      const elementType = type !== undefined ? type : fieldElements[1];
      let device_description_field = { ...device_description[elementField] };

      if (device_description_field === null) {
        device_description_field = { [elementType]: value };
      } else if (fieldElements.length > 1) {
        device_description_field[elementType][fieldElements[3]][fieldElements[2]] = value;
      } else {
        device_description_field[elementType] = value;
      }
      device_description[elementField] = device_description_field;
      return device_description;
    },
    setCurrentDeviceDescriptionIdToSave(value) {
      self.saved_current_device_description_id = value;
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
    toggleSegment(segment) {
      let segments = [...self.toggable_segments];
      if (segments.includes(segment)) {
        segments = segments.filter((s) => { return s != segment });
      } else {
        segments.push(segment);
      }
      self.toggable_segments = segments;
    },
    changeAnalysisMode(mode) {
      self.analysis_mode = mode;
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
    changeAnalysisComment(e) {
      if (!e && !e?.target) { return null; }

      let device_description = { ...self.device_description };
      let container = { ...self.device_description.container }
      container.description = e.target.value;
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
    toggleOntologyModal() {
      self.show_ontology_modal = !self.show_ontology_modal;
    },
    closeOntologyModal() {
      self.show_ontology_modal = false;
      self.show_ontology_select = true;
      self.show_ontology_form_selection = false;
      self.ontology_index_for_edit = -1;
    },
    toggleOntologySelect() {
      self.show_ontology_select = !self.show_ontology_select;
    },
    toggleOntologyFormSelection() {
      self.show_ontology_form_selection = !self.show_ontology_form_selection;
    },
    changeOntologyMode(mode) {
      self.ontology_mode = mode;
    },
    setSelectedSegmentId(segment_id) {
      self.selected_segment_id = segment_id;
    },
    changeSegmentExpandAll(value) {
      self.segment_expand_all = value;
    },
    setOntologyIndexForEdit(index) {
      self.ontology_index_for_edit = index;
    },
    setListGroupedBy(value) {
      self.list_grouped_by = value;
    },
    toggleAllGroups() {
      self.show_all_groups = !self.show_all_groups;

      if (self.show_all_groups) {
        self.removeAllGroupsFromShownGroups();
      } else {
        self.addAllGroupsToShownGroups();
      }
    },
    addGroupToAllGroups(group_key) {
      const index = self.all_groups.findIndex((g) => { return g == group_key });
      if (index === -1) {
        self.all_groups.push(group_key);
      }
    },
    addAllGroupsToShownGroups() {
      self.all_groups.map((group_key) => {
        self.addGroupToShownGroups(group_key);
      });
    },
    addGroupToShownGroups(group_key) {
      self.shown_groups.push(group_key);
    },
    removeGroupFromShownGroups(group_key) {
      const shownGroups = self.shown_groups.filter((g) => { return g !== group_key });
      self.shown_groups = shownGroups;
    },
    removeAllGroupsFromShownGroups() {
      self.shown_groups = [];
    },
    setSelectIsOpen(field, value) {
      const index = self.select_is_open.findIndex((x) => { return x[field] !== undefined });
      const newValue = { [field]: value }
      if (index >= 0) {
        let fieldObject = { ...self.select_is_open[index] };
        fieldObject = newValue;
        self.select_is_open[index] = fieldObject;
      } else {
        self.select_is_open.push(newValue);
      }
    }
  }))
  .views(self => ({
    get filteredAttachments() { return values(self.filtered_attachments) },
    get shownGroups() { return values(self.shown_groups) },
    get selectIsOpen() { return values(self.select_is_open) },
    get multiRowFields() { return values(self.multi_row_fields) },
  }));
