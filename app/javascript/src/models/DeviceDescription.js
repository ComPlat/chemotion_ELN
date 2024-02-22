import Element from 'src/models/Element';

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
    });
  }

  title() {
    return this.name;
  }
}
