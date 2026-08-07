import ApiClient from 'src/api_clients/ChemotionApiClient';
import DeviceDescription from 'src/models/DeviceDescription';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';
import { preparedCollectionParams } from 'src/utilities/FetcherHelper';

export default class DeviceDescriptionFetcher {
  static fetchByCollectionId(id, params = {}) {
    return ApiClient.getJson(`/api/v1/device_descriptions?${preparedCollectionParams(id, params)}`, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.device_descriptions.map((deviceDescription) => (new DeviceDescription(deviceDescription))),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
  }

  static fetchDeviceDescriptionsByUIStateAndLimit(params) {
    return ApiClient.postJson('/api/v1/device_descriptions/ui_state', { body: params })
      .then((json) => json.device_descriptions.map((d) => new DeviceDescription(d)));
  }

  static splitAsSubDeviceDescription(params) {
    return ApiClient.postJson('/api/v1/device_descriptions/sub_device_descriptions', { body: params });
  }

  static fetchById(deviceDescriptionId) {
    return ApiClient.getJson(`/api/v1/device_descriptions/${deviceDescriptionId}`)
      .then((json) => this.deviceDescriptionElement(json, deviceDescriptionId));
  }

  static createDeviceDescription(deviceDescription) {
    const newFiles = (deviceDescription.attachments || []).filter((a) => a.is_new && !a.is_deleted);

    return AttachmentFetcher.uploadNewAttachmentsForContainer(deviceDescription.container)
      .then(() => ApiClient.postJson('/api/v1/device_descriptions', { body: deviceDescription }))
      .then((json) => {
        const { id } = json.device_description;
        return AttachmentFetcher.updateAttachables(newFiles, 'DeviceDescription', id, [])
          .then(() => this.deviceDescriptionElement(json, id));
      });
  }

  static updateDeviceDescription(deviceDescription) {
    const newFiles = (deviceDescription.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (deviceDescription.attachments || []).filter((a) => !a.is_new && a.is_deleted);

    const tasks = [
      AttachmentFetcher.uploadNewAttachmentsForContainer(deviceDescription.container),
      AttachmentFetcher.updateAttachables(newFiles, 'DeviceDescription', deviceDescription.id, delFiles),
    ];

    return Promise.all(tasks)
      .then(() => AnnotationsFetcher.updateAnnotations(deviceDescription))
      .then(() => ApiClient.putJson(`/api/v1/device_descriptions/${deviceDescription.id}`, {
        body: deviceDescription
      }))
      .then((json) => this.deviceDescriptionElement(json, deviceDescription.id, true));
  }

  static deleteDeviceDescription(deviceDescriptionId) {
    return ApiClient.deleteRequest(`/api/v1/device_descriptions/${deviceDescriptionId}`);
  }

  static fetchOntologiesByLabimotionSegmentKlasses() {
    return ApiClient.getJson('/api/v1/device_descriptions/ontologies');
  }

  static deviceDescriptionElement(json, id, update = false) {
    if (json.error) {
      return new DeviceDescription({ id: `${id}:error:DeviceDescription ${id} is not accessible!`, is_new: true });
    }
    const deviceDescription = new DeviceDescription(json.device_description);
    if (update) {
      deviceDescription.updated = true;
      deviceDescription.updateChecksum();
    } else {
      // eslint-disable-next-line no-underscore-dangle
      deviceDescription._checksum = deviceDescription.checksum();
    }
    return deviceDescription;
  }
}
