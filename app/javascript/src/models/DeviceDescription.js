import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class DeviceDescription extends Element {
  static buildEmpty(collectionID) {
    return new DeviceDescription({
      collection_id: collectionID,
      type: 'device_description',
      name: 'New device description',
      short_label: '',
      device_type: '',
      device_class: '',
      device_class_detail: '',
      operation_mode: '',
      vendor_device_name: '',
      vendor_device_id: '',
      serial_number: '',
      vendor_company_name: '',
      vendor_id: '',
      ontologies: [],
      description: '',
      general_tags: '',
      tags: '',
      version_number: '',
      version_installation_start_date: '',
      version_installation_end_date: '',
      version_identifier_type: '',
      version_doi: '',
      version_doi_url: '',
      version_characterization: '',
      operators: [],
      owner_institution: '',
      owner_email: '',
      owner_id: '',
      owner_id_type: '',
      inventory_id: '',
      alternative_identifier: '',
      vendor_id_type: '',
      university_campus: '',
      institute: '',
      building: '',
      room: '',
      infrastructure_assignment: '',
      access_options: '',
      access_comments: '',
      size: '',
      weight: '',
      application_name: '',
      application_version: '',
      vendor_url: '',
      helpers_uploaded: false,
      policies_and_user_information: '',
      description_for_methods_part: '',
      setup_descriptions: {},
      maintenance_contract_available: '',
      maintenance_scheduling: '',
      contact_for_maintenance: [],
      planned_maintenance: [],
      consumables_needed_for_maintenance: [],
      unexpected_maintenance: [],
      measures_after_full_shut_down: '',
      measures_after_short_shut_down: '',
      measures_to_plan_offline_period: '',
      restart_after_planned_offline_period: '',
      isNew: true,
      changed: false,
      updated: false,
      can_copy: false,
      container: Container.init(),
      attachments: [],
      segments: [],
    });
  }

  static buildNewShortLabel() {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return 'NEW DEVICE DESCRIPTION'; }
    return `${currentUser.initials}-Dev${currentUser.device_descriptions_count + 1}`;
  }

  static copyFromDeviceDescriptionAndCollectionId(device_description, collection_id) {
    const newDeviceDescription = device_description.buildCopy();
    newDeviceDescription.collection_id = collection_id;
    if (device_description.name) { newDeviceDescription.name = device_description.name; }

    return newDeviceDescription;
  }

  title() {
    const short_label = this.short_label ? this.short_label : '';
    return this.name ? `${short_label} ${this.name}` : short_label;
  }

  get attachmentCount() {
    if (this.attachments) { return this.attachments.length; }
    return this.attachment_count;
  }

  getAttachmentByIdentifier(identifier) {
    return this.attachments
      .filter((attachment) => attachment.identifier === identifier)[0];
  }

  buildCopy() {
    const device_description = super.buildCopy();
    device_description.short_label = DeviceDescription.buildNewShortLabel();
    device_description.container = Container.init();
    device_description.can_copy = false;
    device_description.attachments = []
    return device_description;
  }
}
