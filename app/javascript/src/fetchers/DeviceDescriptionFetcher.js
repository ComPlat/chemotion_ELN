import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import DeviceDescription from 'src/models/DeviceDescription';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

export default class DeviceDescriptionFetcher {
  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'device_descriptions', DeviceDescription);
  }

  static fetchById(deviceDescriptionId, updated = false) {
    return fetch(
      `/api/v1/device_descriptions/${deviceDescriptionId}`,
      { ...this._httpOptions() }
    ).then(response => response.json())
      .then((json) => {
        if (json.error) {
          return new DeviceDescription({ id: `${id}:error:DeviceDescription ${id} is not accessible!`, is_new: true });
        } else {
          const deviceDescription = new DeviceDescription(json.device_description);
          deviceDescription.updated = updated;
          if (updated) {
            deviceDescription.updateChecksum()
          } else {
            deviceDescription._checksum = deviceDescription.checksum();
          }
          return deviceDescription;
        }
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static createDeviceDescription(deviceDescription) {
    const containerFiles = AttachmentFetcher.getFileListfrom(deviceDescription.container);
    const newFiles = (deviceDescription.attachments || []).filter((a) => a.is_new && !a.is_deleted);

    const promise = () => fetch(
      `/api/v1/device_descriptions`,
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(deviceDescription)
      }
    ).then(response => response.json())
      .then((json) => {
        if (newFiles.length > 0) {
          AttachmentFetcher.updateAttachables(
            newFiles,
            'DeviceDescription',
            json.device_description.id,
            []
          )();
        }
        return new DeviceDescription(json.device_description);
      })
      .catch(errorMessage => console.log(errorMessage));

    if (containerFiles.length > 0) {
      const tasks = [];
      containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => promise());
    }
    return promise();
  }

  static updateDeviceDescription(deviceDescription) {
    const containerFiles = AttachmentFetcher.getFileListfrom(deviceDescription.container);
    const newFiles = (deviceDescription.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (deviceDescription.attachments || []).filter((a) => !a.is_new && a.is_deleted);

    const promise = () => fetch(
      `/api/v1/device_descriptions/${deviceDescription.id}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(deviceDescription)
      }
    ).then(response => response.json())
      .then((json) => {
        if (newFiles.length > 0 || delFiles.length > 0) {
          AttachmentFetcher.updateAttachables(
            newFiles,
            'DeviceDescription',
            json.device_description.id,
            delFiles
          )().then(() => {
            console.log(deviceDescription, json.device_description);
            return this.fetchById(deviceDescription.id, true);
          });
        }
        return this.fetchById(deviceDescription.id, true)
        //const updatedDeviceDescription = new DeviceDescription(json.device_description);
        //updatedDeviceDescription.updateChecksum();
        //updatedDeviceDescription.updated = true;
        //return updatedDeviceDescription;
      })
      //.then(() => this.fetchById(deviceDescription.id, true))
      .catch(errorMessage => console.log(errorMessage));

    if (containerFiles.length > 0) {
      const tasks = [];
      containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => promise());
    }
    return promise();
  }

  static deleteDeviceDescription(deviceDescriptionId) {
    return fetch(
      `/api/v1/device_descriptions/${deviceDescriptionId}`,
      { ...this._httpOptions('DELETE') }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static _httpOptions(method = 'GET') {
    return {
      credentials: 'same-origin',
      method: method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    };
  }
}
