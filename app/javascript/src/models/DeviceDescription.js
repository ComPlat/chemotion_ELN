import Element from 'src/models/Element';

export default class DeviceDescription extends Element {
  static buildEmpty(collectionID) {
    return new DeviceDescription({
      collection_id: collectionID,
      type: 'device_description',
      name: 'New device description',
      short_label: '',
      vendor_name: '',
      vendor_id: '',
      vendor_url: '',
      serial_number: '',
      doi: '',
      doi_url: '',
      device_type: '',
      device_type_detail: '',
      operation_mode: '',
      installation_start_date: '',
      installation_end_date: '',
      description_and_comments: '',
      technical_operator: {},
      administrative_operator: {},
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
      description_for_methods_part: '',
    });
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  title() {
    return this.name;
  }
}
