import Element from 'src/models/Element';
import Container from 'src/models/Container';

export default class DeviceDescription extends Element {
  static buildEmpty(collectionID) {
    return new DeviceDescription({
      collection_id: collectionID,
      type: 'device_description',
      name: 'New device description',
      short_label: '',
      device_type: '',
      device_type_detail: '',
      operation_mode: '',
      vendor_device_name: '',
      vendor_device_id: '',
      serial_number: '',
      vendor_company_name: '',
      vendor_id: '',
      // ontology logic
      description: '',
      tags: '',
      version_number: '',
      version_installation_start_date: '',
      version_installation_end_date: '',
      version_doi: '',
      version_doi_url: '',
      version_characterization: '',
      operators: [],
      university_campus: '',
      institute: '',
      building: '',
      room: '',
      infrastructure_assignment: '',
      access_options: '',
      comments: '',
      size: '',
      weight: '',
      application_name: '',
      application_version: '',
      vendor_url: '',
      policies_and_user_information: '',
      description_for_methods_part: '',
      // setting components
      isNew: true,
      changed: false,
      updated: false,
      container: Container.init(),
      attachments: [],
    });
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
}
